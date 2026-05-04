import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { pickTextModel } from '@/lib/ai/select-model';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM = `You are a senior magazine editor who specialises in rewriting AI-sounding prose so it reads as if a thoughtful human wrote it. You preserve the meaning and facts exactly, but you change rhythm, vocabulary, and structure. You refuse to add fabricated facts. Always return ONLY a single valid JSON object — no markdown fences, no preamble.`;

const TONE_HINTS = {
  Conversational: 'warm, friendly, second-person allowed, contractions OK, occasional rhetorical questions',
  Authoritative: 'confident, expert, declarative, third-person, no hedging',
  Casual: 'relaxed, idiomatic, light slang allowed, short punchy sentences',
  Academic: 'precise, measured, formal vocabulary, longer compound sentences, no contractions',
};

function extractJson(raw) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in response');
  return JSON.parse(match[0]);
}

export async function POST(req) {
  try {
    const { text, tone = 'Conversational', provider = 'claude',
      model = null, } = await req.json();
    if (!text || !text.trim()) {
      return Response.json({ success: false, error: 'Text is required' }, { status: 400 });
    }

    const cleaned = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 6000);
    const toneHint = TONE_HINTS[tone] || TONE_HINTS.Conversational;

    const prompt = `Rewrite the text below so it reads like genuine human-authored prose in a ${tone} tone (${toneHint}).

Hard rules:
- Vary sentence length dramatically — mix short punchy sentences with longer ones
- Use idiomatic phrasing, natural transitions, personal voice where appropriate
- Strip every AI tell ("delve into", "in conclusion", "it's important to note", "navigating the landscape", "robust", "comprehensive", "nuanced", "tapestry", "meticulously", "embark on a journey")
- Do NOT add facts, statistics, or claims not present in the original
- Do NOT use markdown — output plain text only (paragraphs separated by blank lines)
- Preserve every meaningful piece of information from the original
- Keep approximately the same length (within 20%)

Return ONLY this JSON shape:
{
  "humanized": "the full rewritten plain-text version",
  "changes": [
    { "original": "exact phrase replaced", "replacement": "what you wrote instead", "reason": "why it sounded AI" }
  ],
  "readabilityShift": 0
}

readabilityShift is an integer from -50 to +50 estimating how much friendlier/more readable the new version is vs the original (positive = more readable, 0 = same).

Original text:
${cleaned}`;

    const aiModel = pickTextModel({ provider, model });

    const { text: raw } = await generateText({
      model: aiModel,
      system: SYSTEM,
      prompt,
      temperature: 0.7,
      maxTokens: 4000,
    });

    const parsed = extractJson(raw);
    const data = {
      humanized: typeof parsed.humanized === 'string' ? parsed.humanized.trim() : '',
      changes: Array.isArray(parsed.changes)
        ? parsed.changes.slice(0, 40).map((c) => ({
            original: String(c.original || '').slice(0, 400),
            replacement: String(c.replacement || '').slice(0, 400),
            reason: String(c.reason || '').slice(0, 240),
          }))
        : [],
      readabilityShift: Math.max(-50, Math.min(50, Number(parsed.readabilityShift) || 0)),
    };

    if (!data.humanized) throw new Error('Model returned no humanized text');

    return Response.json({ success: true, data });
  } catch (err) {
    console.error('[AI Humanize]', err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
