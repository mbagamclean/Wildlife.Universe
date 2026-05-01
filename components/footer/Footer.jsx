'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Mail, Rss } from 'lucide-react';
import { allLabels, categories } from '@/lib/mock/categories';

/* ── link data ──────────────────────────────────────────── */
const quickLinks = [
  { name: 'Home', href: '/' },
  { name: 'Popular Posts', href: '/posts' },
  { name: 'About Us', href: '/about' },
  { name: 'Contact', href: '/contact' },
  { name: 'Advertise With Us', href: '/advertise' },
  { name: 'Sitemap', href: '/sitemap' },
  { name: 'RSS Feed', href: '/rss' },
];

const legalLinks = [
  { name: 'Privacy Policy', href: '/legal/privacy' },
  { name: 'Terms of Service', href: '/legal/terms' },
  { name: 'Cookie Policy', href: '/legal/cookies' },
  { name: 'Editorial Policy', href: '/legal/eeat' },
  { name: 'Fact Checking Policy', href: '/legal/fact-checking' },
  { name: 'Cache Policy', href: '/legal/cache' },
  { name: 'Wildlife Universe Team', href: '/legal/team' },
];

const categoryLinks = categories.map((c) => ({ name: c.name, href: `/${c.slug}` }));

/* ── social links (manageable by CMS) ───────────────────────── */
const socialLinks = [
  {
    name: 'WhatsApp',
    href: '#',
    bg: '#25D366',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.031 0C5.385 0 0 5.385 0 12.031c0 2.12.553 4.186 1.6 6L.078 24l6.096-1.597C7.922 23.373 9.911 23.882 12.031 23.882 18.677 23.882 24 18.497 24 11.851 24 5.204 18.677 0 12.031 0zm3.896 17.15c-.173.486-.998.927-1.46.967-.442.038-1.026.136-3.2-.767-2.613-1.087-4.286-3.756-4.417-3.93-.131-.173-1.055-1.406-1.055-2.684 0-1.278.665-1.908.898-2.16.223-.24.484-.301.644-.301.16 0 .32.001.46.008.15.008.349-.06.536.398.196.48.666 1.626.726 1.747.06.12.1.26.02.42-.08.16-.12.26-.24.4-.12.14-.253.294-.36.393-.12.106-.246.223-.113.453.132.23.585.968 1.254 1.564.862.77 1.59 1.002 1.82 1.121.23.12.366.1.506-.06.14-.16.606-.706.766-.946.16-.24.32-.2.533-.12.213.08 1.346.634 1.576.749.23.115.383.172.438.267.054.095.054.551-.119 1.038z"/>
      </svg>
    ),
  },
  {
    name: 'Facebook',
    href: '#',
    bg: '#1877F2',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  {
    name: 'Instagram',
    href: '#',
    bg: '#E4405F',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
      </svg>
    ),
  },
  {
    name: 'TikTok',
    href: '#',
    bg: '#000000',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v8.1c0 2.45-.63 4.93-1.98 6.98-1.54 2.3-4.04 3.86-6.85 4.1-2.91.24-5.91-.6-8.08-2.6-2.12-1.94-3.34-4.84-3.13-7.79.23-2.99 1.83-5.71 4.25-7.42 2.37-1.66 5.37-2.19 8.2-1.63v4.13c-1.89-.31-3.86-.06-5.59.83-1.57.8-2.73 2.21-3.14 3.93-.38 1.63-.09 3.39.81 4.8 1.25 1.93 3.65 2.92 5.86 2.44 2.19-.48 3.95-2.3 4.38-4.52.09-.46.12-.93.12-1.41V.02z"/>
      </svg>
    ),
  },
  {
    name: 'YouTube',
    href: '#',
    bg: '#FF0000',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
];

