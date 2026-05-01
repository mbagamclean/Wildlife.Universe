'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

const HeroCtx = createContext(null);

const AUTOPLAY_MS = 6000;
// Maximum time to stay on a video slide before forcing an advance.
// Covers videos that fail to load (404) and never fire onVideoEnded.
const VIDEO_MAX_MS = 12000;

export function HeroProvider({ children, slides }) {
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [playing, setPlaying] = useState(true);
  const [transitionCount, setTransitionCount] = useState(0);
  const liveRef = useRef(null);

  const goTo = useCallback(
    (n) => {
      const next = ((n % count) + count) % count;
      setDirection(next > index ? 1 : -1);
      setIndex(next);
      setTransitionCount((c) => c + 1);
    },
    [index, count]
  );

  const next = useCallback(() => {
    setDirection(1);
    setIndex((i) => (i + 1) % count);
    setTransitionCount((c) => c + 1);
  }, [count]);

  const prev = useCallback(() => {
    setDirection(-1);
    setIndex((i) => (i - 1 + count) % count);
    setTransitionCount((c) => c + 1);
  }, [count]);

  // Clamp index when slides are removed so it never goes out of bounds
  useEffect(() => {
    if (count > 0 && index >= count) setIndex(count - 1);
  }, [count, index]);

  const currentIsVideo = slides[index]?.type === 'video';

  // ─── Autoplay ───────────────────────────────────────────────────────────────
  // Uses setTimeout (not setInterval) so the timer resets on every slide change
  // — manual navigations always give the new slide a full view window.
  //
  // Video slides: always arm a VIDEO_MAX_MS fallback regardless of playing/hover
  // state so a missing/404 video can never block the carousel indefinitely.
  //
  // Non-video slides: advance after AUTOPLAY_MS unless the user explicitly paused.
  // Hovering the hero no longer pauses — only the play/pause button controls this.
  useEffect(() => {
    if (count <= 1) return;

    if (currentIsVideo) {
      const id = window.setTimeout(next, VIDEO_MAX_MS);
      return () => window.clearTimeout(id);
    }

    if (!playing) return;

    const id = window.setTimeout(next, AUTOPLAY_MS);
    return () => window.clearTimeout(id);
  // Re-arm every time the slide changes so each slide gets its full view time.
  }, [index, count, currentIsVideo, playing, next]);

  // Pause when tab is hidden, resume when it becomes visible again
  useEffect(() => {
    const onVis = () => setPlaying(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === ' ' && e.target === document.body) {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  // Live region for screen readers
  useEffect(() => {
    if (liveRef.current && count) {
      liveRef.current.textContent = `Slide ${index + 1} of ${count}: ${slides[index]?.title ?? ''}`;
    }
  }, [index, count, slides]);

  return (
    <HeroCtx.Provider
      value={{
        slides,
        index,
        direction,
        playing,
        setPlaying,
        goTo,
        next,
        prev,
        count,
        transitionCount,
        liveRef,
        onVideoEnded: next,
      }}
    >
      {children}
    </HeroCtx.Provider>
  );
}

export function useHero() {
  const ctx = useContext(HeroCtx);
  if (!ctx) throw new Error('useHero must be used inside <HeroProvider>');
  return ctx;
}
