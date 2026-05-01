'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { findAvatar } from '@/lib/data/avatars';
import { findCountry } from '@/lib/data/countries';
import { CountrySelect } from './CountrySelect';
import { AvatarPicker } from './AvatarPicker';
import { LogOut, Edit3, Check, X, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { isCEO } from '@/lib/auth/ceo';

export function ProfileForm() {
  const router = useRouter();
  const { user, loading, signOut, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login?next=/profile');
  }, [loading, user, router]);

  useEffect(() => {
    if (user) setDraft(user);
  }, [user]);

  if (loading || !user || !draft) {
    return (
      <div className="glass mx-auto w-full max-w-2xl rounded-3xl p-8 text-center">
        <p className="text-sm text-[var(--color-fg-soft)]">Loading profile…</p>
      </div>
    );
  }

  const Avatar = findAvatar(user.avatarId).Component;
  const country = findCountry(user.country);

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile(user.id, {
        firstName: draft.firstName,
        lastName: draft.lastName,
        country: draft.country,
        avatarId: draft.avatarId,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass mx-auto w-full max-w-2xl rounded-3xl p-8 shadow-2xl">
      <div className="flex flex-col items-center gap-4 border-b border-[var(--glass-border)] pb-8 text-center">
        <Avatar size={120} className="rounded-full ring-4 ring-[var(--color-primary)]/30" />
        <div>
          <h1 className="font-display text-3xl font-black">
            {user.firstName} {user.lastName}
          </h1>
          <p className="text-sm text-[var(--color-fg-soft)]">{user.email}</p>
          {country && (
            <p className="mt-1 text-xs text-[var(--color-fg-soft)]">
              {country.name}
            </p>
          )}
          {isCEO(user) && (
            <Link
              href="/admin"
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-gold)]/15 px-3 py-1 text-xs font-semibold text-[var(--color-gold-soft)]"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> CEO · Open Admin
            </Link>
          )}
        </div>
      </div>

      <div className="mt-8 space-y-5">
        {editing ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name">
                <input
                  value={draft.firstName}
                  onChange={(e) => setDraft({ ...draft, firstName: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Last name">
                <input
                  value={draft.lastName}
                  onChange={(e) => setDraft({ ...draft, lastName: e.target.value })}
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="Country">
              <CountrySelect
                value={draft.country}
                onChange={(v) => setDraft({ ...draft, country: v })}
              />
            </Field>
            <Field label="Avatar">
              <AvatarPicker
                value={draft.avatarId}
                onChange={(id) => setDraft({ ...draft, avatarId: id })}
              />
            </Field>
            <div className="flex gap-2 pt-2">
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-deep)] disabled:opacity-60"
              >
                <Check className="h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setDraft(user);
                  setEditing(false);
                }}
                className="glass inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium"
              >
                <X className="h-4 w-4" /> Cancel
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setEditing(true)}
              className="glass inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium hover:border-[var(--color-primary)]"
            >
              <Edit3 className="h-4 w-4" /> Edit profile
            </button>
            <button
              onClick={async () => {
                await signOut();
                router.push('/');
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-5 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/20 dark:text-red-300"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-[var(--glass-border)] bg-[var(--color-bg-deep)] px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20';

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--color-fg-soft)]">
        {label}
      </span>
      {children}
    </label>
  );
}
