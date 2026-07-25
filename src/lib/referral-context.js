/**
 * Referral partner mock context — independent from card flow scenarios.
 */

import { MOCK_REFERRAL_DATA, ReferralPartnerState } from './referral-mock.ts';

export const REFERRAL_SCENARIO_KEYS = [
  'normalMember',
  'referralPending',
  'referralApproved',
];

export const REFERRAL_STATE_LABELS = {
  normalMember: 'Referral · Normal member',
  referralPending: 'Referral · Pending',
  referralApproved: 'Referral · Approved partner',
};

const KEY_TO_STATE = {
  normalMember: ReferralPartnerState.NORMAL_MEMBER,
  referralPending: ReferralPartnerState.REFERRAL_PENDING,
  referralApproved: ReferralPartnerState.REFERRAL_APPROVED,
};

export function getReferralContext(referralStateKey = 'normalMember') {
  const status = KEY_TO_STATE[referralStateKey] ?? ReferralPartnerState.NORMAL_MEMBER;
  const bundle = MOCK_REFERRAL_DATA[status] ?? MOCK_REFERRAL_DATA[ReferralPartnerState.NORMAL_MEMBER];

  return mapReferralBundle(bundle, referralStateKey, status);
}

/** Real API mode — no mock earnings or invite stats */
export function getEmptyReferralContext() {
  return {
    referralStateKey: 'normalMember',
    status: ReferralPartnerState.NORMAL_MEMBER,
    isPartner: false,
    isPending: false,
    isNormalMember: true,
    applicationSubmittedAt: null,
    code: null,
    inviteLink: '',
    totalEarnings: 0,
    availableBalance: 0,
    pendingBalance: 0,
    minWithdrawalUsdt: 10,
    rewardHistory: [],
    invitedMembers: [],
    memberRows: [],
    monthlyEarnings: [],
    statistics: { monthlyEarnings: 0, inviteCount: 0 },
  };
}

function mapReferralBundle(bundle, referralStateKey, status) {
  return {
    referralStateKey,
    status: bundle.status,
    isPartner: status === ReferralPartnerState.REFERRAL_APPROVED,
    isPending: status === ReferralPartnerState.REFERRAL_PENDING,
    isNormalMember: status === ReferralPartnerState.NORMAL_MEMBER,
    applicationSubmittedAt: bundle.applicationSubmittedAt,
    code: bundle.code,
    inviteLink: bundle.inviteLink,
    totalEarnings: bundle.totalEarnings,
    availableBalance: bundle.availableBalance,
    pendingBalance: bundle.pendingBalance ?? 0,
    minWithdrawalUsdt: bundle.minWithdrawalUsdt ?? 10,
    rewardHistory: bundle.rewardHistory ?? [],
    invitedMembers: bundle.invitedMembers ?? [],
    memberRows: bundle.memberRows ?? [],
    monthlyEarnings: bundle.monthlyEarnings ?? [],
    statistics: bundle.statistics,
  };
}

export function referralPageTitles(referralContext) {
  if (referralContext.isPartner) {
    return ['Referral Partner', 'Manage your invites and earnings'];
  }
  if (referralContext.isPending) {
    return ['Referral Application', 'Your application is being reviewed'];
  }
  return ['Referral Program', 'Become a referral partner and earn rewards'];
}

/** Dashboard — earnings only after referral partner approval */
export function getReferralDashboardEarnings(referralContext) {
  if (!referralContext?.isPartner) {
    return { balance: 0, today: 0, month: 0, total: 0 };
  }

  const { availableBalance = 0, totalEarnings = 0, statistics, rewardHistory = [] } = referralContext;
  const todayKey = new Date().toISOString().slice(0, 10);

  const today = rewardHistory
    .filter((r) => r.date === 'Today' || r.date?.startsWith(todayKey))
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  return {
    balance: availableBalance ?? totalEarnings ?? 0,
    today,
    month: statistics?.monthlyEarnings ?? 0,
    total: totalEarnings ?? 0,
  };
}

function formatNetworkDate(dateStr) {
  if (!dateStr) return '';
  if (dateStr === 'Today') return dateStr;
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Dashboard network preview — active invites only for approved partners */
export function getReferralNetworkPreview(referralContext, limit = 3) {
  if (!referralContext?.isPartner) return [];

  const rows = referralContext.memberRows?.length
    ? referralContext.memberRows
    : referralContext.invitedMembers ?? [];

  return rows
    .filter((m) => m.status === 'active' && ((m.rewardUsdt ?? m.earned ?? 0) > 0 || (m.topUpUsdt ?? 0) > 0))
    .slice(0, limit)
    .map((m) => ({
      id: m.id,
      memberName: m.name,
      date: formatNetworkDate(m.joinedAt),
      topUpUsdt: m.topUpUsdt ?? Math.max(0, Math.round((m.earned || 0) * 10)),
      reward: m.rewardUsdt ?? m.earned ?? 0,
    }));
}
