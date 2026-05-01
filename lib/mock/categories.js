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
    labels: ['Basal', 'Waterfowl', 'Coastal', 'Raptors', 'Land', 'Song'],
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
    ],
  },
  {
    slug: 'posts',
    name: 'Posts',
    labels: ['How', 'Why', 'Tourism', 'Conservation', 'Articles'],
  },
];

export const navItems = [
  { name: 'Home', href: '/' },
  ...categories.map((c) => ({ name: c.name, href: `/${c.slug}` })),
];

export const allLabels = categories.flatMap((c) =>
  c.labels.map((label) => ({ label, category: c.name, slug: c.slug }))
);

// Converts a label name to a URL-safe slug  e.g. "IUCN Redlist" → "iucn-redlist"
export function labelSlug(label) {
  return label
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// Resolves a URL slug back to the original label name
export function findLabelBySlug(slug, labels) {
  return labels.find((l) => labelSlug(l) === slug) ?? null;
}
