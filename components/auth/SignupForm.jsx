'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { CountrySelect } from './CountrySelect';
import { AvatarPicker } from './AvatarPicker';
import { OAuthButtons } from './OAuthButtons';

export function SignupForm() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    country: '',
    avatarId: 'lion',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const goToAvatar = (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setStep(2);
  };

  const submit = async () => {
    setError('');
    setSubmitting(true);
    try {
      await signUp(form);
      router.push('/profile');
    } catch (e) {
      setError(e.message || 'Sign up failed.');
      setStep(1);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass mx-auto w-full max-w-md rounded-3xl p-8 shadow-2xl">
      <div className="mb-6 text-center">
        <h1 className="font-display text-3xl font-black">
          {step === 1 ? 'Join the universe' : 'Choose your spirit'}
        </h1>
        <p className="mt-1.5 text-sm text-[var(--color-fg-soft)]">
          {step === 1
            ? 'Create your account in under a minute.'
            : 'Pick the animal that represents you.'}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-600 dark:text-red-300">
          {error}
        </div>
      )}

      {step === 1 ? (
        <form onSubmit={goToAvatar} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" required>
              <input
                value={form.firstName}
                onChange={(e) => update('firstName', e.target.value)}
                required
                className={inputCls}
              />
            </Field>
            <Field label="Last name" required>
              <input
                value={form.lastName}
                onChange={(e) => update('lastName', e.target.value)}
                required
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Email" required>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              required
              autoComplete="email"
              className={inputCls}
            />
          </Field>
          <Field label="Country" required>
            <CountrySelect
              value={form.country}
              onChange={(v) => update('country', v)}
              required
            />
          </Field>
          <Field label="Password" required>
            <input
              type="password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className={inputCls}
            />
          </Field>
          <button
            type="submit"
            className="w-full rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-medium text-white shadow-lg shadow-[var(--color-primary)]/30 transition-all hover:scale-[1.02] hover:bg-[var(--color-primary-deep)]"
          >
            Continue
          </button>

          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-[var(--glass-border)]" />
            <span className="text-xs text-[var(--color-fg-soft)]">or</span>
            <div className="h-px flex-1 bg-[var(--glass-border)]" />
          </div>

          <OAuthButtons />

          <p className="pt-2 text-center text-sm text-[var(--color-fg-soft)]">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-[var(--color-primary)] hover:underline"
            >
              Sign in
            </Link>
          </p>
        </form>
      ) : (
        <div className="space-y-5">
          <AvatarPicker
            value={form.avatarId}
            onChange={(id) => update('avatarId', id)}
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="glass flex-1 rounded-full px-5 py-3 text-sm font-medium"
            >
              Back
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="flex-1 rounded-full bg-[var(--color-primary)] px-5 py-3 text-sm font-medium text-white shadow-lg shadow-[var(--color-primary)]/30 transition-all hover:scale-[1.02] hover:bg-[var(--color-primary-deep)] disabled:opacity-60"
            >
              {submitting ? 'Creating…' : 'Create account'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-[var(--glass-border)] bg-[var(--color-bg-deep)] px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20';

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--color-fg-soft)]">
        {label}
        {required && <span className="ml-0.5 text-[var(--color-primary)]">*</span>}
      </span>
      {children}
    </label>
  );
}
