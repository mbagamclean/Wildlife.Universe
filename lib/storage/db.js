import { KEYS, HERO_MODE, MAX_HEROES } from './keys';
import { SEED_HEROES, SEED_POSTS, SEED_USERS } from './seed';

const SEEDED_V2 = 'wu:seeded_v2';
const SEEDED_V3 = 'wu:seeded_v3';
const SEEDED_V4 = 'wu:seeded_v4';
const SEEDED_V5 = 'wu:seeded_v5';
const SEEDED_V6 = 'wu:seeded_v6';
const SEEDED_V7 = 'wu:seeded_v7';

const isBrowser = () => typeof window !== 'undefined';

function read(key, fallback) {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  if (!isBrowser()) return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota / blocked */ }
}

function genId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function bootstrap() {
  if (!isBrowser()) return;
  try {
    const seeded = window.localStorage.getItem(KEYS.SEEDED);
    if (seeded === 'true') return;
    if (!window.localStorage.getItem(KEYS.HEROES)) write(KEYS.HEROES, SEED_HEROES);
    if (!window.localStorage.getItem(KEYS.POSTS)) write(KEYS.POSTS, SEED_POSTS);
    if (!window.localStorage.getItem(KEYS.USERS)) write(KEYS.USERS, SEED_USERS);
    if (!window.localStorage.getItem(KEYS.HERO_MODE))
      write(KEYS.HERO_MODE, HERO_MODE.DEFAULT);
    window.localStorage.setItem(KEYS.SEEDED, 'true');
  } catch { /* storage blocked or quota exceeded */ }
}

function notify() {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent('wu:storage-changed'));
}

function bootstrapV2() {
  if (!isBrowser()) return;
  if (window.localStorage.getItem(SEEDED_V2) === 'true') return;
  const existing = read(KEYS.POSTS, []);
  const existingSlugs = new Set(existing.map((p) => p.slug));
  const newPosts = SEED_POSTS.filter((p) => !existingSlugs.has(p.slug));
  if (newPosts.length > 0) {
    write(KEYS.POSTS, [...existing, ...newPosts]);
    notify();
  }
  window.localStorage.setItem(SEEDED_V2, 'true');
}

function bootstrapV3() {
  if (!isBrowser()) return;
  if (window.localStorage.getItem(SEEDED_V3) === 'true') return;
  const existing = read(KEYS.POSTS, []);
  const existingSlugs = new Set(existing.map((p) => p.slug));
  const newPosts = SEED_POSTS.filter((p) => !existingSlugs.has(p.slug));
  if (newPosts.length > 0) {
    write(KEYS.POSTS, [...existing, ...newPosts]);
    notify();
  }
  window.localStorage.setItem(SEEDED_V3, 'true');
}

function bootstrapV4() {
  if (!isBrowser()) return;
  if (window.localStorage.getItem(SEEDED_V4) === 'true') return;
  const existing = read(KEYS.POSTS, []);
  const existingSlugs = new Set(existing.map((p) => p.slug));
  const newPosts = SEED_POSTS.filter((p) => !existingSlugs.has(p.slug));
  if (newPosts.length > 0) {
    write(KEYS.POSTS, [...existing, ...newPosts]);
    notify();
  }
  window.localStorage.setItem(SEEDED_V4, 'true');
}

function bootstrapV5() {
  if (!isBrowser()) return;
  if (window.localStorage.getItem(SEEDED_V5) === 'true') return;
  const existing = read(KEYS.POSTS, []);
  const existingSlugs = new Set(existing.map((p) => p.slug));
  const newPosts = SEED_POSTS.filter((p) => !existingSlugs.has(p.slug));
  if (newPosts.length > 0) {
    write(KEYS.POSTS, [...existing, ...newPosts]);
    notify();
  }
  window.localStorage.setItem(SEEDED_V5, 'true');
}

function bootstrapV6() {
  if (!isBrowser()) return;
  if (window.localStorage.getItem(SEEDED_V6) === 'true') return;
  const existing = read(KEYS.POSTS, []);
  const existingSlugs = new Set(existing.map((p) => p.slug));
  const newPosts = SEED_POSTS.filter((p) => !existingSlugs.has(p.slug));
  if (newPosts.length > 0) {
    write(KEYS.POSTS, [...existing, ...newPosts]);
    notify();
  }
  window.localStorage.setItem(SEEDED_V6, 'true');
}
function bootstrapV7() {
  if (!isBrowser()) return;
  if (window.localStorage.getItem(SEEDED_V7) === 'true') return;
  const existing = read(KEYS.HEROES, []);
  if (existing.length > 0) {
    const updated = existing.map(h => {
      const seed = SEED_HEROES.find(s => s.id === h.id);
      if (seed) return { ...h, ...seed };
      return h;
    });
    write(KEYS.HEROES, updated);
    notify();
  }
  window.localStorage.setItem(SEEDED_V7, 'true');
}
const heroes = {
  async list() {
    bootstrap();
    bootstrapV7();
    return read(KEYS.HEROES, []);
  },
  async create(payload) {
    bootstrap();
    const all = read(KEYS.HEROES, []);
    if (all.length >= MAX_HEROES) {
      throw new Error(`Maximum of ${MAX_HEROES} hero items reached.`);
    }
    const item = {
      id: genId('h'),
      type: 'image',
      palette: { from: '#0c4a1a', via: '#3aa15a', to: '#a8e0c0' },
      accent: '#d4af37',
      subject: 'forest',
      ...payload,
      createdAt: new Date().toISOString(),
    };
    write(KEYS.HEROES, [...all, item]);
    notify();
    return item;
  },
  async update(id, patch) {
    bootstrap();
    const all = read(KEYS.HEROES, []);
    const next = all.map((h) => (h.id === id ? { ...h, ...patch } : h));
    write(KEYS.HEROES, next);
    notify();
    return next.find((h) => h.id === id);
  },
  async remove(id) {
    bootstrap();
    const all = read(KEYS.HEROES, []);
    write(
      KEYS.HEROES,
      all.filter((h) => h.id !== id)
    );
    notify();
  },
};

