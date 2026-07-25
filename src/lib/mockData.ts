/**
 * Anytap user-flow mock data — source of truth for dev scenarios.
 * Replace with API responses before launch.
 */

import type { CardVariant, CardApplicationStatus } from '../types/index.ts';

export const UserFlowState = {
  SIGNUP_ONLY: 'SIGNUP_ONLY',
  KYC_APPROVED: 'KYC_APPROVED',
  CARD_APPLIED: 'CARD_APPLIED',
  CARD_SHIPPING: 'CARD_SHIPPING',
  CARD_REGISTERED: 'CARD_REGISTERED',
  CARD_ACTIVE_WITH_TRANSACTIONS: 'CARD_ACTIVE_WITH_TRANSACTIONS',
  CARD_ACTIVE_THREE_CARDS: 'CARD_ACTIVE_THREE_CARDS',
} as const;

export type UserFlowStateId = (typeof UserFlowState)[keyof typeof UserFlowState];

export type KycStatus = 'not_started' | 'pending' | 'under_review' | 'approved' | 'rejected';
export type { CardApplicationStatus };
export type RegisteredCardStatus = 'shipping' | 'issued' | 'active' | 'frozen';

export interface MockUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  memberSince: string;
  signedUpAt: string;
}

export interface MockKyc {
  status: KycStatus;
  submittedAt?: string;
  approvedAt?: string;
  documentType?: string;
}

export interface MockWallet {
  exists: boolean;
  balanceUsdt: number;
  address?: string;
  network: string;
}

export interface MockCardCatalogItem {
  id: string;
  variant: CardVariant;
  label: string;
  network: string;
  scheme: 'visa';
}

export interface MockCardApplication {
  id: string;
  cardVariant: CardVariant;
  status: CardApplicationStatus;
  submittedAt: string;
  feeUsdt: number;
  reference?: string;
}

export interface MockRegisteredCard {
  id: string;
  variant: CardVariant;
  label: string;
  network: string;
  last4: string;
  fullNumber: string;
  expiry: string;
  cvv: string;
  holder: string;
  status: RegisteredCardStatus;
  isPrimary: boolean;
  balanceUsdt?: number;
  dailySpendLimit?: number;
  dailySpendUsed?: number;
  atmDailyLimit?: number;
  atmDailyUsed?: number;
  availableLimit?: number;
  issuedAt?: string;
  linkedWallet?: string;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: string;
}

export type MockTransactionKind =
  | 'card_spend'
  | 'card_topup'
  | 'wallet_topup'
  | 'wallet_withdraw'
  | 'wallet_send'
  | 'wallet_receive'
  | 'wallet_fee'
  | 'refund'
  | 'reversal'
  | 'referral_reward'
  | 'referral_commission'
  | 'referral_withdrawal'
  | 'referral_pending';

export type MockTransactionStatus = 'completed' | 'pending' | 'failed';

export interface MockTransaction {
  id: string;
  title: string;
  at: string;
  amount: number;
  incoming: boolean;
  failed: boolean;
  kind: MockTransactionKind;
  status?: MockTransactionStatus;
  txId?: string;
  reference?: string;
  cardLast4?: string;
  cardNetwork?: string;
  cardScheme?: string;
}

export interface MockTopUpHistoryItem {
  date: string;
  usdt: string;
  fee: string;
  usd: string;
  st: number;
  tx: string;
}

export interface MockFlowBundle {
  flowState: UserFlowStateId;
  user: MockUser;
  wallet: MockWallet;
  kyc: MockKyc;
  cards: MockCardCatalogItem[];
  cardApplications: MockCardApplication[];
  registeredCards: MockRegisteredCard[];
  transactions: MockTransaction[];
  topUpHistory: MockTopUpHistoryItem[];
}

const CATALOG: MockCardCatalogItem[] = [
  { id: 'catalog-virtual', variant: 'virtual', label: 'Virtual Visa Card', network: 'Visa', scheme: 'visa' },
  { id: 'catalog-physical', variant: 'physical', label: 'Physical Visa Card', network: 'Visa', scheme: 'visa' },
];

