/**
 * One-shot topic generator + queue seeder.
 *
 * For each (category, label) target, asks Claude Code CLI (Haiku 4.5, fast)
 * to produce 120 unique topics in one of two shapes:
 *
 *   - SPECIES labels (plants/insects/birds): "Common Name (Scientific name)"
 *   - POSTS labels (How/Why/Tourism/Conservation/Articles): evergreen titles
 *
 * Topics are deduped against:
 *   - posts.title and posts.slug (already published)
 *   - content_queue.topic (already queued for any category/label)
 *   - the running per-label batch (the AI sometimes repeats inside one call)
 *
 * Then inserted into content_queue with status='pending' so the cron worker
 * (drain-all.mjs or normal cron) can drain them through the freshly-extended
 * generation pipeline.
 *
 * Run:
 *   node --env-file=.env.local scripts/generate-topics.mjs
 *   node --env-file=.env.local scripts/generate-topics.mjs --label "plants/Trees"   # one label
 *   node --env-file=.env.local scripts/generate-topics.mjs --dry-run                # generate but don't insert
 *
 * Designed to be safe to run alongside the drain — both compete for the Max
 * subscription, but topic-gen calls are short (~10-30s on Haiku) so impact
 * is small.
 */

import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { runClaudeCli, extractJsonArrayFromText } from '../lib/content-pipeline/claude-cli-fallback.mjs';

const TARGET_PER_LABEL = 120;
const BATCH_SIZE = 40;            // ask for 40 at a time — Haiku stays sharp at this size
const MAX_TOPUP_ATTEMPTS = 4;     // if dedupe trims below target, top up up to N times
const MAX_RETRIES_PER_CALL = 3;   // per-call CLI retries on transient failures
const RETRY_PAUSE_MS = 30 * 1000; // wait between CLI retries (rate-limit-friendly)
const TOPIC_MODEL = 'claude-haiku-4-5';

/**
 * The 23 labels the user asked for. Each entry tells the prompt builder
 * what TAXONOMIC SCOPE or EDITORIAL STYLE the label covers. `kind: 'species'`
 * triggers the "Common Name (Scientific name)" format; `kind: 'posts'`
 * triggers evergreen-title format.
 */
