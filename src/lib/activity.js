/**
 * Unified account activity — wallet + card transactions.
 * Mock data only — replace with API responses before launch.
 */

import { maskCardEnding, maskCardFull } from './card-helpers.js';
import { isHttpApi } from './api/config.js';

// ─── Activity types ───────────────────────────────────────────────────────────

/** Card usage transactions — `at` is ISO 8601 local datetime */
export const ACTIVITY = [
  { id: 'tx-1', title: 'Blue Bottle Coffee', at: '2026-06-17T09:24:00', amount: 8.40, incoming: false, failed: false, kind: 'card_spend', status: 'completed', reference: 'AT-TX-001', cardLast4: '4921' },
  { id: 'tx-2', title: 'Card Top Up', at: '2026-06-17T08:10:00', amount: 200.00, incoming: true, failed: false, kind: 'card_topup', status: 'completed', reference: 'AT-TX-002', cardLast4: '4921' },
  { id: 'tx-3', title: 'Apple Store', at: '2026-06-16T21:02:00', amount: 129.00, incoming: false, failed: false, kind: 'card_spend', status: 'completed', reference: 'AT-TX-003', cardLast4: '4921' },
  { id: 'tx-4', title: 'Uber', at: '2026-06-16T18:40:00', amount: 14.20, incoming: false, failed: false, kind: 'card_spend', status: 'completed', reference: 'AT-TX-004', cardLast4: '4921' },
  { id: 'tx-5', title: 'Wallet Deposit', at: '2026-06-15T11:05:00', amount: 500.00, incoming: true, failed: false, kind: 'wallet_topup', status: 'completed', txId: '7d2e10ff9ac3b821', reference: 'AT-WL-005' },
  { id: 'tx-6', title: 'Guy Hawkins', at: '2026-06-14T14:30:00', amount: 12.49, incoming: false, failed: true, kind: 'card_spend', status: 'failed', reference: 'AT-TX-010', cardLast4: '4921' },
  { id: 'tx-7', title: 'Whole Foods Market', at: '2026-06-17T12:15:00', amount: 46.80, incoming: false, failed: false, kind: 'card_spend', status: 'completed', reference: 'AT-TX-006', cardLast4: '8804' },
  { id: 'tx-8', title: 'Transfer Sent', at: '2026-06-13T16:20:00', amount: 75.00, incoming: false, failed: false, kind: 'wallet_send', status: 'completed', txId: 'f0312bb98e4ad551', reference: 'AT-WL-008' },
  { id: 'tx-9', title: 'Refund — Apple Store', at: '2026-06-12T11:00:00', amount: 129.00, incoming: true, failed: false, kind: 'refund', status: 'completed', reference: 'AT-TX-009', cardLast4: '4921' },
  { id: 'tx-10', title: 'Starbucks', at: '2026-06-14T08:05:00', amount: 6.75, incoming: false, failed: false, kind: 'card_spend', status: 'completed', reference: 'AT-TX-011', cardLast4: '2231' },
  { id: 'tx-11', title: 'Netflix', at: '2026-06-13T22:00:00', amount: 15.99, incoming: false, failed: false, kind: 'reversal', status: 'completed', reference: 'AT-TX-012', cardLast4: '2231' },
  { id: 'tx-r1', title: 'Referral Reward', at: '2026-06-17T10:00:00', amount: 12.40, incoming: true, failed: false, kind: 'referral_commission', status: 'completed', reference: 'AT-RW-001' },
  { id: 'tx-wr', title: 'Transfer Received', at: '2026-06-11T09:00:00', amount: 250.00, incoming: true, failed: false, kind: 'wallet_receive', status: 'completed', txId: 'a1b2c3d4e5f67890', reference: 'AT-WL-WR' },
];

/** Scope tabs — All | Wallet | Cards | Rewards (Transactions page) */
export const ACTIVITY_SCOPE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'card', label: 'Cards' },
  { id: 'rewards', label: 'Rewards' },
];

