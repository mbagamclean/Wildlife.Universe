'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, X, Clapperboard } from 'lucide-react';
import { db } from '@/lib/storage/db';
import { Container } from '@/components/ui/Container';
import { VideoPlayer } from '@/components/ui/VideoPlayer';

function resolveCoverSrc(cover) {
  if (!cover) return null;
  if (typeof cover === 'string') return cover;
  const sources = cover.sources;
  if (!sources?.length) return null;
  return sources[sources.length - 1]?.src || null;
}

export function ShortsSection() {
  const [shorts, setShorts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Carousel scrolling for the main track
  const trackRef = useRef(null);
  
  // Immersive active viewer state
  const [activeIndex, setActiveIndex] = useState(null);

  useEffect(() => {
    db.posts.list().then((all) => {
      // Mocking short form video data by shuffling and adding placeholder videos if needed
      const filtered = [...all].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const mapped = filtered.slice(0, 10).map((p, i) => ({
        ...p,
        id: `short_${p.id}`
      }));
      setShorts(mapped);
      setLoading(false);
    });
  }, []);

  const openViewer = (index) => setActiveIndex(index);
  const closeViewer = () => setActiveIndex(null);

  useEffect(() => {
    document.body.style.overflow = activeIndex !== null ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [activeIndex]);

  useEffect(() => {
    if (activeIndex === null) return;
    const onKey = (e) => { if (e.key === 'Escape') closeViewer(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [activeIndex]);

  const nextVideo = () => {
    if (activeIndex !== null && activeIndex < shorts.length - 1) setActiveIndex(activeIndex + 1);
  };

  const prevVideo = () => {
    if (activeIndex !== null && activeIndex > 0) setActiveIndex(activeIndex - 1);
  };

  const scrollLeft = () => {
    trackRef.current?.scrollBy({ left: -320, behavior: 'smooth' });
  };

  const scrollRight = () => {
    trackRef.current?.scrollBy({ left: 320, behavior: 'smooth' });
  };

  if (loading || shorts.length === 0) return null;

  return (
    <section className="relative py-16 md:py-24" style={{ background: 'var(--color-bg)' }}>
      <Container>
        <div className="mb-10 flex items-end justify-between">
          <div>
             <span className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-pink-500">
               <Clapperboard className="h-3.5 w-3.5" />
               Reels & Shorts
             </span>
             <h2 className="font-display text-3xl font-black leading-tight tracking-tight text-[var(--color-fg)] sm:text-4xl">
               Wildlife Universe Shorts
             </h2>
             <p className="mt-3 text-sm text-[var(--color-fg-soft)] sm:text-base">
               Watch quick, immersive wildlife moments
             </p>
          </div>
          <div className="hidden gap-3 md:flex">
             <button onClick={scrollLeft} className="glass flex h-11 w-11 items-center justify-center rounded-full hover:scale-110 active:scale-95 transition-all">
               <ChevronLeft className="h-5 w-5 text-[var(--color-fg)]" />
             </button>
             <button onClick={scrollRight} className="glass flex h-11 w-11 items-center justify-center rounded-full hover:scale-110 active:scale-95 transition-all">
               <ChevronRight className="h-5 w-5 text-[var(--color-fg)]" />
             </button>
          </div>
        </div>

        {/* Carousel Track */}
        <div className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-12 bg-gradient-to-r from-[var(--color-bg)] to-transparent sm:w-20" />
          <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-12 bg-gradient-to-l from-[var(--color-bg)] to-transparent sm:w-20" />
          
          <div ref={trackRef} className="wu-no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-8 pt-4">
            {shorts.map((short, i) => {
              const coverSrc = resolveCoverSrc(short.cover);
              return (
                <div 
                  key={short.id}
                  onClick={() => openViewer(i)}
                  className="group relative flex shrink-0 cursor-pointer snap-center flex-col overflow-hidden rounded-[1.5rem] shadow-lg transition-transform duration-300 hover:-translate-y-2 hover:shadow-xl sm:w-[220px]"
                  style={{ aspectRatio: '9/16', width: 'clamp(180px, 50vw, 240px)' }}
                >
                  {coverSrc ? (
                    <img src={coverSrc} alt={short.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  ) : (
                    <div className="absolute inset-0 bg-gray-800" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
                  
                  {/* Play Icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-md transition-transform duration-300 group-hover:scale-110">
                       <Play className="ml-1 h-6 w-6 text-white" fill="white" />
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-4">
                     <h3 className="line-clamp-2 text-sm font-bold text-white md:text-base" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                       {short.title}
                     </h3>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Container>

      {/* Immersive Active Viewer Modal */}
      <AnimatePresence>
        {activeIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-xl"
            onClick={closeViewer}
          >
             {/* Header Controls */}
             <div className="absolute left-0 right-0 top-0 z-50 flex items-center justify-between p-6" onClick={(e) => e.stopPropagation()}>
                <span className="text-sm font-bold tracking-widest text-white/50 uppercase">
                  Shorts Viewer
                </span>
                <button onClick={closeViewer} className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
                  <X className="h-6 w-6" />
                </button>
             </div>

             {/* Main Video Viewport */}
             <div className="relative flex flex-1 items-center justify-center overflow-hidden py-10" onClick={(e) => e.stopPropagation()}>
                {/* Previous Prev Button */}
                {activeIndex > 0 && (
                  <button onClick={prevVideo} className="absolute left-4 md:left-12 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-all hover:scale-110 hover:bg-white/20">
                     <ChevronLeft className="h-8 w-8" />
                  </button>
                )}

                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={activeIndex}
                    initial={{ scale: 0.8, opacity: 0, x: 100 }}
                    animate={{ scale: 1, opacity: 1, x: 0 }}
                    exit={{ scale: 0.8, opacity: 0, x: -100 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="relative w-full max-w-[50vh] rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {shorts[activeIndex]?.videoUrl || shorts[activeIndex]?.video ? (
                      <VideoPlayer
                        src={shorts[activeIndex].videoUrl || shorts[activeIndex].video}
                        poster={resolveCoverSrc(shorts[activeIndex].cover)}
                        aspectRatio="9/16"
                        rounded={false}
                        showBadge
                      />
                    ) : (
                      <div className="relative bg-gray-900" style={{ aspectRatio: '9/16' }}>
                        {resolveCoverSrc(shorts[activeIndex]?.cover) && (
                          <img
                            src={resolveCoverSrc(shorts[activeIndex].cover)}
                            alt={shorts[activeIndex]?.title}
                            className="absolute inset-0 h-full w-full object-cover blur-sm brightness-50"
                          />
                        )}
                        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-8 text-center">
                          <Play className="mb-4 h-16 w-16 text-white/80" fill="currentColor" />
                          <h2 className="text-xl font-bold text-white">{shorts[activeIndex]?.title}</h2>
                          <p className="mt-2 text-xs text-gray-400">Add a videoUrl field to play</p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Next Button */}
                {activeIndex < shorts.length - 1 && (
                  <button onClick={nextVideo} className="absolute right-4 md:right-12 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-all hover:scale-110 hover:bg-white/20">
                     <ChevronRight className="h-8 w-8" />
                  </button>
                )}
             </div>

             {/* Bottom Navigation Ribbon */}
             <div className="flex h-32 w-full shrink-0 items-center justify-center gap-3 overflow-x-auto bg-gradient-to-t from-black to-transparent px-6 pb-6 wu-no-scrollbar" onClick={(e) => e.stopPropagation()}>
                {shorts.map((short, idx) => {
                  const offset = idx - activeIndex;
                  if (Math.abs(offset) > 2) return null; // Show only 2 prev and 2 next

                  const isCenter = offset === 0;
                  return (
                    <motion.div
                      key={`nav_${short.id}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: isCenter ? 1 : 0.5, y: 0, scale: isCenter ? 1.1 : 0.9 }}
                      onClick={() => setActiveIndex(idx)}
                      className={`relative shrink-0 cursor-pointer overflow-hidden rounded-xl bg-gray-800 transition-all hover:opacity-100 ${isCenter ? 'ring-2 ring-white z-10' : ''}`}
                      style={{ height: '80px', aspectRatio: '9/16' }}
                    >
                       {resolveCoverSrc(short.cover) && (
                         <img src={resolveCoverSrc(short.cover)} className="h-full w-full object-cover" alt="" />
                       )}
                    </motion.div>
                  )
                })}
             </div>
          </motion.div>
        )}
      </AnimatePresence>

    </section>
  );
}
