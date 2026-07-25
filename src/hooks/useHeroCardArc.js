import { useLayoutEffect } from 'react';

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function arcDelta(angleDeg, radius, restAngle) {
  const cur = {
    x: radius * Math.cos(toRad(angleDeg)),
    y: radius * Math.sin(toRad(angleDeg)),
  };
  const rest = {
    x: radius * Math.cos(toRad(restAngle)),
    y: radius * Math.sin(toRad(restAngle)),
  };
  return { x: cur.x - rest.x, y: cur.y - rest.y };
}

const LIGHT = {
  radius: 50,
  angleEnter: 212,
  angleRest: 142,
  angleExit: 262,
  rotateEnter: 34,
  rotateRest: 7,
  rotateExit: 42,
  z: 18,
  delay: 100,
  duration: 950,
};

const DARK = {
  radius: 50,
  angleEnter: -28,
  angleRest: 52,
  angleExit: -68,
  rotateEnter: -34,
  rotateRest: -7,
  rotateExit: -42,
  z: -12,
  delay: 280,
  duration: 950,
};

function scaleConfig(config) {
  const w = window.innerWidth;
  const scale = w <= 560 ? 1 : w <= 960 ? 1.22 : 1.48;
  return { ...config, radius: config.radius * scale };
}

function buildTransform(config, angleDeg, rotateDeg, radiusScale = 1) {
  const radius = config.radius * radiusScale;
  const { x, y } = arcDelta(angleDeg, radius, config.angleRest);
  const scale = 1 - 0.18 * (radiusScale - 1) / 0.45;
  return (
    `rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg)) translateZ(${config.z}px) ` +
    `translate(${x.toFixed(2)}vmin, ${y.toFixed(2)}vmin) ` +
    `rotate(${rotateDeg.toFixed(2)}deg) ` +
    `scale(${scale.toFixed(3)})`
  );
}

function exitOpacity(exitP) {
  if (exitP <= 0.75) return 1;
  return Math.max(0, 1 - (exitP - 0.75) / 0.25);
}

/** 0 = cards at rest, 1 = fully exited. Wide range so arc tracks scroll gradually. */
function computeCardExitProgress(scrollP) {
  const isDesktop = window.innerWidth > 960;
  const exitStart = isDesktop ? 0.18 : 0.62;
  const exitEnd = 0.99;
  if (scrollP <= exitStart) return 0;
  return clamp01((scrollP - exitStart) / (exitEnd - exitStart));
}

function computeScrollProgress(hero) {
  const vh = window.innerHeight || 800;
  const rect = hero.getBoundingClientRect();
  const heroH = hero.offsetHeight;
  const isDesktop = window.innerWidth > 960;

  if (isDesktop) {
    const scrollTravel = Math.max(heroH * 1.05, vh * 0.95);
    const heroTravel = Math.max(heroH * 0.92, vh * 0.72);
    const fromScroll = clamp01(window.scrollY / scrollTravel);
    const fromHero = clamp01(1 - (rect.bottom - vh * 0.14) / heroTravel);
    return Math.max(fromScroll, fromHero);
  }

  const scrollTravel = Math.max(heroH * 0.95, vh * 0.82);
  const heroTravel = Math.max(heroH * 0.78, vh * 0.62);
  const fromScroll = clamp01(window.scrollY / scrollTravel);
  const fromHero = clamp01(1 - (rect.bottom - vh * 0.1) / heroTravel);
  return Math.max(fromScroll, fromHero);
}

function getTrustBarLiftMax(hero) {
  const visual = hero.querySelector('.hero__visual');
  const w = window.innerWidth;
  const vh = window.innerHeight || 800;
  if (w <= 960 && visual) {
    return Math.max(visual.offsetHeight * 0.64, vh * 0.15);
  }
  if (visual) return visual.offsetHeight * 0.4;
  return hero.offsetHeight * 0.24;
}

function waitForHeroImages(hero) {
  const imgs = [...hero.querySelectorAll('.hero-card__img')];
  if (!imgs.length) return Promise.resolve();
  return Promise.all(
    imgs.map((img) => {
      const done = () => (img.decode ? img.decode() : Promise.resolve()).catch(() => {});
      if (img.complete) return done();
      return new Promise((resolve) => {
        const finish = () => { done().finally(resolve); };
        img.addEventListener('load', finish, { once: true });
        img.addEventListener('error', finish, { once: true });
      });
    }),
  );
}

