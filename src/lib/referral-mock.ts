/**
 * Referral partner states — independent from card / wallet lifecycle.
 */

import { SITE_ORIGIN } from './site';

export const ReferralPartnerState = {
  NORMAL_MEMBER: 'NORMAL_MEMBER',
  REFERRAL_PENDING: 'REFERRAL_PENDING',
  REFERRAL_APPROVED: 'REFERRAL_APPROVED',
} as const;

export type ReferralPartnerStateId = (typeof ReferralPartnerState)[keyof typeof ReferralPartnerState];

export interface ReferralBenefit {
  title: string;
  description: string;
  icon: 'coins' | 'users' | 'wallet' | 'chart';
}

export interface ReferralRewardHistoryItem {
  id: string;
  date: string;
  memberName: string;
  description: string;
  amount: number;
}

export interface ReferralInvitedMember {
  id: string;
  name: string;
  joinedAt: string;
  status: 'active' | 'pending' | 'inactive';
  earned: number;
  cards?: number;
  topUpUsdt?: number;
}

export interface ReferralMemberRow {
  id: string;
  name: string;
  status: 'active' | 'pending' | 'inactive';
  cards: number;
  topUpUsdt: number;
  rewardUsdt: number;
  joinedAt: string;
}

export interface MonthlyEarningPoint {
  month: string;
  amount: number;
}

export interface ReferralFaqItem {
  question: string;
  answer: string;
}

export interface ReferralStatistics {
  totalInvites: number;
  activeMembers: number;
  conversionRate: string;
  monthlyEarnings: number;
}

export interface ReferralPartnerBundle {
  status: ReferralPartnerStateId;
  applicationSubmittedAt?: string;
  code?: string;
  inviteLink?: string;
  totalEarnings?: number;
  availableBalance?: number;
  pendingBalance?: number;
  minWithdrawalUsdt?: number;
  rewardHistory?: ReferralRewardHistoryItem[];
  invitedMembers?: ReferralInvitedMember[];
  memberRows?: ReferralMemberRow[];
  statistics?: ReferralStatistics;
  monthlyEarnings?: MonthlyEarningPoint[];
}

export const REFERRAL_BENEFITS: ReferralBenefit[] = [
  {
    title: 'Recurring commissions',
    description: 'Earn a share of top-up fees every time your referred members load their cards.',
    icon: 'coins',
  },
  {
    title: 'Passive income',
    description: 'Rewards continue as long as your members stay active — not just on signup.',
    icon: 'wallet',
  },
  {
    title: 'Partner dashboard',
    description: 'Track invites, earnings, and withdrawals from a dedicated referral dashboard.',
    icon: 'chart',
  },
  {
    title: 'Grow your network',
    description: 'Share your unique link or code with communities, clients, or friends.',
    icon: 'users',
  },
];

export const REFERRAL_FAQ: ReferralFaqItem[] = [
  {
    question: 'How do rewards work?',
    answer: 'You earn a commission when referred members top up their cards. Rewards accrue automatically and appear in your Available Balance once the top-up settles.',
  },
  {
    question: 'When are rewards paid?',
    answer: 'Commissions are calculated in real time and added to Pending Rewards first. They move to Available Balance after the referred member\'s transaction is confirmed — typically within 24 hours.',
  },
  {
    question: 'How do withdrawals work?',
    answer: 'Withdraw rewards to your Anytap wallet once you meet the minimum threshold. Requests are reviewed and paid in USDT within 2 business days.',
  },
  {
    question: 'How can I become a referral partner?',
    answer: 'Apply from the Referral page. Once approved, you receive a unique code and link to share. There is no fee to join the partner program.',
  },
];

