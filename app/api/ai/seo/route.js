import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { pickTextModel } from '@/lib/ai/select-model';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SEO_SYSTEM = `You are a senior SEO strategist specializing in wildlife, nature, and conservation content. You write SEO metadata that ranks on Google while feeling human-written. You are deeply familiar with AdSense-safe content requirements, EEAT signals, and modern search intent analysis. Always respond with valid JSON.`;

function buildSEOPrompt(title, bodyText, task) {
  if (task === 'generate') {
    return `Generate complete SEO metadata for a wildlife article.

Title: "${title}"
Article content (excerpt): ${bodyText.slice(0, 3000)}

Return a JSON object with exactly these fields:
{
  "seoTitle": "50-60 char title with primary keyword near the start",
  "metaDescription": "150-160 char compelling description with keyword and CTA",
  "keywords": "comma-separated list of 5-15 keywords: 1 primary, 3-5 secondary, 5-9 long-tail",
  "excerpt": "2-3 natural human-written sentences summarizing the article value"
}

Rules:
- SEO title: MUST be 50-60 characters, include primary keyword, avoid clickbait
- Meta description: MUST be 150-160 characters, click-optimized, end with implicit or explicit CTA
- Keywords: primary keyword first, then secondary, then long-tail phrases 3-5 words each
- Excerpt: warm, informative tone. No "In this article" or similar openers.`;
  }

  if (task === 'analyze') {
    return `Perform comprehensive SEO analysis of this wildlife article.

Title: "${title}"
Content: ${bodyText.slice(0, 4000)}

Return JSON with:
{
  "primaryKeyword": "detected primary keyword",
  "keywordDensity": 0.0,
  "readabilityScore": 0,
  "eeatScore": 0,
  "contentGaps": ["missing topic 1", "missing topic 2"],
  "lsiKeywords": ["related term 1", "related term 2"],
  "internalLinkOpps": ["suggested internal link topic"],
  "headingStructure": "good|needs_improvement|poor",
  "wordCount": 0,
  "recommendations": ["specific recommendation 1", "specific recommendation 2"]
}`;
  }
}

export async function POST(req) {
  try {
    const { title, body, provider = 'claude', task = 'generate' } = await req.json();
    const bodyText = (body || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    if (!title && !bodyText) {
      return Response.json({ error: 'Title or body required' }, { status: 400 });
    }

    const aiModel = pickTextModel({ provider, model });

    const { text } = await generateText({
      model: aiModel,
      system: SEO_SYSTEM,
      prompt: buildSEOPrompt(title || '', bodyText, task),
      temperature: 0.3,
      maxTokens: 1000,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const data = JSON.parse(jsonMatch[0]);

    return Response.json({ success: true, data });
  } catch (err) {
    console.error('[AI SEO]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
