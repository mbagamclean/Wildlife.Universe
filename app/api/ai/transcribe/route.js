import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const maxDuration = 120;

// Whisper API hard limit
const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(req) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ success: false, error: 'OPENAI_API_KEY not configured' }, { status: 500 });
    }

    let formData;
    try {
      formData = await req.formData();
    } catch (e) {
      return NextResponse.json({ success: false, error: 'Invalid multipart form data' }, { status: 400 });
    }

    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ success: false, error: 'file is required (multipart)' }, { status: 400 });
    }

    const isAudio = file.type?.startsWith('audio/');
    const isVideo = file.type?.startsWith('video/');
    if (!isAudio && !isVideo) {
      return NextResponse.json(
        { success: false, error: 'Only audio/* or video/* files are supported' },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return NextResponse.json(
        {
          success: false,
          error: `File is ${sizeMB}MB. Whisper limit is 25MB. Compress or trim the file before transcribing.`,
        },
        { status: 413 }
      );
    }

    const language = formData.get('language')?.toString() || undefined;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const result = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      response_format: 'verbose_json',
      ...(language ? { language } : {}),
    });

    const segments = Array.isArray(result.segments)
      ? result.segments.map((s) => ({
          start: Number(s.start) || 0,
          end: Number(s.end) || 0,
          text: (s.text || '').trim(),
        }))
      : [];

    return NextResponse.json({
      success: true,
      data: {
        transcript: (result.text || '').trim(),
        segments,
        language: result.language || language || 'en',
        durationSec: Number(result.duration) || 0,
      },
    });
  } catch (err) {
    console.error('[AI Transcribe]', err);
    const status = err?.status || 500;
    return NextResponse.json(
      { success: false, error: err.message || 'Transcription failed' },
      { status }
    );
  }
}
