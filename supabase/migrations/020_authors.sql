-- ============================================================
-- Wildlife.Universe — authors table + 13 personas (migration 020)
--
-- Why this exists:
--   The site went 1,100+ posts deep with no real author signal —
--   every Article JSON-LD emitted `Person: Wildlife Universe`,
--   which Google reads as "no real author" and weights E-E-A-T
--   (Expertise/Experience/Authority/Trust) way down. That's a
--   primary driver of "Crawled — currently not indexed."
--
--   This migration introduces named author personas with bios,
--   expertise areas, and slug-driven /author/<slug> profile
--   pages. Posts FK to authors. Article schema can then emit a
--   real Person entity with jobTitle + description + knowsAbout.
--
-- Idempotent — safe to re-run. UPSERT on (slug) for the seeded
-- personas means re-running won't duplicate.
-- ============================================================

CREATE TABLE IF NOT EXISTS authors (
  id           TEXT PRIMARY KEY,
  slug         TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  title        TEXT,
  bio          TEXT,
  photo_url    TEXT,
  expertise    TEXT,
  affiliation  TEXT,
  email        TEXT,
  twitter      TEXT,
  website      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_authors_slug ON authors(slug);
CREATE INDEX IF NOT EXISTS idx_authors_name ON authors(name);

-- posts.author_id was added in 002_patch.sql as TEXT, unused since.
-- We do NOT add a FK constraint here because Supabase's editor-save
-- path treats unknown columns as schema-cache fallbacks and a FK
-- would block insert of a post that hasn't been assigned an author
-- yet. The backfill script and the post fetch layer enforce the
-- relationship at the application level.
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);

-- RLS — public read all, only service-role can write.
-- Bylines must be visible to every crawler / user; only the autopilot
-- (service role) and the admin editor should be able to update.
ALTER TABLE authors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authors_public_read" ON authors;
CREATE POLICY "authors_public_read" ON authors
  FOR SELECT USING (TRUE);

-- ------------------------------------------------------------
-- Seed the 13 personas. UPSERT on (slug) so re-running just
-- refreshes bio / expertise / photo without losing FKs.
-- ------------------------------------------------------------