/** @deprecated Use ACTIVITY_SCOPE_FILTERS on transactions page */
export const ACTIVITY_FILTERS = ACTIVITY_SCOPE_FILTERS;

export const TX_DATE_RANGES = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: '90d', label: 'Last 3 Months' },
  { id: 'custom', label: 'Custom Range' },
];

export const TX_STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'completed', label: 'Completed' },
  { id: 'pending', label: 'Pending' },
  { id: 'failed', label: 'Failed' },
];

const WALLET_KINDS = new Set([
  'wallet_topup',
  'wallet_withdraw',
  'wallet_send',
  'wallet_receive',
  'card_topup',
  'wallet_fee',
]);
const CARD_KINDS = new Set(['card_spend', 'refund', 'reversal']);
const REWARD_KINDS = new Set([
  'referral_reward',
  'referral_commission',
  'referral_withdrawal',
  'referral_pending',
]);

const TYPE_LABELS = {
  wallet_topup: 'Wallet Deposit',
  wallet_withdraw: 'Withdrawal',
  wallet_send: 'Transfer Sent',
  wallet_receive: 'Transfer Received',
  wallet_fee: 'Network Fee',
  card_topup: 'Card Top Up',
  card_spend: 'Card Purchase',
  refund: 'Refund',
  reversal: 'Reversal',
  referral_reward: 'Referral Reward',
  referral_commission: 'Commission',
  referral_withdrawal: 'Reward Withdrawal',
  referral_pending: 'Pending Reward',
};

export function getActivityTypeLabel(kind) {
  return TYPE_LABELS[kind] ?? 'Transaction';
}

export function getActivityStatus(item) {
  if (item?.status) return item.status;
  if (item?.failed) return 'failed';
  if (item?.pending) return 'pending';
  return 'completed';
}

export function normalizeActivityItem(item) {
  if (!item) return item;
  const status = getActivityStatus(item);
  return {
    ...item,
    status,
    failed: status === 'failed',
    typeLabel: item.typeLabel ?? getActivityTypeLabel(item.kind),
    reference: item.reference ?? item.id,
    txId: item.txId ?? (['wallet_topup', 'wallet_send', 'wallet_receive', 'wallet_withdraw', 'wallet_fee'].includes(item.kind)
      ? item.reference
      : undefined),
  };
}

export function normalizeActivityItems(items = []) {
  return items.map(normalizeActivityItem);
}

export function isWalletActivity(item) {
  return WALLET_KINDS.has(item?.kind);
}

export function isCardActivity(item) {
  return CARD_KINDS.has(item?.kind);
}

export function isRewardActivity(item) {
  return REWARD_KINDS.has(item?.kind);
}

export function filterActivity(items, filterId) {
  return filterActivityByScope(items, filterId);
}

export function filterActivityByScope(items, scopeId) {
  if (scopeId === 'wallet') return items.filter(isWalletActivity);
  if (scopeId === 'card') return items.filter(isCardActivity);
  if (scopeId === 'rewards') return items.filter(isRewardActivity);
  return items;
}

/** Dashboard — mixed wallet + card + reward preview (no duplicates across pages) */
export function filterActivityForDashboard(items) {
  return items.filter((t) => isWalletActivity(t) || isCardActivity(t) || isRewardActivity(t));
}

/** Wallet page — balance movements only (no card purchases / merchant payments) */
export function filterActivityForWalletPage(items) {
  return items.filter(isWalletActivity);
}

/** Cards page — selected card usage only (no wallet deposits / transfers) */
export function filterActivityForCardPage(items, last4) {
  let list = items.filter(isCardActivity);
  if (last4) list = list.filter((t) => t.cardLast4 === last4);
  return list;
}

/** Rewards page — referral earnings and withdrawals only */
export function filterActivityForRewardsPage(items) {
  return items.filter(isRewardActivity);
}

export function filterActivityByCard(items, last4) {
  if (!last4 || last4 === 'all') return items;
  return items.filter((t) => t.cardLast4 === last4);
}

