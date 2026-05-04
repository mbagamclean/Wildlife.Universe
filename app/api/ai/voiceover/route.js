import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 120;

const BUCKET = 'media';
const CHUNK_TARGET = 4000; // < 4096 OpenAI TTS hard limit
const MAX_CHUNKS = 20;     // ~80k chars; safety upper bound
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

function stripHtml(s) {
  return (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function estimateDurationSec(text, speed = 1.0) {
  const charCount = (text || '').length;
  const safeSpeed = Math.max(0.25, Math.min(4, Number(speed) || 1));
  return Math.max(1, Math.round(charCount / (12.5 * safeSpeed)));
}

/**
 * Chunk text on paragraph boundaries first, then sentence boundaries,
 * keeping each chunk ≤ CHUNK_TARGET chars.
 */
export function chunkText(text, target = CHUNK_TARGET) {
  const clean = (text || '').trim();
  if (!clean) return [];
  if (clean.length <= target) return [clean];

  const paragraphs = clean.split(/\n{2,}|(?<=[.!?])\s+(?=[A-Z])/);
  const chunks = [];
  let buf = '';

  for (const p of paragraphs) {
    const piece = p.trim();
    if (!piece) continue;

    if (piece.length > target) {
      // Hard-split overly long single piece on sentence boundaries
      if (buf) { chunks.push(buf.trim()); buf = ''; }
      const sentences = piece.split(/(?<=[.!?])\s+/);
      let sBuf = '';
      for (const s of sentences) {
        if ((sBuf + ' ' + s).length > target) {
          if (sBuf) chunks.push(sBuf.trim());
          if (s.length > target) {
            // Brutal char split as last resort
            for (let i = 0; i < s.length; i += target) {
              chunks.push(s.slice(i, i + target));
            }
            sBuf = '';
          } else {
            sBuf = s;
          }
        } else {
          sBuf = (sBuf ? sBuf + ' ' : '') + s;
        }
      }
      if (sBuf) chunks.push(sBuf.trim());
      continue;
    }

    if ((buf + '\n\n' + piece).length > target) {
      if (buf) chunks.push(buf.trim());
      buf = piece;
    } else {
      buf = buf ? buf + '\n\n' + piece : piece;
    }
  }
  if (buf) chunks.push(buf.trim());
  return chunks.slice(0, MAX_CHUNKS);
}

export async function POST(req) {
  try {
    const body = await req.json();
    const rawText = (body.text || '').toString();
    const voice = VALID_VOICES.has(body.voice) ? body.voice : 'nova';
    const speed = Math.max(0.25, Math.min(4, Number(body.speed) || 1));
    const model = body.model === 'tts-1-hd' ? 'tts-1-hd' : 'tts-1';

    const text = stripHtml(rawText);
    if (!text) {
      return NextResponse.json({ success: false, error: 'text is required' }, { status: 400 });
    }
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ success: false, error: 'OPENAI_API_KEY not configured' }, { status: 500 });
    }

    const chunks = chunkText(text, CHUNK_TARGET);
    if (chunks.length === 0) {
      return NextResponse.json({ success: false, error: 'No usable text after stripping' }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const admin = getAdminClient();
    const baseUrl = publicBaseUrl();
    const sessionId = uniqueId();

    const results = [];
    let totalDuration = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      try {
        const speech = await openai.audio.speech.create({
          model,
          voice,
          input: chunk,
          speed,
          response_format: 'mp3',
        });
        const audioBuffer = Buffer.from(await speech.arrayBuffer());
        const path = `audio/voiceover/${sessionId}-${String(i + 1).padStart(3, '0')}.mp3`;

        const upload = await admin.storage.from(BUCKET).upload(path, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: false,
        });
        if (upload.error) throw new Error(upload.error.message);

        const dur = estimateDurationSec(chunk, speed);
        totalDuration += dur;
        results.push({
          index: i + 1,
          url: `${baseUrl}/${path}`,
          path,
          text: chunk,
          durationEstimate: dur,
          bytes: audioBuffer.byteLength,
        });
      } catch (chunkErr) {
        console.error('[Voiceover chunk error]', i, chunkErr);
        results.push({
          index: i + 1,
          url: null,
          path: null,
          text: chunk,
          durationEstimate: 0,
          error: chunkErr.message || 'Chunk generation failed',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        chunks: results,
        totalChunks: results.length,
        totalDurationEstimate: totalDuration,
        voice,
        speed,
        model,
      },
    });
  } catch (err) {
    console.error('[AI Voiceover]', err);
    return NextResponse.json({ success: false, error: err.message || 'Voiceover failed' }, { status: 500 });
  }
}
