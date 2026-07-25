/**
 * Remove CSS blocks that are no longer referenced from JSX.
 * Run: node scripts/prune-dead-css.mjs
 */
import fs from 'fs';

const CSS_PATH = 'src/styles/styles.css';

let css = fs.readFileSync(CSS_PATH, 'utf8');

function dropSection(headerLabel) {
  const escaped = headerLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`/\\* ───── ${escaped} ───── \\*/[\\s\\S]*?(?=/\\* ─────)`, 'm');
  css = css.replace(re, '');
}

// mobilenav → keep only topbar breakpoint rules
css = css.replace(
  /\/\* legacy mobilenav[\s\S]*?(?=\/\* ───── Announcement)/,
  `@media (max-width: 980px) {
  .topbar__nav { display: none; }
  .topbar__apply { display: none; }
  .topbar__burger { display: inline-flex; }
}

`,
);

// Payment Solution: keep paysol-art only (before dropping adjacent sections)
const paysolArt = css.match(
  /\/\* Crypto-payment fintech illustration \*\/[\s\S]*?\.paysol-art__svg \{[\s\S]*?\}\n/,
);
if (paysolArt) {
  css = css.replace(
    /\/\* ───── Payment Solution ───── \*\/[\s\S]*?(?=\/\* ───── CTA banner ─────)/,
    `/* ───── Payment illustration ───── */\n${paysolArt[0]}\n`,
  );
}

const DROP_HEADERS = [
  'Announcement bar',
  'Trust strip',
  'Feature grid',
  'Asset grid',
  'Card products',
  'Steps',
  'Security strip',
  'Fees',
  'Innovation section',
  'FAQ',
  'App download section',
  'CTA banner',
  'Lifestyle (What Anytap does)',
  'Footer PWA install block',
];

for (const h of DROP_HEADERS) dropSection(h);

// Affiliate section: keep ref-card rules only
css = css.replace(
  /\/\* ───── Affiliate ───── \*\/[\s\S]*?(?=\.ref-card \{)/,
  '/* ───── Referral earnings card ───── */\n',
);
css = css.replace(/\.ref-chip[\s\S]*?(?=\/\* ───── Footer ─────)/, '');

// Standalone comment blocks
const INLINE_BLOCKS = [
  /\/\* Solo card product layout \*\/[\s\S]*?(?=\/\* Fees table)/,
  /\/\* Fees table — solo[\s\S]*?(?=\/\* ───── Innovation)/,
  /\/\* BIN redundancy art \*\/[\s\S]*?(?=\/\* Use grid)/,
  /\/\* Use grid \*\/[\s\S]*?(?=\/\* Coin grid)/,
  /\/\* Floating chips \*\/[\s\S]*?(?=\/\* Receipts)/,
  /\/\* Receipts \*\/[\s\S]*?(?=\/\* Chain logos)/,
  /\/\* Chain logos \*\/[\s\S]*?(?=\/\* fade-in on scroll)/,
  /\/\* KYC passport scan \*\/[\s\S]*?(?=\/\* Anytap home screen)/,
];
for (const re of INLINE_BLOCKS) css = css.replace(re, '');

css = css.replace(/\.signupcard[\s\S]*?(?=\.howsteps__list)/, '');
css = css.replace(/\.eligibility-card[\s\S]*?(?=\.ptrust__card)/, '');
css = css.replace(/\.pwacard[\s\S]*?@media \(max-width: 520px\) \{ \.pwacard[\s\S]*?\}\n/, '');

// Partial: hero unused elements
css = css.replace(/\.hero__kicker[\s\S]*?(?=\.hero__title)/, '');
css = css.replace(/\.hero__lede \{[\s\S]*?\}\n/, '');
css = css.replace(/\.hero__list[\s\S]*?(?=\.hero__meta)/, '');
css = css.replace(/\.hero__meta[\s\S]*?(?=\.hero__finenote)/, '');
css = css.replace(/\.hero__finenote[\s\S]*?(?=\.hero__visual)/, '');

css = css.replace(/\.footer__qr[\s\S]*?(?=\.footer__social)/, '');
css = css.replace(/\.topbar__lang[\s\S]*?(?=\.topbar__burger)/, '');
css = css.replace(/\.wheretouse \.trust__marquee \{[^}]+\}\n/, '');

if (!css.includes('.asset__sym {')) {
  const assetSym = `
/* Coin / fiat chip symbol */
.asset__sym {
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #fff;
}
`;
  css = css.replace('/* ───── Buttons ───── */', `/* ───── Buttons ───── */${assetSym}`);
}

css = css.replace(/\n{4,}/g, '\n\n\n');

fs.writeFileSync(CSS_PATH, css);
console.log('Pruned', CSS_PATH, '→', css.split('\n').length, 'lines');
