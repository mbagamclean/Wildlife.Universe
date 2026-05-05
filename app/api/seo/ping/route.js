/**
 * POST /api/seo/ping — submit one or more URLs to search engines.
 *
 * Body: { url: string | string[], slug?: string, eventType?: string }
 *
 * Auth: any authenticated user (the post-save / media-upload code runs
 * under the editor's session). For unauthenticated calls (e.g. from a
 * cron) the INTERNAL_PING_SECRET header may be used instead.
 *
 * The request returns immediately with the queued URL list and the
 * per-engine ping result for each engine. Failures DO NOT throw —
 * search-engine flakiness must never block a content save.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifySearchEngines } from '@/lib/seo/searchPing';

export const runtime = 'nodejs';

const INTERNAL_SECRET = process.env.INTERNAL_PING_SECRET || '';

export async function POST(req) {
  // Either a logged-in session OR a server-to-server secret header.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const headerSecret = req.headers.get('x-internal-ping-secret') || '';
  const authedByUser = !!user;
  const authedBySecret = INTERNAL_SECRET && headerSecret === INTERNAL_SECRET;
  if (!authedByUser && !authedBySecret) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const { url, slug, eventType = 'publish_ping' } = body || {};
  if (!url) {
    return NextResponse.json({ success: false, error: 'url required' }, { status: 400 });
  }

  const result = await notifySearchEngines(url, {
    slug,
    eventType,
    supabase,
  });

  return NextResponse.json({ success: true, ...result });
}