const TARGETS = [
  // animals/* — 5 labels × 120 = 600 (added 2026-05-28)
  { category: 'animals', label: 'Mammals',      kind: 'species', scope: 'mammal species across every order (Carnivora, Primates, Cetaceans, Rodents, Ungulates, Marsupials, Monotremes, Bats, etc.). Lean toward iconic, well-known, and ecologically/culturally significant species worldwide.' },
  { category: 'animals', label: 'Reptiles',     kind: 'species', scope: 'reptile species (lizards, snakes, turtles, crocodilians, tuatara). Lean toward iconic and well-known species — from venomous snakes to giant tortoises.' },
  { category: 'animals', label: 'Amphibians',   kind: 'species', scope: 'amphibian species (frogs, toads, salamanders, newts, caecilians). Lean toward iconic species and those of conservation concern.' },
  { category: 'animals', label: 'Fish',         kind: 'species', scope: 'fish species (bony fish, cartilaginous fish — sharks/rays, jawless fish). Lean toward iconic freshwater and marine species worldwide.' },
  { category: 'animals', label: 'IUCN Redlist', kind: 'species', scope: 'IUCN Red List vertebrate species at threatened conservation status (Vulnerable, Endangered, Critically Endangered, Extinct in the Wild) — mammals, reptiles, amphibians, fish. Use real documented species. Lean toward globally significant cases (Vaquita, Amur Leopard, Sumatran Rhino, Hawksbill Sea Turtle, Yangtze Finless Porpoise, etc.).' },

  // plants/* — 4 labels × 120 = 480
  { category: 'plants',  label: 'Trees',  kind: 'species', scope: 'tree species (broadleaf trees, conifers, palms, mangroves) from around the world. Lean toward iconic, well-known, and culturally significant species.' },
  { category: 'plants',  label: 'Shrubs', kind: 'species', scope: 'shrub species (woody plants smaller than trees, including ornamental and native shrubs). Lean toward well-known and ecologically significant species.' },
  { category: 'plants',  label: 'Herbs',  kind: 'species', scope: 'herbaceous plant species (non-woody plants — medicinal herbs, culinary herbs, wildflowers, grasses). Lean toward well-known and useful species.' },
  { category: 'plants',  label: 'Vines',  kind: 'species', scope: 'vining and climbing plant species (lianas, creepers, ornamental vines). Lean toward well-known species.' },

  // insects/* — 8 labels × 120 = 960. NOTE: the user\'s labels follow
  // invertebrate phyla (not strictly insects). Each phylum has its own
  // characteristic species set.
  { category: 'insects', label: 'Porifera',         kind: 'species', scope: 'sponge species (Phylum Porifera — sea sponges, glass sponges, etc.). Use well-documented species.' },
  { category: 'insects', label: 'Cnidaria',         kind: 'species', scope: 'cnidarian species (Phylum Cnidaria — corals, jellyfish, sea anemones, hydrozoans). Lean toward iconic reef species and famous jellyfish.' },
  { category: 'insects', label: 'Platyhelminthes', kind: 'species', scope: 'flatworm species (Phylum Platyhelminthes — planarians, flukes, tapeworms). Use real documented species, including parasitic ones of medical/veterinary interest.' },
  { category: 'insects', label: 'Nematoda',        kind: 'species', scope: 'roundworm species (Phylum Nematoda — free-living and parasitic nematodes). Use real documented species, including agriculturally important ones.' },
  { category: 'insects', label: 'Annelida',        kind: 'species', scope: 'segmented worm species (Phylum Annelida — earthworms, leeches, polychaetes). Lean toward ecologically and economically important species.' },
  { category: 'insects', label: 'Mollusca',        kind: 'species', scope: 'mollusc species (Phylum Mollusca — snails, slugs, octopuses, squids, clams, oysters, cuttlefish). Lean toward iconic and well-known species.' },
  { category: 'insects', label: 'Arthropoda',      kind: 'species', scope: 'arthropod species (Phylum Arthropoda — insects, arachnids, crustaceans, myriapods). Lean toward iconic insects, well-known spiders, famous crustaceans.' },
  { category: 'insects', label: 'Echinodermata',   kind: 'species', scope: 'echinoderm species (Phylum Echinodermata — starfish, sea urchins, sea cucumbers, brittle stars, crinoids). Lean toward iconic species.' },
  { category: 'insects', label: 'IUCN Redlist',    kind: 'species', scope: 'IUCN Red List invertebrate species at threatened conservation status (Vulnerable, Endangered, Critically Endangered, Extinct in the Wild) across any invertebrate phylum — molluscs, corals, crustaceans, insects, etc. Use real documented species with accurate scientific names.' },

  // birds/* — 7 labels × 120 = 840 (added IUCN Redlist 2026-05-28). These match the site\'s avian taxonomy buckets.
  { category: 'birds',   label: 'Basal',     kind: 'species', scope: 'basal bird species (early-diverging lineages: ratites like ostriches, emus, kiwis, cassowaries, rheas, tinamous; and other basal groups like fowl-like birds). Lean toward iconic species.' },
  { category: 'birds',   label: 'Waterfowl', kind: 'species', scope: 'waterfowl species (Anseriformes: ducks, geese, swans). Lean toward iconic and well-known species.' },
  { category: 'birds',   label: 'Coastal',   kind: 'species', scope: 'coastal and seabird species (shorebirds, gulls, terns, pelicans, cormorants, albatrosses, petrels, penguins, puffins, herons, egrets, flamingos). Lean toward iconic species.' },
  { category: 'birds',   label: 'Raptors',   kind: 'species', scope: 'raptor species (eagles, hawks, falcons, owls, vultures, kites, ospreys). Lean toward iconic and well-known species.' },
  { category: 'birds',   label: 'Land',      kind: 'species', scope: 'terrestrial land bird species (parrots, pigeons, doves, woodpeckers, kingfishers, hornbills, toucans, cuckoos, bee-eaters, rollers, hoopoes, turacos, swifts, hummingbirds). Lean toward iconic species.' },
  { category: 'birds',   label: 'Song',      kind: 'species', scope: 'songbird species (Passeriformes / oscines — warblers, finches, thrushes, sparrows, crows, jays, mockingbirds, larks, swallows, wrens, tits, chickadees). Lean toward iconic and well-known species.' },
  { category: 'birds',   label: 'IUCN Redlist', kind: 'species', scope: 'IUCN Red List bird species at threatened conservation status (Vulnerable, Endangered, Critically Endangered, Extinct in the Wild) across every avian family. Use real documented species with accurate scientific names. Lean toward globally significant cases (California Condor, Spix\'s Macaw, Kakapo, Philippine Eagle, Northern Bald Ibis, etc.).' },

  // posts/* — 5 labels × 120 = 600
  { category: 'posts',   label: 'How Questions',  kind: 'posts', scope: 'questions starting with "How" about wildlife, nature, animal behavior, biology, ecology, conservation. Examples: "How Do Whales Sing Across Oceans?", "How Do Elephants Mourn Their Dead?". Must be evergreen, trending, high-search-volume, AdSense-safe.' },
  { category: 'posts',   label: 'Why Questions',  kind: 'posts', scope: 'questions starting with "Why" about wildlife, nature, animal behavior, biology, ecology. Examples: "Why Do Flamingos Stand on One Leg?", "Why Are Coral Reefs Disappearing?". Must be evergreen, trending, high-search-volume, AdSense-safe.' },
  { category: 'posts',   label: 'Tourism',        kind: 'posts', scope: 'wildlife and nature tourism articles — destinations, experiences, safaris, national parks, eco-lodges, wildlife trips, marine experiences. Examples: "The Ultimate Guide to Gorilla Trekking in Uganda", "The 12 Best National Parks for Wildlife Photography". Must be evergreen, searchable, AdSense-safe.' },
  { category: 'posts',   label: 'Conservation',   kind: 'posts', scope: 'wildlife conservation issues, solutions, case studies, success stories. Examples: "Saving the Amur Leopard: A Decade of Conservation", "How Community-Led Conservation Is Reviving African Wildlife". Must be evergreen, emotionally engaging, AdSense-safe.' },
  { category: 'posts',   label: 'Articles',       kind: 'posts', scope: 'general evergreen wildlife and nature articles — explainers, deep-dives, listicles, ultimate guides. Examples: "The 10 Most Intelligent Animals on Earth", "The Hidden Lives of Migratory Birds". Must be evergreen, trending, AdSense-safe.' },
];

