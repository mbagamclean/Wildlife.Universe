import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';

export const runtime = 'nodejs';
export const maxDuration = 120;

const WILDLIFE_SYSTEM = `You are an elite wildlife documentary writer and nature journalist with 25 years of experience writing for National Geographic, BBC Earth, and the world's leading nature publications. Your prose combines the scientific precision of a naturalist with the narrative warmth of David Attenborough.

Your writing always includes:
- Rich sensory descriptions of habitats and environments
- Accurate scientific naming alongside common names
- Behavioral ecology explanations that feel immersive
- Conservation context and IUCN status where relevant
- Geographic specificity (exact regions, biomes, ecosystems)
- Predator-prey dynamics explained with dramatic tension
- Emotional hooks that make readers care deeply
- Natural paragraph flow with varied sentence lengths
- Strong H2/H3 section structure for SEO
- Semantic keyword integration that feels organic
- EEAT signals (cite specific studies, dates, expert consensus)
- AdSense-compatible content with appropriate ad break points
- FAQ sections with schema-ready question/answer format
- Zero AI-sounding phrases ("delve", "nuanced", "comprehensive", "robust", etc.)

Format all output as clean HTML with proper heading hierarchy (h2, h3), paragraphs, and lists. Never use markdown — only HTML tags.`;

function buildPrompt(task, context) {
  const { title, body, tones, customPrompt, wordTarget } = context;
  const toneStr = tones?.join(' + ') || 'Professional';
  const bodyText = body?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000);

  const prompts = {
    full_article: `Write a ${wordTarget || '4,000-5,000'} word comprehensive article titled "${title}".

Writing tone: ${toneStr}
Audience: Wildlife enthusiasts, nature lovers, safari travelers, conservationists

Structure requirements:
- Compelling hook introduction (250-350 words)
- 10-14 H2 sections with H3 subsections
- Include: habitat, behavior, diet, reproduction, conservation status, interesting facts
- One FAQ section (8-10 questions with answers)
- Strong conclusion with conservation call-to-action
- Natural internal link opportunities marked as [INTERNAL LINK: topic]
- AdSense-friendly paragraph breaks every 200-300 words

Output complete HTML article.`,

    introduction: `Write a 250-350 word hook-driven introduction for an article titled "${title}".
Tone: ${toneStr}
${bodyText ? `Article context: ${bodyText.slice(0, 500)}` : ''}

Requirements:
- Open with a dramatic wildlife moment or striking fact
- Establish emotional connection with the subject
- Preview the article's value without being formulaic
- End with a natural transition to the main content
- Output as HTML paragraph tags only.`,

    conclusion: `Write a compelling conclusion with call-to-action for an article titled "${title}".
Tone: ${toneStr}
${bodyText ? `Article context: ${bodyText.slice(0, 800)}` : ''}

Requirements:
- Summarize key insights without being repetitive
- Include conservation message and reader action steps
- End with a memorable closing statement
- Include a CTA paragraph (subscribe, share, support conservation)
- Output as HTML.`,

    faq: `Write a 8-10 question FAQ section for an article titled "${title}".
${bodyText ? `Article content: ${bodyText.slice(0, 1000)}` : ''}

Requirements:
- Questions should match real Google search queries
- Answers: 50-100 words each, conversational, factual
- Format as HTML with h3 for questions and p for answers
- Use FAQ schema-friendly structure`,

    continue: `Continue writing the following wildlife article naturally. Add 500-800 more words.
Title: "${title}"
Current content: ${bodyText || '(no content yet)'}
Tone: ${toneStr}

Seamlessly continue from where the content ends. Output HTML only.`,

    seo_optimize: `Optimize the following article for SEO without making it sound unnatural.
Title: "${title}"
Content: ${bodyText || '(empty)'}

Add:
- 3-5 LSI keywords naturally integrated
- 2-3 [INTERNAL LINK: topic] suggestions
- Strengthen existing H2/H3 headings with primary keywords
- Improve meta-worthy first sentences of key paragraphs
Output the improved HTML content.`,

    custom: customPrompt || `Write wildlife content related to: ${title}`,
  };

  return prompts[task] || prompts.custom;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { task, provider = 'claude', context = {} } = body;

    const model =
      provider === 'openai'
        ? openai(process.env.OPENAI_MODEL || 'gpt-4o')
        : anthropic(process.env.ANTHROPIC_MODEL || 'claude-opus-4-7');

    const result = streamText({
      model,
      system: WILDLIFE_SYSTEM,
      prompt: buildPrompt(task, context),
      temperature: 0.7,
      maxTokens: task === 'full_article' ? 8000 : 2000,
    });

    return result.toTextStreamResponse();
  } catch (err) {
    console.error('[AI Write]', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
