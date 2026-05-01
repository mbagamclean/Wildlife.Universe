function makeAvatar({ id, name, bg, accent, paths }) {
  const Component = ({ size = 64, className = '' }) => (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      aria-label={name}
      role="img"
    >
      <defs>
        <radialGradient id={`bg-${id}`} cx="0.5" cy="0.4" r="0.7">
          <stop offset="0%" stopColor={bg.from} />
          <stop offset="100%" stopColor={bg.to} />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill={`url(#bg-${id})`} />
      <g fill={accent}>{paths}</g>
    </svg>
  );
  Component.displayName = `Avatar_${id}`;
  return { id, name, Component };
}

export const avatars = [
  makeAvatar({
    id: 'lion',
    name: 'Lion',
    bg: { from: '#f4c46b', to: '#a85820' },
    accent: '#3a1e08',
    paths: (
      <>
        <circle cx="50" cy="48" r="22" />
        <circle cx="50" cy="48" r="14" fill="#f4c46b" />
        <circle cx="42" cy="46" r="2.5" fill="#3a1e08" />
        <circle cx="58" cy="46" r="2.5" fill="#3a1e08" />
        <path d="M44 56 Q50 60 56 56" stroke="#3a1e08" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M30 30 Q50 18 70 30" fill="none" stroke="#3a1e08" strokeWidth="2" />
      </>
    ),
  }),
  makeAvatar({
    id: 'elephant',
    name: 'Elephant',
    bg: { from: '#c8c0b8', to: '#7a6e5e' },
    accent: '#3d3528',
    paths: (
      <>
        <circle cx="50" cy="44" r="20" />
        <path d="M50 56 Q50 75 55 80 Q60 82 60 78" fill="none" stroke="#3d3528" strokeWidth="4" strokeLinecap="round" />
        <circle cx="44" cy="42" r="2" fill="#fff" />
        <circle cx="56" cy="42" r="2" fill="#fff" />
        <ellipse cx="35" cy="48" rx="8" ry="10" />
        <ellipse cx="65" cy="48" rx="8" ry="10" />
      </>
    ),
  }),
  makeAvatar({
    id: 'eagle',
    name: 'Eagle',
    bg: { from: '#a8d0f5', to: '#1f4a8a' },
    accent: '#2a1810',
    paths: (
      <>
        <circle cx="50" cy="44" r="18" fill="#fff" />
        <path d="M50 50 L42 60 L50 56 L58 60 Z" />
        <circle cx="44" cy="42" r="2.5" />
        <circle cx="56" cy="42" r="2.5" />
        <path d="M30 32 Q50 25 70 32" fill="none" stroke="#2a1810" strokeWidth="2" />
      </>
    ),
  }),
  makeAvatar({
    id: 'fox',
    name: 'Fox',
    bg: { from: '#ffb37a', to: '#c75a20' },
    accent: '#3a1408',
    paths: (
      <>
        <path d="M30 30 L40 22 L42 38 Z" />
        <path d="M70 30 L60 22 L58 38 Z" />
        <circle cx="50" cy="50" r="20" />
        <path d="M44 50 L50 58 L56 50 Z" fill="#fff" />
        <circle cx="44" cy="46" r="2" fill="#fff" />
        <circle cx="56" cy="46" r="2" fill="#fff" />
        <circle cx="50" cy="58" r="1.5" fill="#3a1408" />
      </>
    ),
  }),
  makeAvatar({
    id: 'owl',
    name: 'Owl',
    bg: { from: '#d8c8a0', to: '#6a4a28' },
    accent: '#2a1408',
    paths: (
      <>
        <ellipse cx="50" cy="50" rx="22" ry="24" />
        <circle cx="42" cy="46" r="6" fill="#fff" />
        <circle cx="58" cy="46" r="6" fill="#fff" />
        <circle cx="42" cy="46" r="3" />
        <circle cx="58" cy="46" r="3" />
        <path d="M46 56 L50 60 L54 56 Z" fill="#f4c46b" />
      </>
    ),
  }),
  makeAvatar({
    id: 'wolf',
    name: 'Wolf',
    bg: { from: '#b8c2d0', to: '#3a4a5a' },
    accent: '#1a2030',
    paths: (
      <>
        <path d="M28 32 L36 22 L40 36 Z" />
        <path d="M72 32 L64 22 L60 36 Z" />
        <circle cx="50" cy="52" r="20" />
        <ellipse cx="50" cy="60" rx="6" ry="4" fill="#1a2030" />
        <circle cx="42" cy="48" r="2.5" fill="#f4c46b" />
        <circle cx="58" cy="48" r="2.5" fill="#f4c46b" />
      </>
    ),
  }),
  makeAvatar({
    id: 'panda',
    name: 'Panda',
    bg: { from: '#f5f5f0', to: '#b8b8b0' },
    accent: '#1a1a1a',
    paths: (
      <>
        <circle cx="50" cy="50" r="22" fill="#fff" />
        <circle cx="32" cy="35" r="8" />
        <circle cx="68" cy="35" r="8" />
        <ellipse cx="42" cy="46" rx="5" ry="6" />
        <ellipse cx="58" cy="46" rx="5" ry="6" />
        <circle cx="42" cy="46" r="2" fill="#fff" />
        <circle cx="58" cy="46" r="2" fill="#fff" />
        <ellipse cx="50" cy="58" rx="3" ry="2" />
      </>
    ),
  }),
  makeAvatar({
    id: 'tiger',
    name: 'Tiger',
    bg: { from: '#ffb060', to: '#c04010' },
    accent: '#1a0808',
    paths: (
      <>
        <circle cx="50" cy="50" r="22" />
        <path d="M30 40 Q35 50 30 60" stroke="#1a0808" strokeWidth="2" fill="none" />
        <path d="M70 40 Q65 50 70 60" stroke="#1a0808" strokeWidth="2" fill="none" />
        <path d="M50 28 L48 38 M50 28 L52 38" stroke="#1a0808" strokeWidth="2" />
        <circle cx="42" cy="46" r="2.5" fill="#fff" />
        <circle cx="58" cy="46" r="2.5" fill="#fff" />
        <ellipse cx="50" cy="56" rx="3" ry="2" fill="#1a0808" />
      </>
    ),
  }),
  makeAvatar({
    id: 'bear',
    name: 'Bear',
    bg: { from: '#a08060', to: '#503018' },
    accent: '#1a0a04',
    paths: (
      <>
        <circle cx="32" cy="36" r="8" />
        <circle cx="68" cy="36" r="8" />
        <circle cx="50" cy="52" r="20" />
        <ellipse cx="50" cy="58" rx="8" ry="6" fill="#d8b890" />
        <circle cx="42" cy="48" r="2.5" fill="#fff" />
        <circle cx="58" cy="48" r="2.5" fill="#fff" />
        <ellipse cx="50" cy="58" rx="3" ry="2" />
      </>
    ),
  }),
  makeAvatar({
    id: 'deer',
    name: 'Deer',
    bg: { from: '#d8b890', to: '#7a5230' },
    accent: '#3a1808',
    paths: (
      <>
        <path d="M32 22 L36 14 L40 22 L36 28 Z" />
        <path d="M68 22 L64 14 L60 22 L64 28 Z" />
        <ellipse cx="50" cy="55" rx="18" ry="20" />
        <circle cx="44" cy="50" r="2" fill="#fff" />
        <circle cx="56" cy="50" r="2" fill="#fff" />
        <ellipse cx="50" cy="62" rx="3" ry="2" />
      </>
    ),
  }),
  makeAvatar({
    id: 'whale',
    name: 'Whale',
    bg: { from: '#a8d0f5', to: '#1f4a8a' },
    accent: '#0a1a3a',
    paths: (
      <>
        <ellipse cx="50" cy="55" rx="28" ry="16" />
        <path d="M22 45 Q15 35 18 30 Q22 40 28 42 Z" />
        <circle cx="40" cy="50" r="2" fill="#fff" />
        <path d="M65 35 Q70 30 75 35 Q72 40 65 38" fill="#a8d0f5" />
      </>
    ),
  }),
  makeAvatar({
    id: 'rhino',
    name: 'Rhino',
    bg: { from: '#a0a098', to: '#605850' },
    accent: '#2a2820',
    paths: (
      <>
        <ellipse cx="50" cy="52" rx="22" ry="18" />
        <path d="M28 50 L20 42 L26 52 Z" />
        <path d="M72 50 L80 42 L74 52 Z" />
        <path d="M50 38 L46 28 L54 28 Z" />
        <circle cx="42" cy="48" r="2" fill="#fff" />
        <circle cx="58" cy="48" r="2" fill="#fff" />
      </>
    ),
  }),
  makeAvatar({
    id: 'cheetah',
    name: 'Cheetah',
    bg: { from: '#f4c46b', to: '#a05818' },
    accent: '#1a0a04',
    paths: (
      <>
        <circle cx="50" cy="50" r="22" />
        <circle cx="35" cy="40" r="2" />
        <circle cx="65" cy="40" r="2" />
        <circle cx="32" cy="55" r="2" />
        <circle cx="68" cy="55" r="2" />
        <circle cx="50" cy="35" r="2" />
        <path d="M44 52 L42 60 M56 52 L58 60" stroke="#1a0a04" strokeWidth="2" />
        <circle cx="42" cy="46" r="2" fill="#fff" />
        <circle cx="58" cy="46" r="2" fill="#fff" />
      </>
    ),
  }),
  makeAvatar({
    id: 'penguin',
    name: 'Penguin',
    bg: { from: '#d8e8f5', to: '#3a5a7a' },
    accent: '#0a1a30',
    paths: (
      <>
        <ellipse cx="50" cy="55" rx="20" ry="24" />
        <ellipse cx="50" cy="58" rx="12" ry="18" fill="#fff" />
        <path d="M46 42 L50 48 L54 42 Z" fill="#f4c46b" />
        <circle cx="44" cy="38" r="2" fill="#fff" />
        <circle cx="56" cy="38" r="2" fill="#fff" />
        <circle cx="44" cy="38" r="1" />
        <circle cx="56" cy="38" r="1" />
      </>
    ),
  }),
  makeAvatar({
    id: 'turtle',
    name: 'Turtle',
    bg: { from: '#a8d0a0', to: '#386838' },
    accent: '#1a3818',
    paths: (
      <>
        <ellipse cx="50" cy="56" rx="22" ry="18" />
        <circle cx="50" cy="38" r="10" fill="#a8d0a0" />
        <circle cx="46" cy="36" r="1.5" fill="#1a3818" />
        <circle cx="54" cy="36" r="1.5" fill="#1a3818" />
        <path d="M40 56 L42 50 M50 60 L50 50 M60 56 L58 50" stroke="#386838" strokeWidth="2" />
        <ellipse cx="30" cy="62" rx="4" ry="3" />
        <ellipse cx="70" cy="62" rx="4" ry="3" />
      </>
    ),
  }),
];

export function findAvatar(id) {
  return avatars.find((a) => a.id === id) || avatars[0];
}
