/**
 * Map AnyTap ALB Admin API payloads → Admin UI shapes (mock-compatible).
 * Source: ALB OpenAPI `/api-docs` + E2E test dashboard.
 */

function lower(value, fallback = '') {
  if (value == null || value === '') return fallback;
  return String(value).toLowerCase();
}

function dateOnly(iso) {
  if (!iso) return '';
  return String(iso);
}

function displayName(row) {
  return row?.name || row?.loginId || row?.email || row?.userId || '—';
}

/** ACTIVE|PENDING|SUSPENDED → UI accountStatus */
export function mapAccountStatus(status) {
  const s = lower(status, 'pending');
  if (s === 'suspended') return 'suspended';
  if (s === 'active') return 'active';
  return s || 'pending';
}

/** APPROVED|PENDING|REJECTED → UI kyc status */
export function mapKycStatus(status) {
  return lower(status, 'pending');
}

export function mapAdminProfile(data) {
  if (!data || typeof data !== 'object') {
    return { id: '', name: 'Admin', email: '', role: 'admin' };
  }
  return {
    id: data.id || data.userId || data.loginId || 'admin',
    name: data.name || displayName(data),
    email: data.email || '',
    role: data.role || 'admin',
  };
}

export function mapMemberRow(row) {
  const userId = row?.userId && row.userId !== '-' ? row.userId : '';
  const id = userId || (row?.loginId ? `temp-${row.loginId}` : '');
  return {
    id,
    userId: userId || null,
    loginId: row?.loginId || '',
    name: displayName(row),
    email: row?.email || '',
    country: row?.country || '—',
    joinDate: dateOnly(row?.createdAt || row?.joinDate),
    kycStatus: mapKycStatus(row?.kycStatus),
    cardStatus: lower(row?.cardStatus, 'not_issued'),
    cardStatusText: row?.cardStatusText || '',
    walletBalance: Number(row?.walletBalance ?? 0) || 0,
    cregisActualBalance: Number(row?.cregisActualBalance ?? row?.actualBalance ?? row?.walletBalance ?? 0) || 0,
    cregisWalletAddress: row?.cregisWalletAddress && row.cregisWalletAddress !== '-'
      ? row.cregisWalletAddress
      : '',
    referralStatus: lower(row?.referralStatus, 'none'),
    accountStatus: mapAccountStatus(row?.status || row?.accountStatus),
    phone: row?.phone || '—',
    memo: row?.memo || '',
    role: row?.role || 'user',
    wasabiHolderId: row?.wasabiHolderId || null,
    createdAt: row?.createdAt || '',
    cardLast4: row?.cardLast4 || null,
    wasabiCardId: row?.wasabiCardId || null,
    cardType: row?.cardType || null,
    unpaidTotalFee: Number(row?.unpaidTotalFee ?? 0) || 0,
    accumulatedTotalFee: Number(row?.accumulatedTotalFee ?? 0) || 0,
  };
}

export function mapUserDetail(data) {
  if (!data) return null;
  const mapped = mapMemberRow(data);
  return {
    ...mapped,
    cregisActualBalance: Number(data.cregisActualBalance ?? data.actualBalance ?? mapped.cregisActualBalance ?? 0) || 0,
    cardIds: Array.isArray(data.cardIds) ? data.cardIds : [],
    merchantId: data.merchantId || '',
    merchantName: data.merchantName || '',
    walletExists: data.walletExists === true,
    needsActivation: data.needsActivation === true,
    trackingNumber: data.trackingNumber || '',
    carrier: data.carrier || '',
  };
}

export function mapKycRow(row) {
  const userId = row?.userId || row?.id || '';
  return {
    id: userId,
    memberId: userId,
    memberName: row?.memberName || displayName(row),
    memberEmail: row?.memberEmail || row?.email || '',
    country: row?.country || '—',
    status: mapKycStatus(row?.kycStatus || row?.status),
    submittedAt: row?.createdAt || row?.submittedAt || '',
    documentType: row?.documentType || row?.idType || 'Passport',
    idDocumentUrl: row?.idDocumentUrl || '',
    selfieUrl: row?.selfieUrl || '',
    rejectReason: row?.rejectReason || row?.rejectionReason || '',
    loginId: row?.loginId || '',
  };
}

/** UI card statuses vs ALB cardStatus values */
const CARD_STATUS_UI_ALIASES = {
  pending: 'application_review',
  applied: 'application_review',
  approved: 'deposit_received',
};

export function mapCardStatusForApi(uiStatus) {
  const s = lower(uiStatus);
  return CARD_STATUS_UI_ALIASES[s] || s;
}

export function mapCardRow(row) {
  const userId = row?.userId || row?.id || '';
  const wasabiCardId = row?.wasabiCardId && row.wasabiCardId !== '-' ? row.wasabiCardId : '';
  // 카드별 고유 id: wasabiCardId 우선, 없으면 userId
  const id = wasabiCardId || userId;
  const status = lower(row?.cardStatus || row?.status, 'not_issued');
  const wBal = Number(row?.walletBalance ?? 0) || 0;
  const cActual = Number(row?.cregisActualBalance ?? wBal) || 0;
  const uFee = Number(row?.unpaidTotalFee ?? 0) || 0;

  return {
    id,
    memberId: userId,
    memberName: displayName(row),
    memberEmail: row?.email || '',
    cardType: row?.cardType || 'physical',
    status,
    wallet: row?.cregisWalletAddress && row.cregisWalletAddress !== '-'
      ? row.cregisWalletAddress
      : (row?.wallet || '—'),
    walletBalance: wBal,
    cregisActualBalance: cActual,
    unpaidTotalFee: uFee,
    created: dateOnly(row?.createdAt || row?.created),
    last4: row?.last4 && row.last4 !== '-' ? row.last4 : null,
    wasabiCardId,
    balance: Number(row?.balance ?? row?.cardBalance ?? 0),
    currency: row?.currency || 'USD',
    trackingNumber: row?.trackingNumber || '',
    carrier: row?.carrier || '',
    loginId: row?.loginId || '',
    rejectReason: row?.rejectReason || '',
  };
}

