/**
 * AnyTap Spring Boot auth — /api/v1/auth/*
 */

import { apiPost } from '../../api/httpClient.js';
import { MERCHANT_ID } from '../../api/config.js';
import {
  clearHttpSession,
  getHttpSession,
  hasHttpSession,
  setHttpSession,
} from '../../api/httpSession.js';
import { emailOk } from '../../auth.js';
import { bindMemberProfileToUser, clearMemberProfile } from '../../member-profile.js';
import {
  ensureAvailableLoginId,
  getLoginIdForEmail,
  saveEmailLoginId,
} from './loginId.js';

export { emailOk, ensureAvailableLoginId, saveEmailLoginId };

export const MOCK_LOGIN = { email: '', password: '' };
export const MOCK_ADMIN_LOGIN = { email: '', password: '' };
export const MOCK_EMAIL_VERIFY_CODE = '';
export const SIGNUP_CODE_TTL_MS = 10 * 60 * 1000;

const SIGNUP_PENDING_KEY = 'anytap_signup_pending';

export function loginIdOk(loginId) {
  return /^[a-zA-Z0-9._@-]{8,255}$/.test(String(loginId || '').trim());
}

function mapLoginError(err) {
  const msg = (err?.message || '').toLowerCase();
  if (err?.status === 401 || msg.includes('invalid') || msg.includes('password')) {
    return { ok: false, code: 'INVALID_CREDENTIALS' };
  }
  if (msg.includes('email') && msg.includes('duplicate')) {
    return { ok: false, code: 'EMAIL_EXISTS' };
  }
  if (msg.includes('login') && msg.includes('duplicate')) {
    return { ok: false, code: 'EMAIL_EXISTS' };
  }
  return { ok: false, code: 'SERVER_ERROR' };
}

function normalizeAuthProfile(data, loginId) {
  if (!data || typeof data !== 'object') return null;
  const walletAddr = data.cregisWalletAddress || data.cregis_wallet_address || '';
  const walletExists = data.walletExists === true
    || data.wallet_exists === true
    || !!walletAddr;
  return {
    userId: data.userId || data.user_id || '',
    email: data.email || '',
    loginId: loginId || data.loginId || data.login_id || '',
    merchantId: data.merchantId || data.merchant_id || MERCHANT_ID,
    cregisWalletAddress: walletAddr,
    kycStatus: data.kycStatus || data.kyc_status || 'PENDING',
    cardStatus: data.cardStatus || data.card_status || 'not_issued',
    walletExists,
    needsActivation: data.needsActivation === true || data.needs_activation === true,
    status: data.status || '',
    trackingNumber: data.trackingNumber || data.tracking_number || '',
    carrier: data.carrier || '',
  };
}

function establishSessionFromLoginData(data, { loginId = '', emailHint = '' } = {}) {
  const previous = getHttpSession();
  const resolvedLoginId = String(loginId || data?.loginId || data?.login_id || '').trim();
  const profile = normalizeAuthProfile(data, resolvedLoginId);
  if (!profile?.userId) {
    const err = new Error('Invalid ID or password');
    err.status = 400;
    throw err;
  }
  const sameUser = previous?.userId && previous.userId === profile.userId;
  bindMemberProfileToUser(profile.userId);

  const hint = String(emailHint || '').trim().toLowerCase();
  const email = profile.email
    || (hint && emailOk(hint) ? hint : '')
    || (sameUser ? (previous.email || '') : '')
    || '';
  if (email && resolvedLoginId) saveEmailLoginId(email, resolvedLoginId);

  const prevStatus = String(previous?.cardStatus || '').toLowerCase();
  const profileStatus = String(profile.cardStatus || '').toLowerCase().replace(/\s+/g, '_');
  const keepIssuance = sameUser && (
    previous.cardApplicationPending === true
    || previous.pendingVariant
    || ['application_review', 'applied', 'deposit_received', 'creating'].includes(prevStatus)
  );
  const rank = (s) => ({
    not_issued: 0,
    application_review: 1,
    deposit_received: 2,
    creating: 3,
    shipping: 4,
    issued: 5,
    active: 6,
    frozen: 6,
  }[s] ?? 0);
  let cardStatus = profile.cardStatus;
  if (keepIssuance) {
    if (!profileStatus || profileStatus === 'not_issued') {
      cardStatus = prevStatus === 'deposit_received' || prevStatus === 'creating'
        ? previous.cardStatus
        : 'application_review';
    } else if (rank(profileStatus) >= rank(prevStatus || 'not_issued')) {
      cardStatus = profile.cardStatus;
    } else {
      cardStatus = previous.cardStatus;
    }
  }
  const sessionUser = { ...profile, email, loginId: resolvedLoginId || profile.loginId };
  setHttpSession({
    ...sessionUser,
    ...(keepIssuance ? {
      cardApplicationPending: ['application_review', 'applied', 'deposit_received', 'creating']
        .includes(String(cardStatus || '').toLowerCase()),
      pendingVariant: previous.pendingVariant || 'virtual',
      cardId: previous.cardId || profile.cardId,
      cardStatus,
      issuanceDepositAddress: previous.issuanceDepositAddress || profile.issuanceDepositAddress,
    } : {}),
  });
  return { ok: true, user: sessionUser };
}

async function loginWithLoginId(loginId, password, { emailHint } = {}) {
  const data = await apiPost('/auth/login', { loginId, password });
  return establishSessionFromLoginData(data, { loginId, emailHint });
}

/**
 * Customer login is strictly email + password.
 */
