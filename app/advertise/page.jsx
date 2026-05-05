import Link from 'next/link';
import { ArrowLeft, Megaphone, Target, Award, Shield } from 'lucide-react';
import { buildStaticMetadata, SITE_NAME } from '@/lib/seo';

export const metadata = buildStaticMetadata({
  title: 'Advertise With Us',
  description: `Sponsor wildlife journalism that takes the living world seriously. Reach an engaged audience of conservation, ecology, and nature readers on ${SITE_NAME}.`,
  path: '/advertise',
});

const CONTACT_EMAIL = 'mclean@wildlifeuniverse.org';

const FORMATS = [
  {
    icon: Megaphone,
    title: 'Sponsored series',
    body: 'A multi-part editorial series on a topic aligned with your mission — written and edited by our team, clearly labelled “Sponsored”, no editorial control given up.',
  },
  {
    icon: Target,
    title: 'Audience newsletter',
    body: 'A dedicated email to our subscriber base. Honest, plain-text, segment-targeted by interest beat (animals / plants / birds / insects) where useful.',
  },
  {
    icon: Award,
    title: 'Conservation partnerships',
    body: 'Co-branded reporting projects with NGOs, foundations, and protected-area authorities. We retain editorial independence and you get visibility plus the journalism.',
  },
  {
    icon: Shield,
    title: 'Brand-safe display',
    body: 'No ad-tech, no behavioural retargeting, no clutter. If we run display we run it directly with vetted partners on our terms.',
  },
];

const PRINCIPLES = [
  'Editorial integrity is non-negotiable. Sponsors never review or sign off on editorial copy.',
  'All sponsored content is clearly labelled — not just a “in partnership with” at the bottom.',
  'We reserve the right to decline a placement that conflicts with our editorial line on conservation.',
  'No tracking pixels, no third-party ad cookies, no surveillance.',
];

export default function AdvertisePage() {
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
            Sponsorship &amp; Partnership
          </p>
          <h1 style={{ fontSize: 'clamp(2rem, 3.8vw, 3.2rem)', fontWeight: 700, letterSpacing: '-0.025em', color: '#fff', margin: '0.5rem 0 1rem', lineHeight: 1.08, maxWidth: '780px' }}>
            Reach an audience that takes the living world seriously
          </h1>
          <p style={{ maxWidth: '700px', color: 'rgba(255,255,255,0.7)', fontSize: '1rem', lineHeight: 1.6, margin: 0 }}>
            {SITE_NAME} reaches conservation professionals, scientists, students, and a growing
            general audience who care enough to keep reading past the headline. If your brand or
            organisation aligns with that, we&rsquo;d like to talk.
          </p>
        </div>
      </section>

      <section style={{ maxWidth: '1080px', margin: '0 auto', padding: '4rem 1.5rem 1rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em', marginBottom: '1.8rem' }}>
          Formats we offer
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.1rem',
          }}
        >
          {FORMATS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '1rem',
                padding: '1.4rem',
              }}
            >
              <span
                style={{
                  width: '2.4rem',
                  height: '2.4rem',
                  borderRadius: '0.7rem',
                  background: 'rgba(212,175,55,0.12)',
                  border: '1px solid rgba(212,175,55,0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#d4af37',
                  marginBottom: '0.85rem',
                }}
              >
                <Icon size={18} />
              </span>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', margin: '0 0 0.45rem' }}>
                {title}
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: '880px', margin: '0 auto', padding: '3rem 1.5rem 2rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em', marginBottom: '1rem' }}>
          How we work with sponsors
        </h2>
        <ul style={{ margin: 0, padding: '0 0 0 1.2rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.75 }}>
          {PRINCIPLES.map((p) => (
            <li key={p} style={{ marginBottom: '0.4rem' }}>{p}</li>
          ))}
        </ul>
      </section>

      <section style={{ maxWidth: '880px', margin: '0 auto', padding: '1rem 1.5rem 5rem' }}>
        <div
          style={{
            background: 'rgba(212,175,55,0.06)',
            border: '1px solid rgba(212,175,55,0.3)',
            borderRadius: '1.2rem',
            padding: '1.8rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
              Talk to the publisher
            </h3>
            <p style={{ margin: '0.35rem 0 0', color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem' }}>
              We&rsquo;ll reply within two business days with an audience kit and rate card.
            </p>
          </div>
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=Sponsorship%20enquiry`}
            style={{
              background: '#d4af37',
              color: '#0d1210',
              padding: '0.7rem 1.3rem',
              borderRadius: '0.7rem',
              fontWeight: 700,
              fontSize: '0.92rem',
              textDecoration: 'none',
            }}
          >
            Contact the publisher →
          </a>
        </div>
      </section>

      <style>{`.wu-back-link:hover { color: #fff !important; }`}</style>
    </main>
  );
}
