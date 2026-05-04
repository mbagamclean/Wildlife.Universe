import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60;

const BUCKET = 'media';
const MAX_TTS_CHARS = 4096;
const VALID_VOICES = new Set(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']);

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function publicBaseUrl() {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;
}

function uniqueId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Rough heuristic: ~150 wpm for natural speech ≈ 2.5 wps; ~5 chars/word
// duration in seconds ≈ chars / (5 * 2.5 * speed) = chars / (12.5 * speed)
export function estimateDurationSec(text, speed = 1.0) {
  const charCount = (text || '').length;
  const safeSpeed = Math.max(0.25, Math.min(4, Number(speed) || 1));
  return Math.max(1, Math.round(charCount / (12.5 * safeSpeed)));
}

export async function POST(req) {
  try {
    const body = await req.json();
    const text = (body.text || '').toString().trim();
    const voice = VALID_VOICES.has(body.voice) ? body.voice : 'nova';
    const speed = Math.max(0.25, Math.min(4, Number(body.speed) || 1));
    const { resolveModel } = await import('@/lib/ai/models');
    const model = resolveModel('openaiTts', body.model);

    if (!text) {
      return NextResponse.json({ success: false, error: 'text is required' }, { status: 400 });
    }
    if (text.length > MAX_TTS_CHARS) {
      return NextResponse.json(
        { success: false, error: `Text exceeds ${MAX_TTS_CHARS}-character TTS limit. Use /api/ai/voiceover for longer text.` },
        { status: 400 }
      );
    }
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ success: false, error: 'OPENAI_API_KEY not configured' }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const speech = await openai.audio.speech.create({
      model,
      voice,
      input: text,
      speed,
      response_format: 'mp3',
    });

    const arrayBuffer = await speech.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    const uid = uniqueId();
    const path = `audio/${uid}.mp3`;

    const admin = getAdminClient();
    const upload = await admin.storage.from(BUCKET).upload(path, audioBuffer, {
      contentType: 'audio/mpeg',
      upsert: false,
    });
    if (upload.error) throw new Error(upload.error.message);

    const url = `${publicBaseUrl()}/${path}`;
    return NextResponse.json({
      success: true,
      data: {
        url,
        path,
        voice,
        speed,
        model,
        durationEstimate: estimateDurationSec(text, speed),
        bytes: audioBuffer.byteLength,
      },
    });
  } catch (err) {
    console.error('[AI TTS]', err);
    return NextResponse.json({ success: false, error: err.message || 'TTS failed' }, { status: 500 });
  }
}
