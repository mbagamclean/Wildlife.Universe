import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const STAFF_ROLES = new Set(['ceo', 'editor', 'writer', 'moderator', 'admin']);

function noStore(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return noStore({ success: false, error: 'Unauthorized' }, 401);

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || !STAFF_ROLES.has(profile.role)) {
    return noStore({ success: false, error: 'Forbidden' }, 403);
  }

  const events = [];

  // Recent posts (created)
  const { data: posts } = await supabase
    .from('posts')
    .select('id, slug, title, status, category, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  for (const p of posts || []) {
    events.push({
      id: `post:${p.id}`,
      type: 'post',
      title: p.title || '(untitled)',
      secondary: `${p.status === 'draft' ? 'Draft created' : 'Post published'}${p.category ? ` in ${p.category}` : ''}`,
      href: p.slug ? `/posts/${p.slug}` : null,
      timestamp: p.created_at,
    });
  }

  // Recent comments (only if table exists / accessible)
  try {
    const { data: comments, error: commentsErr } = await supabase
      .from('comments')
      .select('id, post_slug, author, body, flagged, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!commentsErr && comments) {
      for (const c of comments) {
        const snippet = (c.body || '').slice(0, 80);
        events.push({
          id: `comment:${c.id}`,
          type: 'comment',
          title: `${c.author || 'Anonymous'} commented`,
          secondary: snippet + (c.body && c.body.length > 80 ? '…' : ''),
          href: c.post_slug ? `/posts/${c.post_slug}` : null,
          flagged: c.flagged === true,
          timestamp: c.created_at,
        });
      }
    }
  } catch {
    // Comments table missing or inaccessible — skip cleanly
  }

  // Recent media uploads via storage objects
  try {
    const { data: mediaList, error: mediaErr } = await supabase
      .storage
      .from('media')
      .list('', { limit: 50, sortBy: { column: 'created_at', order: 'desc' } });

    if (!mediaErr && Array.isArray(mediaList)) {
      for (const m of mediaList) {
        if (!m || !m.name) continue;
        events.push({
          id: `media:${m.id || m.name}`,
          type: 'media',
          title: m.name,
          secondary: m.metadata?.mimetype
            ? `Uploaded · ${m.metadata.mimetype}`
            : 'Media uploaded',
          href: null,
          timestamp: m.created_at || m.updated_at || null,
        });
      }
    }
  } catch {
    // Media bucket missing — skip cleanly
  }

  // Sort all events newest-first, cap at 50
  const sorted = events
    .filter((e) => e.timestamp)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 50);

  return noStore({
    success: true,
    data: {
      events: sorted,
      counts: {
        total: sorted.length,
        posts: sorted.filter((e) => e.type === 'post').length,
        comments: sorted.filter((e) => e.type === 'comment').length,
        media: sorted.filter((e) => e.type === 'media').length,
      },
    },
  });
}
