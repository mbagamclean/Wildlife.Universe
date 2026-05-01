'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Home, PawPrint, Leaf, Feather, Bug, FileText } from 'lucide-react';
import { navItems, categories, labelSlug } from '@/lib/mock/categories';
import { categoriesDb } from '@/lib/storage/categoriesDb';
import { ThemeToggle } from './ThemeToggle';
import { UserButton } from '@/components/auth/UserButton';

/* static fallback — keeps SSR and initial client render consistent */
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

/* ── per-category visual identity ── */
const CAT_META = {
  '':      { Icon: Home,     color: '#008000', glow: 'rgba(0,128,0,0.28)'     },
  home:    { Icon: Home,     color: '#008000', glow: 'rgba(0,128,0,0.28)'     },
  animals: { Icon: PawPrint, color: '#f97316', glow: 'rgba(249,115,22,0.28)'  },
  plants:  { Icon: Leaf,     color: '#22c55e', glow: 'rgba(34,197,94,0.28)'   },
  birds:   { Icon: Feather,  color: '#3b82f6', glow: 'rgba(59,130,246,0.28)'  },
  insects: { Icon: Bug,      color: '#eab308', glow: 'rgba(234,179,8,0.28)'   },
  posts:   { Icon: FileText, color: '#008000', glow: 'rgba(0,128,0,0.28)'     },
};

function getCatMeta(slug) {
  return CAT_META[slug] ?? { Icon: FileText, color: '#008000', glow: 'rgba(0,128,0,0.28)' };
}

/* ── label pill with category-colored hover ── */
function LabelPill({ href, color, children, onClose }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      href={href}
      onClick={onClose}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="block rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-150"
      style={{
        borderColor: hovered ? `${color}55` : 'var(--glass-border)',
        background:  hovered ? `${color}12` : 'var(--glass-border)',
        color:       hovered ? color        : 'var(--color-fg-soft)',
      }}
    >
      {children}
    </Link>
  );
}

/* ── morphing hamburger ── */
export function HamburgerButton({ isOpen, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
      className="relative flex h-10 w-10 flex-col items-center justify-center gap-[5px] rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur transition-colors hover:border-[#008000]/40 md:hidden"
    >
      <motion.span
        animate={isOpen ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        className="block h-[2px] w-5 rounded-full bg-[var(--color-fg)] origin-center"
      />
      <motion.span
        animate={isOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="block h-[2px] w-5 rounded-full bg-[var(--color-fg)]"
      />
      <motion.span
        animate={isOpen ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        className="block h-[2px] w-5 rounded-full bg-[var(--color-fg)] origin-center"
      />
    </button>
  );
}

/* ── stagger variants ── */
const overlayVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.28, ease: 'easeOut' } },
  exit:    { opacity: 0, transition: { duration: 0.22, ease: 'easeIn' } },
};

const listVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.16 } },
  exit:    { transition: { staggerChildren: 0.04, staggerDirection: -1 } },
};

const rowVariants = {
  hidden:  { opacity: 0, y: 32 },
  visible: {
    opacity: 1, y: 0,
    transition: { type: 'spring', stiffness: 280, damping: 26 },
  },
  exit: { opacity: 0, y: 14, transition: { duration: 0.14 } },
};

const pillVariants = {
  hidden:  { opacity: 0, scale: 0.82 },
  visible: (i) => ({
    opacity: 1, scale: 1,
    transition: { delay: i * 0.04, type: 'spring', stiffness: 380, damping: 26 },
  }),
};

