/**
 * PWA install prompt — visit / dismiss state (localStorage).
 * Banner UX only; browser BeforeInstallPrompt is triggered from usePwaInstall.
 */

const STORAGE = {
  visits: 'anytap_pwa_visits',
  sessionRecorded: 'anytap_pwa_session_recorded',
  dismissUntil: 'anytap_pwa_dismiss_until',
  rejectCount: 'anytap_pwa_reject_count',
  installed: 'anytap_pwa_installed',
};

export const PWA_DWELL_MS = 30_000;
export const PWA_DISMISS_DAYS = 7;
export const PWA_LONG_DISMISS_DAYS = 30;
export const PWA_MAX_REJECTS = 3;
export const PWA_ACCOUNT_DELAY_MS = 3_000;

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* noop */ }
}

function readNumber(key) {
  try {
    const raw = localStorage.getItem(key);
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function writeNumber(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch { /* noop */ }
}

export function isStandalonePwa() {
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches
      || window.matchMedia('(display-mode: fullscreen)').matches
      || window.navigator.standalone === true
    );
  } catch {
    return false;
  }
}

export function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

export function isAndroidDevice() {
  return /android/i.test(navigator.userAgent);
}

/** Mobile / tablet browsers that support add-to-home-screen. */
export function isMobileInstallCandidate() {
  if (isIosDevice() || isAndroidDevice()) return true;
  try {
    return window.matchMedia('(max-width: 899px)').matches;
  } catch {
    return false;
  }
}

export function isPwaForcePreview() {
  try {
    return import.meta.env.DEV && new URLSearchParams(window.location.search).get('forcePwa') === '1';
  } catch {
    return false;
  }
}

export function canShowPwaInstallUi() {
  if (isPwaForcePreview()) return true;
  if (isStandalonePwa()) return false;
  if (readJson(STORAGE.installed, false)) return false;
  const dismissUntil = readNumber(STORAGE.dismissUntil);
  if (dismissUntil && Date.now() < dismissUntil) return false;
  return true;
}

/** Once per browser session — increments total visit count. */
export function recordPwaSiteVisit() {
  try {
    if (sessionStorage.getItem(STORAGE.sessionRecorded)) return readNumber(STORAGE.visits);
    sessionStorage.setItem(STORAGE.sessionRecorded, '1');
    const next = readNumber(STORAGE.visits) + 1;
    writeNumber(STORAGE.visits, next);
    return next;
  } catch {
    return 1;
  }
}

export function getPwaVisitCount() {
  return readNumber(STORAGE.visits);
}

export function markPwaInstalled() {
  writeJson(STORAGE.installed, true);
}

export function dismissPwaPrompt({ long = false } = {}) {
  const days = long ? PWA_LONG_DISMISS_DAYS : PWA_DISMISS_DAYS;
  const until = Date.now() + days * 24 * 60 * 60 * 1000;
  writeNumber(STORAGE.dismissUntil, until);
}

export function recordPwaInstallRejected() {
  const count = readNumber(STORAGE.rejectCount) + 1;
  writeNumber(STORAGE.rejectCount, count);
  dismissPwaPrompt({ long: count >= PWA_MAX_REJECTS });
  return count;
}

export function resetPwaDismissForDev() {
  try {
    localStorage.removeItem(STORAGE.dismissUntil);
    localStorage.removeItem(STORAGE.rejectCount);
    localStorage.removeItem(STORAGE.installed);
  } catch { /* noop */ }
}
