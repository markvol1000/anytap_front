/**
 * Admin Service Layer — single entry for all admin data access.
 * Components must import from here only; never from mock data directly.
 * Swap implementations when Supabase/API is connected.
 */

import {
  ADMIN_USER,
  MAX_CARDS_PER_MEMBER,
  computeDashboardKpis,
  computePendingTasks,
  computeSystemSummary,
  seedAdminLogs,
  seedCardApplications,
  seedContentItems,
  seedKycApplications,
  seedMembers,
  seedNotifications,
  seedReferrals,
  seedSettings,
  seedTransactions,
  seedWallets,
  seedWithdrawals,
} from './adminMockData.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createStore() {
  const members = seedMembers();
  return {
    members: clone(members),
    kycApplications: clone(seedKycApplications(members)),
    cardApplications: clone(seedCardApplications(members)),
    wallets: clone(seedWallets(members)),
    transactions: clone(seedTransactions(members)),
    referrals: clone(seedReferrals(members)),
    withdrawals: clone(seedWithdrawals(members)),
    notifications: clone(seedNotifications()),
    contentItems: clone(seedContentItems()),
    settings: clone(seedSettings()),
    adminLogs: clone(seedAdminLogs()),
    memos: {},
  };
}

let store = createStore();

function delay(ms = 0) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}

function logAction(action, target) {
  store.adminLogs.unshift({
    id: `LOG-${Date.now()}`,
    adminId: ADMIN_USER.id,
    adminName: ADMIN_USER.name,
    action,
    target,
    at: new Date().toISOString(),
  });
}

function paginate(items, { page = 1, pageSize = 10 } = {}) {
  const total = items.length;
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

function sortItems(items, sortKey, sortDir = 'asc') {
  if (!sortKey) return items;
  const dir = sortDir === 'desc' ? -1 : 1;
  return [...items].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });
}

function filterBySearch(items, search, keys) {
  if (!search?.trim()) return items;
  const q = search.trim().toLowerCase();
  return items.filter((row) =>
    keys.some((k) => String(row[k] ?? '').toLowerCase().includes(q)),
  );
}

function listQuery(items, params = {}, searchKeys = []) {
  let list = [...items];
  if (params.status && params.status !== 'all') {
    list = list.filter((row) => row.status === params.status);
  }
  if (params.kycStatus && params.kycStatus !== 'all') {
    list = list.filter((row) => row.kycStatus === params.kycStatus || row.status === params.kycStatus);
  }
  if (params.kind && params.kind !== 'all') {
    list = list.filter((row) => row.kind === params.kind || row.category === params.kind);
  }
  if (params.accountStatus && params.accountStatus !== 'all') {
    list = list.filter((row) => row.accountStatus === params.accountStatus);
  }
  list = filterBySearch(list, params.search, searchKeys);
  list = sortItems(list, params.sortKey, params.sortDir);
  return paginate(list, params);
}

/** Reset mock store (dev/testing) */
export async function resetAdminStore() {
  await delay(50);
  store = createStore();
  return { ok: true };
}

export async function getCurrentAdmin() {
  await delay();
  return clone(ADMIN_USER);
}

// ─── Dashboard (operations-first) ────────────────────────────────────────────

export async function getDashboardKpis() {
  await delay();
  return computeDashboardKpis(store);
}

export async function getPendingTasks() {
  await delay();
  return computePendingTasks(store);
}

export async function getSystemSummary() {
  await delay();
  return computeSystemSummary(store);
}

