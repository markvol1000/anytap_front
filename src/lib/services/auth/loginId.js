/**
 * Login ID helpers — backend requires loginId (8–32 chars); UI uses email only.
 */

import { apiGet } from '../../api/httpClient.js';

const LOGIN_ID_MAP_KEY = 'anytap_email_login_id';

/** Handoff seed accounts (docs/member-state-handoff.md) — email → loginId */
const SEED_EMAIL_LOGIN_IDS = {
  'kyc-required@anytap.io': 'kycreq001',
  'kyc-pending@anytap.io': 'kycpend001',
  'card-ready@anytap.io': 'cardready001',
  'card-deposit@anytap.io': 'deposit001',
  'card-shipping@anytap.io': 'shipping001',
  'activate-card@anytap.io': 'activate001',
  'active-card@anytap.io': 'active001',
  'zero-balance@anytap.io': 'zerobal001',
  'admin@anytap.io': 'admin001',
  /** Legacy mock-only emails — map to accounts that exist on current ALB */
  'test@test.co.kr': '1anytap0',
  '1@1.co.kr': '1anytap0',
  'new@anytap.com': '1anytap0',
  'review@anytap.com': 'kycpend001',
  'jane.doe@example.com': 'cardready001',
  /** Backend-provisioned test account */
  '201@201.com': 'testuser201',
  /** E2E test account (ALB) */
  'ymy@anytap.io': 'ymyanytap',
};

/** Internal demo credentials (not shown on the login UI). */
export const HTTP_DEMO_LOGIN = {
  email: '1anytap0',
  password: 'test1234',
};

/** Short email locals → loginId candidates (BE needs 8–32 chars; UI is email-only). */
function loginIdVariantsFromLocal(localPart) {
  const local = String(localPart || '').toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'user';
  const out = [];
  const push = (id) => {
    const trimmed = String(id || '').slice(0, 32);
    if (trimmed.length >= 8 && !out.includes(trimmed)) out.push(trimmed);
  };
  if (local.length >= 8) {
    push(local);
    return out;
  }
  // Preferred: keep full "anytap" pad (ymy → ymyanytap), not truncate to 8 mid-word.
  push(`${local}anytap`);
  push(`${local}anytap0`);
  push(`${local}anytap00`);
  // Legacy pad used by older clients (ymy → ymyanyta).
  push(`${local}anytap00`.slice(0, 8));
  return out;
}

export function baseLoginIdFromEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (SEED_EMAIL_LOGIN_IDS[normalized]) return SEED_EMAIL_LOGIN_IDS[normalized];
  const local = normalized.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'user';
  return loginIdVariantsFromLocal(local)[0] || `${local}anytap`.slice(0, 32);
}

function loadLoginIdMap() {
  try {
    const raw = localStorage.getItem(LOGIN_ID_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveEmailLoginId(email, loginId) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized || !loginId) return;
  const map = loadLoginIdMap();
  map[normalized] = loginId;
  try {
    localStorage.setItem(LOGIN_ID_MAP_KEY, JSON.stringify(map));
  } catch { /* noop */ }
}

export function getLoginIdForEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (SEED_EMAIL_LOGIN_IDS[normalized]) return SEED_EMAIL_LOGIN_IDS[normalized];
  return normalized;
}

/** Reverse lookup: stored email for a loginId (same browser). */
export function getEmailForLoginId(loginId) {
  const id = String(loginId || '').trim();
  if (!id) return '';
  const map = loadLoginIdMap();
  const found = Object.entries(map).find(([, mapped]) => mapped === id);
  if (found?.[0]) return found[0];
  const seed = Object.entries(SEED_EMAIL_LOGIN_IDS).find(([, mapped]) => mapped === id);
  return seed?.[0] || '';
}

/** @returns {Promise<boolean>} true if loginId is already taken */
async function isLoginIdTaken(loginId) {
  try {
    const duplicate = await apiGet(`/auth/check-login-id?loginId=${encodeURIComponent(loginId)}`);
    return duplicate === true;
  } catch {
    return true;
  }
}

/** Allocate a unique loginId derived from email. */
export async function ensureAvailableLoginId(email) {
  const base = baseLoginIdFromEmail(email);
  for (let i = 0; i < 100; i += 1) {
    const suffix = i === 0 ? '' : String(i);
    const trimmed = `${base.slice(0, Math.max(8, 32 - suffix.length))}${suffix}`.slice(0, 32);
    if (trimmed.length < 8) continue;
    const taken = await isLoginIdTaken(trimmed);
    if (!taken) return trimmed;
  }
  throw new Error('Could not allocate login ID');
}

export function resolveLoginIdForAuth(emailOrLoginId) {
  const input = String(emailOrLoginId || '').trim();
  if (!input) return '';
  if (input.includes('@')) {
    return input.toLowerCase();
  }
  return input;
}

/**
 * @deprecated Customer login must not guess loginId from email.
 * Prefer BE email login; only getLoginIdForEmail (signup memory / seed) is allowed.
 */
export function loginIdCandidatesForAuth(emailOrLoginId) {
  const input = String(emailOrLoginId || '').trim();
  if (!input) return [];
  if (!input.includes('@')) return [input];

  const normalized = input.toLowerCase();
  const local = normalized.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'user';
  const variants = loginIdVariantsFromLocal(local);
  const base = baseLoginIdFromEmail(normalized);
  const mapped = getLoginIdForEmail(normalized);
  const seed = SEED_EMAIL_LOGIN_IDS[normalized] || '';
  const out = [];
  const push = (id) => {
    if (id && !out.includes(id)) out.push(id);
  };
  push(mapped);
  push(seed);
  push(base);
  for (const variant of variants) push(variant);
  for (const variant of variants.length ? variants : [base]) {
    for (let i = 1; i <= 5; i += 1) {
      const suffix = String(i);
      push(`${variant.slice(0, Math.max(8, 32 - suffix.length))}${suffix}`.slice(0, 32));
    }
  }
  // Last: email as loginId — works only after BE accepts Users.email lookup.
  push(normalized);
  return out;
}
