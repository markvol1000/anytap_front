/**
 * Auth & signup session management.
 * All MOCK_* exports are placeholders — replace with real API calls before launch.
 */

export function emailOk(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Dev / demo login — replace with API auth later */
export const MOCK_LOGIN = {
  email: 'test@test.co.kr',
  password: 'test1234',
};

/** Mock seed emails (same password) → dashboard scenario */
export const MOCK_SEED_SCENARIOS = {
  'test@test.co.kr': 'signupOnly',
  'new@anytap.com': 'signupOnly',
  'kyc-required@anytap.io': 'signupOnly',
  'review@anytap.com': 'kycPending',
  'kyc-pending@anytap.io': 'kycPending',
  'jane.doe@example.com': 'kycApproved',
  'card-ready@anytap.io': 'kycApproved',
  'card-deposit@anytap.io': 'cardApplied',
  'card-shipping@anytap.io': 'cardShipping',
  'activate-card@anytap.io': 'cardRegistered',
  'active-card@anytap.io': 'cardActiveWithTransactions',
  'zero-balance@anytap.io': 'cardActiveWithTransactions',
};

function isMockSeedLogin(email, password) {
  const normalized = String(email || '').trim().toLowerCase();
  if (password !== MOCK_LOGIN.password) return false;
  if (normalized === MOCK_LOGIN.email) return true;
  return Object.prototype.hasOwnProperty.call(MOCK_SEED_SCENARIOS, normalized);
}

/** Dev / demo admin login — replace with API role check later */
export const MOCK_ADMIN_LOGIN = {
  email: 'test@test.co.kr',
  password: 'test1234',
};

const MOCK_SESSION_KEY = 'anytap_mock_session';
const MOCK_ADMIN_SESSION_KEY = 'anytap_admin_session';

function notifyAdminSessionChange() {
  try {
    window.dispatchEvent(new Event('anytap-admin-session'));
  } catch { /* noop */ }
}

function notifyMemberSessionChange() {
  try {
    window.dispatchEvent(new Event('anytap-member-session'));
  } catch { /* noop */ }
}

export function attemptAdminLogin(email, password) {
  const normalized = email.trim().toLowerCase();
  if (!normalized && !password) return { ok: false, code: 'MISSING' };
  if (!normalized || !password) return { ok: false, code: 'MISSING' };
  if (!emailOk(email)) return { ok: false, code: 'INVALID_EMAIL' };
  if (normalized !== MOCK_ADMIN_LOGIN.email || password !== MOCK_ADMIN_LOGIN.password) {
    return { ok: false, code: 'INVALID_CREDENTIALS' };
  }
  return { ok: true };
}

export function isAdminEmail(email) {
  return String(email || '').trim().toLowerCase() === 'test206@206.c0m';
}

export function setAdminSession(email = MOCK_ADMIN_LOGIN.email) {
  try {
    const normalized = email.trim().toLowerCase();
    sessionStorage.setItem(MOCK_ADMIN_SESSION_KEY, normalized);
    if (isAdminEmail(normalized)) {
      sessionStorage.setItem(MOCK_SESSION_KEY, normalized);
      notifyMemberSessionChange();
    }
    notifyAdminSessionChange();
  } catch { /* noop */ }
}

export function clearAdminSession() {
  try {
    sessionStorage.removeItem(MOCK_ADMIN_SESSION_KEY);
    notifyAdminSessionChange();
  } catch { /* noop */ }
}

export function hasAdminSession() {
  try { return !!sessionStorage.getItem(MOCK_ADMIN_SESSION_KEY); } catch { return false; }
}

export function getAdminSessionEmail() {
  try { return sessionStorage.getItem(MOCK_ADMIN_SESSION_KEY) || ''; } catch { return ''; }
}

export function showAdminPortalLink() {
  if (!hasMockSession()) return false;
  return isAdminEmail(getMockSessionEmail());
}

export function establishLoginSession(email) {
  const normalized = email.trim().toLowerCase();
  setMockSession(normalized);
  if (isAdminEmail(normalized)) {
    setAdminSession(normalized);
  }
}

export function refreshAdminPortalLink() {
  return Promise.resolve(showAdminPortalLink());
}

export function attemptSignUp() {
  return { ok: false, code: 'MISSING' };
}

export function attemptLogin(email, password) {
  const normalized = email.trim().toLowerCase();
  if (!normalized && !password) return { ok: false, code: 'MISSING' };
  if (!normalized || !password) return { ok: false, code: 'MISSING' };
  if (!emailOk(email)) return { ok: false, code: 'INVALID_EMAIL' };
  if (isAdminEmail(normalized)) {
    return attemptAdminLogin(email, password);
  }
  if (!isMockSeedLogin(normalized, password)) {
    return { ok: false, code: 'INVALID_CREDENTIALS' };
  }
  return { ok: true };
}

/** @deprecated Use attemptLogin for structured errors */
export function verifyLogin(email, password) {
  return attemptLogin(email, password).ok;
}

export function setMockSession(email) {
  try {
    const normalized = email.trim().toLowerCase();
    sessionStorage.setItem(MOCK_SESSION_KEY, normalized);
    if (isAdminEmail(normalized)) {
      sessionStorage.setItem(MOCK_ADMIN_SESSION_KEY, normalized);
      notifyAdminSessionChange();
    }
    notifyMemberSessionChange();
  } catch { /* noop */ }
}

export function clearMockSession() {
  try {
    sessionStorage.removeItem(MOCK_SESSION_KEY);
    notifyMemberSessionChange();
  } catch { /* noop */ }
}

export function hasMockSession() {
  try { return !!sessionStorage.getItem(MOCK_SESSION_KEY); } catch { return false; }
}

export function getMockSessionEmail() {
  try { return sessionStorage.getItem(MOCK_SESSION_KEY) || ''; } catch { return ''; }
}

/** Pick dev dashboard scenario from mock session email */
export function scenarioForMockSession() {
  const email = getMockSessionEmail();
  if (!email) return 'signupOnly';
  return MOCK_SEED_SCENARIOS[email] || 'signupOnly';
}

// ─── Email verification (signup) ─────────────────────────────────────────────

/** Dev / demo email verification — replace with API later */
export const MOCK_EMAIL_VERIFY_CODE = '123456';
export const SIGNUP_CODE_TTL_MS = 10 * 60 * 1000;

const SIGNUP_PENDING_KEY = 'anytap_signup_pending';

export function sendMockEmailVerification(email) {
  if (!emailOk(email)) return { ok: false, code: 'INVALID_EMAIL' };
  return { ok: true };
}

export function verifyMockEmailCode(code) {
  return /^\d{6}$/.test(String(code).trim());
}

export function saveSignupPending({ email, referral = '' }) {
  const payload = {
    email: email.trim().toLowerCase(),
    referral: referral.trim(),
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
  const sec = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
  return formatSecondsAsMmSs(sec);
}

export function formatSignupCodeTtl() {
  return formatSecondsAsMmSs(SIGNUP_CODE_TTL_MS / 1000);
}

function formatSecondsAsMmSs(totalSec) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
