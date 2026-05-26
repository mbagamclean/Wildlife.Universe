import { HeroOrchestrator } from '@/components/hero/HeroOrchestrator';
import { Container } from '@/components/ui/Container';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { FadeOnScroll } from '@/components/ui/FadeOnScroll';
import { LatestPostsSection } from '@/components/posts/LatestPostsSection';
import { LatestAnimalsSection } from '@/components/animals/LatestAnimalsSection';
import { TrendingSection } from '@/components/posts/TrendingSection';
import { LatestPlantsSection } from '@/components/plants/LatestPlantsSection';
import { IUCNSection } from '@/components/iucn/IUCNSection';
import { LatestBirdsSection } from '@/components/birds/LatestBirdsSection';
import { LatestInsectsSection } from '@/components/insects/LatestInsectsSection';
import { LatestTourismSection } from '@/components/posts/LatestTourismSection';
import { LatestConservationSection } from '@/components/posts/LatestConservationSection';
import { LatestArticlesSection } from '@/components/posts/LatestArticlesSection';
import { WhyHowSection } from '@/components/posts/WhyHowSection';
import { BooksSection } from '@/components/posts/BooksSection';
import { HomepageVideosSection } from '@/components/posts/HomepageVideosSection';
import { ShortsSection } from '@/components/posts/ShortsSection';
import { DocumentariesSection } from '@/components/posts/DocumentariesSection';
import {
  fetchAllCategoriesRich,
  fetchActiveHeroSlides,
  fetchHeroMode,
  fetchPublishedPosts,
  fetchPublishedPostsByCategory,
  fetchIUCNGrouped,
  fetchTrendingPosts,
  fetchPublishedPostsByLabels,
  fetchHowWhyPosts,
  fetchCuratedBooks,
  fetchApprovedReviews,
  fetchHomepageVideos,
} from '@/lib/seo-data';
import { ReviewsSection } from '@/components/reviews/ReviewsSection';
import { categories } from '@/lib/mock/categories';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { buildHomeMetadata } from '@/lib/seo';

export const metadata = buildHomeMetadata();

// Re-render the homepage at most once a minute so admin-uploaded
// category hero images surface without a redeploy. Admin saves call
// revalidatePath('/') for instant updates; this is the safety net.
export const revalidate = 60;

/* Per-category visual identity */
const CAT_META = {
  animals: {
    description: 'Mammals, reptiles, amphibians & more',
    gradient: 'linear-gradient(145deg, #061206 0%, #1a4a10 52%, #3d7a28 100%)',
    accent: '#5dc23a',
    highlight: 'rgba(93,194,58,0.18)',
  },
  plants: {
    description: 'Trees, shrubs, herbs & rare flora',
    gradient: 'linear-gradient(145deg, #031408 0%, #0c3a18 52%, #2a7048 100%)',
    accent: '#3ab860',
    highlight: 'rgba(58,184,96,0.18)',
  },
  birds: {
    description: 'Raptors, songbirds & waterfowl',
    gradient: 'linear-gradient(145deg, #040a1c 0%, #0f2550 52%, #2a5090 100%)',
    accent: '#4a90d8',
    highlight: 'rgba(74,144,216,0.18)',
  },
  insects: {
    description: 'Arthropods, molluscs & invertebrates',
    gradient: 'linear-gradient(145deg, #150900 0%, #3c2000 52%, #7a4a10 100%)',
    accent: '#c88020',
    highlight: 'rgba(200,128,32,0.18)',
  },
  posts: {
    description: 'Conservation, tourism & wildlife stories',
    gradient: 'linear-gradient(145deg, #040d10 0%, #0f2a35 52%, #1a5060 100%)',
    accent: '#30a0b8',
    highlight: 'rgba(48,160,184,0.18)',
  },
};

