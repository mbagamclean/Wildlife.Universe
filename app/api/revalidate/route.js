/**
 * On-demand cache invalidation endpoint.
 *
 * The cron worker (and ad-hoc scripts that publish posts) POST here
 * after a successful publish. Calling `revalidatePath('/', 'layout')`
 * purges every route that uses the root layout — that's effectively the
 * whole site. On Vercel this also purges the edge CDN cache for those
 * paths, not just the ISR data cache, which is the bit that was making
 * "refresh several times to see the new post" the standard experience.
 *
 * Auth: Bearer token in the Authorization header, must match the
 * REVALIDATE_SECRET env var (set in both .env.local for local cron and
 * in the Vercel project env for the deployed endpoint to verify it).
 *
 * Usage:
 *   curl -X POST https://www.wildlifeuniverse.org/api/revalidate \
 *     -H "Authorization: Bearer <REVALIDATE_SECRET>"
 *
 *   # Optional: revalidate a single path instead of everything
 *   curl -X POST 'https://www.wildlifeuniverse.org/api/revalidate?path=/posts' \
 *     -H "Authorization: Bearer <REVALIDATE_SECRET>"
 */

import { revalidatePath, revalidateTag } from 'next/cache';

export const runtime = 'nodejs';
// Force-dynamic so this handler is never itself cached / pre-rendered.
export const dynamic = 'force-dynamic';

function unauthorized(msg) {
  return Response.json({ ok: false, error: msg }, { status: 401 });
}

function badRequest(msg) {
  return Response.json({ ok: false, error: msg }, { status: 400 });
}

async function handle(req) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return Response.json(
      { ok: false, error: 'REVALIDATE_SECRET not configured on the server' },
      { status: 500 },
    );
  }

  // Bearer token OR ?secret= query param. Header is preferred (doesn't leak to logs).
  const auth = req.headers.get('authorization') || '';
  const url = new URL(req.url);
  const querySecret = url.searchParams.get('secret');
  const headerSecret = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const provided = headerSecret || querySecret || '';

  if (!provided) return unauthorized('missing Authorization Bearer token');
  if (provided !== secret) return unauthorized('invalid token');

  const path = url.searchParams.get('path');
  const tag = url.searchParams.get('tag');

  const purged = [];
  try {
    if (path) {
      revalidatePath(path);
      purged.push(`path:${path}`);
    } else if (tag) {
      revalidateTag(tag);
      purged.push(`tag:${tag}`);
    } else {
      // Default: full-site layout-level revalidation. Cheapest call, broadest reach.
      revalidatePath('/', 'layout');
      purged.push("path:/?layout");
    }
    return Response.json({ ok: true, purged, at: new Date().toISOString() });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) { return handle(req); }
// GET is convenient for manual browser-based testing with ?secret=... — same auth, same behavior.
export async function GET(req)  { return handle(req); }
