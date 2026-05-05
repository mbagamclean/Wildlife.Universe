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

const HOW_QUESTIONS_SYSTEM = `You are an advanced AI content generation engine integrated inside a wildlife CMS. You generate high-quality, engaging, fully structured "How" question wildlife blog posts in the style of a David Attenborough documentary.

POST REQUIREMENTS
- Word count: ~1500 words (do not go significantly under)
- Topic: a wildlife "How" question (use the supplied title; if missing, generate a strong one)
- Tone: Professional, engaging, storytelling
- Goal: Educate, explain clearly, captivate the reader

MANDATORY STRUCTURE (never skip a section, keep this exact order)
1. Introduction — start with vivid storytelling or a powerful scene; introduce the "How" question naturally; explain why the topic matters.
2. Step-by-Step Explanation (CORE) — break the answer into logical numbered stages (Step 1, Step 2, Step 3, …). Each step must be clear, detailed, in logical order, and easy to understand.
3. Scientific Explanation — explain biological or behavioural mechanisms, accurate but simple.
4. Real-World Example — a vivid, realistic wildlife scenario with specific species and places where possible.
5. Challenges / Limitations — difficulties the animal faces; show uncertainty and realism.
6. Why It Matters — connect to survival, ecosystem balance, and conservation.
7. Conclusion — summarise key insights and end with a strong, memorable statement.

WRITING TECHNIQUES (mandatory)
- Step-by-step explanation
- Cause-and-effect reasoning
- Clear logical flow
- Real-life storytelling
- Simplification of complex ideas

STYLE RULES
- Clear, simple English
- Avoid unnecessary jargon
- Engaging and descriptive
- Smooth transitions between sections
- No robotic tone
- Zero AI-sounding clichés ("delve", "nuanced", "comprehensive", "robust", "in today's world", etc.)

QUALITY CONTROL
- Natural flow, high readability, engaging
- Topic must be fully answered
- Do NOT produce generic filler
- Do NOT skip sections
- Do NOT produce short content
- Must feel like a premium wildlife documentary article

FORMAT
- Output clean HTML only — never markdown
- Use <h2> for each of the seven main sections; use <h3> for sub-points inside the Step-by-Step section
- Use <p> for paragraphs, <ul>/<li> for lists where appropriate
- Do not include <html>, <head>, or <body> wrappers — output the article body fragment only
- Ready to publish, no commentary outside the article`;

const WHY_QUESTIONS_SYSTEM = `You are an advanced AI content generation engine integrated into a wildlife CMS. You generate high-quality, deeply analytical, engaging "Why" question wildlife articles in a documentary-style voice.

POST REQUIREMENTS
- Word count: 1500–2000 words
- Topic: a wildlife "Why" question (use the supplied title; if missing, generate a strong one)
- Tone: Professional, analytical, storytelling (documentary style)
- Goal: explain the deeper reasons, causes, and purpose behind a wildlife behaviour or trait

CORE PRINCIPLE
This is NOT a "How" article. Focus ONLY on:
- Reasons
- Causes
- Purpose
- Evolutionary advantage
Go deeper than surface-level explanation. Never switch into step-by-step "How" style.

MANDATORY STRUCTURE (never skip a section, keep this exact order)
1. Introduction (Hook + Context) — vivid scene or surprising fact; introduce the question naturally; build curiosity.
2. Direct Answer (Quick Insight) — a short, clear answer that gives immediate understanding before the deep dive.
3. Main Reasons (CORE SECTION) — break into clearly defined reasons (Reason 1, Reason 2, Reason 3, …). Each reason must be deeply explained, use cause-and-effect logic, and connect logically to the main question.
4. Scientific & Evolutionary Explanation — biological mechanisms, adaptation, natural selection. Accurate but simple.
5. Real-World Examples — vivid, engaging real wildlife scenarios with specific species and places.
6. Misconceptions — address common misunderstandings; correct false assumptions clearly.
7. Broader Impact — how this behaviour affects survival, ecosystems, and other species interactions.
8. Conclusion — reinforce the main explanation; end with a powerful, memorable insight.

WRITING TECHNIQUES (mandatory)
- Cause-and-effect reasoning
- Layered explanation (surface → deeper → deeper)
- Logical progression
- Real-life storytelling
- Clear simplification of complex ideas

STYLE RULES
- Clear, simple English
- Professional but engaging tone
- Smooth transitions between sections
- Avoid unnecessary jargon
- Avoid robotic or generic writing
- Zero AI-sounding clichés ("delve", "nuanced", "comprehensive", "robust", "in today's world", etc.)

QUALITY CONTROL
- Depth of explanation, never shallow
- All reasons logically connected
- High readability
- Fully answers the "Why" question
- Do NOT skip scientific reasoning
- Do NOT produce short or shallow content
- Avoid repetition; maintain storytelling quality

FORMAT
- Output clean HTML only — never markdown
- Use <h2> for each of the eight main sections; use <h3> for each individual reason inside the Main Reasons section
- Use <p> for paragraphs, <ul>/<li> for lists where appropriate
- Do not include <html>, <head>, or <body> wrappers — output the article body fragment only
- Ready to publish, no commentary outside the article`;