const BASE_USER: MockUser = {
  id: 'usr-001',
  name: 'Alex Kim',
  email: 'alex@anytap.com',
  phone: '+82 10-1234-5678',
  country: 'South Korea',
  memberSince: 'Jun 2026',
  signedUpAt: '2026-06-01T09:00:00',
};

const VIRTUAL_ACTIVE: MockRegisteredCard = {
  id: 'card-virtual-4921',
  variant: 'virtual',
  label: 'Virtual Visa Card',
  network: 'Visa',
  last4: '4921',
  fullNumber: '4938 7512 3456 4921',
  expiry: '06/30',
  cvv: '847',
  holder: 'ALEX KIM',
  status: 'active',
  isPrimary: true,
  balanceUsdt: 1240,
  dailySpendLimit: 2000,
  dailySpendUsed: 1240,
  atmDailyLimit: 500,
  atmDailyUsed: 0,
  availableLimit: 4480,
  issuedAt: '2026-06-15',
  linkedWallet: '0xA3F248E1b2c9d5e6f7a8b9C8E',
};

const PHYSICAL_ACTIVE: MockRegisteredCard = {
  id: 'card-physical-8804',
  variant: 'physical',
  label: 'Physical Visa Card',
  network: 'Visa',
  last4: '8804',
  fullNumber: '4937 2411 5562 8804',
  expiry: '09/29',
  cvv: '612',
  holder: 'ALEX KIM',
  status: 'active',
  isPrimary: false,
  balanceUsdt: 320.5,
  dailySpendLimit: 2000,
  dailySpendUsed: 860,
  atmDailyLimit: 500,
  atmDailyUsed: 120,
  availableLimit: 4480,
  issuedAt: '2026-06-15',
  linkedWallet: '0xA3F248E1b2c9d5e6f7a8b9C8E',
};

const VIRTUAL_THIRD: MockRegisteredCard = {
  id: 'card-virtual-1123',
  variant: 'virtual',
  label: 'Virtual Visa Card',
  network: 'Visa',
  last4: '1123',
  fullNumber: '4938 7512 3456 1123',
  expiry: '11/30',
  cvv: '318',
  holder: 'ALEX KIM',
  status: 'active',
  isPrimary: false,
  balanceUsdt: 85.25,
  dailySpendLimit: 2000,
  dailySpendUsed: 420,
  atmDailyLimit: 500,
  atmDailyUsed: 0,
  issuedAt: '2026-06-10',
};

