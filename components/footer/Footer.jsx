import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { allLabels } from '@/lib/mock/categories';

const legal = [
  { name: 'Privacy Policy', href: '/legal/privacy' },
  { name: 'Terms & Conditions', href: '/legal/terms' },
  { name: 'EEAT (Editorial Policy)', href: '/legal/eeat' },
  { name: 'Cookies Policy', href: '/legal/cookies' },
  { name: 'Cache Policy', href: '/legal/cache' },
  { name: 'Fact Checking Policy', href: '/legal/fact-checking' },
  { name: 'Wildlife Universe Team', href: '/legal/team' },
];

const quick = [
  { name: 'Home', href: '/' },
  { name: 'Popular Posts', href: '/posts' },
  { name: 'About Us', href: '/about' },
  { name: 'Contact Us', href: '/contact' },
  { name: 'Advertise', href: '/advertise' },
  { name: 'Sitemap', href: '/sitemap' },
  { name: 'RSS Feed', href: '/rss' },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-24 border-t border-[var(--glass-border)] bg-gradient-to-b from-transparent to-[var(--color-bg-deep)]">
      <Container className="py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          <FooterColumn title="Legal">
            <ul className="space-y-2.5">
              {legal.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-[var(--color-fg-soft)] transition-colors hover:text-[var(--color-primary)]"
                  >
                    {l.name}
                  </Link>
                </li>
              ))}
            </ul>
          </FooterColumn>

          <FooterColumn title="Quick Links">
            <ul className="space-y-2.5">
              {quick.map((q) => (
                <li key={q.href}>
                  <Link
                    href={q.href}
                    className="text-sm text-[var(--color-fg-soft)] transition-colors hover:text-[var(--color-primary)]"
                  >
                    {q.name}
                  </Link>
                </li>
              ))}
            </ul>
          </FooterColumn>

          <FooterColumn title="Explore Labels">
            <div className="flex flex-wrap gap-2">
              {allLabels.map(({ label, slug }) => (
                <Link
                  key={`${slug}-${label}`}
                  href={`/${slug}`}
                  className="glass rounded-full px-3 py-1 text-xs text-[var(--color-fg-soft)] transition-all hover:scale-105 hover:text-[var(--color-primary)]"
                >
                  {label}
                </Link>
              ))}
            </div>
          </FooterColumn>
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-[var(--glass-border)] pt-8 md:flex-row md:items-center">
          <div>
            <p className="font-display text-xl font-bold text-[var(--color-primary)]">
              Wildlife Universe
            </p>
            <p className="text-xs text-[var(--color-fg-soft)]">
              A modern luxury wildlife platform.
            </p>
          </div>
          <p className="text-xs text-[var(--color-fg-soft)]">
            &copy; {year} Wildlife Universe. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
}

function FooterColumn({ title, children }) {
  return (
    <div>
      <h3 className="mb-4 font-display text-sm font-bold uppercase tracking-widest text-[var(--color-primary)]">
        {title}
      </h3>
    {children}
    </div>
  );
}