// ───── helpers ────────────────────────────────────────────────────────

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function makeQueueId() {
  return 'q' + randomUUID().replace(/-/g, '').slice(0, 12);
}

// Normalize for dedupe. For species topics, the scientific name is the
// canonical identity (two listings of "Lion (Panthera leo)" and "African
// Lion (Panthera leo)" should be considered the same).
function normalizeForDedup(topic, kind) {
  const s = String(topic).trim().toLowerCase();
  if (kind === 'species') {
    const m = s.match(/\(([^)]+)\)/);
    if (m) return 'sci:' + m[1].trim().replace(/\s+/g, ' ');
  }
  return 'txt:' + s.replace(/[^a-z0-9 ]+/g, '').replace(/\s+/g, ' ').trim();
}

function buildSpeciesPrompt(scope, count, excluded) {
  const excludeBlock = excluded.length
    ? `\n\nDO NOT include any of these (already published or queued — common names listed): ${excluded.slice(0, 200).join('; ')}${excluded.length > 200 ? `; …and ${excluded.length - 200} more` : ''}.`
    : '';
  return `Return a JSON array of exactly ${count} unique species in this scope:

${scope}

FORMAT: each entry MUST be the string "Common Name (Scientific name)" — e.g. "African Elephant (Loxodonta africana)", "Coast Redwood (Sequoia sempervirens)", "Common Octopus (Octopus vulgaris)".

REQUIREMENTS:
- ${count} entries, ALL UNIQUE — no duplicates by common name OR scientific name
- All species must be REAL with VALID binomial scientific names (genus + species)
- Prioritize species with high public interest, search volume, and recognition
- Diverse geographic and taxonomic coverage within the scope
- AdSense-safe (no graphic content, no animals associated with hunting/exotic pet trade)
- Return ONLY the JSON array — no prose, no markdown fences, no explanation${excludeBlock}`;
}

