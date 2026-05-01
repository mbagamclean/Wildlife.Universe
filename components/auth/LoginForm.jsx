'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { OAuthButtons } from './OAuthButtons';

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/profile';
  const { signIn } = useAuth();
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [error, setError]         = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const profile = await signIn(email, password);
      // First-time CEO login — force password setup before anything else
      router.push(profile?.passwordResetRequired ? '/admin/set-password' : next);
    } catch (err) {
      setError(err.message || 'Sign in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass mx-auto w-full max-w-md rounded-3xl p-8 shadow-2xl">
      <div className="mb-6 text-center">
        <h1 className="font-display text-3xl font-black">Welcome back</h1>
        <p className="mt-1.5 text-sm text-[var(--color-fg-soft)]">
          Sign in to continue your journey.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-600 dark:text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--color-fg-soft)]">
            Email
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--color-bg-deep)] px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--color-fg-soft)]">
            Password
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--color-bg-deep)] px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-medium text-white shadow-lg shadow-[var(--color-primary)]/30 transition-all hover:scale-[1.02] hover:bg-[var(--color-primary-deep)] disabled:opacity-60"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-[var(--glass-border)]" />
          <span className="text-xs text-[var(--color-fg-soft)]">or</span>
          <div className="h-px flex-1 bg-[var(--glass-border)]" />
        </div>

        <OAuthButtons />

        <p className="pt-2 text-center text-sm text-[var(--color-fg-soft)]">
          New here?{' '}
          <Link
            href="/signup"
            className="font-medium text-[var(--color-primary)] hover:underline"
          >
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}
