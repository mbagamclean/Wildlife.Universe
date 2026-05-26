'use client';

import { useRef, useEffect, useState } from 'react';

// `priority` skips the opacity:0 reveal gate entirely. Use it for
// above-the-fold sections so server-rendered content paints immediately
// instead of waiting on hydration + IntersectionObserver.
export function ScrollReveal({
  children,
  effect = 'fadeUp',
  delay = 0,
  className = '',
  priority = false,
}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (priority) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0, rootMargin: '0px 0px -80px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [priority]);

  if (priority) {
    return (
      <div ref={ref} className={className || undefined}>
        {children}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={[
        'wu-scroll-reveal',
        visible ? `wu-reveal-${effect} wu-revealed` : 'wu-reveal-hidden',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
