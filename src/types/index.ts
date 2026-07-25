// ===== Anytap Type Definitions =====
// Central type registry — import from here, not from individual files.
// TODO: Extend with Supabase-generated types once backend is wired.

// ── User ─────────────────────────────────────────────────────────────────────
export type KycStatus = 'not_started' | 'pending' | 'under_review' | 'approved' | 'rejected';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  memberSince: string;
  signedUpAt: string;
}

// ── KYC ──────────────────────────────────────────────────────────────────────
export interface Kyc {
  status: KycStatus;
  submittedAt?: string;
  approvedAt?: string;
  documentType?: string;
}

// ── Wallet ────────────────────────────────────────────────────────────────────
// TODO: Replace with Cregis API wallet response type
export interface Wallet {
  exists: boolean;
  balanceUsdt: number;
  address?: string;
  network: string;
}

// ── Card ──────────────────────────────────────────────────────────────────────
export type CardVariant = 'virtual' | 'physical';
export type CardStatus = 'shipping' | 'issued' | 'active' | 'frozen' | 'creating' | 'not_issued';
export type CardScheme = 'visa';
export type CardApplicationStatus = 'draft' | 'under_review' | 'approved' | 'rejected';

export interface Card {
  id: string;
  variant: CardVariant;
  label: string;
  network: string;
  scheme: CardScheme;
  last4: string;
  fullNumber: string;
  expiry: string;
  cvv: string;
  holder: string;
  status: CardStatus;
  isPrimary: boolean;
  balance?: string;
  balanceUsdt?: number;
  dailySpendLimit?: number;
  dailySpendUsed?: number;
  atmDailyLimit?: number;
  atmDailyUsed?: number;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: string;
}

export interface CardApplication {
  id: string;
  cardVariant: CardVariant;
  status: CardApplicationStatus;
  submittedAt: string;
  feeUsdt: number;
  reference?: string;
}

// ── Transactions ──────────────────────────────────────────────────────────────
// TODO: Replace with Wasabi API transaction response type
export type TransactionKind = 'card_spend' | 'card_topup' | 'wallet_topup' | 'wallet_send';

export interface Transaction {
  id: string;
  title: string;
  at: string;
  amount: number;
  incoming: boolean;
  failed: boolean;
  kind: TransactionKind;
  cardLast4?: string;
  cardNetwork?: string;
  cardScheme?: string;
}

export interface TopUpHistoryItem {
  date: string;
  usdt: string;
  fee: string;
  usd: string;
  st: number;
  tx: string;
}

// ── Account state (portal) ────────────────────────────────────────────────────
export interface AccountState {
  kycStatus: KycStatus;
  cardStatus: CardStatus | 'deposit_received' | 'application_review';
  name: string;
  email: string;
  walletBalance?: number;
  walletExists?: boolean;
}

// ── Member state ──────────────────────────────────────────────────────────────
export type MemberState =
  | 'kyc_required'
  | 'kyc_pending'
  | 'card_apply_ready'
  | 'card_issuing'
  | 'activate_card'
  | 'card_active';
