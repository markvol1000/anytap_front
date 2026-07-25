/**
 * API mode switch — components never import this directly.
 *
 * mock (default)  → local mock services
 * http            → Spring Boot / custom REST (httpClient.js)
 */

const mode = (import.meta.env.VITE_API_MODE || 'mock').toLowerCase();

export const API_MODE = mode;
export const isHttpApi = mode === 'http';
export const isMockApi = !isHttpApi;

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export const MERCHANT_ID = import.meta.env.VITE_MERCHANT_ID || 'test-merchant';
/** @deprecated Removed from SignUpRequest — kept for env compatibility only */
export const BACKEND_KYC_KEY = import.meta.env.VITE_BACKEND_KYC_KEY || '';

export function assertApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not set. Add it to .env.local');
  }
}
