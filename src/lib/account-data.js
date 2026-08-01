/**
 * Account core — mock state, card lifecycle, navigation, portal config.
 * Split modules (re-exported for backward compat with `import * as A`):
 *   auth.js        — login, signup, session
 *   card-helpers.js — masking, formatting, status badges
 *   activity.js    — transactions, top-up history
 */

import { buildAccountScenarios } from './mock-context.js';
import { hasCompletedKycProfile } from './member-profile.js';
import { SCREEN_ROUTES } from '../constants/routes.ts';
import { MAX_CARDS_PER_USER, getCardIssuanceFee } from '../constants/card.ts';

export * from './auth.js';
export * from './card-helpers.js';
export * from './activity.js';
export {
  getMockContext,
  getEmptyAccountContext,
  MOCK_FLOW_SCENARIO_KEYS,
  FLOW_STATE_LABELS,
  buildAccountScenarios,
  defaultFlowScenarioKey,
} from './mock-context.js';
export { UserFlowState, MOCK_FLOW_DATA } from './mockData.ts';
export {
  getReferralContext,
  getEmptyReferralContext,
  getReferralDashboardEarnings,
  getReferralNetworkPreview,
  referralPageTitles,
  REFERRAL_SCENARIO_KEYS,
  REFERRAL_STATE_LABELS,
} from './referral-context.js';
export { ReferralPartnerState, REFERRAL_BENEFITS } from './referral-mock.ts';

export { SCREEN_ROUTES } from '../constants/routes.ts';
export {
  MAX_CARDS_PER_USER,
  CARD_ISSUANCE_FEE,
  CARD_ISSUANCE_FEES,
  getCardIssuanceFee,
  CARD_THEME,
  CARD_BRAND_LABEL,
  CARD_NETWORK,
} from '../constants/card.ts';

// ─── Brand / wallet constants ─────────────────────────────────────────────────

export const ACCENT = '#FF5500';
export const ADDRESS = '';
export const REFERRAL_CODE = 'JOHN24';

// ─── Mock card data ───────────────────────────────────────────────────────────

export const MOCK_ACCOUNT_STATE = {
  kycStatus: 'approved',
  cardStatus: 'active',
};

export const MOCK_CARD = {
  last4: '4921',
  fullNumber: '5412 1234 5678 4921',
  expiry: '06/30',
  /** Mock sensitive value — in production fetched on demand from Wasabi; never stored in DB */
  cvv: '847',
  holder: 'JOHN DOE',
  type: 'Virtual Card',
  network: 'Visa',
  physicalLast4: '8804',
  physicalFullNumber: '4023 7711 5562 8804',
};

/** Per-user card records — up to {@link MAX_CARDS_PER_USER} */
export const CARD_TEMPLATES = {
  virtual4921: {
    id: 'card-1',
    variant: 'virtual',
    label: 'Virtual Visa Card',
    network: 'Visa',
    scheme: 'visa',
    last4: '4921',
    fullNumber: '5412 1234 5678 4921',
    expiry: '06/30',
    cvv: '847',
    holder: 'JOHN DOE',
    isPrimary: true,
  },
  physical8804: {
    id: 'card-2',
    variant: 'physical',
    label: 'Physical Visa Card',
    network: 'Visa',
    scheme: 'visa',
    last4: '8804',
    fullNumber: '4023 7711 5562 8804',
    expiry: '09/29',
    cvv: '612',
    holder: 'JOHN DOE',
    isPrimary: false,
  },
  physical2231: {
    id: 'card-3',
    variant: 'physical',
    label: 'Physical Visa Card',
    network: 'Visa',
    scheme: 'visa',
    last4: '2231',
    fullNumber: '4023 8811 9902 2231',
    expiry: '03/31',
    cvv: '529',
    holder: 'JOHN DOE',
    isPrimary: false,
  },
  virtual1123: {
    id: 'card-3',
    variant: 'virtual',
    label: 'Virtual Visa Card',
    network: 'Visa',
    scheme: 'visa',
    last4: '1123',
    fullNumber: '4938 7512 3456 1123',
    expiry: '11/30',
    cvv: '318',
    holder: 'JOHN DOE',
    isPrimary: false,
  },
};

// ─── Card lifecycle ───────────────────────────────────────────────────────────

