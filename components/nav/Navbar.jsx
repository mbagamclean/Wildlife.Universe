'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { navItems, categories, labelSlug } from '@/lib/mock/categories';
import { categoriesDb } from '@/lib/storage/categoriesDb';
import { ThemeToggle } from './ThemeToggle';
import { SearchToggle } from './SearchToggle';
import { UserButton } from '@/components/auth/UserButton';
import { HamburgerButton, MobileMenu } from './MobileMenu';

/* static fallback — used for SSR and initial client render */
const STATIC_NAV = navItems.map((item) => {
  const slug = item.href.replace('/', '');
  const cat  = categories.find((c) => c.slug === slug);
  return { ...item, labels: cat?.labels || [], slug };
});

function buildEnrichedNav(cats) {
  return [
    { name: 'Home', href: '/', labels: [], slug: '' },
    ...cats.map((c) => ({ name: c.name, href: `/${c.slug}`, labels: c.labels || [], slug: c.slug })),
  ];
}

export function Navbar() {
  const [scrolled, setScrolled]         = useState(false);
  const [mobileOpen, setMobileOpen]     = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [logoOk, setLogoOk]             = useState(true);
  const [enrichedNav, setEnrichedNav]   = useState(STATIC_NAV);
  const pathname  = usePathname();
  const closeTimer = useRef(null);

  useEffect(() => {
    const refresh = () => categoriesDb.list().then((cats) => setEnrichedNav(buildEnrichedNav(cats)));
    refresh();
    window.addEventListener('wu:storage-changed', refresh);
    return () => window.removeEventListener('wu:storage-changed', refresh);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const isActive = (href) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');

  const openMenu = (href) => {
    clearTimeout(closeTimer.current);
    setOpenDropdown(href);
  };
  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setOpenDropdown(null), 120);
  };

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'glass border-b border-[var(--glass-border)] py-2 shadow-lg shadow-black/5'
            : 'bg-[var(--color-bg)] border-b border-[var(--glass-border)]/40 py-3'
        }`}
      >
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="Wildlife Universe home" className="flex items-center gap-2">
            {logoOk ? (
              <Image
                src="/logo.png" alt="Wildlife Universe" width={180} height={48} priority
                className="h-10 w-auto sm:h-11"
                onError={() => setLogoOk(false)}
              />
            ) : (
              <span className="font-display text-xl font-bold tracking-tight text-[var(--color-primary)] sm:text-2xl">
                Wildlife Universe
              </span>
            )}
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Primary" className="hidden items-center gap-0.5 md:flex">
            {enrichedNav.map((item) => {
              const active     = isActive(item.href);
              const hasLabels  = item.labels.length > 0;
              const isOpen     = openDropdown === item.href;

              return (
                <div
                  key={item.href}
                  className="relative"
                  onMouseEnter={() => hasLabels && openMenu(item.href)}
                  onMouseLeave={() => hasLabels && scheduleClose()}
                >
                  <Link
                    href={item.href}
                    className={`relative flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      active
                        ? 'text-[var(--color-primary)]'
                        : 'text-[var(--color-fg)] hover:text-[var(--color-primary)]'
                    }`}
                  >
                    {item.name}
                    {hasLabels && (
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    )}
                    {active && (
                      <motion.span
                        layoutId="nav-underline"
                        className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-[var(--color-primary)]"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </Link>

                  {/* Dropdown */}
                  <AnimatePresence>
                    {hasLabels && isOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                        onMouseEnter={() => clearTimeout(closeTimer.current)}
                        onMouseLeave={scheduleClose}
                        className="glass absolute left-0 top-full mt-2 min-w-[180px] rounded-2xl border border-[var(--glass-border)] p-2 shadow-xl shadow-black/10"
                      >
                        <Link
                          href={item.href}
                          className="block rounded-xl px-3 py-2 text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors"
                        >
                          All {item.name}
                        </Link>
                        <div className="my-1.5 border-t border-[var(--glass-border)]" />
                        {item.labels.map((label) => (
                          <Link
                            key={label}
                            href={`/${item.slug}/${labelSlug(label)}`}
                            className="block rounded-xl px-3 py-2 text-sm text-[var(--color-fg)] hover:bg-[var(--color-primary)]/8 hover:text-[var(--color-primary)] transition-colors"
                          >
                            {label}
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <SearchToggle />
            <ThemeToggle />
            <UserButton />
            <HamburgerButton isOpen={mobileOpen} onClick={() => setMobileOpen((o) => !o)} />
          </div>
        </div>
      </header>

      <MobileMenu
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div aria-hidden className="h-16" />
    </>
  );
}
