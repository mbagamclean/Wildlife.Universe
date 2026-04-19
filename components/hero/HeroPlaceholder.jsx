const subjectShapes = {
  lion: (accent) => (
    <g>
      <ellipse cx="500" cy="600" rx="160" ry="40" fill="rgba(0,0,0,0.25)" />
      <circle cx="500" cy="430" r="170" fill={accent} opacity="0.92" />
      <circle cx="430" cy="290" r="60" fill={accent} opacity="0.92" />
      <circle cx="570" cy="290" r="60" fill={accent} opacity="0.92" />
      <circle cx="450" cy="410" r="14" fill="rgba(0,0,0,0.7)" />
      <circle cx="550" cy="410" r="14" fill="rgba(0,0,0,0.7)" />
      <path
        d="M470 490 Q500 520 530 490"
        stroke="rgba(0,0,0,0.7)"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
      />
    </g>
  ),
  forest: (accent) => (
    <g>
      {Array.from({ length: 9 }).map((_, i) => {
        const x = 100 + i * 100;
        const h = 220 + ((i * 37) % 130);
        return (
          <g key={i}>
            <rect
              x={x - 12}
              y={620 - h * 0.3}
              width="24"
              height={h * 0.3}
              fill="#3a2410"
              opacity="0.85"
            />
            <ellipse
              cx={x}
              cy={620 - h * 0.3}
              rx="70"
              ry={h * 0.55}
              fill={accent}
              opacity={0.55 + (i % 3) * 0.15}
            />
          </g>
        );
      })}
    </g>
  ),
  eagle: (accent) => (
    <g>
      <path
        d="M500 380 L380 320 L420 360 L300 340 L380 400 L260 420 L380 440 L300 500 L420 480 L380 520 L500 460 L620 520 L580 480 L700 500 L620 440 L740 420 L620 400 L700 340 L580 360 L620 320 Z"
        fill={accent}
        opacity="0.95"
      />
      <circle cx="500" cy="400" r="28" fill="#1a1208" />
      <circle cx="500" cy="395" r="6" fill={accent} />
    </g>
  ),
};

export function HeroPlaceholder({ palette, accent, subject, animate = false }) {
  const Shape = subjectShapes[subject] || subjectShapes.forest;
  const gradientId = `bg-${subject}`;
  const sunId = `sun-${subject}`;
  const overlayId = `overlay-${subject}`;

  return (
    <svg
      viewBox="0 0 1000 700"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.from} />
          <stop offset="55%" stopColor={palette.via} />
          <stop offset="100%" stopColor={palette.to} />
        </linearGradient>
        <radialGradient id={sunId} cx="0.7" cy="0.3" r="0.5">
          <stop offset="0%" stopColor="rgba(255,235,180,0.85)" />
          <stop offset="60%" stopColor="rgba(255,200,120,0.15)" />
          <stop offset="100%" stopColor="rgba(255,200,120,0)" />
        </radialGradient>
        <linearGradient id={overlayId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(0,0,0,0.15)" />
          <stop offset="60%" stopColor="rgba(0,0,0,0.4)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.7)" />
        </linearGradient>
      </defs>
      <rect width="1000" height="700" fill={`url(#${gradientId})`} />
      <rect width="1000" height="700" fill={`url(#${sunId})`} />
      {animate && (
        <g opacity="0.35">
          {Array.from({ length: 25 }).map((_, i) => (
            <circle
              key={i}
              cx={(i * 73) % 1000}
              cy={(i * 137) % 700}
              r={1 + (i % 3)}
              fill="#fff"
            >
              <animate
                attributeName="opacity"
                values="0.2;0.9;0.2"
                dur={`${3 + (i % 4)}s`}
                begin={`${(i * 0.2) % 4}s`}
                repeatCount="indefinite"
              />
            </circle>
          ))}
        </g>
      )}
      {Shape(accent)}
      <rect width="1000" height="700" fill={`url(#${overlayId})`} />
    </svg>
  );
}
