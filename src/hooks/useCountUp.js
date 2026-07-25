// Count-up animation hook with IntersectionObserver trigger.
// Starts counting when the returned ref element enters the viewport.
import { useState, useEffect, useRef } from 'react';

export function useCountUp(target, dur = 1200, decimals = 0) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const run = () => {
      if (started.current) return;
      started.current = true;
      const t0 = performance.now();
      const tick = (now) => {
        const k = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - k, 3);
        setVal(target * eased);
        if (k < 1) requestAnimationFrame(tick);
        else setVal(target);
      };
      requestAnimationFrame(tick);
      // Fallback in case rAF is throttled (background/offscreen tab)
      setTimeout(() => setVal(target), dur + 200);
    };

    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) run();
    }, { threshold: 0.3 });
    io.observe(el);
    const fallback = setTimeout(run, 1400);
    return () => { io.disconnect(); clearTimeout(fallback); };
  }, [target, dur]);

  return [decimals ? val.toFixed(decimals) : Math.round(val), ref];
}
