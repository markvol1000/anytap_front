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
    
    // For physical cards, 'issued' status must remain 'issued' so the user is prompted to activate it.
    const isIssued = cardStatus === 'issued' || cardStatusFromWasabi === 'issued';
    if (isPhysical && isIssued) {
      return 'issued';
    }

    if (cardInfo && (cardNo || cardInfo.cardTypeId || cardInfo.status)) {
      return 'active';
    }
    if (cardStatus === 'active' || cardStatus === 'issued') {
      return 'active';
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
  const demoLocked = session.demoLockState === true;
  const kycStatus = mapKycStatus(session.kycStatus || session.status);
  const kycApproved = kycStatus === 'approved';
  const email = session.email || getEmailForLoginId(session.loginId) || '';
  // Show KYC fields once submitted (approved or under review); hide while still pending.
  const showProfileFields = kycApproved || kycStatus === 'under_review';
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

      return {
        id: cardInfo?.id || `card-${session.userId}-${idx}`,
        variant: cardVariant,
        last4,
        cardNo,
        balance: cardBalanceLabel,
        status: cardFrozen || cardStatus === 'frozen' ? 'frozen' : (cardStatus === 'issued' ? 'issued' : 'active'),
        isPrimary: idx === 0,
        holderName: name,
      };
    });
  }

  const primaryCardInfo = list[0] || null;
  const cardStatus = primaryCardInfo 
    ? resolveCardStatusForUi(session, { ...primaryCardInfo, status: primaryCardInfo.linkStatus || session.cardStatus })
    : mapCardStatus(session.cardStatus);

  const needsActivation = cardStatus !== 'active' && cardStatus !== 'frozen' && (session.needsActivation === true || cardStatus === 'issued');
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
      address: session.cregisWalletAddress || '',
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

export async function fetchCardTransactions(userId, { pageNum = 1, pageSize = 50, last4 = '' } = {}) {
  if (!userId) return { total: 0, items: [] };
  try {
    const query = `pageNum=${encodeURIComponent(pageNum)}&pageSize=${encodeURIComponent(pageSize)}`;
    const payload = await apiGet(`/cards/${encodeURIComponent(userId)}/transactions?${query}`);
    const items = mapWasabiTransactionsResponse(payload, { last4 });
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
      let kind = 'wallet_topup';
      let title = 'Wallet Deposit';
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
      } else if (type === 'WITHDRAW') {
        kind = 'wallet_withdraw';
        title = 'Transfer Sent';
        incoming = false;
      }
      const status = String(tx.status || 'SUCCESS').toLowerCase();
      return {
        id: tx.txId || `local-${Date.now()}-${Math.random()}`,
        title: title,
        at: tx.createdAt,
        amount: Number(tx.amount || 0),
        incoming: incoming,
        failed: status === 'failed',
        kind: kind,
        status: status === 'success' ? 'completed' : status,
        txId: tx.txId,
        reference: tx.txId ? tx.txId.slice(0, 10).toUpperCase() : '',
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
    const cardNo = String(primaryCard?.cardNo || primaryCard?.balanceInfo?.cardNo || '');
    const last4 = cardNo.replace(/\D/g, '').slice(-4) || cardNo.slice(-4) || '';
    if (!demoLocked) {
      const [txRes, localTxs] = await Promise.all([
        fetchCardTransactions(session.userId, { last4 }),
        fetchLocalTransactions(session.userId),
      ]);
      const cardTxs = txRes?.items || [];
      activityItems = [...localTxs, ...cardTxs];
    }
  } catch (err) {
    console.warn('[accountApi] fetch transactions fallback', err);
  }

  return buildContextFromSession(session, cardInfoList, activityItems, cregisBalance);
}

export async function fetchReferralContext() {
  return null;
}

async function compressImageIfNeeded(file, maxBytes = 2 * 1024 * 1024) {
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

  const kycStatus = mapKycStatus(session.kycStatus);
  if (kycStatus === 'rejected') {
    await apiPost(`/users/${encodeURIComponent(session.userId)}/kyc/resubmit`, filePayload);
    patchHttpSession({ kycStatus: 'UNDER_REVIEW' });
    await refreshSessionFromUser(session.userId);
    return { ok: true, resubmitted: true };
  }

  // Prefer member card/holder registration. Temp-user cardholder API only works pre-signup.
  const data = await apiPost(
    `/cards/${encodeURIComponent(session.userId)}/register`,
    { 
      email: session.email, 
      firstName: (form.firstName || '').trim(),
      lastName: (form.lastName || '').trim(),
      mobile: form.phoneNumber || '',
      areaCode: form.phoneCountryCode || '+82',
      birthday: form.dateOfBirth || '',
      nationality: form.nationality || 'KR',
      idNumber: form.idDocNumber || '',
      idType: form.idDocType || 'PASSPORT',
      gender: form.gender || 'M',
      country: form.country || '',
      state: form.state || '',
      city: form.city || '',
      addressLine1: form.addressLine1 || '',
      postalCode: form.postalCode || '',
      annualSalary: form.annualSalary || '50000 USD',
      accountPurpose: form.accountPurpose || 'Living Expense',
      expectedMonthlyVolume: form.expectedMonthlyVolume || '5000 USD',
      ...filePayload 
    },
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
      nationality: kycForm?.nationality || session?.nationality || 'KR',
      idNumber: kycForm?.idDocNumber || '',
      idType: kycForm?.idDocType || 'PASSPORT',
    };
    if (kycForm?.idFrontFile || kycForm?.idFrontId) {
      const files = await resolveKycFileIds(kycForm);
      Object.assign(payload, {
        idFrontId: files.idFrontId,
        ...(files.idBackId ? { idBackId: files.idBackId } : {}),
        ...(files.selfieId ? { selfieId: files.selfieId } : {}),
        birthday: kycForm.dateOfBirth,
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
      // Holder may already exist from KYC — keep local application_review for UI.
      console.warn('[accountApi] card register', err);
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
