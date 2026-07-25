import { chromium } from 'playwright';

const routes = [
  '/',
  '/about',
  '/login',
  '/sign-up',
  '/forgot-password',
  '/apply-card',
  '/card-application',
  '/merchant-apply',
  '/contact',
  '/card-how-to-use',
  '/card-who-can-apply',
  '/card-benefits',
  '/payment-why',
  '/payment-how',
  '/payment-business',
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

const base = process.argv[2] || 'https://anytap.io';
const browser = await chromium.launch();
const page = await browser.newPage();
const broken = [];

for (const route of routes) {
  const errors = [];
  const onError = (e) => errors.push(e.message);
  const onConsole = (m) => { if (m.type() === 'error') errors.push(m.text()); };
  page.on('pageerror', onError);
  page.on('console', onConsole);
  await page.goto(`${base}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
  const rootLen = await page.evaluate(() => document.getElementById('root')?.innerHTML?.length || 0);
  const h1 = await page.evaluate(() => document.querySelector('h1')?.innerText?.slice(0, 80) || document.querySelector('.subhero__title')?.innerText?.slice(0, 80) || '');
  page.off('pageerror', onError);
  page.off('console', onConsole);
  if (rootLen < 500 || errors.length) {
    broken.push({ route, rootLen, h1, errors: [...new Set(errors)] });
  } else {
    console.log('OK', route, h1 ? `— ${h1}` : '');
  }
}

if (broken.length) {
  console.log('\nBROKEN:');
  for (const b of broken) console.log(JSON.stringify(b, null, 2));
} else {
  console.log('\nAll routes OK');
}

await browser.close();
