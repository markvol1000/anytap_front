/**
 * Spring Boot backend session — stored client-side after login / sign-up.
 * No JWT; profile fields come from POST /auth/login.
 *
 * Primary: sessionStorage. Demo previews also mirror to localStorage so mobile
 * browsers that drop sessionStorage mid-navigation still keep the preview.
 */

const HTTP_SESSION_KEY = 'anytap_http_session';
const DEMO_SESSION_KEY = 'anytap_demo_http_session';

function readJson(storage, key) {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function removeKey(storage, key) {
  try {
    storage.removeItem(key);
  } catch { /* noop */ }
}

export function getHttpSession() {
  const fromSession = readJson(sessionStorage, HTTP_SESSION_KEY);
  if (fromSession?.userId) return fromSession;

  const fromLocal = readJson(localStorage, HTTP_SESSION_KEY);
  if (fromLocal?.userId) {
    writeJson(sessionStorage, HTTP_SESSION_KEY, fromLocal);
    return fromLocal;
  }

  const fromDemo = readJson(localStorage, DEMO_SESSION_KEY);
  if (fromDemo?.userId) {
    writeJson(sessionStorage, HTTP_SESSION_KEY, fromDemo);
    return fromDemo;
  }
  return fromSession;
}

/**
 * @param {object|null} session
 * @param {{ notify?: boolean }} [options] — notify:false skips anytap-member-session
 *   (needed so account load patches do not re-trigger loadAccountContext forever).
 */
export function setHttpSession(session, options = {}) {
  const notify = options.notify !== false;
  const okSession = writeJson(sessionStorage, HTTP_SESSION_KEY, session);
  writeJson(localStorage, HTTP_SESSION_KEY, session);

  const isDemo = !!(session?.demoSlug || session?.demoLockState);
  if (isDemo) {
    writeJson(localStorage, DEMO_SESSION_KEY, session);
  } else {
    removeKey(localStorage, DEMO_SESSION_KEY);
  }
  if (notify && (okSession || isDemo)) {
    window.dispatchEvent(new Event('anytap-member-session'));
  }
}

export function clearHttpSession() {
  removeKey(sessionStorage, HTTP_SESSION_KEY);
  removeKey(localStorage, HTTP_SESSION_KEY);
  removeKey(localStorage, DEMO_SESSION_KEY);
  window.dispatchEvent(new Event('anytap-member-session'));
}

export function hasHttpSession() {
  return !!getHttpSession()?.userId;
}

/**
 * @param {Record<string, unknown>} patch
 * @param {{ notify?: boolean }} [options]
 */
export function patchHttpSession(patch, options = {}) {
  const current = getHttpSession();
  if (!current) return null;
  const next = { ...current, ...patch };
  setHttpSession(next, options);
  return next;
}
