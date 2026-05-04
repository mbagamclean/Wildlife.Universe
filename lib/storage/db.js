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

// Whitelist of columns we know exist (per migrations 001 + 002 + 005).
// Anything not in this set is dropped before sending to Supabase so an
// unrelated camelCase field doesn't reject the whole insert.
const POST_COLUMNS = new Set([
  'id', 'slug', 'title', 'body', 'category', 'label', 'description',
  'excerpt', 'cover', 'cover_palette', 'featured', 'status', 'views',
  'iucn_status', 'tags', 'author_id',
  'meta_title', 'meta_description', 'meta_keywords',
  'publish_date', 'created_at', 'updated_at',
]);

function postToDb(payload) {
  const {
    coverPalette, iucnStatus, createdAt, updatedAt,
    metaTitle, metaDesc, metaKw, publishDate, authorId,
    ...rest
  } = payload;

  const row = {};
  // Pass through fields whose key is already valid snake_case
  for (const [k, v] of Object.entries(rest)) {
    if (POST_COLUMNS.has(k)) row[k] = v;
  }
  // Translate camelCase aliases used by the editor
  if (coverPalette !== undefined) row.cover_palette    = coverPalette;
  if (iucnStatus   !== undefined) row.iucn_status      = iucnStatus;
  if (metaTitle    !== undefined) row.meta_title       = metaTitle;
  if (metaDesc     !== undefined) row.meta_description = metaDesc;
  if (metaKw       !== undefined) row.meta_keywords    = metaKw;
  if (publishDate  !== undefined) row.publish_date     = publishDate || null;
  if (authorId     !== undefined) row.author_id        = authorId;
  // createdAt / updatedAt are managed by the DB — never write them
  return row;
}

function mapPostFromDb(row) {
  if (!row) return null;
  const {
    cover_palette, iucn_status, created_at, updated_at,
    meta_title, meta_description, meta_keywords, publish_date, author_id,
    ...rest
  } = row;
  return {
    ...rest,
    coverPalette: cover_palette,
    iucnStatus: iucn_status,
    createdAt: created_at,
    updatedAt: updated_at,
    metaTitle: meta_title,
    metaDesc: meta_description,
    metaKw: meta_keywords,
    publishDate: publish_date,
    authorId: author_id,
  };
}

/**
 * Insert/update a row, automatically dropping columns the schema doesn't
 * yet have. PostgREST returns one of two error shapes for unknown columns:
 *   "Could not find the 'meta_title' column of 'posts' in the schema cache"
 *   `column "meta_title" of relation "posts" does not exist`
 * Either way we strip the offending column from `row` and retry, up to
 * MAX_RETRIES times. This makes the app self-healing if a migration is
 * pending — the SEO fields just don't persist until the user runs it.
 */
async function execWithSchemaHealing(buildOp, row) {
  const MAX_RETRIES = 8;
  let working = { ...row };
  let lastErr = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const { data, error } = await buildOp(working);
    if (!error) return data;
    lastErr = error;
    const msg = String(error.message || '');
    const m = msg.match(/(?:column "?(\w+)"?(?: of relation "\w+")? does not exist|Could not find the '(\w+)' column of '\w+')/i);
    const col = m && (m[1] || m[2]);
    if (!col || !(col in working)) break; // not a schema mismatch — bail
    delete working[col];
    if (typeof console !== 'undefined') {
      console.warn(`[db.posts] dropping unknown column "${col}" — run latest migration to persist it.`);
    }
  }
  throw new Error(lastErr?.message || 'Database operation failed');
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
    return (data || []).map(mapPostFromDb);
  },

  async get(slug) {
    const { data } = await getDb().from('posts').select('*').eq('slug', slug).maybeSingle();
    return mapPostFromDb(data);
  },

  async getById(id) {
    const { data } = await getDb().from('posts').select('*').eq('id', id).maybeSingle();
    return mapPostFromDb(data);
  },

  async listByCategory(category) {
    const { data } = await getDb().from('posts').select('*').eq('category', category).order('created_at', { ascending: false });
    return (data || []).map(mapPostFromDb);
  },

  async listAllWithIUCN() {
    const { data } = await getDb().from('posts').select('*').not('iucn_status', 'is', null).order('created_at', { ascending: false });
    return (data || []).map(mapPostFromDb);
  },

  async listFeatured() {
    const { data } = await getDb().from('posts').select('*').eq('featured', true).order('created_at', { ascending: false });
    return (data || []).map(mapPostFromDb);
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

    const data = await execWithSchemaHealing(
      (r) => db.from('posts').insert(r).select().single(),
      row
    );
    notify();
    return mapPostFromDb(data);
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

    const data = await execWithSchemaHealing(
      (r) => db.from('posts').update(r).eq('id', id).select().single(),
      row
    );
    notify();
    return mapPostFromDb(data);
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

// ── Homepage videos ──────────────────────────────────────────────────────────

function mapVideo(row) {
  if (!row) return null;
  const {
    source_url, source_type, duration_sec,
    created_at, updated_at,
    ...rest
  } = row;
  return {
    ...rest,
    sourceUrl: source_url,
    sourceType: source_type,
    durationSec: duration_sec,
    createdAt: created_at,
    updatedAt: updated_at,
  };
}

function videoToDb(payload) {
  const {
    sourceUrl, sourceType, durationSec, createdAt, updatedAt,
    ...rest
  } = payload;
  const row = { ...rest };
  if (sourceUrl   !== undefined) row.source_url   = sourceUrl;
  if (sourceType  !== undefined) row.source_type  = sourceType;
  if (durationSec !== undefined) row.duration_sec = durationSec;
  return row;
}

const homepageVideos = {
  async list({ section, includeInactive = false } = {}) {
    let q = getDb().from('homepage_videos').select('*');
    if (section) q = q.eq('section', section);
    if (!includeInactive) q = q.eq('active', true);
    const { data, error } = await q.order('position', { ascending: true }).order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map(mapVideo);
  },

  async listAll() {
    const { data } = await getDb()
      .from('homepage_videos')
      .select('*')
      .order('section', { ascending: true })
      .order('position', { ascending: true })
      .order('created_at', { ascending: false });
    return (data || []).map(mapVideo);
  },

  async create(payload) {
    const db = getDb();
    const row = videoToDb({
      id: payload.id || genId('v'),
      section: 'featured',
      position: 0,
      active: true,
      source_type: 'embed',
      ...payload,
    });
    const { data, error } = await db.from('homepage_videos').insert(row).select().single();
    if (error) throw new Error(error.message);
    notify();
    return mapVideo(data);
  },

  async update(id, patch) {
    const row = videoToDb(patch);
    const { data, error } = await getDb().from('homepage_videos').update(row).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    notify();
    return mapVideo(data);
  },

  async remove(id) {
    const { error } = await getDb().from('homepage_videos').delete().eq('id', id);
    if (error) throw new Error(error.message);
    notify();
  },

  async reorder(items) {
    // items: [{ id, position }]
    const db = getDb();
    await Promise.all(items.map((it) =>
      db.from('homepage_videos').update({ position: it.position }).eq('id', it.id)
    ));
    notify();
  },
};

// bootstrap is a no-op — Supabase is always ready
function bootstrap() {}

export const db = { heroes, mode, posts, users, homepageVideos, bootstrap };
