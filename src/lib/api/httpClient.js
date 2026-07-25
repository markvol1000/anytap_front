/**
 * Shared HTTP client for backend API calls.
 * Fill in paths when you receive the API spec — one place for auth headers & errors.
 */

import { API_BASE_URL, assertApiBaseUrl } from './config.js';

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

/**
 * @param {string} path — e.g. '/admin/members' (prepended with VITE_API_BASE_URL)
 * @param {RequestInit & { json?: unknown }} options
 */
export async function apiRequest(path, options = {}) {
  assertApiBaseUrl();

  const { json, headers: extraHeaders, ...init } = options;
  const headers = new Headers(extraHeaders);

  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let body = init.body;
  if (json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(json);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, body });
  const data = await parseBody(res);

  // Spring Boot envelope: { result, message, data, sqlLogs }
  const isEnvelope = data && typeof data === 'object' && !Array.isArray(data) && 'result' in data;

  if (!res.ok || (isEnvelope && data.result === false)) {
    const message = data?.message || data?.error || res.statusText || 'Request failed';
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

export function apiDelete(path, options) {
  return apiRequest(path, { ...options, method: 'DELETE' });
}

/**
 * Multipart file upload (e.g. KYC documents).
 * @param {string} path
 * @param {Blob|File} file
 * @param {{ query?: Record<string, string>, fieldName?: string }} [options]
 */
export async function apiUpload(path, file, options = {}) {
  assertApiBaseUrl();

  const { query, fieldName = 'file', headers: extraHeaders } = options;
  const headers = new Headers(extraHeaders);
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const body = new FormData();
  body.append(fieldName, file);

  let url = `${API_BASE_URL}${path}`;
  if (query && typeof query === 'object') {
    const qs = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v != null && v !== '') qs.set(k, String(v));
    });
    const q = qs.toString();
    if (q) url += `?${q}`;
  }

  const res = await fetch(url, { method: 'POST', headers, body });
  const data = await parseBody(res);
  const isEnvelope = data && typeof data === 'object' && !Array.isArray(data) && 'result' in data;

  if (!res.ok || (isEnvelope && data.result === false)) {
    const message = data?.message || data?.error || res.statusText || 'Upload failed';
    const err = new Error(message);
    err.status = res.ok ? 400 : res.status;
    err.data = data;
    throw err;
  }

  if (isEnvelope) return data.data;
  return data;
}