const FULL_TRANSACTIONS: MockTransaction[] = [
  { id: 'tx-1', title: 'Blue Bottle Coffee', at: '2026-06-17T09:24:00', amount: 8.4, incoming: false, failed: false, kind: 'card_spend', status: 'completed', reference: 'AT-TX-001', cardLast4: '4921', cardNetwork: 'Visa', cardScheme: 'visa' },
  { id: 'tx-2', title: 'Card Top Up', at: '2026-06-17T08:10:00', amount: 200, incoming: true, failed: false, kind: 'card_topup', status: 'completed', reference: 'AT-TX-002', cardLast4: '4921', cardNetwork: 'Visa', cardScheme: 'visa' },
  { id: 'tx-3', title: 'Apple Store', at: '2026-06-16T21:02:00', amount: 129, incoming: false, failed: false, kind: 'card_spend', status: 'completed', reference: 'AT-TX-003', cardLast4: '4921', cardNetwork: 'Visa', cardScheme: 'visa' },
  { id: 'tx-4', title: 'Uber', at: '2026-06-16T18:40:00', amount: 14.2, incoming: false, failed: false, kind: 'card_spend', status: 'completed', reference: 'AT-TX-004', cardLast4: '4921', cardNetwork: 'Visa', cardScheme: 'visa' },
  { id: 'tx-5', title: 'Wallet Deposit', at: '2026-06-15T11:05:00', amount: 500, incoming: true, failed: false, kind: 'wallet_topup', status: 'completed', txId: '7d2e10ff9ac3b821', reference: 'AT-WL-005' },
  { id: 'tx-6', title: 'Whole Foods Market', at: '2026-06-17T12:15:00', amount: 46.8, incoming: false, failed: false, kind: 'card_spend', status: 'completed', reference: 'AT-TX-006', cardLast4: '8804', cardNetwork: 'Visa', cardScheme: 'visa' },
  { id: 'tx-7', title: 'Card Top Up', at: '2026-06-14T10:30:00', amount: 150, incoming: true, failed: false, kind: 'card_topup', status: 'completed', reference: 'AT-TX-007', cardLast4: '8804', cardNetwork: 'Visa', cardScheme: 'visa' },
  { id: 'tx-8', title: 'Transfer Sent', at: '2026-06-13T16:20:00', amount: 75, incoming: false, failed: false, kind: 'wallet_send', status: 'completed', txId: 'f0312bb98e4ad551', reference: 'AT-WL-008' },
  { id: 'tx-9', title: 'Refund — Apple Store', at: '2026-06-12T11:00:00', amount: 129, incoming: true, failed: false, kind: 'refund', status: 'completed', reference: 'AT-TX-009', cardLast4: '4921', cardNetwork: 'Visa', cardScheme: 'visa' },
  { id: 'tx-10', title: 'Guy Hawkins', at: '2026-06-14T14:30:00', amount: 12.49, incoming: false, failed: true, kind: 'card_spend', status: 'failed', reference: 'AT-TX-010', cardLast4: '4921', cardNetwork: 'Visa', cardScheme: 'visa' },
  { id: 'tx-11', title: 'Wallet Deposit', at: '2026-06-12T18:40:00', amount: 300, incoming: true, failed: true, kind: 'wallet_topup', status: 'failed', txId: 'ee55aa10cc239810', reference: 'AT-WL-011' },
  { id: 'tx-12', title: 'Netflix', at: '2026-06-11T22:00:00', amount: 15.99, incoming: false, failed: false, kind: 'reversal', status: 'completed', reference: 'AT-TX-012', cardLast4: '4921', cardNetwork: 'Visa', cardScheme: 'visa' },
  { id: 'tx-13', title: 'Starbucks', at: '2026-06-14T08:05:00', amount: 6.75, incoming: false, failed: false, kind: 'card_spend', status: 'completed', reference: 'AT-TX-013', cardLast4: '1123', cardNetwork: 'Visa', cardScheme: 'visa' },
  { id: 'tx-14', title: 'Card Top Up', at: '2026-06-13T19:20:00', amount: 100, incoming: true, failed: false, kind: 'card_topup', status: 'completed', reference: 'AT-TX-014', cardLast4: '1123', cardNetwork: 'Visa', cardScheme: 'visa' },
  { id: 'tx-wr', title: 'Transfer Received', at: '2026-06-11T09:00:00', amount: 250, incoming: true, failed: false, kind: 'wallet_receive', status: 'completed', txId: 'a1b2c3d4e5f67890', reference: 'AT-WL-WR' },
  { id: 'tx-ww', title: 'Withdrawal', at: '2026-06-10T15:00:00', amount: 100, incoming: false, failed: false, kind: 'wallet_withdraw', status: 'completed', txId: 'b2c3d4e5f6789012', reference: 'AT-WL-WD' },
  { id: 'tx-r1', title: 'Referral Reward', at: '2026-06-17T10:00:00', amount: 12.4, incoming: true, failed: false, kind: 'referral_commission', status: 'completed', reference: 'AT-RW-001' },
  { id: 'tx-r2', title: 'Referral Reward', at: '2026-06-16T08:30:00', amount: 8.75, incoming: true, failed: false, kind: 'referral_commission', status: 'completed', reference: 'AT-RW-002' },
  { id: 'tx-r3', title: 'Referral Reward', at: '2026-06-14T11:00:00', amount: 6.2, incoming: true, failed: false, kind: 'referral_commission', status: 'completed', reference: 'AT-RW-003' },
  { id: 'tx-r4', title: 'Reward Withdrawal', at: '2026-06-09T14:00:00', amount: 50, incoming: false, failed: false, kind: 'referral_withdrawal', status: 'completed', reference: 'AT-RW-WD' },
];

