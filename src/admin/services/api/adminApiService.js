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

async function fetchCardsRaw(params = {}) {
  const query = new URLSearchParams();
  if (params?.page) query.append('pageNum', params.page);
  if (params?.limit) query.append('pageSize', params.limit);
  const queryString = query.toString() ? `?${query.toString()}` : '';
  return asArray(await apiGet(`/admin/cards/applications${queryString}`)).map(mapCardRow);
}

function resolveUserId(id) {
  const raw = String(id || '').replace(/\.+$/, '');
  if (!raw || raw.startsWith('temp-')) {
    const err = new Error('This member has no userId yet (pending signup).');
    err.code = 'NO_USER_ID';
    throw err;
  }
  return raw;
}

async function updateCardStatus(userId, body, originalId = null) {
  const payload = { ...body };
  if (originalId && String(originalId).startsWith('W')) {
    payload.cardNo = originalId;
  }
  await apiPost(`/admin/cards/applications/${encodeURIComponent(userId)}/update-status`, payload);
  return getCardById(originalId || userId);
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
  const [summary, members, kyc, cards, recentTxs] = await Promise.all([
    apiGet('/admin/analytics/daily-summary').catch(() => ({})),
    fetchMembersRaw().catch(() => []),
    fetchKycRaw().catch(() => []),
    fetchCardsRaw().catch(() => []),
    apiGet('/admin/transactions/recent').catch(() => []),
  ]);
  return mapDailySummaryToDashboard({
    summary,
    members,
    kyc,
    cards,
    recentTxs: asArray(recentTxs),
  });
}

export async function getRecentMembers(limit = 5) {
  const members = await fetchMembersRaw();
  return [...members]
    .sort((a, b) => new Date(b.createdAt || b.joinDate) - new Date(a.createdAt || a.joinDate))
    .slice(0, limit);
}

