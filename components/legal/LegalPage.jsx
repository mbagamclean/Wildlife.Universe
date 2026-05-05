/**
 * Shared layout for legal / policy pages.
 *
 * Matches the Wildlife Universe dark + gold visual identity. Each page is
 * just metadata + a `sections` array — content stays readable and SEO-friendly.
 */

import Link from 'next/link';
import { ArrowLeft, Scale } from 'lucide-react';

export function LegalPage({
  eyebrow = 'Wildlife Universe · Legal',
  title,
  lead,
  effectiveDate,
  sections = [],
  contactEmail = 'mclean@wildlifeuniverse.org',
  icon: Icon = Scale,
}) {
  return (
    <main style={{ background: '#0d1210', color: 'rgba(255,255,255,0.85)', minHeight: '100vh' }}>
      {/* Hero */}
      <section
        style={{
          background: 'linear-gradient(135deg, #0c4a1a 0%, #143a23 50%, #1f2a20 100%)',
          borderBottom: '1px solid rgba(212,175,55,0.18)',
          padding: '4rem 1.5rem 3rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 75% 20%, rgba(212,175,55,0.18), transparent 50%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ maxWidth: '880px', margin: '0 auto', position: 'relative' }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: 'rgba(255,255,255,0.55)',
              fontSize: '0.8rem',
              textDecoration: 'none',
              marginBottom: '1.4rem',
              transition: 'color 0.18s',
            }}
            className="wu-back-link"
          >
            <ArrowLeft size={14} />
            Back to Home
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.7rem' }}>
            <span
              style={{
                width: '3rem',
                height: '3rem',
                borderRadius: '0.85rem',
                background: 'rgba(212,175,55,0.15)',
                border: '1px solid rgba(212,175,55,0.4)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#d4af37',
                flexShrink: 0,
              }}
            >
              <Icon size={22} />
            </span>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: '#d4af37',
                }}
              >
                {eyebrow}
              </p>
              <h1
                style={{
                  fontSize: 'clamp(1.75rem, 3vw, 2.4rem)',
                  fontWeight: 700,
                  letterSpacing: '-0.025em',
                  color: '#fff',
                  margin: '0.15rem 0 0',
                  lineHeight: 1.15,
                }}
              >
                {title}
              </h1>
            </div>
          </div>

          {lead && (
            <p
              style={{
                maxWidth: '620px',
                color: 'rgba(255,255,255,0.62)',
                fontSize: '0.95rem',
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {lead}
            </p>
          )}

          {effectiveDate && (
            <p
              style={{
                color: 'rgba(255,255,255,0.45)',
                fontSize: '0.78rem',
                marginTop: '1rem',
                marginBottom: 0,
              }}
            >
              Effective: <strong style={{ color: 'rgba(255,255,255,0.75)' }}>{effectiveDate}</strong>
            </p>
          )}
        </div>
      </section>

      {/* Body */}
      <article style={{ maxWidth: '880px', margin: '0 auto', padding: '3rem 1.5rem 5rem' }}>
        {sections.map((s, i) => (
          <section key={i} style={{ marginBottom: '2.4rem' }}>
            {s.heading && (
              <h2
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  color: '#fff',
                  marginBottom: '0.7rem',
                  paddingBottom: '0.45rem',
                  borderBottom: '1px solid rgba(212,175,55,0.22)',
                }}
              >
                {s.heading}
              </h2>
            )}
            {Array.isArray(s.body)
              ? s.body.map((p, j) => (
                  <p
                    key={j}
                    style={{
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: '0.95rem',
                      lineHeight: 1.7,
                      marginBottom: '0.85rem',
                    }}
                  >
                    {p}
                  </p>
                ))
              : typeof s.body === 'string'
                ? (
                    <p
                      style={{
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: '0.95rem',
                        lineHeight: 1.7,
                        marginBottom: '0.85rem',
                      }}
                    >
                      {s.body}
                    </p>
                  )
                : s.body}
            {s.list && (
              <ul
                style={{
                  margin: '0.4rem 0 0',
                  padding: '0 0 0 1.2rem',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '0.95rem',
                  lineHeight: 1.7,
                }}
              >
                {s.list.map((item, j) => (
                  <li key={j} style={{ marginBottom: '0.35rem' }}>
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        {contactEmail && (
          <section
            style={{
              marginTop: '3rem',
              padding: '1.4rem 1.5rem',
              background: 'rgba(212,175,55,0.06)',
              border: '1px solid rgba(212,175,55,0.25)',
              borderRadius: '1rem',
            }}
          >
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255,255,255,0.7)' }}>
              Questions about this policy? Email{' '}
              <a
                href={`mailto:${contactEmail}`}
                style={{ color: '#d4af37', fontWeight: 600, textDecoration: 'none' }}
              >
                {contactEmail}
              </a>
              .
            </p>
          </section>
        )}
      </article>

      <style>{`.wu-back-link:hover { color: #fff !important; }`}</style>
    </main>
  );
}
