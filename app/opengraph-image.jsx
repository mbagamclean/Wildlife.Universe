import { ImageResponse } from 'next/og';
import { SITE_NAME, DEFAULT_DESCRIPTION } from '@/lib/seo';

export const runtime = 'nodejs';
export const alt = SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
          background:
            'linear-gradient(135deg, #061206 0%, #0f3818 38%, #1a4a10 70%, #b8902a 100%)',
          color: '#ffffff',
          fontFamily: 'Helvetica, Arial, sans-serif',
        }}
      >
        {/* radial highlight */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'radial-gradient(ellipse at 25% 20%, rgba(255,255,255,0.16) 0%, transparent 55%), radial-gradient(ellipse at 80% 90%, rgba(212,175,55,0.22) 0%, transparent 55%)',
            display: 'flex',
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            color: '#d4af37',
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: '#d4af37',
              display: 'flex',
            }}
          />
          Wildlife · Conservation · Earth
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', zIndex: 1 }}>
          <div
            style={{
              fontSize: 128,
              fontWeight: 900,
              lineHeight: 1.0,
              letterSpacing: '-0.04em',
              textShadow: '0 4px 24px rgba(0,0,0,0.45)',
              display: 'flex',
            }}
          >
            WILDLIFE
          </div>
          <div
            style={{
              fontSize: 128,
              fontWeight: 900,
              lineHeight: 1.0,
              letterSpacing: '-0.04em',
              color: '#d4af37',
              textShadow: '0 4px 24px rgba(0,0,0,0.45)',
              display: 'flex',
            }}
          >
            UNIVERSE
          </div>
          <div
            style={{
              marginTop: 28,
              maxWidth: 880,
              fontSize: 28,
              lineHeight: 1.35,
              color: 'rgba(255,255,255,0.86)',
              display: 'flex',
            }}
          >
            {DEFAULT_DESCRIPTION.split(' — ')[0] ||
              'A modern luxury wildlife platform.'}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: 'rgba(255,255,255,0.7)',
            fontSize: 22,
            zIndex: 1,
          }}
        >
          <div style={{ display: 'flex' }}>{SITE_NAME.toLowerCase().replace(/\s+/g, '.')}</div>
          <div style={{ display: 'flex', gap: 22 }}>
            <span style={{ display: 'flex' }}>Animals</span>
            <span style={{ display: 'flex' }}>Plants</span>
            <span style={{ display: 'flex' }}>Birds</span>
            <span style={{ display: 'flex' }}>Insects</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
