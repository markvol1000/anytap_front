/**
 * KYC navigation helpers for the member portal.
 */

import { MEMBER_STATE, resolveMemberState } from './member-state.js';
import { hasCompletedKycProfile } from './member-profile.js';
import { SCREEN_ROUTES } from '../constants/routes.ts';

/** First step of the KYC / identity flow. */
export const KYC_STEP1_PATH = SCREEN_ROUTES.kyc;

/** Canonical portal screen for KYC entry. */
export const KYC_STEP1_SCREEN = 'kyc';

/**
 * True when KYC was submitted and is waiting for (or failed) review.
 * @param {object} accountState
 */
export function isKycInProgress(accountState) {
  const memberState = resolveMemberState(accountState);
  if (memberState === MEMBER_STATE.KYC_PENDING) return true;
  const status = String(accountState?.kycStatus || '').toLowerCase();
  return status === 'under_review' || status === 'rejected';
}

/**
 * True when identity verification is fully approved.
 * @param {object} accountState
 */
export function isKycCompleted(accountState) {
  return hasCompletedKycProfile(accountState);
}

/**
 * Start KYC step 1, or signal that review is already running.
 * @returns {'blocked'|'started'}
 */
export function startKycOrBlock(accountState, { go, navigate } = {}) {
  if (isKycInProgress(accountState)) return 'blocked';
  if (typeof go === 'function') {
    go(KYC_STEP1_SCREEN);
  } else if (typeof navigate === 'function') {
    navigate(KYC_STEP1_PATH);
  }
  return 'started';
}
