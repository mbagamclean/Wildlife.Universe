'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';

const STAFF_ROLES = ['ceo', 'editor', 'writer', 'moderator', 'admin'];

export function StaffLoginForm() {
  const router = useRouter();
  const { signIn, signOut } = useAuth();
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

      // Sign out immediately if not a staff member
      if (!profile || !STAFF_ROLES.includes(profile.role)) {
        await signOut();
        setError('Access denied. This portal is for staff members only.');
        return;
      }

      router.push(profile.passwordResetRequired ? '/admin/set-password' : '/admin');
    } catch (err) {
      setError(err.message || 'Sign in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '420px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: '1.5rem',
        padding: '2.5rem',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '3rem', height: '3rem', borderRadius: '0.875rem',
          background: 'rgba(0,128,0,0.15)', marginBottom: '1rem',
        }}>
          <ShieldAlert size={22} color="#4ade80" />
        </div>
        <h1 style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.35rem' }}>
          Staff Portal
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.42)', fontSize: '0.825rem', margin: 0 }}>
          Restricted access — authorised personnel only
        </p>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '0.75rem', padding: '0.7rem 1rem',
          color: '#fca5a5', fontSize: '0.8rem', marginBottom: '1.25rem',
        }}>
          {error}
        </div>
      )}

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Email */}
        <div>
          <label style={{
            display: 'block', color: 'rgba(255,255,255,0.45)',
            fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', marginBottom: '0.5rem',
          }}>
            Work Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@wildlifeuniverse.org"
            style={{
              width: '100%', background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem',
              padding: '0.75rem 1rem', color: '#fff', fontSize: '0.875rem',
              outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#4ade80')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
        </div>

        {/* Password */}
        <div>
          <label style={{
            display: 'block', color: 'rgba(255,255,255,0.45)',
            fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', marginBottom: '0.5rem',
          }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{
                width: '100%', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem',
                padding: '0.75rem 2.75rem 0.75rem 1rem', color: '#fff', fontSize: '0.875rem',
                outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#4ade80')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              tabIndex={-1}
              style={{
                position: 'absolute', right: '0.75rem', top: '50%',
                transform: 'translateY(-50%)', background: 'none',
                border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)',
                padding: 0, display: 'flex',
              }}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{
            marginTop: '0.5rem',
            width: '100%', background: submitting ? 'rgba(0,128,0,0.4)' : '#008000',
            border: 'none', borderRadius: '0.75rem', padding: '0.85rem',
            color: '#fff', fontWeight: 700, fontSize: '0.875rem', cursor: submitting ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s', letterSpacing: '0.02em',
          }}
          onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.background = '#006400'; }}
          onMouseLeave={(e) => { if (!submitting) e.currentTarget.style.background = '#008000'; }}
        >
          {submitting ? 'Verifying…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