export function paginateLocal(items, {
  page = 1,
  pageSize = 10,
  search = '',
  sortKey = '',
  sortDir = 'asc',
  searchKeys = [],
  ...filters
} = {}) {
  let list = Array.isArray(items) ? [...items] : [];

  Object.entries(filters).forEach(([key, value]) => {
    if (value == null || value === '' || value === 'all') return;
    if (['page', 'pageSize', 'search', 'sortKey', 'sortDir', 'searchKeys'].includes(key)) return;

    if (key === 'accountStatus') {
      list = list.filter((row) => row.accountStatus === value);
      return;
    }
    if (key === 'status') {
      const want = mapCardStatusForApi(value);
      list = list.filter((row) => {
        const current = lower(row.status || row.kycStatus || row.cardStatus);
        if (value === 'pending') {
          return current === 'pending' || current === 'application_review';
        }
        return current === lower(value) || current === want;
      });
      return;
    }
    list = list.filter((row) => lower(row[key]) === lower(value));
  });

  if (search?.trim() && searchKeys.length) {
    const q = search.trim().toLowerCase();
    list = list.filter((row) =>
      searchKeys.some((k) => String(row[k] ?? '').toLowerCase().includes(q)),
    );
  }

  if (sortKey) {
    const dir = sortDir === 'desc' ? -1 : 1;
    list.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }

  const total = list.length;
  const start = (Math.max(1, page) - 1) * pageSize;
  return {
    items: list.slice(start, start + pageSize),
    total,
    page: Math.max(1, page),
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize) || 1),
  };
}

export function mapDailySummaryToDashboard({
  summary = {},
  members = [],
  kyc = [],
  cards = [],
  recentTxs = [],
} = {}) {
  const pendingKyc = kyc.filter((k) => k.status === 'pending').length;
  const pendingCards = cards.filter((c) =>
    c.status === 'pending' || c.status === 'application_review',
  ).length;

  const recentKyc = [...kyc]
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
    .slice(0, 8)
    .map((k) => ({
      id: k.id,
      memberId: k.memberId || k.id,
      memberName: k.memberName,
      memberEmail: k.memberEmail || k.email || '',
      type: 'kyc',
      status: k.status,
      at: k.submittedAt,
      meta: k.documentType,
    }));

  const recentCards = [...cards]
    .sort((a, b) => new Date(b.created) - new Date(a.created))
    .slice(0, 8)
    .map((c) => ({
      id: c.id,
      memberId: c.memberId || c.id,
      memberName: c.memberName,
      memberEmail: c.memberEmail || c.email || '',
      type: 'card',
      status: c.status,
      at: c.created,
      meta: c.cardType,
    }));

  const memberMap = new Map();
  members.forEach((m) => {
    if (m.userId) memberMap.set(m.userId, m);
    if (m.id) memberMap.set(m.id, m);
  });

  const walletTransactions = [];
  const cardTransactions = [];

  (recentTxs || []).forEach((t) => {
    const uId = t.userId || t.id;
    const member = memberMap.get(uId);
    const rawKind = (t.type || t.txType || 'deposit').toLowerCase();
    const item = {
      id: t.txId || t.id,
      memberId: uId,
      memberName: member?.name || t.loginId || uId,
      memberEmail: member?.email || t.email || '—',
      kind: rawKind === 'deposit' ? 'wallet_deposit' : (rawKind === 'card_charge' ? 'card_spend' : rawKind),
      amount: Number(t.amount ?? 0),
      status: (t.status || 'success').toLowerCase(),
      at: t.createdAt || t.createdDate || t.at || new Date().toISOString(),
    };

    const txTypeStr = String(t.type || t.txType || '').toUpperCase();
    if (txTypeStr.includes('CARD') || txTypeStr.includes('WASABI')) {
      cardTransactions.push(item);
    } else {
      walletTransactions.push(item);
    }
  });

  return {
    pendingTasks: {
      pendingKyc,
      cardApplications: pendingCards,
      withdrawalRequests: Number(summary.pendingWithdrawals ?? 0),
      depositVerification: 0,
    },
    systemSummary: {
      members: members.length,
      wallets: members.filter((m) => m.cregisWalletAddress).length,
      cards: Number(summary.activeCardsCount ?? cards.filter((c) => c.status === 'active').length),
      todayTopUp: Number(summary.totalVolumeUSD ?? 0),
      todayPayments: Number(summary.totalFeesUSDT ?? 0),
      referralRewards: 0,
      walletAssets: Number(summary.pendingSettlementUSDT ?? 0),
      systemStatus: 'operational',
    },
    recentRequests: {
      kyc: recentKyc,
      card: recentCards,
      withdrawal: [],
    },
    walletTransactions,
    cardTransactions,
    adminActivity: [],
    analytics: summary,
  };
}