function buildPostsPrompt(scope, count, excluded) {
  const excludeBlock = excluded.length
    ? `\n\nDO NOT propose any title near-duplicate of these (already published or queued): ${excluded.slice(0, 150).join(' | ')}${excluded.length > 150 ? ` | …and ${excluded.length - 150} more` : ''}.`
    : '';
  return `Return a JSON array of exactly ${count} unique article titles in this scope:

${scope}

REQUIREMENTS:
- ${count} entries, ALL UNIQUE — no duplicates, no near-duplicates
- Each title is EVERGREEN: no dates, no current events, no trending names of the day
- Each title is HIGHLY SEARCHABLE: real questions/topics people Google
- Each title is SEO-OPTIMIZED: clear, compelling, includes the natural keyword
- AdSense-safe: no hunting, exotic pet trade, graphic violence, controversial politics
- Diverse subject matter across the scope
- Return ONLY the JSON array of strings — no prose, no markdown fences, no explanation${excludeBlock}`;
}

// Sentinel error: tells the outer loop to STOP entirely (not just fail this label).
// Session-limit resets in hours, so it makes no sense to keep marching through
// remaining labels burning failed attempts.
class SessionLimitError extends Error {
  constructor(detail) { super(`Max subscription session limit hit: ${detail}`); this.name = 'SessionLimitError'; }
}

function looksLikeSessionLimit(msg) {
  const m = String(msg).toLowerCase();
  return m.includes('session limit') || m.includes('quota exceeded') || m.includes('rate limit') || m.includes('5-hour') || m.includes('5 hour');
}

async function callCli(systemText, userPrompt) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES_PER_CALL; attempt++) {
    try {
      const raw = await runClaudeCli({
        system: systemText,
        prompt: userPrompt,
        model: TOPIC_MODEL,
      });
      return extractJsonArrayFromText(raw);
    } catch (err) {
      lastErr = err;
      if (looksLikeSessionLimit(err.message)) {
        // Don't retry — session limit is hours-long. Bubble up a sentinel.
        throw new SessionLimitError(String(err.message).slice(0, 200));
      }
      console.warn(`    [retry ${attempt}/${MAX_RETRIES_PER_CALL}] CLI call failed: ${String(err.message).slice(0, 160)}`);
      if (attempt < MAX_RETRIES_PER_CALL) {
        await new Promise((r) => setTimeout(r, RETRY_PAUSE_MS));
      }
    }
  }
  throw lastErr;
}

