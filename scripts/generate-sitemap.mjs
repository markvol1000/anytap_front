/**
 * Generates public/sitemap.xml from SEO_PAGES.
 * Run: node scripts/generate-sitemap.mjs
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SITE = 'https://anytap.io';
const __dirname = dirname(fileURLToPath(import.meta.url));

/** Keep in sync with src/lib/seo.ts SEO_PAGES paths */
const PATHS = [
  '/',
  '/about',
  '/contact',
  '/faq',
  '/card-how-to-use',
  '/card-who-can-apply',
  '/card-benefits',
  '/card-application',
  '/apply-card',
  '/payment-why',
  '/payment-how',
  '/payment-business',
  '/merchant-apply',
  '/innovation-tech',
  '/innovation-vision',
  '/innovation-market',
  '/referral-why',
  '/referral-earn',
  '/referral-apply',
  '/security',
  '/privacy',
  '/terms',
  '/cookies',
  '/disclosure',
];

const today = new Date().toISOString().slice(0, 10);

const urls = PATHS.map((path) => {
  const loc = path === '/' ? `${SITE}/` : `${SITE}${path}`;
  const priority = path === '/' ? '1.0' : '0.7';
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
}).join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

const out = join(__dirname, '../public/sitemap.xml');
writeFileSync(out, xml, 'utf8');
console.log(`Wrote ${out} (${PATHS.length} urls)`);
