/**
 * Resolve a real, species-accurate cover image for a wildlife post.
 *
 * Pipeline:
 *   species posts (have scientific_name):
 *     1. Wikipedia REST summary by scientific name (redirects resolve binomial→article)
 *     2. Wikipedia REST summary by common-name (title before the parenthesis)
 *     3. iNaturalist taxa API (real observation photo; license-checked)
 *   concept posts (no scientific_name):
 *     1. Wikipedia REST summary by cleaned title
 *     2. Openverse commercial-licensed image search
 *
 * Returns { url, credit, source } or null. `url` is a hotlinkable image URL
 * sized ~1280px where possible. `credit` is an attribution string to honor
 * the license.
 */

const UA = 'WildlifeUniverse/1.0 (https://www.wildlifeuniverse.org; mbagamclean@gmail.com)';
const H = { 'User-Agent': UA, Accept: 'application/json' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function jget(url, headers = H) {
  const r = await fetch(url, { headers });
  if (r.status === 429) {
    const wait = Number(r.headers.get('retry-after')) * 1000 || 5000;
    await sleep(wait);
    return jget(url, headers);
  }
  if (!r.ok) return null;
  return r.json().catch(() => null);
}

// Bump a Wikimedia thumb URL to ~1280px wide; leave non-thumb URLs as-is.
function upsizeCommons(u) {
  if (!u) return u;
  return u.replace(/\/(\d+)px-/, '/1280px-');
}

function commonNameFromTitle(title) {
  // "Superb Starling (Lamprotornis superbus)" -> "Superb Starling"
  const m = title.match(/^(.*?)\s*\(/);
  return (m ? m[1] : title).trim();
}

function cleanTopic(title) {
  return title.replace(/[?!.]+$/g, '').replace(/\s*[:\-–].*$/, '').trim();
}

async function wikiSummary(term) {
  const t = encodeURIComponent(term.replace(/\s+/g, '_'));
  const j = await jget(`https://en.wikipedia.org/api/rest_v1/page/summary/${t}?redirect=true`);
  if (!j || j.type === 'disambiguation') return null;
  const src = j.originalimage?.source || j.thumbnail?.source;
  if (!src) return null;
  // Skip tiny/logo-ish images
  const w = j.originalimage?.width || j.thumbnail?.width || 0;
  if (w && w < 250) return null;
  return {
    url: upsizeCommons(src),
    credit: `Image: Wikipedia/Wikimedia Commons — “${j.title}”`,
    source: 'wikipedia',
  };
}

async function inatPhoto(sciName) {
  const j = await jget(`https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(sciName)}&rank=species&per_page=5`);
  const results = j?.results || [];
  // Prefer an exact-ish name match with a usable license.
  for (const t of results) {
    const p = t.default_photo;
    if (!p || !p.medium_url) continue;
    const lic = (p.license_code || '').toLowerCase();
    if (!lic || lic === 'c') continue; // skip all-rights-reserved / unknown
    return {
      url: p.medium_url.replace('/medium.', '/large.'),
      credit: p.attribution || `Photo via iNaturalist (${lic.toUpperCase()})`,
      source: 'inaturalist',
    };
  }
  return null;
}

async function openverse(topic) {
  const j = await jget(
    `https://api.openverse.org/v1/images/?q=${encodeURIComponent(topic)}&license_type=commercial&mature=false&page_size=3`,
    { 'User-Agent': UA, Accept: 'application/json' }
  );
  const r = (j?.results || [])[0];
  if (!r || !r.url) return null;
  return {
    url: r.url,
    credit: r.attribution || `Image via Openverse — ${r.creator || 'unknown'} (${r.license || ''})`,
    source: 'openverse',
  };
}

/**
 * @param {{title:string, scientific_name:string|null, category:string}} post
 * @returns {Promise<{url:string,credit:string,source:string}|null>}
 */
export async function resolveImage(post) {
  const sci = (post.scientific_name || '').trim();
  if (sci) {
    return (
      (await wikiSummary(sci)) ||
      (await wikiSummary(commonNameFromTitle(post.title))) ||
      (await inatPhoto(sci)) ||
      null
    );
  }
  // concept / topical post
  const topic = cleanTopic(post.title);
  return (await wikiSummary(topic)) || (await openverse(topic)) || null;
}