/** Canonical card lifecycle — API should return one of these */
export const CARD_STATUSES = [
  'not_issued',
  'deposit_received',
  'creating',
  'issued',
  'active',
  'shipping',
  'frozen',
  'cancelled',
  'application_review',
];

export function resolveUserCards(accountState) {
  const { kycStatus, cardStatus, cardCount = 1, zeroBalance, pendingVariant } = accountState;
  if (kycStatus !== 'approved') return [];
  if (['not_issued', 'deposit_received', 'creating', 'cancelled', 'application_review', 'applied'].includes(cardStatus)) return [];

  const primaryBal = zeroBalance ? '0.00 USDT' : '245.80 USDT';
  const secondaryBal = zeroBalance ? '0.00 USDT' : '120.00 USDT';

  const withStatus = (tpl, status, balanceOverride) => ({
    ...tpl,
    status,
    balance: status === 'active'
      ? (balanceOverride ?? (tpl.isPrimary ? primaryBal : secondaryBal))
      : undefined,
  });

  if (cardStatus === 'issued') {
    const tpl = pendingVariant === 'physical'
      ? CARD_TEMPLATES.physical8804
      : CARD_TEMPLATES.virtual4921;
    return [withStatus(tpl, 'issued')];
  }

  if (cardStatus === 'shipping') {
    return [withStatus(CARD_TEMPLATES.physical8804, 'shipping')];
  }

  if (['active', 'frozen'].includes(cardStatus)) {
    const count = cardCount ?? 1;
    const list = [withStatus(CARD_TEMPLATES.virtual4921, cardStatus === 'active' ? 'active' : cardStatus)];
    if (count >= 2) list.push(withStatus(CARD_TEMPLATES.physical8804, 'active'));
    if (count >= 3) list.push(withStatus(CARD_TEMPLATES.virtual1123, 'active'));
    return list;
  }

  return [];
}

export function getCardLimitInfo(cards) {
  const used = cards.length;
  const max = MAX_CARDS_PER_USER;
  return { used, max, canAdd: used < max, atMax: used >= max, shortLabel: `${used} / ${max}` };
}

/** Dashboard/card preview when user has no issued cards yet */
export function previewCardTemplate(kycStatus) {
  if (kycStatus !== 'approved') return null;
  return CARD_TEMPLATES.virtual4921;
}

export function deriveAccountFlags(accountState) {
  const kycStatus = accountState?.kycStatus;
  const cardStatus = accountState?.cardStatus;
  // UI "verified" = KYC approved + legal name on file (not BE auto-APPROVED alone).
  const kycApproved = hasCompletedKycProfile(accountState);
  const cardHasNumber = kycApproved
    && ['issued', 'active', 'shipping', 'frozen'].includes(cardStatus);
  const cardIsActive = cardStatus === 'active';
  const preIssue = ['not_issued', 'deposit_received', 'creating'].includes(cardStatus);
  const cardApplicationPending = cardStatus === 'application_review' || cardStatus === 'applied';
  const cardDimmed = !kycApproved
    || ['not_issued', 'deposit_received', 'creating', 'cancelled', 'application_review', 'applied'].includes(cardStatus);
  return { kycApproved, cardHasNumber, cardIsActive, preIssue, cardApplicationPending, cardDimmed };
}

// ─── Status definitions ───────────────────────────────────────────────────────

