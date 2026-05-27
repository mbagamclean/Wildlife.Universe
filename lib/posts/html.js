/**
 * Helpers for the post-body HTML pipeline.
 *
 * The editor (Tiptap) saves HTML via editor.getHTML(). The reader's
 * PostView used to split the body on \n\n and render each piece as text,
 * which made <p>/<h2>/etc. show up as literal characters. These helpers
 * support the rewritten render path: sanitize → inject heading IDs for
 * the TOC → strip-to-text for audio + word counting.
 */

import sanitizeHtml from 'sanitize-html';

/** Looks like markup if it contains at least one tag-shaped token. */
export function looksLikeHtml(s) {
  return typeof s === 'string' && /<\w+[^>]*>/.test(s);
}

/** Minimal HTML escape for plain-text bodies that get wrapped into <p>. */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Always return HTML. If the input already has tags, leave it (sanitize
 * happens separately). Otherwise wrap each \n\n block in a <p>, with single
 * newlines turned into <br> so legacy plain-text posts render with breaks.
 */
export function bodyToHtml(body) {
  if (!body) return '';
  const trimmed = String(body).trim();
  if (!trimmed) return '';
  if (looksLikeHtml(trimmed)) return trimmed;
  return trimmed
    .split(/\n\s*\n/)
    .map((block) => {
      const escaped = escapeHtml(block.trim()).replace(/\n/g, '<br />');
      return escaped ? `<p>${escaped}</p>` : '';
    })
    .filter(Boolean)
    .join('');
}

/**
 * Sanitize the body HTML. Allows the rich-text shapes the editor emits
 * (p / headings / lists / images / videos / iframes / tables / inline
 * formatting) and blocks scripts, event handlers, and javascript: URLs.
 * Uses sanitize-html (parse5-based) so no jsdom is dragged into the
 * server bundle — that route currently breaks on Vercel's Lambda
 * runtime when html-encoding-sniffer tries to require an ESM-only
 * @exodus/bytes/encoding-lite.js.
 */
export function sanitizeBodyHtml(html) {
  if (!html) return '';
  return sanitizeHtml(html, {
    allowedTags: [
      'p', 'br', 'hr',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'strong', 'b', 'em', 'i', 'u', 's', 'mark', 'sub', 'sup', 'small',
      'a', 'span', 'div',
      'blockquote', 'cite', 'code', 'pre',
      'figure', 'figcaption',
      'img', 'video', 'source', 'audio', 'iframe',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    allowedAttributes: {
      '*': [
        'href', 'src', 'srcset', 'alt', 'title', 'id', 'class', 'style',
        'width', 'height', 'rel', 'target', 'colspan', 'rowspan', 'scope',
        'data-youtube-video', 'data-vimeo', 'allow', 'allowfullscreen',
        'frameborder', 'loading', 'controls', 'muted', 'playsinline',
        'poster', 'type',
      ],
    },
    // Demote any <h1> in the body to <h2>. The page itself already
    // renders the post title as the single page-level <h1>; AI-generated
    // bodies routinely start with a `# Title` heading that becomes a
    // duplicate <h1>, which trips SEO scanners ("multiple h1 tags") and
    // muddies the document outline. Demoting at sanitization time means
    // every existing post is corrected on the next ISR revalidate, no
    // DB migration needed.
    transformTags: {
      h1: 'h2',
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel', 'data'],
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    allowProtocolRelative: true,
    allowedIframeHostnames: ['www.youtube.com', 'youtube.com', 'player.vimeo.com'],
    parseStyleAttributes: false,
  });
}

/**
 * Decode the HTML entities most commonly seen in editor output back to
 * their literal characters. Used everywhere we extract user-visible
 * text from raw HTML (TOC titles, audio playback, plain-text excerpts)
 * so things like "Habitat &amp; Geographic Distribution" don't render
 * with the literal entity. Order matters: `&amp;` decodes last because
 * decoding it earlier would let subsequent passes misinterpret a
 * previously-escaped `&xxx;` sequence as an entity.
 */
export function decodeHtmlEntities(s) {
  if (!s) return '';
  return String(s)
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&lsquo;|&rsquo;/g, "'")
    .replace(/&hellip;/g, '…')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&copy;/g, '©')
    .replace(/&reg;/g, '®')
    .replace(/&trade;/g, '™')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, '&'); // must remain last
}

