'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/storage/db';
import { useAuth } from '@/lib/auth/AuthContext';

export default function AdminProfilePage() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({ name: '', bio: '' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) setForm({ name: user.name || '', bio: user.bio || '' });
  }, [user]);

  const save = async () => {
    if (!user) return;
    try {
      const users = await db.users.list();
      const me = users.find((u) => u.email === user.email);
      if (me) {
        await db.users.update(me.id, { name: form.name, bio: form.bio });
        refresh?.();
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch { /* ignore */ }
  };

  return (
    <div className="p-5 sm:p-8">
      <div className="mb-6">
        <p className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#d4af37]">
          <span className="h-3 w-1 rounded-full bg-[#d4af37]" />
          ACCOUNTS
        </p>
        <h1 className="text-2xl font-black sm:text-3xl" style={{ color: 'var(--adm-text)' }}>Author Profile</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--adm-text-muted)' }}>Update your public profile details.</p>
      </div>

      <div className="max-w-lg">
        <div className="rounded-2xl p-6" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full text-2xl font-black text-[#d4af37]" style={{ background: 'rgba(212,175,55,0.15)' }}>
              {(form.name || user?.email || 'C')[0].toUpperCase()}
            </div>
            <div>
              <p className="font-bold" style={{ color: 'var(--adm-text)' }}>{form.name || 'CEO'}</p>
              <p className="text-xs" style={{ color: 'var(--adm-text-subtle)' }}>{user?.email}</p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold" style={{ color: 'var(--adm-text-muted)' }}>Display Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                style={{
                  background: 'var(--adm-surface-2)',
                  border: '1px solid var(--adm-border)',
                  color: 'var(--adm-text)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#d4af37'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--adm-border)'; }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold" style={{ color: 'var(--adm-text-muted)' }}>Bio</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={3}
                className="w-full resize-none rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                style={{
                  background: 'var(--adm-surface-2)',
                  border: '1px solid var(--adm-border)',
                  color: 'var(--adm-text)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#d4af37'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--adm-border)'; }}
              />
            </div>
          </div>
          <button
            onClick={save}
            className="mt-4 w-full rounded-xl bg-[#008000] py-2.5 text-sm font-semibold text-white hover:bg-[#006400] active:scale-[0.98]"
          >
            {saved ? '✓ Saved!' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}