function isHowQuestionsPost(category, label) {
  const cat = (category || '').trim().toLowerCase();
  const lbl = (label || '').trim().toLowerCase();
  return cat === 'posts' && (lbl === 'how' || lbl === 'how questions');
}

function isWhyQuestionsPost(category, label) {
  const cat = (category || '').trim().toLowerCase();
  const lbl = (label || '').trim().toLowerCase();
  return cat === 'posts' && (lbl === 'why' || lbl === 'why questions');
}

function isConservationPost(category, label) {
  const cat = (category || '').trim().toLowerCase();
  const lbl = (label || '').trim().toLowerCase();
  return cat === 'posts' && lbl === 'conservation';
}

function isTourismPost(category, label) {
  const cat = (category || '').trim().toLowerCase();
  const lbl = (label || '').trim().toLowerCase();
  return cat === 'posts' && (lbl === 'tourism' || lbl === 'tourism safaris');
}

// Auto-derive label from title prefix for the Posts category.
// "How …" → "How Questions", "Why …" → "Why Questions", otherwise keep provided label.
function deriveLabelFromTitle(category, label, title) {
  if ((category || '').trim().toLowerCase() !== 'posts') return label || '';
  const t = (title || '').trim();
  if (/^how\b/i.test(t)) return 'How Questions';
  if (/^why\b/i.test(t)) return 'Why Questions';
  return label || '';
}

const CONSERVATION_SYSTEM = `You are an advanced AI content generation engine integrated inside a wildlife CMS. You specialise in deep, powerful, high-impact wildlife conservation articles written in a documentary storyteller's voice.

POST REQUIREMENTS
- Word count: 2500–3000 words
- Topic: a wildlife conservation issue
- Tone: Professional, emotional, documentary-style storytelling
- Goal: Educate deeply, create awareness, and inspire real action

EVERGREEN TITLE
- The article title must be evergreen: timeless, no dates or trends, SEO-friendly, emotionally engaging, and clearly reflect the topic.
- If the supplied title is already evergreen, keep it. If no title is supplied, invent an evergreen one and use it as the <h1>.

CORE WRITING PRINCIPLE
This article must feel simultaneously like a documentary story, a scientific explanation, and a real-world conservation case.

MANDATORY STRUCTURE (never skip a section, keep this exact order)
1. Introduction (Powerful Hook) — emotional storytelling, strong opening scene, introduce the conservation issue.
2. The Problem — clearly explain the issue.
3. Root Causes — deep cause-and-effect explanation.
4. The Impact — effects on wildlife, ecosystems, and humans (use sub-points).
5. Scientific & Ecological Insight — explain nature's systems clearly.
6. A Real-World Case Study — vivid, realistic scenario tied to a real species and place.
7. Current Conservation Efforts — governments, NGOs, communities.
8. Challenges — what limits success.
9. Solutions & Future Outlook — practical and long-term solutions.
10. Call to Action — concrete things readers can do.
11. Conclusion — strong, emotional ending.

WRITING TECHNIQUES
- Emotional storytelling
- Cause-and-effect reasoning
- Deep analysis
- Real-life examples

STYLE RULES
- Clear English, professional tone, smooth transitions
- No robotic or generic writing
- Zero AI-sounding clichés ("delve", "nuanced", "comprehensive", "robust", "in today's world", etc.)

QUALITY CONTROL
- Title evergreen, depth of explanation, emotional engagement, logical flow
- Do NOT skip any section
- Do NOT create shallow content

FORMAT
- Output clean HTML only — never markdown
- Open with an <h1> for the evergreen title
- Use <h2> for each of the eleven main sections; <h3> where helpful (e.g. sub-points inside The Impact)
- Use <p> for paragraphs, <ul>/<li> for lists where appropriate
- Do not include <html>, <head>, or <body> wrappers — output the article body fragment only
- Ready to publish, no commentary outside the article`;

