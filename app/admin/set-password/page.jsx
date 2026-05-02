'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Eye, EyeOff, Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';

// ── Requirements ────────────────────────────────────────────
const RULES = [
  { id: 'length',    label: 'At least 8 characters',       test: (p) => p.length >= 8 },
  { id: 'uppercase', label: 'At least 1 uppercase letter',  test: (p) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: 'At least 1 lowercase letter',  test: (p) => /[a-z]/.test(p) },
  { id: 'numbers',   label: 'At least 2 numbers',           test: (p) => (p.match(/[0-9]/g) || []).length >= 2 },
  { id: 'symbol',    label: 'At least 1 symbol (!@#$…)',    test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function evaluate(pw) {
  return RULES.map((r) => ({ ...r, passed: r.test(pw) }));
}

const STRENGTH_COLORS = ['#e5e7eb', '#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];
const STRENGTH_LABELS = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];

export default function SetPasswordPage() {
  const router  = useRouter();
  const { user, loading } = useAuth();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [showCf, setShowCf]     = useState(false);
  const [error, setError]       = useState('');
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/staff-login');
  }, [user, loading]);

  const rules      = evaluate(password);
  const passed     = rules.filter((r) => r.passed).length;
  const allPassed  = passed === RULES.length;
  const mismatch   = confirm.length > 0 && password !== confirm;
  const canSubmit  = allPassed && password === confirm;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError('');
    try {
      const supabase = createClient();

      // Clear the flag first — pure DB write, no auth lock involved.
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ password_reset_required: false })
        .eq('id', user.id);
      if (dbErr) throw dbErr;

      // Change password — triggers onAuthStateChange which refreshes the
      // profile automatically. Do NOT call refresh() here; doing so races
      // with onAuthStateChange and causes the auth lock conflict.
      const { error: pwErr } = await supabase.auth.updateUser({ password });
      if (pwErr) throw pwErr;

      router.replace('/admin');
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (loading || !user) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4 py-10">
      <div className="glass w-full max-w-md rounded-3xl p-8 shadow-2xl">

        {/* Header */}
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10">
            <ShieldCheck className="h-7 w-7 text-[var(--color-primary)]" />
          </div>
          <h1 className="font-display text-2xl font-black">Secure your account</h1>
          <p className="mt-2 text-sm text-[var(--color-fg-soft)]">
            First-time login detected. Set a strong password before you can access the dashboard.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-600 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* New password */}
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
                placeholder="Create a strong password"
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

            {/* Strength bar */}
            {password.length > 0 && (
              <div className="mt-2.5">
                <div className="flex gap-1">
                  {RULES.map((_, i) => (
                    <div
                      key={i}
                      className="h-1.5 flex-1 rounded-full transition-all duration-300"
                      style={{ background: i < passed ? STRENGTH_COLORS[passed] : 'var(--glass-border)' }}
                    />
                  ))}
                </div>
                <p className="mt-1 text-[11px] font-medium transition-colors duration-200"
                  style={{ color: STRENGTH_COLORS[passed] }}>
                  {STRENGTH_LABELS[passed]}
                </p>
              </div>
            )}

            {/* Requirements checklist */}
            {password.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {rules.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 text-[12px]">
                    <span
                      className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full transition-colors duration-200"
                      style={{ background: r.passed ? '#22c55e18' : '#ef444418' }}
                    >
                      {r.passed
                        ? <Check className="h-2.5 w-2.5 text-green-500" strokeWidth={3} />
                        : <X className="h-2.5 w-2.5 text-red-400" strokeWidth={3} />}
                    </span>
                    <span style={{ color: r.passed ? '#22c55e' : 'var(--color-fg-soft)' }}>
                      {r.label}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Confirm password */}
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
