'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';

const STAFF_ROLES = ['ceo', 'editor', 'writer', 'moderator', 'admin'];

export function AdminGuard({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user || !STAFF_ROLES.includes(user.role)) {
      router.replace('/staff-login');
    }
  }, [user, loading, router]);

  if (loading || !user || !STAFF_ROLES.includes(user.role)) {
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