/** Single fetch for ops dashboard */
export async function getDashboardData() {
  await delay();

  const kycRequests = [...store.kycApplications]
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
    .slice(0, 8)
    .map((k) => ({
      id: k.id,
      type: 'kyc',
      memberName: k.memberName,
      status: k.status,
      at: k.submittedAt,
      meta: k.documentType,
    }));

  const cardRequests = [...store.cardApplications]
    .sort((a, b) => new Date(b.created) - new Date(a.created))
    .slice(0, 8)
    .map((c) => ({
      id: c.id,
      type: 'card',
      memberName: c.memberName,
      status: c.status,
      at: c.created,
      meta: c.cardType,
    }));

  const withdrawalRequests = [...store.withdrawals]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8)
    .map((w) => ({
      id: w.id,
      type: 'withdrawal',
      memberName: w.memberName,
      status: w.status,
      at: w.date,
      meta: `${w.amount} USDT`,
    }));

  const walletTx = store.transactions
    .filter((t) => t.category === 'wallet' || t.kind.startsWith('wallet_'))
    .slice(0, 6);

  const cardTx = store.transactions
    .filter((t) => t.category === 'card' || t.kind.startsWith('card_') || t.kind === 'refund')
    .slice(0, 6);

  return clone({
    pendingTasks: computePendingTasks(store),
    systemSummary: computeSystemSummary(store),
    recentRequests: {
      kyc: kycRequests,
      card: cardRequests,
      withdrawal: withdrawalRequests,
    },
    walletTransactions: walletTx,
    cardTransactions: cardTx,
    adminActivity: store.adminLogs.slice(0, 8),
  });
}

export async function getRecentMembers(limit = 5) {
  await delay();
  return clone(
    [...store.members]
      .sort((a, b) => new Date(b.joinDate) - new Date(a.joinDate))
      .slice(0, limit),
  );
}

export async function getRecentTransactions(limit = 5) {
  await delay();
  return clone(store.transactions.slice(0, limit));
}

export async function getRecentAdminActions(limit = 5) {
  await delay();
  return clone(store.adminLogs.slice(0, limit));
}

// ─── Members ─────────────────────────────────────────────────────────────────

export async function getMembers(params = {}) {
  await delay();
  return listQuery(store.members, params, ['id', 'name', 'email', 'country']);
}

export async function getMemberById(id) {
  await delay();
  const member = store.members.find((m) => m.id === id);
  if (!member) return null;
  const memo = store.memos[`member:${id}`] ?? member.memo ?? '';
  return clone({ ...member, memo });
}

export async function updateMember(id, patch) {
  await delay();
  const idx = store.members.findIndex((m) => m.id === id);
  if (idx < 0) throw new Error('Member not found');
  store.members[idx] = { ...store.members[idx], ...patch };
  logAction('Updated member', id);
  return clone(store.members[idx]);
}

export async function suspendMember(id) {
  return updateMember(id, { accountStatus: 'suspended' });
}

export async function activateMember(id) {
  return updateMember(id, { accountStatus: 'active' });
}

export async function retryCregisWallet(id) {
  await delay();
  return updateMember(id, { 
    cregisWalletAddress: 'TDVjFu6CQRrhoFcg1mNVjD' + Math.random().toString(36).substring(2, 10).toUpperCase(),
    accountStatus: 'active',
    status: 'ACTIVE'
  });
}

export async function deleteMember(id) {
  await delay();
  store.members = store.members.filter((m) => m.id !== id);
  logAction('Deleted member', id);
  return { ok: true };
}

export async function saveMemberMemo(id, memo) {
  await delay();
  store.memos[`member:${id}`] = memo;
  const idx = store.members.findIndex((m) => m.id === id);
  if (idx >= 0) store.members[idx].memo = memo;
  logAction('Updated member memo', id);
  return { ok: true, memo };
}

// ─── KYC ─────────────────────────────────────────────────────────────────────

export async function getKycApplications(params = {}) {
  await delay();
  return listQuery(store.kycApplications, params, ['memberName', 'memberEmail', 'memberId']);
}

export async function getKycById(id) {
  await delay();
  const item = store.kycApplications.find((k) => k.id === id);
  return item ? clone(item) : null;
}

export async function approveKyc(id) {
  await delay();
  const kyc = store.kycApplications.find((k) => k.id === id);
  if (!kyc) throw new Error('KYC not found');
  kyc.status = 'approved';
  const member = store.members.find((m) => m.id === kyc.memberId);
  if (member) member.kycStatus = 'approved';
  logAction('Approved KYC', id);
  return clone(kyc);
}

