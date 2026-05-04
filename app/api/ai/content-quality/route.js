import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { pickTextModel } from '@/lib/ai/select-model';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM = `You are a senior managing editor at a top-tier wildlife and nature publication. You evaluate articles across five quality dimensions on a 0-100 scale: E-E-A-T, readability, originality, structure, and engagement. Be honest and specific — generic praise has no value. Return ONLY a single valid JSON object — no markdown fences.`;

function extractJson(raw) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in response');
  return JSON.parse(match[0]);
}

function clamp(n) {
  return Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
}

export async function POST(req) {
  try {
    const { title = '', content = '', excerpt = '', provider = 'claude',
      model = null, } = await req.json();
    if (!content || !content.trim()) {
      return Response.json({ success: false, error: 'Content is required' }, { status: 400 });
    }

    const text = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const h2Count = (content.match(/<h2/gi) || []).length;
    const h3Count = (content.match(/<h3/gi) || []).length;

    const prompt = `Evaluate this wildlife/nature article across five quality dimensions.

Title: "${title || '(untitled)'}"
Excerpt: ${excerpt || '(none)'}
Word count: ${wordCount}
H2/H3 counts: ${h2Count}/${h3Count}
Content (first 5000 chars): ${text.slice(0, 5000)}

Score each dimension 0-100 (be honest — most articles score 50-75):
- eeat: experience, expertise, authority, trustworthiness — citations, expert voice, factual accuracy
- readability: sentence variety, vocabulary, flow, scannability
- originality: unique angle, original observations, freshness vs generic web content
- structure: heading hierarchy, paragraph length, lead/body/conclusion balance, AdSense-friendly breaks
- engagement: hook strength, narrative pull, emotional resonance, would readers finish?

Then derive an overall score (weighted: eeat 25%, readability 20%, originality 20%, structure 15%, engagement 20%).

Return ONLY this JSON:
{
  "score": 0,
  "dimensions": {
    "eeat": 0,
    "readability": 0,
    "originality": 0,
    "structure": 0,
    "engagement": 0
  },
  "recommendations": ["specific actionable improvement 1", "..."],
  "strengths": ["specific concrete strength 1", "..."]
}

Quantities: 5-8 recommendations, 3-6 strengths. Each item must reference actual content, not generic advice.`;

    const aiModel = pickTextModel({ provider, model });

    const { text: raw } = await generateText({
      model: aiModel,
      system: SYSTEM,
      prompt,
      temperature: 0.3,
      maxTokens: 2200,
    });

    const parsed = extractJson(raw);
    const dim = parsed.dimensions || {};
    const dimensions = {
      eeat: clamp(dim.eeat),
      readability: clamp(dim.readability),
      originality: clamp(dim.originality),
      structure: clamp(dim.structure),
      engagement: clamp(dim.engagement),
    };

    const computedOverall = Math.round(
      dimensions.eeat * 0.25 +
      dimensions.readability * 0.20 +
      dimensions.originality * 0.20 +
      dimensions.structure * 0.15 +
      dimensions.engagement * 0.20
    );

    const score = parsed.score != null ? clamp(parsed.score) : computedOverall;

    const data = {
      score,
      dimensions,
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.slice(0, 10).map((s) => String(s).slice(0, 320)).filter(Boolean)
        : [],
      strengths: Array.isArray(parsed.strengths)
        ? parsed.strengths.slice(0, 8).map((s) => String(s).slice(0, 280)).filter(Boolean)
        : [],
    };

    return Response.json({ success: true, data });
  } catch (err) {
    console.error('[AI Content Quality]', err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