export default async function HomePage() {
  // Server-render the homepage's data so the LCP element (hero) and
  // the category grid are present in the initial HTML payload. This
  // eliminates the green-gradient placeholder that previously painted
  // until Supabase resolved client-side.
  // Every homepage section used to client-fetch its own data after mount,
  // leaving users staring at skeletons. Server-fetch in parallel and pass
  // via initial props so the first HTML response already contains all the
  // section content. All fetches use slim card-projection to keep the
  // payload bounded (full bodies aren't needed for card displays).
  const [
    richCategories,
    heroSlides,
    heroMode,
    latestPosts,
    latestAnimals,
    latestPlants,
    iucnGrouped,
    trendingPosts,
    latestBirds,
    latestInsects,
    whyHowPosts,
    latestArticles,
    latestConservation,
    latestTourism,
    curatedBooks,
    approvedReviews,
    featuredVideos,
    shortsVideos,
    documentariesVideos,
  ] = await Promise.all([
    fetchAllCategoriesRich(),
    fetchActiveHeroSlides(),
    fetchHeroMode(),
    fetchPublishedPosts({ slim: true, limit: 60 }),
    fetchPublishedPostsByCategory('animals', { slim: true, limit: 40 }),
    fetchPublishedPostsByCategory('plants', { slim: true, limit: 40 }),
    fetchIUCNGrouped({ slim: true }),
    fetchTrendingPosts({ limit: 6, slim: true }),
    fetchPublishedPostsByCategory('birds', { slim: true, limit: 40 }),
    fetchPublishedPostsByCategory('insects', { slim: true, limit: 40 }),
    fetchHowWhyPosts({ limit: 20, slim: true }),
    fetchPublishedPostsByLabels(['articles', 'article'], { limit: 12, slim: true }),
    fetchPublishedPostsByLabels(['conservation'], { limit: 6, slim: true }),
    fetchPublishedPostsByLabels(['tourism', 'tourism safaris'], { limit: 12, slim: true }),
    fetchCuratedBooks({ slim: true }),
    fetchApprovedReviews({ limit: 20 }),
    fetchHomepageVideos('featured', { limit: 6 }),
    fetchHomepageVideos('shorts', { limit: 12 }),
    fetchHomepageVideos('documentaries', { limit: 8 }),
  ]);
  const richBySlug = new Map(richCategories.map((c) => [c.slug, c]));

  return (
    <>
      <div className="-mt-16">
        <HeroOrchestrator initialSlides={heroSlides} initialMode={heroMode} />
      </div>

      {/* ── Latest Posts — fade up. priority: above-the-fold, skip
              opacity:0 gate so server-rendered content paints
              immediately. ─────────────────────────────────────── */}
      <ScrollReveal effect="fadeUp" priority>
        <LatestPostsSection initialPosts={latestPosts} />
      </ScrollReveal>

      {/* ── Explore Our Categories — zoom in + stagger cards ─ */}
      <ScrollReveal effect="zoomIn">
        <section className="relative py-14 md:py-16" style={{ background: 'var(--color-bg)' }}>
          <Container>
            {/* Header */}
            <div className="mb-10 text-center">
              <h2 className="font-display text-3xl font-black leading-tight tracking-tight text-[var(--color-fg)] sm:text-4xl md:text-5xl">
                Explore Our Categories
              </h2>
              <p className="mt-3 text-sm text-[var(--color-fg-soft)] sm:text-base">
                Dive into the species and ecosystems that shape our planet
              </p>
            </div>

            {/* Cards — stagger in via CSS once parent is revealed */}
            <div className="flex flex-wrap justify-center gap-5">
              {categories.map((c, idx) => {
                const meta = CAT_META[c.slug] || CAT_META.posts;
                const rich = richBySlug.get(c.slug);
                // Prefer the admin-uploaded hero (high-res banner) for
                // the larger 16:10 card; fall back to the thumbnail or
                // the gradient stack when nothing is uploaded yet.
                const cardImage = rich?.heroImageUrl || rich?.thumbnailUrl || null;
                const description = rich?.shortDescription?.trim() || meta.description;
                return (
                  <Link
                    key={c.slug}
                    href={`/${c.slug}`}
                    prefetch
                    className="wu-stagger-item group relative block w-full overflow-hidden rounded-2xl sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)]"
                    style={{ aspectRatio: '16/10' }}
                  >
                    {cardImage ? (
                      <Image
                        src={cardImage}
                        alt={rich?.imageAlt || c.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        priority={idx < 2}
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.06]"
                      />
                    ) : (
                      <>
                        {/* Background gradient */}
                        <div
                          className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.06]"
                          style={{ background: meta.gradient }}
                        />

                        {/* Radial highlight */}
                        <div
                          className="absolute inset-0 opacity-60 transition-opacity duration-500 group-hover:opacity-40"
                          style={{
                            backgroundImage: `
                              radial-gradient(ellipse at 25% 20%, rgba(255,255,255,0.22) 0%, transparent 50%),
                              radial-gradient(ellipse at 75% 80%, ${meta.highlight} 0%, transparent 50%)
                            `,
                          }}
                        />
                      </>
                    )}

                    {/* Cinematic bottom scrim */}
                    <div
                      className="absolute inset-0 transition-opacity duration-500 group-hover:opacity-90"
                      style={{
                        background:
                          'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.08) 100%)',
                      }}
                    />

                    {/* Hover darkening */}
                    <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-400 group-hover:bg-black/15" />

                    {/* Content */}
                    <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
                      <h3
                        className="font-display text-xl font-black leading-tight text-white md:text-2xl"
                        style={{ textShadow: '0 2px 10px rgba(0,0,0,0.6)' }}
                      >
                        {c.name}
                      </h3>
                      <p className="mt-1 text-sm text-white/70">{description}</p>

                      <div className="mt-4">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white transition-all duration-300 group-hover:gap-2.5"
                          style={{
                            background: `${meta.accent}28`,
                            border: `1.5px solid ${meta.accent}55`,
                            backdropFilter: 'blur(8px)',
                          }}
                        >
                          Explore
                          <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </div>

                    {/* Hover glow ring */}
                    <div
                      className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                      style={{ boxShadow: `inset 0 0 0 1.5px ${meta.accent}55` }}
                    />
                  </Link>
                );
              })}
            </div>
          </Container>
        </section>
      </ScrollReveal>

      {/* ── Latest Animals — slide in from left. priority. ── */}
      <ScrollReveal effect="slideLeft" priority>
        <LatestAnimalsSection initialAnimals={latestAnimals} />
      </ScrollReveal>

      {/* ── Trending — zoom + fade. priority. ──────────────── */}
      <ScrollReveal effect="zoomIn" priority>
        <TrendingSection initialTrending={trendingPosts} />
      </ScrollReveal>

      {/* ── Latest Plants — slide in from right. priority. ── */}
      <ScrollReveal effect="slideRight" priority>
        <LatestPlantsSection initialPlants={latestPlants} />
      </ScrollReveal>

      {/* ── IUCN — blur in (clarity into focus). priority. ── */}
      <ScrollReveal effect="blurIn" priority>
        <IUCNSection initialGrouped={iucnGrouped} />
      </ScrollReveal>

      {/* ── Latest Birds — flip up (taking flight). priority. ── */}
      <ScrollReveal effect="flipUp" priority>
        <LatestBirdsSection initialBirds={latestBirds} />
      </ScrollReveal>

      {/* ── Why / How — slide from left. priority. ────────── */}
      <ScrollReveal effect="slideLeft" priority>
        <WhyHowSection initialPosts={whyHowPosts} />
      </ScrollReveal>

      {/* ── Latest Insects — flip up. priority. ────────────── */}
      <FadeOnScroll>
        <ScrollReveal effect="flipUp" priority>
          <LatestInsectsSection initialInsects={latestInsects} />
        </ScrollReveal>
      </FadeOnScroll>

      {/* ── Featured Videos (curated via /admin/configuration/homepage-videos). priority. ── */}
      <ScrollReveal effect="fadeUp" priority>
        <HomepageVideosSection
          section="featured"
          heading="Featured Videos"
          subheading="Hand-picked stories from across YouTube, Vimeo, TikTok, Instagram and more"
          accent="#dc2626"
          maxItems={6}
          initialVideos={featuredVideos}
        />
      </ScrollReveal>

      {/* ── Books — CEO-curated only via book_status. priority. ─── */}
      <ScrollReveal effect="riseScale" priority>
        <BooksSection initialBooks={curatedBooks} />
      </ScrollReveal>

      {/* ── Latest Articles — slide right. priority. ───────── */}
      <FadeOnScroll>
        <ScrollReveal effect="slideRight" priority>
          <LatestArticlesSection initialPosts={latestArticles} />
        </ScrollReveal>
      </FadeOnScroll>

      {/* ── Shorts — modal viewer over horizontal carousel. priority. ── */}
      <ScrollReveal effect="bounceUp" priority>
        <ShortsSection
          section="shorts"
          heading="Shorts"
          subheading="Vertical wildlife moments from creators around the world"
          maxItems={12}
          initialShorts={shortsVideos}
        />
      </ScrollReveal>

      {/* ── Latest Tourism Posts — slide right. priority. ── */}
      <FadeOnScroll>
        <ScrollReveal effect="slideRight" priority>
          <LatestTourismSection initialPosts={latestTourism} />
        </ScrollReveal>
      </FadeOnScroll>

      {/* ── Documentaries — cinematic cover-flow carousel. priority. ── */}
      <ScrollReveal effect="fadeUp" priority>
        <DocumentariesSection initialDocs={documentariesVideos} />
      </ScrollReveal>

      {/* ── Latest Conservation Posts — fade up. priority. ── */}
      <FadeOnScroll>
        <ScrollReveal effect="fadeUp" priority>
          <LatestConservationSection initialPosts={latestConservation} />
        </ScrollReveal>
      </FadeOnScroll>

      {/* ── Reader reviews — last block before footer. priority. ── */}
      <ScrollReveal effect="fadeUp" priority>
        <ReviewsSection initialReviews={approvedReviews} />
      </ScrollReveal>
    </>
  );
}
