'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { isCEO } from '@/lib/auth/ceo';

export function AdminGuard({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login?next=/admin');
      return;
    }
    if (!isCEO(user)) {
      router.replace('/');
    }
  }, [user, loading, router]);

  if (loading || !user || !isCEO(user)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="glass rounded-2xl px-6 py-4 text-sm text-[var(--color-fg-soft)]">
          Verifying access…
        </div>
      </div>
    );
  }

  return children;
}