export const CARD_STATUS_DEFS = {
  not_issued: {
    label: 'Not Issued',
    dashboardEyebrow: 'CARD STATUS',
    dashboardTitle: 'Virtual Card Not Issued',
    message: 'Deposit 100 USDT to activate card issuance.',
    cardLine: 'Virtual Card',
    cardSubline: 'Not Issued',
    showBalance: false,
    showCardLast4: false,
    showActivity: false,
    cardCompact: true,
    cta: 'Deposit USDT',
    nextScreen: 'topup',
    secondaryCta: 'Copy Address',
    secondaryAction: 'copyAddress',
  },
  deposit_received: {
    label: 'Deposit Received',
    dashboardTitle: 'Deposit Received',
    message: '100 USDT received. Card issuance fee has been deducted.',
    cardLine: 'Virtual Card',
    cardSubline: 'Processing',
    showBalance: false,
    showCardLast4: false,
    showActivity: false,
    cardShimmer: true,
    cta: null,
  },
  creating: {
    label: 'Creating',
    dashboardTitle: 'Card is being created',
    message: 'Estimated 1–3 minutes.',
    cardLine: 'Virtual Card',
    cardSubline: 'Creating',
    showBalance: false,
    showCardLast4: false,
    showActivity: false,
    cardShimmer: true,
    cta: null,
  },
  application_review: {
    label: 'Under Review',
    dashboardTitle: 'Card Application Under Review',
    message: 'Your application is being reviewed. We will notify you by email once a decision is made.',
    cardLine: 'Physical Visa Card',
    cardSubline: 'Under Review',
    showBalance: false,
    showCardLast4: false,
    showActivity: false,
    cardCompact: true,
    cta: null,
    estimate: '1–2 business days',
  },
  issued: {
    label: 'Issued',
    dashboardTitle: 'Virtual Card Issued',
    message: 'Your card has been issued. View card info or activate your card.',
    cardLine: 'Virtual Card',
    cardSubline: 'Issued',
    showBalance: false,
    showCardLast4: true,
    cardMask: 'full',
    showActivity: false,
    cta: 'View Card Info',
    nextScreen: 'card',
    detailOnArrival: true,
    secondaryCta: 'Activate Card',
    secondaryAction: 'activate',
  },
  active: {
    label: 'Active',
    dashboardTitle: null,
    message: null,
    cardLine: 'Virtual Card Active',
    cardSubline: null,
    showBalance: true,
    balance: '245.80 USDT',
    showCardLast4: true,
    cardMask: 'short',
    showActivity: true,
    cta: 'Top Up',
    nextScreen: 'topup',
    secondaryCta: 'View Card Info',
    secondaryAction: 'viewCard',
  },
  shipping: {
    label: 'Shipping',
    message: 'Your physical card is on the way.',
    cardLine: 'Physical Card',
    cardSubline: 'Shipping',
    showBalance: true,
    balance: '$250.00',
    showCardLast4: true,
    cardMask: 'short',
    showActivity: true,
    cta: 'Track Delivery',
  },
  frozen: {
    label: 'Frozen',
    message: 'Your card is temporarily frozen.',
    cardLine: 'Virtual Card',
    cardSubline: 'Frozen',
    showBalance: true,
    balance: '$250.00',
    showCardLast4: true,
    cardMask: 'short',
    showActivity: true,
    cta: 'Contact Support',
    nextScreen: 'support',
  },
  cancelled: {
    label: 'Cancelled',
    message: 'Your card has been permanently cancelled.',
    cardLine: 'Virtual Card',
    cardSubline: 'Cancelled',
    showBalance: false,
    showCardLast4: false,
    showActivity: false,
    cta: 'Contact Support',
    nextScreen: 'support',
  },
};

/** Card status copy — virtual 1 USDT, physical 100 USDT issuance fee */
export function resolveCardStatusDef(cardStatus, accountState = {}) {
  const def = CARD_STATUS_DEFS[cardStatus] ?? CARD_STATUS_DEFS.not_issued;
  const variant = accountState.pendingVariant;

  if (cardStatus === 'not_issued') {
    if (!variant) {
      return {
        ...def,
        dashboardTitle: 'No Card Yet',
        cardLine: 'Card',
        message: 'Apply for a virtual (1 USDT) or physical (100 USDT) card to get started.',
        cta: null,
        secondaryCta: null,
        nextScreen: null,
        secondaryAction: null,
      };
    }
    const fee = getCardIssuanceFee(variant);
    const cardLabel = variant === 'physical' ? 'Physical' : 'Virtual';
    return {
      ...def,
      dashboardTitle: `${cardLabel} Card Not Issued`,
      cardLine: `${cardLabel} Card`,
      message: `Deposit ${fee.amount} ${fee.currency} to activate card issuance.`,
    };
  }

  if (cardStatus === 'deposit_received') {
    const fee = getCardIssuanceFee(variant ?? 'virtual');
    const cardLabel = (variant ?? 'virtual') === 'physical' ? 'Physical' : 'Virtual';
    return {
      ...def,
      cardLine: `${cardLabel} Card`,
      message: `${fee.amount} ${fee.currency} received. Card issuance fee has been deducted.`,
    };
  }

  if ((cardStatus === 'application_review' || cardStatus === 'applied') && variant) {
    const fee = getCardIssuanceFee(variant);
    const cardLabel = variant === 'physical' ? 'Physical' : 'Virtual';
    return {
      ...def,
      cardLine: `${cardLabel} Visa Card`,
      message: `Your application is being reviewed. After approval, deposit ${fee.amount} ${fee.currency} to activate your card.`,
    };
  }

  return def;
}