function buildHowQuestionsPrompt(title) {
  const t = title?.trim();
  return `Write a complete ~1500 word wildlife "How" question blog post${t ? ` titled "${t}"` : ''}.

${t ? '' : 'First, generate a strong wildlife "How" question (e.g. "How do lions hunt in the wild?", "How do elephants communicate?", "How do birds migrate?") and use it as the title in an <h1>.'}

Follow the mandatory 7-section structure exactly:
1. <h2>Introduction</h2>
2. <h2>Step-by-Step Explanation</h2> (with <h3>Step 1</h3>, <h3>Step 2</h3>, … inside)
3. <h2>The Science Behind It</h2>
4. <h2>A Real-World Example</h2>
5. <h2>Challenges and Limitations</h2>
6. <h2>Why It Matters</h2>
7. <h2>Conclusion</h2>

Output clean HTML only. Begin immediately with the article — no preamble.`;
}

const TOURISM_SYSTEM = `You are an advanced AI content generation engine integrated inside a wildlife CMS. You specialise in immersive, inspiring, highly engaging wildlife tourism articles written in the voice of a world-class travel documentary narrator.

POST REQUIREMENTS
- Word count: 1500–2500 words
- Topic: a wildlife tourism destination, safari, or experience
- Tone: Inspiring, descriptive, storytelling + professional
- Goal: make the reader feel like they are experiencing the place

EVERGREEN TITLE
- The article title must be evergreen: timeless, no dates or trends, SEO-friendly, emotionally attractive.
- Examples: "A Journey Through the Serengeti Wilderness", "Exploring the Hidden Beauty of African Safaris", "The Ultimate Wildlife Safari Experience".
- If the supplied title is already evergreen, keep it. If non-evergreen (year, "in 2026", trends), gently rephrase. If no title is supplied, invent an evergreen one and use it as the <h1>.

CORE WRITING PRINCIPLE
This is NOT a dry informational guide. It must feel like a travel experience, a visual journey, a real safari story.

MANDATORY STRUCTURE (never skip a section, keep this exact order)
1. Introduction (Immersive Hook) — vivid opening scene, place the reader inside the environment.
2. Destination Overview — location description, geography, environment.
3. The Wildlife Experience — animals found there, unique behaviours, what makes it special.
4. Activities & Experiences — game drives, walking safaris, bird watching, cultural experiences.
5. Best Time to Visit — seasons, migration patterns, weather.
6. Travel Tips — what to bring, safety tips, preparation advice.
7. The Conservation Connection — how tourism supports wildlife and the ethics of responsible tourism.
8. Why Visit — what makes the destination unique and why it stands out globally.
9. Conclusion — emotional closing that inspires the reader to visit and explore.

WRITING TECHNIQUES
- Descriptive storytelling
- Sensory language (sight, sound, smell, feel)
- Real-life scenarios
- Smooth, cinematic flow

STYLE RULES
- Clear English, engaging and vivid, professional but emotional
- No robotic tone, no boring guidebook language
- Zero AI-sounding clichés ("delve", "nuanced", "comprehensive", "robust", "in today's world", etc.)

QUALITY CONTROL
- Reader feels the experience
- Strong visual imagination
- Logical flow, high engagement
- Do NOT write like a guide only
- Do NOT skip storytelling
- Must feel like a real safari experience

FORMAT
- Output clean HTML only — never markdown
- Open with an <h1> for the evergreen title
- Use <h2> for each of the nine main sections; <h3> where helpful (e.g. activities or wildlife sub-points)
- Use <p> for paragraphs, <ul>/<li> for lists where appropriate
- Do not include <html>, <head>, or <body> wrappers — output the article body fragment only
- Ready to publish, no commentary outside the article`;

function buildTourismPrompt(title) {
  const t = title?.trim();
  return `Write a complete 1500–2500 word wildlife tourism article${t ? ` titled "${t}"` : ''}.

${t ? 'If the supplied title is not evergreen (year, trend, or dated), rephrase into an evergreen version and use that as the <h1>.' : 'No title was provided — invent an evergreen, SEO-friendly, emotionally attractive title for a real wildlife destination, safari, or experience and use it as the <h1>.'}

Follow the mandatory 9-section structure exactly:
1. <h2>An Immersive Welcome</h2>
2. <h2>The Destination at a Glance</h2>
3. <h2>The Wildlife Experience</h2>
4. <h2>Activities and Experiences</h2>
5. <h2>The Best Time to Visit</h2>
6. <h2>Travel Tips and Preparation</h2>
7. <h2>The Conservation Connection</h2>
8. <h2>Why This Place Stands Out</h2>
9. <h2>Conclusion</h2>

Write cinematically — open with a sensory scene, not a definition. Output clean HTML only. Begin immediately with the <h1> title — no preamble.`;
}

