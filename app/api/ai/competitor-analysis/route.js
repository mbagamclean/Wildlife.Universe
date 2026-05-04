import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { pickTextModel } from '@/lib/ai/select-model';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM = `You are a top-tier SEO content strategist. You dissect a competitor article, find what is genuinely strong about it and what is exploitable, and you give the writer a concrete plan to outrank it. Brutally honest, never flattering. Return ONLY a single valid JSON object — no markdown fences.`;

function extractJson(raw) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in response');
  return JSON.parse(match[0]);
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<aside[\s\S]*?<\/aside>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchUrl(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; WildlifeUniverseBot/1.0)',
      'Accept': 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('text/html') && !ct.includes('application/xhtml')) {
    throw new Error(`URL did not return HTML (content-type: ${ct})`);
  }
  const html = await res.text();
  return htmlToText(html).slice(0, 12000);
}

export async function POST(req) {
  try {
    const { competitorContent = '', competitorUrl = '', yourTopic = '', provider = 'claude',
      model = null, } = await req.json();

    if (!yourTopic || !yourTopic.trim()) {
      return Response.json({ success: false, error: 'yourTopic is required' }, { status: 400 });
    }

    let text = competitorContent.trim();
    let sourceLabel = 'pasted text';

    if (!text && competitorUrl) {
      try {
        text = await fetchUrl(competitorUrl);
        sourceLabel = competitorUrl;
      } catch (err) {
        return Response.json({ success: false, error: `Could not fetch URL: ${err.message}` }, { status: 400 });
      }
    }

    if (!text) {
      return Response.json({ success: false, error: 'Provide either competitorContent or a fetchable competitorUrl' }, { status: 400 });
    }

    const cleaned = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 8000);
    const wordCount = cleaned.split(/\s+/).filter(Boolean).length;
    const h2Count = (text.match(/<h2/gi) || []).length;

    const prompt = `Analyse the competitor article below and produce a battle plan to outrank them on the topic: "${yourTopic.trim()}".

Source: ${sourceLabel}
Approx word count of competitor: ${wordCount}

Competitor content (cleaned):
${cleaned}

Return ONLY this JSON:
{
  "competitorStrengths": ["specific strength 1", "specific strength 2", "..."],
  "competitorWeaknesses": ["specific weakness 1", "specific weakness 2", "..."],
  "gapsToExploit": ["gap or angle they missed 1", "..."],
  "headlineAlternatives": ["better headline 1", "better headline 2", "..."],
  "structureBreakdown": {
    "wordCount": 0,
    "h2Count": 0,
    "sections": ["main section 1", "main section 2", "..."]
  },
  "beatItPlan": ["concrete step 1 to outrank", "step 2", "..."]
}

Quantities:
- 4-6 strengths, 4-6 weaknesses, 5-8 gaps
- 5 headline alternatives
- 6-10 main sections detected
- 6-10 beat-it action steps (prioritised highest-leverage first)

Be specific. No generic SEO advice like "add more keywords" — every item must reference the actual content.`;

    const aiModel = pickTextModel({ provider, model });

    const { text: raw } = await generateText({
      model: aiModel,
      system: SYSTEM,
      prompt,
      temperature: 0.5,
      maxTokens: 3500,
    });

    const parsed = extractJson(raw);

    const arrStr = (a, max = 12, len = 280) =>
      Array.isArray(a) ? a.slice(0, max).map((s) => String(s).slice(0, len)).filter(Boolean) : [];

    const sb = parsed.structureBreakdown || {};
    const data = {
      competitorStrengths: arrStr(parsed.competitorStrengths),
      competitorWeaknesses: arrStr(parsed.competitorWeaknesses),
      gapsToExploit: arrStr(parsed.gapsToExploit),
      headlineAlternatives: arrStr(parsed.headlineAlternatives, 8, 200),
      structureBreakdown: {
        wordCount: Number(sb.wordCount) || wordCount,
        h2Count: Number(sb.h2Count) || h2Count,
        sections: arrStr(sb.sections, 14, 200),
      },
      beatItPlan: arrStr(parsed.beatItPlan, 12, 320),
    };

    return Response.json({ success: true, data });
  } catch (err) {
    console.error('[AI Competitor Analysis]', err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
