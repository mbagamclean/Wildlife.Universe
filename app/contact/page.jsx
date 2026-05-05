import Link from 'next/link';
import { ArrowLeft, Mail, MessageSquare, Newspaper, Camera, AlertCircle } from 'lucide-react';
import { buildStaticMetadata, SITE_NAME } from '@/lib/seo';

export const metadata = buildStaticMetadata({
  title: 'Contact',
  description: `Get in touch with the ${SITE_NAME} editorial team.`,
  path: '/contact',
});

const CONTACT_EMAIL = 'mclean@wildlifeuniverse.org';

const REASONS = [
  {
    icon: Newspaper,
    label: 'Pitch a story',
    body: 'Field reporters, photographers, and scientists with a story idea — send a one-paragraph pitch with the angle, the species, and the place.',
  },
  {
    icon: Camera,
    label: 'Submit imagery',
    body: 'Ethically sourced wildlife photography and video that fits one of our beats. Tell us where, when, and the species.',
  },
  {
    icon: AlertCircle,
    label: 'Flag a correction',
    body: 'Spotted something wrong? Send the article URL and the specific claim. We respond within two business days.',
  },
  {
    icon: MessageSquare,
    label: 'General questions',
    body: 'Partnerships, advertising, press, or anything else — start with a short email and we’ll route it.',
  },
];

export default function ContactPage() {
  return (
    <main style={{ background: '#0d1210', color: 'rgba(255,255,255,0.85)', minHeight: '100vh' }}>
      <section
        style={{
          background: 'linear-gradient(135deg, #0c4a1a 0%, #143a23 50%, #1f2a20 100%)',
          borderBottom: '1px solid rgba(212,175,55,0.18)',
          padding: '5rem 1.5rem 3.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 80% 20%, rgba(212,175,55,0.22), transparent 55%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ maxWidth: '1080px', margin: '0 auto', position: 'relative' }}>
          <Link
            href="/"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', textDecoration: 'none', marginBottom: '1.6rem' }}
            className="wu-back-link"
          >
            <ArrowLeft size={14} />
            Back to Home
          </Link>
          <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#d4af37' }}>
            Contact
          </p>
          <h1 style={{ fontSize: 'clamp(2rem, 3.6vw, 3rem)', fontWeight: 700, letterSpacing: '-0.025em', color: '#fff', margin: '0.5rem 0 1rem', lineHeight: 1.1 }}>
            Talk to the editors
          </h1>
          <p style={{ maxWidth: '640px', color: 'rgba(255,255,255,0.7)', fontSize: '1rem', lineHeight: 1.6, margin: 0 }}>
            One inbox, real humans, two-business-day reply. Pick the box closest to why you&rsquo;re writing — it helps us route faster.
          </p>
        </div>
      </section>

      <section style={{ maxWidth: '1080px', margin: '0 auto', padding: '3.5rem 1.5rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1rem',
            marginBottom: '3rem',
          }}
        >
          {REASONS.map(({ icon: Icon, label, body }) => (
            <div
              key={label}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '1rem',
                padding: '1.3rem',
              }}
            >
              <span
                style={{
                  width: '2.2rem',
                  height: '2.2rem',
                  borderRadius: '0.6rem',
                  background: 'rgba(212,175,55,0.12)',
                  border: '1px solid rgba(212,175,55,0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#d4af37',
                  marginBottom: '0.7rem',
                }}
              >
                <Icon size={16} />
              </span>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', margin: '0 0 0.4rem' }}>
                {label}
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.58)', fontSize: '0.86rem', lineHeight: 1.6, margin: 0 }}>
                {body}
              </p>
            </div>
          ))}
        </div>

        <div
          style={{
            background: 'rgba(212,175,55,0.06)',
            border: '1px solid rgba(212,175,55,0.3)',
            borderRadius: '1.2rem',
            padding: '2rem 1.7rem',
            textAlign: 'center',
            maxWidth: '560px',
            margin: '0 auto',
          }}
        >
          <span
            style={{
              width: '3rem',
              height: '3rem',
              borderRadius: '0.85rem',
              background: 'rgba(212,175,55,0.15)',
              border: '1px solid rgba(212,175,55,0.45)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d4af37',
              marginBottom: '1rem',
            }}
          >
            <Mail size={22} />
          </span>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em', margin: '0 0 0.5rem' }}>
            Email us directly
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.95rem', margin: '0 0 1.2rem' }}>
            One address for everything. We read every message.
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            style={{
              display: 'inline-block',
              background: '#d4af37',
              color: '#0d1210',
              padding: '0.7rem 1.4rem',
              borderRadius: '0.7rem',
              fontWeight: 700,
              fontSize: '0.95rem',
              textDecoration: 'none',
              letterSpacing: '0.01em',
            }}
          >
            {CONTACT_EMAIL}
          </a>
        </div>
      </section>

      <style>{`.wu-back-link:hover { color: #fff !important; }`}</style>
    </main>
  );
}
