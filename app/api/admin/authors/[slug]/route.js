/**
 * /api/admin/authors/[slug] — fetch + update author overrides.
 *
 * GET returns the merged author (static defaults + any saved override)
 * so the admin form can hydrate with the current live values.
 *
 * PATCH upserts an override row in the author_overrides table. Only
 * the editable fields are accepted; slug is read-only (it's the FK
 * to the static roster). Empty-string values are normalised to NULL
 * so the row falls back to the static default for that field.
 *
 * Auth: staff-role only (matches the categories / labels admin pattern).
 * Uses the service-role Supabase key for writes so RLS can't block.
 */

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthorBySlug } from '@/lib/seo/authors';

export const runtime = 'nodejs';

const STAFF_ROLES = new Set(['ceo', 'editor', 'writer', 'moderator', 'admin']);

const EDITABLE = new Set([
  'name',
  'title',
  'bio',
  'photo_url',
  'expertise',
  'affiliation',
  'email',
  'twitter',
  'website',
]);

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

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

function snakeify(payload) {
  const map = {
    photoUrl: 'photo_url',
  };
  const out = {};
  for (const [k, v] of Object.entries(payload || {})) {
    const key = map[k] || k;
    if (!EDITABLE.has(key)) continue;
    // Empty strings → NULL so the field falls back to the static default.
    out[key] = v === '' ? null : v;
  }
  return out;
}

export async function GET(_req, { params }) {
  const { slug } = await params;
  const auth = await checkStaff();
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  const base = getAuthorBySlug(slug);
  if (!base || base.slug !== slug) {
    return NextResponse.json({ error: 'not-found' }, { status: 404 });
  }

  // Try to fetch the override row; tolerate the table not existing.
  let override = null;
  try {
    const { data } = await adminClient()
      .from('author_overrides')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    override = data || null;
  } catch {
    // Table missing — admin form hydrates from static defaults only.
  }

  return NextResponse.json({
    slug: base.slug,
    name: override?.name ?? base.name,
    title: override?.title ?? base.title,
    bio: override?.bio ?? base.bio,
    photoUrl: override?.photo_url ?? base.photoUrl,
    expertise: override?.expertise ?? base.expertise,
    affiliation: override?.affiliation ?? base.affiliation,
    email: override?.email ?? '',
    twitter: override?.twitter ?? base.twitter ?? '',
    website: override?.website ?? base.website ?? '',
    isOverridden: !!override,
    expertiseCategories: base.expertiseCategories || [],
    updatedAt: override?.updated_at ?? null,
  });
}

export async function PATCH(req, { params }) {
  const { slug } = await params;
  const auth = await checkStaff();
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  const base = getAuthorBySlug(slug);
  if (!base || base.slug !== slug) {
    return NextResponse.json({ error: 'not-found' }, { status: 404 });
  }

  const payload = await req.json();
  const row = snakeify(payload);
  row.slug = slug;
  row.updated_at = new Date().toISOString();

  const sb = adminClient();
  const { error } = await sb
    .from('author_overrides')
    .upsert(row, { onConflict: 'slug' });

  if (error) {
    // If the table doesn't exist yet, tell the admin in plain language.
    if (/relation .* does not exist|schema cache/i.test(error.message)) {
      return NextResponse.json({
        error: 'author_overrides table missing — run supabase/migrations/021_author_overrides.sql in the Supabase SQL Editor, then retry.',
      }, { status: 500 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Revalidate every surface that renders author data so the edit shows
  // up on the next request without waiting for ISR. Bylines on cards,
  // post pages, the author profile page, the author index, and any
  // JSON-LD endpoint that references the persona.
  try {
    revalidatePath('/', 'layout');
    revalidatePath('/author');
    revalidatePath(`/author/${slug}`);
  } catch {}

  return NextResponse.json({ ok: true });
}