async function generateForLabel(target, globalExcludedNormalized, sb, { dryRun }) {
  const { category, label, kind, scope } = target;
  console.log(`\n── ${category} / ${label} (${kind}) ─────────────────────────`);

  // Idempotent: if the queue already has TARGET_PER_LABEL or more rows for
  // this (category, label), skip entirely so re-runs after a session-limit
  // wall don't repeat completed work.
  const { count: existingCount } = await sb
    .from('content_queue')
    .select('id', { count: 'exact', head: true })
    .eq('category', category)
    .eq('label', label);
  const remainingTarget = Math.max(0, TARGET_PER_LABEL - (existingCount || 0));
  if (remainingTarget === 0) {
    console.log(`  ✓ already at ${existingCount}/${TARGET_PER_LABEL} — skipping`);
    return { category, label, kind, requested: TARGET_PER_LABEL, generated: 0, skipped: true, existing: existingCount };
  }
  console.log(`  existing in queue: ${existingCount || 0}/${TARGET_PER_LABEL}, need ${remainingTarget} more`);

  // Build excluded display list for the AI (showing names, not normalized IDs).
  const { data: postsForLabel } = await sb
    .from('posts')
    .select('title')
    .eq('category', category)
    .eq('label', label)
    .limit(500);
  const { data: queueForLabel } = await sb
    .from('content_queue')
    .select('topic')
    .eq('category', category)
    .eq('label', label)
    .limit(500);
  const excludedDisplay = [
    ...(postsForLabel || []).map((r) => r.title),
    ...(queueForLabel || []).map((r) => r.topic),
  ].filter(Boolean);

  const promptBuilder = kind === 'species' ? buildSpeciesPrompt : buildPostsPrompt;
  const systemText = kind === 'species'
    ? 'You are a world-class wildlife biologist, naturalist, and taxonomy expert. You output ONLY valid JSON arrays of "Common Name (Scientific name)" strings.'
    : 'You are an editorial strategist for a premium wildlife publication. You output ONLY valid JSON arrays of evergreen, SEO-optimized article titles.';

  const accepted = [];
  const seenNormalized = new Set(globalExcludedNormalized);

  let topUp = 0;
  while (accepted.length < remainingTarget && topUp <= MAX_TOPUP_ATTEMPTS) {
    const shortBy = remainingTarget - accepted.length;
    const askFor = Math.min(BATCH_SIZE, Math.max(20, shortBy + 10)); // overshoot to absorb dedupe losses
    topUp += 1;

    const t0 = Date.now();
    console.log(`  call ${topUp}: asking for ${askFor}, have ${accepted.length}/${remainingTarget} (this run)…`);
    let batch;
    try {
      batch = await callCli(systemText, promptBuilder(scope, askFor, excludedDisplay));
    } catch (err) {
      if (err instanceof SessionLimitError) throw err; // bubble up to main loop
      console.warn(`  ✗ call ${topUp} failed permanently after retries: ${err.message}`);
      break;
    }
    const elapsedS = ((Date.now() - t0) / 1000).toFixed(1);

    let added = 0;
    let dupes = 0;
    for (const item of batch) {
      if (typeof item !== 'string' || !item.trim()) continue;
      const topic = item.trim();
      const norm = normalizeForDedup(topic, kind);
      if (seenNormalized.has(norm)) { dupes += 1; continue; }
      seenNormalized.add(norm);
      accepted.push(topic);
      excludedDisplay.push(topic);
      added += 1;
      if (accepted.length >= remainingTarget) break;
    }
    console.log(`  → ${batch.length} returned, ${added} new, ${dupes} dupes, total ${accepted.length}/${remainingTarget} (${elapsedS}s)`);

    if (added === 0 && topUp >= 2) {
      // Two consecutive zero-add calls — model is exhausted on this scope.
      console.warn(`  ⚠ exhausted — stopping at ${accepted.length}`);
      break;
    }
  }

  // Cap at exactly remainingTarget (we may have overshot due to overshoot ask).
  const final = accepted.slice(0, remainingTarget);
  console.log(`  RESULT: ${final.length} new topics added (queue total will be ${(existingCount || 0) + final.length}/${TARGET_PER_LABEL})`);

  if (!dryRun && final.length) {
    const rows = final.map((topic) => ({
      id: makeQueueId(),
      category,
      label,
      topic,
      status: 'pending',
      attempts: 0,
      priority: 0,
    }));
    // Insert in chunks to stay friendly with PostgREST default payload limits.
    const CHUNK = 50;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const { error } = await sb.from('content_queue').insert(chunk);
      if (error) {
        console.error(`  insert chunk ${i / CHUNK + 1} failed:`, error.message);
        throw error;
      }
    }
    console.log(`  ✓ inserted ${rows.length} row(s) into content_queue`);
  } else if (dryRun) {
    console.log(`  (dry-run — skipped insert)`);
  }

  // Update the global exclude set for downstream labels so we don't repeat
  // across labels (e.g. a popular plant title shouldn't appear under both
  // Trees and Articles).
  for (const t of final) globalExcludedNormalized.add(normalizeForDedup(t, kind));

  return { category, label, kind, requested: TARGET_PER_LABEL, generated: final.length };
}

// ───── main ───────────────────────────────────────────────────────────

