/**
 * User-centric member state — screen design source of truth.
 * API fields (kycStatus, cardStatus) map here; UI reads memberState only.
 */

import { hasCompletedKycProfile } from './member-profile.js';

/** @typedef {'kyc_required'|'kyc_pending'|'card_apply_ready'|'card_issuing'|'activate_card'|'card_active'} MemberStateId */

export const MEMBER_STATE = {
  KYC_REQUIRED: 'kyc_required',
  KYC_PENDING: 'kyc_pending',
  CARD_APPLY_READY: 'card_apply_ready',
  CARD_ISSUING: 'card_issuing',
  ACTIVATE_CARD: 'activate_card',
  CARD_ACTIVE: 'card_active',
};

/** Display order for dev scenario picker & docs */
export const MEMBER_STATE_ORDER = [
  MEMBER_STATE.KYC_REQUIRED,
  MEMBER_STATE.KYC_PENDING,
  MEMBER_STATE.CARD_APPLY_READY,
  MEMBER_STATE.CARD_ISSUING,
  MEMBER_STATE.ACTIVATE_CARD,
  MEMBER_STATE.CARD_ACTIVE,
];

export const MEMBER_STATE_LABELS = {
  kyc_required: '① KYC Required',
  kyc_pending: '② KYC Pending',
  card_apply_ready: '③ Card Apply Ready',
  card_issuing: '④ Card Issuing',
  activate_card: '⑤ Activate Card',
  card_active: '⑥ Card Active',
};

