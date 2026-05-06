'use client';

import { useRef, useEffect, useState } from 'react';

/**
 * Bidirectional fade-in / fade-out wrapper driven by IntersectionObserver.
 *
 * Unlike ScrollReveal (which fires once and disconnects), FadeOnScroll keeps
 * watching: opacity goes 0 → 1 when the section enters the viewport, and
 * back toward 0 when it leaves. The CSS transition smooths the change so
 * sections gracefully fade in as you scroll down and fade out as you scroll
 * past them.
 *
 * Props:
 *   - threshold (0-1): IntersectionObserver threshold. 0.1 = treat the section
 *     as "visible" once 10% of it is in view.
 *   - duration (ms): CSS transition duration. Default 600ms.
 *   - minOpacity (0-1): Floor opacity when out of view. Default 0 (fully fades
 *     out). Set to a higher value (e.g. 0.4) for a softer dim-out instead of
 *     fully hiding.
 *   - rootMargin: passed straight to IntersectionObserver.
 */
export function FadeOnScroll({
  children,
  threshold = 0.1,
  duration = 600,
  minOpacity = 0,
  rootMargin = '0px 0px -80px 0px',
  className = '',
}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold, rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, rootMargin]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : minOpacity,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: `opacity ${duration}ms cubic-bezier(0.22, 1, 0.36, 1), transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}
