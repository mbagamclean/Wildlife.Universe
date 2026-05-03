'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Globe, ArrowUpRight } from 'lucide-react';

const PAGES = [
  { title: 'Home',           href: '/',        desc: 'Landing page with hero carousel' },
  { title: 'Posts',          href: '/posts',   desc: 'All blog posts'                  },
  { title: 'Animals',        href: '/animals', desc: 'Animals category'                },
  { title: 'Birds',          href: '/birds',   desc: 'Birds category'                  },
  { title: 'Plants',         href: '/plants',  desc: 'Plants category'                 },
  { title: 'Insects',        href: '/insects', desc: 'Insects category'                },
  { title: 'About',          href: '/about',   desc: 'About Wildlife Universe'         },
  { title: 'Privacy Policy', href: '/privacy', desc: 'Legal — privacy policy'          },
  { title: 'Terms of Service', href: '/terms', desc: 'Legal — terms of service'        },
];

export default function AdminPagesPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <div className="p-5 sm:p-8">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em',
          lineHeight: 1.15, marginBottom: 4, color: 'var(--adm-text)',
        }}>
          Pages
        </h1>
        <p style={{ fontSize: 14, color: 'var(--adm-text-muted)', margin: 0 }}>
          Quick links to all public website pages
        </p>
      </div>

      {/* Pages table */}
      <div style={{
        background: 'var(--adm-surface)',
        border: '1px solid var(--adm-border)',
        borderRadius: 14,
        boxShadow: isDark ? 'none' : '0 1px 6px rgba(0,0,0,0.05)',
        overflow: 'hidden',
      }}>
        {PAGES.map((p, i) => (
          <Link
            key={p.href}
            href={p.href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 20px',
              borderBottom: i < PAGES.length - 1 ? '1px solid var(--adm-border)' : 'none',
              textDecoration: 'none',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--adm-hover-bg)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            {/* Icon */}
            <div style={{
              width: 34, height: 34, borderRadius: 9, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isDark ? 'rgba(0,128,0,0.12)' : 'rgba(0,128,0,0.08)',
            }}>
              <Globe size={16} color="#008000" strokeWidth={1.8} />
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--adm-text)' }}>
                {p.title}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--adm-text-subtle)', marginTop: 1 }}>
                {p.href}  ·  {p.desc}
              </p>
            </div>

            {/* Arrow */}
            <ArrowUpRight size={15} strokeWidth={1.8} style={{ color: 'var(--adm-text-subtle)', flexShrink: 0 }} />
          </Link>
        ))}
      </div>
    </div>
  );
}
