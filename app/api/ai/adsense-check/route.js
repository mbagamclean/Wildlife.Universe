import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM = `You are a Google AdSense policy compliance expert. You evaluate content against Google's official AdSense policies (valuable inventory, no adult/violent/hate content, no copyrighted material, no misleading claims, no thin content). Return ONLY valid JSON.`;

function extractJson(raw) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in response');
  return JSON.parse(match[0]);
}

export async function POST(req) {
  try {
    const { title = '', content = '', excerpt = '', provider = 'claude' } = await req.json();
    if (!content || !content.trim()) {
      return Response.json({ success: false, error: 'Content is required' }, { status: 400 });
    }

    const text = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    const prompt = `Evaluate this wildlife article for Google AdSense approval readiness against official AdSense policies.

Check against:
1. Valuable Inventory: original, substantial, useful (1,500+ words ideal, 4,000+ excellent)
2. No adult or sexually explicit content
3. No dangerous, derogatory, or hate content
4. No copyrighted material reproduced without permission
5. No misleading or deceptive claims
6. No thin content or filler
7. Family-safe (wildlife photography is fine; gore/cruelty is not)
8. No promotion of illegal activities (poaching, illegal wildlife trade)

Return ONLY this JSON:
{
  "compliant": true,
  "score": 0,
  "issues": ["specific policy violations or critical concerns"],
  "warnings": ["minor concerns that should be fixed before applying for AdSense"],
  "recommendations": ["specific actionable improvements to strengthen approval"]
}

Scoring:
- 85–100 = ready for AdSense, fully compliant
- 60–84 = compliant but needs polish (warnings)
- 30–59 = serious issues; revise before applying
- 0–29 = non-compliant; major rewrites needed

Title: ${title || '(untitled)'}
Excerpt: ${excerpt || '(no excerpt)'}
Word count: ${wordCount}
Content (first 4000 chars): ${text.slice(0, 4000)}`;

    const model =
      provider === 'openai'
        ? openai(process.env.OPENAI_MODEL || 'gpt-4o')
        : anthropic(process.env.ANTHROPIC_MODEL || 'claude-opus-4-7');

    const { text: raw } = await generateText({
      model,
      system: SYSTEM,
      prompt,
      temperature: 0.2,
      maxTokens: 2000,
    });

    const parsed = extractJson(raw);
    const score = Math.max(0, Math.min(Number(parsed.score) || 0, 100));
    const data = {
      compliant: typeof parsed.compliant === 'boolean' ? parsed.compliant : score >= 60,
      score,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    };

    return Response.json({ success: true, data });
  } catch (err) {
    console.error('[AI AdSense Check]', err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