export function filterActivityByStatus(items, statusId) {
  if (!statusId || statusId === 'all') return items;
  return items.filter((t) => getActivityStatus(t) === statusId);
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function getDateRangeBounds(rangeId, customFrom, customTo, now = new Date()) {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (rangeId === 'custom' && customFrom && customTo) {
    const from = startOfDay(customFrom);
    const to = new Date(customTo);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  const from = startOfDay(now);
  if (rangeId === 'today') return { from, to: end };
  if (rangeId === '7d') {
    from.setDate(from.getDate() - 6);
    return { from, to: end };
  }
  if (rangeId === '30d') {
    from.setDate(from.getDate() - 29);
    return { from, to: end };
  }
  if (rangeId === '90d') {
    from.setDate(from.getDate() - 89);
    return { from, to: end };
  }
  from.setDate(from.getDate() - 89);
  return { from, to: end };
}

export function filterActivityByDateRange(items, rangeId, customFrom, customTo) {
  const { from, to } = getDateRangeBounds(rangeId, customFrom, customTo);
  return items.filter((t) => {
    const d = new Date(t.at);
    return !Number.isNaN(d.getTime()) && d >= from && d <= to;
  });
}

export function filterActivityBySearch(items, query) {
  const q = String(query ?? '').trim().toLowerCase();
  if (!q) return items;
  return items.filter((t) => {
    const merchant = String(t.title ?? '').toLowerCase();
    const description = String(getActivityDescription(t) ?? '').toLowerCase();
    const typeLabel = String(t.typeLabel ?? getActivityTypeLabel(t.kind) ?? '').toLowerCase();
    const reference = String(t.reference ?? t.id ?? '').toLowerCase();
    const txId = String(t.txId ?? '').toLowerCase();
    const cardLast4 = String(t.cardLast4 ?? '').toLowerCase();
    return (
      merchant.includes(q)
      || description.includes(q)
      || typeLabel.includes(q)
      || reference.includes(q)
      || txId.includes(q)
      || cardLast4.includes(q)
    );
  });
}

/** Map URL query → scope filter */
export function resolveActivityFilterFromSearch(searchParams) {
  const type = searchParams?.get?.('type');
  const source = searchParams?.get?.('source');
  if (source === 'wallet' || type === 'topup') return 'wallet';
  if (source === 'card') return 'card';
  if (source === 'rewards' || type === 'reward') return 'rewards';
  return 'all';
}

/** Newest first */
export function sortActivityChronological(items) {
  return [...items].sort((a, b) => new Date(b.at) - new Date(a.at));
}

/** Portal activity — remote API modes never fall back to mock */
export function resolvePortalActivityItems(activityItems, userCards) {
  if (isHttpApi) return normalizeActivityItems(activityItems ?? []);
  if (activityItems?.length) return normalizeActivityItems(activityItems);
  return normalizeActivityItems(activityForUserCards(ACTIVITY, userCards));
}

/** Portal activity including wallet top-up history — mock only in local dev */
export function resolvePortalActivityWithHistory(activityItems) {
  if (isHttpApi) return normalizeActivityItems(activityItems ?? []);
  if (activityItems?.length) return normalizeActivityItems(activityItems);
  return normalizeActivityItems(buildUnifiedActivityItems(ACTIVITY, HISTORY));
}

/** Keep only transactions for cards the user actually holds */
export function activityForUserCards(items, cards) {
  if (!cards?.length) return items;
  const last4s = new Set(cards.map((c) => c.last4));
  return items.filter((t) => !t.cardLast4 || last4s.has(t.cardLast4));
}

export function activityCardFilterLabel(card) {
  if (!card) return 'All cards';
  return maskCardEnding(card);
}

/** English/international formatting — never browser default (e.g. ko-KR) */
export const DISPLAY_LOCALE = 'en-US';

function parseActivityDate(isoOrDate) {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
}

function activityStartOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isSameCalendarDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
  );
}

/** @typedef {'today'|'yesterday'|'week'|'year'|'prior'} ActivityDateBucket */

