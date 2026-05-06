import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'IUCN Red List Species — Wildlife Universe';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div style={{
        height: '100%', width: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        background: 'linear-gradient(135deg, #030803, #0c4a1a 60%, #28a028)',
        color: '#fff', padding: 64,
      }}>
        <div style={{
          fontSize: 18, letterSpacing: 6, color: '#a8e0c0',
          textTransform: 'uppercase', marginBottom: 24,
        }}>
          IUCN Red List
        </div>
        <div style={{ fontSize: 84, fontWeight: 900, lineHeight: 1.05, marginBottom: 16 }}>
          Threatened Species
        </div>
        <div style={{ fontSize: 24, color: 'rgba(255,255,255,0.75)', maxWidth: 880 }}>
          The world&apos;s most comprehensive inventory of conservation status, since 1964.
        </div>
      </div>
    ),
    { ...size }
  );
}
