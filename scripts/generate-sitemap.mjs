/**
 * Generates public/sitemap.xml, sitemap.xml.txt, and sitemap.txt.
 * Run: node scripts/generate-sitemap.mjs
 *
 * URL host is www.anytap.io because apex (anytap.io) is GoDaddy forwarding
 * and only `/` redirects; other apex paths 404.
 *
 * sitemap.xml.txt is the same XML document with a .txt extension so Amplify
 * SPA rewrite (which serves index.html for *.xml) still returns real XML.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SITE = 'https://www.anytap.io';
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

function locFor(path) {
  return path === '/' ? `${SITE}/` : `${SITE}${path}`;
}

const urls = PATHS.map((path) => {
  const loc = locFor(path);
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

const txt = `${PATHS.map(locFor).join('\n')}\n`;

const publicDir = join(__dirname, '../public');
const xmlOut = join(publicDir, 'sitemap.xml');
const xmlTxtOut = join(publicDir, 'sitemap.xml.txt');
const txtOut = join(publicDir, 'sitemap.txt');
writeFileSync(xmlOut, xml, 'utf8');
writeFileSync(xmlTxtOut, xml, 'utf8');
writeFileSync(txtOut, txt, 'utf8');
console.log(`Wrote ${xmlOut}, ${xmlTxtOut}, and ${txtOut} (${PATHS.length} urls)`);
