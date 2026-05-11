'use client';

/**
 * Universal page-view tracker — mounts once at the root layout and
 * fires a /api/posts/view ping on every public route change. Sends
 * pathname, previous-page referrer, and a stable per-tab session id.
 *
 * Skips:
 *   - /admin/*, /auth/*, /api/*, /staff-login, /set-password, /login,
 *     /signup, /profile  (no point counting your own editors)
 *   - The first paint when the previous referrer is internal — we let
 *     the natural router-event do the work for SPA navigations.
 *
 * Uses navigator.sendBeacon when available so the request survives
 * the user clicking a link before the response lands.
 */

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const SKIP_PREFIXES = [
  '/admin',
  '/api',
  '/auth',
  '/staff-login',
  '/set-password',
  '/login',
  '/signup',
  '/profile',
  '/_next',
];

function shouldSkip(pathname) {
  if (!pathname) return true;
  return SKIP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p));
}

function getOrCreateSessionId() {
  if (typeof window === 'undefined') return null;
  try {
    let id = sessionStorage.getItem('wu_session_id');
    if (!id) {
      id = (crypto?.randomUUID?.() || `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`);
      sessionStorage.setItem('wu_session_id', id);
    }
    return id;
  } catch {
    return null;
  }
}

function sendBeacon(payload) {
  const url = '/api/posts/view';
  const body = JSON.stringify(payload);
  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon(url, blob)) return;
    }
  } catch {}
  // Fallback — fetch with keepalive so the request survives navigation
  try {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

export function PageviewTracker() {
  const pathname = usePathname();
  const lastSentRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!pathname) return;
    if (shouldSkip(pathname)) return;
    if (lastSentRef.current === pathname) return;

    // Capture the previous pathname (if any) as the in-app referrer.
    // For the first hit document.referrer is the external referrer.
    const internalReferrer = lastSentRef.current
      ? `${window.location.origin}${lastSentRef.current}`
      : (document.referrer || null);

    lastSentRef.current = pathname;

    // Match the existing /posts/<slug> tracker contract when on a post
    // page so post-level counters keep working — the API resolves
    // post_id from slug server-side.
    const isPostDetail = /^\/posts\/[^/]+$/.test(pathname);
    const slug = isPostDetail ? pathname.split('/')[2] : null;

    sendBeacon({
      pathname,
      slug,
      referrer: internalReferrer,
      sessionId: getOrCreateSessionId(),
    });
  }, [pathname]);

  return null;
}
