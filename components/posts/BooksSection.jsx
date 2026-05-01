'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, BookOpen, ShoppingBag, BookMarked } from 'lucide-react';
import { db } from '@/lib/storage/db';
import { Container } from '@/components/ui/Container';

function resolveCoverSrc(cover) {
  if (!cover) return null;
  if (typeof cover === 'string') return cover;
  const sources = cover.sources;
  if (!sources?.length) return null;
  return sources[sources.length - 1]?.src || null;
}

export function BooksSection() {
  const [items, setItems] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);

  useEffect(() => {
    db.posts.list().then((all) => {
      // Mock data processing for books & premium articles
      const filtered = [...all].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      // Transform a subset into our immersive "books vs articles"
      const mapped = filtered.slice(0, 8).map((p, i) => ({
        ...p,
        isBook: i % 2 === 0, // Alternate between books and articles
        price: i % 3 === 0 ? 0 : 24.99, // Some free, some paid
        id: `lib_${p.id}`
      }));
      setItems(mapped);
      if (mapped.length > 0) {
        setActiveIndex(Math.floor(mapped.length / 2)); // start in the middle
      }
      setLoading(false);
    });
  }, []);

  const handleNext = () => {
    if (activeIndex < items.length - 1) setActiveIndex(activeIndex + 1);
  };

  const handlePrev = () => {
    if (activeIndex > 0) setActiveIndex(activeIndex - 1);
  };

  const handleDragEnd = (_, info) => {
    const swipeThreshold = 50;
    if (info.offset.x > swipeThreshold) {
      handlePrev();
    } else if (info.offset.x < -swipeThreshold) {
      handleNext();
    }
  };

  if (loading || items.length === 0) return null;

  return (
    <section className="relative overflow-hidden py-16 md:py-24" style={{ background: '#050a0a' }}>
      
      {/* Background Cinematic Glow based on central item palette */}
      <div className="absolute inset-0 z-0 transition-colors duration-[1000ms]" style={{
         background: items[activeIndex]?.coverPalette 
           ? `radial-gradient(circle at 50% 50%, ${items[activeIndex].coverPalette.from}20 0%, transparent 60%)` 
           : 'none'
      }} />

      <Container className="relative z-10">
        <div className="mb-14 text-center" style={{ animation: 'wu-fadeUp 0.5s ease-out both' }}>
          <span className="mb-3 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-widest text-emerald-400">
            <BookMarked className="h-3.5 w-3.5" />
            Library & Market
          </span>
          <h2 className="font-display text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
            Wildlife Books &amp; Articles
          </h2>
          <p className="mt-3 text-sm text-gray-400 sm:text-base">
            Premium publications to fuel your curiosity
          </p>
        </div>
      </Container>

      {/* Cinematic Cover Flow Area */}
      <div 
        ref={containerRef}
        className="relative z-10 mx-auto flex h-[580px] md:h-[600px] w-full max-w-[1600px] items-center justify-center overflow-hidden"
      >
        {/* Left/Right Strong Edge Fades */}
        <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-40 w-16 md:w-48" style={{ background: 'linear-gradient(to right, #050a0a 0%, transparent 100%)' }} />
        <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-40 w-16 md:w-48" style={{ background: 'linear-gradient(to left, #050a0a 0%, transparent 100%)' }} />

        {/* Global Navigation Chevrons */}
        {activeIndex > 0 && (
           <button 
             onClick={handlePrev} 
             className="absolute left-2 md:left-12 z-50 flex h-10 w-10 md:h-14 md:w-14 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-black/60 focus:outline-none"
             style={{ border: '1px solid rgba(255,255,255,0.1)' }}
             aria-label="Previous item"
           >
             <ChevronLeft className="h-5 w-5 md:h-8 md:w-8" />
           </button>
        )}
        
        {activeIndex < items.length - 1 && (
           <button 
             onClick={handleNext} 
             className="absolute right-2 md:right-12 z-50 flex h-10 w-10 md:h-14 md:w-14 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-black/60 focus:outline-none"
             style={{ border: '1px solid rgba(255,255,255,0.1)' }}
             aria-label="Next item"
           >
             <ChevronRight className="h-5 w-5 md:h-8 md:w-8" />
           </button>
        )}

        {/* The Carousel Items */}
        <div className="relative flex h-full w-full items-center justify-center">
          <AnimatePresence initial={false} mode="popLayout">
            {items.map((item, index) => {
              const offset = index - activeIndex;
              const absOffset = Math.abs(offset);
              const isCenter = offset === 0;

              // Do not render cards that are too far away to save performance
              if (absOffset > 3) return null;

              // Responsive cinematic scaling
              // Mobile: closer together, Desktop: spread out cleanly
              const direction = Math.sign(offset);
              const xDesktop = direction * (absOffset === 1 ? 380 : absOffset === 2 ? 650 : 850);
              const xMobile = direction * (absOffset === 1 ? 160 : absOffset === 2 ? 260 : 320);

              const coverSrc = resolveCoverSrc(item.cover);
              const palette = item.coverPalette || { from: '#0c4a1a', via: '#3aa15a', to: '#d4af37' };

              return (
                <motion.div
                  key={item.id}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.4}
                  onDragEnd={handleDragEnd}
                  onClick={() => !isCenter && setActiveIndex(index)}
                  className={`absolute flex cursor-pointer flex-col overflow-hidden rounded-[1.5rem] md:rounded-[2rem] shadow-2xl ${isCenter ? 'ring-1 ring-white/20' : ''}`}
                  style={{
                    width: 'clamp(240px, 75vw, 360px)',
                    aspectRatio: '3/4.6',
                    background: '#111',
                  }}
                  animate={{
                    // Use CSS variables for responsive transform if needed, but framer motion handles it cleanly
                    x: `clamp(${xMobile}px, ${xDesktop}px, ${xDesktop}px)`,
                    scale: 1 - absOffset * 0.15,
                    opacity: 1 - absOffset * 0.3,
                    zIndex: 30 - absOffset,
                    filter: `blur(${absOffset * 2}px) brightness(${isCenter ? 1 : 0.6})`,
                  }}
                  transition={{ type: 'spring', stiffness: 220, damping: 25, mass: 1 }}
                >
                  <div className="relative h-full w-full">
                    {/* Media Cover */}
                    {coverSrc ? (
                      <img src={coverSrc} alt={item.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full" style={{ background: `linear-gradient(135deg, ${palette.from} 0%, ${palette.to} 100%)` }} />
                    )}

                    {/* Dark gradient overlay so text is highly readable, mostly at bottom */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />

                    {/* Badges */}
                    <div className="absolute right-4 top-4 flex gap-2">
                      <span className="rounded bg-black/60 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md"
                            style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                        Article
                      </span>
                      <span className={`rounded px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md ${item.price === 0 ? 'bg-emerald-600/80 shadow-[0_0_10px_rgba(5,150,105,0.5)]' : 'bg-amber-600/80 shadow-[0_0_10px_rgba(217,119,6,0.5)]'}`}
                            style={{ border: '1px solid rgba(255,255,255,0.2)' }}>
                        {item.price === 0 ? 'FREE' : `$${item.price}`}
                      </span>
                    </div>

                    {/* Content Layer */}
                    <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end p-4 md:p-8">
                       <h3 className="font-display text-lg md:text-3xl font-black leading-tight text-white mb-2" style={{ textShadow: '0 4px 12px rgba(0,0,0,0.8)' }}>
                         {item.title}
                       </h3>
                       {isCenter && (
                         <motion.p 
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           className="text-[12px] md:text-sm text-gray-300 line-clamp-2 max-w-[90%]"
                         >
                           {item.description}
                         </motion.p>
                       )}

                       {/* Action Button */}
                       {isCenter && (
                         <motion.div 
                           initial={{ opacity: 0, scale: 0.9 }}
                           animate={{ opacity: 1, scale: 1 }}
                           transition={{ delay: 0.1 }}
                           className="mt-6"
                         >
                           <Link
                             href={
                               item.price > 0
                                 ? `/subscribe?mode=book&slug=${item.slug}&title=${encodeURIComponent(item.title)}&price=${item.price}`
                                 : `/posts/${item.slug}`
                             }
                             onClick={(e) => !isCenter && e.preventDefault()}
                             className="inline-flex w-[160px] items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold uppercase tracking-wider transition-all duration-300 hover:scale-105 active:scale-95"
                             style={{ background: 'linear-gradient(135deg, #f0f0f0 0%, #d4d4d4 100%)', boxShadow: '0 8px 25px rgba(255,255,255,0.15)', color: '#000' }}
                           >
                             {item.price > 0 ? (
                               <>
                                 <ShoppingBag className="h-4 w-4" /> Buy
                               </>
                             ) : (
                               <>
                                 <BookOpen className="h-4 w-4" /> Read
                               </>
                             )}
                           </Link>
                         </motion.div>
                       )}
                    </div>

                    {/* Non-Center Hover Overlay interaction hint */}
                    {!isCenter && (
                      <div className="absolute inset-0 bg-black/0 transition-colors duration-300 hover:bg-white/5" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
