import { chromium } from 'playwright';

const url = process.argv[2] || 'https://anytap.io/';
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
const rootLen = await page.evaluate(() => document.getElementById('root')?.innerHTML?.length || 0);
const text = await page.evaluate(() => document.body?.innerText?.slice(0, 200) || '');
console.log('url:', url);
console.log('root innerHTML length:', rootLen);
console.log('body text preview:', text);
console.log('errors:', errors);
await browser.close();
