/**
 * /api/admin/categories/[slug] — single-category fetch + update.
 *
 * GET returns the row in the camelCase shape the admin editor consumes;
 * if the row hasn't been written to the DB yet (e.g. before migration
 * 014 and the editor's first save), it falls back to the static mock
 * so the form can hydrate with the current name + labels.
 *
 * PUT updates any subset of editable fields. Non-editable columns
 * (slug, created_at, updated_at) are stripped server-side. Uses the
 * service-role key so RLS can't block staff writes — the staff-role
 * gate on this route is the source of truth for who can edit.
 */

import { NextResponse } from 'next/server';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { categories as STATIC } from '@/lib/mock/categories';

export const runtime = 'nodejs';

const STAFF_ROLES = new Set(['ceo', 'editor', 'writer', 'moderator', 'admin']);

const EDITABLE_FIELDS = {
  name: 'name',
  labels: 'labels',
  shortDescription: 'short_description',
  description: 'description',
  thumbnailUrl: 'thumbnail_url',
  heroImageUrl: 'hero_image_url',
  heroImageMobileUrl: 'hero_image_mobile_url',
  imageAlt: 'image_alt',
  imageCaption: 'image_caption',
  seoTitle: 'seo_title',
  seoDescription: 'seo_description',
  seoKeywords: 'seo_keywords',
  canonicalUrl: 'canonical_url',
  ogTitle: 'og_title',
  ogDescription: 'og_description',
  twitterTitle: 'twitter_title',
  twitterDescription: 'twitter_description',
  featured: 'featured',
  trending: 'trending',
  position: 'position',
};

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function mapRow(row) {
  if (!row) return null;
  return {
    slug: row.slug,
    name: row.name,
    labels: row.labels || [],
    shortDescription: row.short_description ?? '',
    description: row.description ?? '',
    thumbnailUrl: row.thumbnail_url ?? '',
    heroImageUrl: row.hero_image_url ?? '',
    heroImageMobileUrl: row.hero_image_mobile_url ?? '',
    imageAlt: row.image_alt ?? '',
    imageCaption: row.image_caption ?? '',
    seoTitle: row.seo_title ?? '',
    seoDescription: row.seo_description ?? '',
    seoKeywords: row.seo_keywords ?? '',
    canonicalUrl: row.canonical_url ?? '',
    ogTitle: row.og_title ?? '',
    ogDescription: row.og_description ?? '',
    twitterTitle: row.twitter_title ?? '',
    twitterDescription: row.twitter_description ?? '',
    featured: !!row.featured,
    trending: !!row.trending,
    position: row.position ?? 0,
    updatedAt: row.updated_at ?? null,
  };
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

export async function GET(_req, { params }) {
  const { slug } = await params;
  const auth = await checkStaff();
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  const sb = adminClient();
  const { data, error } = await sb.from('categories').select('*').eq('slug', slug).maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    const fallback = STATIC.find((c) => c.slug === slug);
    if (!fallback) return NextResponse.json({ error: 'not-found' }, { status: 404 });
    return NextResponse.json({
      slug: fallback.slug,
      name: fallback.name,
      labels: [...fallback.labels],
      shortDescription: '',
      description: '',
      thumbnailUrl: '',
      heroImageUrl: '',
      heroImageMobileUrl: '',
      imageAlt: '',
      imageCaption: '',
      seoTitle: '',
      seoDescription: '',
      seoKeywords: '',
      canonicalUrl: '',
      ogTitle: '',
      ogDescription: '',
      twitterTitle: '',
      twitterDescription: '',
      featured: false,
      trending: false,
      position: 0,
      updatedAt: null,
    });
  }
  return NextResponse.json(mapRow(data));
}

export async function PUT(req, { params }) {
  const { slug } = await params;
  const auth = await checkStaff();
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  const patch = await req.json().catch(() => null);
  if (!patch || typeof patch !== 'object') {
    return NextResponse.json({ error: 'invalid-body' }, { status: 400 });
  }

  // Whitelist + camel→snake projection
  const row = {};
  for (const [k, dbCol] of Object.entries(EDITABLE_FIELDS)) {
    if (k in patch) row[dbCol] = patch[k];
  }
  if (Object.keys(row).length === 0) {
    return NextResponse.json({ error: 'no-editable-fields' }, { status: 400 });
  }

  const sb = adminClient();

  // Upsert pattern — admin may be saving a category that's still
  // hardcoded in the static mock (no DB row yet). If update touches 0
  // rows, fall back to insert with the slug + the static name + labels.
  const { data: updated, error: updErr } = await sb
    .from('categories')
    .update(row)
    .eq('slug', slug)
    .select()
    .maybeSingle();

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  if (updated) {
    return NextResponse.json(mapRow(updated));
  }

  // No row existed — create one. Pull defaults from the static mock so
  // the labels stay intact even if the editor only touched SEO fields.
  const fallback = STATIC.find((c) => c.slug === slug);
  if (!fallback) return NextResponse.json({ error: 'unknown-slug' }, { status: 404 });

  const insertRow = {
    slug,
    name: row.name ?? fallback.name,
    labels: row.labels ?? [...fallback.labels],
    ...row,
  };
  const { data: inserted, error: insErr } = await sb
    .from('categories')
    .insert(insertRow)
    .select()
    .single();
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  return NextResponse.json(mapRow(inserted));
}
