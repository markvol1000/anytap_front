/**
 * Bridges mockData.ts flow bundles → portal accountState + UI context.
 */

import { MOCK_FLOW_DATA, UserFlowState } from './mockData.ts';
import { buildUnifiedActivityItems } from './activity.js';
import { applyProfileToAccountState, getMemberProfile } from './member-profile.js';

/** Dev scenario keys (camelCase) ↔ UserFlowState */
export const MOCK_FLOW_SCENARIO_KEYS = [
  'signupOnly',
  'kycPending',
  'kycApproved',
  'cardApplied',
  'cardShipping',
  'cardRegistered',
  'cardActiveWithTransactions',
  'cardActiveThree',
];

export const FLOW_STATE_LABELS = {
  signupOnly: '1 · KYC required',
  kycPending: '1b · KYC pending',
  kycApproved: '2 · KYC approved',
  cardApplied: '3 · Card applied (review)',
  cardShipping: '4 · Card shipping',
  cardRegistered: '5 · Card registered',
  cardActiveWithTransactions: '6 · Active + transactions',
  cardActiveThree: '7 · Active · 3 cards (max)',
};

const SCENARIO_TO_FLOW = {
  signupOnly: UserFlowState.SIGNUP_ONLY,
  kycPending: UserFlowState.SIGNUP_ONLY,
  kycApproved: UserFlowState.KYC_APPROVED,
  cardApplied: UserFlowState.CARD_APPLIED,
  cardShipping: UserFlowState.CARD_SHIPPING,
  cardRegistered: UserFlowState.CARD_REGISTERED,
  cardActiveWithTransactions: UserFlowState.CARD_ACTIVE_WITH_TRANSACTIONS,
  cardActiveThree: UserFlowState.CARD_ACTIVE_THREE_CARDS,
  /** Legacy aliases */
  newUser: UserFlowState.SIGNUP_ONLY,
  notIssued: UserFlowState.KYC_APPROVED,
  kycReview: UserFlowState.SIGNUP_ONLY,
  depositReceived: UserFlowState.CARD_APPLIED,
  cardCreating: UserFlowState.CARD_APPLIED,
  shipping: UserFlowState.CARD_SHIPPING,
  activateCard: UserFlowState.CARD_REGISTERED,
  issued: UserFlowState.CARD_REGISTERED,
  active: UserFlowState.CARD_REGISTERED,
  activeThree: UserFlowState.CARD_ACTIVE_THREE_CARDS,
  zeroBalance: UserFlowState.CARD_REGISTERED,
};

function kycToLegacy(status) {
  if (status === 'not_started' || status === 'pending') return 'pending';
  if (status === 'under_review') return 'under_review';
  if (status === 'approved') return 'approved';
  return 'rejected';
}

function flowToCardStatus(bundle) {
  const { flowState, registeredCards } = bundle;
  if (flowState === UserFlowState.SIGNUP_ONLY || flowState === UserFlowState.KYC_APPROVED) {
    return 'not_issued';
  }
  if (flowState === UserFlowState.CARD_APPLIED) return 'application_review';
  if (flowState === UserFlowState.CARD_SHIPPING) return 'shipping';
  if (registeredCards.some((c) => c.status === 'issued')) return 'issued';
  return 'active';
}

function toUserCard(reg) {
  return {
    id: reg.id,
    variant: reg.variant,
    label: reg.label,
    network: reg.network,
    scheme: 'visa',
    last4: reg.last4,
    fullNumber: reg.fullNumber,
    expiry: reg.expiry,
    cvv: reg.cvv,
    holder: reg.holder,
    isPrimary: reg.isPrimary,
    status: reg.status,
    balanceUsdt: reg.balanceUsdt,
    balance: reg.balanceUsdt != null ? `${reg.balanceUsdt.toFixed(2)} USDT` : undefined,
    dailySpendLimit: reg.dailySpendLimit,
    dailySpendUsed: reg.dailySpendUsed,
    atmDailyLimit: reg.atmDailyLimit,
    atmDailyUsed: reg.atmDailyUsed,
    availableLimit: reg.availableLimit,
    issuedAt: reg.issuedAt,
    linkedWallet: reg.linkedWallet,
    trackingNumber: reg.trackingNumber,
    carrier: reg.carrier,
    estimatedDelivery: reg.estimatedDelivery,
  };
}

function toActivityTransactions(transactions) {
  return transactions.map((tx) => ({ ...tx }));
}

