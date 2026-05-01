'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';

const MIN_LENGTH = 12;

function strength(pw) {
  let score = 0;
  if (pw.length >= MIN_LENGTH)       score++;
  if (/[A-Z]/.test(pw))             score++;
  if (/[0-9]/.test(pw))             score++;
  if (/[^A-Za-z0-9]/.test(pw))      score++;
  return score; // 0-4
}

const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLOR = ['', '#ef4444', '#f97316', '#eab308', '#22c55e'];

export default function SetPasswordPage() {
  const router            = useRouter();
  const { user, loading, refresh } = useAuth();
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [showCf, setShowCf]       = useState(false);
  const [error, setError]         = useState('');
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading]);

  const score      = strength(password);
  const mismatch   = confirm.length > 0 && password !== confirm;
  const canSubmit  = password.length >= MIN_LENGTH && score >= 2 && password === confirm;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError('');
    try {
      const supabase = createClient();

      const { error: pwErr } = await supabase.auth.updateUser({ password });
      if (pwErr) throw pwErr;

      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ password_reset_required: false })
        .eq('id', user.id);
      if (dbErr) throw dbErr;

      await refresh();
      router.replace('/admin');
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (loading || !user) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="glass w-full max-w-md rounded-3xl p-8 shadow-2xl">

        {/* Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10">
            <ShieldCheck className="h-7 w-7 text-[var(--color-primary)]" />
          </div>
          <h1 className="font-display text-2xl font-black">Secure your account</h1>
          <p className="mt-2 text-sm text-[var(--color-fg-soft)]">
            You are logging in for the first time. Choose a strong password to
            protect your account — this step is required before you can proceed.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-600 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Password field */}
          <div>
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--color-fg-soft)]">
              New Password
            </span>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder={`At least ${MIN_LENGTH} characters`}
                className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--color-bg-deep)] px-4 py-3 pr-10 text-sm outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-fg-soft)] hover:text-[var(--color-fg)]"
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Strength meter */}
            {password.length > 0 && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-1 flex-1 rounded-full transition-all duration-300"
                      style={{ background: i <= score ? STRENGTH_COLOR[score] : 'var(--glass-border)' }}
                    />
                  ))}
                </div>
                <p className="mt-1 text-[11px]" style={{ color: STRENGTH_COLOR[score] }}>
                  {STRENGTH_LABEL[score]}
                  {score < 2 && ' — add uppercase letters, numbers, or symbols'}
                </p>
              </div>
            )}
          </div>

          {/* Confirm field */}
          <div>
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--color-fg-soft)]">
              Confirm Password
            </span>
            <div className="relative">
              <input
                type={showCf ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Repeat your password"
                className={`w-full rounded-xl border bg-[var(--color-bg-deep)] px-4 py-3 pr-10 text-sm outline-none transition-colors focus:ring-2 ${
                  mismatch
                    ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-[var(--glass-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/20'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowCf((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-fg-soft)] hover:text-[var(--color-fg)]"
                tabIndex={-1}
              >
                {showCf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {mismatch && (
              <p className="mt-1 text-[11px] text-red-500">Passwords do not match.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={!canSubmit || saving}
            className="w-full rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--color-primary)]/30 transition-all hover:scale-[1.02] hover:bg-[var(--color-primary-deep)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          >
            {saving ? 'Saving…' : 'Set Password & Enter Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}