export const KYC_STATUS_DEFS = {
  pending: {
    label: 'Not Verified',
    message: 'Complete identity verification to apply for a card.',
    cta: 'Start KYC',
    nextScreen: 'kyc',
  },
  pending_wallet: {
    label: 'KYC Verified (Pending Wallet)',
    message: 'Your identity has been verified. Allocating your wallet address...',
    cta: null,
  },
  under_review: {
    label: 'Under Review',
    message: 'Your identity is being verified.',
    cta: null,
  },
  approved: {
    label: 'Verified',
    message: 'Your identity has been verified.',
    cta: null,
  },
  rejected: {
    label: 'Rejected',
    message: 'We were unable to verify your identity.',
    cta: 'Contact Support',
    nextScreen: 'support',
  },
};

// ─── Dev scenarios (derived from mockData flow states) ───────────────────────

export const ACCOUNT_SCENARIOS = buildAccountScenarios();

// ─── Card issuance progress ───────────────────────────────────────────────────

export const ISSUANCE_STEPS = [
  'KYC Approved',
  'Deposit USDT',
  'Card Creating',
  'Card Issued',
  'Active',
];

/** Step states for dashboard status panel — completed | active | pending */
export function getIssuanceStepStates(kycStatus, cardStatus) {
  const isKycOk = kycStatus === 'approved' || kycStatus === 'pending_wallet';
  if (!isKycOk) {
    return ISSUANCE_STEPS.map((label, i) => ({
      label,
      state: i === 0 ? 'active' : 'pending',
    }));
  }

  const terminal = ['active', 'shipping', 'frozen'];
  if (terminal.includes(cardStatus)) {
    return ISSUANCE_STEPS.map((label) => ({ label, state: 'completed' }));
  }

  const activeIdx = {
    not_issued: 1,
    deposit_received: 2,
    creating: 2,
    issued: 4,
    cancelled: 0,
  }[cardStatus] ?? 1;

  return ISSUANCE_STEPS.map((label, i) => {
    if (i < activeIdx) return { label, state: 'completed' };
    if (i === activeIdx) return { label, state: 'active' };
    return { label, state: 'pending' };
  });
}

// ─── Dashboard summary ────────────────────────────────────────────────────────

export const REFERRAL_SUMMARY = { invited: 12, earned: '$48.00' };
export const DASHBOARD_ACTIVE_OVERVIEW = { monthlySpend: '$1,240' };
export const MOCK_UNREAD_NOTIFICATIONS = 2;

// ─── Profile & settings ───────────────────────────────────────────────────────

export const PROFILE_FIELDS = [
  { label: 'Full name',     value: 'John Doe' },
  { label: 'Email',         value: 'john@email.com' },
  { label: 'Phone',         value: '+1 (415) 555-0142' },
  { label: 'Country',       value: 'United States' },
  { label: 'Member since',  value: 'Jun 2026' },
];

export const NOTIF_DEFS = [
  { key: 'tx',       label: 'Transaction alerts', sub: 'Top-ups, payments and refunds' },
  { key: 'security', label: 'Security alerts',    sub: 'Logins and password changes' },
  { key: 'promo',    label: 'Promotions',          sub: 'Offers and rewards' },
  { key: 'product',  label: 'Product updates',     sub: 'New features and announcements' },
];

export const FAQ_DEFS = [
  { q: 'How long does a USDT top-up take?',     a: 'Most deposits credit your card within 1–5 minutes after on-chain confirmation.' },
  { q: 'Which network should I use?',           a: 'Only TRC-20 (TRON). Deposits on any other network will be permanently lost.' },
  { q: 'What is the difference between the cards?', a: 'Both cards run on the Visa network. The virtual card works with Apple Pay and Google Pay for online and contactless pay. The physical card adds in-store chip payments and ATM withdrawals.' },
  { q: 'Why was my deposit not credited?',      a: 'Some global exchanges restrict withdrawals to non-whitelisted external wallets. Confirm your exchange permits transfers to your Anytap deposit address.' },
];

