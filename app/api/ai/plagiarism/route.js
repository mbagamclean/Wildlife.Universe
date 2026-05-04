import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';

export const runtime = 'nodejs';
export const maxDuration = 120;

const SYSTEM = `You are an originality and content-freshness analyst. You evaluate text for templated phrasing, generic encyclopedic prose, overused clichés, and lack of unique voice. You do not access the web — you give a heuristic originality assessment based on language patterns. Return ONLY valid JSON.`;

function extractJson(raw) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in response');
  return JSON.parse(match[0]);
}

const VALID_STATUS = ['unique', 'derivative', 'plagiarized'];

export async function POST(req) {
  try {
    const { content, provider = 'claude' } = await req.json();
    if (!content || !content.trim()) {
      return Response.json({ success: false, error: 'Content is required' }, { status: 400 });
    }

    const text = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 5000);

    const prompt = `Analyze this wildlife/nature article for originality and freshness. Look for:
- Generic, templated phrases common across the web ("In conclusion", "It is important to note", etc.)
- Wikipedia-style encyclopedic writing with no voice
- Overused clichés in nature writing ("majestic creature", "delicate balance")
- Lack of unique angle, personal voice, or original insight
- Filler that adds no information

Return ONLY this JSON:
{
  "originalityScore": 0,
  "status": "unique|derivative|plagiarized",
  "verdict": "one sentence overall verdict",
  "genericPhrases": ["exact phrase 1", "exact phrase 2"],
  "uniquenessReport": {
    "uniqueAngle": true,
    "personalVoice": true,
    "originalExamples": false,
    "dataAndStats": false
  }
}

Scoring:
- 85–100 = unique (strong original voice, fresh angle)
- 50–84 = derivative (some templated patterns, fixable)
- 0–49 = plagiarized (heavily generic, reads like recycled web content)

Text: ${text}`;

    const model =
      provider === 'openai'
        ? openai(process.env.OPENAI_MODEL || 'gpt-4o')
        : anthropic(process.env.ANTHROPIC_MODEL || 'claude-opus-4-7');

    const { text: raw } = await generateText({
      model,
      system: SYSTEM,
      prompt,
      temperature: 0.3,
      maxTokens: 1800,
    });

    const parsed = extractJson(raw);
    const score = Math.max(0, Math.min(Number(parsed.originalityScore) || 0, 100));
    const data = {
      originalityScore: score,
      status: VALID_STATUS.includes(parsed.status) ? parsed.status : (score >= 85 ? 'unique' : score >= 50 ? 'derivative' : 'plagiarized'),
      verdict: parsed.verdict || '',
      genericPhrases: Array.isArray(parsed.genericPhrases) ? parsed.genericPhrases : [],
      uniquenessReport: {
        uniqueAngle: !!parsed.uniquenessReport?.uniqueAngle,
        personalVoice: !!parsed.uniquenessReport?.personalVoice,
        originalExamples: !!parsed.uniquenessReport?.originalExamples,
        dataAndStats: !!parsed.uniquenessReport?.dataAndStats,
      },
    };

    return Response.json({ success: true, data });
  } catch (err) {
    console.error('[AI Plagiarism]', err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
