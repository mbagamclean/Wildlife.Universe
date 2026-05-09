/**
 * /api/admin/labels/[category]/[slug] — single-label fetch + update.
 * Mirrors /api/admin/categories/[slug] semantics, scoped by
 * (category_slug, slug). Service-role write, staff-role gate.
 */

import { NextResponse } from 'next/server';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { categories as STATIC, labelSlug } from '@/lib/mock/categories';

export const runtime = 'nodejs';

const STAFF_ROLES = new Set(['ceo', 'editor', 'writer', 'moderator', 'admin']);

const EDITABLE_FIELDS = {
  name: 'name',
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
    id: row.id,
    categorySlug: row.category_slug,
    slug: row.slug,
    name: row.name,
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

function staticFallback(categorySlug, slug) {
  const cat = STATIC.find((c) => c.slug === categorySlug);
  if (!cat) return null;
  const labelName = cat.labels.find((l) => labelSlug(l) === slug);
  if (!labelName) return null;
  return {
    id: `lbl_${categorySlug}_${slug}`,
    categorySlug,
    slug,
    name: labelName,
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
    position: 0,
    updatedAt: null,
  };
}

export async function GET(_req, { params }) {
  const { category, slug } = await params;
  const auth = await checkStaff();
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  const sb = adminClient();
  const { data, error } = await sb
    .from('category_labels')
    .select('*')
    .eq('category_slug', category)
    .eq('slug', slug)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!data) {
    const fallback = staticFallback(category, slug);
    if (!fallback) return NextResponse.json({ error: 'not-found' }, { status: 404 });
    return NextResponse.json(fallback);
  }
  return NextResponse.json(mapRow(data));
}

export async function PUT(req, { params }) {
  const { category, slug } = await params;
  const auth = await checkStaff();
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  const patch = await req.json().catch(() => null);
  if (!patch || typeof patch !== 'object') {
    return NextResponse.json({ error: 'invalid-body' }, { status: 400 });
  }

  const row = {};
  for (const [k, dbCol] of Object.entries(EDITABLE_FIELDS)) {
    if (k in patch) row[dbCol] = patch[k];
  }
  if (Object.keys(row).length === 0) {
    return NextResponse.json({ error: 'no-editable-fields' }, { status: 400 });
  }

  const sb = adminClient();

  const { data: updated, error: updErr } = await sb
    .from('category_labels')
    .update(row)
    .eq('category_slug', category)
    .eq('slug', slug)
    .select()
    .maybeSingle();
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  if (updated) return NextResponse.json(mapRow(updated));

  // Row didn't exist yet (label was added via the legacy array UI
  // after backfill). Insert it now using the static mock for the name
  // fallback and whatever the editor sent.
  const fallback = staticFallback(category, slug);
  if (!fallback) return NextResponse.json({ error: 'unknown-label' }, { status: 404 });

  const insertRow = {
    id: `lbl_${category}_${slug}`,
    category_slug: category,
    slug,
    name: row.name ?? fallback.name,
    ...row,
  };
  const { data: inserted, error: insErr } = await sb
    .from('category_labels')
    .insert(insertRow)
    .select()
    .single();
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  return NextResponse.json(mapRow(inserted));
}