/**
 * Slugify a heading's plain text into a URL-safe anchor fragment.
 * Lower-case, replace non-alphanumerics with hyphens, collapse repeats,
 * trim leading/trailing hyphens, cap length so monstrous headings don't
 * blow up the URL bar. Empty input falls back to '' so the caller can
 * substitute a generic id.
 */
function slugifyHeading(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/&[a-z]+;/g, ' ')           // strip leftover HTML entities
    .replace(/[^a-z0-9\s-]/g, '')        // drop punctuation
    .trim()
    .replace(/\s+/g, '-')                // spaces → hyphens
    .replace(/-+/g, '-')                 // collapse runs of hyphens
    .replace(/^-|-$/g, '')               // trim hyphens
    .slice(0, 60);
}

/**
 * Walk the HTML, assign each h1/h2/h3/h4 a stable ID — preferring an
 * already-set id attribute, falling back to a slug of the heading text,
 * with collision-resolution via a numeric suffix — and emit a TOC
 * containing every heading found (capped at 60 to keep a runaway article
 * from breaking layout). Works without a DOM since it operates over the
 * raw HTML string with a regex.
 *
 * Why h1-h4 and not just h2: editors include sub-section labels under H3
 * for long articles. Cutting them off the TOC makes readers lose track
 * of where they are. h5/h6 are intentionally excluded — anything that
 * deep is content detail, not a navigable landmark.
 */
export function injectHeadingIdsAndBuildToc(html) {
  if (!html) return { html: '', toc: [] };
  const toc = [];
  const usedIds = new Set();
  let counter = 0;

  // Allocate a unique id: prefer the existing one, otherwise slug the
  // heading text, otherwise fall back to a generic post-h-N. Always
  // append -2, -3, … on collision so anchors stay unique within a post.
  const allocateId = (existingId, cleanText) => {
    if (existingId) {
      usedIds.add(existingId);
      return existingId;
    }
    const base = slugifyHeading(cleanText) || `post-h-${counter}`;
    let id = base;
    let n = 2;
    while (usedIds.has(id)) {
      id = `${base}-${n++}`;
    }
    usedIds.add(id);
    return id;
  };

  const out = html.replace(
    /<(h[1-4])\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi,
    (_match, tag, attrs, inner) => {
      const idMatch = attrs.match(/\sid=["']([^"']+)["']/i);
      const existingId = idMatch && idMatch[1];
      // Replace inline tags with a SPACE rather than empty string so
      // "<em>How</em><strong>they</strong>" doesn't collapse to "Howthey".
      // Then decode entities so "Habitat &amp; Geographic Distribution"
      // surfaces in the TOC as the literal "&" — same fix every other
      // text-from-HTML extractor in the file uses.
      const cleanText = decodeHtmlEntities(
        inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      );

      const id = allocateId(existingId, cleanText);

      if (toc.length < 60 && cleanText) {
        toc.push({
          id,
          title: cleanText.length > 90 ? `${cleanText.slice(0, 87)}…` : cleanText,
          level: parseInt(tag[1], 10),
        });
      }
      counter += 1;
      const newAttrs = existingId ? attrs : `${attrs} id="${id}"`;
      return `<${tag}${newAttrs}>${inner}</${tag}>`;
    }
  );
  return { html: out, toc };
}

/**
 * Inject internal links into rendered post HTML for known species /
 * topics. For each entry in `linkMap`, the first textual occurrence of
 * the term inside body text (not inside another anchor, heading, code
 * block, or pre block) is wrapped in a link to `/posts/${slug}`.
 *
 * This is the Wikipedia-style "blue link" pattern — high-signal for
 * search crawlers (topical authority + discovery) and useful for human
 * readers without being spammy because each term links at most once.
 *
 * Inputs:
 *   - html: sanitized post body HTML
 *   - linkMap: Iterable<[term, { slug, title }]> — sorted-by-length-desc
 *     by the caller so longer matches win ("African Forest Elephant"
 *     beats "Elephant"). Caller filters out the current-post slug.
 *   - opts.maxLinks: hard cap on links injected per article (default 8)
 *
 * Returns the HTML with anchors injected; if the linkMap is empty or
 * no matches found, returns the input unchanged.
 */
