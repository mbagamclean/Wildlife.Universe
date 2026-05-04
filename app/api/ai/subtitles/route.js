import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM = `You are a professional subtitle editor. You split spoken-word text into natural cue chunks of 12-20 words each. Cues should break on natural speech boundaries — never strand orphan words, never split mid-clause. Always respond with ONLY valid JSON, no markdown fences, no preamble.`;

function stripHtml(s) {
  return (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function pad2(n) { return String(n).padStart(2, '0'); }
function pad3(n) { return String(n).padStart(3, '0'); }

export function formatVttTimestamp(totalSeconds) {
  const safe = Math.max(0, Number(totalSeconds) || 0);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = Math.floor(safe % 60);
  const ms = Math.round((safe - Math.floor(safe)) * 1000);
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}.${pad3(ms)}`;
}

function buildVtt(cues) {
  const lines = ['WEBVTT', ''];
  cues.forEach((cue, i) => {
    lines.push(String(i + 1));
    lines.push(`${formatVttTimestamp(cue.start)} --> ${formatVttTimestamp(cue.end)}`);
    lines.push(cue.text);
    lines.push('');
  });
  return lines.join('\n');
}

function extractJson(raw) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in response');
  return JSON.parse(match[0]);
}

export async function POST(req) {
  try {
    const body = await req.json();
    const text = stripHtml(body.text || '');
    const language = (body.language || 'en').toString().slice(0, 8);
    const secondsPerChar = Math.max(0.02, Math.min(0.2, Number(body.secondsPerChar) || 0.06));
    const provider = body.provider === 'openai' ? 'openai' : 'claude';

    if (!text) {
      return Response.json({ success: false, error: 'text is required' }, { status: 400 });
    }
    if (text.length < 10) {
      return Response.json({ success: false, error: 'text is too short' }, { status: 400 });
    }

    const trimmed = text.slice(0, 8000);

    const prompt = `Split the following spoken-word transcript (language: ${language}) into natural subtitle cues.

Rules:
- Each cue: 12-20 words. Never strand orphan words alone on a line.
- Break on natural speech boundaries: clause ends, commas, conjunctions.
- Preserve every word verbatim from the source — do not paraphrase.
- Output strictly valid JSON in this exact shape:
{
  "cues": [
    { "text": "cue text here", "words": 14 }
  ]
}

Transcript:
${trimmed}`;

    const model =
      provider === 'openai'
        ? openai(process.env.OPENAI_MODEL || 'gpt-4o')
        : anthropic(process.env.ANTHROPIC_MODEL || 'claude-opus-4-7');

    const { text: raw } = await generateText({
      model,
      system: SYSTEM,
      prompt,
      temperature: 0.2,
      maxTokens: 4000,
    });

    const parsed = extractJson(raw);
    const rawCues = Array.isArray(parsed.cues) ? parsed.cues : [];

    let cursor = 0;
    const cues = rawCues
      .map((c) => (typeof c?.text === 'string' ? c.text.trim() : ''))
      .filter(Boolean)
      .map((cueText) => {
        const start = cursor;
        const dur = Math.max(1.2, cueText.length * secondsPerChar);
        const end = start + dur;
        cursor = end + 0.05; // tiny gap
        return { start: Number(start.toFixed(3)), end: Number(end.toFixed(3)), text: cueText };
      });

    if (cues.length === 0) {
      throw new Error('Model returned no usable cues');
    }

    const vtt = buildVtt(cues);

    return Response.json({
      success: true,
      data: {
        vtt,
        cues,
        totalDurationSec: Number(cursor.toFixed(3)),
        language,
        cueCount: cues.length,
      },
    });
  } catch (err) {
    console.error('[AI Subtitles]', err);
    return Response.json({ success: false, error: err.message || 'Subtitles failed' }, { status: 500 });
  }
}