function buildAccountState(bundle) {
  const app = bundle.cardApplications[0];
  const shippingCard = bundle.registeredCards.find((c) => c.status === 'shipping');

  return {
    name: bundle.user.name,
    email: bundle.user.email,
    flowState: bundle.flowState,
    kycStatus: kycToLegacy(bundle.kyc.status),
    cardStatus: flowToCardStatus(bundle),
    cardCount: bundle.registeredCards.filter((c) => c.status === 'active').length || undefined,
    walletExists: bundle.wallet.exists,
    walletBalance: bundle.wallet.balanceUsdt,
    walletAddress: bundle.wallet.address,
    trackingNumber: shippingCard?.trackingNumber ?? app?.reference,
    deliveryProgress: bundle.flowState === UserFlowState.CARD_SHIPPING ? 0.45 : undefined,
    carrier: shippingCard?.carrier,
    estimatedDelivery: shippingCard?.estimatedDelivery,
    pendingVariant: app?.cardVariant,
    cardApplicationRef: app?.reference,
  };
}

/**
 * @param {string} scenarioKey
 * @returns {{
 *   scenarioKey: string,
 *   flowState: string,
 *   accountState: object,
 *   user: object,
 *   wallet: object,
 *   kyc: object,
 *   cards: object[],
 *   cardApplications: object[],
 *   registeredCards: object[],
 *   userCards: object[],
 *   transactions: object[],
 *   activityItems: object[],
 *   topUpHistory: object[],
 * }}
 */
/** Loading / new user — no mock transactions or cards. Never invent demo name/email. */
export function getEmptyAccountContext(overrides = {}) {
  const bundle = MOCK_FLOW_DATA[UserFlowState.SIGNUP_ONLY];
  const email = String(overrides.email ?? '').trim();
  const nameHint = String(overrides.name ?? overrides.fullName ?? '').trim();
  const rawStatus = String(overrides.kycStatus || overrides.status || '').toLowerCase();
  const isKycOk = ['approved', 'completed', 'active'].includes(rawStatus);
  const cardStatus = String(overrides.cardStatus || '').toLowerCase();

  const accountState = applyProfileToAccountState({
    ...buildAccountState(bundle),
    name: nameHint,
    email,
    ...(isKycOk ? { kycStatus: 'approved' } : {}),
    ...(cardStatus ? { cardStatus } : {}),
  }, { ...overrides, email, name: nameHint });

  const hasCard = isKycOk && (cardStatus === 'active' || cardStatus === 'issued' || !!overrides.cardId || !!overrides.hasCard);
  const userCards = hasCard ? [{
    id: `card-${overrides.userId || 'default'}`,
    variant: 'virtual',
    last4: '0000',
    balance: '—',
    status: 'active',
    isPrimary: true,
    holderName: nameHint,
  }] : [];

  return {
    scenarioKey: 'signupOnly',
    flowState: hasCard ? UserFlowState.CARD_ACTIVE_WITH_TRANSACTIONS : (isKycOk ? UserFlowState.KYC_APPROVED : UserFlowState.SIGNUP_ONLY),
    accountState,
    user: {
      id: overrides.userId || '',
      name: accountState.name,
      email: accountState.email,
    },
    wallet: { exists: !!overrides.cregisWalletAddress, balanceUsdt: 0, network: bundle.wallet.network },
    kyc: bundle.kyc,
    cards: bundle.cards,
    cardApplications: [],
    registeredCards: [],
    userCards,
    transactions: [],
    activityItems: [],
    topUpHistory: [],
    referralCode: null,
  };
}

export function getMockContext(scenarioKey = 'signupOnly') {
  const flowState = SCENARIO_TO_FLOW[scenarioKey] ?? UserFlowState.SIGNUP_ONLY;
  const bundle = MOCK_FLOW_DATA[flowState] ?? MOCK_FLOW_DATA[UserFlowState.SIGNUP_ONLY];
  const accountState = applyProfileToAccountState(buildAccountState(bundle));

  if (scenarioKey === 'kycPending' || scenarioKey === 'kycReview') {
    accountState.kycStatus = 'under_review';
    accountState.email = accountState.email || 'kyc-pending@anytap.io';
    if (!getMemberProfile().name) {
      accountState.name = 'Pending Member';
    }
  }

  const userCards = bundle.registeredCards.map(toUserCard);
  const activityItems = buildUnifiedActivityItems(
    toActivityTransactions(bundle.transactions),
    bundle.topUpHistory,
  );

  return {
    scenarioKey,
    flowState: bundle.flowState,
    accountState,
    user: { ...bundle.user, name: accountState.name, email: accountState.email },
    wallet: bundle.wallet,
    kyc: bundle.kyc,
    cards: bundle.cards,
    cardApplications: bundle.cardApplications,
    registeredCards: bundle.registeredCards,
    userCards,
    transactions: bundle.transactions,
    activityItems,
    topUpHistory: bundle.topUpHistory,
  };
}

/** Build legacy ACCOUNT_SCENARIOS map for tooling that reads static objects */
export function buildAccountScenarios() {
  return Object.fromEntries(
    MOCK_FLOW_SCENARIO_KEYS.map((key) => [key, getMockContext(key).accountState]),
  );
}

export function defaultFlowScenarioKey() {
  return 'cardActiveWithTransactions';
}
