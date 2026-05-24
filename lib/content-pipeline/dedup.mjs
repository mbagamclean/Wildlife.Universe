/**
 * Pre-insert duplicate detection.
 *
 * Three checks, cheapest first:
 *   1. Exact title match (any category)
 *   2. Exact slug match (handled by DB UNIQUE, but caught earlier here
 *      so we can fail the queue row with a clear reason)
 *   3. Body similarity vs other posts in the SAME category, only when
 *      title or slug were close — limits the expensive comparison to
 *      a handful of candidate rows.
 *
 * Returns { isDuplicate, reason, matchedPostId? }.
 */

import { createClient } from '@supabase/supabase-js';

const SIMILARITY_THRESHOLD = 0.7;
const BODY_SAMPLE_CHARS = 500;

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function tokenize(text) {
  return new Set(
    String(text)
      .replace(/<[^>]*>/g, ' ')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 4), // drop articles, short words
  );
}

function jaccard(setA, setB) {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersect = 0;
  for (const t of setA) if (setB.has(t)) intersect += 1;
  const union = setA.size + setB.size - intersect;
  return union === 0 ? 0 : intersect / union;
}

export async function isDuplicateOfExisting({ structured, body, category, excludePostId = null }) {
  const sb = adminSupabase();

  // 1. Exact title match (case-insensitive). Excludes the just-inserted
  //    draft post (passed as excludePostId) so the cron worker's
  //    insert-then-dedup flow doesn't self-collide.
  let titleQ = sb.from('posts').select('id, slug').ilike('title', structured.title).neq('status', 'draft');
  if (excludePostId) titleQ = titleQ.neq('id', excludePostId);
  const { data: titleHit } = await titleQ.limit(1);
  if (titleHit && titleHit.length > 0) {
    return { isDuplicate: true, reason: 'exact-title-match', matchedPostId: titleHit[0].id };
  }

  // 2. Exact slug match — checks ALL posts (incl. drafts) so a real
  //    slug collision against an existing draft is caught. excludePostId
  //    carves out the row we just inserted.
  let slugQ = sb.from('posts').select('id, slug').eq('slug', structured.slug);
  if (excludePostId) slugQ = slugQ.neq('id', excludePostId);
  const { data: slugHit } = await slugQ.limit(1);
  if (slugHit && slugHit.length > 0) {
    return { isDuplicate: true, reason: 'slug-collision', matchedPostId: slugHit[0].id };
  }

  // 3. Body similarity within same category — limit candidate set so we
  //    don't pull every post body. Pick posts with overlapping tags or
  //    same scientific name as a cheap candidate filter.
  let candidateFilter = sb
    .from('posts')
    .select('id, slug, scientific_name, body')
    .eq('category', category)
    .neq('status', 'draft');
  if (excludePostId) candidateFilter = candidateFilter.neq('id', excludePostId);
  if (structured.scientificName) {
    candidateFilter = candidateFilter.eq('scientific_name', structured.scientificName);
  }
  const { data: candidates } = await candidateFilter.limit(20);

  if (candidates && candidates.length > 0) {
    const newSample = (body || '').slice(0, BODY_SAMPLE_CHARS);
    const newTokens = tokenize(newSample);
    for (const c of candidates) {
      const cSample = (c.body || '').slice(0, BODY_SAMPLE_CHARS);
      const sim = jaccard(newTokens, tokenize(cSample));
      if (sim >= SIMILARITY_THRESHOLD) {
        return {
          isDuplicate: true,
          reason: `body-similarity-${sim.toFixed(2)}`,
          matchedPostId: c.id,
        };
      }
    }
  }

  return { isDuplicate: false };
}

/**
 * Cheap PRE-generation duplicate check. Runs ~50ms against the DB. Catches
 * the common case where a topic is already a published post in ANY category —
 * before we burn ~16 min of CLI body+extract and an OpenAI/Gemini image call
 * on something the dedup gate would reject anyway.
 *
 * Two fingerprints, both case-insensitive, both CROSS-CATEGORY:
 *   1. Scientific name extracted from "Common Name (Scientific name)" parens
 *      — matched against posts.scientific_name. The single most reliable
 *      identity for any species article.
 *   2. Exact topic-vs-title match — catches posts/* (concept articles with
 *      no scientific name) and species topics where the model didn't
 *      record a scientific_name in structured extract.
 *
 * Returns { isDuplicate, reason, matchedPostId, matchedSlug }.
 */
export async function isPreGenerationDuplicate({ topic, category, label }) {
  const sb = adminSupabase();
  const trimmed = String(topic || '').trim();
  if (!trimmed) return { isDuplicate: false };

  // 1. Scientific-name extraction. Robust to leading/trailing whitespace
  //    and to topics where the scientific name has subspecies words (e.g.
  //    "Cross River Gorilla (Gorilla gorilla diehli)").
  const sciMatch = trimmed.match(/\(([^)]+)\)\s*$/);
  if (sciMatch) {
    const sciName = sciMatch[1].trim();
    if (sciName) {
      const { data: hits } = await sb
        .from('posts')
        .select('id, slug, title, category, label')
        .eq('status', 'published')
        .ilike('scientific_name', sciName)
        .limit(1);
      if (hits && hits.length > 0) {
        return {
          isDuplicate: true,
          reason: `same-scientific-name (${sciName})`,
          matchedPostId: hits[0].id,
          matchedSlug: hits[0].slug,
        };
      }
    }
  }

  // 2. Exact title match — catches posts/* (no scientific name) and any
  //    cases where extract failed to record scientific_name.
  const { data: titleHits } = await sb
    .from('posts')
    .select('id, slug, title, category, label')
    .eq('status', 'published')
    .ilike('title', trimmed)
    .limit(1);
  if (titleHits && titleHits.length > 0) {
    return {
      isDuplicate: true,
      reason: 'same-title',
      matchedPostId: titleHits[0].id,
      matchedSlug: titleHits[0].slug,
    };
  }

  return { isDuplicate: false };
}
