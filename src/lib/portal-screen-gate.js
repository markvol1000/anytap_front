/**
 * Portal screen gates — if a page has no meaningful content for the member state,
 * show a single guidance screen instead of an empty/same layout.
 *
 * Flow: KYC (/account/kyc) → My unlocks → Apply card → $100 deposit → issuing → register → wallet.
 */

import { MEMBER_STATE, resolveMemberState } from './member-state.js';
import { showsIssuanceDepositWallet } from '../utils/wallet-data.js';
import { hasCompletedKycProfile } from './member-profile.js';

const ALWAYS_OPEN = new Set([
  'home',
  'card',
  'cardApply',
  'cardRegister',
  'topup',
  'transactions',
  'kyc',
  // My hub — always reachable
  'settings',
  'profile',
  'security',
  'notifications',
  'support',
]);

function guide(title, body, cta = null) {
  return { mode: 'guide', title, body, cta };
}

function content() {
  return { mode: 'content' };
}

function preKycGate(memberState) {
  if (memberState === MEMBER_STATE.KYC_PENDING) {
    return guide(
      'Identity verification in progress',
      'Other pages unlock after KYC is approved. We will email you when the review is complete.',
      { label: 'Back to Home', nextScreen: 'home' },
    );
  }
  return guide(
    'Complete identity verification first',
    'Verify your identity to unlock cards and wallet.',
    { label: 'Verify Identity', nextScreen: 'kyc' },
  );
}

/**
 * @param {string} screen
 * @param {object} accountState
 */
export function resolvePortalScreenGate(screen, accountState) {
  const memberState = resolveMemberState(accountState);
  
  if (memberState === MEMBER_STATE.PENDING_WALLET) {
    if (screen === 'settings' || screen === 'profile' || screen === 'security' || screen === 'notifications' || screen === 'support') {
      return content();
    }
    return guide(
      'USDT wallet address allocation in progress',
      'Your identity KYC is approved! We are now allocating your TRC-20 USDT wallet address. This feature will unlock automatically after this process completes.',
      null
    );
  }

  if (ALWAYS_OPEN.has(screen)) return content();

  const cardStatus = accountState?.cardStatus;
  const profileReady = hasCompletedKycProfile(accountState);

  // Before KYC profile is complete: Home + My + KYC only.
  if (!profileReady) {
    if (screen === 'kyc') {
      return content();
    }
    return preKycGate(memberState);
  }

  if (screen === 'kyc') {
    return guide(
      'Identity already verified',
      'Your profile is unlocked. Continue with a card application when you are ready.',
      { label: 'Apply Card', nextScreen: 'cardApply' },
    );
  }

  if (screen === 'cardApply') {
    if (memberState === MEMBER_STATE.CARD_APPLY_READY) return content();
    if (memberState === MEMBER_STATE.CARD_ISSUING) {
      return guide(
        'Your card application is already in progress',
        showsIssuanceDepositWallet(cardStatus)
          ? 'Complete the 100 USDT issuance deposit on Home. This page is only for new applications.'
          : 'Shipping or production is underway. Track progress from Home.',
        { label: 'Back to Home', nextScreen: 'home' },
      );
    }
    if (memberState === MEMBER_STATE.ACTIVATE_CARD) {
      return guide(
        'Register your issued card first',
        'Activation unlocks your personal wallet. Apply for another card after this one is registered.',
        { label: 'Activate Card', nextScreen: 'card' },
      );
    }
    if (memberState === MEMBER_STATE.CARD_ACTIVE) return content();
    return content();
  }

  if (screen === 'card') {
    if (memberState === MEMBER_STATE.CARD_APPLY_READY) {
      return guide(
        'Apply for your first card',
        'You are verified. Choose virtual or physical Visa to start issuance.',
        { label: 'Apply Card', nextScreen: 'cardApply' },
      );
    }
    return content();
  }

  if (screen === 'cardRegister') {
    if (memberState === MEMBER_STATE.CARD_ACTIVE) {
      return guide(
        'Card already registered',
        'Your personal wallet is open. Manage cards from the Cards tab.',
        { label: 'My Cards', nextScreen: 'card' },
      );
    }
    return content();
  }

  if (screen === 'topup') {
    if (memberState === MEMBER_STATE.CARD_ACTIVE) return content();
    if (memberState === MEMBER_STATE.CARD_ISSUING && showsIssuanceDepositWallet(cardStatus)) {
      return guide(
        'Issuance fee deposit is on Home',
        'The 100 USDT issuance address is shown on the dashboard until shipping starts. Your personal spending wallet opens only after card registration.',
        { label: 'View deposit on Home', nextScreen: 'home' },
      );
    }
    return guide(
      'Personal wallet not open yet',
      'Wallet top-up and transfers unlock after you register your card (Activate).',
      memberState === MEMBER_STATE.ACTIVATE_CARD
        ? { label: 'Activate Card', nextScreen: 'card' }
        : memberState === MEMBER_STATE.CARD_APPLY_READY
          ? { label: 'Apply Card', nextScreen: 'cardApply' }
          : { label: 'Back to Home', nextScreen: 'home' },
    );
  }

  if (screen === 'transactions') {
    if (memberState === MEMBER_STATE.CARD_ACTIVE) return content();
    return guide(
      'No transactions yet',
      'Spending and top-up history appear after your card is registered and you start using the wallet.',
      { label: 'Back to Home', nextScreen: 'home' },
    );
  }

  if (screen === 'referral') {
    if (memberState === MEMBER_STATE.CARD_ACTIVE) return content();
    return guide(
      'Referral opens after your card is active',
      'Finish KYC, card issuance, and registration first.',
      { label: 'Back to Home', nextScreen: 'home' },
    );
  }

  return content();
}
