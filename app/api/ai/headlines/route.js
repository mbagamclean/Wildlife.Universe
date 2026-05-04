import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { pickTextModel } from '@/lib/ai/select-model';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM = `You are an SEO headline strategist for Wildlife.Universe, a premium wildlife and nature publication. You write evergreen, click-worthy headlines that rank on Google and feel editorial — not clickbait. Return ONLY valid JSON.`;

function extractJson(raw) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in response');
  return JSON.parse(match[0]);
}

const VALID_TYPES = ['How-To', 'Listicle', 'Ultimate Guide', 'Question', 'Comparison', 'Problem-Solution'];
const VALID_VOLUMES = ['High', 'Very High', 'Medium'];

export async function POST(req) {
  try {
    const { topic, category, count = 8, provider = 'claude',
      model = null, } = await req.json();
    if (!topic || !topic.trim()) {
      return Response.json({ success: false, error: 'Topic is required' }, { status: 400 });
    }

    const n = Math.max(3, Math.min(Number(count) || 8, 20));
    const categoryNote = category ? `\nCategory: ${category}` : '';

    const prompt = `Generate ${n} powerful, evergreen wildlife/nature headline ideas for the topic below. Mix the headline TYPES across these formulas: How-To, Listicle, Ultimate Guide, Question, Comparison, Problem-Solution.

Topic: "${topic}"${categoryNote}

Requirements:
- Wildlife/nature angle, no clickbait, AdSense-safe, evergreen (not breaking news)
- Each headline: 50–70 characters, keyword-rich, click-worthy
- Include a primary keyword that someone would actually Google
- Estimate realistic search volume (High | Very High | Medium)
- Estimate ideal word count for the resulting article (1500–6000)

Return ONLY this JSON:
{
  "headlines": [
    {
      "headline": "the headline text",
      "type": "How-To|Listicle|Ultimate Guide|Question|Comparison|Problem-Solution",
      "primaryKeyword": "primary search keyword",
      "searchVolume": "High|Very High|Medium",
      "estimatedWordCount": 3500
    }
  ]
}`;

    const aiModel = pickTextModel({ provider, model });

    const { text: raw } = await generateText({
      model: aiModel,
      system: SYSTEM,
      prompt,
      temperature: 0.8,
      maxTokens: 2500,
    });

    const parsed = extractJson(raw);
    const headlines = (parsed.headlines || []).map(h => ({
      headline: (h.headline || '').trim(),
      type: VALID_TYPES.includes(h.type) ? h.type : 'How-To',
      primaryKeyword: h.primaryKeyword || '',
      searchVolume: VALID_VOLUMES.includes(h.searchVolume) ? h.searchVolume : 'Medium',
      estimatedWordCount: Number(h.estimatedWordCount) || 2500,
    })).filter(h => h.headline);

    return Response.json({ success: true, data: { headlines } });
  } catch (err) {
    console.error('[AI Headlines]', err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
