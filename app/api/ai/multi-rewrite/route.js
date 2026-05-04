import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM = `You are an expert wildlife content editor. Generate alternative rewrites for a given passage. Return ONLY valid JSON — no markdown fences, no preamble.`;

function extractJson(raw) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in response');
  return JSON.parse(match[0]);
}

export async function POST(req) {
  try {
    const { text, count = 3, style, provider = 'claude' } = await req.json();
    if (!text || !text.trim()) {
      return Response.json({ success: false, error: 'Text is required' }, { status: 400 });
    }

    const styleNote = style ? ` All rewrites should lean toward a ${style} angle.` : '';
    const n = Math.max(2, Math.min(Number(count) || 3, 6));

    const labels = ['Sharper', 'Richer Detail', 'More Formal', 'More Conversational', 'More Vivid', 'Simpler'].slice(0, n);

    const prompt = `Rewrite the passage below in ${n} distinct ways for a wildlife/nature article.${styleNote} Each rewrite must preserve the core meaning but vary in tone, length, or emphasis.

Return ONLY this JSON:
{
  "rewrites": [
${labels.map((l, i) => `    { "id": ${i + 1}, "label": "${l}", "text": "..." }`).join(',\n')}
  ]
}

Passage: ${text.slice(0, 2000)}`;

    const model =
      provider === 'openai'
        ? openai(process.env.OPENAI_MODEL || 'gpt-4o')
        : anthropic(process.env.ANTHROPIC_MODEL || 'claude-opus-4-7');

    const { text: raw } = await generateText({
      model,
      system: SYSTEM,
      prompt,
      temperature: 0.7,
      maxTokens: 2000,
    });

    const parsed = extractJson(raw);
    const rewrites = (parsed.rewrites || []).map((r, i) => ({
      id: r.id ?? i + 1,
      label: r.label || labels[i] || `Variant ${i + 1}`,
      text: (r.text || '').trim(),
    })).filter(r => r.text);

    return Response.json({ success: true, data: { rewrites } });
  } catch (err) {
    console.error('[AI Multi-Rewrite]', err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
