/**
 * One-off: assign posts.author_id for every published post based on
 * the author whose expertiseCategories cover the post's (category, label).
 *
 * Idempotent — re-running gives every post the same author because the
 * picker is a stable djb2 hash on slug. Safe to run repeatedly.
 *
 * Run:
 *   node --env-file=.env.local scripts/_one-off/backfill-authors.mjs
 *
 * Inline-mirrors lib/seo/authors.js because that file uses the `@/lib`
 * path alias (a Next.js / tsconfig feature) which Node's CLI can't
 * resolve without the bundler.
 */

import { createClient } from '@supabase/supabase-js';

// ── inline mirror of lib/seo/authors.js ──────────────────────────────
// Keep in sync. The structural contract: each author has slug + name +
// expertiseCategories[]; pickAuthorForPost uses djb2 on slug.

const AUTHORS = [
  { slug: 'dr-evalyne-shoo', name: 'Dr. Evalyne Shoo', expertiseCategories: ['animals/mammals', 'animals/iucn-redlist'] },
  { slug: 'yona-mdavire', name: 'Yona Mdavire', expertiseCategories: ['insects/arthropoda', 'insects/annelida', 'insects/nematoda', 'insects/platyhelminthes', 'insects/porifera', 'insects/iucn-redlist'] },
  { slug: 'mr-oyo-shindawangoni', name: 'Mr. Oyo Shindawangoni', expertiseCategories: ['birds/basal', 'birds/waterfowl', 'birds/coastal', 'birds/raptors', 'birds/land', 'birds/song', 'birds/iucn-redlist'] },
  { slug: 'dr-mclean-sean', name: 'Dr. Mclean Sean', expertiseCategories: ['posts/conservation', 'animals/iucn-redlist', 'birds/iucn-redlist', 'plants/iucn-redlist', 'insects/iucn-redlist'] },
  { slug: 'lee-xi', name: 'Lee Xi', expertiseCategories: ['animals/fish', 'insects/cnidaria', 'insects/echinodermata', 'insects/mollusca'] },
  { slug: 'sam-janeth', name: 'Sam Janeth', expertiseCategories: ['posts/tourism'] },
  { slug: 'joseph-baptista', name: 'Joseph Baptista', expertiseCategories: ['plants/trees', 'plants/shrubs', 'plants/herbs', 'plants/vines', 'plants/iucn-redlist'] },
  { slug: 'prof-naomi', name: 'Prof. Naomi', expertiseCategories: ['posts/articles', 'plants/trees', 'animals/mammals'] },
  { slug: 'matt-mclean', name: 'Matt Mclean', expertiseCategories: ['posts/how-questions', 'posts/why-questions', 'posts/articles'] },
  { slug: 'miss-rachel-babu', name: 'Miss. Rachel Babu', expertiseCategories: ['animals/amphibians', 'animals/reptiles'] },
  { slug: 'romario-schwazentigger', name: 'Romario Schwazentigger', expertiseCategories: ['animals/mammals', 'animals/iucn-redlist'] },
  { slug: 'prof-attenborough-deann', name: 'Prof. Attenborough Deann', expertiseCategories: ['posts/articles', 'posts/how-questions', 'posts/why-questions', 'animals/mammals', 'animals/reptiles', 'animals/amphibians', 'animals/fish', 'birds/raptors', 'birds/land', 'birds/song'] },
  { slug: 'nickson-mbaga', name: 'Nickson Mbaga', expertiseCategories: ['posts/conservation', 'posts/tourism', 'posts/articles'] },
];

const DEFAULT_AUTHOR_SLUG = 'matt-mclean';

function djb2(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) hash = (hash * 33) ^ str.charCodeAt(i);
  return hash >>> 0;
}

function labelSlug(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function pickAuthorForPost({ category, label, slug }) {
  const cat = String(category || '').toLowerCase();
  const lbl = labelSlug(label);
  const exact = lbl ? `${cat}/${lbl}` : null;

  let pool = AUTHORS.filter((a) =>
    a.expertiseCategories.some((e) => {
      if (exact && e === exact) return true;
      if (!lbl && e.startsWith(`${cat}/`)) return true;
      return false;
    }),
  );
  if (pool.length === 0) {
    pool = AUTHORS.filter((a) =>
      a.expertiseCategories.some((e) => e.startsWith(`${cat}/`)),
    );
  }
  if (pool.length === 0) pool = [AUTHORS.find((a) => a.slug === DEFAULT_AUTHOR_SLUG)];

  const idx = djb2(slug || '') % pool.length;
  return pool[idx];
}

// ── main ──────────────────────────────────────────────────────────────

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

async function main() {
  // Fetch every published post — just the fields we need to decide
  // and update. Cheap query (no body).
  const PAGE = 500;
  let from = 0;
  const posts = [];
  while (true) {
    const { data, error } = await sb
      .from('posts')
      .select('id, slug, category, label, author_id')
      .neq('status', 'draft')
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`fetch posts: ${error.message}`);
    if (!data.length) break;
    posts.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  console.log(`scanned ${posts.length} published posts`);

  const counts = Object.fromEntries(AUTHORS.map((a) => [a.slug, 0]));
  const updates = [];
  let alreadyCorrect = 0;

  for (const p of posts) {
    const author = pickAuthorForPost({ category: p.category, label: p.label, slug: p.slug });
    counts[author.slug] = (counts[author.slug] || 0) + 1;
    if (p.author_id === author.slug) {
      alreadyCorrect++;
      continue;
    }
    updates.push({ id: p.id, author_id: author.slug });
  }

  console.log('\nplanned distribution:');
  for (const a of AUTHORS) {
    console.log('  ' + a.slug.padEnd(28) + ' → ' + String(counts[a.slug] || 0).padStart(4) + '  (' + a.name + ')');
  }
  console.log('\nalready correct:', alreadyCorrect);
  console.log('to update:      ', updates.length);

  if (updates.length === 0) {
    console.log('nothing to do — exiting.');
    return;
  }

  // Apply updates in batches. Supabase doesn't bulk-update by varying
  // values, so we issue one update per row but loop tight (each is a
  // tiny payload).
  let ok = 0, fail = 0;
  for (let i = 0; i < updates.length; i++) {
    const u = updates[i];
    const { error } = await sb
      .from('posts')
      .update({ author_id: u.author_id })
      .eq('id', u.id);
    if (error) {
      fail++;
      if (fail <= 5) console.warn(`fail ${u.id}: ${error.message}`);
    } else {
      ok++;
    }
    if ((i + 1) % 100 === 0) {
      console.log(`  progress: ${i + 1}/${updates.length} (ok=${ok} fail=${fail})`);
    }
  }
  console.log(`\ndone. ok=${ok} fail=${fail}`);
}

main().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
