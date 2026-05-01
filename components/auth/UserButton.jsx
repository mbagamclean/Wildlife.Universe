'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { findAvatar } from '@/lib/data/avatars';
import { isCEO } from '@/lib/auth/ceo';
import { LogIn, LogOut, User, ShieldCheck } from 'lucide-react';

export function UserButton() {
  const { user, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (loading) {
    return (
      <div
        aria-hidden
        className="glass h-10 w-10 animate-pulse rounded-full"
      />
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="glass hidden items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-all hover:scale-105 hover:border-[var(--color-primary)] sm:inline-flex"
      >
        <LogIn className="h-3.5 w-3.5" />
        Sign in
      </Link>
    );
  }

  const Avatar = findAvatar(user.avatarId).Component;

  return (
    <div ref={ref} className="relative">
      <button
        aria-label="User menu"
        onClick={() => setOpen((o) => !o)}
        className="relative h-10 w-10 overflow-hidden rounded-full ring-2 ring-transparent transition-all hover:ring-[var(--color-primary)]/60"
      >
        <Avatar size={40} className="rounded-full" />
      </button>
      {open && (
        <div className="glass absolute right-0 top-12 z-[60] w-56 overflow-hidden rounded-2xl shadow-2xl">
          <div className="border-b border-[var(--glass-border)] px-4 py-3">
            <p className="truncate text-sm font-medium">
              {user.firstName} {user.lastName}
            </p>
            <p className="truncate text-xs text-[var(--color-fg-soft)]">
              {user.email}
            </p>
          </div>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
          >
            <User className="h-4 w-4" /> Profile
          </Link>
          {isCEO(user) && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--color-gold-soft)] transition-colors hover:bg-white/5"
            >
              <ShieldCheck className="h-4 w-4" /> Admin
            </Link>
          )}
          <button
            onClick={async () => {
              await signOut();
              setOpen(false);
              router.push('/');
            }}
            className="flex w-full items-center gap-2.5 border-t border-[var(--glass-border)] px-4 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-300"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
