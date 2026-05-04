/**
 * Lightweight URL → provider detection. Mirrors the logic inside
 * components/ui/VideoPlayer.jsx so the admin UI can preview the
 * provider badge before save without rendering the player.
 *
 * Returns null for empty/invalid inputs.
 */
export function detectVideoProvider(url) {
  if (!url) return null;
  const s = String(url).trim();
  if (!s) return null;

  if (/youtube\.com\/shorts\//.test(s)) return 'youtube-shorts';
  if (/(?:youtube\.com\/(?:watch|embed|live)|youtu\.be\/)/.test(s)) return 'youtube';
  if (/vimeo\.com\//.test(s)) return 'vimeo';
  if (/tiktok\.com\//.test(s)) return 'tiktok';
  if (/instagram\.com\/(?:reel|tv)\//.test(s)) return 'instagram-reel';
  if (/instagram\.com\/p\//.test(s)) return 'instagram-post';
  if (/facebook\.com|fb\.watch/.test(s)) return 'facebook';
  if (/twitter\.com|x\.com/.test(s)) return 'twitter';
  if (/\.(mp4|webm|ogv|mov|m4v)(\?|$)/i.test(s)) return 'html5';
  return null;
}

export const PROVIDER_LABELS = {
  youtube:           'YouTube',
  'youtube-shorts':  'YouTube Shorts',
  vimeo:             'Vimeo',
  tiktok:            'TikTok',
  'instagram-reel':  'Instagram Reel',
  'instagram-post':  'Instagram Post',
  facebook:          'Facebook',
  twitter:           'X / Twitter',
  html5:             'Direct video file',
};

export const PROVIDER_COLORS = {
  youtube:           '#ff0000',
  'youtube-shorts':  '#ff0000',
  vimeo:             '#1ab7ea',
  tiktok:            '#ff0050',
  'instagram-reel':  '#e4405f',
  'instagram-post':  '#e4405f',
  facebook:          '#1877f2',
  twitter:           '#000000',
  html5:             '#16a34a',
};