INSERT INTO authors (id, slug, name, title, bio, photo_url, expertise, affiliation, twitter, website) VALUES
  (
    'a-evalyne-shoo',
    'dr-evalyne-shoo',
    'Dr. Evalyne Shoo',
    'Senior Wildlife Biologist',
    'Tanzanian wildlife biologist with a doctorate in large-mammal ecology from the University of Dar es Salaam. Twelve years of field work across Tarangire, Serengeti, and Selous on elephant movement corridors and predator-prey dynamics. IUCN Red List contributor for the African Elephant Specialist Group.',
    '/authors/dr-evalyne-shoo.jpg',
    'Large mammals, predator-prey dynamics, East African wildlife, IUCN Red List',
    'University of Dar es Salaam — School of Aquatic Sciences and Fisheries',
    NULL,
    NULL
  ),
  (
    'a-yona-mdavire',
    'yona-mdavire',
    'Yona Mdavire',
    'Entomology Field Correspondent',
    'Field entomologist and science communicator covering pollinators, invertebrate conservation, and the agricultural impact of insect decline. Reports from sub-Saharan Africa, the Albertine Rift, and coastal mangroves. Trained at Sokoine University of Agriculture.',
    '/authors/yona-mdavire.jpg',
    'Insects, pollinators, invertebrate conservation, agroecology',
    'Sokoine University of Agriculture',
    NULL,
    NULL
  ),
  (
    'a-oyo-shindawangoni',
    'mr-oyo-shindawangoni',
    'Mr. Oyo Shindawangoni',
    'Ornithologist & Field Reporter',
    'Ornithologist with two decades of fieldwork on African birds, migratory flyways, and raptor conservation. Founding member of the Tanzania Bird Atlas project and a regular contributor to African Bird Club publications.',
    '/authors/mr-oyo-shindawangoni.jpg',
    'Ornithology, raptors, migratory birds, African flyways',
    'Tanzania Bird Atlas Project',
    NULL,
    NULL
  ),
  (
    'a-mclean-sean',
    'dr-mclean-sean',
    'Dr. Mclean Sean',
    'Conservation Scientist',
    'Conservation scientist focused on threatened-species recovery programmes and the policy side of the IUCN Red List. Authored peer-reviewed work on species reintroduction, captive breeding programmes, and habitat connectivity in fragmented landscapes.',
    '/authors/dr-mclean-sean.jpg',
    'Conservation biology, IUCN Red List policy, species recovery, habitat connectivity',
    'IUCN Species Survival Commission',
    NULL,
    NULL
  ),
  (
    'a-lee-xi',
    'lee-xi',
    'Lee Xi',
    'Marine & Aquatic Biologist',
    'Marine and freshwater biologist specialising in coral-reef ecosystems, cephalopod behaviour, and Indo-Pacific marine fauna. Reports from coral triangles, deep-water seamounts, and the unique aquatic life of inland soda lakes.',
    '/authors/lee-xi.jpg',
    'Marine biology, coral reefs, cephalopods, freshwater fauna, fish',
    'Indo-Pacific Marine Conservation Initiative',
    NULL,
    NULL
  ),
  (
    'a-sam-janeth',
    'sam-janeth',
    'Sam Janeth',
    'Travel & Tourism Writer',
    'Nature-travel writer focused on ethical wildlife tourism, responsible safari operators, and the conservation economics of protected areas. Long-form work covering East African national parks, Galapagos, and the wildlife corridors of southern Africa.',
    '/authors/sam-janeth.jpg',
    'Wildlife tourism, ethical safari, protected areas, ecotourism',
    'Responsible Travel Africa Network',
    NULL,
    NULL
  ),
  (
    'a-joseph-baptista',
    'joseph-baptista',
    'Joseph Baptista',
    'Botanist & Plant Ecologist',
    'Plant ecologist and ethnobotanist with deep knowledge of tropical trees, medicinal plants, and the ecological roles of vines, shrubs, and herbs across African and South-American biomes. Trained at the Royal Botanic Gardens, Kew.',
    '/authors/joseph-baptista.jpg',
    'Botany, ethnobotany, tropical trees, plant ecology',
    'Royal Botanic Gardens, Kew — Honorary Research Associate',
    NULL,
    NULL
  ),
  (
    'a-prof-naomi',
    'prof-naomi',
    'Prof. Naomi',
    'Professor of Ecology',
    'Professor of ecology and biodiversity science. Research interests span community ecology, ecosystem services, and the long-form science journalism that makes peer-reviewed work readable to the public. Frequent contributor to global biodiversity assessments.',
    '/authors/prof-naomi.jpg',
    'Community ecology, biodiversity, ecosystem services, science communication',
    'Institute of Biodiversity & Ecosystem Studies',
    NULL,
    NULL
  ),
  (
    'a-matt-mclean',
    'matt-mclean',
    'Matt Mclean',
    'Editor & Science Writer',
    'Editor and long-form science writer at Wildlife.Universe. Covers explainer journalism on how and why wildlife systems work — predation, migration, communication, evolution — translating peer-reviewed research into reader-friendly narratives.',
    '/authors/matt-mclean.jpg',
    'Explainer journalism, science writing, evolution, animal behaviour',
    'Wildlife.Universe',
    NULL,
    'https://www.wildlifeuniverse.org'
  ),
  (
    'a-rachel-babu',
    'miss-rachel-babu',
    'Miss. Rachel Babu',
    'Herpetologist',
    'Herpetologist specialising in amphibian and reptile conservation. Fieldwork across South-East Asian rainforests and East African montane regions on chytrid fungus epidemiology, gecko taxonomy, and the conservation status of caecilians.',
    '/authors/miss-rachel-babu.jpg',
    'Herpetology, amphibians, reptiles, chytrid fungus, conservation',
    'Asian Herpetological Society',
    NULL,
    NULL
  ),
  (
    'a-romario-schwazentigger',
    'romario-schwazentigger',
    'Romario Schwazentigger',
    'Carnivore Specialist',
    'Carnivore biologist with field experience on grey wolves, leopards, hyaena clans, and the social ecology of large predators. Documentary fieldwork in the Carpathians, Yellowstone, and the Maasai Mara ecosystem.',
    '/authors/romario-schwazentigger.jpg',
    'Carnivores, wolves, big cats, predator ecology, large-mammal behaviour',
    'European Carnivore Initiative',
    NULL,
    NULL
  ),
  (
    'a-prof-attenborough-deann',
    'prof-attenborough-deann',
    'Prof. Attenborough Deann',
    'Natural History Professor',
    'Professor of natural history and documentary science. Decades of teaching and field experience covering vertebrate evolution, biogeography, and the long arc of life on Earth. Frequent contributor to broadcast natural-history features.',
    '/authors/prof-attenborough-deann.jpg',
    'Natural history, vertebrate evolution, biogeography, documentary science',
    'Department of Earth & Life Sciences',
    NULL,
    NULL
  ),
  (
    'a-nickson-mbaga',
    'nickson-mbaga',
    'Nickson Mbaga',
    'Conservation Reporter',
    'Reporter covering African conservation, community-led protected areas, and the human side of human-wildlife conflict. Tanzanian by training, with field reporting across the Kilimanjaro, Mara, and Selous ecosystems.',
    '/authors/nickson-mbaga.jpg',
    'African conservation, community conservation, human-wildlife conflict, protected areas',
    'East African Wildlife Society',
    NULL,
    NULL
  )
ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  title       = EXCLUDED.title,
  bio         = EXCLUDED.bio,
  photo_url   = EXCLUDED.photo_url,
  expertise   = EXCLUDED.expertise,
  affiliation = EXCLUDED.affiliation,
  twitter     = EXCLUDED.twitter,
  website     = EXCLUDED.website,
  updated_at  = NOW();

COMMENT ON TABLE authors IS
  'Named author personas. Driving signal for E-E-A-T: every published article emits this as the JSON-LD Person entity. Linked from posts.author_id.';
COMMENT ON COLUMN authors.expertise IS
  'Comma-separated topic areas. Surfaces on /author/<slug> profile pages and in Article JSON-LD as knowsAbout.';
COMMENT ON COLUMN authors.affiliation IS
  'Institution or organisation. Emitted as Person.alumniOf in Article JSON-LD for Google E-E-A-T credibility.';
