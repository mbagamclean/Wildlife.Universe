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

export async function isDuplicateOfExisting({ structured, body, category }) {
  const sb = adminSupabase();

  // 1. Exact title match (case-insensitive)
  const { data: titleHit } = await sb
    .from('posts')
    .select('id, slug')
    .ilike('title', structured.title)
    .neq('status', 'draft')
    .limit(1);
  if (titleHit && titleHit.length > 0) {
    return { isDuplicate: true, reason: 'exact-title-match', matchedPostId: titleHit[0].id };
  }

  // 2. Exact slug match (DB UNIQUE will reject anyway, but we want a clean reason)
  const { data: slugHit } = await sb
    .from('posts')
    .select('id, slug')
    .eq('slug', structured.slug)
    .limit(1);
  if (slugHit && slugHit.length > 0) {
    return { isDuplicate: true, reason: 'slug-collision', matchedPostId: slugHit[0].id };
  }

  // 3. Body similarity within same category — limit candidate set so we
  //    don't pull every post body. Pick posts with overlapping tags or
  //    same scientific name as a cheap candidate filter.
  const candidateFilter = sb
    .from('posts')
    .select('id, slug, scientific_name, body')
    .eq('category', category)
    .neq('status', 'draft');
  if (structured.scientificName) {
    candidateFilter.eq('scientific_name', structured.scientificName);
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