export async function getRecentTransactions(limit = 10) {
  const txs = asArray(await apiGet('/admin/transactions/recent').catch(() => []));
  return txs.slice(0, limit);
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

export async function triggerFeePayout(userId) {
  return apiPost(`/admin/settlement/payout/${encodeURIComponent(userId)}`);
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
  const rows = await fetchCardsRaw(params);
  return paginateLocal(rows, {
    ...params,
    searchKeys: ['memberName', 'memberId', 'memberEmail', 'loginId', 'cardType'],
  });
}

export async function getCardById(id) {
  if (!id) return null;
  try {
    const data = await apiGet(`/admin/cards/applications/detail/${encodeURIComponent(id)}`);
    return mapCardRow(data);
  } catch {
    return null;
  }
}

export async function getMemberCardCount(memberId) {
  try {
    const userId = resolveUserId(memberId);
    const cards = asArray(await apiGet(`/admin/members/${encodeURIComponent(userId)}/cards`));
    return cards.length;
  } catch {
    return 1;
  }
}

export async function approveCard(id) {
  const card = await getCardById(id);
  const userId = resolveUserId(card?.memberId || id);
  const cardNo = card?.wasabiCardId || (String(id).startsWith('W') ? id : null);
  return updateCardStatus(userId, { cardStatus: 'deposit_received', cardNo }, id);
}

export async function rejectCard(id) {
  const card = await getCardById(id);
  const userId = resolveUserId(card?.memberId || id);
  const cardNo = card?.wasabiCardId || (String(id).startsWith('W') ? id : null);
  return updateCardStatus(userId, { cardStatus: 'not_issued', cardNo }, id);
}

export async function issueCard(id) {
  const card = await getCardById(id);
  const userId = resolveUserId(card?.memberId || id);
  const cardNo = card?.wasabiCardId || (String(id).startsWith('W') ? id : null);
  return updateCardStatus(userId, { cardStatus: 'issued', cardNo }, id);
}

export async function activateCard(id, pin = '') {
  const card = await getCardById(id);
  const userId = resolveUserId(card?.memberId || id);
  const cardNo = card?.wasabiCardId || (String(id).startsWith('W') ? id : null);

  const cleanPin = String(pin || '').trim();
  if (!cleanPin || !/^\d{6}$/.test(cleanPin)) {
    throw new Error('PIN 번호 6자리를 입력해야 합니다.');
  }

  if (!cardNo) {
    throw new Error('카드 번호를 찾을 수 없습니다.');
  }

  await apiPost(`/admin/members/${encodeURIComponent(userId)}/cards/${encodeURIComponent(cardNo)}/activate`, { pin: cleanPin });
  return getCardById(id);
}

export async function freezeCard(id) {
  const card = await getCardById(id);
  const userId = resolveUserId(card?.memberId || id);
  const cardNo = card?.wasabiCardId || (String(id).startsWith('W') ? id : '');
  await apiPost(`/admin/members/${encodeURIComponent(userId)}/cards/${encodeURIComponent(cardNo)}/freeze`);
  return getCardById(id);
}

export async function unfreezeCard(id) {
  const card = await getCardById(id);
  const userId = resolveUserId(card?.memberId || id);
  const cardNo = card?.wasabiCardId || (String(id).startsWith('W') ? id : '');
  await apiPost(`/admin/members/${encodeURIComponent(userId)}/cards/${encodeURIComponent(cardNo)}/unfreeze`);
  return getCardById(id);
}

export async function shipCard(id) {
  const card = await getCardById(id);
  const userId = resolveUserId(card?.memberId || id);
  const cardNo = card?.wasabiCardId || (String(id).startsWith('W') ? id : '');
  await apiPost(`/admin/members/${encodeURIComponent(userId)}/cards/${encodeURIComponent(cardNo)}/ship`);
  return getCardById(id);
}

export async function terminateCard() {
  apiNotImplemented(SVC, 'terminateCard', 'Use card status update or backend terminate endpoint when available.');
}

export async function getCardTransactions(userId, cardNo = '') {
  let actualUserId = userId;
  let actualCardNo = cardNo;

  if (String(userId).startsWith('W') || String(userId).startsWith('WD')) {
    actualCardNo = userId;
    actualUserId = '';
  } else {
    try {
      actualUserId = resolveUserId(userId);
    } catch {
      actualUserId = userId;
    }
  }

  const query = new URLSearchParams();
  if (actualCardNo) query.append('cardNo', actualCardNo);
  const queryString = query.toString() ? `?${query.toString()}` : '';

  const url = actualUserId 
    ? `/admin/members/${encodeURIComponent(actualUserId)}/cards/transactions${queryString}`
    : `/admin/cards/transactions${queryString}`;

  const data = await apiGet(url).catch(() => ({ records: [], total: 0 }));
  return data;
}

export async function simulateCardTransaction(cardNo, params = {}) {
  const data = await apiPost(`/admin/cards/${encodeURIComponent(cardNo)}/simulate-transaction`, params);
  return data;
}

function mapWalletRow(u) {
  return {
    id: u.userId || u.id,
    memberId: u.userId || u.id,
    memberName: u.loginId || u.email || 'Unknown',
    address: u.cregisWalletAddress || u.address || '-',
    balance: u.balance !== undefined ? u.balance : (u.availableBalance || 0),
    cregisActualBalance: u.cregisActualBalance !== undefined ? u.cregisActualBalance : (u.actualBalance || u.balance || 0),
    unpaidTotalFee: u.unpaidTotalFee || 0,
    status: (u.status || 'ACTIVE').toLowerCase(),
    created: u.created || u.createdDate || '-'
  };
}

export async function getWallets(params = {}) {
  const rawList = asArray(await apiGet('/admin/wallets'));
  const mapped = rawList.map(mapWalletRow);
  return paginateLocal(mapped, params, ['address', 'memberName', 'memberId']);
}

export async function getWalletById(id, sync = false) {
  const cleanId = String(id || '').replace(/\.+$/, '');
  const u = await apiGet(`/admin/wallets/${encodeURIComponent(cleanId)}?sync=${sync}`);
  if (!u) return null;
  return {
    ...mapWalletRow(u),
    recentDeposits: Array.isArray(u.recentDeposits) ? u.recentDeposits : [],
    recentTopUps: Array.isArray(u.recentTopUps) ? u.recentTopUps : []
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
    id: t.txId || t.id || String(t.id),
    memberId: t.userId,
    memberName: t.loginId || 'Unknown',
    kind: t.transactionType || t.type || 'deposit',
    amount: t.amount || 0,
    wallet: t.toAddress || '-',
    status: (t.status || 'success').toLowerCase(),
    at: t.createdAt || t.createdDate || '-',
    reference: t.description || t.txId || '-'
  }));
  return paginateLocal(mapped, params, ['kind', 'memberName', 'memberId']);
}

export async function exportTransactionsCsv() {
  apiNotImplemented(SVC, 'exportTransactionsCsv', 'No transactions export on ALB yet.');
}

export async function getReferrals(params = {}) {
  const rows = asArray(await apiGet('/admin/referrals')).map(r => ({
    id: r.id || r.referrerId || 'REF_001',
    memberName: r.referrerName || r.memberName || 'User',
    referralCode: r.referralCode || 'REF_' + (r.referrerId || '123'),
    rewardBalance: r.rewardBalance !== undefined ? r.rewardBalance : (r.rewardAmount || 0),
    available: r.available !== undefined ? r.available : (r.rewardAmount || 0),
    pending: r.pending || 0,
    members: r.members || 1,
    status: r.status || 'active',
  }));
  return paginateLocal(rows, params);
}

