import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(request) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — must happen before any redirect logic
  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // Redirect unauthenticated users away from /admin/*
  if (pathname.startsWith('/admin') && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/staff-login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

// Only run middleware on routes that need authenticated session checks.
// Public routes (homepage, category pages, post detail, RSS, sitemaps)
// skip middleware so the edge cache can serve them with no Supabase
// auth round-trip — this is the primary cause of slow TTFB on cold
// requests and the "feels stuck loading" perception users reported.
export const config = {
  matcher: ['/admin/:path*'],
};
