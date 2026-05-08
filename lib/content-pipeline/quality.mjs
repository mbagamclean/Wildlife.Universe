/**
 * Pre-publish quality gate for generated articles.
 *
 * Runs against the structured + body output of the content pipeline.
 * Returns { ok, reasons } — the cron worker fails the queue row when
 * !ok and either skips publish or auto-rolls back to draft. Without
 * this, a short or malformed AI response would auto-publish straight
 * to the live site under the user's "auto-publish everything" choice.
 */

import { countWords } from './generate.mjs';

// Minimum word count. ANIMALS_SYSTEM targets 6500+; we accept anything
// over 4000 (real articles routinely hit 5000-6000 due to the output-token
// ceiling on Claude Opus 4.7 — that's still long-form by AdSense standards).
const MIN_WORDS = 4000;
const MIN_FAQ_ENTRIES = 6;
const REQUIRED_H2_SECTIONS = 16; // 18 in spec, allow slight slippage

const REQUIRED_SECTION_KEYWORDS = [
  'introduction',
  'classification',
  'habitat',
  'behaviour|behavior',
  'diet',
  'reproduction',
  'threats',
  'iucn',
  'conclusion',
  'frequently asked',
];

const AI_SLOP_PHRASES = [
  // canonical AI-tells the user wants stripped
  /\bin today's world\b/i,
  /\bdelve into\b/i,
  /\bin the realm of\b/i,
  /\bnavigate the\b/i,
  /\bin conclusion,\b/i,
  /\bit is important to note\b/i,
  /\bas an AI\b/i,
];

export function validateGeneratedPost({ body, structured, coverUrl }) {
  const reasons = [];
  const stats = {};

  if (!body || typeof body !== 'string') {
    return { ok: false, reasons: ['body-missing'], stats };
  }

  // 1. Word count
  const words = countWords(body);
  stats.words = words;
  if (words < MIN_WORDS) {
    reasons.push(`word-count-low (${words} < ${MIN_WORDS})`);
  }

  // 2. H2 section coverage
  const h2Tags = body.match(/<h2\b/gi) || [];
  stats.h2Count = h2Tags.length;
  if (h2Tags.length < REQUIRED_H2_SECTIONS) {
    reasons.push(`h2-sections-low (${h2Tags.length} < ${REQUIRED_H2_SECTIONS})`);
  }

  // 3. Required sections present (case-insensitive keyword match in headings)
  const headingsText = (body.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi) || []).join(' ').toLowerCase();
  const missingSections = REQUIRED_SECTION_KEYWORDS.filter((kw) => !new RegExp(kw, 'i').test(headingsText));
  if (missingSections.length > 0) {
    reasons.push(`missing-sections: ${missingSections.join(', ')}`);
  }

  // 4. AI-slop detection
  const slopHits = AI_SLOP_PHRASES.filter((re) => re.test(body));
  stats.slopHits = slopHits.length;
  if (slopHits.length >= 3) {
    reasons.push(`ai-slop-phrases (${slopHits.length} hits)`);
  }

  // 5. Structured fields
  if (!structured) {
    reasons.push('structured-missing');
  } else {
    if (!structured.scientificName) reasons.push('scientific-name-missing');
    if (!Array.isArray(structured.faq) || structured.faq.length < MIN_FAQ_ENTRIES) {
      reasons.push(`faq-too-short (${structured.faq?.length || 0} < ${MIN_FAQ_ENTRIES})`);
    }
    if (!structured.iucnStatus) reasons.push('iucn-status-missing');
    if (!structured.slug || !/^[a-z0-9-]+$/.test(structured.slug)) {
      reasons.push(`slug-invalid (${structured.slug})`);
    }
  }

  // 6. Cover image
  if (!coverUrl || typeof coverUrl !== 'string' || !coverUrl.startsWith('http')) {
    reasons.push('cover-missing-or-invalid');
  }

  return { ok: reasons.length === 0, reasons, stats };
}
