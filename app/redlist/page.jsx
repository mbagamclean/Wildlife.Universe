import { Container } from '@/components/ui/Container';
import { db } from '@/lib/storage/db';
import { IUCN_CONFIG, IUCN_ORDER } from '@/components/iucn/iucnConfig';
import { IUCNCard } from '@/components/iucn/IUCNCard';

export const metadata = {
  title: 'IUCN Red List Species — Wildlife Universe',
  description:
    'Browse all wildlife species classified by the IUCN Red List of Threatened Species, from Extinct to Least Concern. The world\'s most comprehensive inventory of conservation status, since 1964.',
  alternates: { canonical: '/redlist' },
};

// ISR — admin saves call revalidatePath for instant invalidation.
export const revalidate = 300;

export default async function RedListPage() {
  const posts = await db.posts.listAllForRedlist();

  // Group by status. Curated label-only posts (no iucn_status) bucket
  // under "NE" so they still surface but are visually de-emphasised.
  const grouped = {};
  for (const post of posts) {
    const code = post.iucnStatus || 'NE';
    if (!grouped[code]) grouped[code] = [];
    grouped[code].push(post);
  }
  for (const code of Object.keys(grouped)) {
    grouped[code].sort((a, b) => (b.views || 0) - (a.views || 0));
  }

  return (
    <main style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
      <section style={{ position: 'relative', overflow: 'hidden', padding: '64px 0 32px' }}>
        <Container>
          <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto' }}>
            <p style={{
              fontSize: 11, fontWeight: 600, color: 'rgba(40,160,40,0.9)',
              textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 12,
            }}>
              International Union for Conservation of Nature
            </p>
            <h1 style={{
              fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 900, lineHeight: 1.05,
              letterSpacing: '-0.02em', color: 'var(--color-fg)', marginBottom: 16,
            }}>
              IUCN Red List Species
            </h1>
            <p style={{
              fontSize: 16, lineHeight: 1.6, color: 'var(--color-fg-soft)',
            }}>
              The world&apos;s most comprehensive inventory of the global conservation
              status of biological species — updated continuously since 1964. Browse
              every species featured on Wildlife Universe, grouped by official IUCN category.
            </p>
          </div>
        </Container>
      </section>

      <section style={{ padding: '32px 0 96px' }}>
        <Container>
          {IUCN_ORDER.map((code) => {
            const cfg = IUCN_CONFIG[code];
            const list = grouped[code] || [];
            if (!list.length) return null;
            return (
              <div key={code} style={{ marginBottom: 56 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18,
                  paddingLeft: 4, borderLeft: `4px solid ${cfg.color}`,
                }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '4px 10px', borderRadius: 6,
                    background: cfg.badgeBg, color: cfg.textColor,
                    fontSize: 12, fontWeight: 900, letterSpacing: '0.1em',
                    border: `1px solid ${cfg.color}50`,
                  }}>
                    {cfg.code}
                  </span>
                  <h2 style={{
                    fontSize: 22, fontWeight: 800, color: 'var(--color-fg)',
                    margin: 0,
                  }}>{cfg.label}</h2>
                  <span style={{
                    fontSize: 11, color: 'var(--color-fg-soft)',
                    marginLeft: 'auto',
                  }}>
                    {list.length} {list.length === 1 ? 'species' : 'species'}
                  </span>
                </div>
                <p style={{
                  fontSize: 13, color: 'var(--color-fg-soft)',
                  marginBottom: 16, paddingLeft: 18, maxWidth: 720,
                }}>
                  {cfg.shortDesc}
                </p>
                <div style={{
                  display: 'grid', gap: 16,
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  paddingLeft: 18,
                }}>
                  {list.map((post, idx) => (
                    <IUCNCard
                      key={post.id || post.slug}
                      post={post}
                      statusConfig={cfg}
                      index={idx}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {posts.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '64px 16px',
              color: 'var(--color-fg-soft)', fontSize: 14,
            }}>
              No IUCN Red List species published yet. Check back soon.
            </div>
          )}
        </Container>
      </section>
    </main>
  );
}
