'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, Film, X } from 'lucide-react';
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

export function DocumentariesSection() {
  const [docs, setDocs] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Immersive viewer state
  const [viewerOpen, setViewerOpen] = useState(false);

  useEffect(() => {
    db.posts.list().then((all) => {
      // Mock documentary data
      const filtered = [...all].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const mapped = filtered.slice(0, 8).map((p, i) => ({
        ...p,
        id: `doc_${p.id}`
      }));
      setDocs(mapped);
      if (mapped.length > 0) setActiveIndex(Math.floor(mapped.length / 2));
      setLoading(false);
    });
  }, []);

  const handleNext = () => {
    if (activeIndex < docs.length - 1) setActiveIndex(activeIndex + 1);
  };

  const handlePrev = () => {
    if (activeIndex > 0) setActiveIndex(activeIndex - 1);
  };

  const handleDragEnd = (_, info) => {
    const swipeThreshold = 50;
    if (info.offset.x > swipeThreshold) handlePrev();
    else if (info.offset.x < -swipeThreshold) handleNext();
  };

  const openPlayer = () => setViewerOpen(true);
  const closePlayer = () => setViewerOpen(false);

  useEffect(() => {
    document.body.style.overflow = viewerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [viewerOpen]);

  useEffect(() => {
    if (!viewerOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') closePlayer(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [viewerOpen]);

  if (loading || docs.length === 0) return null;

  return (
    <section className="relative overflow-hidden py-16 md:py-24 transition-colors duration-500" style={{ background: 'var(--color-bg)' }}>
      
      {/* Background glow adapts softly to light/dark mode */}
      <div className="absolute inset-0 z-0 transition-colors duration-[1000ms] opacity-30 dark:opacity-20" style={{
         background: docs[activeIndex]?.coverPalette 
           ? `radial-gradient(ellipse at 50% 50%, ${docs[activeIndex].coverPalette.from}30 0%, transparent 70%)` 
           : 'none'
      }} />

      <Container className="relative z-10">
        <div className="mb-14 text-center" style={{ animation: 'wu-fadeUp 0.5s ease-out both' }}>
          <span className="mb-3 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#e50914] dark:text-[#ff3b30]">
            <Film className="h-3.5 w-3.5" />
            Originals
          </span>
          <h2 className="font-display text-3xl font-black leading-tight tracking-tight text-[var(--color-fg)] sm:text-4xl md:text-5xl">
            Wildlife Documentaries
          </h2>
          <p className="mt-3 text-sm text-[var(--color-fg-soft)] sm:text-base">
            Watch premium long-form wildlife stories
          </p>
        </div>
      </Container>

      {/* Cinematic 16:9 Cover Flow Area */}
      <div className="relative z-10 mx-auto flex h-[350px] sm:h-[450px] md:h-[550px] w-full max-w-[1800px] items-center justify-center overflow-hidden">
        
        {/* Left/Right Strong Edge Fades (Theme Aware) */}
        <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-40 w-16 md:w-48 transition-all" style={{ background: 'linear-gradient(to right, var(--color-bg) 0%, transparent 100%)' }} />
        <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-40 w-16 md:w-48 transition-all" style={{ background: 'linear-gradient(to left, var(--color-bg) 0%, transparent 100%)' }} />

        {/* Global Navigation Chevrons */}
        {activeIndex > 0 && (
           <button 
             onClick={handlePrev} 
             className="absolute left-2 md:left-12 z-50 flex h-12 w-12 md:h-14 md:w-14 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 dark:bg-black/50 text-white backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-black/60 focus:outline-none"
             style={{ border: '1px solid rgba(255,255,255,0.15)' }}
           >
             <ChevronLeft className="h-6 w-6 md:h-8 md:w-8" />
           </button>
        )}
        
        {activeIndex < docs.length - 1 && (
           <button 
             onClick={handleNext} 
             className="absolute right-2 md:right-12 z-50 flex h-12 w-12 md:h-14 md:w-14 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 dark:bg-black/50 text-white backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-black/60 focus:outline-none"
             style={{ border: '1px solid rgba(255,255,255,0.15)' }}
           >
             <ChevronRight className="h-6 w-6 md:h-8 md:w-8" />
           </button>
        )}

        {/* The Carousel Items */}
        <div className="relative flex h-full w-full items-center justify-center">
          <AnimatePresence initial={false} mode="popLayout">
            {docs.map((doc, index) => {
              const offset = index - activeIndex;
              const absOffset = Math.abs(offset);
              const isCenter = offset === 0;

              if (absOffset > 3) return null;

              const direction = Math.sign(offset);
              
              // 16:9 responsive spread
              const xDesktop = direction * (absOffset === 1 ? 550 : absOffset === 2 ? 900 : 1200);
              const xMobile = direction * (absOffset === 1 ? 250 : absOffset === 2 ? 400 : 500);

              const coverSrc = resolveCoverSrc(doc.cover);

              return (
                <motion.div
                  key={doc.id}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.4}
                  onDragEnd={handleDragEnd}
                  onClick={() => {
                    if (!isCenter) setActiveIndex(index);
                    else openPlayer();
                  }}
                  className={`absolute flex cursor-pointer flex-col overflow-hidden rounded-2xl md:rounded-[2rem] shadow-2xl ${isCenter ? 'ring-2 ring-[var(--color-primary)]/50' : ''}`}
                  style={{
                    width: 'clamp(300px, 75vw, 800px)',
                    aspectRatio: '16/9',
                    background: 'var(--color-bg-deep)',
                  }}
                  animate={{
                    x: `clamp(${xMobile}px, ${xDesktop}px, ${xDesktop}px)`,
                    scale: 1 - absOffset * 0.12,
                    opacity: 1 - absOffset * 0.35,
                    zIndex: 30 - absOffset,
                    filter: `blur(${absOffset * 1.5}px) brightness(${isCenter ? 1 : 0.4})`,
                  }}
                  transition={{ type: 'spring', stiffness: 200, damping: 25, mass: 1 }}
                >
                  <div className="relative h-full w-full group">
                    {/* Media Cover */}
                    {coverSrc ? (
                      <img src={coverSrc} alt={doc.title} className="h-full w-full object-cover transition-transform duration-[1500ms] group-hover:scale-105" />
                    ) : (
                      <div className="h-full w-full bg-slate-800" />
                    )}

                    {/* Dark gradient overlay so text is readable */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />

                    {/* Play Icon Pulse in center */}
                    {isCenter && (
                      <div className="absolute inset-0 flex items-center justify-center">
                         <div className="flex flex-col items-center gap-3 transition-transform duration-300 group-hover:scale-110">
                           <div className="flex h-16 w-16 md:h-24 md:w-24 items-center justify-center rounded-full bg-black/40 backdrop-blur-md shadow-[0_0_30px_rgba(255,255,255,0.15)] ring-1 ring-white/20">
                             <Play className="ml-1 md:ml-2 h-8 w-8 md:h-12 md:w-12 text-white" fill="white" />
                           </div>
                           <span className="bg-black/60 px-3 py-1 rounded backdrop-blur text-[10px] uppercase font-bold text-white tracking-widest leading-none">
                             Watch Now
                           </span>
                         </div>
                      </div>
                    )}

                    {/* Content Layer at bottom */}
                    <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end p-4 md:p-8 text-center">
                       <h3 className="font-display text-xl md:text-4xl font-black leading-tight text-white mb-2 line-clamp-1 md:line-clamp-2" style={{ textShadow: '0 4px 12px rgba(0,0,0,0.8)' }}>
                         {doc.title}
                       </h3>
                       {isCenter && (
                         <motion.p 
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           className="hidden md:block text-sm text-gray-300 line-clamp-2 max-w-[80%]"
                         >
                           {doc.description}
                         </motion.p>
                       )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Video Player Modal */}
      <AnimatePresence>
        {viewerOpen && (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             transition={{ duration: 0.25, ease: 'easeOut' }}
             className="fixed inset-0 z-[200] flex items-center justify-center bg-[var(--color-bg)]/95 backdrop-blur-2xl p-4 sm:p-8"
             onClick={closePlayer}
           >
              <button onClick={closePlayer} className="absolute right-6 top-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-black/20 dark:bg-white/10 text-[var(--color-fg)] transition-all hover:scale-110 active:scale-95">
                 <X className="h-6 w-6" />
              </button>

              <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 40 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 40 }}
                transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                className="relative w-full max-w-[1200px]"
                onClick={(e) => e.stopPropagation()}
              >
                {docs[activeIndex]?.videoUrl || docs[activeIndex]?.video ? (
                  <VideoPlayer
                    src={docs[activeIndex].videoUrl || docs[activeIndex].video}
                    poster={resolveCoverSrc(docs[activeIndex].cover)}
                    rounded
                    showBadge
                  />
                ) : (
                  <div
                    className="overflow-hidden rounded-2xl bg-black shadow-[0_0_60px_rgba(0,0,0,0.5)] ring-1 ring-white/10"
                    style={{ aspectRatio: '16/9' }}
                  >
                    {resolveCoverSrc(docs[activeIndex]?.cover) && (
                      <img src={resolveCoverSrc(docs[activeIndex].cover)} alt="" className="absolute inset-0 h-full w-full object-cover blur-sm brightness-[0.25]" />
                    )}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-10">
                      <Play className="mb-6 h-20 w-20 text-white/50" fill="currentColor" />
                      <h2 className="text-2xl font-bold text-white mb-2">{docs[activeIndex]?.title}</h2>
                      <p className="text-gray-400 text-sm">No video URL set — add a videoUrl field to this post</p>
                    </div>
                  </div>
                )}
              </motion.div>
           </motion.div>
        )}
      </AnimatePresence>

    </section>
  );
}
