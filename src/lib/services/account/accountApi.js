/**
 * Member account data from Spring Boot backend.
 * UI state comes from login fields: kycStatus + cardStatus + walletExists + needsActivation.
 */

import { apiGet, apiPost, apiUpload } from '../../api/httpClient.js';
import { getHttpSession, patchHttpSession } from '../../api/httpSession.js';
import { UserFlowState } from '../../mockData.ts';
import {
  MOCK_ISSUANCE_DEPOSIT_ADDRESS,
  ISSUANCE_DEPOSIT_AMOUNT,
  showsIssuanceDepositWallet,
} from '../../../utils/wallet-data.js';
import { mapWasabiTransactionsResponse } from './wasabiMappers.js';
import { CARD_TEMPLATES } from '../../account-data.js';
import { mapWasabiIdType } from '../../card-application.js';
import { resolveDemoLockedSession } from '../../demo-session.js';
import {
  formatMemberPhone,
  profilePatchFromKycForm,
  resolveMemberCountry,
  resolveMemberDisplayName,
  bindMemberProfileToUser,
} from '../../member-profile.js';
import { getEmailForLoginId } from '../auth/loginId.js';

function mapKycStatus(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'PENDING_WALLET') return 'pending_wallet';
  // ALB Wasabi webhook sets Users.kycStatus / status to ACTIVE on approve.
  if (s === 'COMPLETED' || s === 'APPROVED' || s === 'ACTIVE') return 'approved';
  if (s === 'FAILED' || s === 'REJECTED') return 'rejected';
  if (s === 'UNDER_REVIEW') return 'under_review';
  return 'pending';
}

function mapCardStatus(status) {
  const s = String(status || 'not_issued').toLowerCase().replace(/\s+/g, '_');
  const aliases = {
    normal: 'active',
    approved: 'active',
    // BE POST /cards/{id}/register returns cardStatus=applied before issuance deposit.
    applied: 'application_review',
    notissued: 'not_issued',
    applicationreview: 'application_review',
    depositreceived: 'deposit_received',
  };
  return aliases[s.replace(/_/g, '')] || s || 'not_issued';
}

/** Higher = further along the card lifecycle (used to prefer BE updates over local apply lock). */
function cardStatusRank(status) {
  const order = {
    not_issued: 0,
    application_review: 1,
    deposit_received: 2,
    creating: 3,
    shipping: 4,
    issued: 5,
    active: 6,
    frozen: 6,
  };
  return order[mapCardStatus(status)] ?? 0;
}

function preferCardStatus(localStatus, backendStatus) {
  const local = mapCardStatus(localStatus);
  const backend = mapCardStatus(backendStatus);
  if (!backendStatus && localStatus) return local;
  if (!localStatus) return backend;
  return cardStatusRank(backend) >= cardStatusRank(local) ? backend : local;
}

/**
 * Backend often keeps cardStatus=not_issued after POST /cards/{id}/register.
 * UI needs application_review to show the $100 issuance deposit QR.
 */
function resolveCardStatusForUi(session, cardInfo) {
  let cardStatus = mapCardStatus(session.cardStatus);
  const demoLocked = session.demoLockState === true;
  const cardNo = String(cardInfo?.cardNo || cardInfo?.balanceInfo?.cardNo || '');
  const cardStatusFromWasabi = String(cardInfo?.status || '').toLowerCase();
  const cardFrozen = cardStatusFromWasabi === 'frozen' || cardInfo?.blocked === true;

  let isPhysical = session.cardType === 'physical' || cardInfo?.cardType === 'physical';
  if (cardInfo?.cardTypeId) {
    const cid = Number(cardInfo.cardTypeId);
    if (cid === 111059 || cid === 111095) isPhysical = true;
  }

  if (!demoLocked) {
    if (cardFrozen) return 'frozen';
    
    const rawLinkStatus = String(cardInfo?.linkStatus || '').toLowerCase();
    if (rawLinkStatus === 'active') {
      return 'active';
    }

    // issued cards stay as 'issued' — activation must be done by admin or pin activation
    const isIssued = (cardStatus === 'issued' || cardStatusFromWasabi === 'issued') && rawLinkStatus !== 'active';
    if (isIssued) {
      return 'issued';
    }

    const isIssuing = ['application_review', 'applied', 'deposit_received', 'creating', 'shipping'].includes(cardStatusFromWasabi)
                   || ['application_review', 'applied', 'deposit_received', 'creating', 'shipping'].includes(cardStatus);
    if (isPhysical && isIssuing) {
      return cardStatusFromWasabi || cardStatus;
    }

    if (cardInfo && (cardNo || cardInfo.cardTypeId || cardInfo.status)) {
      if (isPhysical) {
        return cardStatusFromWasabi || cardStatus;
      }
      return cardStatusFromWasabi || cardStatus || 'active';
    }
    if (cardStatus === 'active') {
      return 'active';
    }
    if (cardStatus === 'issued') {
      return 'issued';
    }
  }

  const issuanceUi = ['application_review', 'applied', 'deposit_received', 'creating'];
  if (issuanceUi.includes(cardStatus)) return cardStatus;

  // Applied / holder created, Wasabi card not live yet → show issuance deposit.
  const appliedPending = session.cardApplicationPending === true
    || !!session.pendingVariant
    || (!!session.cardId && !cardInfo);
  if (cardStatus === 'not_issued' && appliedPending) {
    return 'application_review';
  }

  return cardStatus;
}

function resolveFlowState(kycApproved, cardStatus, userCards) {
  if (kycApproved && (cardStatus === 'active' || cardStatus === 'frozen') && userCards.length) {
    return UserFlowState.CARD_ACTIVE_WITH_TRANSACTIONS;
  }
  if (kycApproved && (cardStatus === 'active' || cardStatus === 'frozen')) {
    return UserFlowState.CARD_ACTIVE_WITH_TRANSACTIONS;
  }
  if (kycApproved) return UserFlowState.KYC_APPROVED;
  return UserFlowState.SIGNUP_ONLY;
}

