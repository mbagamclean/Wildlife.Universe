import { ImageResponse } from 'next/og';
import { categories } from '@/lib/mock/categories';
import { SITE_NAME } from '@/lib/seo';

export const runtime = 'nodejs';
export const alt = `${SITE_NAME} category`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const CAT_THEMES = {
  animals: { from: '#061206', via: '#1a4a10', to: '#3d7a28', accent: '#5dc23a', tagline: 'Mammals, reptiles & the wild kingdom' },
  plants:  { from: '#031408', via: '#0c3a18', to: '#2a7048', accent: '#3ab860', tagline: 'Trees, shrubs & rare flora' },
  birds:   { from: '#040a1c', via: '#0f2550', to: '#2a5090', accent: '#4a90d8', tagline: 'Raptors, songbirds & waterfowl' },
  insects: { from: '#150900', via: '#3c2000', to: '#7a4a10', accent: '#c88020', tagline: 'Arthropods & invertebrates' },
  posts:   { from: '#040d10', via: '#0f2a35', to: '#1a5060', accent: '#30a0b8', tagline: 'Conservation, tourism & wild stories' },
};

export default async function CategoryOG({ params }) {
  const { category: slug } = await params;
  const cat = categories.find((c) => c.slug === slug);
  const name = cat?.name || (slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : 'Category');
  const theme = CAT_THEMES[slug] || CAT_THEMES.posts;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: `linear-gradient(135deg, ${theme.from} 0%, ${theme.via} 52%, ${theme.to} 100%)`,
          color: '#ffffff',
          fontFamily: 'Helvetica, Arial, sans-serif',
        }}
      >
        {/* Highlights */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse at 22% 18%, rgba(255,255,255,0.18) 0%, transparent 55%), radial-gradient(ellipse at 80% 88%, ${theme.accent}40 0%, transparent 55%)`,
            display: 'flex',
          }}
        />

        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            padding: '80px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* Top brand */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              color: 'rgba(255,255,255,0.72)',
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 999,
                background: theme.accent,
                display: 'flex',
              }}
            />
            {SITE_NAME}
          </div>

          {/* Hero */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                letterSpacing: '0.22em',
                color: theme.accent,
                textTransform: 'uppercase',
                marginBottom: 12,
                display: 'flex',
              }}
            >
              Explore Wildlife
            </div>
            <div
              style={{
                fontSize: 220,
                fontWeight: 900,
                lineHeight: 0.95,
                letterSpacing: '-0.05em',
                textShadow: '0 6px 32px rgba(0,0,0,0.55)',
                display: 'flex',
                textTransform: 'uppercase',
              }}
            >
              {name}
            </div>
            <div
              style={{
                marginTop: 28,
                fontSize: 30,
                color: 'rgba(255,255,255,0.85)',
                display: 'flex',
                maxWidth: 900,
              }}
            >
              {theme.tagline}
            </div>
          </div>

          {/* Bottom labels */}
          <div
            style={{
              display: 'flex',
              gap: 14,
              flexWrap: 'wrap',
              color: 'rgba(255,255,255,0.85)',
              fontSize: 20,
            }}
          >
            {(cat?.labels || []).slice(0, 5).map((l) => (
              <div
                key={l}
                style={{
                  display: 'flex',
                  padding: '8px 18px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                }}
              >
                {l}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
