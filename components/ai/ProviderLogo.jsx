'use client';

/**
 * Real brand logos for the AI providers we integrate with.
 * Inline SVGs (no runtime fetch). Used in admin UI to mark which
 * provider a feature is talking to. Nominative use only — these are
 * the providers' own marks and we render them at-rest, never altered.
 *
 * Sources:
 *   - Anthropic: simple-icons.org (icons/anthropic.svg)
 *   - Google Gemini: simple-icons.org (icons/googlegemini.svg)
 *   - OpenAI: public hex-flower mark, viewBox 0 0 24 24
 */

const PATHS = {
  openai: 'M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9981-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zM13.2599 22.4287a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7759.7759 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zM3.6034 18.3035a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7716.7716 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0757.0757 0 0 1-.038.0615L9.6987 19.95a4.4992 4.4992 0 0 1-6.0954-1.6464zM2.3464 7.8956a4.485 4.485 0 0 1 2.3708-1.9728L4.7172 6c-.0095.0571-.038.1378-.038.2186v6.7791l-.5252-.3074a4.504 4.504 0 0 1-1.6993-6.7747zm16.6293 3.8696L13.0648 8.4022l2.0258-1.1686a.0757.0757 0 0 1 .0759 0l4.8303 2.7866a4.4992 4.4992 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.4031-.6814zm2.0151-3.0212l-.142-.0852-4.7783-2.7582a.7948.7948 0 0 0-.7854 0L9.409 9.2304V6.8979a.0709.0709 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.6584zM8.3065 12.8638l-2.02-1.1685a.0757.0757 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.5093-2.6067-1.5093Z',
  anthropic: 'M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z',
  gemini: 'M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81',
};

const META = {
  openai:    { name: 'OpenAI',    color: '#000000',  gradient: null },
  anthropic: { name: 'Anthropic', color: '#D97757',  gradient: null },
  gemini:    { name: 'Gemini',    color: '#4285F4',  gradient: 'gemini-grad' },
  // Convenience aliases — accept "claude" interchangeably with "anthropic"
  claude:    { name: 'Claude',    color: '#D97757',  gradient: null },
};

const PATH_ALIAS = { claude: 'anthropic' };

export function ProviderLogo({
  provider,
  size = 16,
  monochrome = false,
  className = '',
  style = {},
  title,
}) {
  const pathKey = PATH_ALIAS[provider] || provider;
  const path = PATHS[pathKey];
  if (!path) return null;
  const meta = META[provider] || META[pathKey];

  const fill = monochrome ? 'currentColor' : (meta.gradient ? `url(#${meta.gradient})` : meta.color);

  return (
    <svg
      role="img"
      aria-label={title || meta.name}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ flexShrink: 0, ...style }}
    >
      <title>{title || meta.name}</title>
      {!monochrome && meta.gradient === 'gemini-grad' && (
        <defs>
          <linearGradient id="gemini-grad" x1="0" y1="24" x2="24" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#1C7ED6" />
            <stop offset="0.5" stopColor="#4285F4" />
            <stop offset="1" stopColor="#9168C0" />
          </linearGradient>
        </defs>
      )}
      <path d={path} fill={fill} />
    </svg>
  );
}

/**
 * Logo + label, useful for provider toggles / menu rows.
 */
export function ProviderBadge({
  provider,
  showLabel = true,
  size = 14,
  active = false,
  monochrome = false,
}) {
  const meta = META[provider];
  if (!meta) return null;
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 12, fontWeight: 700,
        color: active ? meta.color : 'inherit',
      }}
    >
      <ProviderLogo provider={provider} size={size} monochrome={monochrome} />
      {showLabel && <span>{meta.name}</span>}
    </span>
  );
}

export const PROVIDER_META = META;
