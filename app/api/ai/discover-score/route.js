import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM = `You are a senior Google Discover editor at a top-tier wildlife publication. You evaluate articles for Discover-feed eligibility and rank potential — emotional hook, fresh angle, evergreen-plus-timely balance, vivid imagery, shareability, mobile-first formatting, and headline curiosity gap. Return ONLY a single valid JSON object — no markdown fences.`;

function extractJson(raw) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in response');
  return JSON.parse(match[0]);
}

const VALID_GRADES = ['A+', 'A', 'B', 'C', 'D', 'F'];

function gradeFromScore(score) {
  if (score >= 92) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export async function POST(req) {
  try {
    const { title = '', content = '', cover = '', provider = 'claude' } = await req.json();
    if (!title || !content || !content.trim()) {
      return Response.json({ success: false, error: 'title and content are required' }, { status: 400 });
    }

    const plainText = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = plainText.split(/\s+/).filter(Boolean).length;
    const hasImages = /<img/i.test(content) || !!cover;
    const h2Count = (content.match(/<h2/gi) || []).length;

    const prompt = `Evaluate this wildlife article for Google Discover feed eligibility and rank potential. Be honest — most articles do NOT score above 80 on Discover.

Title: "${title}"
Word count: ${wordCount}
Has cover/inline images: ${hasImages}
H2 headings: ${h2Count}
Article (first 3500 chars):
${plainText.slice(0, 3500)}

Score these criteria (0-100 weighted importance shown in parentheses) and combine into one weighted overall score:
1. Emotional Hook (20) — does the opening grab a Discover swiper in <5 seconds?
2. Curiosity-Gap Headline (15) — specific, intriguing, not clickbait, not generic listicle
3. Fresh Angle (15) — original perspective vs the same article on every wildlife site
4. Evergreen + Timely Balance (10) — useful long-term but feels current
5. Vivid Imagery & Description (10) — sensory writing that pairs with hero image
6. Mobile-First Formatting (10) — short paragraphs, scannable subheads, lists
7. Shareability (10) — would readers screenshot or send to a friend?
8. E-E-A-T Signals (10) — expertise, citations, author voice, factual depth

Then assign a letter grade: A+ (92-100), A (85-91), B (70-84), C (55-69), D (40-54), F (<40).

Return ONLY this JSON:
{
  "score": 0,
  "grade": "B",
  "verdict": "one-sentence overall assessment",
  "criteria": [
    { "name": "Emotional Hook", "met": true, "weight": 20, "comment": "specific brief note" }
  ],
  "improvements": ["actionable improvement 1", "actionable improvement 2", "actionable improvement 3"]
}`;

    const model =
      provider === 'openai'
        ? openai(process.env.OPENAI_MODEL || 'gpt-4o')
        : anthropic(process.env.ANTHROPIC_MODEL || 'claude-opus-4-7');

    const { text: raw } = await generateText({
      model,
      system: SYSTEM,
      prompt,
      temperature: 0.4,
      maxTokens: 2200,
    });

    const parsed = extractJson(raw);
    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
    const grade = VALID_GRADES.includes(parsed.grade) ? parsed.grade : gradeFromScore(score);

    const data = {
      score,
      grade,
      verdict: String(parsed.verdict || '').slice(0, 280),
      criteria: Array.isArray(parsed.criteria)
        ? parsed.criteria.slice(0, 12).map((c) => ({
            name: String(c.name || '').slice(0, 80),
            met: !!c.met,
            weight: Math.max(0, Math.min(100, Number(c.weight) || 0)),
            comment: String(c.comment || '').slice(0, 240),
          }))
        : [],
      improvements: Array.isArray(parsed.improvements)
        ? parsed.improvements.slice(0, 10).map((s) => String(s).slice(0, 280))
        : [],
    };

    return Response.json({ success: true, data });
  } catch (err) {
    console.error('[AI Discover Score]', err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
