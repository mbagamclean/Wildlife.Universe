import { createClient } from '@/lib/supabase/client';
import { categories as STATIC } from '@/lib/mock/categories';

function notify() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('wu:storage-changed'));
  }
}

export const categoriesDb = {
  async list() {
    const supabase = createClient();
    const { data, error } = await supabase.from('categories').select('*').order('slug', { ascending: true });
    if (error || !data?.length) {
      // Fallback to static mock if Supabase query fails
      return STATIC.map((c) => ({ ...c, labels: [...c.labels] }));
    }
    return data;
  },

  async add(name) {
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const supabase = createClient();
    const { data: existing } = await supabase.from('categories').select('slug').eq('slug', slug).maybeSingle();
    if (existing) return null;
    const { data, error } = await supabase.from('categories').insert({ slug, name: name.trim(), labels: [] }).select().single();
    if (error) throw new Error(error.message);
    notify();
    return data;
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