export async function attemptLogin(emailInput, password, { emailHint } = {}) {
  const raw = String(emailInput || '').trim();
  if (!raw || !password) return { ok: false, code: 'MISSING' };

  if (!emailOk(raw)) return { ok: false, code: 'INVALID_EMAIL' };

  const email = raw.toLowerCase();

  try {
    const data = await apiPost('/auth/login', { email, password });
    return establishSessionFromLoginData(data, {
      loginId: data?.loginId || data?.login_id || '',
      emailHint: email,
    });
  } catch (err) {
    return mapLoginError(err);
  }
}

export async function attemptSignUp(email, password, { loginId, referral = '' } = {}) {
  const normalizedEmail = email.trim().toLowerCase();
  const id = String(loginId || '').trim();
  if (!normalizedEmail || !password || !id) return { ok: false, code: 'MISSING' };
  if (!emailOk(normalizedEmail)) return { ok: false, code: 'INVALID_EMAIL' };
  if (!loginIdOk(id)) return { ok: false, code: 'WEAK_PASSWORD' };

  try {
    await apiPost('/auth/sign-up', {
      email: normalizedEmail,
      password,
      loginId: id,
      merchantId: MERCHANT_ID,
    });
  } catch (err) {
    const mapped = mapLoginError(err);
    // Double-submit / already signed up after verify — fall through to login.
    if (mapped.code !== 'EMAIL_EXISTS') return mapped;
  }

  saveEmailLoginId(normalizedEmail, id);
  const login = await attemptLogin(id, password, { emailHint: normalizedEmail });
  if (!login.ok) return { ok: true, needsLogin: true };
  return { ok: true, needsEmailConfirm: false, user: login.user };
}

export async function sendVerificationEmail({ email, password, loginId, merchantId = MERCHANT_ID }) {
  const normalizedEmail = email.trim().toLowerCase();
  const id = String(loginId || '').trim();
  if (!normalizedEmail || !password || !id) return { ok: false, code: 'MISSING' };
  if (!emailOk(normalizedEmail)) return { ok: false, code: 'INVALID_EMAIL' };
  if (!loginIdOk(id)) return { ok: false, code: 'WEAK_PASSWORD' };

  try {
    await apiPost('/auth/send-verification-email', {
      email: normalizedEmail,
      password,
      loginId: id,
      merchantId,
    });
    return { ok: true };
  } catch (err) {
    return mapLoginError(err);
  }
}

export async function verifyEmailCode(email, code) {
  try {
    const result = await apiPost('/auth/verify-code', {
      email: email.trim().toLowerCase(),
      code: String(code).trim(),
    });
    if (result === true || result === 'true') return { ok: true };
    if (result?.success === true || result?.data === true || result?.verified === true) {
      return { ok: true };
    }
    // Some backends return an object payload on success with no boolean flag.
    if (result && typeof result === 'object' && result.result !== false) {
      return { ok: true };
    }
    return { ok: false, code: 'INVALID_CODE' };
  } catch {
    return { ok: false, code: 'INVALID_CODE' };
  }
}

export function attemptAdminLogin() {
  return Promise.resolve({ ok: false, code: 'INVALID_CREDENTIALS' });
}

export function isAdminEmail(email) {
  return String(email || '').trim().toLowerCase() === 'test206@206.c0m';
}

export function refreshAdminPortalLink() {
  return Promise.resolve(showAdminPortalLink());
}

export function establishLoginSession() {
  /* Session saved in attemptLogin */
}

export function showAdminPortalLink() {
  const session = getHttpSession();
  return !!(session && String(session.email).trim().toLowerCase() === 'test206@206.c0m');
}

export function setAdminSession() {}
export function clearAdminSession() {
  clearHttpSession();
  clearMemberProfile();
}

export function hasAdminSession() {
  return false;
}

export function getAdminSessionEmail() {
  return '';
}

export function setMockSession() {}
export function clearMockSession() {
  clearHttpSession();
  clearMemberProfile();
}

export function hasMockSession() {
  return hasHttpSession();
}

export function getMockSessionEmail() {
  return getHttpSession()?.email || '';
}

export function scenarioForMockSession() {
  return 'signupOnly';
}

export function verifyLogin(loginId, password) {
  return attemptLogin(loginId, password).then((r) => r.ok);
}

export async function sendMockEmailVerification(email) {
  const pending = loadSignupPending();
  if (!pending || pending.email !== email.trim().toLowerCase()) {
    return { ok: false, code: 'MISSING' };
  }
  return sendVerificationEmail(pending);
}

export function verifyMockEmailCode() {
  return false;
}

export function saveSignupPending({ email, password, loginId, referral = '' }) {
  const payload = {
    email: email.trim().toLowerCase(),
    password,
    loginId: String(loginId || '').trim(),
    referral: referral.trim(),
    merchantId: MERCHANT_ID,
    expiresAt: Date.now() + SIGNUP_CODE_TTL_MS,
  };
  try { sessionStorage.setItem(SIGNUP_PENDING_KEY, JSON.stringify(payload)); } catch { /* noop */ }
  return payload;
}

export function loadSignupPending() {
  try {
    const raw = sessionStorage.getItem(SIGNUP_PENDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function refreshSignupExpiry() {
  const pending = loadSignupPending();
  if (!pending) return null;
  pending.expiresAt = Date.now() + SIGNUP_CODE_TTL_MS;
  try { sessionStorage.setItem(SIGNUP_PENDING_KEY, JSON.stringify(pending)); } catch { /* noop */ }
  return pending;
}

export function clearSignupPending() {
  try { sessionStorage.removeItem(SIGNUP_PENDING_KEY); } catch { /* noop */ }
}

export function formatExpiresRemaining(expiresAt) {
  const sec = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatSignupCodeTtl() {
  const m = Math.floor(SIGNUP_CODE_TTL_MS / 60000);
  return `${m}:00`;
}
