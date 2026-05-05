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
 * Walk the HTML, give each h1/h2/h3 a stable ID (preserving any existing
 * id attribute), and return a TOC with up to 7 entries built from those
 * headings. Works without a DOM since it uses a regex over the string.
 */
export function injectHeadingIdsAndBuildToc(html) {
  if (!html) return { html: '', toc: [] };
  const toc = [];
  let counter = 0;
  const out = html.replace(
    /<(h[1-3])\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi,
    (match, tag, attrs, inner) => {
      const idMatch = attrs.match(/\sid=["']([^"']+)["']/i);
      const existingId = idMatch && idMatch[1];
      const id = existingId || `post-h-${counter}`;
      const cleanText = inner.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (toc.length < 7 && cleanText) {
        toc.push({
          id,
          title: cleanText.length > 72 ? `${cleanText.slice(0, 69)}…` : cleanText,
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
