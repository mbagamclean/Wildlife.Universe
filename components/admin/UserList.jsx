'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/storage/db';
import { findCountry } from '@/lib/data/countries';
import { findAvatar } from '@/lib/data/avatars';

export function UserList() {
  const [users, setUsers] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    db.users.list().then((u) => {
      setUsers(u);
      setLoaded(true);
    });
  }, []);

  if (!loaded) return <p className="text-sm text-[var(--color-fg-soft)]">Loading users…</p>;

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-display text-xl font-bold">Users <span className="text-[var(--color-fg-soft)]">({users.length})</span></h2>
      {users.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-[var(--color-fg-soft)]">No users yet.</div>
      ) : (
        <ul className="grid gap-3">
          {users.map((u) => {
            const avatar = findAvatar(u.avatarId);
            const country = findCountry(u.countryCode);
            const Avatar = avatar?.Component;
            return (
              <li key={u.id} className="glass flex items-center gap-4 rounded-2xl p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10">
                  {Avatar ? <Avatar size={36} /> : <span className="text-sm font-semibold">{u.name?.[0] || '?'}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{u.name}</p>
                    {u.role === 'ceo' && (
                      <span className="rounded-full bg-[var(--color-gold)]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-gold)]">
                        CEO
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-[var(--color-fg-soft)]">
                    {u.email}{country ? ` · ${country.name}` : ''}
                  </p>
                </div>
                <div className="text-right text-xs text-[var(--color-fg-soft)]">
                  Joined {new Date(u.createdAt).toLocaleDateString()}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
