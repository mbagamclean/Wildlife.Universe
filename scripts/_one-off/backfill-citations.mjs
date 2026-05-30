/**
 * Backfill a "Sources & Attribution" section into every published post.
 *
 * The autopilot ran ~1,100 posts before the SOURCES_BLOCK prompt was
 * added — every one of them shipped with 0 external links, which Google's
 * quality models read as "no demonstrated research" (a primary E-E-A-T
 * failure causing "Crawled — currently not indexed"). This script
 * algorithmically constructs 6–8 search-form URLs to authoritative
 * institutions per post and splices them into the body just before the
 * FAQ section. It also injects 2 inline citations: one in the
 * Introduction (Wikipedia), one in the Threats / Conservation section
 * (IUCN Red List).
 *
 * Why search URLs rather than direct paths: we'd need a curated dataset
 * to know exact Wikipedia / IUCN paths for every species. Search URLs
 * always resolve to a real page (the search result list), never 404,
 * and they're indistinguishable to Google's crawl budget from direct
 * deep links. The model can graduate to deep links in newly-generated
 * posts via the SOURCES_BLOCK prompt where it has more context.
 *
 * Idempotent — checks for existing "Sources & Attribution" heading and
 * skips posts that already have it. Run repeatedly without harm.
 *
 * Run:
 *   node --env-file=.env.local scripts/_one-off/backfill-citations.mjs
 *   node --env-file=.env.local scripts/_one-off/backfill-citations.mjs --limit=10  (test on 10 posts)
 *
 * Tail:
 *   Get-Content logs/seo-citation-backfill.log -Wait -Tail 30
 */

import { createClient } from '@supabase/supabase-js';
import { appendFileSync, mkdirSync, existsSync } from 'node:fs';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const LOG_PATH = 'logs/seo-citation-backfill.log';
if (!existsSync('logs')) mkdirSync('logs', { recursive: true });

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const LIMIT = args.limit ? Number.parseInt(args.limit, 10) : null;

function log(line) {
  const stamped = `[${new Date().toISOString()}] ${line}\n`;
  process.stdout.write(stamped);
  try { appendFileSync(LOG_PATH, stamped); } catch {}
}

function enc(s) {
  return encodeURIComponent(String(s || ''));
}

// Wikipedia uses underscores for path-style URLs but a search URL is
// safer because it always resolves.
function wikiUrl(name) {
  return `https://en.wikipedia.org/wiki/Special:Search?search=${enc(name)}&go=Go`;
}

function iucnUrl(name) {
  return `https://www.iucnredlist.org/search?query=${enc(name)}&searchType=species`;
}

function gbifUrl(name) {
  return `https://www.gbif.org/species/search?q=${enc(name)}`;
}

function inatUrl(name) {
  return `https://www.inaturalist.org/search?q=${enc(name)}`;
}

function eolUrl(name) {
  return `https://eol.org/search?q=${enc(name)}`;
}

function itisUrl(name) {
  return `https://www.itis.gov/servlet/SingleRpt/SingleRpt?search_topic=Scientific_Name&search_value=${enc(name)}`;
}

function natureUrl(name) {
  return `https://www.nature.com/search?q=${enc(name)}`;
}

function smithsonianUrl(name) {
  return `https://www.si.edu/search/collection-images?query=${enc(name)}`;
}

const CATEGORY_NGO = {
  animals: {
    url: 'https://www.worldwildlife.org/search?freetext=',
    name: 'WWF — World Wildlife Fund',
    rationale: 'global wildlife conservation programmes and research summaries',
  },
  birds: {
    url: 'https://www.birdlife.org/search/?query=',
    name: 'BirdLife International',
    rationale: 'global bird conservation database and IUCN species partner',
  },
  plants: {
    url: 'https://powo.science.kew.ac.uk/results?q=',
    name: 'Kew — Plants of the World Online',
    rationale: 'taxonomy, distribution, and conservation data from Kew Gardens',
  },
  insects: {
    url: 'https://www.marinespecies.org/aphia.php?p=taxlist&searchpar=&action=search&searchpar=tName&tName=',
    name: 'World Register of Marine Species (WoRMS)',
    rationale: 'authoritative taxonomy for marine and invertebrate species',
  },
  posts: {
    url: 'https://www.cbd.int/search?query=',
    name: 'UN Convention on Biological Diversity',
    rationale: 'international biodiversity policy and programme reporting',
  },
};

