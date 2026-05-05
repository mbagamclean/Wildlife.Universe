/**
 * GET /auth/callback
 *
 * Final step of the public Supabase OAuth flow (Google sign-in).
 *
 * The flow:
 *   /login → user clicks "Continue with Google"
 *     ↓ supabase.auth.signInWithOAuth(...) full-page redirect
 *   accounts.google.com (consent)
 *     ↓
 *   <supabase-project>.supabase.co/auth/v1/callback (Supabase exchanges with Google)
 *     ↓
 *   www.wildlifeuniverse.org/auth/callback?code=…&next=…  (this route)
 *     ↓ exchangeCodeForSession
 *   <next>  (default /profile)
 *
 * IMPORTANT: this route must be placed under app/auth/callback/route.js so
 * it isn't shadowed by the API auth flow used for Google Indexing
 * (app/api/auth/google-indexing/*).
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function safeNext(rawNext, origin) {
  if (typeof rawNext !== 'string' || !rawNext) return `${origin}/profile`;
  // Only allow same-origin paths to prevent open-redirect.
  if (rawNext.startsWith('/') && !rawNext.startsWith('//')) {
    return `${origin}${rawNext}`;
  }
  try {
    const u = new URL(rawNext);
    if (u.origin === origin) return u.toString();
  } catch {
    // fall through
  }
  return `${origin}/profile`;
}

export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const oauthError = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');
  const next = url.searchParams.get('next') || '/profile';
  const origin = url.origin;

  if (oauthError) {
    const target = new URL(`${origin}/login`);
    target.searchParams.set('error', errorDescription || oauthError);
    return NextResponse.redirect(target);
  }

  if (!code) {
    const target = new URL(`${origin}/login`);
    target.searchParams.set('error', 'Missing authorization code.');
    return NextResponse.redirect(target);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const target = new URL(`${origin}/login`);
    target.searchParams.set('error', error.message || 'OAuth sign-in failed.');
    return NextResponse.redirect(target);
  }

  return NextResponse.redirect(safeNext(next, origin));
}
