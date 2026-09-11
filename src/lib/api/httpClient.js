/**
 * Shared HTTP client for backend API calls.
 * Fill in paths when you receive the API spec — one place for auth headers & errors.
 */

import { API_BASE_URL, assertApiBaseUrl } from './config.js';
import { sanitizeToastMessage } from '../../utils/toast-sanitizer.js';

const TOKEN_KEY = 'anytap_access_token';

export function getAccessToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setAccessToken(token) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch { /* noop */ }
}

export function clearAccessToken() {
  setAccessToken('');
}

async function parseBody(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function resolveUrl(path) {
  let cleanPath = String(path || '').replace(/[\.\/]+$/, (match) => (match.includes('/') ? '/' : ''));
  if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath;
  
  const baseUrl = API_BASE_URL.replace(/\/$/, '');
  const hasApiV1Base = baseUrl.endsWith('/api/v1');
  const hasApiV1Path = cleanPath.startsWith('/api/v1');

  if (!hasApiV1Base && !hasApiV1Path) {
    cleanPath = '/api/v1' + cleanPath;
  }
  return `${baseUrl}${cleanPath}`;
}

let isRedirecting = false;

export function forceLogoutAndRedirect(reason = 'server_unreachable') {
  clearAccessToken();
  try {
    sessionStorage.removeItem('anytap_http_session');
    localStorage.removeItem('anytap_http_session');
    localStorage.removeItem('anytap_demo_http_session');
    sessionStorage.removeItem('anytap_mock_session');
    localStorage.removeItem('anytap_mock_session');
    sessionStorage.removeItem('anytap_admin_session');
    localStorage.removeItem('anytap_admin_session');
  } catch { /* noop */ }

  try {
    window.dispatchEvent(new Event('anytap-member-session'));
    window.dispatchEvent(new CustomEvent('anytap-session-expired', {
      detail: { reason }
    }));
  } catch { /* noop */ }

  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const publicPaths = ['/login', '/sign-up', '/forgot-password', '/sign-up/verify'];
  const isAlreadyOnAuthPage = publicPaths.some((p) => currentPath === p || currentPath.startsWith(p));

  if (isAlreadyOnAuthPage) {
    return;
  }

  if (isRedirecting) return;
  isRedirecting = true;

  console.warn(`[AnyTap] Server unreachable or session expired (${reason}). Redirecting to /login...`);

  setTimeout(() => {
    try {
      window.location.replace(`/login?expired=1&reason=${encodeURIComponent(reason)}`);
    } catch {
      window.location.href = `/login?expired=1&reason=${encodeURIComponent(reason)}`;
    } finally {
      setTimeout(() => { isRedirecting = false; }, 3000);
    }
  }, 100);
}

/**
 * @param {string} path — e.g. '/admin/members' (prepended with VITE_API_BASE_URL)
 * @param {RequestInit & { json?: unknown, timeout?: number }} options
 */
export async function apiRequest(path, options = {}) {
  assertApiBaseUrl();

  const { json, headers: extraHeaders, timeout = 12000, ...init } = options;
  const headers = new Headers(extraHeaders);

  const isAdminReq = path && String(path).includes('/admin');
  const isLoginEndpoint = path && String(path).includes('/auth/login');

  const token = getAccessToken();
  if (token && !isAdminReq) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (isAdminReq) {
    headers.set('X-User-Role', 'ADMIN');
    headers.set('X-User-Id', 'admin@anytap.io');
    if (token) {
      headers.set('X-Admin-Token', token);
    }
  }

  let body = init.body;
  if (json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(json);
  }

  const requestUrl = resolveUrl(path);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  if (init.signal) {
    init.signal.addEventListener('abort', () => controller.abort());
  }

  let res;
  try {
    res = await fetch(requestUrl, { ...init, headers, body, signal: controller.signal });
  } catch (fetchErr) {
    clearTimeout(timeoutId);
    const isTimeout = fetchErr.name === 'AbortError';
    const isNetworkError = fetchErr instanceof TypeError || isTimeout || String(fetchErr).includes('Failed to fetch') || String(fetchErr).includes('NetworkError');

    console.error(`[API Network Error] ${requestUrl}:`, fetchErr);

    // 로그인 엔드포인트 자체를 제외하고, 서버 무응답/다운 시 즉시 로그인으로 탈출
    if (!isLoginEndpoint && isNetworkError) {
      forceLogoutAndRedirect('server_unreachable');
    }

    const err = new Error('System is under maintenance. Please try again later.');
    err.status = isTimeout ? 504 : 0;
    err.isNetworkError = true;
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  // 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout 등 서버 다운 응답 (운영 AWS ALB 응답)
  const isServerDown = res.status === 502 || res.status === 503 || res.status === 504;
  if (isServerDown) {
    console.error(`[API Server Down] HTTP ${res.status} from ${requestUrl}`);
    if (!isLoginEndpoint) {
      forceLogoutAndRedirect('server_unreachable');
    }
    const err = new Error('System is under maintenance. Please try again later.');
    err.status = res.status;
    err.isServerDown = true;
    throw err;
  }

  const data = await parseBody(res);

  // Spring Boot envelope: { result, message, data, sqlLogs }
  const isEnvelope = data && typeof data === 'object' && !Array.isArray(data) && 'result' in data;

  if (!res.ok || (isEnvelope && data.result === false)) {
    if ((res.status === 401 || res.status === 403) && !isAdminReq && !isLoginEndpoint) {
      clearAccessToken();
      try {
        sessionStorage.removeItem('anytap_http_session');
        localStorage.removeItem('anytap_http_session');
        localStorage.removeItem('anytap_demo_http_session');
      } catch { /* noop */ }
      window.dispatchEvent(new CustomEvent('anytap-session-expired', { detail: { reason: 'unauthorized', status: res.status } }));
    }
    const rawMsg = data?.message || data?.error || res.statusText || 'System is under maintenance. Please try again later.';
    const message = sanitizeToastMessage(rawMsg);
    const err = new Error(message);
    err.status = res.ok ? 400 : res.status;
    err.data = data;
    throw err;
  }

  if (isEnvelope) return data.data;
  return data;
}

export function apiGet(path, options) {
  return apiRequest(path, { ...options, method: 'GET' });
}

export function apiPost(path, json, options) {
  return apiRequest(path, { ...options, method: 'POST', json });
}

export function apiPatch(path, json, options) {
  return apiRequest(path, { ...options, method: 'PATCH', json });
}

export function apiPut(path, json, options) {
  return apiRequest(path, { ...options, method: 'PUT', json });
}

export function apiDelete(path, options) {
  return apiRequest(path, { ...options, method: 'DELETE' });
}

/**
 * Multipart file upload (e.g. KYC documents).
 * @param {string} path
 * @param {Blob|File} file
 * @param {{ query?: Record<string, string>, fieldName?: string, timeout?: number }} [options]
 */
export async function apiUpload(path, file, options = {}) {
  assertApiBaseUrl();

  const { query, fieldName = 'file', headers: extraHeaders, timeout = 30000 } = options;
  const headers = new Headers(extraHeaders);
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const body = new FormData();
  body.append(fieldName, file);

  let url = resolveUrl(path);
  if (query && typeof query === 'object') {
    const qs = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v != null && v !== '') qs.set(k, String(v));
    });
    const q = qs.toString();
    if (q) url += `?${q}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  let res;
  try {
    res = await fetch(url, { method: 'POST', headers, body, signal: controller.signal });
  } catch (fetchErr) {
    clearTimeout(timeoutId);
    const isTimeout = fetchErr.name === 'AbortError';
    const isNetworkError = fetchErr instanceof TypeError || isTimeout || String(fetchErr).includes('Failed to fetch') || String(fetchErr).includes('NetworkError');
    if (isNetworkError) {
      forceLogoutAndRedirect('server_unreachable');
    }
    const err = new Error(isTimeout ? 'Upload timed out.' : 'System is under maintenance. Please try again later.');
    err.status = isTimeout ? 504 : 0;
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (res.status === 502 || res.status === 503 || res.status === 504) {
    forceLogoutAndRedirect('server_unreachable');
    const err = new Error('System is under maintenance. Please try again later.');
    err.status = res.status;
    throw err;
  }

  const data = await parseBody(res);
  const isEnvelope = data && typeof data === 'object' && !Array.isArray(data) && 'result' in data;

  if (!res.ok || (isEnvelope && data.result === false)) {
    if (res.status === 401 || res.status === 403) {
      clearAccessToken();
      try {
        sessionStorage.removeItem('anytap_http_session');
        localStorage.removeItem('anytap_http_session');
        localStorage.removeItem('anytap_demo_http_session');
      } catch { /* noop */ }
      window.dispatchEvent(new CustomEvent('anytap-session-expired', { detail: { reason: 'unauthorized', status: res.status } }));
    }
    const rawMsg = data?.message || data?.error || (res.statusText && res.statusText !== 'OK' ? res.statusText : '') || 'Image upload failed. Please check your internet connection or try another JPG/PNG photo.';
    const message = sanitizeToastMessage(rawMsg);
    const err = new Error(message);
    err.status = res.ok ? 400 : res.status;
    err.data = data;
    throw err;
  }

  if (isEnvelope) return data.data;
  return data;
}