function demoPreviewCards(cardStatus, name, balanceUsdt) {
  if (cardStatus === 'shipping') {
    return [{ ...CARD_TEMPLATES.physical8804, status: 'shipping', holderName: name, isPrimary: true }];
  }
  if (cardStatus === 'issued') {
    return [{ ...CARD_TEMPLATES.virtual4921, status: 'issued', holderName: name, isPrimary: true }];
  }
  if (cardStatus === 'active' || cardStatus === 'frozen') {
    return [{
      ...CARD_TEMPLATES.virtual4921,
      status: cardStatus === 'frozen' ? 'frozen' : 'active',
      balance: `${Number(balanceUsdt || 0).toFixed(2)} USDT`,
      holderName: name,
      isPrimary: true,
    }];
  }
  return [];
}

function parseCregisAvailableBalance(payload) {
  if (payload == null) return null;
  if (typeof payload === 'number' && Number.isFinite(payload)) return payload;
  if (typeof payload !== 'object') return null;
  const raw = payload.availableBalance
    ?? payload.available_balance
    ?? payload.balance
    ?? payload.actualBalance
    ?? payload.actual_balance;
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function parseWasabiCardBalance(cardInfo) {
  if (!cardInfo || typeof cardInfo !== 'object') return null;
  const raw = cardInfo?.balanceInfo?.amount
    ?? cardInfo?.balance
    ?? cardInfo?.cardBalance
    ?? cardInfo?.availableBalance;
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

async function fetchCregisWalletBalance(userId) {
  if (!userId) return null;
  try {
    const data = await apiGet(`/cregis/user/sub-address-balance/${encodeURIComponent(userId)}`);
    return parseCregisAvailableBalance(data);
  } catch (err) {
    if (err?.status !== 400 && err?.status !== 404) {
      console.warn('[accountApi] cregis balance', err);
    }
    return null;
  }
}

function buildContextFromSession(session, cardInfoList = [], activityItems = [], cregisBalance = null) {
  const demoLocked = false;
  const kycStatus = mapKycStatus(session.kycStatus || session.status);
  const kycApproved = kycStatus === 'approved' || kycStatus === 'pending_wallet';
  const email = session.email || getEmailForLoginId(session.loginId) || '';
  // Show KYC fields once submitted (approved or under review); hide while still pending.
  const showProfileFields = kycApproved || kycStatus === 'under_review' || kycStatus === 'pending_wallet';
  const name = showProfileFields
    ? resolveMemberDisplayName({ ...session, email })
    : '';
  const country = showProfileFields ? resolveMemberCountry(session) : '';
  const phone = showProfileFields ? formatMemberPhone(session) : '';

  // Wallet = Cregis only. Card = Wasabi only. Never mix the two.
  const walletBalanceUsdt = demoLocked && session.walletBalance != null
    ? Number(session.walletBalance)
    : (cregisBalance != null
      ? Number(cregisBalance)
      : (session.walletBalance != null ? Number(session.walletBalance) : 0));

  const list = Array.isArray(cardInfoList) ? cardInfoList : (cardInfoList ? [cardInfoList] : []);
  
  let userCards = [];
  if (!demoLocked && list.length > 0) {
    userCards = list.map((cardInfo, idx) => {
      const cardBalanceRaw = parseWasabiCardBalance(cardInfo);
      const cardBalanceUsdt = cardBalanceRaw != null ? cardBalanceRaw : 0;
      const cardNo = String(cardInfo?.cardNo || cardInfo?.balanceInfo?.cardNo || '');
      const last4 = cardInfo.last4 || cardNo.replace(/\D/g, '').slice(-4) || cardNo.slice(-4) || '0000';
      
      const hasLiveWasabiBalance = cardBalanceRaw != null;
      const cardBalanceLabel = hasLiveWasabiBalance
        ? (cardInfo?.balanceInfo?.currency === 'USD' || !cardInfo?.balanceInfo?.currency
          ? `$${cardBalanceUsdt.toFixed(2)}`
          : `${cardBalanceUsdt.toFixed(2)} USDT`)
        : '—';
        
      let cardVariant = cardInfo.cardType || session.cardType || 'virtual';
      if (cardInfo?.cardTypeId) {
        const cid = Number(cardInfo.cardTypeId);
        if (cid === 111059) cardVariant = 'physical';
        else if (cid === 111032) cardVariant = 'virtual';
      } else if (cardNo) {
        const cleanNo = cardNo.replace(/\D/g, '');
        if (cleanNo.startsWith('493875')) {
          cardVariant = 'virtual';
        } else if (cleanNo.length >= 6) {
          cardVariant = 'physical';
        }
      }

      const cardStatusFromWasabi = String(cardInfo?.status || '').toLowerCase();
      const cardFrozen = cardStatusFromWasabi === 'frozen' || cardInfo?.blocked === true;
      const rawLinkStatus = cardInfo.linkStatus || session.cardStatus;
      const cardStatus = resolveCardStatusForUi(session, { ...cardInfo, status: rawLinkStatus });

      const wasabiCardId = cardInfo?.wasabiCardId || cardInfo?.cardNo || cardInfo?.id || '';
      return {
        id: wasabiCardId,
        variant: cardVariant,
        last4,
        cardNo: wasabiCardId,
        balance: cardBalanceLabel,
        status: cardFrozen || cardStatus === 'frozen' ? 'frozen' : cardStatus,
        isPrimary: idx === 0,
        holderName: name,
      };
    });
  }

  const primaryCardInfo = list[0] || null;
  const cardStatus = primaryCardInfo 
    ? resolveCardStatusForUi(session, { ...primaryCardInfo, status: primaryCardInfo.linkStatus || session.cardStatus })
    : mapCardStatus(session.cardStatus);

  const needsActivation = false;
  const walletExists = session.walletExists === true || !!session.cregisWalletAddress;
  const showIssuanceDeposit = showsIssuanceDepositWallet(cardStatus);
  const issuanceDepositAddress = showIssuanceDeposit
    ? (session.issuanceDepositAddress || MOCK_ISSUANCE_DEPOSIT_ADDRESS)
    : '';

  if (demoLocked && !userCards.length) {
    userCards = demoPreviewCards(cardStatus, name, walletBalanceUsdt);
  }

  const flowState = resolveFlowState(kycApproved, cardStatus, userCards);
  const zeroBalance = session.zeroBalance === true
    || (cardStatus === 'active' && walletExists && walletBalanceUsdt <= 0);

  const accountState = {
    userId: session.userId || '',
    loginId: session.loginId || '',
    name,
    email,
    country,
    phone,
    flowState,
    kycStatus,
    cardStatus,
    needsActivation,
    hasActiveCard: userCards.some(c => c.status === 'active' || c.status === 'frozen'),
    cardCount: userCards.length || undefined,
    walletExists,
    walletBalance: walletBalanceUsdt,
    zeroBalance,
    wasabiHolderId: session.wasabiHolderId || '',
    trackingNumber: session.trackingNumber || '',
    carrier: session.carrier || '',
    issuanceDepositAddress,
    issuanceDepositAmount: showIssuanceDeposit ? ISSUANCE_DEPOSIT_AMOUNT : undefined,
  };

  return {
    scenarioKey: kycApproved && cardStatus === 'active'
      ? 'cardActiveWithTransactions'
      : kycApproved
        ? 'kycApproved'
        : 'signupOnly',
    flowState,
    accountState,
    user: { name, email },
    wallet: {
      exists: walletExists,
      balanceUsdt: walletBalanceUsdt,
      network: 'TRC-20 (TRON)',
      address: userCards.some((c) => c && c.status === 'active') ? (session.cregisWalletAddress || '') : '',
    },
    userCards,
    registeredCards: userCards,
    cardApplications: [],
    transactions: activityItems,
    activityItems,
    topUpHistory: activityItems.filter((item) => item.kind === 'card_topup' || item.kind === 'wallet_topup'),
    referralCode: null,
  };
}

export async function fetchCardTransactions(userId, { pageNum = 1, pageSize = 50, last4 = '', cardId = '' } = {}) {
  if (!userId) return { total: 0, items: [] };
  try {
    let query = `pageNum=${encodeURIComponent(pageNum)}&pageSize=${encodeURIComponent(pageSize)}`;
    if (cardId) query += `&cardId=${encodeURIComponent(cardId)}`;
    const payload = await apiGet(`/cards/${encodeURIComponent(userId)}/transactions?${query}`);
    const items = mapWasabiTransactionsResponse(payload, { last4, cardId });
    const total = Number(payload?.total ?? items.length) || items.length;
    return { total, items };
  } catch (err) {
    if (err?.status === 400 || err?.status === 404) {
      return { total: 0, items: [] };
    }
    console.warn('[accountApi] card transactions', err);
    return { total: 0, items: [] };
  }
}

export async function fetchLocalTransactions(userId) {
  if (!userId) return [];
  try {
    const data = await apiGet(`/cards/${encodeURIComponent(userId)}/local-transactions`);
    if (!Array.isArray(data)) return [];
    return data.map((tx) => {
      let kind = 'unknown';
      let title = tx.description || 'Transaction';
      let incoming = true;
      const type = String(tx.txType || '').toUpperCase();
      if (type === 'DEPOSIT') {
        kind = 'wallet_topup';
        title = 'Wallet Deposit';
        incoming = true;
      } else if (type === 'CARD_CHARGE') {
        kind = 'card_topup';
        title = 'Card Top Up';
        incoming = false;
      } else if (type === 'CARD_CHARGE_FEE') {
        kind = 'card_charge_fee';
        title = 'Card Top Up Fee';
        incoming = false;
      } else if (type === 'WITHDRAW') {
        kind = 'wallet_withdraw';
        title = 'Transfer Sent';
        incoming = false;
      } else if (type === 'CARD_SPEND') {
        kind = 'card_spend';
        title = tx.description && tx.description !== '-' ? tx.description : 'Card Purchase';
        incoming = false;
      } else if (type === 'REFUND') {
        kind = 'refund';
        title = tx.description && tx.description !== '-' ? tx.description : 'Refund';
        incoming = true;
      }
      const status = String(tx.status || 'SUCCESS').toLowerCase();
      return {
        id: tx.txId || `local-${Date.now()}-${Math.random()}`,
        title: title,
        at: tx.chainTime || tx.createdAt,
        amount: Number(tx.amount || 0),
        rawAmount: Number(tx.rawAmount || tx.amount || 0),
        feeAmount: Number(tx.feeAmount || 0),
        incoming: incoming,
        failed: status === 'failed',
        kind: kind,
        status: status === 'success' ? 'completed' : status,
        txId: tx.txId,
        cardNo: tx.cardNo || tx.wasabiCardId || '',
        reference: tx.txId ? tx.txId.slice(0, 10).toUpperCase() : '',
        currency: tx.currency || tx.coinType || (type === 'CARD_SPEND' ? 'KRW' : 'USDT'),
        description: tx.description || '',
      };
    });
  } catch (err) {
    if (err?.status !== 400 && err?.status !== 404) {
      console.warn('[accountApi] local transactions', err);
    }
    return [];
  }
}

export async function fetchAccountContext() {
  const rawSession = getHttpSession();
  if (!rawSession?.userId) throw new Error('Not authenticated');

  bindMemberProfileToUser(rawSession.userId);

  // Pull latest cardStatus from BE (admin may have set deposit_received, etc.).
  if (!rawSession.demoLockState) {
    await refreshSessionFromUser(rawSession.userId);
  }

  let session = resolveDemoLockedSession(getHttpSession() || rawSession);
  if (!session.email) {
    const recovered = getEmailForLoginId(session.loginId);
    if (recovered) {
      session = patchHttpSession({ email: recovered }, { notify: false })
        || { ...session, email: recovered };
    }
  }

  const demoLocked = session.demoLockState === true;
  let cardInfoList = [];
  let cregisBalance = null;

  if (!demoLocked && shouldFetchWasabiCardInfo(session)) {
    try {
      cardInfoList = await apiGet(`/cards/${encodeURIComponent(session.userId)}/list-info`);
    } catch (err) {
      if (err?.status !== 400 && err?.status !== 404) {
        console.warn('[accountApi] card info list', err);
      }
    }
  }

  // Personal wallet balance lives on Cregis — never reuse Wasabi card USD here.
  if (!demoLocked && (session.walletExists || session.cregisWalletAddress)) {
    cregisBalance = await fetchCregisWalletBalance(session.userId);
  }

  let activityItems = [];
  try {
    const primaryCard = cardInfoList?.[0] || null;
    const cardNo = String(primaryCard?.cardNo || primaryCard?.wasabiCardId || primaryCard?.balanceInfo?.cardNo || '');
    const last4 = primaryCard?.last4 || cardNo.replace(/\D/g, '').slice(-4) || cardNo.slice(-4) || '';
    if (!demoLocked) {
      const cardList = Array.isArray(cardInfoList) ? cardInfoList : (cardInfoList ? [cardInfoList] : []);
      const activeCard = cardList.find((c) => c?.status === 'active' || c?.status === 'frozen') || cardList[0] || null;
      const targetCardNo = String(activeCard?.cardNo || activeCard?.wasabiCardId || activeCard?.balanceInfo?.cardNo || '');
      const targetLast4 = activeCard?.last4 || targetCardNo.replace(/\D/g, '').slice(-4) || targetCardNo.slice(-4) || '';

      const [cardTxResult, localTxs] = await Promise.all([
        targetCardNo ? fetchCardTransactions(session.userId, { cardId: targetCardNo, last4: targetLast4 }) : Promise.resolve({ items: [] }),
        fetchLocalTransactions(session.userId),
      ]);

      const cardTxs = cardTxResult?.items || [];

      const normalizedLocalTxs = localTxs.map((tx) => {
        if (tx.kind === 'card_topup') {
          // In Card View, Card Top-Up represents incoming money to the Card (+100 USDT)
          return { 
            ...tx, 
            cardNo: tx.cardNo || targetCardNo, 
            cardLast4: tx.cardLast4 || targetLast4,
            cardIncoming: true, // Mark as incoming deposit for Card View
            cardDisplayAmount: `+${Math.abs(Number(tx.amount || 0)).toFixed(2)} USDT`
          };
        }
        return tx;
      });
      activityItems = [...normalizedLocalTxs, ...cardTxs];
    }
  } catch (err) {
    console.warn('[accountApi] fetch transactions fallback', err);
  }

  return buildContextFromSession(session, cardInfoList, activityItems, cregisBalance);
}

export async function fetchReferralContext() {
  const session = getHttpSession();
  if (!session?.userId) return null;

  try {
    // Verify if the current logged in user owns a referral code in Referral_Codes table (Referrer check)
    let ownCode = null;
    let userDetail = null;

    try {
      const allReferralCodes = await apiGet('/admin/referrals').catch(() => []);
      const codeList = Array.isArray(allReferralCodes?.items) ? allReferralCodes.items : (Array.isArray(allReferralCodes) ? allReferralCodes : []);
      
      const foundCodeObj = codeList.find((rc) => (
        (rc.userId && String(rc.userId).toLowerCase() === String(session.userId).toLowerCase()) ||
        (rc.user_id && String(rc.user_id).toLowerCase() === String(session.userId).toLowerCase())
      ));

      if (foundCodeObj) {
        ownCode = foundCodeObj.code || foundCodeObj.referralCode;
      }
    } catch {
      ownCode = null;
    }

    // Fallback: check session user detail for explicitly assigned ownReferralCode or partnerReferralCode
    if (!ownCode) {
      ownCode = session?.ownReferralCode || session?.partnerReferralCode || null;
      userDetail = session;
    }

    // If user is merely a referred member (피추천인) and does NOT own a code in Referral_Codes:
    if (!ownCode) {
      return {
        referralStateKey: 'normalMember',
        status: 'NORMAL_MEMBER',
        isPartner: false,
        isPending: false,
        isNormalMember: true,
        code: null,
        inviteLink: '',
        totalEarnings: 0,
        availableBalance: 0,
        pendingBalance: 0,
        minWithdrawalUsdt: 10,
        statistics: { totalInvites: 0, activeMembers: 0, conversionRate: '0%', monthlyEarnings: 0 },
        memberRows: [],
        monthlyEarnings: [],
        rewardHistory: [],
      };
    }
    const availableBalance = Number(userDetail?.unpaidReferrerAllowance ?? userDetail?.availableBalance ?? session?.unpaidReferrerAllowance ?? 0);
    const totalEarnings = Number(userDetail?.accumulatedReferrerAllowance ?? userDetail?.totalEarnings ?? availableBalance);
    const pendingBalance = Number(userDetail?.pendingBalance ?? 0);

    let rawMembers = [];
    try {
      const res = await apiGet(`/admin/referrals/${encodeURIComponent(ownCode)}/members?pageNum=1&pageSize=100`).catch(() => null);
      if (res && Array.isArray(res.items)) {
        rawMembers = res.items;
      } else if (Array.isArray(res)) {
        rawMembers = res;
      }
    } catch {
      rawMembers = [];
    }

    const memberRows = rawMembers.map((m, idx) => {
      const topUpUsdt = Number(m.topUpUsdt ?? m.totalDeposit ?? m.walletBalance ?? 0);
      const rewardUsdt = Number(m.rewardUsdt ?? m.referrerReward ?? (topUpUsdt * 0.003));
      return {
        id: m.userId || m.id || `ref-m-${idx + 1}`,
        name: m.name || m.loginId || m.email || `Member ${idx + 1}`,
        email: m.email || '',
        status: (m.accountStatus || m.status || 'active').toLowerCase(),
        cards: Number(m.cards ?? m.cardCount ?? (m.cardStatus && m.cardStatus !== 'not_issued' ? 1 : 0)),
        topUpUsdt,
        rewardUsdt,
        joinedAt: m.createdAt || m.joinedAt || m.joinDate || new Date().toISOString().slice(0, 10),
      };
    });

    let depositLedger = [];
    try {
      const depRes = await apiGet(`/admin/referrals/${encodeURIComponent(ownCode)}/daily-deposits`).catch(() => null);
      if (depRes && Array.isArray(depRes.items)) {
        depositLedger = depRes.items;
      } else if (Array.isArray(depRes)) {
        depositLedger = depRes;
      }
    } catch {
      depositLedger = [];
    }

    return {
      referralStateKey: 'referralApproved',
      status: 'REFERRAL_APPROVED',
      isPartner: true,
      isPending: false,
      isNormalMember: false,
      code: ownCode,
      inviteLink: `https://anytap.app/sign-up?ref=${ownCode}`,
      totalEarnings,
      availableBalance,
      pendingBalance,
      minWithdrawalUsdt: 10,
      statistics: {
        totalInvites: memberRows.length,
        activeMembers: memberRows.filter((m) => m.status === 'active').length,
        conversionRate: memberRows.length > 0 ? `${Math.round((memberRows.filter((m) => m.status === 'active').length / memberRows.length) * 100)}%` : '0%',
        monthlyEarnings: totalEarnings,
      },
      memberRows,
      depositLedger,
      monthlyEarnings: [
        { month: 'Jan', amount: 0 },
        { month: 'Feb', amount: 0 },
        { month: 'Mar', amount: 0 },
        { month: 'Apr', amount: 0 },
        { month: 'May', amount: 0 },
        { month: 'Jun', amount: totalEarnings },
      ],
      rewardHistory: [],
    };
  } catch (err) {
    console.warn('[accountApi] fetchReferralContext error', err);
    return null;
  }
}

export async function fetchAllReferralPartners() {
  try {
    const res = await apiGet('/admin/referrals').catch(() => null);
    const rawList = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
    const members = await apiGet('/admin/members').catch(() => []).then((d) => (Array.isArray(d?.items) ? d.items : (Array.isArray(d) ? d : [])));

    if (rawList.length > 0) {
      return rawList.map((r, idx) => {
        const code = r.code || r.referralCode || `ANY-${String(idx + 1).padStart(3, '0')}`;
        const uId = r.userId || r.user_id || r.id;
        const matched = members.find((m) => m.id === uId || m.userId === uId || m.email === r.email || m.ownReferralCode === code);
        return {
          code,
          userId: matched?.id || matched?.userId || uId || '—',
          userEmail: matched?.email || r.email || r.userEmail || '—',
          memberName: matched?.name || r.name || r.memberName || r.description || code,
        };
      });
    }

    const memberPartners = members.filter((m) => m.ownReferralCode || m.isPartner || m.role === 'partner');
    if (memberPartners.length > 0) {
      return memberPartners.map((m, idx) => ({
        code: m.ownReferralCode || m.referralCode || `ANY-${String(idx + 1).padStart(3, '0')}`,
        userId: m.id || m.userId || '—',
        userEmail: m.email || '—',
        memberName: m.name || m.email || m.ownReferralCode || 'Partner',
      }));
    }

    return [
      { code: 'ANY-001', userId: 'US512799', userEmail: 'test217@217.com', memberName: 'yours' },
    ];
  } catch (err) {
    console.warn('[accountApi] fetchAllReferralPartners error', err);
    return [
      { code: 'ANY-001', userId: 'US512799', userEmail: 'test217@217.com', memberName: 'yours' },
    ];
  }
}

export async function fetchReferralContextByCode(targetCode) {
  if (!targetCode) return null;
  const code = String(targetCode).toUpperCase();
  try {
    let rawMembers = [];
    try {
      const res = await apiGet(`/admin/referrals/${encodeURIComponent(code)}/members?pageNum=1&pageSize=100`).catch(() => null);
      if (res && Array.isArray(res.items)) {
        rawMembers = res.items;
      } else if (Array.isArray(res)) {
        rawMembers = res;
      }
    } catch {
      rawMembers = [];
    }

    const memberRows = rawMembers.map((m, idx) => {
      const topUpUsdt = Number(m.topUpUsdt ?? m.totalDeposit ?? m.walletBalance ?? 0);
      const rewardUsdt = Number(m.rewardUsdt ?? m.referrerReward ?? (topUpUsdt * 0.003));
      const walletAddress = m.walletAddress || m.depositAddress || m.address || m.cregisAddress || '';
      return {
        id: m.userId || m.id || `ref-m-${idx + 1}`,
        name: m.name || m.loginId || m.email || `Member ${idx + 1}`,
        email: m.email || '',
        status: (m.accountStatus || m.status || 'active').toLowerCase(),
        cards: Number(m.cards ?? m.cardCount ?? (m.cardStatus && m.cardStatus !== 'not_issued' ? 1 : 0)),
        walletAddress,
        topUpUsdt,
        rewardUsdt,
        joinedAt: m.createdAt || m.joinedAt || m.joinDate || new Date().toISOString().slice(0, 10),
      };
    });

    let depositLedger = [];
    try {
      const depRes = await apiGet(`/admin/referrals/${encodeURIComponent(code)}/daily-deposits`).catch(() => null);
      if (depRes && Array.isArray(depRes.items)) {
        depositLedger = depRes.items;
      } else if (Array.isArray(depRes)) {
        depositLedger = depRes;
      }
    } catch {
      depositLedger = [];
    }

    return {
      referralStateKey: 'referralApproved',
      status: 'REFERRAL_APPROVED',
      isPartner: true,
      isPending: false,
      isNormalMember: false,
      code,
      inviteLink: `https://anytap.app/sign-up?ref=${code}`,
      totalEarnings: 0,
      availableBalance: 0,
      pendingBalance: 0,
      minWithdrawalUsdt: 10,
      statistics: {
        totalInvites: memberRows.length,
        activeMembers: memberRows.filter((m) => m.status === 'active').length,
        conversionRate: memberRows.length > 0 ? `${Math.round((memberRows.filter((m) => m.status === 'active').length / memberRows.length) * 100)}%` : '0%',
        monthlyEarnings: 0,
      },
      memberRows,
      depositLedger,
      monthlyEarnings: [],
      rewardHistory: [],
    };
  } catch (err) {
    console.warn('[accountApi] fetchReferralContextByCode error', err);
    return null;
  }
}

async function compressImageIfNeeded(file, maxBytes = 900 * 1024) {
  if (!file) return file;
  if (file.size <= maxBytes) return file;
  if (!file.type.startsWith('image/')) return file;

  try {
    let compressed = await compressOnce(file, 2048, 0.75);
    if (compressed.size > maxBytes) {
      compressed = await compressOnce(file, 1200, 0.6);
    }
    if (compressed.size > maxBytes) {
      compressed = await compressOnce(file, 800, 0.5);
    }
    return compressed;
  } catch (err) {
    console.error('[accountApi] Image compression failed, returning original file', err);
    return file;
  }
}

function compressOnce(file, maxDim, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Canvas toBlob returned null'));
            return;
          }
          const compressed = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(compressed);
        }, 'image/jpeg', quality);
      };
      img.onerror = () => reject(new Error('Failed to load image element'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

async function uploadKycDocument(file, docType) {
  if (!file) return '';
  const processedFile = await compressImageIfNeeded(file);
  const data = await apiUpload('/files/upload', processedFile, { query: { docType } });
  return data?.fileId || data?.id || data?.file_id || '';
}

async function resolveKycFileIds(form = {}) {
  const idType = mapWasabiIdType(form.idDocType);
  const idFrontId = form.idFrontId
    || await uploadKycDocument(form.idFrontFile, idType);
  if (!idFrontId) {
    const err = new Error('ID document front image is required');
    err.code = 'MISSING_ID_FRONT';
    throw err;
  }
  const idBackId = form.idBackId
    || (form.idBackFile ? await uploadKycDocument(form.idBackFile, idType) : '');
  const selfieId = form.selfieId
    || (form.selfieFile ? await uploadKycDocument(form.selfieFile, 'SELFIE') : '');
  return { idType, idFrontId, idBackId, selfieId };
}

function shouldFetchWasabiCardInfo(session) {
  const status = mapCardStatus(session?.cardStatus);
  // Wasabi /info 500s with "Card does not exist" before the card is live.
  if (['issued', 'active', 'frozen'].includes(status)) return true;
  return Boolean(session?.cardId);
}

function isMissingWasabiCardError(err) {
  const msg = String(err?.message || err?.data?.message || '');
  return /card does not exist/i.test(msg);
}

async function refreshSessionFromUser(userId) {
  try {
    const user = await apiGet(`/users/${encodeURIComponent(userId)}`);
    if (!user || typeof user !== 'object') return null;
    const current = getHttpSession() || {};
    const backendCardStatus = mapCardStatus(user.cardStatus);
    const mergedCardStatus = preferCardStatus(current.cardStatus, user.cardStatus);
    // Only invent application_review when BE is still not_issued and we applied locally.
    const cardStatus = (backendCardStatus === 'not_issued'
      && (current.cardApplicationPending || current.pendingVariant || current.cardId)
      && cardStatusRank(mergedCardStatus) <= 1)
      ? 'application_review'
      : mergedCardStatus;

    const stillIssuing = ['application_review', 'applied', 'deposit_received', 'creating'].includes(cardStatus);

    // Silent: must not fire anytap-member-session (that re-runs fetchAccountContext).
    return patchHttpSession({
      kycStatus: user.kycStatus || user.status || undefined,
      status: user.status || user.kycStatus || undefined,
      cardStatus,
      cardType: user.cardType || undefined,
      walletExists: user.walletExists === true || !!user.cregisWalletAddress,
      cregisWalletAddress: user.cregisWalletAddress || undefined,
      needsActivation: (cardStatus === 'active' || cardStatus === 'frozen') ? false : (user.needsActivation === true),
      trackingNumber: user.trackingNumber || undefined,
      carrier: user.carrier || undefined,
      wasabiHolderId: user.wasabiHolderId || current.wasabiHolderId || undefined,
      cardId: user.cardIds?.[0] || current.cardId || undefined,
      issuanceDepositAddress: user.issuanceDepositAddress || current.issuanceDepositAddress || undefined,
      cardApplicationPending: stillIssuing
        ? true
        : (current.cardApplicationPending === true && backendCardStatus === 'not_issued'),
      pendingVariant: stillIssuing ? (current.pendingVariant || 'virtual') : current.pendingVariant,
      ...(user.email ? { email: user.email } : {}),
      ...(user.name ? { name: user.name } : {}),
      ...(user.fullName ? { name: user.fullName } : {}),
      ...(user.country ? { country: user.country, nationality: user.country } : {}),
      ...(user.nationality ? { country: user.nationality, nationality: user.nationality } : {}),
      ...(user.phoneCountryCode ? { phoneCountryCode: user.phoneCountryCode } : {}),
      ...(user.phoneNumber ? { phoneNumber: user.phoneNumber } : {}),
    }, { notify: false });
  } catch (err) {
    console.warn('[accountApi] refresh user', err);
    return null;
  }
}

/**
 * Wasabi ID verification for a signed-up member.
 * Spec: POST /files/upload → POST /cards/{userId}/register
 * (POST /auth/register-cardholder is temp-user only, before sign-up.)
 * Rejected members use POST /users/{userId}/kyc/resubmit.
 */
export async function submitKycApplication(form = {}) {
  const session = getHttpSession();
  if (!session?.userId || !session?.email) throw new Error('Not authenticated');

  const profilePatch = profilePatchFromKycForm(form);
  patchHttpSession(profilePatch);

  const { idType, idFrontId, idBackId, selfieId } = await resolveKycFileIds(form);
  const filePayload = {
    idFrontId,
    ...(idBackId ? { idBackId } : {}),
    ...(selfieId ? { selfieId } : {}),
  };

  const kycPayload = {
    email: session.email,
    firstName: (form.firstName || '').trim(),
    lastName: (form.lastName || '').trim(),
    mobile: form.phoneNumber || '',
    areaCode: form.phoneCountryCode || '+82',
    birthday: (() => {
      const raw = String(form.dateOfBirth || '').replace(/[^\d]/g, '');
      if (raw.length === 8) {
        return `${raw.substring(0, 4)}-${raw.substring(4, 6)}-${raw.substring(6, 8)}`;
      }
      return form.dateOfBirth || '';
    })(),
    issueDate: (() => {
      const raw = String(form.issueDate || '').replace(/[^\d]/g, '');
      if (raw.length === 8) {
        return `${raw.substring(0, 4)}-${raw.substring(4, 6)}-${raw.substring(6, 8)}`;
      }
      return form.issueDate || '';
    })(),
    idNoExpiryDate: (() => {
      const raw = String(form.idNoExpiryDate || '').replace(/[^\d]/g, '');
      if (raw.length === 8) {
        return `${raw.substring(0, 4)}-${raw.substring(4, 6)}-${raw.substring(6, 8)}`;
      }
      return form.idNoExpiryDate || '2030-12-31';
    })(),
    nationality: form.nationality || 'KR',
    idNumber: form.idDocNumber || '',
    idType: mapWasabiIdType(form.idDocType || 'PASSPORT'),
    gender: form.gender || 'M',
    country: form.country || '',
    state: form.state || '',
    city: form.city || '',
    addressLine1: form.addressLine1 || '',
    postalCode: form.postalCode || '',
    annualSalary: form.annualSalary || '50000 USD',
    accountPurpose: form.accountPurpose || 'Living Expense',
    expectedMonthlyVolume: form.expectedMonthlyVolume || '5000 USD',
    ...filePayload,
  };

  const kycStatus = mapKycStatus(session.kycStatus);
  if (kycStatus === 'rejected') {
    try {
      await apiPost(`/users/${encodeURIComponent(session.userId)}/kyc/resubmit`, kycPayload);
    } catch {
      await apiPost(`/cards/${encodeURIComponent(session.userId)}/register`, kycPayload);
    }
    patchHttpSession({
      kycStatus: 'UNDER_REVIEW',
      phoneCountryCode: form.phoneCountryCode,
      phoneNumber: form.phoneNumber,
      ...profilePatch,
    });
    await refreshSessionFromUser(session.userId);
    return { ok: true, resubmitted: true };
  }

  // Prefer member card/holder registration. Temp-user cardholder API only works pre-signup.
  const data = await apiPost(
    `/cards/${encodeURIComponent(session.userId)}/register`,
    kycPayload,
  );

  patchHttpSession({
    kycStatus: 'UNDER_REVIEW',
    wasabiHolderId: data?.holderId || undefined,
    cardId: data?.cardId || undefined,
    idType,
    phoneCountryCode: form.phoneCountryCode,
    phoneNumber: form.phoneNumber,
    ...profilePatch,
  });
  await refreshSessionFromUser(session.userId);
  return { ok: true, data };
}

function parseFullName(fullName) {
  const name = String(fullName || '').trim();
  if (!name) return { firstName: 'Gildong', lastName: 'Hong' };
  const parts = name.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: 'Hong' };
  }
  const lastName = parts[parts.length - 1];
  const firstName = parts.slice(0, parts.length - 1).join(' ');
  return { firstName, lastName };
}

