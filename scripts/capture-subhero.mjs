import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const routes = [
  '/card-how-to-use',
  '/payment-why',
  '/innovation-tech',
  '/referral-why',
  '/security',
  '/about',
];
const base = process.argv[2] || 'http://127.0.0.1:4173';
mkdirSync('tmp-shots', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

for (const route of routes) {
  await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
  const box = await page.locator('.subhero').first().boundingBox();
  const grid = await page.evaluate(() => {
    const el = document.querySelector('.subhero__grid');
    if (!el) return null;
    const s = getComputedStyle(el);
    const copy = document.querySelector('.subhero__copy');
    const visual = document.querySelector('.subhero__visual');
    return {
      gridCols: s.gridTemplateColumns,
      display: s.display,
      maxWidth: s.maxWidth,
      hasVisual: !!visual,
      copyWidth: copy?.getBoundingClientRect().width,
      visualWidth: visual?.getBoundingClientRect().width,
      title: document.querySelector('.subhero__title')?.textContent?.slice(0, 40),
    };
  });
  await page.locator('.subhero').first().screenshot({ path: `tmp-shots${route.replace(/\//g, '-')}.png` });
  console.log(route, JSON.stringify({ box, grid }));
}

await browser.close();
