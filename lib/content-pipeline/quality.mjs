/**
 * Pre-publish quality gate for generated articles.
 *
 * Runs against the structured + body output of the content pipeline.
 * Returns { ok, reasons } — the cron worker fails the queue row when
 * !ok and leaves the post as draft. Without this, a short or malformed
 * AI response would auto-publish straight to the live site.
 *
 * Design: the v1 gate required 10 specific section names ("classification",
 * "behaviour", "diet", "reproduction", "iucn", …) borrowed from the
 * animals article structure. This silently rejected EVERY plant, bird,
 * insect, posts, and IUCN-Redlist article because their system prompts
 * deliberately use different section structures (e.g. IUCN_REDLIST_SYSTEM
 * is conservation-engineering focused — "Population Dynamics", "Climate
 * Change Vulnerability" — and has no "classification" section by design).
 *
 * The v2 gate (this file) only requires the three structural anchors every
 * article type does emit: an opening, a closing, and an FAQ. Everything
 * else is governed by word count + H2 count + structural-field checks.
 */

import { countWords } from './generate.mjs';

const MIN_WORDS = 4000;
const MIN_H2 = 8;
const MIN_FAQ_ENTRIES = 5;
// SOURCES floor — Google's quality models read 0 external links as a
// "no demonstrated research" signal (a primary E-E-A-T failure causing
// "Crawled — currently not indexed" verdicts). The prompt SOURCES_BLOCK
// asks for 6-10 links; we enforce a soft floor of 5 to allow some slop.
const MIN_EXTERNAL_LINKS = 5;

// Broad alternations matching the heading variants every category-specific
// system prompt emits. "Introduction" for species, "The Problem" or "Hook"
// for posts/Conservation, "Opening" for some templates.
// Broadened to accept the diversified opening/closing/FAQ headings the
// STYLE_DIVERSIFICATION_BLOCK asks the autopilot to choose from. Without
// these alternatives the quality gate would reject most diversified
// articles and the fleet would idle on draft rejection.
const OPENING_PATTERN = /introduction|overview|\bintro\b|opening|the problem|the question|hook|meet the|in brief|why the|ecological position|the puzzle|unrav(?:eling|elling)/i;
const CLOSING_PATTERN = /conclusion|summary|takeaway|final thoughts|closing|call to action|what comes next|road ahead|threads in the|web of life|in the field|final notes/i;
const FAQ_PATTERN     = /frequently asked|\bfaq\b|\bfaqs\b|common questions|questions readers ask|reader questions/i;
const SOURCES_PATTERN = /sources\s*(?:&|and|&amp;)?\s*attribution|references|works cited|further reading/i;

function getHeadingsText(body) {
  return (body.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi) || []).join(' ');
}

export function validateGeneratedPost({ body, structured, coverUrl, category }) {
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

  // 2. H2 count — generic depth check, not section-name-specific
  const h2Tags = body.match(/<h2\b/gi) || [];
  stats.h2Count = h2Tags.length;
  if (h2Tags.length < MIN_H2) {
    reasons.push(`h2-sections-low (${h2Tags.length} < ${MIN_H2})`);
  }

  // 3. Structural anchors that every category's prompt emits
  const headings = getHeadingsText(body);
  if (!OPENING_PATTERN.test(headings)) reasons.push('missing-opening-section');
  if (!CLOSING_PATTERN.test(headings)) reasons.push('missing-closing-section');
  if (!FAQ_PATTERN.test(headings))     reasons.push('missing-faq-section');
  if (!SOURCES_PATTERN.test(headings)) reasons.push('missing-sources-attribution-section');

  // 3a. External-link floor — autopilot posts averaged 0 external links
  // per article before the SOURCES_BLOCK prompt addition. Enforce that
  // the model actually emits citations (not just the section heading).
  const externalLinks = body.match(/<a\b[^>]*href=["']https?:\/\/[^"']+["']/gi) || [];
  stats.externalLinks = externalLinks.length;
  if (externalLinks.length < MIN_EXTERNAL_LINKS) {
    reasons.push(`external-links-low (${externalLinks.length} < ${MIN_EXTERNAL_LINKS})`);
  }

  // 4. Structured fields — FAQ has at least MIN_FAQ_ENTRIES entries,
  // slug is URL-safe. Scientific name is no longer required (concept
  // articles don't have one; species articles already encode it in the
  // title via "Common Name (Scientific name)"). IUCN status defaults to
  // 'NE' so checking presence is meaningless.
  if (!structured) {
    reasons.push('structured-missing');
  } else {
    if (!Array.isArray(structured.faq) || structured.faq.length < MIN_FAQ_ENTRIES) {
      reasons.push(`faq-too-short (${structured.faq?.length || 0} < ${MIN_FAQ_ENTRIES})`);
    }
    if (!structured.slug || !/^[a-z0-9-]+$/.test(structured.slug)) {
      reasons.push(`slug-invalid (${structured.slug})`);
    }
  }

  // 5. Cover image
  if (!coverUrl || typeof coverUrl !== 'string' || !coverUrl.startsWith('http')) {
    reasons.push('cover-missing-or-invalid');
  }

  return { ok: reasons.length === 0, reasons, stats };
}
