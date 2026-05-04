import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { pickTextModel } from '@/lib/ai/select-model';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM = `You are a senior SEO keyword strategist for Wildlife.Universe, a premium wildlife and nature publication. You estimate keyword opportunity from intuition and search-pattern knowledge — you do NOT have access to a real keyword tool. Be honest: volume and difficulty are qualitative buckets (Low / Medium / High / Very High), not numbers from Ahrefs or SEMrush. Return ONLY a single valid JSON object, no markdown fences.`;

function extractJson(raw) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in response');
  return JSON.parse(match[0]);
}

const VALID_BUCKETS = ['Low', 'Medium', 'High', 'Very High'];
const VALID_INTENTS = ['Informational', 'Commercial', 'Transactional', 'Navigational'];

function normaliseBucket(v, fallback = 'Medium') {
  return VALID_BUCKETS.includes(v) ? v : fallback;
}
function normaliseIntent(v) {
  return VALID_INTENTS.includes(v) ? v : 'Informational';
}

export async function POST(req) {
  try {
    const { seed = '', category = '', provider = 'claude',
      model = null, } = await req.json();
    if (!seed || !seed.trim()) {
      return Response.json({ success: false, error: 'Seed keyword is required' }, { status: 400 });
    }

    const cat = category ? `\nCategory context: ${category}` : '';

    const prompt = `Brainstorm a complete keyword research package for the wildlife/nature seed keyword below. Be realistic — these are qualitative estimates.

Seed keyword: "${seed.trim()}"${cat}

Return ONLY this JSON:
{
  "primary": {
    "keyword": "the strongest primary keyword (refined from seed if needed)",
    "intent": "Informational|Commercial|Transactional|Navigational",
    "volume": "Low|Medium|High|Very High",
    "difficulty": "Low|Medium|High|Very High"
  },
  "related": [
    {
      "keyword": "related keyword phrase",
      "intent": "Informational|Commercial|Transactional|Navigational",
      "volume": "Low|Medium|High|Very High",
      "difficulty": "Low|Medium|High|Very High"
    }
  ],
  "questions": ["People-also-ask question 1", "..."],
  "lsiKeywords": ["semantic keyword 1", "..."],
  "contentAngles": ["angle 1 idea", "..."]
}

Quantities:
- 10-15 related keywords (mix head, mid-tail, long-tail)
- 8-10 questions actual searchers would type
- 12-18 LSI / semantic terms
- exactly 5 content angle suggestions (titles or framing ideas)

Wildlife/nature focus. AdSense-safe topics only.`;

    const aiModel = pickTextModel({ provider, model });

    const { text: raw } = await generateText({
      model: aiModel,
      system: SYSTEM,
      prompt,
      temperature: 0.6,
      maxTokens: 2500,
    });

    const parsed = extractJson(raw);

    const primary = parsed.primary || {};
    const data = {
      primary: {
        keyword: String(primary.keyword || seed).slice(0, 120),
        intent: normaliseIntent(primary.intent),
        volume: normaliseBucket(primary.volume),
        difficulty: normaliseBucket(primary.difficulty),
      },
      related: Array.isArray(parsed.related)
        ? parsed.related.slice(0, 20).map((r) => ({
            keyword: String(r.keyword || '').slice(0, 140),
            intent: normaliseIntent(r.intent),
            volume: normaliseBucket(r.volume),
            difficulty: normaliseBucket(r.difficulty),
          })).filter((r) => r.keyword)
        : [],
      questions: Array.isArray(parsed.questions)
        ? parsed.questions.slice(0, 12).map((q) => String(q).slice(0, 200)).filter(Boolean)
        : [],
      lsiKeywords: Array.isArray(parsed.lsiKeywords)
        ? parsed.lsiKeywords.slice(0, 24).map((k) => String(k).slice(0, 100)).filter(Boolean)
        : [],
      contentAngles: Array.isArray(parsed.contentAngles)
        ? parsed.contentAngles.slice(0, 8).map((a) => String(a).slice(0, 240)).filter(Boolean)
        : [],
    };

    return Response.json({ success: true, data });
  } catch (err) {
    console.error('[AI Keyword Research]', err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
