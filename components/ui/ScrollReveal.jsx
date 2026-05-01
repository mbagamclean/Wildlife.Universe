'use client';

import { useRef, useEffect, useState } from 'react';

export function ScrollReveal({ children, effect = 'fadeUp', delay = 0, className = '' }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
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
  }, []);

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
