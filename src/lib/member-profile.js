/**
 * Member display profile — name / phone / country from KYC until backend stores them.
 * Scoped to the signed-in userId so another account's KYC name does not leak.
 */

const PROFILE_KEY = 'anytap_member_profile';
const PROFILE_USER_KEY = 'anytap_member_profile_user';

function readBoundUserId() {
  try {
    return sessionStorage.getItem(PROFILE_USER_KEY) || localStorage.getItem(PROFILE_USER_KEY) || '';
  } catch {
    return '';
  }
}

function writeBoundUserId(userId) {
  try {
    if (!userId) {
      sessionStorage.removeItem(PROFILE_USER_KEY);
      localStorage.removeItem(PROFILE_USER_KEY);
      return;
    }
    sessionStorage.setItem(PROFILE_USER_KEY, userId);
    localStorage.setItem(PROFILE_USER_KEY, userId);
  } catch { /* noop */ }
}

function readProfile() {
  try {
    const raw = sessionStorage.getItem(PROFILE_KEY) || localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeProfile(profile) {
  try {
    const json = JSON.stringify(profile);
    sessionStorage.setItem(PROFILE_KEY, json);
    localStorage.setItem(PROFILE_KEY, json);
    window.dispatchEvent(new Event('anytap-member-profile'));
  } catch { /* noop */ }
}

export function getMemberProfile() {
  return readProfile();
}

export function patchMemberProfile(patch = {}) {
  const next = { ...readProfile(), ...patch };
  writeProfile(next);
  return next;
}

export function clearMemberProfile() {
  try {
    sessionStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(PROFILE_KEY);
    writeBoundUserId('');
    window.dispatchEvent(new Event('anytap-member-profile'));
  } catch { /* noop */ }
}

/** Drop stale KYC display fields when a different member signs in. */
export function bindMemberProfileToUser(userId) {
  const id = String(userId || '').trim();
  if (!id) {
    clearMemberProfile();
    return;
  }
  const bound = readBoundUserId();
  if (bound === id) return;
  if (bound && bound !== id) clearMemberProfile();
  writeBoundUserId(id);
}

/** Prefer saved profile → session fields. No email-local-part inventing. */
export function resolveMemberDisplayName(source = {}) {
  const profile = getMemberProfile();
  const fn = String(source.firstName || profile.firstName || '').trim();
  const ln = String(source.lastName || profile.lastName || '').trim();
  if (fn || ln) {
    return `${ln} ${fn}`.trim();
  }
  const result = String(
    source.name
    || source.fullName
    || profile.name
    || profile.fullName
    || '',
  ).trim();
  return result || 'User';
}

/**
 * Card / wallet unlock: KYC approved (or completed) and a legal name exists.
 * BE auto-APPROVED-at-signup without a form still counts as incomplete (no name).
 * My page itself is always open — it does not use this helper for navigation.
 */
export function hasCompletedKycProfile(accountState = {}) {
  const status = String(accountState.kycStatus || accountState.status || '').toLowerCase();
  return ['approved', 'completed', 'active', 'pending_wallet'].includes(status);
}

export function resolveMemberCountry(source = {}) {
  const profile = getMemberProfile();
  return String(
    source.country
    || source.nationality
    || source.countryCode
    || profile.country
    || profile.nationality
    || '',
  ).trim();
}

export function formatMemberPhone(source = {}) {
  const profile = getMemberProfile();
  const cc = String(source.phoneCountryCode || source.countryCode || profile.phoneCountryCode || '').trim();
  const num = String(source.phoneNumber || source.phone || profile.phoneNumber || '').trim();
  if (cc && num) return `${cc} ${num}`;
  return cc || num || '';
}

/** Apply KYC form values to local profile + return patch for http session. */
export function profilePatchFromKycForm(form = {}) {
  const patch = {};
  const fn = String(form.firstName || '').trim();
  const ln = String(form.lastName || '').trim();
  if (fn) patch.firstName = fn;
  if (ln) patch.lastName = ln;

  const fullName = (fn || ln) ? `${ln} ${fn}`.trim() : String(form.fullName || '').trim();
  if (fullName) patch.name = fullName;

  const country = String(form.nationality || form.country || '').trim();
  if (country) {
    patch.country = country;
    patch.nationality = country;
  }

  const phoneCountryCode = String(form.phoneCountryCode || form.areaCode || '').trim();
  if (phoneCountryCode) patch.phoneCountryCode = phoneCountryCode;

  const phoneNumber = String(form.phoneNumber || form.mobile || form.phone || '').trim();
  if (phoneNumber) patch.phoneNumber = phoneNumber;

  const fullPhone = (phoneCountryCode && phoneNumber)
    ? `${phoneCountryCode} ${phoneNumber}`
    : (phoneCountryCode || phoneNumber);
  if (fullPhone) patch.phone = fullPhone;

  if (Object.keys(patch).length) patchMemberProfile(patch);
  return patch;
}

export function applyProfileToAccountState(accountState, source = {}) {
  if (!accountState) return accountState;
  const kycStatus = String(source.kycStatus || accountState.kycStatus || '').toLowerCase();
  const kycOk = kycStatus === 'approved' || kycStatus === 'completed' || kycStatus === 'pending_wallet';
  const profile = getMemberProfile();
  const merged = { ...profile, ...source };
  return {
    ...accountState,
    name: kycOk
      ? resolveMemberDisplayName({ ...accountState, ...merged })
      : '',
    country: kycOk
      ? (resolveMemberCountry({ ...accountState, ...merged }) || accountState.country || '')
      : '',
    phone: kycOk
      ? (formatMemberPhone({ ...accountState, ...merged }) || accountState.phone || '')
      : '',
  };
}
