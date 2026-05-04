import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { pickTextModel } from '@/lib/ai/select-model';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM = `You are a senior copy editor for a wildlife publication. Find grammar, spelling, style, and clarity issues. Be precise. Return ONLY valid JSON — no markdown fences, no preamble.`;

function extractJson(raw) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in response');
  return JSON.parse(match[0]);
}

export async function POST(req) {
  try {
    const { text, provider = 'claude',
      model = null, } = await req.json();
    if (!text || !text.trim()) {
      return Response.json({ success: false, error: 'Text is required' }, { status: 400 });
    }

    const cleaned = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 4000);

    const prompt = `Proofread the wildlife article text below. Identify grammar, spelling, style, and clarity issues. Provide the fully corrected text and an itemized list of every correction.

Return ONLY this JSON:
{
  "corrected": "the full corrected text",
  "corrections": [
    {
      "original": "exact phrase from the text",
      "suggestion": "improved version",
      "reason": "brief explanation",
      "type": "grammar|spelling|style|clarity|passive|filler"
    }
  ],
  "summary": "one or two sentences summarizing the overall quality and the most impactful changes"
}

Text: ${cleaned}`;

    const aiModel = pickTextModel({ provider, model });

    const { text: raw } = await generateText({
      model: aiModel,
      system: SYSTEM,
      prompt,
      temperature: 0.2,
      maxTokens: 2500,
    });

    const parsed = extractJson(raw);
    const data = {
      corrected: parsed.corrected || cleaned,
      corrections: Array.isArray(parsed.corrections) ? parsed.corrections : [],
      summary: parsed.summary || '',
    };

    return Response.json({ success: true, data });
  } catch (err) {
    console.error('[AI Proofread]', err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