/** Classify a transaction date for display rules */
export function getActivityDateBucket(isoOrDate, now = new Date()) {
  const d = parseActivityDate(isoOrDate);
  if (!d) return 'prior';

  if (isSameCalendarDay(d, now)) return 'today';

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameCalendarDay(d, yesterday)) return 'yesterday';

  const diffDays = Math.floor(
    (activityStartOfDay(now).getTime() - activityStartOfDay(d).getTime()) / 86400000,
  );
  if (diffDays > 0 && diffDays < 7) return 'week';
  if (d.getFullYear() === now.getFullYear()) return 'year';
  return 'prior';
}

/** 24h time in en-US labels — e.g. 14:35 (user's local timezone) */
export function formatActivityTime(isoOrDate) {
  const d = parseActivityDate(isoOrDate);
  if (!d) return '';
  return d.toLocaleTimeString(DISPLAY_LOCALE, { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatMonthDay(isoOrDate, padDay = true) {
  const d = parseActivityDate(isoOrDate);
  if (!d) return '';
  const month = d.toLocaleDateString(DISPLAY_LOCALE, { month: 'short' });
  const day = padDay
    ? String(d.getDate()).padStart(2, '0')
    : String(d.getDate());
  return `${month} ${day}`;
}

function formatMonthDayYear(isoOrDate) {
  const d = parseActivityDate(isoOrDate);
  if (!d) return '';
  const month = d.toLocaleDateString(DISPLAY_LOCALE, { month: 'short' });
  const day = String(d.getDate()).padStart(2, '0');
  return `${month} ${day}, ${d.getFullYear()}`;
}

/**
 * Activity list date label.
 * @param {'compact'|'standard'|'grouped-time'|'grouped-row'} [options.style]
 *   compact — dashboard preview
 *   standard — wallet / card / rewards previews
 *   grouped-time — transactions row (time only)
 *   grouped-row — transactions row in prior-year group (month day)
 */
export function formatActivityWhen(isoOrDate, options = {}) {
  const { style = 'standard', now = new Date() } = options;
  const d = parseActivityDate(isoOrDate);
  if (!d) return '';

  if (style === 'grouped-time') return `${formatMonthDay(d)} · ${formatActivityTime(d)}`;
  if (style === 'grouped-row') return `${formatMonthDay(d)} · ${formatActivityTime(d)}`;

  const bucket = getActivityDateBucket(d, now);

  if (style === 'compact') {
    if (bucket === 'today') return formatActivityTime(d);
    if (bucket === 'yesterday') return 'Yesterday';
    if (bucket === 'prior') return formatMonthDayYear(d);
    return formatMonthDay(d);
  }

  // standard
  if (bucket === 'today') return formatActivityTime(d);
  if (bucket === 'yesterday') return `Yesterday · ${formatActivityTime(d)}`;
  if (bucket === 'week') {
    const weekday = d.toLocaleDateString(DISPLAY_LOCALE, { weekday: 'short' });
    return `${weekday} · ${formatActivityTime(d)}`;
  }
  if (bucket === 'year') return formatMonthDay(d);
  return formatMonthDayYear(d);
}

/** Section header for grouped transactions feed */
export function formatActivityGroupLabel(isoOrDate, now = new Date()) {
  const d = parseActivityDate(isoOrDate);
  if (!d) return '';
  const bucket = getActivityDateBucket(d, now);
  if (bucket === 'today') return 'Today';
  if (bucket === 'yesterday') return 'Yesterday';
  if (bucket === 'prior') return String(d.getFullYear());
  return formatMonthDay(d, false);
}

/** Group sorted activity items by calendar day / year for transactions page */
export function groupActivityByDate(items = [], now = new Date()) {
  const groups = [];
  for (const item of sortActivityChronological(items)) {
    const d = parseActivityDate(item.at);
    if (!d) continue;
    const bucket = getActivityDateBucket(d, now);
    let key;
    if (bucket === 'prior') {
      key = `year-${d.getFullYear()}`;
    } else if (bucket === 'today') {
      key = 'today';
    } else if (bucket === 'yesterday') {
      key = 'yesterday';
    } else {
      key = `day-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    }
    const label = formatActivityGroupLabel(d, now);
    const last = groups[groups.length - 1];
    if (!last || last.key !== key) {
      groups.push({ key, label, bucket, items: [item] });
    } else {
      last.items.push(item);
    }
  }
  return groups;
}

/** Full date & time — detail drawer only */
export function formatActivityDateTime(isoOrDate) {
  const d = parseActivityDate(isoOrDate);
  if (!d) return '—';
  const date = d.toLocaleDateString(DISPLAY_LOCALE, { month: 'short', day: 'numeric', year: 'numeric' });
  const time = formatActivityTime(d);
  return `${date} · ${time}`;
}

export function formatActivityAmountParts(amount, incoming, kind) {
  const val = Math.abs(amount).toFixed(2);
  const usdtOut = new Set(['wallet_send', 'wallet_withdraw', 'wallet_fee', 'referral_withdrawal']);
  const usdtIn = new Set([
    'wallet_topup', 'wallet_receive', 'card_topup',
    'referral_reward', 'referral_commission', 'referral_pending',
  ]);
  if (usdtOut.has(kind)) return { sign: '-', value: val, currency: 'USDT' };
  if (usdtIn.has(kind)) return { sign: '+', value: val, currency: 'USDT' };
  if (kind === 'refund' || kind === 'reversal') return { sign: '+', value: val, currency: 'USD' };
  return incoming
    ? { sign: '+', value: val, currency: 'USDT' }
    : { sign: '-', value: val, currency: 'USD' };
}

export function formatActivityAmount(amount, incoming, kind) {
  const { sign, value, currency } = formatActivityAmountParts(amount, incoming, kind);
  return `${sign}${value} ${currency}`;
}

export function formatActivityStatusLabel(status) {
  const map = {
    completed: 'Completed',
    pending: 'Pending',
    failed: 'Failed',
  };
  return map[status] ?? 'Completed';
}

export function getActivityIconVariant(item) {
  const status = getActivityStatus(item);
  if (status === 'failed') return 'fail';
  if (status === 'pending') return 'pending';
  const kind = item?.kind;
  if (REWARD_KINDS.has(kind)) return 'reward';
  if (kind === 'refund' || kind === 'reversal') return 'refund';
  if (kind === 'wallet_topup' || kind === 'wallet_receive' || kind === 'card_topup') return 'deposit';
  if (kind === 'card_spend' || kind === 'wallet_send' || kind === 'wallet_withdraw' || kind === 'wallet_fee') {
    return 'payment';
  }
  return item?.incoming ? 'deposit' : 'payment';
}

export function activitySubtitleLabel(item) {
  if (isRewardActivity(item)) return 'Reward';
  if (isWalletActivity(item)) return 'Wallet';
  if (item?.cardLast4) return maskCardEnding({ last4: item.cardLast4 });
  return 'Wallet';
}

export function getActivitySourceLabel(item) {
  if (isRewardActivity(item)) return 'Reward';
  if (isWalletActivity(item)) return 'Wallet';
  return 'Card';
}

export function getActivityDescription(item) {
  if (item?.description) return item.description;
  const map = {
    wallet_topup: 'USDT deposit to your Anytap wallet',
    wallet_withdraw: 'USDT withdrawn from your wallet',
    wallet_send: 'USDT sent from your wallet',
    wallet_receive: 'USDT received in your wallet',
    wallet_fee: 'Network fee for on-chain transfer',
    card_topup: 'Wallet balance transferred to card',
    card_spend: item?.title ? `Payment at ${item.title}` : 'Card purchase',
    refund: item?.title ?? 'Refund to your card balance',
    reversal: 'Transaction reversal',
    referral_reward: 'Referral reward credited',
    referral_commission: item?.memberName
      ? `Commission from ${item.memberName}`
      : 'Referral commission credited',
    referral_withdrawal: 'Reward balance withdrawn',
    referral_pending: 'Referral reward pending confirmation',
  };
  return map[item?.kind] ?? '';
}

export function getActivityMerchantLabel(item) {
  if (item?.kind === 'card_spend') return item.title ?? '—';
  if (item?.kind === 'refund' || item?.kind === 'reversal') {
    return String(item.title ?? '').replace(/^Refund —\s*/i, '') || item.title || '—';
  }
  if (item?.kind === 'wallet_send') return item.title ?? 'External wallet';
  if (item?.kind === 'wallet_receive') return item.title ?? 'External wallet';
  if (item?.kind === 'wallet_topup' || item?.kind === 'wallet_withdraw' || item?.kind === 'wallet_fee') {
    return 'Anytap Wallet';
  }
  if (item?.kind === 'card_topup') return 'Anytap Wallet';
  if (isRewardActivity(item)) return item.title ?? 'Referral Reward';
  return item?.title ?? '—';
}

export function getActivityNetwork(item) {
  const walletKinds = new Set([
    'wallet_topup', 'wallet_send', 'wallet_receive', 'wallet_withdraw', 'wallet_fee',
  ]);
  if (walletKinds.has(item?.kind)) return 'TRON (TRC-20)';
  if (item?.kind === 'card_spend' || item?.kind === 'refund' || item?.kind === 'reversal') return 'Visa';
  return null;
}

export function getActivityMaskedCard(item) {
  if (!item?.cardLast4) return null;
  return maskCardFull(item.cardLast4);
}

export function applyTransactionFilters(items, {
  scope = 'all',
  dateRange = '90d',
  customFrom = '',
  customTo = '',
  status = 'all',
  searchQuery = '',
  cardLast4 = 'all',
} = {}) {
  let list = normalizeActivityItems(items);
  list = filterActivityByScope(list, scope);
  list = filterActivityByCard(list, cardLast4);
  list = filterActivityByDateRange(list, dateRange, customFrom, customTo);
  list = filterActivityByStatus(list, status);
  list = filterActivityBySearch(list, searchQuery);
  return sortActivityChronological(list);
}

// ─── Top-up history (legacy mock — merged into unified feed) ────────────────

export const HISTORY = [
  { date: 'Jun 18 · 09:24', usdt: '200.00', fee: '1.00', usd: '$199.00', st: 3, tx: 'a3f8c92b7e1d04ff' },
  { date: 'Jun 15 · 14:02', usdt: '500.00', fee: '1.00', usd: '$499.00', st: 3, tx: '7d2e10ff9ac3b821' },
  { date: 'Jun 18 · 10:05', usdt: '100.00', fee: '1.00', usd: 'Pending', st: 2, tx: 'c91b44a0de77f230' },
  { date: 'Jun 18 · 10:31', usdt: '50.00', fee: '1.00', usd: 'Pending', st: 1, tx: 'f0312bb98e4ad551' },
  { date: 'Jun 12 · 18:40', usdt: '300.00', fee: '1.00', usd: 'Failed', st: 0, tx: 'ee55aa10cc239810' },
];

export const STEP_LABELS = {
  1: 'Deposit detected · confirming',
  2: 'Aggregating funds · please wait',
  3: 'Card top-up complete',
  0: 'Failed · contact support',
};

export const STEP_COLORS = { 1: '#F6A623', 2: '#3182CE', 3: '#38A169', 0: '#E53E3E' };

const MONTHS = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

export function parseTopUpHistoryDate(dateStr) {
  const m = String(dateStr).match(/^(\w+)\s+(\d+)\s·\s(\d+):(\d+)$/);
  if (!m) return '2026-06-01T00:00:00';
  const month = MONTHS[m[1]] ?? 5;
  const day = String(Number(m[2])).padStart(2, '0');
  const hour = String(Number(m[3])).padStart(2, '0');
  const minute = String(Number(m[4])).padStart(2, '0');
  const monthNum = String(month + 1).padStart(2, '0');
  return `2026-${monthNum}-${day}T${hour}:${minute}:00`;
}

function topUpStepStatus(st) {
  if (st === 0) return 'failed';
  if (st === 3) return 'completed';
  return 'pending';
}

export function topUpHistoryToActivityItems(history = []) {
  return history.map((h) => ({
    id: `wh-${h.tx}`,
    title: h.st === 0 ? 'Wallet Deposit' : h.st === 3 ? 'Wallet Deposit' : 'Wallet Deposit',
    at: parseTopUpHistoryDate(h.date),
    amount: parseFloat(h.usdt),
    incoming: true,
    failed: h.st === 0,
    status: topUpStepStatus(h.st),
    kind: 'wallet_topup',
    txId: h.tx,
    reference: `AT-WH-${h.tx.slice(0, 8).toUpperCase()}`,
  }));
}

/** Network fees from top-up / deposit history — shown on Wallet page only */
export function topUpHistoryFeeItems(history = []) {
  return history
    .filter((h) => parseFloat(h.fee) > 0)
    .map((h) => ({
      id: `fee-${h.tx}`,
      title: 'Network Fee',
      at: parseTopUpHistoryDate(h.date),
      amount: parseFloat(h.fee),
      incoming: false,
      failed: false,
      status: h.st === 0 ? 'failed' : topUpStepStatus(h.st),
      kind: 'wallet_fee',
      txId: h.tx,
      reference: `AT-FEE-${h.tx.slice(0, 8).toUpperCase()}`,
    }));
}

/** Referral reward history → unified activity items */
export function rewardHistoryToActivityItems(rewardHistory = []) {
  return rewardHistory.map((r) => {
    const at = String(r.date).includes('T') ? r.date : `${r.date}T12:00:00`;
    const isWithdrawal = /withdraw/i.test(r.description ?? '');
    const isPending = /pending/i.test(r.description ?? '');
    let kind = 'referral_commission';
    if (isWithdrawal) kind = 'referral_withdrawal';
    else if (isPending) kind = 'referral_pending';
    else if (/referral reward/i.test(r.description ?? '')) kind = 'referral_reward';

    return normalizeActivityItem({
      id: `reward-${r.id}`,
      title: isWithdrawal ? 'Reward Withdrawal' : isPending ? 'Pending Reward' : 'Referral Reward',
      at,
      amount: r.amount,
      incoming: !isWithdrawal,
      failed: false,
      status: isPending ? 'pending' : 'completed',
      kind,
      reference: `AT-RW-${String(r.id).toUpperCase()}`,
      memberName: r.memberName,
      description: r.description,
    });
  });
}

export function mergeActivityItems(base = [], extra = []) {
  const ids = new Set(base.map((t) => t.id));
  const txIds = new Set(base.map((t) => t.txId).filter(Boolean));
  const merged = [...base];
  for (const item of extra) {
    if (ids.has(item.id) || (item.txId && txIds.has(item.txId))) continue;
    merged.push(item);
    ids.add(item.id);
    if (item.txId) txIds.add(item.txId);
  }
  return sortActivityChronological(merged);
}

export function buildUnifiedActivityItems(transactions = [], topUpHistory = []) {
  const normalized = normalizeActivityItems(transactions);
  const txIds = new Set(normalized.map((t) => t.id));
  const txHashSet = new Set(normalized.map((t) => t.txId).filter(Boolean));
  const fromHistory = topUpHistoryToActivityItems(topUpHistory)
    .filter((item) => !txIds.has(item.id) && !txHashSet.has(item.txId));
  const fees = topUpHistoryFeeItems(topUpHistory)
    .filter((item) => !txIds.has(item.id) && !txHashSet.has(item.txId));
  return sortActivityChronological([...normalized, ...fromHistory, ...fees]);
}

export function buildFullActivityFeed(transactions = [], topUpHistory = [], rewardHistory = []) {
  const base = buildUnifiedActivityItems(transactions, topUpHistory);
  const rewards = rewardHistoryToActivityItems(rewardHistory);
  return mergeActivityItems(base, rewards);
}
