/**
 * Wildlife.Universe author roster.
 *
 * The 13 named personas that drive Article-JSON-LD `Person` authorship,
 * `/author/<slug>` profile pages, and per-post bylines. Stored as a
 * versioned JS module rather than a DB table for two reasons:
 *
 *   1. Authoring the migration requires service-role SQL execution
 *      that the Supabase client doesn't expose; the JS module ships
 *      with the deploy and is in code review like any other change.
 *   2. The roster changes far less often than posts, so the read path
 *      is faster with a baked-in module than another Supabase round-trip.
 *
 * `posts.author_id` (existing TEXT column from migration 002) stores
 * the author SLUG — the application layer resolves it to the full
 * record via getAuthorBySlug() at render time.
 *
 * Each author MUST have: slug, name, title, bio, expertise, affiliation,
 * photoUrl, expertiseCategories (used by the backfill assigner so the
 * author/post pairing matches the content). Optional: twitter, website.
 */

import { SITE_URL } from '@/lib/seo';

/** @typedef {object} Author
 *  @property {string} slug
 *  @property {string} name
 *  @property {string} title
 *  @property {string} bio
 *  @property {string} expertise           // comma-separated for display
 *  @property {string[]} expertiseCategories // ['animals/mammals', 'animals/reptiles', ...]
 *  @property {string} affiliation
 *  @property {string} photoUrl
 *  @property {string|null} twitter
 *  @property {string|null} website
 */

