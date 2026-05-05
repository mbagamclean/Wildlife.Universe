/**
 * POST /api/seo/ping-bulk — re-submit every published URL to search engines.
 *
 * Use after a major content migration or to re-prime IndexNow. Staff-only.
 * Sends posts + categories + static pages in one IndexNow batch.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifySearchEngines } from '@/lib/seo/searchPing';
import { fetchPublishedPosts } from '@/lib/seo-data';
import { categories, labelSlug } from '@/lib/mock/categories';
import { indexableStaticPages } from '@/lib/seo/static-pages';
import { SITE_URL } from '@/lib/seo';

export const runtime = 'nodejs';

const STAFF_ROLES = new Set(['ceo', 'editor', 'writer', 'moderator', 'admin']);

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || !STAFF_ROLES.has(profile.role)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const urls = new Set();

  // Static + legal pages
  for (const p of indexableStaticPages()) urls.add(`${SITE_URL}${p.path}`);

  // Categories + labels
  for (const cat of categories) {
    urls.add(`${SITE_URL}/${cat.slug}`);
    for (const label of cat.labels) {
      urls.add(`${SITE_URL}/${cat.slug}/${labelSlug(label)}`);
    }
  }

  // Posts
  const posts = await fetchPublishedPosts();
  for (const post of posts) {
    if (post?.slug) urls.add(`${SITE_URL}/posts/${post.slug}`);
  }

  const list = [...urls];

  // IndexNow accepts up to 10,000 URLs per request — but split into
  // chunks of 1,000 to stay well within typical per-engine limits.
  const chunks = [];
  for (let i = 0; i < list.length; i += 1000) {
    chunks.push(list.slice(i, i + 1000));
  }

  const allResults = [];
  for (const chunk of chunks) {
    const r = await notifySearchEngines(chunk, {
      eventType: 'bulk_ping',
      supabase,
    });
    allResults.push(...r.results);
  }

  return NextResponse.json({
    success: true,
    submitted: list.length,
    chunks: chunks.length,
    results: allResults,
  });
}