export function injectInternalLinks(html, linkMap, { maxLinks = 8 } = {}) {
  if (!html || typeof html !== 'string') return html || '';
  if (!linkMap || (typeof linkMap.size === 'number' && linkMap.size === 0)) return html;

  // Materialise the link map into an array preserving insertion order
  // (caller is responsible for sorting longest-first).
  const entries = Array.from(linkMap);
  if (entries.length === 0) return html;

  // Build a single alternation regex covering every term. Each term is
  // escaped for regex specials, wrapped in word boundaries, and grouped
  // so we can identify which term matched. Capture group 1 is the term;
  // the outer `gi` lets us scan repeatedly with case-insensitivity.
  const terms = entries.map(([t]) => t).filter(Boolean);
  if (terms.length === 0) return html;
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  // \b alone misses Unicode word boundaries; we approximate with
  // explicit lookarounds so multi-word terms ("Bald Eagle") still match
  // word-cleanly without treating the space as a boundary.
  const pattern = new RegExp(`(?<![A-Za-z0-9])(${escaped.join('|')})(?![A-Za-z0-9])`, 'gi');

  const used = new Set();
  let linksInjected = 0;

  // Tokenise into tags vs text. We can't link inside <a>, <h1-6>,
  // <code>, or <pre>, so we track an in-no-link-zone depth counter as
  // we walk. Tags are emitted untouched; text is processed only when
  // depth is 0.
  const NO_LINK_TAGS = /^<\/?(a|h[1-6]|code|pre|figcaption|nav|button|script|style|aside)\b/i;
  const tokens = html.split(/(<[^>]+>)/g);

  let noLinkDepth = 0;
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (!tok) continue;
    if (tok[0] === '<' && tok[tok.length - 1] === '>') {
      // It's a tag — update the no-link depth then keep as-is.
      const m = tok.match(NO_LINK_TAGS);
      if (m) {
        if (tok[1] === '/') noLinkDepth = Math.max(0, noLinkDepth - 1);
        else if (!tok.endsWith('/>')) noLinkDepth += 1;
      }
      continue;
    }

    if (noLinkDepth > 0 || linksInjected >= maxLinks) continue;

    // Text node — search for the first unused matching term, link it,
    // then move on to the next text node. We only inject one link per
    // text node to avoid runaway density.
    pattern.lastIndex = 0;
    let replaced = tok;
    const match = pattern.exec(tok);
    if (match) {
      const matchedTermLower = match[1].toLowerCase();
      const found = entries.find(([t]) => t.toLowerCase() === matchedTermLower);
      if (found && !used.has(matchedTermLower)) {
        const [, info] = found;
        const slug = info?.slug;
        if (slug) {
          used.add(matchedTermLower);
          linksInjected += 1;
          const cat = String(info?.category || 'posts').toLowerCase();
          const labelSlug = info?.label
            ? String(info.label).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
            : null;
          const href = labelSlug
            ? `/${cat}/${labelSlug}/${slug}`
            : `/${cat}/${slug}`;
          const before = tok.slice(0, match.index);
          const after = tok.slice(match.index + match[1].length);
          replaced =
            before +
            `<a href="${href}" class="wu-internal-link" data-internal-link>` +
            match[1] +
            '</a>' +
            after;
          tokens[i] = replaced;
        }
      }
    }
  }

  return tokens.join('');
}

/** Strip every tag and decode the most common HTML entities. */
export function stripHtml(html) {
  if (!html) return '';
  const stripped = String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr|td|th|blockquote|pre|figcaption)\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  return decodeHtmlEntities(stripped).replace(/\s+/g, ' ').trim();
}