/** @type {Author[]} */
export const AUTHORS = [
  {
    slug: 'dr-evalyne-shoo',
    name: 'Dr. Evalyne Shoo',
    title: 'Senior Wildlife Biologist',
    bio: 'Tanzanian wildlife biologist with a doctorate in large-mammal ecology from the University of Dar es Salaam. Twelve years of field work across Tarangire, Serengeti, and Selous on elephant movement corridors and predator-prey dynamics. IUCN Red List contributor for the African Elephant Specialist Group.',
    expertise: 'Large mammals, predator-prey dynamics, East African wildlife, IUCN Red List',
    expertiseCategories: ['animals/mammals', 'animals/iucn-redlist'],
    affiliation: 'University of Dar es Salaam — School of Aquatic Sciences and Fisheries',
    photoUrl: '/authors/dr-evalyne-shoo.jpg',
    twitter: null,
    website: null,
  },
  {
    slug: 'yona-mdavire',
    name: 'Yona Mdavire',
    title: 'Entomology Field Correspondent',
    bio: 'Field entomologist and science communicator covering pollinators, invertebrate conservation, and the agricultural impact of insect decline. Reports from sub-Saharan Africa, the Albertine Rift, and coastal mangroves. Trained at Sokoine University of Agriculture.',
    expertise: 'Insects, pollinators, invertebrate conservation, agroecology',
    expertiseCategories: [
      'insects/arthropoda',
      'insects/annelida',
      'insects/nematoda',
      'insects/platyhelminthes',
      'insects/porifera',
      'insects/iucn-redlist',
    ],
    affiliation: 'Sokoine University of Agriculture',
    photoUrl: '/authors/yona-mdavire.jpg',
    twitter: null,
    website: null,
  },
  {
    slug: 'mr-oyo-shindawangoni',
    name: 'Mr. Oyo Shindawangoni',
    title: 'Ornithologist & Field Reporter',
    bio: 'Ornithologist with two decades of fieldwork on African birds, migratory flyways, and raptor conservation. Founding member of the Tanzania Bird Atlas project and a regular contributor to African Bird Club publications.',
    expertise: 'Ornithology, raptors, migratory birds, African flyways',
    expertiseCategories: [
      'birds/basal',
      'birds/waterfowl',
      'birds/coastal',
      'birds/raptors',
      'birds/land',
      'birds/song',
      'birds/iucn-redlist',
    ],
    affiliation: 'Tanzania Bird Atlas Project',
    photoUrl: '/authors/mr-oyo-shindawangoni.jpg',
    twitter: null,
    website: null,
  },
  {
    slug: 'dr-mclean-sean',
    name: 'Dr. Mclean Sean',
    title: 'Conservation Scientist',
    bio: 'Conservation scientist focused on threatened-species recovery programmes and the policy side of the IUCN Red List. Authored peer-reviewed work on species reintroduction, captive breeding programmes, and habitat connectivity in fragmented landscapes.',
    expertise: 'Conservation biology, IUCN Red List policy, species recovery, habitat connectivity',
    expertiseCategories: [
      'posts/conservation',
      'animals/iucn-redlist',
      'birds/iucn-redlist',
      'plants/iucn-redlist',
      'insects/iucn-redlist',
    ],
    affiliation: 'IUCN Species Survival Commission',
    photoUrl: '/authors/dr-mclean-sean.jpg',
    twitter: null,
    website: null,
  },
  {
    slug: 'lee-xi',
    name: 'Lee Xi',
    title: 'Marine & Aquatic Biologist',
    bio: 'Marine and freshwater biologist specialising in coral-reef ecosystems, cephalopod behaviour, and Indo-Pacific marine fauna. Reports from coral triangles, deep-water seamounts, and the unique aquatic life of inland soda lakes.',
    expertise: 'Marine biology, coral reefs, cephalopods, freshwater fauna, fish',
    expertiseCategories: [
      'animals/fish',
      'insects/cnidaria',
      'insects/echinodermata',
      'insects/mollusca',
    ],
    affiliation: 'Indo-Pacific Marine Conservation Initiative',
    photoUrl: '/authors/lee-xi.jpg',
    twitter: null,
    website: null,
  },
  {
    slug: 'sam-janeth',
    name: 'Sam Janeth',
    title: 'Travel & Tourism Writer',
    bio: 'Nature-travel writer focused on ethical wildlife tourism, responsible safari operators, and the conservation economics of protected areas. Long-form work covering East African national parks, Galapagos, and the wildlife corridors of southern Africa.',
    expertise: 'Wildlife tourism, ethical safari, protected areas, ecotourism',
    expertiseCategories: ['posts/tourism'],
    affiliation: 'Responsible Travel Africa Network',
    photoUrl: '/authors/sam-janeth.jpg',
    twitter: null,
    website: null,
  },
  {
    slug: 'joseph-baptista',
    name: 'Joseph Baptista',
    title: 'Botanist & Plant Ecologist',
    bio: 'Plant ecologist and ethnobotanist with deep knowledge of tropical trees, medicinal plants, and the ecological roles of vines, shrubs, and herbs across African and South-American biomes. Trained at the Royal Botanic Gardens, Kew.',
    expertise: 'Botany, ethnobotany, tropical trees, plant ecology',
    expertiseCategories: [
      'plants/trees',
      'plants/shrubs',
      'plants/herbs',
      'plants/vines',
      'plants/iucn-redlist',
    ],
    affiliation: 'Royal Botanic Gardens, Kew — Honorary Research Associate',
    photoUrl: '/authors/joseph-baptista.jpg',
    twitter: null,
    website: null,
  },
  {
    slug: 'prof-naomi',
    name: 'Prof. Naomi',
    title: 'Professor of Ecology',
    bio: 'Professor of ecology and biodiversity science. Research interests span community ecology, ecosystem services, and the long-form science journalism that makes peer-reviewed work readable to the public. Frequent contributor to global biodiversity assessments.',
    expertise: 'Community ecology, biodiversity, ecosystem services, science communication',
    expertiseCategories: ['posts/articles', 'plants/trees', 'animals/mammals'],
    affiliation: 'Institute of Biodiversity & Ecosystem Studies',
    photoUrl: '/authors/prof-naomi.jpg',
    twitter: null,
    website: null,
  },
  {
    slug: 'matt-mclean',
    name: 'Matt Mclean',
    title: 'Editor & Science Writer',
    bio: 'Editor and long-form science writer at Wildlife.Universe. Covers explainer journalism on how and why wildlife systems work — predation, migration, communication, evolution — translating peer-reviewed research into reader-friendly narratives.',
    expertise: 'Explainer journalism, science writing, evolution, animal behaviour',
    expertiseCategories: [
      'posts/how-questions',
      'posts/why-questions',
      'posts/articles',
    ],
    affiliation: 'Wildlife.Universe',
    photoUrl: '/authors/matt-mclean.jpg',
    twitter: null,
    website: SITE_URL,
  },
  {
    slug: 'miss-rachel-babu',
    name: 'Miss. Rachel Babu',
    title: 'Herpetologist',
    bio: 'Herpetologist specialising in amphibian and reptile conservation. Fieldwork across South-East Asian rainforests and East African montane regions on chytrid fungus epidemiology, gecko taxonomy, and the conservation status of caecilians.',
    expertise: 'Herpetology, amphibians, reptiles, chytrid fungus, conservation',
    expertiseCategories: ['animals/amphibians', 'animals/reptiles'],
    affiliation: 'Asian Herpetological Society',
    photoUrl: '/authors/miss-rachel-babu.jpg',
    twitter: null,
    website: null,
  },
  {
    slug: 'romario-schwazentigger',
    name: 'Romario Schwazentigger',
    title: 'Carnivore Specialist',
    bio: 'Carnivore biologist with field experience on grey wolves, leopards, hyaena clans, and the social ecology of large predators. Documentary fieldwork in the Carpathians, Yellowstone, and the Maasai Mara ecosystem.',
    expertise: 'Carnivores, wolves, big cats, predator ecology, large-mammal behaviour',
    expertiseCategories: ['animals/mammals', 'animals/iucn-redlist'],
    affiliation: 'European Carnivore Initiative',
    photoUrl: '/authors/romario-schwazentigger.jpg',
    twitter: null,
    website: null,
  },
  {
    slug: 'prof-attenborough-deann',
    name: 'Prof. Attenborough Deann',
    title: 'Natural History Professor',
    bio: 'Professor of natural history and documentary science. Decades of teaching and field experience covering vertebrate evolution, biogeography, and the long arc of life on Earth. Frequent contributor to broadcast natural-history features.',
    expertise: 'Natural history, vertebrate evolution, biogeography, documentary science',
    expertiseCategories: [
      'posts/articles',
      'posts/how-questions',
      'posts/why-questions',
      'animals/mammals',
      'animals/reptiles',
      'animals/amphibians',
      'animals/fish',
      'birds/raptors',
      'birds/land',
      'birds/song',
    ],
    affiliation: 'Department of Earth & Life Sciences',
    photoUrl: '/authors/prof-attenborough-deann.jpg',
    twitter: null,
    website: null,
  },
  {
    slug: 'nickson-mbaga',
    name: 'Nickson Mbaga',
    title: 'Conservation Reporter',
    bio: 'Reporter covering African conservation, community-led protected areas, and the human side of human-wildlife conflict. Tanzanian by training, with field reporting across the Kilimanjaro, Mara, and Selous ecosystems.',
    expertise: 'African conservation, community conservation, human-wildlife conflict, protected areas',
    expertiseCategories: ['posts/conservation', 'posts/tourism', 'posts/articles'],
    affiliation: 'East African Wildlife Society',
    photoUrl: '/authors/nickson-mbaga.jpg',
    twitter: null,
    website: null,
  },
];

