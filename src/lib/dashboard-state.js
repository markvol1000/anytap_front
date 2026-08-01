/** Dashboard view resolver — built on user-centric member states (member-state.js). */

import {
  MEMBER_STATE,
  resolveMemberState,
  getMemberDashboardConfig,
  isZeroBalanceState,
} from './member-state.js';

export const DASHBOARD_JOURNEY = [
  'Account',
  'KYC',
  'Apply Card',
  'Issuing',
  'Activate',
  'Active',
];

const QA = (label, icon, opts = {}) => ({ label, icon, ...opts });

const QUICK_ACTIONS = {
  kyc_required: [
    QA('Learn About Card Benefits', 'globe', { href: '/card-benefits' }),
  ],
  card_apply: [
    QA('Learn About Card Benefits', 'globe', { href: '/card-benefits' }),
  ],
  activate: [
    QA('Activate Card', 'creditCard', { nextScreen: 'card', accent: true }),
    QA('Contact Support', 'mail', { nextScreen: 'support' }),
  ],
};

const WALLET_EMPTY = {
  mode: 'empty',
  title: 'No wallet balance yet.',
  hint: 'Top up after your card is activated.',
};

/**
 * Dashboard card area — one display mode per member state (avoids overlapping branches).
 * @returns {'none'|'processing'|'carousel'|'single'}
 */
export function resolveDashboardCardDisplay(memberState, accountState, userCards = []) {
  const cs = accountState?.cardStatus;
  const hasCards = userCards.length > 0;

  if (['kyc_required', 'kyc_pending', 'card_apply_ready'].includes(memberState)) {
    return 'none';
  }

  if (memberState === MEMBER_STATE.CARD_ACTIVE && hasCards) {
    return 'carousel';
  }

  if (memberState === MEMBER_STATE.CARD_ISSUING) {
    if (['deposit_received', 'creating'].includes(cs)) return 'processing';
    if (cs === 'shipping' && hasCards) return 'single';
    if (cs === 'application_review') return 'none';
    return 'none';
  }

  if (memberState === MEMBER_STATE.ACTIVATE_CARD && hasCards) {
    return 'single';
  }

  return 'none';
}

/**
 * @param {object} accountState
 * @param {object[]} [userCards]
 */
export function resolveDashboardView(accountState, userCards = []) {
  const memberState = resolveMemberState(accountState);
  const cfg = getMemberDashboardConfig(memberState, accountState);
  const zeroBalance = isZeroBalanceState(accountState, userCards);

  const quickActions = cfg.showQuickActions
    ? (QUICK_ACTIONS[cfg.quickActionsKey] ?? [])
    : [];

  const showCarousel = cfg.showCarousel && memberState === MEMBER_STATE.CARD_ACTIVE;
  const showWalletHero = cfg.showWalletHero && !zeroBalance;
  const cardDisplay = resolveDashboardCardDisplay(memberState, accountState, userCards);

  const walletBalance = accountState?.walletBalance ?? 0;
  const walletExists = accountState?.walletExists ?? false;

  const wallet = (() => {
    if (memberState === MEMBER_STATE.CARD_ACTIVE && !zeroBalance) {
      return { mode: 'balance', amount: walletBalance.toFixed(2), currency: 'USDT', hint: null };
    }
    if (walletExists && [MEMBER_STATE.CARD_APPLY_READY, MEMBER_STATE.CARD_ISSUING].includes(memberState)) {
      return {
        mode: 'balance',
        amount: walletBalance.toFixed(2),
        currency: 'USDT',
        hint: walletBalance > 0 ? null : 'Top up after your card is activated.',
      };
    }
    return WALLET_EMPTY;
  })();

  return {
    memberState,
    dashboardLayout: cfg.dashboardLayout
      ?? (memberState === MEMBER_STATE.CARD_ACTIVE ? 'wallet' : 'onboarding'),
    cardDisplay,
    journeyIndex: cfg.journeyIndex,
    journeyLead: cfg.journeyLead,
    showCarousel,
    showJourney: cfg.showJourney,
    showActiveStatus: memberState === MEMBER_STATE.CARD_ACTIVE && !showCarousel,
    showVariantTabs: cfg.showVariantTabs ?? false,
    showWalletBalance: cfg.showWalletBalance,
    showWalletHero,
    showZeroBalancePrompt: zeroBalance,
    showEmptyCard: cfg.showEmptyCard ?? false,
    emptyCardLabel: cfg.emptyCardLabel,
    emptyCardStatus: cfg.emptyCardStatus,
    showGreyCard: cfg.showGreyCard ?? false,
    greyCardBlur: cfg.greyCardBlur,
    greyCardShimmer: cfg.greyCardShimmer,
    canApplyCard: cfg.canApplyCard ?? false,
    showActivity: cfg.showActivity,
    showEarnings: cfg.showEarnings ?? false,
    showCardsSection: cfg.showCardsSection ?? false,
    showWalletBridge: cfg.showWalletBridge ?? false,
    showTransactions: cfg.showActivity ?? true,
    wallet,
    quickActions,
    quickActionsLayout: quickActions.length === 1 ? 'single' : quickActions.length <= 2 ? 'duo' : 'quad',
    transactionsEmpty: cfg.transactionsEmpty,
    hero: cfg.hero,
    zeroBalanceCta: zeroBalance
      ? { label: 'Top Up Now', nextScreen: 'topup' }
      : null,
  };
}

export function formatWalletDisplay(amount, currency = 'USDT') {
  return `${amount} ${currency}`;
}

export function runDashboardCta(s, cta) {
  if (!cta || cta.disabled) return;
  if (cta.href) {
    window.location.href = cta.href;
    return;
  }
  if (cta.action === 'verifyIdentity') {
    if (typeof s.handleVerifyIdentity === 'function') {
      s.handleVerifyIdentity();
      return;
    }
    s.go?.('kyc');
    return;
  }
  if (cta.action === 'refresh') {
    s.showToast('Checking verification status…');
    return;
  }
  if (cta.action === 'trackDelivery') {
    s.showToast('Opening tracking link…');
    return;
  }
  if (cta.action === 'activate') {
    s.go('card');
    setTimeout(() => {
      if (typeof s.openActivePhysical === 'function') {
        s.openActivePhysical(s.currentCard);
      }
    }, 100);
    return;
  }
  if (cta.toast) {
    s.showToast(cta.toast);
    return;
  }
  if (cta.nextScreen) {
    s.go(cta.nextScreen);
    return;
  }
  if (cta.secondaryAction === 'copyAddress') {
    s.copy(s.copyAddress ?? '', 'Address copied');
  }
}

/** @deprecated Use resolveMemberState from member-state.js */
export function getDashboardJourneyIndex(kycStatus, cardStatus) {
  return resolveDashboardView({ kycStatus, cardStatus }).journeyIndex;
}

export function shouldShowOnboardingJourney(kycStatus, cardStatus) {
  return resolveDashboardView({ kycStatus, cardStatus }).showJourney;
}

export function getJourneyLead(kycStatus, cardStatus) {
  return resolveDashboardView({ kycStatus, cardStatus }).journeyLead;
}