export async function rejectKyc(id, reason) {
  await delay();
  const kyc = store.kycApplications.find((k) => k.id === id);
  if (!kyc) throw new Error('KYC not found');
  kyc.status = 'rejected';
  kyc.rejectReason = reason;
  const member = store.members.find((m) => m.id === kyc.memberId);
  if (member) member.kycStatus = 'rejected';
  logAction('Rejected KYC', id);
  return clone(kyc);
}

// ─── Cards ───────────────────────────────────────────────────────────────────

export async function getCardApplications(params = {}) {
  await delay();
  return listQuery(store.cardApplications, params, ['memberName', 'memberId', 'cardType']);
}

export async function getCardById(id) {
  await delay();
  const card = store.cardApplications.find((c) => c.id === id);
  return card ? clone(card) : null;
}

export async function getMemberCardCount(memberId) {
  await delay();
  return store.cardApplications.filter(
    (c) => c.memberId === memberId && c.status !== 'terminated' && c.status !== 'rejected',
  ).length;
}

export async function approveCard(id) {
  await delay();
  const card = store.cardApplications.find((c) => c.id === id);
  if (!card) throw new Error('Card not found');
  const count = await getMemberCardCount(card.memberId);
  if (count >= MAX_CARDS_PER_MEMBER && card.status === 'pending') {
    throw new Error(`Member already has maximum ${MAX_CARDS_PER_MEMBER} cards`);
  }
  card.status = 'approved';
  logAction('Approved card application', id);
  return clone(card);
}

export async function rejectCard(id, reason = '') {
  await delay();
  const card = store.cardApplications.find((c) => c.id === id);
  if (!card) throw new Error('Card not found');
  card.status = 'rejected';
  card.rejectReason = reason;
  logAction('Rejected card application', id);
  return clone(card);
}

export async function issueCard(id) {
  await delay();
  const card = store.cardApplications.find((c) => c.id === id);
  if (!card) throw new Error('Card not found');
  const count = store.cardApplications.filter(
    (c) => c.memberId === card.memberId && ['active', 'frozen', 'issued'].includes(c.status),
  ).length;
  if (count >= MAX_CARDS_PER_MEMBER) {
    throw new Error(`Cannot issue — max ${MAX_CARDS_PER_MEMBER} cards per member`);
  }
  card.status = 'issued';
  card.last4 = String(Math.floor(1000 + Math.random() * 9000));
  logAction('Issued card', id);
  return clone(card);
}

export async function activateCard(id) {
  await delay();
  const card = store.cardApplications.find((c) => c.id === id);
  if (!card) throw new Error('Card not found');
  card.status = 'active';
  const member = store.members.find((m) => m.id === card.memberId);
  if (member) member.cardStatus = 'active';
  logAction('Activated card', id);
  return clone(card);
}

export async function freezeCard(id) {
  await delay();
  const card = store.cardApplications.find((c) => c.id === id);
  if (!card) throw new Error('Card not found');
  card.status = 'frozen';
  logAction('Froze card', id);
  return clone(card);
}

export async function terminateCard(id) {
  await delay();
  const card = store.cardApplications.find((c) => c.id === id);
  if (!card) throw new Error('Card not found');
  card.status = 'terminated';
  logAction('Terminated card', id);
  return clone(card);
}

// ─── Wallets ─────────────────────────────────────────────────────────────────

export async function getWallets(params = {}) {
  await delay();
  return listQuery(store.wallets, params, ['address', 'memberName', 'memberId']);
}

export async function getWalletById(id) {
  await delay();
  const wallet = store.wallets.find((w) => w.id === id);
  if (!wallet) return null;
  const deposits = store.transactions.filter(
    (t) => t.memberId === wallet.memberId && (t.kind === 'wallet_receive' || t.kind === 'wallet_topup'),
  ).slice(0, 5);
  const topUps = store.transactions.filter(
    (t) => t.memberId === wallet.memberId && t.kind === 'card_topup',
  ).slice(0, 5);
  return clone({ ...wallet, recentDeposits: deposits, recentTopUps: topUps });
}