/* ── main component ── */
export function MobileMenu({ isOpen, onClose }) {
  const [openCat, setOpenCat]       = useState(null);
  const [logoOk, setLogoOk]         = useState(true);
  const [enrichedNav, setEnrichedNav] = useState(STATIC_NAV);
  const pathname = usePathname();

  const isActive = (href) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');

  useEffect(() => {
    setEnrichedNav(buildEnrichedNav(categoriesDb.list()));
    const onUpdate = () => setEnrichedNav(buildEnrichedNav(categoriesDb.list()));
    window.addEventListener('wu:storage-changed', onUpdate);
    return () => window.removeEventListener('wu:storage-changed', onUpdate);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => { if (!isOpen) setOpenCat(null); }, [isOpen]);

  /* close on navigation */
  useEffect(() => { onClose(); }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const toggleCat = (href) =>
    setOpenCat((prev) => (prev === href ? null : href));

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="mobile-overlay"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-40 flex flex-col md:hidden"
          style={{ background: 'var(--color-bg)' }}
        >
          {/* subtle gradient tint — visible in dark, barely-there in light */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 80% 40% at 10% -5%, rgba(0,128,0,0.07) 0%, transparent 55%), ' +
                'radial-gradient(ellipse 60% 30% at 90% 100%, rgba(212,175,55,0.05) 0%, transparent 50%)',
            }}
          />

          {/* ── top bar ── */}
          <div className="relative flex items-center justify-between border-b border-[var(--glass-border)] px-5 py-4">
            <Link href="/" onClick={onClose} className="flex items-center gap-2.5">
              {logoOk ? (
                <Image
                  src="/logo.png" alt="Wildlife Universe" width={160} height={44}
                  className="h-9 w-auto"
                  onError={() => setLogoOk(false)}
                />
              ) : (
                <span className="font-display text-xl font-bold tracking-tight text-[#008000]">
                  Wildlife Universe
                </span>
              )}
            </Link>

            <motion.button
              onClick={onClose}
              aria-label="Close menu"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 22 }}
              className="flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-fg-soft)] transition-colors hover:border-[#008000]/40 hover:text-[var(--color-fg)]"
            >
              <span>Close</span>
              <span className="text-base leading-none">✕</span>
            </motion.button>
          </div>

          {/* ── category list ── */}
          <div className="relative flex-1 overflow-y-auto px-4 py-5">
            <motion.nav
              variants={listVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              aria-label="Mobile navigation"
            >
              {enrichedNav.map((item) => {
                const active     = isActive(item.href);
                const hasLabels  = item.labels.length > 0;
                const isExpanded = openCat === item.href;
                const meta       = getCatMeta(item.slug);
                const { Icon }   = meta;

                return (
                  <motion.div key={item.href} variants={rowVariants}>
                    {/* ── category row ── */}
                    <div
                      className="mb-1 flex items-center rounded-2xl transition-all duration-200"
                      style={{
                        background: active
                          ? `${meta.color}0f`
                          : undefined,
                      }}
                      onMouseEnter={(e) => {
                        if (!active) e.currentTarget.style.background = 'var(--glass-border)';
                      }}
                      onMouseLeave={(e) => {
                        if (!active) e.currentTarget.style.background = '';
                      }}
                    >
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className="flex flex-1 items-center gap-4 px-4 py-4"
                      >
                        {/* icon blob */}
                        <span
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-200"
                          style={{
                            background: active
                              ? `${meta.color}20`
                              : 'var(--glass-border)',
                            boxShadow: active
                              ? `0 0 0 1.5px ${meta.glow}`
                              : 'none',
                          }}
                        >
                          <Icon
                            className="h-5 w-5"
                            style={{ color: active ? meta.color : 'var(--color-fg-soft)' }}
                          />
                        </span>

                        <div className="min-w-0">
                          <p
                            className="text-lg font-semibold leading-tight tracking-tight"
                            style={{ color: active ? meta.color : 'var(--color-fg)' }}
                          >
                            {item.name}
                          </p>
                          {hasLabels && (
                            <p className="mt-0.5 text-xs text-[var(--color-fg-soft)]">
                              {item.labels.length} subcategories
                            </p>
                          )}
                        </div>

                        {active && (
                          <span
                            className="ml-auto h-2 w-2 shrink-0 rounded-full"
                            style={{
                              background:  meta.color,
                              boxShadow:   `0 0 7px ${meta.glow}`,
                            }}
                          />
                        )}
                      </Link>

                      {/* expand toggle */}
                      {hasLabels && (
                        <button
                          onClick={() => toggleCat(item.href)}
                          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${item.name}`}
                          className="mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200"
                          style={{
                            background: isExpanded ? `${meta.color}18` : 'transparent',
                            color:      isExpanded ? meta.color        : 'var(--color-fg-soft)',
                          }}
                        >
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </motion.div>
                        </button>
                      )}
                    </div>

                    {/* ── subcategory accordion ── */}
                    <AnimatePresence initial={false}>
                      {hasLabels && isExpanded && (
                        <motion.div
                          key={`sub-${item.href}`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="mb-3 ml-[72px] flex flex-wrap gap-2 pb-1 pr-2">
                            {/* "All" pill */}
                            <Link
                              href={item.href}
                              onClick={onClose}
                              className="rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors"
                              style={{
                                borderColor: `${meta.color}50`,
                                background:  `${meta.color}15`,
                                color:        meta.color,
                              }}
                            >
                              All {item.name}
                            </Link>

                            {item.labels.map((label, i) => (
                              <motion.div
                                key={label}
                                custom={i}
                                variants={pillVariants}
                                initial="hidden"
                                animate="visible"
                              >
                                <LabelPill
                                  href={`/${item.slug}/${labelSlug(label)}`}
                                  color={meta.color}
                                  onClose={onClose}
                                >
                                  {label}
                                </LabelPill>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="mx-3 h-px bg-[var(--glass-border)]" />
                  </motion.div>
                );
              })}
            </motion.nav>
          </div>

          {/* ── sticky footer ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.28 }}
            className="relative border-t border-[var(--glass-border)] px-5 py-4"
            style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-fg-soft)]">
                Wildlife Universe
              </span>
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <UserButton />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
