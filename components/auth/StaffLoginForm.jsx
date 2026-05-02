'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Lock, Mail, LogIn } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';

const STAFF_ROLES = ['ceo', 'editor', 'writer', 'moderator', 'admin'];

export function StaffLoginForm() {
  const router  = useRouter();
  const { user, loading, signIn, signOut } = useAuth();

  // If already authenticated as staff → go straight to the dashboard.
  // If authenticated as a regular user → sign them out so they stay on
  // this page; the staff portal is not accessible to public accounts.
  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (STAFF_ROLES.includes(user.role)) {
      router.replace(user.passwordResetRequired ? '/admin/set-password' : '/admin');
    } else {
      signOut();
    }
  }, [user, loading]);

  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [error, setError]         = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const profile = await signIn(email, password);

      if (!profile || !STAFF_ROLES.includes(profile.role)) {
        await signOut();
        setError('Access denied. This portal is for authorised staff only.');
        return;
      }

      router.push(profile.passwordResetRequired ? '/admin/set-password' : '/admin');
    } catch (err) {
      setError(err.message || 'Sign in failed. Check your credentials and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      background: 'linear-gradient(135deg, #004d00 0%, #002600 45%, #004d00 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Background radial glows */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 60% at 20% 20%, rgba(0,128,0,0.35) 0%, transparent 60%)',
      }} />
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 50% at 80% 80%, rgba(0,100,0,0.25) 0%, transparent 55%)',
      }} />

      {/* Lock icon + heading */}
      <div style={{ textAlign: 'center', marginBottom: '2rem', position: 'relative' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '4rem', height: '4rem', borderRadius: '50%',
          background: 'linear-gradient(135deg, #00a000, #008000)',
          boxShadow: '0 4px 24px rgba(0,128,0,0.5)',
          marginBottom: '1.25rem',
        }}>
          <Lock size={24} color="#fff" strokeWidth={2.5} />
        </div>
        <h1 style={{
          color: '#fff', fontSize: '1.75rem', fontWeight: 800,
          margin: '0 0 0.4rem', letterSpacing: '-0.01em',
        }}>
          Staff Login
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: 0 }}>
          Access the Wildlife Universe Staff CMS
        </p>
      </div>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: '440px',
        background: '#fff', borderRadius: '1rem',
        padding: '2.25rem 2rem',
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        position: 'relative',
      }}>

        {/* Error */}
        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: '0.6rem', padding: '0.65rem 0.9rem',
            color: '#dc2626', fontSize: '0.825rem', marginBottom: '1.25rem',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

          {/* Email */}
          <div>
            <label style={{
              display: 'block', color: '#374151',
              fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.45rem',
            }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={16} color="#9ca3af"
                style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="admin@example.com"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#f0f4ff', border: '1.5px solid transparent',
                  borderRadius: '0.6rem', padding: '0.7rem 1rem 0.7rem 2.5rem',
                  color: '#111827', fontSize: '0.9rem', outline: 'none',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#008000'; e.currentTarget.style.background = '#fff'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = '#f0f4ff'; }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{
              display: 'block', color: '#374151',
              fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.45rem',
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={15} color="#9ca3af"
                style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#f0f4ff', border: '1.5px solid transparent',
                  borderRadius: '0.6rem', padding: '0.7rem 2.75rem 0.7rem 2.5rem',
                  color: '#111827', fontSize: '0.9rem', outline: 'none',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#008000'; e.currentTarget.style.background = '#fff'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = '#f0f4ff'; }}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                tabIndex={-1}
                style={{
                  position: 'absolute', right: '0.85rem', top: '50%',
                  transform: 'translateY(-50%)', background: 'none',
                  border: 'none', cursor: 'pointer', padding: 0,
                  color: '#9ca3af', display: 'flex', alignItems: 'center',
                }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: '0.25rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              width: '100%', background: submitting ? '#86efac' : '#008000',
              border: 'none', borderRadius: '0.6rem', padding: '0.85rem',
              color: '#fff', fontWeight: 700, fontSize: '0.95rem',
              cursor: submitting ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
              boxShadow: '0 4px 14px rgba(29,78,216,0.4)',
            }}
            onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.background = '#1e40af'; }}
            onMouseLeave={(e) => { if (!submitting) e.currentTarget.style.background = '#008000'; }}
          >
            <LogIn size={17} strokeWidth={2.5} />
            {submitting ? 'Verifying…' : 'Sign In'}
          </button>

          {/* Footer note */}
          <p style={{
            textAlign: 'center', color: '#9ca3af',
            fontSize: '0.75rem', margin: '0.25rem 0 0',
          }}>
            Authorized personnel only. Unauthorized access is prohibited.
          </p>
        </form>
      </div>

      {/* Back to website */}
      <Link
        href="/"
        style={{
          marginTop: '1.75rem', color: 'rgba(255,255,255,0.45)',
          fontSize: '0.8rem', textDecoration: 'none',
          display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
          transition: 'color 0.2s', position: 'relative',
        }}
        className="staff-back-link"
      >
        ← Back to Website
      </Link>

      <style>{`
        .staff-back-link:hover { color: rgba(255,255,255,0.8) !important; }
      `}</style>
    </div>
  );
}