/** Register / issue Wasabi card after KYC when needed. */
export async function submitCardApplication({ cardType, shipping, kycForm } = {}) {
  const session = getHttpSession();
  if (!session?.userId || !session?.email) throw new Error('Not authenticated');

  let kycStatus = mapKycStatus(session.kycStatus);
  if (kycStatus !== 'approved' && kycForm) {
    await submitKycApplication(kycForm);
    kycStatus = mapKycStatus(getHttpSession()?.kycStatus);
  }

  let cardInfo = null;
  try {
    cardInfo = await apiGet(`/cards/${encodeURIComponent(session.userId)}/info`);
  } catch (err) {
    if (err?.status !== 400 && err?.status !== 404) throw err;
  }

  if (!cardInfo && mapCardStatus(session.cardStatus) === 'not_issued') {
    const nameData = parseFullName(shipping?.recipientName || session?.name || session?.fullName || '');
    const payload = { 
      email: session.email,
      cardType: cardType || 'virtual',
      firstName: nameData.firstName,
      lastName: nameData.lastName,
      mobile: shipping?.phoneNumber || '',
      areaCode: shipping?.phoneCountryCode || '+82',
      birthday: kycForm?.dateOfBirth || '',
      issueDate: kycForm?.issueDate || '',
      nationality: kycForm?.nationality || session?.nationality || 'KR',
      idNumber: kycForm?.idDocNumber || '',
      idType: kycForm?.idDocType || 'PASSPORT',
      // Shipping Address Info
      shippingRecipientName: shipping?.recipientName || '',
      shippingCountry: shipping?.country || '',
      shippingState: shipping?.state || '',
      shippingCity: shipping?.city || '',
      shippingAddressLine1: shipping?.addressLine1 || '',
      shippingAddressLine2: shipping?.addressLine2 || '',
      shippingPostalCode: shipping?.postalCode || '',
      shippingPhoneCountryCode: shipping?.phoneCountryCode || '',
      shippingPhoneNumber: shipping?.phoneNumber || '',
    };
    if (kycForm?.idFrontFile || kycForm?.idFrontId) {
      const files = await resolveKycFileIds(kycForm);
      Object.assign(payload, {
        idFrontId: files.idFrontId,
        ...(files.idBackId ? { idBackId: files.idBackId } : {}),
        ...(files.selfieId ? { selfieId: files.selfieId } : {}),
        birthday: kycForm.dateOfBirth,
        issueDate: kycForm.issueDate,
        nationality: kycForm.nationality,
        idNumber: kycForm.idDocNumber,
        idType: mapWasabiIdType(kycForm.idDocType),
      });
    }

    let data = null;
    try {
      data = await apiPost(
        `/cards/${encodeURIComponent(session.userId)}/register`,
        payload,
      );
    } catch (err) {
      console.error('[accountApi] card register failed', err);
      throw err;
    }

    patchHttpSession({
      cardStatus: 'application_review',
      cardApplicationPending: true,
      pendingVariant: cardType || 'virtual',
      wasabiHolderId: data?.holderId || undefined,
      cardId: data?.cardId || undefined,
      shipping: cardType === 'physical' ? shipping : null,
    });
    await refreshSessionFromUser(session.userId);
    // BE often still returns not_issued — keep issuance deposit UI locked on.
    patchHttpSession({
      cardStatus: 'application_review',
      cardApplicationPending: true,
      pendingVariant: cardType || getHttpSession()?.pendingVariant || 'virtual',
    });

    return {
      ok: true,
      reference: data?.cardId || `APP-${session.userId}`,
      cardType: cardType || 'virtual',
    };
  }

  // Already registered on BE but still not_issued / no live card info — treat as applied.
  if (!cardInfo && mapCardStatus(getHttpSession()?.cardStatus) === 'not_issued') {
    patchHttpSession({
      cardStatus: 'application_review',
      cardApplicationPending: true,
      pendingVariant: cardType || 'virtual',
    });
  }

  return {
    ok: true,
    reference: cardInfo?.cardId || cardInfo?.id || getHttpSession()?.cardId || `CARD-${session.userId}`,
    cardType: cardType || 'virtual',
  };
}

