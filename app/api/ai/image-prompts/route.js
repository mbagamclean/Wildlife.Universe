import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a world-class wildlife photographer and art director writing image-generation prompts for a luxury wildlife publication (National Geographic / David Attenborough sensibility). Each prompt is 50-80 words, cinematic, technically precise. Always include: subject, composition, lighting, mood, lens/aperture/ISO suggestion, color palette, environmental details. Never include: copyrighted IP, brand names, people-identifiable faces. Output strict JSON.`;

function extractJson(text) {
  const cleaned = text.replace(/```json\s*|```/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object in model response');
  return JSON.parse(match[0]);
}

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      subject = '',
      style = 'Wildlife Documentary',
      aspectRatio = '16:9',
      quantity = 10,
      provider = 'claude',
    } = body || {};

    if (!subject.trim()) {
      return NextResponse.json({ success: false, error: 'Subject is required' }, { status: 400 });
    }
    const n = Math.min(Math.max(parseInt(quantity, 10) || 10, 1), 25);

    const userPrompt = `Generate ${n} distinct image-generation prompts for the subject: "${subject}".

Style preset: ${style}
Aspect ratio: ${aspectRatio}

Requirements per prompt:
- 50-80 words, technically detailed
- Vary composition (wide, mid, macro, behavioral)
- Vary lighting (golden hour, blue hour, harsh midday, overcast, backlit, etc.)
- Vary mood (intimate, epic, somber, joyful, tense, contemplative)
- Include camera spec (lens range, aperture, ISO)
- No copyrighted IP, no recognizable human faces

Return JSON exactly in this shape:
{
  "prompts": [
    {
      "text": "<the full 50-80 word prompt>",
      "style": "<one-line style summary>",
      "lightingNotes": "<one-line lighting note>",
      "mood": "<single word or short phrase>",
      "technicalSpec": "<lens, aperture, ISO>"
    }
  ]
}`;

    const modelClaude = process.env.ANTHROPIC_MODEL || 'claude-opus-4-7';
    const modelOpenai = process.env.OPENAI_MODEL || 'gpt-4o';
    const model = provider === 'openai' ? openai(modelOpenai) : anthropic(modelClaude);

    const { text } = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0.85,
      maxTokens: 4000,
    });

    const parsed = extractJson(text);
    const prompts = Array.isArray(parsed.prompts) ? parsed.prompts.slice(0, n) : [];

    return NextResponse.json({ success: true, data: { prompts, subject, style, aspectRatio } });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Generation failed' },
      { status: 500 }
    );
  }
}
