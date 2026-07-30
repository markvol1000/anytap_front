/**
 * Member account data — hooks/pages import from here.
 *
 * VITE_API_MODE:
 *   mock → mock-context.js
 *   http → account/accountApi.js (Spring Boot ALB)
 */

import { isHttpApi } from '../api/config.js';
import * as mock from '../mock-context.js';
import * as api from './account/accountApi.js';

export async function loadAccountContext(scenarioKey) {
  if (isHttpApi) return api.fetchAccountContext();
  return mock.getMockContext(scenarioKey);
}

export async function loadReferralContext(scenarioKey) {
  if (isHttpApi) return api.fetchReferralContext();
  const { getReferralContext } = await import('../referral-context.js');
  return getReferralContext(scenarioKey);
}

export async function applyReferralPartner() {
  return null;
}

export async function submitKycApplication(form) {
  if (isHttpApi) return api.submitKycApplication(form);
  return { ok: true };
}

export async function submitCardApplication(payload) {
  if (isHttpApi) return api.submitCardApplication(payload);
  return { ok: true };
}

export async function chargeCard(amount, cardId = null) {
  if (isHttpApi) return api.chargeCard(amount, cardId);
  return { ok: true };
}

export async function withdrawToExternal(amount, address, password) {
  if (isHttpApi) return api.withdrawToExternal(amount, address, password);
  return { ok: true };
}

export async function sendCardSecureCode() {
  if (isHttpApi) return api.sendCardSecureCode();
  return { ok: true };
}

export async function revealCardDetails(code) {
  if (isHttpApi) return api.revealCardDetails(code);
  return { ok: true, data: { cardNo: '4111111111111111', cvv: '123', expiry: '12/29' } };
}

export async function freezeCard(cardId = null) {
  if (isHttpApi) return api.freezeCard(cardId);
  return { ok: true };
}

export async function unfreezeCard(cardId = null) {
  if (isHttpApi) return api.unfreezeCard(cardId);
  return { ok: true };
}

export function getAccountScenarios() {
  if (isHttpApi) return api.getAccountScenarios();
  return mock.buildAccountScenarios();
}

export async function fetchSystemAddress() {
  const isProd = import.meta.env.MODE === 'prd';
  const localFallback = isProd ? '' : 'TDVjFu6CQRrhoFcg1mNVjD5QaPKL8fFtyf';

  if (isHttpApi) {
    try {
      const { apiGet } = await import('../api/httpClient.js');
      const res = await apiGet('/common/system-address');
      return res?.tronAddress || localFallback;
    } catch (err) {
      console.warn('Failed to fetch system address from backend:', err);
      return localFallback;
    }
  }
  return localFallback;
}

export {
  MOCK_FLOW_SCENARIO_KEYS,
  FLOW_STATE_LABELS,
  buildAccountScenarios,
  defaultFlowScenarioKey,
  getMockContext,
} from '../mock-context.js';

