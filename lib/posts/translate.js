/**
 * Translation helpers shared between the audio player and PostView.
 *
 * The audio player picks the listening language; PostView owns the cache so
 * BOTH the audio body and the table of contents can render in the same
 * translated language. Long bodies are sentence-chunked under the
 * /api/ai/translate route's 16 000-char cap and translated in parallel.
 */

/* Audio-voice value → /api/ai/translate target language name.
   Mirrors every entry in LANG_GROUPS so the Translate chip is offered
   for every listening voice — see SUPPORTED_LANGUAGES in
   app/api/ai/translate/route.js for the API-side allowlist. */
export const TRANSLATE_TARGET_BY_AUDIO_LANG = {
  // African
  'sw': 'Swahili',
  'ha': 'Hausa',
  'yo': 'Yoruba',
  'am': 'Amharic',
  'zu': 'Zulu',
  'ig': 'Igbo',
  'so': 'Somali',
  // European / Latin-script
  'en-US': 'English',
  'en-GB': 'English',
  'fr-FR': 'French',
  'es-ES': 'Spanish',
  'de-DE': 'German',
  'it-IT': 'Italian',
  'pt-BR': 'Portuguese',
  'pt-PT': 'Portuguese',
  'nl-NL': 'Dutch',
  'pl-PL': 'Polish',
  'ru-RU': 'Russian',
  'tr-TR': 'Turkish',
  // Asian
  'ar':    'Arabic',
  'hi-IN': 'Hindi',
  'zh-CN': 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
  'ja-JP': 'Japanese',
  'ko-KR': 'Korean',
  'id-ID': 'Indonesian',
  'ms-MY': 'Malay',
  'vi-VN': 'Vietnamese',
  'th-TH': 'Thai',
  'bn-BD': 'Bengali',
  'ur-PK': 'Urdu',
};

const CHUNK_MAX_CHARS = 9000;

export function chunkAtSentenceBoundary(text, max = CHUNK_MAX_CHARS) {
  if (!text || text.length <= max) return text ? [text] : [];
  const parts = text.split(/(?<=[.!?])\s+/);
  const chunks = [];
  let buf = '';
  for (const p of parts) {
    if ((buf ? buf.length + 1 : 0) + p.length > max && buf) {
      chunks.push(buf);
      buf = p;
    } else {
      buf = buf ? `${buf} ${p}` : p;
    }
    while (buf.length > max) {
      chunks.push(buf.slice(0, max));
      buf = buf.slice(max);
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

export async function translateText(text, targetLanguage, signal) {
  const chunks = chunkAtSentenceBoundary(text);
  if (chunks.length === 0) return '';
  const results = await Promise.all(chunks.map(async (chunk) => {
    const res = await fetch('/api/ai/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: chunk, targetLanguage, preserveTone: true }),
      signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      throw new Error(json.error || `Translate failed (${res.status})`);
    }
    return (json.data?.translation || '').trim();
  }));
  return results.filter(Boolean).join(' ');
}

/**
 * Translate an ordered list of short heading titles in a single call.
 * We send a numbered list and parse the numbered list back so the model
 * can translate them with full context (better than per-title API calls).
 * Any line that fails to parse falls back to the original title.
 */
export async function translateTocTitles(titles, targetLanguage, signal) {
  if (!titles || titles.length === 0) return [];
  const numbered = titles.map((t, i) => `${i + 1}. ${t}`).join('\n');
  const translated = await translateText(numbered, targetLanguage, signal);
  const out = new Array(titles.length).fill(null);
  for (const line of translated.split(/\r?\n/)) {
    const m = line.match(/^\s*(\d+)[\.\)]\s*(.+)$/);
    if (!m) continue;
    const idx = parseInt(m[1], 10) - 1;
    if (idx >= 0 && idx < titles.length) out[idx] = m[2].trim();
  }
  return titles.map((orig, i) => out[i] || orig);
}