/** Deposit/Top-up funds to Wasabi Card */
export async function chargeCard(amount, cardId = null) {
  const session = getHttpSession();
  if (!session?.userId) throw new Error('Not authenticated');

  const payload = {
    amount: Number(amount),
    ...(cardId ? { cardId } : {}),
  };

  const res = await apiPost(`/cards/${encodeURIComponent(session.userId)}/deposit`, payload);
  await refreshSessionFromUser(session.userId);
  return { ok: true, data: res };
}

/** Freeze Wasabi Card */
export async function freezeCard(cardId = null) {
  const session = getHttpSession();
  if (!session?.userId) throw new Error('Not authenticated');

  const query = cardId ? `?cardId=${encodeURIComponent(cardId)}` : '';
  const res = await apiPost(`/cards/${encodeURIComponent(session.userId)}/freeze${query}`);
  patchHttpSession({ cardStatus: 'frozen' });
  return { ok: true, data: res };
}

/** Unfreeze Wasabi Card */
export async function unfreezeCard(cardId = null) {
  const session = getHttpSession();
  if (!session?.userId) throw new Error('Not authenticated');

  const query = cardId ? `?cardId=${encodeURIComponent(cardId)}` : '';
  const res = await apiPost(`/cards/${encodeURIComponent(session.userId)}/unfreeze${query}`);
  patchHttpSession({ cardStatus: 'active' });
  return { ok: true, data: res };
}