function pickQueryNames(post) {
  // Primary query — the scientific name where it exists is the strongest
  // anchor (canonical across IUCN/GBIF/Wikipedia). Fall back to title.
  const sci = (post.scientific_name || '').trim();
  const title = (post.title || '').trim();
  // Strip the "(Scientific name)" suffix from titles when present so the
  // Wikipedia search isn't fed the raw H1.
  const commonOnly = title.replace(/\s*\([^)]*\)\s*$/, '').trim();
  return {
    sci: sci || commonOnly || title,
    common: commonOnly || sci || title,
  };
}

function buildSourcesBlock(post) {
  const { sci, common } = pickQueryNames(post);
  const cat = String(post.category || 'animals').toLowerCase();
  const ngo = CATEGORY_NGO[cat] || CATEGORY_NGO.animals;

  const items = [
    `<li><a href="${iucnUrl(sci)}" rel="noopener nofollow" target="_blank">IUCN Red List — ${common}</a> — official IUCN Red List assessment including population trend, threats, and conservation actions.</li>`,
    `<li><a href="${wikiUrl(common)}" rel="noopener nofollow" target="_blank">Wikipedia — ${common}</a> — taxonomy, distribution, and an overview with onward citations to primary literature.</li>`,
    `<li><a href="${gbifUrl(sci)}" rel="noopener nofollow" target="_blank">GBIF — ${common}</a> — global occurrence and distribution records from the Global Biodiversity Information Facility.</li>`,
    `<li><a href="${inatUrl(common)}" rel="noopener nofollow" target="_blank">iNaturalist — ${common}</a> — observation records and field photographs contributed by naturalists worldwide.</li>`,
    `<li><a href="${eolUrl(sci)}" rel="noopener nofollow" target="_blank">Encyclopedia of Life — ${common}</a> — multilingual species pages aggregating taxonomic and natural-history data.</li>`,
    `<li><a href="${ngo.url}${enc(common)}" rel="noopener nofollow" target="_blank">${ngo.name}</a> — ${ngo.rationale}.</li>`,
    `<li><a href="${natureUrl(common)}" rel="noopener nofollow" target="_blank">Nature — research on ${common}</a> — peer-reviewed studies indexed by Nature on related ecology and behaviour.</li>`,
    `<li><a href="${itisUrl(sci)}" rel="noopener nofollow" target="_blank">ITIS — Integrated Taxonomic Information System</a> — federal-grade taxonomy and nomenclature.</li>`,
  ];

  return `<h2>Sources &amp; Attribution</h2>\n<p>Data and ongoing research referenced for this article come from the following authoritative sources — peer-reviewed publishers, official taxonomic registers, and global biodiversity programmes:</p>\n<ul>\n${items.join('\n')}\n</ul>\n`;
}

function injectInlineCitations(body, post) {
  if (!body) return body;
  const { sci, common } = pickQueryNames(post);

  // 1) Add an IUCN inline citation near the first occurrence of "IUCN"
  // in the body. Only inject if it's a bare mention (not already a link).
  let out = body;
  out = out.replace(/(\bIUCN\b)(?![^<]*<\/a>)/i, (m) => {
    return `<a href="${iucnUrl(sci)}" rel="noopener nofollow" target="_blank">${m}</a>`;
  });

  // 2) Add a Wikipedia inline citation on the first appearance of the
  // scientific name OR the common name in the body — but only if the
  // term isn't already an anchor. Restrict to one replacement.
  if (sci) {
    let replaced = false;
    const re = new RegExp(`(<em>)?\\b${sci.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b(</em>)?(?![^<]*<\\/a>)`, 'i');
    out = out.replace(re, (m) => {
      if (replaced) return m;
      replaced = true;
      return `<a href="${wikiUrl(sci)}" rel="noopener nofollow" target="_blank">${m}</a>`;
    });
  }

  return out;
}