/* ── tiny helpers ───────────────────────────────────────── */
function ColHead({ children }) {
  return (
    <h3 style={{
      color: 'rgba(255,255,255,0.35)',
      fontSize: '0.68rem',
      fontWeight: 700,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      marginBottom: '1.1rem',
      paddingBottom: '0.65rem',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
    }}>
      {children}
    </h3>
  );
}

function FootLink({ href, children }) {
  return (
    <li>
      <Link
        href={href}
        style={{ color: 'rgba(255,255,255,0.56)', fontSize: '0.875rem', textDecoration: 'none', display: 'block' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.56)')}
      >
        {children}
      </Link>
    </li>
  );
}

/* ── main component ─────────────────────────────────────── */
export function Footer() {
  const year = new Date().getFullYear();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [logoOk, setLogoOk] = useState(true);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('success');
    setEmail('');
    setTimeout(() => setStatus('idle'), 4000);
  };

  return (
    <footer style={{ background: '#0d1210', marginTop: '6rem' }}>
      {/* top border */}
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)' }} />

      {/* ── main grid ───────────────────────────────────────── */}
      <div style={{ width: '85%', maxWidth: '1800px', margin: '0 auto', padding: '4rem 0 3.5rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.6fr 1fr 1fr 0.9fr 1.4fr',
          gap: '2.5rem',
          alignItems: 'start',
        }}
          className="footer-grid"
        >

          {/* ── Col 1: Logo + description + labels ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' }}>
            {logoOk ? (
              <div 
                style={{ 
                  position: 'relative', 
                  width: '192px', 
                  height: '53px',
                  display: 'inline-block'
                }}
              >
                {/* Vibrant animated background or content showing through the logo */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(135deg, #4ade80, #3b82f6, #8b5cf6, #ec4899)',
                  backgroundSize: '200% 200%',
                  animation: 'gradientShift 8s ease infinite',
                  WebkitMaskImage: 'url(/logo.png)',
                  WebkitMaskSize: 'contain',
                  WebkitMaskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'left center',
                  maskImage: 'url(/logo.png)',
                  maskSize: 'contain',
                  maskRepeat: 'no-repeat',
                  maskPosition: 'left center',
                }} />
                {/* Fallback internal styling to ensure it works */}
                <style>{`
                  @keyframes gradientShift {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                  }
                `}</style>
              </div>
            ) : (
              <span style={{ color: 'whitesmoke', fontWeight: 700, fontSize: '1.25rem' }}>
                Wildlife Universe
              </span>
            )}

            <p style={{
              color: 'rgba(255,255,255,0.48)',
              fontSize: '0.875rem',
              lineHeight: '1.7',
              maxWidth: '320px',
              marginBottom: '1.5rem',
            }}>
              Your trusted source for wildlife knowledge, nature stories, and the
              living world — exploring animals, plants, birds, insects, and more.
            </p>

            {/* ── Explore Labels ── */}
            <div style={{ marginTop: '0.5rem' }}>
              <p style={{
                color: 'rgba(255,255,255,0.28)',
                fontSize: '0.65rem',
                fontWeight: 700,
                letterSpacing: '0.13em',
                textTransform: 'uppercase',
                marginBottom: '0.65rem',
              }}>
                Explore Labels
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {allLabels.map(({ label, slug }) => (
                  <Link
                    key={`${slug}-${label}`}
                    href={`/${slug}`}
                    style={{
                      color: 'rgba(255,255,255,0.45)',
                      fontSize: '0.72rem',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '9999px',
                      padding: '0.2rem 0.65rem',
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                      transition: 'color 0.15s, border-color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#fff';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                    }}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* ── Col 2: Quick Links ── */}
          <div>
            <ColHead>Quick Links</ColHead>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', listStyle: 'none', margin: 0, padding: 0 }}>
              {quickLinks.map((l) => <FootLink key={l.href} href={l.href}>{l.name}</FootLink>)}
            </ul>
          </div>

          {/* ── Col 3: Legal ── */}
          <div>
            <ColHead>Legal</ColHead>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', listStyle: 'none', margin: 0, padding: 0 }}>
              {legalLinks.map((l) => <FootLink key={l.href} href={l.href}>{l.name}</FootLink>)}
            </ul>
          </div>

          {/* ── Col 4: Categories ── */}
          <div>
            <ColHead>Categories</ColHead>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', listStyle: 'none', margin: 0, padding: 0 }}>
              {categoryLinks.map((c) => <FootLink key={c.href} href={c.href}>{c.name}</FootLink>)}
            </ul>
          </div>

          {/* ── Col 5: Newsletter ── */}
          <div>
            <ColHead>Newsletter</ColHead>
            <p style={{ color: 'rgba(255,255,255,0.52)', fontSize: '0.875rem', lineHeight: '1.65', marginBottom: '1rem' }}>
              Get the latest wildlife articles and insights delivered straight to your inbox.
            </p>

            {status === 'success' ? (
              <div style={{
                background: 'rgba(74,222,128,0.1)',
                border: '1px solid rgba(74,222,128,0.28)',
                borderRadius: '0.75rem',
                padding: '0.75rem 1rem',
                color: '#4ade80',
                fontSize: '0.875rem',
              }}>
                🎉 You&apos;re subscribed! Welcome aboard.
              </div>
            ) : (
              <form onSubmit={handleSubscribe} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ position: 'relative' }}>
                  <Mail style={{
                    position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                    width: '1rem', height: '1rem', color: 'rgba(255,255,255,0.28)', pointerEvents: 'none',
                  }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.11)',
                      borderRadius: '0.75rem',
                      padding: '0.7rem 1rem 0.7rem 2.4rem',
                      color: '#fff',
                      fontSize: '0.875rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.11)')}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                    width: '100%', background: 'var(--color-primary)', border: 'none',
                    borderRadius: '0.75rem', padding: '0.7rem 1rem',
                    color: '#fff', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  Subscribe <ArrowRight style={{ width: '1rem', height: '1rem' }} />
                </button>
              </form>
            )}

            <p style={{ marginTop: '0.6rem', color: 'rgba(255,255,255,0.28)', fontSize: '0.73rem' }}>
              No spam, ever. Unsubscribe anytime.
            </p>
            <Link
              href="/rss"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                marginTop: '0.9rem', color: 'rgba(255,255,255,0.32)', fontSize: '0.75rem', textDecoration: 'none',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.32)')}
            >
              <Rss style={{ width: '0.875rem', height: '0.875rem' }} /> RSS Feed
            </Link>

            {/* Social media links */}
            <div style={{ marginTop: '2.5rem' }}>
              <p style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: '0.75rem',
                fontWeight: 600,
                marginBottom: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Follow us on social media
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center' }}>
                {socialLinks.map((s) => (
                  <a
                    key={s.name}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.name}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '2.25rem', height: '2.25rem',
                      borderRadius: '0.5rem',
                      background: 'rgba(255,255,255,0.05)',
                      color: 'rgba(255,255,255,0.4)',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = s.bg;
                      e.currentTarget.style.color = '#fff';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                      e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Copyright bar ─────────────────────────────────── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
        <div style={{
          width: '85%', maxWidth: '1800px', margin: '0 auto', padding: '1.1rem 0',
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
        }}>
          <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: '0.75rem' }}>
            &copy; {year} Wildlife Universe. All rights reserved.
          </p>
          <Link
            href="/staff-login"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
              borderRadius: '9999px', padding: '0.38rem 0.85rem',
              color: 'rgba(255,255,255,0.38)', fontSize: '0.75rem', textDecoration: 'none',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.72)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.38)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Staff Login
          </Link>
        </div>
      </div>

      {/* ── Responsive collapse ───────────────────────────── */}
      <style>{`
        @media (max-width: 1100px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr 1fr !important;
          }
        }
        @media (max-width: 700px) {
          .footer-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </footer>
  );
}