/** B2B — separate from card lifecycle */
export const B2B_STATE = {
  NOT_APPLIED: 'not_applied',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

/**
 * Map backend/mock account fields → user-facing member state.
 * KYC form (legal name) must be completed before leaving KYC_REQUIRED —
 * even when the backend auto-sets kycStatus=APPROVED at signup.
 * @param {{ kycStatus: string, cardStatus: string, needsActivation?: boolean, name?: string }} accountState
 * @returns {MemberStateId}
 */
export function resolveMemberState(accountState) {
  const { cardStatus, needsActivation, hasActiveCard } = accountState || {};
  const status = String(accountState?.kycStatus || 'pending').toLowerCase();

  if (status === 'under_review' || status === 'rejected') {
    return MEMBER_STATE.KYC_PENDING;
  }

  // Pending, or BE "approved" without a completed KYC profile → stay on KYC.
  if (!hasCompletedKycProfile({
    ...accountState,
    kycStatus: status === 'completed' ? 'approved' : status,
  })) {
    return MEMBER_STATE.KYC_REQUIRED;
  }

  if (hasActiveCard) return MEMBER_STATE.CARD_ACTIVE;
  if (cardStatus === 'not_issued') return MEMBER_STATE.CARD_APPLY_READY;
  // `applied` is the ALB synonym for application_review after /cards/{id}/register.
  if (['deposit_received', 'creating', 'shipping', 'application_review', 'applied'].includes(cardStatus)) {
    return MEMBER_STATE.CARD_ISSUING;
  }
  if (cardStatus === 'issued' || needsActivation) return MEMBER_STATE.ACTIVATE_CARD;
  if (['active', 'frozen'].includes(cardStatus)) return MEMBER_STATE.CARD_ACTIVE;

  return MEMBER_STATE.CARD_APPLY_READY;
}

export function resolveB2bState(accountState) {
  return accountState?.b2bStatus ?? B2B_STATE.NOT_APPLIED;
}

/** Card exists but balance is zero — overlay on CARD_ACTIVE */
export function isZeroBalanceState(accountState, userCards = []) {
  if (resolveMemberState(accountState) !== MEMBER_STATE.CARD_ACTIVE) return false;
  if (accountState.zeroBalance) return true;
  if (!userCards.length) return false;
  return userCards.every((c) => {
    if (!c.balance) return true;
    const n = parseFloat(String(c.balance).replace(/[^\d.]/g, ''));
    return Number.isNaN(n) || n <= 0;
  });
}

/**
 * Dashboard hero + section flags per member state.
 * Consumed by dashboard-state.js → account-dashboard.jsx
 */
export function getMemberDashboardConfig(memberState, accountState) {
  const { cardStatus, flowState } = accountState || {};
  const isShipping = cardStatus === 'shipping';
  const isAppReview = cardStatus === 'application_review' || cardStatus === 'applied';
  const hasTransactions = flowState === 'CARD_ACTIVE_WITH_TRANSACTIONS'
    || flowState === 'CARD_ACTIVE_THREE_CARDS';

  const configs = {
    [MEMBER_STATE.KYC_REQUIRED]: {
      memberState,
      dashboardLayout: 'onboarding',
      journeyIndex: 1,
      journeyLead: null,
      showJourney: false,
      showEmptyCard: false,
      canApplyCard: false,
      showWalletHero: false,
      showWalletBalance: false,
      showActivity: false,
      showEarnings: false,
      showCardsSection: false,
      showWalletBridge: false,
      showQuickActions: false,
      hero: {
        mode: 'welcome',
        title: 'Verify your identity',
        body: 'Complete KYC to unlock card application and wallet.',
        sub: 'About 5 minutes · passport or ID',
        primaryCta: { label: 'Verify Identity', action: 'verifyIdentity' },
      },
      transactionsEmpty: null,
    },

    [MEMBER_STATE.KYC_PENDING]: {
      memberState,
      dashboardLayout: 'onboarding',
      journeyIndex: 1,
      journeyLead: null,
      showJourney: false,
      showEmptyCard: false,
      canApplyCard: false,
      showWalletHero: false,
      showWalletBalance: false,
      showActivity: false,
      showEarnings: false,
      showCardsSection: false,
      showWalletBridge: false,
      showQuickActions: false,
      hero: {
        mode: 'banner',
        bannerVariant: 'review',
        title: 'Identity verification in progress',
        body: 'We are reviewing your documents. Profile, card apply, and wallet unlock after approval.',
        eta: 'Usually 24–48 hours',
      },
      transactionsEmpty: null,
    },

    [MEMBER_STATE.CARD_APPLY_READY]: {
      memberState,
      dashboardLayout: 'onboarding',
      journeyIndex: 2,
      journeyLead: 'Step 3 of 6 — Apply for your card',
      showJourney: true,
      showEmptyCard: false,
      canApplyCard: true,
      showWalletHero: false,
      showWalletBalance: false,
      showActivity: false,
      showEarnings: false,
      showCardsSection: false,
      showWalletBridge: false,
      showQuickActions: true,
      quickActionsKey: 'card_apply',
      hero: {
        mode: 'verified',
        title: 'Identity verified — apply for a card',
        verified: true,
        body: 'Choose a virtual or physical Visa. After you apply, you’ll deposit the issuance fee (100 USDT) before shipping starts.',
        sub: 'Virtual — fast · Physical — ships in 7–14 days',
        primaryCta: { label: 'Apply Card', nextScreen: 'cardApply' },
      },
      transactionsEmpty: null,
    },

    [MEMBER_STATE.CARD_ISSUING]: {
      memberState,
      dashboardLayout: 'issuing',
      journeyIndex: 3,
      journeyLead: isAppReview
        ? 'Step 4 of 6 — Pay issuance fee (100 USDT)'
        : isShipping
          ? 'Step 4 of 6 — Card on the way'
          : 'Step 4 of 6 — Your card is being prepared',
      showJourney: true,
      showEmptyCard: false,
      showGreyCard: !isShipping && !isAppReview,
      greyCardBlur: !isShipping && !isAppReview,
      greyCardShimmer: !isShipping && !isAppReview && (cardStatus === 'creating' || cardStatus === 'deposit_received'),
      canApplyCard: false,
      showWalletHero: false,
      showWalletBalance: false,
      showActivity: false,
      showEarnings: false,
      showCardsSection: true,
      showWalletBridge: false,
      showQuickActions: false,
      hero: isAppReview
        ? {
          mode: 'banner',
          bannerVariant: 'review',
          title: 'Deposit 100 USDT to continue issuance.',
          body: 'Send the card issuance fee to the deposit address below. This address stays visible until shipping starts.',
          eta: 'TRC-20 · 100 USDT',
        }
        : isShipping
        ? {
          mode: 'shipping',
          statusLabel: 'In delivery',
          tracking: accountState.trackingNumber ?? 'TRK-839204',
          eta: accountState.estimatedDelivery ?? '7–14 days',
          deliveryProgress: accountState.deliveryProgress ?? 0.4,
          carrier: accountState.carrier,
          secondaryCta: { label: 'Track Delivery', action: 'trackDelivery' },
        }
        : {
          mode: 'card',
          cardBlur: true,
          statusLabel: cardStatus === 'deposit_received' ? 'Payment received' : 'Creating Card…',
          microProgress: { filled: cardStatus === 'creating' ? 4 : 3, total: 4 },
          sub: cardStatus === 'deposit_received'
            ? 'Usually within a few minutes.'
            : 'Estimated 1–3 minutes.',
        },
      transactionsEmpty: {
        title: 'No transactions yet.',
        msg: isAppReview
          ? 'Transactions appear after your card is issued and activated.'
          : 'Transactions appear after your card is activated.',
        icon: 'clock',
      },
    },

    [MEMBER_STATE.ACTIVATE_CARD]: {
      memberState,
      dashboardLayout: 'onboarding',
      journeyIndex: 4,
      journeyLead: 'Step 5 of 6 — Register your card',
      showJourney: true,
      showEmptyCard: false,
      showGreyCard: false,
      canApplyCard: false,
      showWalletHero: false,
      showWalletBalance: false,
      showActivity: false,
      showEarnings: false,
      showCardsSection: false,
      showWalletBridge: false,
      showQuickActions: true,
      quickActionsKey: 'activate',
      hero: {
        mode: 'banner',
        bannerVariant: 'activate',
        title: 'Register your card to unlock your wallet',
        body: 'B2B and B2C both need this step. Enter the card number from your shipped card — then your personal wallet opens.',
        primaryCta: { label: 'Activate Card', action: 'activate' },
        modeCard: true,
        statusLabel: 'Issued — registration required',
        cardBlur: false,
      },
      transactionsEmpty: null,
    },

    [MEMBER_STATE.CARD_ACTIVE]: {
      memberState,
      dashboardLayout: 'wallet',
      journeyIndex: 5,
      journeyLead: null,
      showJourney: false,
      showEmptyCard: false,
      showGreyCard: false,
      canApplyCard: true,
      showWalletHero: true,
      showWalletBalance: false,
      showActivity: hasTransactions,
      showEarnings: true,
      showCardsSection: true,
      showWalletBridge: true,
      showCarousel: true,
      showQuickActions: false,
      showVariantTabs: (accountState.cardCount ?? 1) > 1,
      hero: {
        mode: 'card',
        statusLabel: cardStatus === 'frozen' ? 'Frozen' : 'Active',
        showBalanceOnCard: true,
        heroCard: true,
      },
      transactionsEmpty: null,
    },
  };

  return configs[memberState] ?? configs[MEMBER_STATE.KYC_REQUIRED];
}

export function memberStateForScenario(scenarioKey, accountState) {
  const state = resolveMemberState(accountState);
  return MEMBER_STATE_LABELS[state] ?? scenarioKey;
}
