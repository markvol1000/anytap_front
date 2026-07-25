import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'Anytap_v2');
const outComponents = path.join(root, 'src', 'components');

const jsxFiles = [
  'tweaks-panel.jsx',
  'ui.jsx',
  'sub-common.jsx',
  'sections.jsx',
  'home-anim.jsx',
  'sub-card.jsx',
  'sub-payment.jsx',
  'sub-innovation.jsx',
  'sub-referral.jsx',
  'sub-security.jsx',
  'sub-forms.jsx',
];

function htmlToRoute(html) {
  if (!html || html === 'index.html') return '/';
  return '/' + html.replace(/\.html$/, '');
}

function closeLinkTags(code) {
  return code.replace(/<\/a>/g, (match, offset, str) => {
    const before = str.slice(Math.max(0, offset - 200), offset);
    if (before.includes('<Link to=')) return '</Link>';
    return match;
  });
}

function transformContent(name, content) {
  let code = content;

  code = code.replace(/^const \{[^}]+\} = React;\s*/m, '');
  code = code.replace(/^const \{[^}]+\} = React;\s*/m, '');

  code = code.replace(/Object\.assign\(window,\s*\{([^}]+)\}\s*\);?\s*$/m, (_, exports) => {
    const names = exports.split(',').map((s) => s.trim()).filter(Boolean);
    return `export { ${names.join(', ')} };`;
  });

  code = code.replace(/href="([a-z0-9-]+)\.html"/g, (_, page) => `href="${htmlToRoute(page + '.html')}"`);
  code = code.replace(/href: "([a-z0-9-]+)\.html"/g, (_, page) => `href: "${htmlToRoute(page + '.html')}"`);
  code = code.replace(/src="assets\//g, 'src="/assets/');

  code = code.replace(/React\.useEffect/g, 'useEffect');
  code = code.replace(/React\.useRef/g, 'useRef');
  code = code.replace(/React\.isValidElement/g, 'isValidElement');
  code = code.replace(/React\.createElement/g, 'createElement');

  code = code.replace(/\buseStateC\b/g, 'useState');
  code = code.replace(/\buseEffectC\b/g, 'useEffect');
  code = code.replace(/\buseStateS\b/g, 'useState');
  code = code.replace(/\buseStateF\b/g, 'useState');
  code = code.replace(/\buseStateA\b/g, 'useState');
  code = code.replace(/\buseEffectA\b/g, 'useEffect');
  code = code.replace(/\buseRefA\b/g, 'useRef');

  const hooks = new Set();
  if (/\buseState\b/.test(code)) hooks.add('useState');
  if (/\buseEffect\b/.test(code)) hooks.add('useEffect');
  if (/\buseRef\b/.test(code)) hooks.add('useRef');
  if (/\bcreateElement\b/.test(code)) hooks.add('createElement');
  if (/\bisValidElement\b/.test(code)) hooks.add('isValidElement');

  const hookImport = hooks.size
    ? `import React, { ${[...hooks].join(', ')} } from 'react';\n`
    : `import React from 'react';\n`;

  const imports = [hookImport];

  if (name === 'ui.jsx') {
    imports.push(`import logoUrl from '/assets/anytap-logo.png';\n`);
    code = code.replace(
      /\(window\.__resources && window\.__resources\.logo\) \|\| "assets\/anytap-logo\.png"/,
      'logoUrl',
    );
  }

  if (name === 'sections.jsx') {
    imports.push(`import lifestylePhoto from '/assets/lifestyle-manhattan.png';\n`);
    code = code.replace(
      /\(window\.__resources && window\.__resources\.lifestylePhoto\) \|\| "assets\/lifestyle-manhattan\.png"/,
      'lifestylePhoto',
    );
    imports.push(`import { Icon, Logo, PaymentCard, CoinChip, FiatChip, MiniPhone, COINS, FIATS, CryptoPayArt, PayBrand } from './ui.jsx';\n`);
    imports.push(`import { Link } from 'react-router-dom';\n`);
    code = code.replace(/<a href="(\/[^"]+)"/g, '<Link to="$1"');
    code = closeLinkTags(code);
    code = code.replace(
      /<image-slot[\s\S]*?<\/image-slot>/,
      `<img
            className="lifestyle__photo"
            src={lifestylePhoto}
            alt="Using Anytap card on Manhattan's 42nd Street"
            style={{ borderRadius: 28, width: '100%', objectFit: 'cover' }}
          />`,
    );
  }

  if (name === 'sub-common.jsx') {
    imports.push(`import { Icon } from './ui.jsx';\n`);
    imports.push(`import { Link } from 'react-router-dom';\n`);
    code = code.replace(/primary && <a href=\{primary\.href\}/g, 'primary && <Link to={primary.href}');
    code = code.replace(/secondary && <a href=\{secondary\.href\}/g, 'secondary && <Link to={secondary.href}');
    code = code.replace(/<Link to=\{primary\.href\}([^>]*)>([\s\S]*?)<\/a>/g, '<Link to={primary.href}$1>$2</Link>');
    code = code.replace(/<Link to=\{secondary\.href\}([^>]*)>([\s\S]*?)<\/a>/g, '<Link to={secondary.href}$1>$2</Link>');
    code = code.replace(
      /export \{ SubHero, Band, SectionHead, IconCards, StepFlow, DataTable, Split, CtaBand, CheckList, StatTiles, LogoWall \};/,
      'export { SubHero, Band, SectionHead, IconCards, StepFlow, DataTable, Split, CtaBand, CheckList, StatTiles, LogoWall, SUB_ONLINE_BRANDS, SUB_FRANCHISE_BRANDS };',
    );
  }

  if (name === 'home-anim.jsx') {
    imports.push(`import { Icon, Logo, PaymentCard } from './ui.jsx';\n`);
    code = code.replace(/src: "\/assets\//g, 'src: "/assets/');
  }

  if (name.startsWith('sub-') && name !== 'sub-common.jsx' && name !== 'sub-forms.jsx') {
    const subCommonImports = name === 'sub-card.jsx'
      ? 'SubHero, Band, SectionHead, IconCards, StepFlow, DataTable, Split, CtaBand, CheckList, StatTiles, LogoWall, SUB_ONLINE_BRANDS, SUB_FRANCHISE_BRANDS'
      : 'SubHero, Band, SectionHead, IconCards, StepFlow, DataTable, Split, CtaBand, CheckList, StatTiles, LogoWall';
    imports.push(`import { ${subCommonImports} } from './sub-common.jsx';\n`);
    imports.push(`import { Icon, PaymentCard, CryptoPayArt, BinCompareArt, AccountCreatePhone, CheckoutApiArt, MerchantProcessArt, MiniPhone, QRCode, PayBrand, NetMark, CoinChip } from './ui.jsx';\n`);
  }

  if (name === 'sub-forms.jsx') {
    imports.push(`import { Link } from 'react-router-dom';\n`);
    imports.push(`import { Logo, Icon } from './ui.jsx';\n`);
    imports.push(`import { SubHero, Band, SectionHead, IconCards, StatTiles } from './sub-common.jsx';\n`);
    imports.push(`import { LEGAL } from '../lib/legal.js';\n`);
    code = code.replace(/\(window\.LEGAL && window\.LEGAL\[docKey\]\)/g, 'LEGAL[docKey]');
    code = code.replace(/<a href="(\/[^"]+)"/g, '<Link to="$1"');
    code = closeLinkTags(code);
  }

  return imports.join('') + '\n' + code.trim() + '\n';
}

fs.mkdirSync(outComponents, { recursive: true });

for (const file of jsxFiles) {
  const raw = fs.readFileSync(path.join(srcDir, file), 'utf8');
  const transformed = transformContent(file, raw);
  if (transformed) {
    fs.writeFileSync(path.join(outComponents, file), transformed);
    console.log('migrated', file);
  }
}

const legalRaw = fs.readFileSync(path.join(srcDir, 'legal-content.js'), 'utf8');
const legalOut = legalRaw.replace('window.LEGAL = ', 'export const LEGAL = ');
fs.mkdirSync(path.join(root, 'src', 'lib'), { recursive: true });
fs.writeFileSync(path.join(root, 'src', 'lib', 'legal.js'), legalOut);

fs.copyFileSync(path.join(srcDir, 'styles.css'), path.join(root, 'src', 'styles', 'styles.css'));
fs.copyFileSync(path.join(srcDir, 'ds', 'colors_and_type.css'), path.join(root, 'src', 'styles', 'colors_and_type.css'));
fs.copyFileSync(path.join(srcDir, 'manifest.webmanifest'), path.join(root, 'public', 'manifest.webmanifest'));

console.log('done');
