import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM = `You are a viral short-form video scriptwriter for the wildlife & nature niche, known for hooks that stop the scroll within 2 seconds. You write scenes that are visual, emotional, and tightly paced. Every script opens with a powerful hook, builds curiosity, delivers value, and ends with a clear CTA. The on-screen text always matches the spoken voiceover word-for-word for accessibility. You write for the wildlife/nature aesthetic: sweeping landscapes, intimate animal moments, conservation urgency, awe. Always respond with ONLY a single valid JSON object — no markdown fences, no preamble.`;

const PLATFORM_LABELS = {
  youtube_shorts: 'YouTube Shorts',
  tiktok: 'TikTok',
  instagram_reels: 'Instagram Reels',
};

function stripHtml(s) {
  return (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractJson(raw) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in response');
  return JSON.parse(match[0]);
}

export async function POST(req) {
  try {
    const body = await req.json();
    const title = (body.title || '').toString().trim();
    const content = stripHtml(body.content || '').slice(0, 4000);
    const platform = PLATFORM_LABELS[body.platform] ? body.platform : 'youtube_shorts';
    const platformLabel = PLATFORM_LABELS[platform];
    const duration = Number(body.duration) === 60 ? 60 : 30;
    const provider = body.provider === 'openai' ? 'openai' : 'claude';

    if (!title && !content) {
      return Response.json({ success: false, error: 'title or content required' }, { status: 400 });
    }

    const sceneCount = duration === 60 ? '8-10' : '6-8';
    const wordsPerSec = 2.4; // natural narration
    const targetWords = Math.round(duration * wordsPerSec);

    const prompt = `Create a ${duration}-second ${platformLabel} script from this wildlife article.

Title: "${title || 'Untitled'}"
Article excerpt: ${content || '(no content provided — use the title alone)'}

Requirements:
- Hook: a single 2-second opening line (max 12 words) that stops the scroll. Pattern interrupt, surprising fact, or visceral image.
- Scenes: ${sceneCount} scenes total, each with timed voiceover, vivid visual direction, and matching on-screen text (kinetic captions).
- Total spoken voiceover ≈ ${targetWords} words across all scenes.
- Each scene durationSec sums to ${duration} (±2).
- On-screen text in each scene must echo the voiceover word-for-word (or be a tight summary ≤ 8 words).
- Visual direction: cinematic, wildlife/nature aesthetic — describe shot type, subject, motion, lighting.
- End scene = clear CTA (follow, save, link in bio, etc.) tied to wildlife/conservation.
- Captions: a single ready-to-paste caption (≤ 200 chars) for the post itself.
- Hashtags: 8-12 mix of niche wildlife tags + broad reach tags. Include "#" prefix on each.

Return ONLY this JSON shape:
{
  "hook": "the 2-second opening line",
  "script": [
    {
      "scene": 1,
      "voiceover": "spoken narration for this scene",
      "visual": "cinematic visual direction — shot type, subject, motion, lighting",
      "durationSec": 4,
      "onScreenText": "kinetic caption text matching voiceover"
    }
  ],
  "hashtags": ["#wildlife", "#nature"],
  "totalDurationSec": ${duration},
  "captions": "ready-to-paste post caption ≤ 200 chars"
}`;

    const model =
      provider === 'openai'
        ? openai(process.env.OPENAI_MODEL || 'gpt-4o')
        : anthropic(process.env.ANTHROPIC_MODEL || 'claude-opus-4-7');

    const { text: raw } = await generateText({
      model,
      system: SYSTEM,
      prompt,
      temperature: 0.85,
      maxTokens: 2400,
    });

    const parsed = extractJson(raw);

    const script = Array.isArray(parsed.script)
      ? parsed.script
          .map((s, i) => ({
            scene: Number(s.scene) || i + 1,
            voiceover: String(s.voiceover || '').trim(),
            visual: String(s.visual || '').trim(),
            durationSec: Math.max(1, Math.round(Number(s.durationSec) || 0)),
            onScreenText: String(s.onScreenText || '').trim(),
          }))
          .filter((s) => s.voiceover || s.visual)
      : [];

    if (script.length === 0) throw new Error('Model returned no scenes');

    const computedTotal = script.reduce((acc, s) => acc + s.durationSec, 0);

    const data = {
      hook: String(parsed.hook || '').trim(),
      script,
      hashtags: Array.isArray(parsed.hashtags)
        ? parsed.hashtags
            .map((h) => String(h).trim())
            .filter(Boolean)
            .map((h) => (h.startsWith('#') ? h : `#${h}`))
            .slice(0, 15)
        : [],
      totalDurationSec: computedTotal || duration,
      captions: String(parsed.captions || '').slice(0, 280),
      platform,
      duration,
    };

    return Response.json({ success: true, data });
  } catch (err) {
    console.error('[AI Shorts Script]', err);
    return Response.json({ success: false, error: err.message || 'Shorts script failed' }, { status: 500 });
  }
}
