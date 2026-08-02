import { getHttpSession, setHttpSession } from './api/httpSession.js';
import { getDemoStateBySlug } from './demo-states.js';

const DEMO_SLUG_KEY = 'anytap_demo_slug';
const DEMO_ADMIN_KEY = 'anytap_demo_admin';

export function setActiveDemoSlug(slug) {
  try {
    if (slug) {
      sessionStorage.setItem(DEMO_SLUG_KEY, slug);
      localStorage.setItem(DEMO_SLUG_KEY, slug);
    } else {
      sessionStorage.removeItem(DEMO_SLUG_KEY);
      localStorage.removeItem(DEMO_SLUG_KEY);
    }
  } catch { /* noop */ }
}

export function getActiveDemoSlug() {
  try {
    return sessionStorage.getItem(DEMO_SLUG_KEY)
      || localStorage.getItem(DEMO_SLUG_KEY)
      || '';
  } catch {
    return '';
  }
}

/** Preview-only admin gate — no API login required. */
export function enableDemoAdminAccess(slug = 'admin') {
  try {
    sessionStorage.setItem(DEMO_ADMIN_KEY, '1');
    setActiveDemoSlug(slug);
  } catch { /* noop */ }
}

export function clearDemoAdminAccess() {
  try {
    sessionStorage.removeItem(DEMO_ADMIN_KEY);
  } catch { /* noop */ }
}

export function hasDemoAdminAccess() {
  return false;
}

/** Merge demo sessionOverride onto the live session (single write). */
export function applyDemoSessionOverride(state) {
  if (!state?.sessionOverride) return null;
  setActiveDemoSlug(state.slug);
  const current = getHttpSession();
  if (!current) return null;
  const next = { ...current, ...state.sessionOverride, demoSlug: state.slug };
  setHttpSession(next);
  return next;
}

/** Preview-only member session — no API login required. */
export function startDemoMemberPreview(state) {
  if (!state?.email) return null;
  setActiveDemoSlug(state.slug);
  const next = {
    userId: `demo-${state.slug}`,
    email: state.email,
    loginId: state.loginId || '',
    merchantId: 'test-merchant',
    kycStatus: 'PENDING',
    cardStatus: 'not_issued',
    walletExists: false,
    needsActivation: false,
    status: 'ACTIVE',
    cregisWalletAddress: '',
    demoSlug: state.slug,
    demoLockState: true,
    ...(state.sessionOverride || {}),
  };
  setHttpSession(next);
  return getHttpSession();
}

/**
 * Restore a member demo preview from ?demo=slug (or active slug).
 * Used when mobile drops sessionStorage between /demo → /account.
 */
export function ensureDemoPreviewSession(slugFromUrl = '') {
  const slug = String(slugFromUrl || getActiveDemoSlug() || '').trim();
  if (!slug) return null;
  const state = getDemoStateBySlug(slug);
  if (!state?.email || state.group === 'admin') return null;

  const current = getHttpSession();
  if (current?.userId && (current.demoSlug === slug || current.demoLockState)) {
    if (state.sessionOverride) {
      return applyDemoSessionOverride(state) || current;
    }
    return current;
  }
  return startDemoMemberPreview(state);
}

/** Re-apply demo lock when reading account context (survives racey login writes). */
export function resolveDemoLockedSession(session) {
  if (!session) return session;
  if (session.demoLockState) return session;
  const slug = session.demoSlug || getActiveDemoSlug();
  const demo = slug ? getDemoStateBySlug(slug) : null;
  if (!demo?.sessionOverride) return session;
  return { ...session, ...demo.sessionOverride, demoSlug: slug };
}
