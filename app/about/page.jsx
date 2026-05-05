import Link from 'next/link';
import { ArrowLeft, Compass, Globe, Leaf, Camera } from 'lucide-react';
import { buildStaticMetadata, SITE_NAME } from '@/lib/seo';

export const metadata = buildStaticMetadata({
  title: 'About Us',
  description: `${SITE_NAME} is a luxury wildlife platform — cinematic field reporting, conservation, and IUCN-tracked species.`,
  path: '/about',
});

const PILLARS = [
  {
    icon: Compass,
    title: 'Cinematic field reporting',
    body: 'Long-form journalism from the ground — savannah, rainforest, reef, and city. We send writers and photographers to the places the stories happen.',
  },
  {
    icon: Leaf,
    title: 'Conservation that holds up',
    body: 'Population numbers, IUCN status, restoration outcomes — every figure traceable to a peer-reviewed source or an authoritative monitoring body.',
  },
  {
    icon: Camera,
    title: 'Photography first',
    body: 'Wildlife is a visual subject. Original photography and video are the spine of our reporting, never decoration on top of borrowed prose.',
  },
  {
    icon: Globe,
    title: 'A planetary beat',
    body: 'From Tanzanian floodplains to Borneo canopy, from urban kestrels to Antarctic krill — biodiversity is global, and our reporting is too.',
  },
];

export default function AboutPage() {
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
          <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#d4af37' }}>About</p>
          <h1 style={{ fontSize: 'clamp(2.2rem, 4vw, 3.4rem)', fontWeight: 700, letterSpacing: '-0.025em', color: '#fff', margin: '0.5rem 0 1.1rem', lineHeight: 1.05, maxWidth: '760px' }}>
            A luxury wildlife platform built for readers who take the living world seriously.
          </h1>
          <p style={{ maxWidth: '720px', color: 'rgba(255,255,255,0.7)', fontSize: '1.05rem', lineHeight: 1.6, margin: 0 }}>
            {SITE_NAME} publishes cinematic field reporting, conservation journalism, and species
            profiles — every claim sourced, every image original, every story edited like it
            matters. Because it does.
          </p>
        </div>
      </section>

      <section style={{ maxWidth: '1080px', margin: '0 auto', padding: '4rem 1.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em', marginBottom: '1.8rem' }}>
          What we do
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.1rem',
          }}
        >
          {PILLARS.map(({ icon: Icon, title, body }) => (
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

      <section style={{ maxWidth: '880px', margin: '0 auto', padding: '0 1.5rem 5rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em', marginBottom: '1rem' }}>
          Our origin
        </h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.98rem', lineHeight: 1.75 }}>
          <p style={{ marginTop: 0 }}>
            {SITE_NAME} was founded by Matt McLean, a publisher and field reporter, after a decade
            of watching wildlife stories get treated as filler — slotted between politics and sport,
            stripped of context, written by writers who had never seen the species they covered.
          </p>
          <p>
            We started this platform on a single conviction: the planet&rsquo;s biodiversity deserves
            its own newsroom — one that respects readers, rewards expertise, and treats animals,
            plants, and ecosystems as protagonists rather than backdrops.
          </p>
          <p>
            Today we cover four beats — animals, plants, birds, insects — across every continent,
            with a special focus on IUCN Red List reporting, conservation outcomes, and the people
            and policies shaping them.
          </p>
        </div>

        <div
          style={{
            marginTop: '2.4rem',
            padding: '1.4rem 1.6rem',
            background: 'rgba(212,175,55,0.06)',
            border: '1px solid rgba(212,175,55,0.25)',
            borderRadius: '1rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.9rem',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.78)', fontSize: '0.95rem' }}>
            Want to write for us, partner, or pitch a story?
          </p>
          <Link
            href="/contact"
            style={{
              background: '#d4af37',
              color: '#0d1210',
              padding: '0.55rem 1.1rem',
              borderRadius: '0.6rem',
              fontWeight: 700,
              fontSize: '0.85rem',
              textDecoration: 'none',
            }}
          >
            Get in touch →
          </Link>
        </div>
      </section>

      <style>{`.wu-back-link:hover { color: #fff !important; }`}</style>
    </main>
  );
}