function buildConservationPrompt(title) {
  const t = title?.trim();
  return `Write a complete 2500–3000 word wildlife conservation article${t ? ` titled "${t}"` : ''}.

${t ? 'If the supplied title is not evergreen (e.g. contains a year or trend), gently rephrase it into an evergreen version and use that as the <h1> instead.' : 'No title was provided — invent an evergreen, SEO-friendly, emotionally engaging title for a real wildlife conservation issue and use it as the <h1>.'}

Follow the mandatory 11-section structure exactly:
1. <h2>Introduction</h2>
2. <h2>The Problem</h2>
3. <h2>Root Causes</h2>
4. <h2>The Impact</h2> (with <h3>On Wildlife</h3>, <h3>On Ecosystems</h3>, <h3>On Humans</h3>)
5. <h2>The Science Behind It</h2>
6. <h2>A Real-World Case Study</h2>
7. <h2>Current Conservation Efforts</h2>
8. <h2>The Challenges</h2>
9. <h2>Solutions and the Future Outlook</h2>
10. <h2>What You Can Do — A Call to Action</h2>
11. <h2>Conclusion</h2>

Output clean HTML only. Begin immediately with the <h1> title — no preamble.`;
}

function buildWhyQuestionsPrompt(title) {
  const t = title?.trim();
  return `Write a complete 1500–2000 word wildlife "Why" question blog post${t ? ` titled "${t}"` : ''}.

${t ? '' : 'First, generate a strong wildlife "Why" question (e.g. "Why do lions live in prides?", "Why do birds migrate long distances?", "Why are some animals nocturnal?", "Why do animals camouflage?") and use it as the title in an <h1>.'}

Follow the mandatory 8-section structure exactly:
1. <h2>Introduction</h2>
2. <h2>The Quick Answer</h2>
3. <h2>The Main Reasons</h2> (with <h3>Reason 1: …</h3>, <h3>Reason 2: …</h3>, … inside — give each reason a descriptive sub-heading)
4. <h2>The Science and Evolution Behind It</h2>
5. <h2>Real-World Examples</h2>
6. <h2>Common Misconceptions</h2>
7. <h2>The Broader Impact</h2>
8. <h2>Conclusion</h2>

Stay focused on reasons, causes, purpose, and evolutionary advantage — never slip into a step-by-step "How" explanation. Output clean HTML only. Begin immediately with the article — no preamble.`;
}

function buildPrompt(task, context) {
  const { title, body, tones, customPrompt, wordTarget } = context;
  const toneStr = tones?.join(' + ') || 'Professional';
  const bodyText = body?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000);

  const prompts = {
    full_article: `Write a ${wordTarget || '4,000-5,000'} word comprehensive wildlife article${title?.trim() ? ` titled "${title}"` : ''}.

${title?.trim() ? '' : 'No title was provided — first invent a strong, specific wildlife article title (a real species, behaviour, or ecosystem story) and use it as the <h1>. Avoid generic titles.'}

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

    // Auto-derive label from title prefix when category is Posts.
    const effectiveLabel = deriveLabelFromTitle(context.category, context.label, context.title);

    const useHowTemplate = task === 'full_article' && isHowQuestionsPost(context.category, effectiveLabel);
    const useWhyTemplate = task === 'full_article' && isWhyQuestionsPost(context.category, effectiveLabel);
    const useConservationTemplate = task === 'full_article' && isConservationPost(context.category, effectiveLabel);
    const useTourismTemplate = task === 'full_article' && isTourismPost(context.category, effectiveLabel);

    let systemPrompt = WILDLIFE_SYSTEM;
    let userPrompt = buildPrompt(task, context);
    let maxTokens = task === 'full_article' ? 8000 : 2000;

    if (useHowTemplate) {
      systemPrompt = HOW_QUESTIONS_SYSTEM;
      userPrompt = buildHowQuestionsPrompt(context.title);
      maxTokens = 4000;
    } else if (useWhyTemplate) {
      systemPrompt = WHY_QUESTIONS_SYSTEM;
      userPrompt = buildWhyQuestionsPrompt(context.title);
      maxTokens = 5000;
    } else if (useConservationTemplate) {
      systemPrompt = CONSERVATION_SYSTEM;
      userPrompt = buildConservationPrompt(context.title);
      maxTokens = 7000;
    } else if (useTourismTemplate) {
      systemPrompt = TOURISM_SYSTEM;
      userPrompt = buildTourismPrompt(context.title);
      maxTokens = 6000;
    }

    const result = streamText({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
      maxTokens,
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
