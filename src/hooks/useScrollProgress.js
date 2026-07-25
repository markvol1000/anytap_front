import { useEffect, useRef } from 'react';

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

/** Maps scroll position to --p (0→1) on the target element. */
export function useScrollProgress(targetRef, { reducedValue = 1, mode = 'default' } = {}) {
  const pRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduce) {
      pRef.current = reducedValue;
      el.style.setProperty('--p', String(reducedValue));
      return;
    }

    const compute = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      let p;

      if (mode === 'hero') {
        // Hero sits at page top: p=0 in view, p→1 as section scrolls away
        const end = vh * 0.12;
        const range = vh * 0.52;
        p = clamp01(1 - (rect.bottom - end) / range);
      } else {
        const start = vh * 0.7;
        const end = vh * 0.15;
        p = clamp01((start - rect.top) / (start - end));
      }

      pRef.current = p;
      el.style.setProperty('--p', String(p));
    };

    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [targetRef, reducedValue, mode]);
}
