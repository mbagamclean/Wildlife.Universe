import { createClient } from '@/lib/supabase/client';
import { categories as STATIC, labelSlug } from '@/lib/mock/categories';

function notify() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('wu:storage-changed'));
  }
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

function patchToRow(patch) {
  const row = {};
  const map = {
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
  for (const [k, dbCol] of Object.entries(map)) {
    if (patch[k] !== undefined) row[dbCol] = patch[k];
  }
  return row;
}

/**
 * Fall back to the in-code STATIC mock when the DB row hasn't been
 * created yet (migration 015 not applied or the label was added via
 * the legacy array UI after backfill). Returns the same shape as a
 * real row so the editor hydrates cleanly.
 */
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

export const labelsDb = {
  async list(categorySlug) {
    const supabase = createClient();
    let query = supabase
      .from('category_labels')
      .select('*')
      .order('position', { ascending: true })
      .order('slug', { ascending: true });
    if (categorySlug) query = query.eq('category_slug', categorySlug);
    const { data } = await query;
    return (data || []).map(mapRow);
  },

  async get(categorySlug, slug) {
    if (!categorySlug || !slug) return null;
    const supabase = createClient();
    const { data, error } = await supabase
      .from('category_labels')
      .select('*')
      .eq('category_slug', categorySlug)
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return staticFallback(categorySlug, slug);
    return mapRow(data);
  },

  async update(categorySlug, slug, patch) {
    const supabase = createClient();
    const row = patchToRow(patch);
    const { data, error } = await supabase
      .from('category_labels')
      .update(row)
      .eq('category_slug', categorySlug)
      .eq('slug', slug)
      .select()
      .single();
    if (error) throw new Error(error.message);
    notify();
    return mapRow(data);
  },
};
