import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { pickTextModel } from '@/lib/ai/select-model';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM = `You are an editorial strategist for a premium wildlife and nature publication. You propose a balanced editorial calendar mixing evergreen depth pieces with timely angles. You think in formats: how-to, listicle, ultimate guide, question-led explainer, comparison, problem-solution. You space topics across the requested time horizon and never propose two topics that are near-duplicates. AdSense-safe topics only — no hunting, no exotic-pet trade, no graphic content. Return ONLY a single valid JSON object — no markdown fences.`;

const VALID_TYPES = ['How-To', 'Listicle', 'Ultimate Guide', 'Question', 'Comparison', 'Problem-Solution'];

function extractJson(raw) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in response');
  return JSON.parse(match[0]);
}

function normaliseType(t) {
  if (typeof t !== 'string') return 'Listicle';
  const lower = t.toLowerCase();
  for (const v of VALID_TYPES) {
    if (lower === v.toLowerCase()) return v;
  }
  if (lower.includes('how')) return 'How-To';
  if (lower.includes('list')) return 'Listicle';
  if (lower.includes('guide')) return 'Ultimate Guide';
  if (lower.includes('compar')) return 'Comparison';
  if (lower.includes('problem') || lower.includes('solution')) return 'Problem-Solution';
  if (lower.includes('?') || lower.includes('question') || lower.startsWith('what') || lower.startsWith('why') || lower.startsWith('how')) return 'Question';
  return 'Listicle';
}

function spaceDates(count, horizonDays) {
  if (count <= 0) return [];
  const start = new Date();
  start.setHours(9, 0, 0, 0);
  const step = Math.max(1, Math.floor(horizonDays / count));
  const out = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i * step);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export async function POST(req) {
  try {
    const {
      category = '',
      postsCount = 10,
      timeHorizonDays = 30,
      provider = 'claude',
      model = null,
    } = await req.json();

    const count = Math.max(3, Math.min(30, Number(postsCount) || 10));
    const horizon = Math.max(7, Math.min(120, Number(timeHorizonDays) || 30));

    const cat = category ? `Category / niche: ${category}` : 'Niche: general wildlife and nature';

    const prompt = `Propose ${count} editorial topics for a wildlife/nature publication, balanced across roughly ${horizon} days.

${cat}

Hard rules:
- Mix formats across the calendar: at least 2 different formats, ideally 3+
- No two topics may be near-duplicates of each other
- Each topic must have a clear primary keyword (lowercase, 2-5 words, real search-style)
- Estimated word counts realistic: how-to 800-1500, listicle 1200-2500, ultimate guide 2500-4500, question 600-1200, comparison 1000-2000, problem-solution 800-1600
- Space suggestedDate values evenly across the next ${horizon} days starting from today (ISO YYYY-MM-DD)
- AdSense-safe only — no hunting, no exotic-pet trade, no graphic violence
- Each topic must have a one-sentence "summary" (what the article covers) and a one-sentence "angle" (why this take is fresh)

Return ONLY this JSON:
{
  "topics": [
    {
      "title": "specific publishable title",
      "type": "How-To|Listicle|Ultimate Guide|Question|Comparison|Problem-Solution",
      "primaryKeyword": "lowercase keyword phrase",
      "estimatedWordCount": 1500,
      "suggestedDate": "YYYY-MM-DD",
      "summary": "one sentence covering what the article includes",
      "angle": "one sentence on the unique editorial angle"
    }
  ]
}`;

    const aiModel = pickTextModel({ provider, model });

    const { text: raw } = await generateText({
      model: aiModel,
      system: SYSTEM,
      prompt,
      temperature: 0.75,
      maxTokens: 3500,
    });

    const parsed = extractJson(raw);
    const fallbackDates = spaceDates(count, horizon);

    const topics = Array.isArray(parsed.topics)
      ? parsed.topics.slice(0, 30).map((t, i) => ({
          title: String(t.title || '').slice(0, 200),
          type: normaliseType(t.type),
          primaryKeyword: String(t.primaryKeyword || '').toLowerCase().slice(0, 100),
          estimatedWordCount: Math.max(300, Math.min(6000, Number(t.estimatedWordCount) || 1200)),
          suggestedDate: /^\d{4}-\d{2}-\d{2}$/.test(t.suggestedDate) ? t.suggestedDate : (fallbackDates[i] || fallbackDates[0]),
          summary: String(t.summary || '').slice(0, 300),
          angle: String(t.angle || '').slice(0, 300),
        })).filter((t) => t.title)
      : [];

    if (topics.length === 0) throw new Error('Model returned no topics');

    return Response.json({ success: true, data: { topics } });
  } catch (err) {
    console.error('[AI Topic Discovery]', err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
