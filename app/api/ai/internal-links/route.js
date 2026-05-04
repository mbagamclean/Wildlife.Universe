import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM = `You are an SEO specialist for Wildlife.Universe. You find natural anchor text opportunities in an article that should hyperlink to other related posts. Return ONLY valid JSON.`;

function extractJson(raw) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in response');
  return JSON.parse(match[0]);
}

function extractParagraphs(html) {
  const text = html.replace(/<(h[1-6])[^>]*>[\s\S]*?<\/\1>/gi, '\n\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 40);
}

export async function POST(req) {
  try {
    const { content, existingPosts = [], provider = 'claude' } = await req.json();
    if (!content || !content.trim()) {
      return Response.json({ success: false, error: 'Content is required' }, { status: 400 });
    }
    if (!Array.isArray(existingPosts) || existingPosts.length === 0) {
      return Response.json({ success: false, error: 'existingPosts list is required' }, { status: 400 });
    }

    const paragraphs = extractParagraphs(content);
    if (paragraphs.length === 0) {
      return Response.json({ success: false, error: 'No readable paragraphs found in content' }, { status: 400 });
    }

    const compactPosts = existingPosts.slice(0, 60).map(p => ({
      title: p.title || '',
      slug: p.slug || '',
      excerpt: (p.excerpt || '').slice(0, 80),
    })).filter(p => p.title && p.slug);

    const numbered = paragraphs.slice(0, 12).map((p, i) => `[paragraph ${i + 1}]\n${p.slice(0, 600)}`).join('\n\n');

    const prompt = `Find 5–10 internal-link opportunities in the wildlife article paragraphs below. For each suggestion, pick a short anchor phrase that LITERALLY appears in the article and link it to the most relevant post from the AVAILABLE POSTS list.

AVAILABLE POSTS (JSON):
${JSON.stringify(compactPosts)}

Rules:
- Anchor phrases must literally appear in the article paragraphs
- Use specific nouns, species names, places, concepts — never "click here" / "read more"
- Each post should be linked at most twice
- Skip if no genuinely relevant link exists

Return ONLY this JSON:
{
  "suggestions": [
    {
      "anchorText": "exact phrase from article",
      "targetSlug": "matching post slug",
      "reason": "why this link is relevant",
      "position": "paragraph N"
    }
  ]
}

Article paragraphs:
${numbered}`;

    const model =
      provider === 'openai'
        ? openai(process.env.OPENAI_MODEL || 'gpt-4o')
        : anthropic(process.env.ANTHROPIC_MODEL || 'claude-opus-4-7');

    const { text: raw } = await generateText({
      model,
      system: SYSTEM,
      prompt,
      temperature: 0.4,
      maxTokens: 2000,
    });

    const parsed = extractJson(raw);
    const validSlugs = new Set(compactPosts.map(p => p.slug));
    const suggestions = (parsed.suggestions || []).map(s => ({
      anchorText: (s.anchorText || '').trim(),
      targetSlug: (s.targetSlug || '').trim(),
      reason: s.reason || '',
      position: s.position || '',
    })).filter(s => s.anchorText && validSlugs.has(s.targetSlug));

    return Response.json({ success: true, data: { suggestions } });
  } catch (err) {
    console.error('[AI Internal Links]', err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
