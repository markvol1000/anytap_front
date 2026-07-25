/**
 * Admin HTTP API — aligned to AnyTap ALB OpenAPI (`/api-docs`)
 * and E2E dashboard (`/views/test-dashboard.html`).
 *
 * Available: me, members, member update, kyc, cards/applications,
 * merchant/settlement/analytics helpers.
 * Missing on ALB: wallets/transactions/referrals/notifications/content/settings/logs lists.
 */

import { apiGet, apiPost } from '../../../lib/api/httpClient.js';
import { apiNotImplemented } from '../../../lib/api/stub.js';
import { MAX_CARDS_PER_MEMBER } from '../mock/adminMockData.js';
import {
  mapAdminProfile,
  mapCardRow,
  mapDailySummaryToDashboard,
  mapKycRow,
  mapMemberRow,
  mapUserDetail,
  paginateLocal,
} from './adminApiMappers.js';

const SVC = 'adminApiService';

function asArray(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

async function fetchMembersRaw() {
  return asArray(await apiGet('/admin/members')).map(mapMemberRow);
}

async function fetchKycRaw() {
  return asArray(await apiGet('/admin/kyc')).map(mapKycRow);
}

async function fetchCardsRaw() {
  return asArray(await apiGet('/admin/cards/applications')).map(mapCardRow);
}

function resolveUserId(id) {
  const raw = String(id || '');
  if (!raw || raw.startsWith('temp-')) {
    const err = new Error('This member has no userId yet (pending signup).');
    err.code = 'NO_USER_ID';
    throw err;
  }
  return raw;
}

async function updateCardStatus(userId, body) {
  await apiPost(`/admin/cards/applications/${encodeURIComponent(userId)}/update-status`, body);
  const cards = await fetchCardsRaw();
  return cards.find((c) => c.id === userId) || mapCardRow({ userId, ...body });
}

async function resolveFirstCardNo(userId) {
  const data = await apiGet(`/admin/members/${encodeURIComponent(userId)}/cards`);
  const list = asArray(data);
  const first = list[0];
  if (!first) {
    throw new Error('No Wasabi card found for this member.');
  }
  return first.cardNo || first.cardId || first.wasabiCardId || first.id;
}

export async function resetAdminStore() {
  apiNotImplemented(SVC, 'resetAdminStore', 'Dev-only mock helper.');
}

export async function getCurrentAdmin() {
  return mapAdminProfile(await apiGet('/admin/me'));
}

export async function getDashboardKpis() {
  const data = await getDashboardData();
  return {
    ...data.systemSummary,
    ...data.pendingTasks,
    totalMembers: data.systemSummary.members,
    newMembersToday: data.analytics?.newUsersToday ?? 0,
    pendingCardApplications: data.pendingTasks.cardApplications,
    activeCards: data.systemSummary.cards,
    walletBalanceTotal: data.systemSummary.walletAssets,
    pendingWithdrawals: data.pendingTasks.withdrawalRequests,
  };
}

export async function getPendingTasks() {
  const data = await getDashboardData();
  return data.pendingTasks;
}

export async function getSystemSummary() {
  const data = await getDashboardData();
  return data.systemSummary;
}

export async function getDashboardData() {
  const [summary, members, kyc, cards] = await Promise.all([
    apiGet('/admin/analytics/daily-summary').catch(() => ({})),
    fetchMembersRaw().catch(() => []),
    fetchKycRaw().catch(() => []),
    fetchCardsRaw().catch(() => []),
  ]);
  return mapDailySummaryToDashboard({ summary, members, kyc, cards });
}

export async function getRecentMembers(limit = 5) {
  const members = await fetchMembersRaw();
  return [...members]
    .sort((a, b) => new Date(b.createdAt || b.joinDate) - new Date(a.createdAt || a.joinDate))
    .slice(0, limit);
}

export async function getRecentTransactions() {
  return [];
}

export async function getRecentAdminActions() {
  return [];
}

export async function getMembers(params = {}) {
  const members = await fetchMembersRaw();
  return paginateLocal(members, {
    ...params,
    searchKeys: ['id', 'name', 'email', 'loginId'],
  });
}

export async function getMemberById(id) {
  const raw = String(id || '');
  if (raw.startsWith('temp-')) {
    const members = await fetchMembersRaw();
    return members.find((m) => m.id === raw) || null;
  }
  const userId = resolveUserId(id);
  try {
    return mapUserDetail(await apiGet(`/users/${encodeURIComponent(userId)}`));
  } catch {
    const members = await fetchMembersRaw();
    return members.find((m) => m.id === userId) || null;
  }
}

export async function updateMember(id, patch = {}) {
  const userId = resolveUserId(id);
  const body = {};
  if (patch.email != null) body.email = patch.email;
  if (patch.role != null) body.role = patch.role;
  if (patch.cregisWalletAddress != null) body.cregisWalletAddress = patch.cregisWalletAddress;
  if (patch.cardStatus != null) body.cardStatus = patch.cardStatus;
  if (patch.trackingNumber != null) body.trackingNumber = patch.trackingNumber;
  if (patch.carrier != null) body.carrier = patch.carrier;
  if (patch.wasabiCardId != null) body.wasabiCardId = patch.wasabiCardId;
  if (patch.status != null) body.status = String(patch.status).toUpperCase();
  if (patch.accountStatus != null) body.status = String(patch.accountStatus).toUpperCase();

  await apiPost(`/admin/members/${encodeURIComponent(userId)}/update`, body);
  return getMemberById(userId);
}

export async function suspendMember(id) {
  return updateMember(id, { status: 'SUSPENDED' });
}

export async function activateMember(id) {
  return updateMember(id, { status: 'ACTIVE' });
}

export async function deleteMember() {
  apiNotImplemented(SVC, 'deleteMember', 'No ALB delete-member endpoint yet.');
}

export async function saveMemberMemo() {
  apiNotImplemented(SVC, 'saveMemberMemo', 'No ALB member-memo endpoint yet.');
}

export async function getKycApplications(params = {}) {
  const rows = await fetchKycRaw();
  return paginateLocal(rows, {
    ...params,
    searchKeys: ['memberName', 'memberEmail', 'memberId', 'loginId'],
  });
}

export async function getKycById(id) {
  const rows = await fetchKycRaw();
  return rows.find((k) => k.id === id) || null;
}

export async function approveKyc(id) {
  const userId = resolveUserId(id);
  await apiPost(`/admin/kyc/${encodeURIComponent(userId)}/approve`);
  return getKycById(userId);
}

export async function rejectKyc(id) {
  const userId = resolveUserId(id);
  // OpenAPI reject has no request body; reason is UI-only until backend adds it.
  await apiPost(`/admin/kyc/${encodeURIComponent(userId)}/reject`);
  const row = await getKycById(userId);
  return row || mapKycRow({ userId, kycStatus: 'REJECTED' });
}

export async function getCardApplications(params = {}) {
  const rows = await fetchCardsRaw();
  return paginateLocal(rows, {
    ...params,
    searchKeys: ['memberName', 'memberId', 'memberEmail', 'loginId', 'cardType'],
  });
}

export async function getCardById(id) {
  const rows = await fetchCardsRaw();
  return rows.find((c) => c.id === id) || null;
}

export async function getMemberCardCount(memberId) {
  try {
    const userId = resolveUserId(memberId);
    const cards = asArray(await apiGet(`/admin/members/${encodeURIComponent(userId)}/cards`));
    return cards.length;
  } catch {
    const rows = await fetchCardsRaw();
    return rows.filter((c) => c.memberId === memberId && c.status !== 'terminated' && c.status !== 'rejected').length;
  }
}

export async function approveCard(id) {
  return updateCardStatus(resolveUserId(id), { cardStatus: 'deposit_received' });
}

export async function rejectCard(id) {
  return updateCardStatus(resolveUserId(id), { cardStatus: 'not_issued' });
}

export async function issueCard(id) {
  return updateCardStatus(resolveUserId(id), { cardStatus: 'issued' });
}

export async function activateCard(id) {
  return updateCardStatus(resolveUserId(id), { cardStatus: 'active' });
}

export async function freezeCard(id) {
  const userId = resolveUserId(id);
  const cardNo = await resolveFirstCardNo(userId);
  await apiPost(`/admin/members/${encodeURIComponent(userId)}/cards/${encodeURIComponent(cardNo)}/freeze`);
  return getCardById(userId);
}

export async function terminateCard() {
  apiNotImplemented(SVC, 'terminateCard', 'Use card status update or backend terminate endpoint when available.');
}

function mapWalletRow(u) {
  return {
    id: u.userId || u.id,
    memberId: u.userId || u.id,
    memberName: u.loginId || u.email || 'Unknown',
    address: u.cregisWalletAddress || '-',
    balance: u.balance || 0,
    status: (u.status || 'ACTIVE').toLowerCase(),
    created: u.createdDate || '-'
  };
}

export async function getWallets(params = {}) {
  const rawList = asArray(await apiGet('/admin/wallets'));
  const mapped = rawList.map(mapWalletRow);
  return paginateLocal(mapped, params, ['address', 'memberName', 'memberId']);
}

export async function getWalletById(id) {
  const u = await apiGet(`/admin/wallets/${encodeURIComponent(id)}`);
  if (!u) return null;
  return {
    ...mapWalletRow(u),
    recentDeposits: [],
    recentTopUps: []
  };
}

export async function lockWallet() {
  apiNotImplemented(SVC, 'lockWallet', 'No admin wallet lock endpoint on ALB yet.');
}

export async function unlockWallet() {
  apiNotImplemented(SVC, 'unlockWallet', 'No admin wallet unlock endpoint on ALB yet.');
}

export async function getTransactions(params = {}) {
  const rawList = asArray(await apiGet('/admin/transactions'));
  const mapped = rawList.map(t => ({
    id: t.id || String(t.id),
    memberId: t.userId,
    memberName: t.loginId || 'Unknown',
    kind: t.transactionType || t.type || 'deposit',
    amount: t.amount || 0,
    wallet: t.toAddress || '-',
    status: (t.status || 'success').toLowerCase(),
    date: t.createdDate || '-'
  }));
  return paginateLocal(mapped, params, ['kind', 'memberName', 'memberId']);
}

export async function exportTransactionsCsv() {
  apiNotImplemented(SVC, 'exportTransactionsCsv', 'No transactions export on ALB yet.');
}

export async function getReferrals() {
  apiNotImplemented(SVC, 'getReferrals', 'No GET /admin/referrals on ALB yet.');
}

export async function getReferralById() {
  apiNotImplemented(SVC, 'getReferralById', 'No admin referral detail on ALB yet.');
}

export async function adjustReferralReward() {
  apiNotImplemented(SVC, 'adjustReferralReward', 'No referral adjust endpoint on ALB yet.');
}

export async function getWithdrawals() {
  apiNotImplemented(
    SVC,
    'getWithdrawals',
    'ALB only has GET /settlements/withdrawals?userId=… (per-user), not a global admin list.',
  );
}

export async function getWithdrawalById() {
  apiNotImplemented(SVC, 'getWithdrawalById', 'No admin withdrawal detail on ALB yet.');
}

export async function approveWithdrawal() {
  apiNotImplemented(SVC, 'approveWithdrawal', 'No admin withdrawal approve on ALB yet.');
}

export async function rejectWithdrawal() {
  apiNotImplemented(SVC, 'rejectWithdrawal', 'No admin withdrawal reject on ALB yet.');
}

export async function getNotifications() {
  apiNotImplemented(SVC, 'getNotifications', 'No GET /admin/notifications on ALB yet.');
}

export async function getContentItems() {
  apiNotImplemented(SVC, 'getContentItems', 'No GET /admin/content on ALB yet.');
}

export async function getSettings() {
  apiNotImplemented(SVC, 'getSettings', 'No GET /admin/settings on ALB yet.');
}

export async function updateSettings() {
  apiNotImplemented(SVC, 'updateSettings', 'No PATCH /admin/settings on ALB yet.');
}

export async function getAdminLogs() {
  apiNotImplemented(SVC, 'getAdminLogs', 'No GET /admin/logs on ALB yet.');
}

/** Extra helpers used by ops dashboard / future admin panels */
export async function getMerchantInfo() {
  return apiGet('/admin/merchant-info');
}

export async function getSettlementFees() {
  return asArray(await apiGet('/admin/settlement/fees'));
}

export async function getDailySummary() {
  return apiGet('/admin/analytics/daily-summary');
}

export { MAX_CARDS_PER_MEMBER };
