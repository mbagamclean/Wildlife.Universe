/**
 * Helpers for the post-body HTML pipeline.
 *
 * The editor (Tiptap) saves HTML via editor.getHTML(). The reader's
 * PostView used to split the body on \n\n and render each piece as text,
 * which made <p>/<h2>/etc. show up as literal characters. These helpers
 * support the rewritten render path: sanitize → inject heading IDs for
 * the TOC → strip-to-text for audio + word counting.
 */

import DOMPurify from 'isomorphic-dompurify';

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
 * Works in both server (jsdom) and browser environments via
 * isomorphic-dompurify.
 */
export function sanitizeBodyHtml(html) {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'hr',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'strong', 'b', 'em', 'i', 'u', 's', 'mark', 'sub', 'sup', 'small',
      'a', 'span', 'div',
      'blockquote', 'code', 'pre',
      'figure', 'figcaption',
      'img', 'video', 'source', 'audio', 'iframe',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'srcset', 'alt', 'title', 'id', 'class', 'style',
      'width', 'height', 'rel', 'target', 'colspan', 'rowspan', 'scope',
      'data-youtube-video', 'data-vimeo', 'allow', 'allowfullscreen',
      'frameborder', 'loading', 'controls', 'muted', 'playsinline',
      'poster', 'type',
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|data):|[/?#])/i,
    ADD_ATTR: ['target', 'rel'],
  });
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
      const cleanText = inner
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

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

/** Strip every tag and decode the most common HTML entities. */
export function stripHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr|td|th|blockquote|pre|figcaption)\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&lsquo;|&rsquo;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
