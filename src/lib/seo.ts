import { SITE_ORIGIN } from './site.ts';

export interface PageSeo {
  title: string;
  description: string;
  path: string;
  /** noindex for auth, portal, demos */
  noindex?: boolean;
  ogImage?: string;
}

const DEFAULT_OG = `${SITE_ORIGIN}/assets/why_card_bg.png`;
const BRAND = 'Anytap';

const DEFAULT_DESC =
  'Spend USDT and USDC anywhere Visa is accepted. Anytap crypto debit card with 60+ global BINs, Apple Pay, Google Pay, and Samsung Pay.';

/** Marketing + legal routes that should be indexed. */
export const SEO_PAGES: PageSeo[] = [
  {
    path: '/',
    title: `${BRAND} — Spend crypto anywhere`,
    description: DEFAULT_DESC,
  },
  {
    path: '/about',
    title: `About ${BRAND}`,
    description: `Learn about ${BRAND} — the crypto debit card built for reliable worldwide spending with Visa.`,
  },
  {
    path: '/contact',
    title: `Contact ${BRAND}`,
    description: `Contact ${BRAND} support or business partnerships for card, payment, and merchant questions.`,
  },
  {
    path: '/card-how-to-use',
    title: `How to use ${BRAND} Card`,
    description:
      'Get your Anytap Visa card in six steps — create an account, complete KYC, top up with USDT, and spend worldwide.',
  },
  {
    path: '/card-who-can-apply',
    title: `Who can apply for ${BRAND} Card`,
    description:
      'Eligibility for Anytap Card — apply from anywhere if you are 18+ with a valid government ID. No bank account required.',
  },
  {
    path: '/card-benefits',
    title: `${BRAND} Card benefits`,
    description:
      'Why Anytap Card: 60+ BIN redundancy, Apple Pay / Google Pay / Samsung Pay, and instant USDT top-up.',
  },
  {
    path: '/card-application',
    title: `Apply for ${BRAND} Card`,
    description: 'Start your Anytap Visa card application online — virtual or physical.',
  },
  {
    path: '/apply-card',
    title: `Apply for ${BRAND} Card`,
    description: 'Start your Anytap Visa card application online — virtual or physical.',
  },
  {
    path: '/payment-why',
    title: `Why crypto pay | ${BRAND}`,
    description: 'Why businesses and users choose crypto payments with Anytap.',
  },
  {
    path: '/payment-how',
    title: `How crypto payments work | ${BRAND}`,
    description: 'How Anytap payment integration works — from checkout to settlement.',
  },
  {
    path: '/payment-business',
    title: `${BRAND} for business`,
    description: 'Accept crypto payments with Anytap — built for teams and merchants.',
  },
  {
    path: '/merchant-apply',
    title: `Merchant apply | ${BRAND}`,
    description: 'Apply to accept crypto payments with Anytap as a merchant.',
  },
  {
    path: '/innovation-tech',
    title: `${BRAND} tech stack`,
    description: 'BIN redundancy, risk rules, and the technology behind Anytap Card.',
  },
  {
    path: '/innovation-vision',
    title: `${BRAND} Web3 vision`,
    description: 'Anytap roadmap and Web3 vision for everyday crypto spending.',
  },
  {
    path: '/innovation-market',
    title: `Crypto card market outlook | ${BRAND}`,
    description: 'Market outlook for stablecoins and crypto debit cards with Anytap.',
  },
  {
    path: '/referral-why',
    title: `${BRAND} referral program`,
    description: 'Earn rewards when people you refer top up their Anytap cards.',
  },
  {
    path: '/referral-earn',
    title: `Earn more with ${BRAND} referral`,
    description: 'Referral tiers and commissions — earn more when your network tops up.',
  },
  {
    path: '/referral-apply',
    title: `Apply for ${BRAND} referral`,
    description: 'Join the Anytap referral partner program and get your unique code.',
  },
  {
    path: '/security',
    title: `Security | ${BRAND}`,
    description: 'How Anytap protects accounts, cards, and crypto deposits.',
  },
  {
    path: '/privacy',
    title: `Privacy Policy | ${BRAND}`,
    description: 'Anytap Privacy Policy — how we collect, use, and protect your information.',
  },
  {
    path: '/terms',
    title: `Terms of Service | ${BRAND}`,
    description: 'Anytap Terms of Service for the card, wallet, and related services.',
  },
  {
    path: '/cookies',
    title: `Cookie Policy | ${BRAND}`,
    description: 'Anytap Cookie Policy — how we use cookies and similar technologies.',
  },
  {
    path: '/disclosure',
    title: `Risk Disclosure | ${BRAND}`,
    description: 'Anytap risk disclosure for crypto deposits, cards, and related services.',
  },
];

const NOINDEX_PREFIXES = [
  '/login',
  '/sign-up',
  '/forgot-password',
  '/account',
  '/admin',
  '/demo',
  '/kyc',
  '/merchant-apply/form',
];

const PAGE_MAP = new Map(SEO_PAGES.map((p) => [normalizePath(p.path), p]));

export function normalizePath(pathname: string): string {
  const path = pathname.replace(/\/$/, '') || '/';
  return path;
}

export function resolveSeo(pathname: string): PageSeo {
  const path = normalizePath(pathname);
  const exact = PAGE_MAP.get(path);
  if (exact) return exact;

  const noindex = NOINDEX_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );

  if (path === '/login') {
    return {
      path,
      title: `Log in | ${BRAND}`,
      description: `Sign in to your ${BRAND} account.`,
      noindex: true,
    };
  }
  if (path === '/sign-up' || path.startsWith('/sign-up/')) {
    return {
      path,
      title: `Sign up | ${BRAND}`,
      description: `Create your ${BRAND} account and get a crypto debit card.`,
      noindex: true,
    };
  }
  if (path.startsWith('/account')) {
    return {
      path,
      title: `My account | ${BRAND}`,
      description: `${BRAND} member portal.`,
      noindex: true,
    };
  }
  if (path.startsWith('/admin')) {
    return {
      path,
      title: `Admin | ${BRAND}`,
      description: `${BRAND} admin portal.`,
      noindex: true,
    };
  }

  return {
    path,
    title: BRAND,
    description: DEFAULT_DESC,
    noindex,
  };
}

export function absoluteUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${SITE_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}

export function defaultOgImage(): string {
  return DEFAULT_OG;
}

/** Public URLs for sitemap.xml (indexable marketing pages only). */
export function sitemapEntries(): { loc: string; priority: string }[] {
  return SEO_PAGES.filter((p) => !p.noindex).map((p) => ({
    loc: absoluteUrl(p.path === '/' ? '/' : p.path),
    priority: p.path === '/' ? '1.0' : '0.7',
  }));
}