async function main() {
  for (const k of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
    if (!process.env[k]) {
      console.error(`FATAL: missing ${k}`);
      process.exit(2);
    }
  }

  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const labelArg = (() => {
    const i = args.indexOf('--label');
    return i !== -1 && args[i + 1] ? args[i + 1] : null;
  })();

  const targets = labelArg
    ? TARGETS.filter((t) => `${t.category}/${t.label}`.toLowerCase() === labelArg.toLowerCase())
    : TARGETS;
  if (!targets.length) {
    console.error(`No targets matched ${labelArg}. Try one of:`);
    for (const t of TARGETS) console.error(`  ${t.category}/${t.label}`);
    process.exit(2);
  }

  const sb = admin();

  // Build global exclude set from EVERY published post and EVERY queued row,
  // across all categories. This is what prevents repeating already-published
  // content (the user's explicit requirement).
  console.log('Loading existing post + queue titles for dedupe…');
  const { data: allPosts } = await sb.from('posts').select('title, slug, label, category');
  const { data: allQueue } = await sb.from('content_queue').select('topic, label, category');
  const globalExcludedNormalized = new Set();
  for (const p of allPosts || []) {
    if (p.title) {
      // Try both species-style and posts-style normalization to be safe.
      globalExcludedNormalized.add(normalizeForDedup(p.title, 'species'));
      globalExcludedNormalized.add(normalizeForDedup(p.title, 'posts'));
    }
    if (p.slug) globalExcludedNormalized.add('txt:' + p.slug.replace(/-/g, ' '));
  }
  for (const q of allQueue || []) {
    if (q.topic) {
      globalExcludedNormalized.add(normalizeForDedup(q.topic, 'species'));
      globalExcludedNormalized.add(normalizeForDedup(q.topic, 'posts'));
    }
  }
  console.log(`Loaded ${allPosts?.length ?? 0} posts + ${allQueue?.length ?? 0} queued; ${globalExcludedNormalized.size} normalized exclude keys`);

  const summary = [];
  let sessionLimitHit = false;
  for (const target of targets) {
    if (sessionLimitHit) {
      summary.push({ category: target.category, label: target.label, kind: target.kind, requested: TARGET_PER_LABEL, generated: 0, skipped: true, reason: 'session-limit-hit-earlier' });
      continue;
    }
    try {
      const r = await generateForLabel(target, globalExcludedNormalized, sb, { dryRun });
      summary.push(r);
    } catch (err) {
      if (err instanceof SessionLimitError) {
        console.error(`\n!! ${err.message}`);
        console.error('!! Stopping all remaining labels — session limit resets in hours, not minutes.');
        console.error('!! Re-run this script after the reset; idempotent skip will pick up where we left off.\n');
        summary.push({ category: target.category, label: target.label, kind: target.kind, requested: TARGET_PER_LABEL, generated: 0, error: 'session-limit-hit' });
        sessionLimitHit = true;
        continue;
      }
      console.error(`  ✗ FAILED ${target.category}/${target.label}:`, err.message);
      summary.push({ category: target.category, label: target.label, kind: target.kind, requested: TARGET_PER_LABEL, generated: 0, error: err.message });
    }
  }

  console.log('\n========== TOPIC GENERATION SUMMARY ==========');
  let totalGen = 0;
  let labelsDone = 0;
  for (const r of summary) {
    let status = '✗';
    let note = '';
    if (r.skipped && r.existing !== undefined) {
      status = '✓';
      note = ' (already complete, skipped)';
      labelsDone += 1;
    } else if (r.skipped && r.reason) {
      status = '·';
      note = ` (${r.reason})`;
    } else if (r.error) {
      note = ` (${r.error})`;
    } else if (r.generated >= TARGET_PER_LABEL || (r.generated > 0 && (r.existing || 0) + r.generated >= TARGET_PER_LABEL)) {
      status = '✓';
      labelsDone += 1;
    } else {
      status = '⚠';
    }
    console.log(`  ${status} ${r.category}/${r.label}: +${r.generated} this run${note}`);
    totalGen += r.generated;
  }
  console.log(`\nTOTAL: ${totalGen} topic(s) inserted this run / ${labelsDone} of ${targets.length} labels now complete${dryRun ? ' [dry-run — NOT inserted]' : ''}`);
  if (sessionLimitHit) {
    console.log('\nSESSION LIMIT WAS HIT — re-run after it resets to pick up the remaining labels.');
    process.exit(3);
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
