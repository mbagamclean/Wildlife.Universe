'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Video, Play } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { VideoPlayer } from '@/components/ui/VideoPlayer';
import { db } from '@/lib/storage/db';

/**
 * Curated video grid that pulls from the homepage_videos Supabase table.
 * Renders nothing if the table is missing, empty, or the section has no
 * active rows — so the homepage degrades gracefully before migration 006
 * is run.
 */
export function HomepageVideosSection({ section = 'featured', heading, subheading, accent = '#dc2626', maxItems = 6 }) {
  const [videos, setVideos] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    db.homepageVideos
      .list({ section })
      .then((rows) => {
        if (!cancelled) {
          setVideos((rows || []).slice(0, maxItems));
          setReady(true);
        }
      })
      .catch(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, [section, maxItems]);

  if (!ready || videos.length === 0) return null;

  const cols = section === 'shorts' ? 4 : section === 'documentaries' ? 2 : 3;

  return (
    <section className="relative py-14 md:py-16" style={{ background: 'var(--color-bg)' }}>
      <Container>
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest" style={{ color: accent }}>
              <span className="h-3 w-1 rounded-full" style={{ background: accent }} />
              <Video size={11} /> {section}
            </p>
            <h2 className="font-display text-3xl font-black leading-tight tracking-tight text-[var(--color-fg)] sm:text-4xl">
              {heading || 'Featured Videos'}
            </h2>
            {subheading && (
              <p className="mt-2 text-sm text-[var(--color-fg-soft)] sm:text-base">{subheading}</p>
            )}
          </div>
          <span className="hidden text-sm font-semibold sm:inline-flex" style={{ color: 'var(--color-fg-soft)' }}>
            {videos.length} {videos.length === 1 ? 'video' : 'videos'}
          </span>
        </div>

        <div
          className="grid gap-5"
          style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${cols === 4 ? 240 : cols === 2 ? 460 : 320}px, 1fr))` }}
        >
          {videos.map((v, i) => (
            <motion.article
              key={v.id}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
              className="group relative flex flex-col overflow-hidden rounded-2xl"
              style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
            >
              <div style={{ background: '#000' }}>
                <VideoPlayer
                  src={v.sourceUrl}
                  poster={v.thumbnail || null}
                  title={v.title || 'Video'}
                />
              </div>
              {(v.title || v.description) && (
                <div className="p-4">
                  {v.title && (
                    <h3 className="font-display text-base font-bold leading-tight text-[var(--color-fg)]">
                      {v.title}
                    </h3>
                  )}
                  {v.description && (
                    <p className="mt-1.5 line-clamp-2 text-sm text-[var(--color-fg-soft)]">
                      {v.description}
                    </p>
                  )}
                </div>
              )}
            </motion.article>
          ))}
        </div>
      </Container>
    </section>
  );
}
