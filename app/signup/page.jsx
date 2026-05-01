import { Suspense } from 'react';
import { SignupForm } from '@/components/auth/SignupForm';

export const metadata = { title: 'Sign up' };

export default function SignupPage() {
  return (
    <section className="px-4 pb-20 pt-12 sm:pt-16">
      <Suspense fallback={<div className="py-12 text-center text-sm text-[var(--color-fg-soft)]">Loading…</div>}>
        <SignupForm />
      </Suspense>
    </section>
  );
}