const BY_SLUG = new Map(AUTHORS.map((a) => [a.slug, a]));

const DEFAULT_AUTHOR_SLUG = 'matt-mclean';

export function getAuthorBySlug(slug) {
  if (!slug) return BY_SLUG.get(DEFAULT_AUTHOR_SLUG);
  return BY_SLUG.get(slug) || null;
}

export function getDefaultAuthor() {
  return BY_SLUG.get(DEFAULT_AUTHOR_SLUG);
}

export function allAuthors() {
  return AUTHORS;
}

/**
 * djb2 hash — deterministic, no external deps. Used by the backfill
 * to pick a stable author for a given post.slug within the pool of
 * authors qualified for that post's category/label.
 */
function djb2(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  // Keep it positive — top bit set means negative on 32-bit signed.
  return hash >>> 0;
}

/**
 * Pick an author for a post based on (category, label) plus the post
 * slug as a stable tiebreaker. The pool is every author whose
 * expertiseCategories contains either `<category>/<label>` exactly
 * or just `<category>/...`. Falls back to Matt Mclean if no pool match.
 */
export function pickAuthorForPost({ category, label, slug }) {
  const cat = String(category || '').toLowerCase();
  const lbl = String(label || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const exact = lbl ? `${cat}/${lbl}` : null;

  const pool = AUTHORS.filter((a) =>
    a.expertiseCategories.some((e) => {
      if (exact && e === exact) return true;
      if (!lbl && e.startsWith(`${cat}/`)) return true;
      return false;
    }),
  );

  if (pool.length === 0) {
    // Anyone whose expertise includes the bare category is a soft fit.
    const softPool = AUTHORS.filter((a) =>
      a.expertiseCategories.some((e) => e.startsWith(`${cat}/`)),
    );
    if (softPool.length === 0) return getDefaultAuthor();
    const idx = djb2(slug || '') % softPool.length;
    return softPool[idx];
  }

  const idx = djb2(slug || '') % pool.length;
  return pool[idx];
}