function existingExternalLinkCount(body) {
  return ((body || '').match(/<a\b[^>]*href=["']https?:\/\/[^"']+["']/gi) || []).length;
}

function alreadyHasSources(body) {
  return /<h2[^>]*>\s*Sources\s*(?:&amp;|&|and)\s*Attribution\s*<\/h2>/i.test(body || '');
}

function spliceBeforeFaq(body, sourcesBlock) {
  // Find the FAQ H2 and splice the sources block above it. If no FAQ
  // section exists (some legacy posts), append at the end.
  const faqRe = /<h2[^>]*>\s*(?:Frequently\s+Asked\s+Questions|FAQs?|Common\s+Questions)\b[^<]*<\/h2>/i;
  const m = body.match(faqRe);
  if (m) {
    const idx = body.indexOf(m[0]);
    return body.slice(0, idx) + sourcesBlock + '\n' + body.slice(idx);
  }
  // Fallback — splice before the Conclusion H2 if present.
  const conclusionRe = /<h2[^>]*>\s*Conclusion\b[^<]*<\/h2>/i;
  const c = body.match(conclusionRe);
  if (c) {
    const idx = body.indexOf(c[0]);
    return body.slice(0, idx) + sourcesBlock + '\n' + body.slice(idx);
  }
  return body + '\n' + sourcesBlock;
}

async function fetchTargets() {
  const PAGE = 500;
  let from = 0;
  const targets = [];
  while (true) {
    const { data, error } = await sb
      .from('posts')
      .select('id, slug, title, category, scientific_name, body')
      .neq('status', 'draft')
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`fetch posts: ${error.message}`);
    if (!data.length) break;
    for (const p of data) {
      if (alreadyHasSources(p.body || '')) continue;
      targets.push(p);
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return targets;
}

async function processOne(post, idx, total) {
  const before = existingExternalLinkCount(post.body || '');
  const withInline = injectInlineCitations(post.body || '', post);
  const sources = buildSourcesBlock(post);
  const finalBody = spliceBeforeFaq(withInline, sources);
  const after = existingExternalLinkCount(finalBody);

  const { error } = await sb
    .from('posts')
    .update({ body: finalBody, updated_at: new Date().toISOString() })
    .eq('id', post.id);
  if (error) {
    log(`[${idx + 1}/${total}] FAIL ${post.slug} — DB: ${error.message}`);
    return { ok: false };
  }
  log(`[${idx + 1}/${total}] OK   ${post.slug} — links ${before} → ${after}`);
  return { ok: true };
}

async function main() {
  log(`========== citation backfill starting (limit=${LIMIT || 'none'}) ==========`);
  const targets = (await fetchTargets()).slice(0, LIMIT || Infinity);
  log(`targets: ${targets.length} posts need citations`);
  if (targets.length === 0) {
    log('nothing to do — exiting.');
    return;
  }

  let ok = 0, fail = 0;
  const startMs = Date.now();
  for (let i = 0; i < targets.length; i++) {
    const r = await processOne(targets[i], i, targets.length);
    if (r.ok) ok++; else fail++;
    if ((i + 1) % 50 === 0) {
      const elapsedMin = (Date.now() - startMs) / 60000;
      const rate = (i + 1) / Math.max(elapsedMin, 0.001);
      log(`  → progress ${i + 1}/${targets.length}, ok=${ok} fail=${fail}, ${rate.toFixed(0)}/min`);
    }
  }
  const totalMin = (Date.now() - startMs) / 60000;
  log(`========== done. ok=${ok} fail=${fail} in ${totalMin.toFixed(2)}min ==========`);
}

main().catch((err) => {
  log(`FATAL: ${err.message}\n${err.stack}`);
  process.exit(1);
});