export async function lockWallet(id) {
  await delay();
  const wallet = store.wallets.find((w) => w.id === id);
  if (!wallet) throw new Error('Wallet not found');
  wallet.status = 'locked';
  logAction('Locked wallet', id);
  return clone(wallet);
}

export async function unlockWallet(id) {
  await delay();
  const wallet = store.wallets.find((w) => w.id === id);
  if (!wallet) throw new Error('Wallet not found');
  wallet.status = 'active';
  logAction('Unlocked wallet', id);
  return clone(wallet);
}

// ─── Transactions ────────────────────────────────────────────────────────────

export async function getTransactions(params = {}) {
  await delay();
  return listQuery(store.transactions, params, ['memberName', 'reference', 'id']);
}

export async function exportTransactionsCsv(params = {}) {
  await delay(200);
  const { items } = listQuery(store.transactions, { ...params, page: 1, pageSize: 10000 }, ['memberName', 'reference']);
  const header = 'ID,Member,Kind,Amount,Currency,Status,Date,Reference';
  const rows = items.map((t) =>
    [t.id, t.memberName, t.kind, t.amount, t.currency, t.status, t.at, t.reference].join(','),
  );
  return [header, ...rows].join('\n');
}

// ─── Referral ────────────────────────────────────────────────────────────────

export async function getReferrals(params = {}) {
  await delay();
  return listQuery(store.referrals, params, ['referralCode', 'memberName', 'memberId']);
}

export async function getReferralById(id) {
  await delay();
  const ref = store.referrals.find((r) => r.id === id);
  if (!ref) return null;
  const history = store.transactions
    .filter((t) => t.memberId === ref.memberId && t.kind === 'referral_reward')
    .slice(0, 10);
  return clone({ ...ref, history });
}

export async function adjustReferralReward(id, amount, note = '') {
  await delay();
  const ref = store.referrals.find((r) => r.id === id);
  if (!ref) throw new Error('Referral not found');
  ref.rewardBalance = Math.max(0, ref.rewardBalance + amount);
  ref.available = Math.max(0, ref.available + amount);
  logAction(`Adjusted referral reward (${amount > 0 ? '+' : ''}${amount})${note ? `: ${note}` : ''}`, id);
  return clone(ref);
}

// ─── Withdrawals ─────────────────────────────────────────────────────────────

export async function getWithdrawals(params = {}) {
  await delay();
  return listQuery(store.withdrawals, params, ['memberName', 'memberId', 'id']);
}

export async function getWithdrawalById(id) {
  await delay();
  const w = store.withdrawals.find((x) => x.id === id);
  return w ? clone(w) : null;
}

export async function approveWithdrawal(id, txHash = '') {
  await delay();
  const w = store.withdrawals.find((x) => x.id === id);
  if (!w) throw new Error('Withdrawal not found');
  w.status = 'approved';
  w.txHash = txHash;
  logAction('Approved withdrawal', id);
  return clone(w);
}

export async function rejectWithdrawal(id, memo = '') {
  await delay();
  const w = store.withdrawals.find((x) => x.id === id);
  if (!w) throw new Error('Withdrawal not found');
  w.status = 'rejected';
  w.memo = memo;
  logAction('Rejected withdrawal', id);
  return clone(w);
}

// ─── Notifications ───────────────────────────────────────────────────────────

export async function getNotifications(params = {}) {
  await delay();
  return listQuery(store.notifications, params, ['title', 'type']);
}

// ─── Content ─────────────────────────────────────────────────────────────────

export async function getContentItems(params = {}) {
  await delay();
  return listQuery(store.contentItems, params, ['label', 'slug']);
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function getSettings() {
  await delay();
  return clone(store.settings);
}

export async function updateSettings(patch) {
  await delay();
  store.settings = { ...store.settings, ...patch };
  logAction('Updated system config', 'Settings');
  return clone(store.settings);
}

// ─── Admin Logs ──────────────────────────────────────────────────────────────

export async function getAdminLogs(params = {}) {
  await delay();
  return listQuery(store.adminLogs, params, ['adminName', 'action', 'target']);
}

export { MAX_CARDS_PER_MEMBER };
