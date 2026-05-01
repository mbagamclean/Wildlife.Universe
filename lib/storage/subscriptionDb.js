const isBrowser = () => typeof window !== 'undefined';

export function getSubscription() {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem('wu:subscription');
    if (!raw) return null;
    const sub = JSON.parse(raw);
    if (!sub.active || new Date(sub.expiresAt) < new Date()) return null;
    return sub;
  } catch { return null; }
}

export function isSubscribed() {
  return !!getSubscription();
}

export function hasBookAccess(slug) {
  if (!isBrowser()) return false;
  try {
    const purchases = JSON.parse(localStorage.getItem('wu:purchases') || '[]');
    return purchases.some((p) => p.type === 'book' && p.slug === slug);
  } catch { return false; }
}

export function saveSubscription(plan) {
  if (!isBrowser()) return null;
  const now = new Date();
  const exp = new Date(now);
  if (plan.id === 'daily')   exp.setDate(exp.getDate() + 1);
  if (plan.id === 'weekly')  exp.setDate(exp.getDate() + 7);
  if (plan.id === 'monthly') exp.setMonth(exp.getMonth() + 1);
  if (plan.id === 'yearly')  exp.setFullYear(exp.getFullYear() + 1);
  const sub = {
    planId: plan.id, planLabel: plan.label, price: plan.price,
    accentColor: plan.accentColor,
    startedAt: now.toISOString(), expiresAt: exp.toISOString(), active: true,
  };
  try {
    localStorage.setItem('wu:subscription', JSON.stringify(sub));
    window.dispatchEvent(new CustomEvent('wu:storage-changed'));
  } catch { /* ignore */ }
  return sub;
}

export function saveBookPurchase(bookItem) {
  if (!isBrowser()) return;
  try {
    const existing = JSON.parse(localStorage.getItem('wu:purchases') || '[]');
    const purchase = {
      type: 'book', slug: bookItem.slug, title: bookItem.title,
      price: bookItem.price, purchasedAt: new Date().toISOString(),
    };
    localStorage.setItem('wu:purchases', JSON.stringify([...existing, purchase]));
    window.dispatchEvent(new CustomEvent('wu:storage-changed'));
  } catch { /* ignore */ }
}