const REFERRAL_MEMBER_ROWS: ReferralMemberRow[] = [
  { id: 'm-1', name: 'Jamie L.', status: 'active', cards: 2, topUpUsdt: 4200, rewardUsdt: 42.5, joinedAt: '2026-06-02' },
  { id: 'm-2', name: 'Chris P.', status: 'active', cards: 1, topUpUsdt: 3800, rewardUsdt: 38.0, joinedAt: '2026-06-05' },
  { id: 'm-3', name: 'Taylor R.', status: 'active', cards: 1, topUpUsdt: 3120, rewardUsdt: 31.2, joinedAt: '2026-06-08' },
  { id: 'm-4', name: 'Morgan K.', status: 'pending', cards: 0, topUpUsdt: 0, rewardUsdt: 0, joinedAt: '2026-06-12' },
  { id: 'm-5', name: 'Sam W.', status: 'active', cards: 3, topUpUsdt: 8900, rewardUsdt: 89.0, joinedAt: '2026-05-28' },
  { id: 'm-6', name: 'Riley N.', status: 'inactive', cards: 1, topUpUsdt: 450, rewardUsdt: 4.5, joinedAt: '2026-04-15' },
  { id: 'm-7', name: 'Jordan H.', status: 'active', cards: 2, topUpUsdt: 2100, rewardUsdt: 21.0, joinedAt: '2026-06-18' },
  { id: 'm-8', name: 'Casey M.', status: 'pending', cards: 0, topUpUsdt: 0, rewardUsdt: 0, joinedAt: '2026-06-22' },
];

const REFERRAL_MONTHLY_EARNINGS: MonthlyEarningPoint[] = [
  { month: 'Jan', amount: 142 },
  { month: 'Feb', amount: 168 },
  { month: 'Mar', amount: 195 },
  { month: 'Apr', amount: 224 },
  { month: 'May', amount: 286 },
  { month: 'Jun', amount: 248 },
];

export const MOCK_REFERRAL_DATA: Record<ReferralPartnerStateId, ReferralPartnerBundle> = {
  [ReferralPartnerState.NORMAL_MEMBER]: {
    status: ReferralPartnerState.NORMAL_MEMBER,
  },

  [ReferralPartnerState.REFERRAL_PENDING]: {
    status: ReferralPartnerState.REFERRAL_PENDING,
    applicationSubmittedAt: '2026-06-18T14:30:00',
  },

  [ReferralPartnerState.REFERRAL_APPROVED]: {
    status: ReferralPartnerState.REFERRAL_APPROVED,
    code: 'ANY-82KD',
    inviteLink: `${SITE_ORIGIN}/sign-up?ref=ANY82KD`,
    totalEarnings: 1284.5,
    availableBalance: 720,
    pendingBalance: 62.3,
    minWithdrawalUsdt: 10,
    statistics: {
      totalInvites: 12,
      activeMembers: 9,
      conversionRate: '75%',
      monthlyEarnings: 248.0,
    },
    memberRows: REFERRAL_MEMBER_ROWS,
    monthlyEarnings: REFERRAL_MONTHLY_EARNINGS,
    invitedMembers: [
      { id: 'm-1', name: 'Jamie L.', joinedAt: '2026-06-02', status: 'active', earned: 42.5, cards: 2, topUpUsdt: 4200 },
      { id: 'm-2', name: 'Chris P.', joinedAt: '2026-06-05', status: 'active', earned: 38.0, cards: 1, topUpUsdt: 3800 },
      { id: 'm-3', name: 'Taylor R.', joinedAt: '2026-06-08', status: 'active', earned: 31.2, cards: 1, topUpUsdt: 3120 },
      { id: 'm-4', name: 'Morgan K.', joinedAt: '2026-06-12', status: 'pending', earned: 0, cards: 0, topUpUsdt: 0 },
    ],
    rewardHistory: [
      { id: 'r-1', date: '2026-06-17', memberName: 'Jamie L.', description: 'Card top-up commission', amount: 12.4 },
      { id: 'r-2', date: '2026-06-16', memberName: 'Chris P.', description: 'Card top-up commission', amount: 8.75 },
      { id: 'r-3', date: '2026-06-14', memberName: 'Taylor R.', description: 'Card top-up commission', amount: 6.2 },
      { id: 'r-4', date: '2026-06-10', memberName: 'Jamie L.', description: 'Card top-up commission', amount: 15.0 },
    ],
  },
};
