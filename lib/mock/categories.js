export const categories = [
  {
    slug: 'animals',
    name: 'Animals',
    labels: ['Mammals', 'Reptiles', 'Amphibians', 'Fish', 'IUCN Redlist'],
  },
  {
    slug: 'plants',
    name: 'Plants',
    labels: ['Trees', 'Shrubs', 'Herbs', 'Vines'],
  },
  {
    slug: 'birds',
    name: 'Birds',
    labels: ['Basal', 'Waterfowl', 'Coastal', 'Raptors', 'Land', 'Song', 'IUCN Redlist'],
  },
  {
    slug: 'insects',
    name: 'Insects',
    labels: [
      'Porifera',
      'Cnidaria',
      'Platyhelminthes',
      'Nematoda',
      'Annelida',
      'Mollusca',
      'Arthropoda',
      'Echinodermata',
      'IUCN Redlist',
    ],
  },
  {
    slug: 'posts',
    name: 'Posts',
    labels: ['How Questions', 'Why Questions', 'Tourism', 'Conservation', 'Articles'],
  },
];

export const navItems = [
  { name: 'Home', href: '/' },
  ...categories.map((c) => ({ name: c.name, href: `/${c.slug}` })),
];

// Converts a label name to a URL-safe slug  e.g. "IUCN Redlist" → "iucn-redlist"
export function labelSlug(label) {
  return label
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// Each label exposes BOTH the category slug (for URL building) and the
// label slug. Consumers that build links should use
// `/${categorySlug}/${labelSlug}` — the legacy `slug` field still points
// at the category for backwards compatibility but new code should prefer
// the explicit names.
export const allLabels = categories.flatMap((c) =>
  c.labels.map((label) => ({
    label,
    category: c.name,
    categorySlug: c.slug,
    labelSlug: labelSlug(label),
    slug: c.slug, // legacy alias — kept so older imports don't break
    href: `/${c.slug}/${labelSlug(label)}`,
  }))
);

// Resolves a URL slug back to the original label name
export function findLabelBySlug(slug, labels) {
  return labels.find((l) => labelSlug(l) === slug) ?? null;
}
