'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/nav/Navbar';
import { Footer } from '@/components/footer/Footer';

// Routes that render full-screen without site Navbar/Footer
const CHROMELESS = ['/staff-login', '/admin'];

export function SiteChrome({ children }) {
  const pathname = usePathname();
  const bare = CHROMELESS.some((p) => pathname === p || pathname.startsWith(p + '/'));

  if (bare) {
    return <>{children}</>;
  }

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-[var(--color-primary)] focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
