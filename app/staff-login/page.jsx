import { Suspense } from 'react';
import Link from 'next/link';
import { StaffLoginForm } from '@/components/auth/StaffLoginForm';

export const metadata = {
  title: 'Staff Portal — Wildlife Universe',
  robots: { index: false, follow: false },
};

export default function StaffLoginPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#080d0b',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        position: 'relative',
      }}
    >
      <style>{`
        .staff-back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          color: rgba(255,255,255,0.28);
          font-size: 0.8rem;
          text-decoration: none;
          transition: color 0.2s;
        }
        .staff-back-link:hover {
          color: rgba(255,255,255,0.65);
        }
      `}</style>

      {/* Subtle background glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(0,100,0,0.12) 0%, transparent 70%)',
      }} />

      {/* Back to site */}
      <div style={{ position: 'absolute', top: '1.5rem', left: '2rem' }}>
        <Link href="/" className="staff-back-link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Wildlife Universe
        </Link>
      </div>

      <Suspense fallback={null}>
        <StaffLoginForm />
      </Suspense>

      {/* Footer note */}
      <p style={{
        marginTop: '2rem', color: 'rgba(255,255,255,0.18)',
        fontSize: '0.72rem', textAlign: 'center', maxWidth: '320px',
      }}>
        This area is restricted to Wildlife Universe staff. Unauthorised access attempts are logged.
      </p>
    </div>
  );
}
