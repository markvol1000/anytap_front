import { useEffect, useRef } from 'react';

/** Edge-press 3D tilt — hovered edge recedes slightly. Smooth lerp, no z-index swap. */
export function useHeroCardFloat(maxDeg = 12) {
  const ref = useRef(null);

  useEffect(() => {
    const wrap = ref.current;
    if (!wrap) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fine = window.matchMedia('(pointer: fine)');
    if (reduced.matches || !fine.matches) return;

    const layer = wrap.querySelector('.hero-card__float');
    if (!layer) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let rafId = 0;

    const apply = () => {
      layer.style.setProperty('--tilt-x', `${currentX.toFixed(2)}deg`);
      layer.style.setProperty('--tilt-y', `${currentY.toFixed(2)}deg`);
    };

    const tick = () => {
      currentX += (targetX - currentX) * 0.13;
      currentY += (targetY - currentY) * 0.13;
      apply();

      const active =
        Math.abs(targetX - currentX) > 0.04 ||
        Math.abs(targetY - currentY) > 0.04;

      if (active) {
        rafId = requestAnimationFrame(tick);
      } else {
        currentX = targetX;
        currentY = targetY;
        apply();
        rafId = 0;
      }
    };

    const start = () => {
      if (!rafId) rafId = requestAnimationFrame(tick);
    };

    const onMove = (e) => {
      const rect = wrap.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      targetY = -x * maxDeg * 2;
      targetX = -y * maxDeg * 2;
      start();
    };

    const reset = () => {
      targetX = 0;
      targetY = 0;
      start();
    };

    wrap.addEventListener('mousemove', onMove);
    wrap.addEventListener('mouseleave', reset);

    return () => {
      wrap.removeEventListener('mousemove', onMove);
      wrap.removeEventListener('mouseleave', reset);
      if (rafId) cancelAnimationFrame(rafId);
      targetX = 0;
      targetY = 0;
      currentX = 0;
      currentY = 0;
      layer.style.removeProperty('--tilt-x');
      layer.style.removeProperty('--tilt-y');
    };
  }, [maxDeg]);

  return ref;
}
