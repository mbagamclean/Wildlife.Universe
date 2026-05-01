import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <section className="px-4 pb-20 pt-12 sm:pt-16">
      <Suspense
        fallback={
          <div className="glass mx-auto w-full max-w-md rounded-3xl p-8 text-center text-sm text-[var(--color-fg-soft)]">
            Loading…
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </section>
  );
}
