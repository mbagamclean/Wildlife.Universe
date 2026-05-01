import { categories as STATIC } from '@/lib/mock/categories';

const KEY = 'wu:categories';
const isBrowser = () => typeof window !== 'undefined';

function read() {
  if (!isBrowser()) return STATIC.map((c) => ({ ...c, labels: [...c.labels] }));
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  const seeded = STATIC.map((c) => ({ ...c, labels: [...c.labels] }));
  persist(seeded);
  return seeded;
}

function persist(cats) {
  if (!isBrowser()) return;
  try { window.localStorage.setItem(KEY, JSON.stringify(cats)); } catch { /* quota */ }
}

function notify() {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent('wu:storage-changed'));
}

function slugify(s) {
  return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export const categoriesDb = {
  list() {
    return read();
  },

  add(name) {
    const slug = slugify(name);
    const cats = read();
    if (cats.some((c) => c.slug === slug)) return null;
    const next = [...cats, { name: name.trim(), slug, labels: [] }];
    persist(next);
    notify();
    return next[next.length - 1];
  },

  remove(slug) {
    const cats = read();
    persist(cats.filter((c) => c.slug !== slug));
    notify();
  },

  addLabel(slug, label) {
    const cats = read();
    const next = cats.map((c) =>
      c.slug === slug && !c.labels.includes(label)
        ? { ...c, labels: [...c.labels, label] }
        : c
    );
    persist(next);
    notify();
  },

  removeLabel(slug, label) {
    const cats = read();
    const next = cats.map((c) =>
      c.slug === slug ? { ...c, labels: c.labels.filter((l) => l !== label) } : c
    );
    persist(next);
    notify();
  },
};
