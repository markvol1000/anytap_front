/**
 * Auth entry point — components import from here, not auth.js directly.
 *
 * VITE_API_MODE:
 *   mock → ./auth.js
 *   http → ./auth/authApi.js (Spring Boot ALB)
 */

import { isHttpApi } from '../api/config.js';
import { hasHttpSession } from '../api/httpSession.js';
import * as mock from '../auth.js';
import * as api from './auth/authApi.js';

const auth = isHttpApi ? api : mock;

/** Member portal session */
export function hasMemberSession() {
  if (isHttpApi) return hasHttpSession();
  return auth.hasMockSession();
}

export const emailOk = auth.emailOk;
export const MOCK_LOGIN = auth.MOCK_LOGIN;
export const MOCK_ADMIN_LOGIN = auth.MOCK_ADMIN_LOGIN;
export const MOCK_EMAIL_VERIFY_CODE = auth.MOCK_EMAIL_VERIFY_CODE;
export const SIGNUP_CODE_TTL_MS = auth.SIGNUP_CODE_TTL_MS;
export const attemptLogin = auth.attemptLogin;
export const attemptSignUp = auth.attemptSignUp;
export const attemptAdminLogin = auth.attemptAdminLogin;
export const isAdminEmail = auth.isAdminEmail;
export const setAdminSession = auth.setAdminSession;
export const establishLoginSession = auth.establishLoginSession;
export const showAdminPortalLink = auth.showAdminPortalLink;
export const refreshAdminPortalLink = auth.refreshAdminPortalLink;
export const clearAdminSession = auth.clearAdminSession;
export const hasAdminSession = auth.hasAdminSession;
export const getAdminSessionEmail = auth.getAdminSessionEmail;
export const verifyLogin = auth.verifyLogin;
export const setMockSession = auth.setMockSession;
export const clearMockSession = auth.clearMockSession;
export const hasMockSession = auth.hasMockSession;
export const getMockSessionEmail = auth.getMockSessionEmail;
export const scenarioForMockSession = auth.scenarioForMockSession;
export const sendMockEmailVerification = auth.sendMockEmailVerification;
export const verifyMockEmailCode = auth.verifyMockEmailCode;
export const saveSignupPending = auth.saveSignupPending;
export const loadSignupPending = auth.loadSignupPending;
export const refreshSignupExpiry = auth.refreshSignupExpiry;
export const clearSignupPending = auth.clearSignupPending;
export const formatExpiresRemaining = auth.formatExpiresRemaining;
export const formatSignupCodeTtl = auth.formatSignupCodeTtl;
export const attemptLogout = auth.attemptLogout ?? (async () => {
  if (auth.clearMockSession) auth.clearMockSession();
  if (auth.clearAdminSession) auth.clearAdminSession();
});
export const verifyEmailCode = auth.verifyEmailCode
  ?? (async () => ({ ok: false, code: 'MISSING' }));
export const sendVerificationEmail = auth.sendVerificationEmail
  ?? (async () => ({ ok: false, code: 'MISSING' }));
export const loginIdOk = auth.loginIdOk ?? auth.emailOk;
export const checkReferralCode = auth.checkReferralCode ?? (async () => false);
export { ensureAvailableLoginId, saveEmailLoginId, HTTP_DEMO_LOGIN } from './auth/loginId.js';
