/**
 * /api/admin/authors — list every persona with its current (merged)
 * data so the admin index page can render the editing dashboard.
 *
 * Auth: staff-role only.
 */

import { NextResponse } from 'next/server';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { allAuthors } from '@/lib/seo/authors';

export const runtime = 'nodejs';

const STAFF_ROLES = new Set(['ceo', 'editor', 'writer', 'moderator', 'admin']);

async function checkStaff() {
  const ssr = await createSSRClient();
  const { data: { user } } = await ssr.auth.getUser();
  if (!user) return { ok: false, status: 401, body: { error: 'Unauthorized' } };
  const { data: profile } = await ssr.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !STAFF_ROLES.has(profile.role)) {
    return { ok: false, status: 403, body: { error: 'Forbidden' } };
  }
  return { ok: true };
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function GET() {
  const auth = await checkStaff();
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  const base = allAuthors();
  let overrides = [];
  try {
    const { data } = await adminClient().from('author_overrides').select('*');
    overrides = data || [];
  } catch {
    // Table missing — list-only mode from static defaults.
  }
  const overridesBySlug = new Map(overrides.map((o) => [o.slug, o]));

  const out = base.map((a) => {
    const o = overridesBySlug.get(a.slug);
    return {
      slug: a.slug,
      name: o?.name ?? a.name,
      title: o?.title ?? a.title,
      bio: o?.bio ?? a.bio,
      photoUrl: o?.photo_url ?? a.photoUrl,
      expertise: o?.expertise ?? a.expertise,
      affiliation: o?.affiliation ?? a.affiliation,
      isOverridden: !!o,
      updatedAt: o?.updated_at ?? null,
    };
  });

  return NextResponse.json({ authors: out });
}