/** Hero cards: arc entrance on load, arc exit on scroll (all viewports, movement only). */
export function useHeroCardArc(heroRef) {
  useLayoutEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    const lightCard = hero.querySelector('.hero-card--light');
    const darkCard = hero.querySelector('.hero-card--dark');
    const lightFloat = hero.querySelector('.hero-card--light .hero-card__float');
    const darkFloat = hero.querySelector('.hero-card--dark .hero-card__float');
    if (!lightCard || !darkCard || !lightFloat || !darkFloat) return;

    const trustBar = hero.nextElementSibling?.classList?.contains('trustbar')
      ? hero.nextElementSibling
      : null;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      hero.classList.add('hero--arc-ready');
      return;
    }

    let cancelled = false;
    let t0 = performance.now();
    let scrollP = 0;
    let scrollRaf = 0;
    let enterRaf = 0;

    const reset = () => {
      lightFloat.style.removeProperty('transform');
      darkFloat.style.removeProperty('transform');
      lightFloat.style.removeProperty('opacity');
      darkFloat.style.removeProperty('opacity');
      lightCard.style.removeProperty('visibility');
      darkCard.style.removeProperty('visibility');
      lightCard.style.removeProperty('transform');
      darkCard.style.removeProperty('transform');
      lightCard.style.removeProperty('opacity');
      darkCard.style.removeProperty('opacity');
      hero.style.removeProperty('--hero-scroll-p');
      hero.classList.remove('hero--arc-ready');
      if (trustBar) {
        trustBar.style.removeProperty('margin-top');
        trustBar.classList.remove('trustbar--hero-follow');
      }
    };

    const applyTrustBarLift = () => {
      if (!trustBar) return;
      // Desktop hero is 2-column — lifting trust bar overlaps left copy text
      if (window.innerWidth > 960) {
        trustBar.style.removeProperty('margin-top');
        trustBar.classList.remove('trustbar--hero-follow');
        return;
      }
      const lift = getTrustBarLiftMax(hero) * scrollP;
      if (lift > 0.5) {
        trustBar.style.marginTop = `${-lift}px`;
        trustBar.classList.add('trustbar--hero-follow');
      } else {
        trustBar.style.removeProperty('margin-top');
        trustBar.classList.remove('trustbar--hero-follow');
      }
    };

    const render = () => {
      const now = performance.now();
      const light = scaleConfig(LIGHT);
      const dark = scaleConfig(DARK);

      const lightEnter = easeOutCubic(clamp01((now - t0 - light.delay) / light.duration));
      const darkEnter = easeOutCubic(clamp01((now - t0 - dark.delay) / dark.duration));

      const lightBase = lerp(light.angleEnter, light.angleRest, lightEnter);
      const darkBase = lerp(dark.angleEnter, dark.angleRest, darkEnter);
      const exitP = computeCardExitProgress(scrollP);
      const radiusScale = 1 + 0.45 * exitP;
      const opacity = exitOpacity(exitP);
      const gone = exitP >= 0.98;

      const lightAngle = lerp(lightBase, light.angleExit, exitP);
      const darkAngle = lerp(darkBase, dark.angleExit, exitP);

      const lightRotBase = lerp(light.rotateEnter, light.rotateRest, lightEnter);
      const darkRotBase = lerp(dark.rotateEnter, dark.rotateRest, darkEnter);
      const lightRotate = lerp(lightRotBase, light.rotateExit, exitP);
      const darkRotate = lerp(darkRotBase, dark.rotateExit, exitP);

      lightFloat.style.transform = buildTransform(light, lightAngle, lightRotate, radiusScale);
      darkFloat.style.transform = buildTransform(dark, darkAngle, darkRotate, radiusScale);
      lightFloat.style.opacity = String(opacity);
      darkFloat.style.opacity = String(opacity);
      lightCard.style.visibility = gone ? 'hidden' : 'visible';
      darkCard.style.visibility = gone ? 'hidden' : 'visible';
      lightCard.style.transform = 'none';
      darkCard.style.transform = 'none';
      hero.style.setProperty('--hero-scroll-p', String(scrollP));
      applyTrustBarLift();
    };

    const computeScroll = () => {
      scrollP = computeScrollProgress(hero);
      render();
    };

    const onScroll = () => {
      cancelAnimationFrame(scrollRaf);
      scrollRaf = requestAnimationFrame(computeScroll);
    };

    const enterLoop = () => {
      render();
      const now = performance.now();
      const lightDone = now - t0 - LIGHT.delay >= LIGHT.duration;
      const darkDone = now - t0 - DARK.delay >= DARK.duration;
      if (!lightDone || !darkDone) {
        enterRaf = requestAnimationFrame(enterLoop);
      }
    };

    const start = () => {
      if (cancelled) return;
      render();
      enterRaf = requestAnimationFrame(enterLoop);
      computeScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
    };

    Promise.race([
      waitForHeroImages(hero),
      new Promise((resolve) => { window.setTimeout(resolve, 2500); }),
    ]).then(() => {
      if (cancelled) return;
      t0 = performance.now();
      hero.classList.add('hero--arc-ready');
      start();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(scrollRaf);
      cancelAnimationFrame(enterRaf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      reset();
    };
  }, [heroRef]);
}
