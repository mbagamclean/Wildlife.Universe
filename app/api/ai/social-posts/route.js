import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { pickTextModel } from '@/lib/ai/select-model';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM = `You are a social media manager for a premium wildlife and conservation publication with the editorial sensibility of National Geographic and the wonder of David Attenborough. You write social copy that respects the reader's intelligence — never clickbait, never sensational. You almost never use emoji; only include one when it adds genuine, specific value (e.g. a leaf for a botanical thread). You always include the link placeholder [POST_URL] so the human operator can paste the canonical URL after copy. Return ONLY a single valid JSON object — no markdown fences.`;

const VALID_PLATFORMS = ['twitter', 'facebook', 'linkedin', 'instagram'];

const PLATFORM_BRIEFS = {
  twitter: `Twitter / X — strict 280 character LIMIT (count the [POST_URL] placeholder as 23 characters). Hook-first: the strongest single sentence in the article, distilled. Optionally 1-3 lower-case hashtags at the end. No threads, single tweet only.`,
  facebook: `Facebook — 1 to 2 short paragraphs (60-120 words total). Open with a hook, give a one-line teaser of what the reader will learn, end with [POST_URL]. Conversational but literary. Minimal/no emoji.`,
  linkedin: `LinkedIn — 2 to 3 paragraphs (100-180 words). Frame as an insight, lesson, or observation drawn from the piece. Professional but warm. End with the link [POST_URL] on its own line and 2-4 capitalised hashtags. No emoji.`,
  instagram: `Instagram — caption-style with deliberate line breaks for readability (use \\n\\n between blocks). Open with a poetic or arresting line. 80-150 words of body. End with [POST_URL] then a separated block of 5-15 lower-case hashtags relevant to wildlife / conservation / the specific subject.`,
};

function extractJson(raw) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in response');
  return JSON.parse(match[0]);
}

function plainText(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractHashtags(text) {
  const matches = String(text || '').match(/#[\w-]+/g) || [];
  return Array.from(new Set(matches)).slice(0, 30);
}

function normalisePost(raw, platform) {
  const text = String(raw?.text || '').trim();
  return {
    text,
    charCount: text.length,
    hashtags: Array.isArray(raw?.hashtags) && raw.hashtags.length
      ? raw.hashtags.slice(0, 30).map((h) => String(h).replace(/^#/, '').slice(0, 60))
      : extractHashtags(text).map((h) => h.replace(/^#/, '')),
    platform,
  };
}

export async function POST(req) {
  try {
    const {
      title = '',
      content = '',
      platforms = VALID_PLATFORMS,
      provider = 'claude',
      model = null,
    } = await req.json();

    if (!title.trim() && !content.trim()) {
      return Response.json({ success: false, error: 'Title or content is required' }, { status: 400 });
    }

    const requested = (Array.isArray(platforms) ? platforms : [platforms])
      .filter((p) => VALID_PLATFORMS.includes(p));
    if (requested.length === 0) {
      return Response.json({ success: false, error: 'At least one valid platform is required' }, { status: 400 });
    }

    const text = plainText(content).slice(0, 5500);

    const briefs = requested.map((p) => `- ${p.toUpperCase()}: ${PLATFORM_BRIEFS[p]}`).join('\n');

    const platformShape = requested
      .map((p) => `    "${p}": { "text": "the full post body including [POST_URL] placeholder", "hashtags": ["lowercase","without","#","prefix"] }`)
      .join(',\n');

    const prompt = `Write social media posts for the article below — one per requested platform.

Article title: ${title || '(untitled)'}
Article body (first 5500 chars):
${text}

Platforms requested:
${briefs}

Hard rules:
- Always include the literal placeholder [POST_URL] (not a real URL) so the operator can substitute the canonical link
- No emoji unless one adds specific genuine value
- Never invent facts not present in the article
- Match the literary, intelligent voice of a wildlife publication — never marketing-speak, never clickbait

Return ONLY this JSON:
{
  "posts": {
${platformShape}
  }
}`;

    const aiModel = pickTextModel({ provider, model });

    const { text: raw } = await generateText({
      model: aiModel,
      system: SYSTEM,
      prompt,
      temperature: 0.7,
      maxTokens: 2400,
    });

    const parsed = extractJson(raw);
    const postsRaw = parsed.posts || {};
    const posts = {};
    for (const p of requested) {
      if (postsRaw[p]) posts[p] = normalisePost(postsRaw[p], p);
    }

    if (Object.keys(posts).length === 0) {
      throw new Error('Model returned no platform posts');
    }

    return Response.json({ success: true, data: { posts } });
  } catch (err) {
    console.error('[AI Social Posts]', err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