// ─── Portal navigation ────────────────────────────────────────────────────────

export const PAGE_TITLES = {
  home:          ['Home',                         'Welcome back, John'],
  kyc:           ['Identity Verification',        'Complete KYC to unlock your account'],
  card:          ['Cards',                        'View and manage your Anytap cards'],
  cardApply:     ['Apply New Card',               'Request a new Anytap card'],
  cardRegister:  ['Register Existing Card',       'Activate a pre-issued card you received'],
  topup:         ['Wallet',                       'Top up your card or send USDT'],
  transactions:  ['Activity',                     'Wallet and card activity'],
  referral:      ['Referral',                     'Invite friends and earn rewards'],
  settings:      ['My',                           ''],
  profile:       ['Profile', ''],
  security:      ['Security', ''],
  notifications: ['Notifications', ''],
  support:       ['Customer Support', ''],
};

export const NAV_DOCK = [
  { id: 'home',         label: 'Home',     icon: 'home' },
  { id: 'topup',        label: 'Wallet',   icon: 'wallet' },
  { id: 'card',         label: 'Cards',    icon: 'creditCard' },
  { id: 'transactions', label: 'Activity', icon: 'receipt' },
  { id: 'my',           label: 'My',       icon: 'user' },
];

export const NAV_MAIN = [
  { id: 'home',         label: 'Home',     icon: 'chart' },
  { id: 'topup',        label: 'Wallet',   icon: 'wallet' },
  { id: 'card',         label: 'Cards',    icon: 'creditCard' },
  { id: 'transactions', label: 'Activity', icon: 'receipt' },
  { id: 'my',           label: 'My',       icon: 'user' },
];

const PATH_TO_SCREEN = Object.fromEntries(
  Object.entries(SCREEN_ROUTES).map(([screen, path]) => [path, screen]),
);

const LEGACY_PATH_ALIASES = {
  '/account/card/apply': 'cardApply',
  '/account/card/register': 'cardRegister',
  '/account/history': 'transactions',
};

export function pathToScreen(pathname) {
  const base = pathname.replace(/\/$/, '') || '/account';
  if (LEGACY_PATH_ALIASES[base]) return LEGACY_PATH_ALIASES[base];
  return PATH_TO_SCREEN[base] || 'home';
}

/** Wallet + Card Activity keep legacy layout; all other portal screens use v10 unified shell */
export const LEGACY_PORTAL_SCREENS = new Set(['topup', 'transactions']);

export function isUnifiedPortalScreen(screen) {
  return !LEGACY_PORTAL_SCREENS.has(screen);
}

// ─── QR code builder ─────────────────────────────────────────────────────────

export function buildQR() {
  const n = 25;
  const size = 200;
  const c = size / n;
  const finderBoxes = [[0, 0], [0, n - 7], [n - 7, 0]];
  const inAnyFinder = (i, j) => finderBoxes.some(([r, cc]) => i >= r && i < r + 7 && j >= cc && j < cc + 7);
  const finderOn = (i, j) => {
    for (const [r, cc] of finderBoxes) {
      const li = i - r;
      const lj = j - cc;
      if (li >= 0 && li < 7 && lj >= 0 && lj < 7) {
        const border = li === 0 || li === 6 || lj === 0 || lj === 6;
        const center = li >= 2 && li <= 4 && lj >= 2 && lj <= 4;
        return border || center;
      }
    }
    return false;
  };
  let rects = '';
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let on;
      if (inAnyFinder(i, j)) on = finderOn(i, j);
      else {
        const v = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
        on = (v - Math.floor(v)) > 0.52;
      }
      if (on) {
        rects += `<rect x="${(j * c).toFixed(2)}" y="${(i * c).toFixed(2)}" width="${(c + 0.4).toFixed(2)}" height="${(c + 0.4).toFixed(2)}"/>`;
      }
    }
  }
  return `<svg viewBox="0 0 ${size} ${size}" width="100%" height="100%" fill="#14171C">${rects}</svg>`;
}
