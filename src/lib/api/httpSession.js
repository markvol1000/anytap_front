/**
 * Spring Boot backend session & Inactivity Session Timeout — stored client-side after login.
 * Session automatically expires after 30 minutes of inactivity.
 */

const HTTP_SESSION_KEY = 'anytap_http_session';
const DEMO_SESSION_KEY = 'anytap_demo_http_session';

export const DEFAULT_SESSION_TIMEOUT_MINUTES = 30;
export const DEFAULT_SESSION_TIMEOUT_MS = DEFAULT_SESSION_TIMEOUT_MINUTES * 60 * 1000;

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

function checkExpired(session) {
  if (!session || !session.userId) return null;

  // Demo preview sessions do not force auto-expire unless explicitly logged out
  if (session.demoSlug || session.demoLockState) return session;

  const now = Date.now();
  // Backward compatibility: attach expiresAt if missing
  if (!session.expiresAt) {
    session.lastActiveAt = now;
    session.expiresAt = now + DEFAULT_SESSION_TIMEOUT_MS;
    writeJson(sessionStorage, HTTP_SESSION_KEY, session);
    writeJson(localStorage, HTTP_SESSION_KEY, session);
    return session;
  }

  if (now > session.expiresAt) {
    console.warn('[SessionTimeout] Session has expired due to inactivity.');
    clearHttpSession();
    window.dispatchEvent(new Event('anytap-session-expired'));
    return null;
  }
  return session;
}

export function getHttpSession() {
  let session = readJson(sessionStorage, HTTP_SESSION_KEY);
  if (!session?.userId) {
    session = readJson(localStorage, HTTP_SESSION_KEY);
    if (session?.userId) {
      writeJson(sessionStorage, HTTP_SESSION_KEY, session);
    }
  }

  if (!session?.userId) {
    session = readJson(localStorage, DEMO_SESSION_KEY);
    if (session?.userId) {
      writeJson(sessionStorage, HTTP_SESSION_KEY, session);
    }
  }

  return checkExpired(session);
}

let lastTouchTime = 0;

export function touchHttpSession() {
  const now = Date.now();
  // Throttle to update storage at most once every 15 seconds
  if (now - lastTouchTime < 15000) return;
  lastTouchTime = now;

  const current = readJson(sessionStorage, HTTP_SESSION_KEY) || readJson(localStorage, HTTP_SESSION_KEY);
  if (!current?.userId) return;

  // Don't touch expired sessions
  if (current.expiresAt && now > current.expiresAt) {
    checkExpired(current);
    return;
  }

  const updated = {
    ...current,
    lastActiveAt: now,
    expiresAt: now + DEFAULT_SESSION_TIMEOUT_MS,
  };

  writeJson(sessionStorage, HTTP_SESSION_KEY, updated);
  writeJson(localStorage, HTTP_SESSION_KEY, updated);
}

/**
 * @param {object|null} session
 * @param {{ notify?: boolean }} [options]
 */
export function setHttpSession(session, options = {}) {
  const notify = options.notify !== false;
  const now = Date.now();
  const sessionWithTimeout = session
    ? {
        ...session,
        lastActiveAt: session.lastActiveAt || now,
        expiresAt: session.expiresAt || (now + DEFAULT_SESSION_TIMEOUT_MS),
      }
    : null;

  const okSession = writeJson(sessionStorage, HTTP_SESSION_KEY, sessionWithTimeout);
  writeJson(localStorage, HTTP_SESSION_KEY, sessionWithTimeout);

  const isDemo = !!(session?.demoSlug || session?.demoLockState);
  if (isDemo) {
    writeJson(localStorage, DEMO_SESSION_KEY, sessionWithTimeout);
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

// ────────────── Inactivity Activity Listener Setup ──────────────
let isListenerInitialized = false;

export function initSessionActivityListener() {
  if (isListenerInitialized || typeof window === 'undefined') return;
  isListenerInitialized = true;

  const handleUserActivity = () => {
    touchHttpSession();
  };

  const activityEvents = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
  activityEvents.forEach((ev) => {
    window.addEventListener(ev, handleUserActivity, { passive: true });
  });

  // Periodic expiration checker loop (every 10 seconds)
  setInterval(() => {
    getHttpSession();
  }, 10000);
}

// Initialize activity listener immediately on load
if (typeof window !== 'undefined') {
  initSessionActivityListener();
}
