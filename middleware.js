import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

/** Legacy `/posts/<slug>` and bare `/<category>/<slug>` URLs that
 *  belong to a labeled post need a 308 redirect to the canonical
 *  `/<category>/<label>/<slug>`. Doing it here in middleware emits a
 *  proper HTTP-level redirect (instead of the meta-refresh that
 *  page-component redirect() produces once layout streaming starts).
 *
 *  We query Supabase via the anon key — RLS keeps it published-only
 *  even with the public key, and the query is small (slug-indexed).
 */
const CATEGORY_SLUGS = new Set(['animals', 'plants', 'birds', 'insects', 'posts']);
// Per-category known label slugs — when the second URL segment matches
// one of these, the request is a label-landing page, NOT a legacy post
// URL. Skip the Supabase query and let the route render.
const LABELS_BY_CATEGORY = {
  animals: new Set(['mammals', 'reptiles', 'amphibians', 'fish', 'iucn-redlist']),
  birds: new Set(['basal', 'waterfowl', 'coastal', 'raptors', 'land', 'song']),
  insects: new Set(['porifera', 'cnidaria', 'platyhelminthes', 'nematoda', 'annelida', 'mollusca', 'arthropoda', 'echinodermata']),
  plants: new Set(['trees', 'shrubs', 'herbs', 'vines']),
  posts: new Set(['how-questions', 'why-questions', 'tourism', 'conservation', 'articles']),
};

function slugifyLabel(label) {
  if (!label) return null;
  return String(label).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || null;
}

function canonicalPostUrl(post) {
  if (!post?.slug) return null;
  const cat = (post.category || 'posts').toLowerCase();
  const lbl = slugifyLabel(post.label);
  if (lbl) return `/${cat}/${lbl}/${post.slug}`;
  return `/${cat}/${post.slug}`;
}

async function fetchPostBySlug(supabase, slug) {
  const { data } = await supabase
    .from('posts')
    .select('slug, category, label, status')
    .eq('slug', slug)
    .neq('status', 'draft')
    .maybeSingle();
  return data || null;
}

async function fetchPostByCategoryAndSlug(supabase, category, slug) {
  const { data } = await supabase
    .from('posts')
    .select('slug, category, label, status')
    .eq('category', category)
    .eq('slug', slug)
    .neq('status', 'draft')
    .maybeSingle();
  return data || null;
}

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

  const { pathname } = request.nextUrl;

  // Admin auth gate — refresh session then redirect unauthed.
  if (pathname.startsWith('/admin')) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/staff-login';
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Legacy 2-segment URL handling.
  // - /posts/<slug>: could be a 'posts' label landing (skip) OR a post
  //   that now canonically lives at /<category>/<label>/<slug> (308).
  // - /<category>/<slug>: could be a real label landing (skip) OR a
  //   labeled post that should redirect to 3-segment canonical (308).
  const segs = pathname.slice(1).split('/').filter(Boolean);
  if (segs.length === 2 && CATEGORY_SLUGS.has(segs[0])) {
    const [category, slug] = segs;
    // Short-circuit on known label slugs to avoid an unnecessary DB hit.
    const knownLabels = LABELS_BY_CATEGORY[category];
    if (knownLabels && knownLabels.has(slug)) {
      return supabaseResponse;
    }
    // Try post lookup. For /posts/<slug> the post may be in any
    // category (legacy global URL); for /<other-category>/<slug> the
    // category filter ensures we only redirect within the right space.
    const post = category === 'posts'
      ? await fetchPostBySlug(supabase, slug)
      : await fetchPostByCategoryAndSlug(supabase, category, slug);
    if (post) {
      const canonical = canonicalPostUrl(post);
      if (canonical && canonical !== pathname) {
        const url = request.nextUrl.clone();
        url.pathname = canonical;
        return NextResponse.redirect(url, 308);
      }
    }
  }

  return supabaseResponse;
}

// Match admin auth + legacy URL patterns we need to rewrite. Static
// assets, API routes, and the new canonical 3-segment URLs are NOT
// matched so middleware doesn't add latency to those hot paths.
export const config = {
  matcher: [
    '/admin/:path*',
    // /posts/<slug> (2-segment) — legacy post URL or label landing
    '/posts/:slug([^/]+)',
    // /<category>/<slug> (2-segment under a real category) — legacy
    // labeled-post URL that needs 308 to 3-segment canonical
    '/animals/:slug([^/]+)',
    '/plants/:slug([^/]+)',
    '/birds/:slug([^/]+)',
    '/insects/:slug([^/]+)',
  ],
};