export async function getReferralById(id) {
  const rows = asArray(await apiGet('/admin/referrals')).map(r => ({
    id: r.id || r.referrerId || 'REF_001',
    memberName: r.referrerName || r.memberName || 'User',
    referralCode: r.referralCode || 'REF_' + (r.referrerId || '123'),
    rewardBalance: r.rewardBalance !== undefined ? r.rewardBalance : (r.rewardAmount || 0),
    available: r.available !== undefined ? r.available : (r.rewardAmount || 0),
    pending: r.pending || 0,
    members: r.members || 1,
    status: r.status || 'active',
    history: r.history || []
  }));
  return rows.find((r) => r.id === id) || null;
}

export async function adjustReferralReward(id, amount, note = '') {
  return { id, amount, note, success: true };
}

export async function getWithdrawals(params = {}) {
  const rows = asArray(await apiGet('/admin/withdrawals')).map(w => ({
    id: w.id || 'WID_001',
    memberName: w.loginId || w.memberName || 'User',
    amount: w.amount || 0,
    wallet: w.wallet || w.toAddress || 'TY3N3q4...',
    status: w.status || 'pending',
    date: w.date || w.createdAt || '',
    txHash: w.txHash || '',
    memo: w.memo || '',
  }));
  return paginateLocal(rows, params);
}

export async function getWithdrawalById(id) {
  const rows = asArray(await apiGet('/admin/withdrawals')).map(w => ({
    id: w.id || 'WID_001',
    memberName: w.loginId || w.memberName || 'User',
    amount: w.amount || 0,
    wallet: w.wallet || w.toAddress || 'TY3N3q4...',
    status: w.status || 'pending',
    date: w.date || w.createdAt || '',
    txHash: w.txHash || '',
    memo: w.memo || '',
  }));
  return rows.find((x) => x.id === id) || null;
}

export async function approveWithdrawal(id, txHash = '') {
  await apiPost(`/admin/withdrawals/${encodeURIComponent(id)}/approve`, { txHash });
  return {
    id: id,
    status: 'approved',
    txHash: txHash,
  };
}

export async function rejectWithdrawal(id, reason = '') {
  await apiPost(`/admin/withdrawals/${encodeURIComponent(id)}/reject`, { memo: reason });
  return {
    id: id,
    status: 'rejected',
    memo: reason,
  };
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

export async function getAdminLogs(params = {}) {
  const rawList = asArray(await apiGet('/admin/logs'));
  const mapped = rawList.map(l => ({
    id: String(l.id),
    adminName: l.loginId || 'System',
    adminId: l.userId || 'system',
    action: l.eventType || 'UNKNOWN_ACTION',
    target: (l.wasabiCardNo && l.wasabiCardNo !== '-') ? `Card: ${l.wasabiCardNo}` : 
            (l.subAddress && l.subAddress !== '-') ? `SubAddress: ${l.subAddress}` : 
            (l.externalWalletNo && l.externalWalletNo !== '-') ? `ExternalWallet: ${l.externalWalletNo}` : 'System Log',
    at: l.createdAt || '-'
  }));
  return paginateLocal(mapped, params, ['adminName', 'action', 'target']);
}

export async function getEmailLogs(params = {}) {
  const rawList = asArray(await apiGet('/admin/email-logs'));
  const mapped = rawList.map(l => ({
    id: String(l.id),
    recipient: l.recipient || '-',
    subject: l.subject || '-',
    status: l.status || '-',
    ipAddress: l.ipAddress || '-',
    apiResponseCode: l.apiResponseCode != null ? l.apiResponseCode : '-',
    at: l.createdAt || '-'
  }));
  return paginateLocal(mapped, params, ['recipient', 'subject', 'status']);
}

export async function getEventLogs(params = {}) {
  const rawList = asArray(await apiGet('/admin/event-logs'));
  const mapped = rawList.map(l => ({
    id: String(l.id),
    userId: l.user ? l.user.userId : '-',
    eventType: l.eventType || '-',
    ipAddress: l.ipAddress || '-',
    apiResponseCode: l.apiResponseCode != null ? l.apiResponseCode : '-',
    at: l.createdAt || '-'
  }));
  return paginateLocal(mapped, params, ['userId', 'eventType']);
}


export async function getSystemStatus() {
  return apiGet('/admin/system/status');
}

export async function getSystemConfig() {
  return apiGet('/admin/system/config');
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

export async function retryCregisWallet(userId) {
  return apiPost(`/admin/members/${encodeURIComponent(userId)}/retry-wallet`);
}

export { MAX_CARDS_PER_MEMBER };
