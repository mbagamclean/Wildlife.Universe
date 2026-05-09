import { createClient } from '@/lib/supabase/client';
import { categories as STATIC } from '@/lib/mock/categories';

function notify() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('wu:storage-changed'));
  }
}

// snake_case row → camelCase shape consumed by the admin editor + public
// pages. Anything not yet present in the DB after migration 014 is
// returned as undefined and the form treats it as empty.
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

function patchToRow(patch) {
  const row = {};
  const map = {
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
  for (const [k, dbCol] of Object.entries(map)) {
    if (patch[k] !== undefined) row[dbCol] = patch[k];
  }
  return row;
}

export const categoriesDb = {
  async list() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('position', { ascending: true })
      .order('slug', { ascending: true });
    if (error || !data?.length) {
      return STATIC.map((c) => ({ ...c, labels: [...c.labels] }));
    }
    return data.map(mapRow);
  },

  async get(slug) {
    if (!slug) return null;
    const supabase = createClient();
    const { data, error } = await supabase.from('categories').select('*').eq('slug', slug).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) {
      // Fall back to the static mock so the editor can hydrate even
      // before migration 014 is applied; saving will write the row.
      const fallback = STATIC.find((c) => c.slug === slug);
      return fallback ? { ...fallback, labels: [...fallback.labels] } : null;
    }
    return mapRow(data);
  },

  async update(slug, patch) {
    const supabase = createClient();
    const row = patchToRow(patch);
    const { data, error } = await supabase
      .from('categories')
      .update(row)
      .eq('slug', slug)
      .select()
      .single();
    if (error) throw new Error(error.message);
    notify();
    return mapRow(data);
  },

  async add(name) {
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const supabase = createClient();
    const { data: existing } = await supabase.from('categories').select('slug').eq('slug', slug).maybeSingle();
    if (existing) return null;
    const { data, error } = await supabase.from('categories').insert({ slug, name: name.trim(), labels: [] }).select().single();
    if (error) throw new Error(error.message);
    notify();
    return mapRow(data);
  },

  async remove(slug) {
    const supabase = createClient();
    await supabase.from('categories').delete().eq('slug', slug);
    notify();
  },

  async addLabel(slug, label) {
    const supabase = createClient();
    const { data } = await supabase.from('categories').select('labels').eq('slug', slug).single();
    const labels = data?.labels || [];
    if (labels.includes(label)) return;
    await supabase.from('categories').update({ labels: [...labels, label] }).eq('slug', slug);
    notify();
  },

  async removeLabel(slug, label) {
    const supabase = createClient();
    const { data } = await supabase.from('categories').select('labels').eq('slug', slug).single();
    const labels = (data?.labels || []).filter((l) => l !== label);
    await supabase.from('categories').update({ labels }).eq('slug', slug);
    notify();
  },
};
