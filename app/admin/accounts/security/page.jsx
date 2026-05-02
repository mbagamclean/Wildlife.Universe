'use client';

import { useState } from 'react';
import { Eye, EyeOff, KeyRound, Check } from 'lucide-react';

const RULES = [
  { id: 'length',    label: 'At least 8 characters',      test: (p) => p.length >= 8 },
  { id: 'uppercase', label: '1 uppercase letter',          test: (p) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: '1 lowercase letter',          test: (p) => /[a-z]/.test(p) },
  { id: 'numbers',   label: '2 numbers',                   test: (p) => (p.match(/[0-9]/g) || []).length >= 2 },
  { id: 'symbol',    label: '1 symbol (!@#$…)',            test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export default function AdminSecurityPage() {
  const [current, setCurrent]   = useState('');
  const [next,    setNext]      = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showCur, setShowCur]   = useState(false);
  const [showNew, setShowNew]   = useState(false);
  const [showCon, setShowCon]   = useState(false);
  const [saving,  setSaving]    = useState(false);
  const [msg,     setMsg]       = useState(null);

  const rules     = RULES.map((r) => ({ ...r, passed: r.test(next) }));
  const allPassed = rules.every((r) => r.passed);
  const mismatch  = confirm.length > 0 && next !== confirm;
  const canSubmit = current.length > 0 && allPassed && next === confirm;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/staff/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to change password.');
      setCurrent('');
      setNext('');
      setConfirm('');
      setMsg({ type: 'success', text: 'Password changed successfully.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-5 sm:p-8">
      <div className="mb-6">
        <p className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#d4af37]">
          <span className="h-3 w-1 rounded-full bg-[#d4af37]" />
          ACCOUNTS
        </p>
        <h1 className="text-2xl font-black sm:text-3xl" style={{ color: 'var(--adm-text)' }}>
          Accounts &amp; Security
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--adm-text-muted)' }}>
          Manage account credentials and security settings.
        </p>
      </div>

      <div className="max-w-lg">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-6"
          style={{
            background: 'var(--adm-surface)',
            boxShadow: 'var(--adm-shadow)',
            border: '1px solid var(--adm-border)',
          }}
        >
          <div className="mb-5 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[#d4af37]" />
            <p className="text-sm font-bold" style={{ color: 'var(--adm-text)' }}>Change Password</p>
          </div>

          <div className="flex flex-col gap-4">
            {/* Current password */}
            <PasswordField
              label="Current Password"
              value={current}
              onChange={setCurrent}
              show={showCur}
              onToggle={() => setShowCur((v) => !v)}
              autoComplete="current-password"
            />

            {/* New password */}
            <div>
              <PasswordField
                label="New Password"
                value={next}
                onChange={setNext}
                show={showNew}
                onToggle={() => setShowNew((v) => !v)}
                autoComplete="new-password"
              />
              {/* Strength checklist */}
              {next.length > 0 && (
                <ul className="mt-2.5 space-y-1">
                  {rules.map((r) => (
                    <li key={r.id} className="flex items-center gap-2 text-[11px]">
                      <span
                        className="flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full"
                        style={{ background: r.passed ? '#22c55e22' : '#ef444422' }}
                      >
                        {r.passed
                          ? <Check className="h-2 w-2 text-green-500" strokeWidth={3} />
                          : <span className="h-[1px] w-2 rounded-full bg-red-400" />}
                      </span>
                      <span style={{ color: r.passed ? '#22c55e' : 'var(--adm-text-muted)' }}>
                        {r.label}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <PasswordField
                label="Confirm New Password"
                value={confirm}
                onChange={setConfirm}
                show={showCon}
                onToggle={() => setShowCon((v) => !v)}
                autoComplete="new-password"
                error={mismatch}
              />
              {mismatch && (
                <p className="mt-1 text-[11px] text-red-500">Passwords do not match.</p>
              )}
            </div>
          </div>

          {msg && (
            <p
              className={`mt-4 rounded-xl px-3 py-2 text-xs font-semibold ${
                msg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
              }`}
            >
              {msg.text}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit || saving}
            className="mt-5 w-full rounded-xl bg-[#008000] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#006400] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Updating…' : 'Confirm Password Change'}
          </button>
        </form>
      </div>
    </div>
  );
}

function PasswordField({ label, value, onChange, show, onToggle, autoComplete, error }) {
  return (
    <div className="relative">
      <label className="mb-1 block text-xs font-semibold" style={{ color: 'var(--adm-text-muted)' }}>
        {label}
      </label>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        className="w-full rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none"
        style={{
          background: 'var(--adm-surface-2)',
          border: `1px solid ${error ? '#ef4444' : 'var(--adm-border)'}`,
          color: 'var(--adm-text)',
        }}
        onFocus={(e) => { if (!error) e.currentTarget.style.borderColor = '#d4af37'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = error ? '#ef4444' : 'var(--adm-border)'; }}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={onToggle}
        className="absolute right-3 top-[30px] text-[#bbb] hover:text-[#888]"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
