// 8 unique hero transition effects.
// Each effect has:
//   - enter  → start position (instant, no transition needed)
//   - center → enter animation, controlled by per-state `transition`
//   - exit   → always fast (0.28s easeIn) so the old slide clears immediately
//              and never delays the incoming slide.
// Function-based variants receive `direction` via Framer Motion's `custom` prop.

export const EFFECT_NAMES = [
  'slide',
  'rise',
  'zoom',
  'blur',
  'diagonal',
  'curtain',
  'flash',
  'parallax',
];

const EXIT = { duration: 0.28, ease: 'easeIn' };

const EFFECTS = {
  // 1. Horizontal push + fade
  slide: {
    variants: {
      enter: (dir) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
      center: {
        x: 0, opacity: 1,
        transition: { duration: 0.72, ease: [0.22, 1, 0.36, 1] },
      },
      exit: (dir) => ({
        x: dir > 0 ? '-100%' : '100%', opacity: 0,
        transition: EXIT,
      }),
    },
  },

  // 2. Vertical rise/drop + fade
  rise: {
    variants: {
      enter: (dir) => ({ y: dir > 0 ? '100%' : '-100%', opacity: 0 }),
      center: {
        y: 0, opacity: 1,
        transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
      },
      exit: (dir) => ({
        y: dir > 0 ? '-100%' : '100%', opacity: 0,
        transition: EXIT,
      }),
    },
  },

  // 3. Cinematic zoom + fade
  zoom: {
    variants: {
      enter: { scale: 1.16, opacity: 0 },
      center: {
        scale: 1, opacity: 1,
        transition: { duration: 0.78, ease: [0.16, 1, 0.3, 1] },
      },
      exit: {
        scale: 0.88, opacity: 0,
        transition: EXIT,
      },
    },
  },

  // 4. Atmospheric blur dissolve
  blur: {
    variants: {
      enter: { opacity: 0, filter: 'blur(24px)', scale: 1.06 },
      center: {
        opacity: 1, filter: 'blur(0px)', scale: 1,
        transition: { duration: 0.82, ease: 'easeOut' },
      },
      exit: {
        opacity: 0, filter: 'blur(24px)', scale: 0.96,
        transition: EXIT,
      },
    },
  },

  // 5. Diagonal predator drift + fade
  diagonal: {
    variants: {
      enter: (dir) => ({ x: dir > 0 ? '65%' : '-65%', y: '20%', scale: 0.94, opacity: 0 }),
      center: {
        x: 0, y: 0, scale: 1, opacity: 1,
        transition: { duration: 0.78, ease: [0.22, 1, 0.36, 1] },
      },
      exit: (dir) => ({
        x: dir > 0 ? '-65%' : '65%', y: '-20%', scale: 0.94, opacity: 0,
        transition: EXIT,
      }),
    },
  },

  // 6. Curtain wipe — clip-path reveal, old slide fades out fast
  curtain: {
    variants: {
      enter: (dir) => ({
        clipPath: dir > 0 ? 'inset(0% 100% 0% 0%)' : 'inset(0% 0% 0% 100%)',
        opacity: 1,
      }),
      center: {
        clipPath: 'inset(0% 0% 0% 0%)', opacity: 1,
        transition: { duration: 0.82, ease: [0.22, 1, 0.36, 1] },
      },
      exit: {
        opacity: 0,
        transition: EXIT,
      },
    },
  },

  // 7. Flash cut — ultra-fast with warm golden burst overlay
  flash: {
    variants: {
      enter: { opacity: 0, scale: 1.04 },
      center: {
        opacity: 1, scale: 1,
        transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] },
      },
      exit: {
        opacity: 0, scale: 0.98,
        transition: { duration: 0.18, ease: 'easeIn' },
      },
    },
    overlay: true,
  },

  // 8. Parallax depth shift + fade
  parallax: {
    variants: {
      enter: (dir) => ({ x: dir > 0 ? '42%' : '-42%', y: '-14%', scale: 1.08, opacity: 0 }),
      center: {
        x: 0, y: 0, scale: 1, opacity: 1,
        transition: { duration: 0.82, ease: [0.22, 1, 0.36, 1] },
      },
      exit: (dir) => ({
        x: dir > 0 ? '-42%' : '42%', y: '14%', scale: 0.92, opacity: 0,
        transition: EXIT,
      }),
    },
  },
};

export function getEffect(name) {
  return EFFECTS[name] ?? EFFECTS.slide;
}