const mode = {
  async get() {
    bootstrap();
    return read(KEYS.HERO_MODE, HERO_MODE.DEFAULT);
  },
  async set(next) {
    bootstrap();
    if (next !== HERO_MODE.DEFAULT && next !== HERO_MODE.FEATURED) {
      throw new Error('Invalid hero mode');
    }
    write(KEYS.HERO_MODE, next);
    notify();
    return next;
  },
};

const posts = {
  async list() {
    bootstrap();
    bootstrapV2();
    bootstrapV3();
    bootstrapV4();
    bootstrapV5();
    bootstrapV6();
    return read(KEYS.POSTS, []);
  },
  async get(slug) {
    bootstrap();
    return read(KEYS.POSTS, []).find((p) => p.slug === slug) || null;
  },
  async listByCategory(category) {
    bootstrap();
    bootstrapV2();
    bootstrapV3();
    bootstrapV4();
    bootstrapV5();
    bootstrapV6();
    return read(KEYS.POSTS, []).filter((p) => p.category === category);
  },
  async listAllWithIUCN() {
    bootstrap();
    bootstrapV2();
    bootstrapV3();
    bootstrapV4();
    bootstrapV5();
    bootstrapV6();
    return read(KEYS.POSTS, []).filter((p) => p.iucnStatus);
  },
  async listFeatured() {
    bootstrap();
    return read(KEYS.POSTS, []).filter((p) => p.featured);
  },
  async create(payload) {
    bootstrap();
    const all = read(KEYS.POSTS, []);
    let slug = payload.slug || slugify(payload.title);
    let i = 1;
    const baseSlug = slug;
    while (all.some((p) => p.slug === slug)) {
      slug = `${baseSlug}-${++i}`;
    }
    const post = {
      id: genId('p'),
      cover: null,
      coverPalette: { from: '#0c4a1a', via: '#3aa15a', to: '#d4af37' },
      featured: false,
      ...payload,
      slug,
      createdAt: new Date().toISOString(),
    };
    write(KEYS.POSTS, [...all, post]);
    notify();
    return post;
  },
  async update(id, patch) {
    bootstrap();
    const all = read(KEYS.POSTS, []);
    const next = all.map((p) => {
      if (p.id !== id) return p;
      const merged = { ...p, ...patch };
      if (patch.title && !patch.slug) {
        let slug = slugify(patch.title);
        let i = 1;
        const baseSlug = slug;
        while (all.some((x) => x.slug === slug && x.id !== id)) {
          slug = `${baseSlug}-${++i}`;
        }
        merged.slug = slug;
      }
      return merged;
    });
    write(KEYS.POSTS, next);
    notify();
    return next.find((p) => p.id === id);
  },
  async remove(id) {
    bootstrap();
    const all = read(KEYS.POSTS, []);
    write(
      KEYS.POSTS,
      all.filter((p) => p.id !== id)
    );
    notify();
  },
};

const users = {
  async list() {
    bootstrap();
    return read(KEYS.USERS, []).map(({ password, ...rest }) => rest);
  },
  async getByEmail(email) {
    bootstrap();
    return (
      read(KEYS.USERS, []).find(
        (u) => u.email.toLowerCase() === String(email).toLowerCase()
      ) || null
    );
  },
  async create(payload) {
    bootstrap();
    const all = read(KEYS.USERS, []);
    if (all.some((u) => u.email.toLowerCase() === payload.email.toLowerCase())) {
      throw new Error('An account with that email already exists.');
    }
    const user = {
      id: genId('u'),
      role: 'reader',
      avatarId: payload.avatarId || 'lion',
      ...payload,
      createdAt: new Date().toISOString(),
    };
    write(KEYS.USERS, [...all, user]);
    notify();
    const { password, ...safe } = user;
    return safe;
  },
  async update(id, patch) {
    bootstrap();
    const all = read(KEYS.USERS, []);
    const next = all.map((u) => (u.id === id ? { ...u, ...patch } : u));
    write(KEYS.USERS, next);
    notify();
    const found = next.find((u) => u.id === id);
    if (!found) return null;
    const { password, ...safe } = found;
    return safe;
  },
};

export const db = { heroes, mode, posts, users, bootstrap };