const FULL_TOP_UP_HISTORY: MockTopUpHistoryItem[] = [
  { date: 'Jun 18 · 09:24', usdt: '200.00', fee: '1.00', usd: '$199.00', st: 3, tx: 'a3f8c92b7e1d04ff' },
  { date: 'Jun 15 · 14:02', usdt: '500.00', fee: '1.00', usd: '$499.00', st: 3, tx: '7d2e10ff9ac3b821' },
  { date: 'Jun 18 · 10:05', usdt: '100.00', fee: '1.00', usd: 'Pending', st: 2, tx: 'c91b44a0de77f230' },
  { date: 'Jun 18 · 10:31', usdt: '50.00', fee: '1.00', usd: 'Pending', st: 1, tx: 'f0312bb98e4ad551' },
  { date: 'Jun 14 · 10:30', usdt: '150.00', fee: '1.00', usd: '$149.00', st: 3, tx: 'b2c91aa0de77f230' },
  { date: 'Jun 12 · 18:40', usdt: '300.00', fee: '1.00', usd: 'Failed', st: 0, tx: 'ee55aa10cc239810' },
];

export const MOCK_FLOW_DATA: Record<UserFlowStateId, MockFlowBundle> = {
  [UserFlowState.SIGNUP_ONLY]: {
    flowState: UserFlowState.SIGNUP_ONLY,
    user: { ...BASE_USER, name: 'New Member', email: 'new@anytap.com' },
    wallet: { exists: false, balanceUsdt: 0, network: 'TRC-20 (TRON)' },
    kyc: { status: 'not_started' },
    cards: CATALOG,
    cardApplications: [],
    registeredCards: [],
    transactions: [],
    topUpHistory: [],
  },

  [UserFlowState.KYC_APPROVED]: {
    flowState: UserFlowState.KYC_APPROVED,
    user: BASE_USER,
    wallet: {
      exists: true,
      balanceUsdt: 0,
      address: '',
      network: 'TRC-20 (TRON)',
    },
    kyc: { status: 'approved', approvedAt: '2026-06-10T14:22:00', documentType: 'Passport' },
    cards: CATALOG,
    cardApplications: [],
    registeredCards: [],
    transactions: [],
    topUpHistory: [],
  },

  [UserFlowState.CARD_APPLIED]: {
    flowState: UserFlowState.CARD_APPLIED,
    user: BASE_USER,
    wallet: {
      exists: true,
      balanceUsdt: 100,
      address: '',
      network: 'TRC-20 (TRON)',
    },
    kyc: { status: 'approved', approvedAt: '2026-06-10T14:22:00', documentType: 'Passport' },
    cards: CATALOG,
    cardApplications: [
      {
        id: 'app-001',
        cardVariant: 'physical',
        status: 'under_review',
        submittedAt: '2026-06-12T11:30:00',
        feeUsdt: 100,
        reference: 'APP-20260612-001',
      },
    ],
    registeredCards: [],
    transactions: [],
    topUpHistory: [],
  },

  [UserFlowState.CARD_SHIPPING]: {
    flowState: UserFlowState.CARD_SHIPPING,
    user: BASE_USER,
    wallet: {
      exists: true,
      balanceUsdt: 100,
      address: '',
      network: 'TRC-20 (TRON)',
    },
    kyc: { status: 'approved', approvedAt: '2026-06-10T14:22:00', documentType: 'Passport' },
    cards: CATALOG,
    cardApplications: [
      {
        id: 'app-001',
        cardVariant: 'physical',
        status: 'approved',
        submittedAt: '2026-06-12T11:30:00',
        feeUsdt: 100,
        reference: 'APP-20260612-001',
      },
    ],
    registeredCards: [
      {
        id: 'card-physical-ship',
        variant: 'physical',
        label: 'Physical Visa Card',
        network: 'Visa',
        last4: '8804',
        fullNumber: '4937 2411 5562 8804',
        expiry: '09/29',
        cvv: '612',
        holder: 'ALEX KIM',
        status: 'shipping',
        isPrimary: true,
        trackingNumber: 'TRK-839204-KR',
        carrier: 'DHL Express',
        estimatedDelivery: 'Jun 28, 2026',
      },
    ],
    transactions: [],
    topUpHistory: [],
  },

  [UserFlowState.CARD_REGISTERED]: {
    flowState: UserFlowState.CARD_REGISTERED,
    user: BASE_USER,
    wallet: {
      exists: true,
      balanceUsdt: 1560.5,
      address: '',
      network: 'TRC-20 (TRON)',
    },
    kyc: { status: 'approved', approvedAt: '2026-06-10T14:22:00', documentType: 'Passport' },
    cards: CATALOG,
    cardApplications: [
      {
        id: 'app-001',
        cardVariant: 'virtual',
        status: 'approved',
        submittedAt: '2026-06-11T09:00:00',
        feeUsdt: 100,
        reference: 'APP-20260611-001',
      },
      {
        id: 'app-002',
        cardVariant: 'physical',
        status: 'approved',
        submittedAt: '2026-06-12T11:30:00',
        feeUsdt: 100,
        reference: 'APP-20260612-002',
      },
    ],
    registeredCards: [VIRTUAL_ACTIVE, PHYSICAL_ACTIVE],
    transactions: [],
    topUpHistory: [],
  },

  [UserFlowState.CARD_ACTIVE_WITH_TRANSACTIONS]: {
    flowState: UserFlowState.CARD_ACTIVE_WITH_TRANSACTIONS,
    user: BASE_USER,
    wallet: {
      exists: true,
      balanceUsdt: 2480.5,
      address: '',
      network: 'TRC-20 (TRON)',
    },
    kyc: { status: 'approved', approvedAt: '2026-06-10T14:22:00', documentType: 'Passport' },
    cards: CATALOG,
    cardApplications: [
      {
        id: 'app-001',
        cardVariant: 'virtual',
        status: 'approved',
        submittedAt: '2026-06-11T09:00:00',
        feeUsdt: 100,
        reference: 'APP-20260611-001',
      },
      {
        id: 'app-002',
        cardVariant: 'physical',
        status: 'approved',
        submittedAt: '2026-06-12T11:30:00',
        feeUsdt: 100,
        reference: 'APP-20260612-002',
      },
    ],
    registeredCards: [VIRTUAL_ACTIVE, PHYSICAL_ACTIVE],
    transactions: FULL_TRANSACTIONS.slice(0, 12),
    topUpHistory: FULL_TOP_UP_HISTORY,
  },

  [UserFlowState.CARD_ACTIVE_THREE_CARDS]: {
    flowState: UserFlowState.CARD_ACTIVE_THREE_CARDS,
    user: BASE_USER,
    wallet: {
      exists: true,
      balanceUsdt: 2680.5,
      address: '',
      network: 'TRC-20 (TRON)',
    },
    kyc: { status: 'approved', approvedAt: '2026-06-10T14:22:00', documentType: 'Passport' },
    cards: CATALOG,
    cardApplications: [
      {
        id: 'app-001',
        cardVariant: 'virtual',
        status: 'approved',
        submittedAt: '2026-06-11T09:00:00',
        feeUsdt: 100,
        reference: 'APP-20260611-001',
      },
      {
        id: 'app-002',
        cardVariant: 'physical',
        status: 'approved',
        submittedAt: '2026-06-12T11:30:00',
        feeUsdt: 100,
        reference: 'APP-20260612-002',
      },
      {
        id: 'app-003',
        cardVariant: 'virtual',
        status: 'approved',
        submittedAt: '2026-06-15T16:45:00',
        feeUsdt: 100,
        reference: 'APP-20260615-003',
      },
    ],
    registeredCards: [VIRTUAL_ACTIVE, PHYSICAL_ACTIVE, VIRTUAL_THIRD],
    transactions: FULL_TRANSACTIONS,
    topUpHistory: FULL_TOP_UP_HISTORY,
  },
};