/** Withdraw USDT from Cregis wallet to external address */
export async function withdrawToExternal(amount, address, password) {
  const session = getHttpSession();
  if (!session?.userId) throw new Error('Not authenticated');

  const payload = {
    userId: session.userId,
    toAddress: address,
    amount: Number(amount),
    password: password,
  };

  const res = await apiPost('/cregis/user/withdraw', payload);
  await refreshSessionFromUser(session.userId);
  return { ok: true, data: res };
}

/** Send card unlock OTP code via email */
export async function sendCardSecureCode() {
  const session = getHttpSession();
  if (!session?.userId) throw new Error('Not authenticated');

  const res = await apiPost(`/cards/${encodeURIComponent(session.userId)}/send-secure-code`);
  return { ok: true, data: res };
}

/** Reveal card full details from Wasabi using secure OTP code */
export async function revealCardDetails(code) {
  const session = getHttpSession();
  if (!session?.userId) throw new Error('Not authenticated');

  const res = await apiPost(`/cards/${encodeURIComponent(session.userId)}/reveal-details`, { code });
  return { ok: true, data: res?.data || res };
}

export function getAccountScenarios() {
  return {};
}

export async function bindExistingCard(form) {
  const session = getHttpSession();
  if (!session?.userId) throw new Error('Not authenticated');

  const res = await apiPost(`/cards/${encodeURIComponent(session.userId)}/bind-existing`, {
    cardNumber: form.cardNumber,
    expiry: form.expiry,
  });
  
  patchHttpSession({ 
    cardId: res?.data?.cardId || form.cardNumber.replace(/\s/g, ''),
    cardStatus: 'active',
  });
  await refreshSessionFromUser(session.userId);
  return { ok: true, data: res };
}

export async function activatePhysicalCard(cardNo, pin, activeCode) {
  const session = getHttpSession();
  if (!session?.userId) throw new Error('Not authenticated');

  const res = await apiPost(`/cards/${encodeURIComponent(session.userId)}/activate-physical`, {
    cardNo,
    pin,
    activeCode,
  });

  patchHttpSession({
    cardStatus: 'active',
  });
  await refreshSessionFromUser(session.userId);
  return { ok: true, data: res };
}

export async function updatePhysicalCardPin(cardNo, pin) {
  const session = getHttpSession();
  if (!session?.userId) throw new Error('Not authenticated');

  const res = await apiPost(`/cards/${encodeURIComponent(session.userId)}/update-pin`, {
    cardNo,
    pin,
  });

  return { ok: true, data: res };
}
