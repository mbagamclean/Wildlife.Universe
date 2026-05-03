import { createClient } from '@/lib/supabase/client';
import { HERO_MODE, MAX_HEROES } from './keys';

const getDb = () => createClient();

function slugify(s) {
  return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);
}
function genId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
function notify() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('wu:storage-changed'));
  }
}

// ── Row mappers ────────────────────────────────────────────────────────────────

function mapPost(row) {
  if (!row) return null;
  const { cover_palette, iucn_status, created_at, ...rest } = row;
  return { ...rest, coverPalette: cover_palette, iucnStatus: iucn_status, createdAt: created_at };
}

function mapHero(row) {
  if (!row) return null;
  const { created_at, ...rest } = row;
  return { ...rest, createdAt: created_at };
}

function mapUser(row) {
  if (!row) return null;
  const { first_name, last_name, avatar_id, created_at, ...rest } = row;
  return { ...rest, firstName: first_name, lastName: last_name, avatarId: avatar_id, createdAt: created_at };
}

function postToDb(payload) {
  const { coverPalette, iucnStatus, createdAt, ...rest } = payload;
  const row = { ...rest };
  if (coverPalette !== undefined) row.cover_palette = coverPalette;
  if (iucnStatus  !== undefined) row.iucn_status   = iucnStatus;
  return row;
}

// ── Heroes ─────────────────────────────────────────────────────────────────────

const heroes = {
  async list() {
    const { data } = await getDb().from('heroes').select('*').order('created_at', { ascending: true });
    return (data || []).map(mapHero);
  },

  async create(payload) {
    const db = getDb();
    const { count } = await db.from('heroes').select('*', { count: 'exact', head: true });
    if ((count || 0) >= MAX_HEROES) throw new Error(`Maximum of ${MAX_HEROES} hero items reached.`);

    const item = {
      id: genId('h'),
      type: 'image',
      palette: { from: '#0c4a1a', via: '#3aa15a', to: '#a8e0c0' },
      accent: '#d4af37',
      subject: 'forest',
      ...payload,
    };
    const { data, error } = await db.from('heroes').insert(item).select().single();
    if (error) throw new Error(error.message);
    notify();
    return mapHero(data);
  },

  async update(id, patch) {
    const { data, error } = await getDb().from('heroes').update(patch).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    notify();
    return mapHero(data);
  },

  async remove(id) {
    await getDb().from('heroes').delete().eq('id', id);
    notify();
  },
};

// ── Hero mode ──────────────────────────────────────────────────────────────────

const mode = {
  async get() {
    const { data } = await getDb().from('hero_mode').select('mode').eq('id', 1).maybeSingle();
    return data?.mode || HERO_MODE.DEFAULT;
  },

  async set(next) {
    if (next !== HERO_MODE.DEFAULT && next !== HERO_MODE.FEATURED) throw new Error('Invalid hero mode');
    await getDb().from('hero_mode').upsert({ id: 1, mode: next });
    notify();
    return next;
  },
};

// ── Posts ──────────────────────────────────────────────────────────────────────

const posts = {
  async list() {
    const { data } = await getDb().from('posts').select('*').order('created_at', { ascending: false });
    return (data || []).map(mapPost);
  },

  async get(slug) {
    const { data } = await getDb().from('posts').select('*').eq('slug', slug).maybeSingle();
    return mapPost(data);
  },

  async getById(id) {
    const { data } = await getDb().from('posts').select('*').eq('id', id).maybeSingle();
    return mapPost(data);
  },

  async listByCategory(category) {
    const { data } = await getDb().from('posts').select('*').eq('category', category).order('created_at', { ascending: false });
    return (data || []).map(mapPost);
  },

  async listAllWithIUCN() {
    const { data } = await getDb().from('posts').select('*').not('iucn_status', 'is', null).order('created_at', { ascending: false });
    return (data || []).map(mapPost);
  },

  async listFeatured() {
    const { data } = await getDb().from('posts').select('*').eq('featured', true).order('created_at', { ascending: false });
    return (data || []).map(mapPost);
  },

  async create(payload) {
    const db = getDb();
    let slug = payload.slug || slugify(payload.title);
    const baseSlug = slug;
    let i = 1;
    // ensure unique slug
    while (true) {
      const { data: existing } = await db.from('posts').select('id').eq('slug', slug).maybeSingle();
      if (!existing) break;
      slug = `${baseSlug}-${++i}`;
    }

    const row = postToDb({
      cover: null,
      coverPalette: { from: '#0c4a1a', via: '#3aa15a', to: '#d4af37' },
      featured: false,
      ...payload,
      id: payload.id || genId('p'),
      slug,
    });

    const { data, error } = await db.from('posts').insert(row).select().single();
    if (error) throw new Error(error.message);
    notify();
    return mapPost(data);
  },

  async update(id, patch) {
    const db = getDb();
    const { title: patchTitle, slug: patchSlug, ...rest } = patch;
    const row = postToDb(rest);

    if (patchTitle) {
      row.title = patchTitle;
      if (!patchSlug) {
        let newSlug = slugify(patchTitle);
        const base = newSlug;
        let i = 1;
        while (true) {
          const { data: existing } = await db.from('posts').select('id').eq('slug', newSlug).neq('id', id).maybeSingle();
          if (!existing) break;
          newSlug = `${base}-${++i}`;
        }
        row.slug = newSlug;
      } else {
        row.slug = patchSlug;
      }
    } else if (patchSlug) {
      row.slug = patchSlug;
    }

    const { data, error } = await db.from('posts').update(row).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    notify();
    return mapPost(data);
  },

  async remove(id) {
    await getDb().from('posts').delete().eq('id', id);
    notify();
  },
};

// ── Users (profiles) ──────────────────────────────────────────────────────────

const users = {
  async list() {
    const { data } = await getDb().from('profiles').select('*').order('created_at', { ascending: true });
    return (data || []).map(mapUser);
  },

  async getByEmail(email) {
    const { data } = await getDb().from('profiles').select('*').eq('email', email.toLowerCase()).maybeSingle();
    return data ? mapUser(data) : null;
  },

  async create(payload) {
    // Requires admin API — goes through server-side route
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to create user');
    notify();
    return json.user;
  },

  async update(id, patch) {
    const db = getDb();
    const { firstName, lastName, avatarId, password, createdAt, ...rest } = patch;

    // Password goes through Supabase Auth (updates current user)
    if (password !== undefined) {
      const { error } = await db.auth.updateUser({ password });
      if (error) throw new Error(error.message);
    }

    const dbPatch = { ...rest };
    if (firstName !== undefined) dbPatch.first_name = firstName;
    if (lastName  !== undefined) dbPatch.last_name  = lastName;
    if (avatarId  !== undefined) dbPatch.avatar_id  = avatarId;

    if (Object.keys(dbPatch).length > 0) {
      const { data, error } = await db.from('profiles').update(dbPatch).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      return mapUser(data);
    }

    const { data } = await db.from('profiles').select('*').eq('id', id).single();
    return mapUser(data);
  },
};

// bootstrap is a no-op — Supabase is always ready
function bootstrap() {}

export const db = { heroes, mode, posts, users, bootstrap };
