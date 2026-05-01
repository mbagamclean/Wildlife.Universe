'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ShareButton } from '@/components/ui/ShareButton';
import { db } from '@/lib/storage/db';
import { categories, labelSlug } from '@/lib/mock/categories';

/* ── Magazine-style card matching Image #5 ── */
function LabelPostCard({ post }) {
  const palette = post.coverPalette || { from: '#0c4a1a', via: '#3aa15a', to: '#d4af37' };
  const date = post.createdAt
    ? new Date(post.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';

  return (
    <Link href={`/posts/${post.slug}`} className="group flex flex-col overflow-hidden rounded-2xl bg-[var(--color-bg-deep)] border border-[var(--glass-border)] transition-all hover:border-[var(--glass-border)] hover:shadow-xl hover:shadow-black/10">
      {/* Cover image */}
      <div
        className="relative aspect-[16/10] overflow-hidden"
        style={{
          background: post.cover
            ? undefined
            : `linear-gradient(135deg, ${palette.from} 0%, ${palette.via} 55%, ${palette.to} 100%)`,
        }}
      >
        {post.cover && (
          typeof post.cover === 'string' ? (
            <img src={post.cover} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <img
              src={post.cover.sources?.[Math.max(0, (post.cover.sources?.length || 1) - 1)]?.src || ''}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )
        )}
        {/* Label chip over image */}
        {post.label && (
          <span className="absolute bottom-3 left-3 rounded-full bg-[#008000]/90 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur">
            {post.label}
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="mb-2 font-bold leading-snug text-[var(--color-fg)] line-clamp-3 group-hover:text-[var(--color-fg)]/90">
          {post.title}
        </h3>
        {post.description && (
          <p className="mb-4 flex-1 text-sm leading-relaxed text-[var(--color-fg-soft)] line-clamp-3">
            {post.description}
          </p>
        )}
        <div className="flex items-center justify-between text-xs text-[var(--color-fg-soft)]">
          <span>{date}</span>
          <div onClick={(e) => e.preventDefault()}>
            <ShareButton title={post.title} slug={post.slug} className="text-[var(--color-fg-soft)] hover:text-[var(--color-fg)]/70" />
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ── build ordered label list by relevance to current post ── */
function orderedLabels(currentPost) {
  const result = [];
  const seen   = new Set();

  const add = (catSlug, label) => {
    const key = `${catSlug}::${label}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push({ catSlug, label, catName: categories.find((c) => c.slug === catSlug)?.name || catSlug });
  };

  // 1. Current post's own label first
  if (currentPost.label) add(currentPost.category, currentPost.label);

  // 2. Other labels in same category
  const sameCat = categories.find((c) => c.slug === currentPost.category);
  if (sameCat) sameCat.labels.forEach((l) => add(currentPost.category, l));

  // 3. All other categories in order
  categories.forEach((cat) => {
    if (cat.slug === currentPost.category) return;
    cat.labels.forEach((l) => add(cat.slug, l));
  });

  return result;
}

export function PostLabelSections({ post }) {
  const [allPosts, setAllPosts] = useState([]);
  const [loaded, setLoaded]     = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all(categories.map((c) => db.posts.listByCategory(c.slug))).then((results) => {
      if (cancelled) return;
      setAllPosts(results.flat().filter((p) => p.slug !== post.slug));
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [post.slug]);

  if (!loaded) return null;

  const labelList = orderedLabels(post);

  /* group posts by label key */
  const postsByLabel = {};
  allPosts.forEach((p) => {
    if (!p.label) return;
    const key = `${p.category}::${p.label}`;
    if (!postsByLabel[key]) postsByLabel[key] = [];
    postsByLabel[key].push(p);
  });

  /* only show sections that have at least 1 post */
  const sections = labelList
    .map((item) => ({
      ...item,
      posts: (postsByLabel[`${item.catSlug}::${item.label}`] || []).slice(0, 3),
    }))
    .filter((s) => s.posts.length > 0);

  if (sections.length === 0) return null;

  return (
    <div className="space-y-16 pb-24">
      {sections.map(({ catSlug, label, catName, posts }) => (
        <section key={`${catSlug}-${label}`} className="border-t border-[var(--glass-border)] pt-12">
          <div className="mb-6 flex items-start justify-between gap-4">
            {/* Left: label tag + heading + subtitle */}
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#008000]">
                <span>◈ {label}</span>
                <span className="text-[var(--color-fg-soft)]">/</span>
                <span className="font-normal text-[var(--color-fg-soft)]">{catName}</span>
              </div>
              <h2 className="font-display text-2xl font-black text-[var(--color-fg)] sm:text-3xl">
                Inside {label}
              </h2>
              <p className="mt-1 text-sm text-[var(--color-fg-soft)]">
                The stories shaping {catName} — hand-picked for curious minds
              </p>
            </div>
            {/* Right: see all link */}
            <Link
              href={`/${catSlug}/${labelSlug(label)}`}
              className="shrink-0 flex items-center gap-1 text-sm font-medium text-[#008000] hover:underline"
            >
              See all in {label} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <LabelPostCard key={p.id} post={p} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
