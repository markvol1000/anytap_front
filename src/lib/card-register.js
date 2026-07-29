/** B2B pre-issued card registration — validation helpers (mock). */
// TODO: Wasabi API — validate pre-issued card + activation request
// TODO: Cregis API — link activated card to user wallet
// TODO: Wasabi merchant account mapping on successful activation

import { CARD_BINS } from './card-application.js';

export const REGISTER_ERROR_MESSAGES = {
  invalid_number: 'Invalid card number. Check the 16-digit number on your card.',
  duplicate: 'This card is already linked to your account.',
  expired: 'This card has expired. Contact your issuer for a replacement.',
  not_found: 'Card not found. Verify the number or contact support.',
  activation_failed: 'Activation failed. Please try again or contact support.',
  password_mismatch: 'Passwords do not match.',
  password_weak: 'Enter a 4-digit password.',
  expiry_invalid: 'Enter a valid expiry date (MM/YY).',
};

/** Demo pre-issued cards for mock activation */
export const MOCK_PREISSUED_CARDS = [
  { number: '4937240123456789', last4: '6789', expiry: '12/28', variant: 'physical', label: 'Physical Visa' },
  { number: '4938759876543210', last4: '3210', expiry: '06/27', variant: 'virtual', label: 'Virtual Visa' },
  { number: '4937240000000002', last4: '0002', expiry: '01/24', variant: 'physical', label: 'Physical Visa' },
];

/** Forces activation_failed for QA */
export const MOCK_FAIL_ACTIVATION_NUMBER = '4937240000000004';

const REGISTER_BINS = new Set(Object.values(CARD_BINS));

function hasKnownRegisterBin(number = '') {
  return Array.from(REGISTER_BINS).some((bin) => String(number).startsWith(bin));
}

export function normalizeCardNumber(value = '') {
  return String(value).replace(/\D/g, '');
}

export function formatCardNumberInput(value = '') {
  const digits = normalizeCardNumber(value).slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

export function formatExpiryInput(value = '') {
  const digits = String(value).replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function parseExpiry(expiry = '') {
  const match = String(expiry).trim().match(/^(\d{2})\/(\d{2})$/);
  if (!match) return null;
  const month = parseInt(match[1], 10);
  const year = 2000 + parseInt(match[2], 10);
  if (month < 1 || month > 12) return null;
  return new Date(year, month, 0, 23, 59, 59);
}

export function validateRegisterForm(form, existingCards = []) {
  const errors = {};
  const number = normalizeCardNumber(form.cardNumber);
  const expiry = String(form.expiry ?? '').trim();

  if (number.length !== 16 || !hasKnownRegisterBin(number)) {
    errors.cardNumber = REGISTER_ERROR_MESSAGES.invalid_number;
  } else if (number === MOCK_FAIL_ACTIVATION_NUMBER) {
    errors.form = REGISTER_ERROR_MESSAGES.activation_failed;
  } else {
    const preissued = MOCK_PREISSUED_CARDS.find((c) => c.number === number);
    if (!preissued) {
      errors.cardNumber = REGISTER_ERROR_MESSAGES.not_found;
    } else if (existingCards.some((c) => c.last4 === preissued.last4)) {
      errors.cardNumber = REGISTER_ERROR_MESSAGES.duplicate;
    } else {
      const expDate = parseExpiry(expiry);
      if (!expDate) {
        errors.expiry = REGISTER_ERROR_MESSAGES.expiry_invalid;
      } else if (expDate < new Date()) {
        errors.expiry = REGISTER_ERROR_MESSAGES.expired;
      } else if (preissued.expiry && expiry !== preissued.expiry) {
        errors.expiry = 'Expiry date does not match this card.';
      }
    }
  }

  const pin = String(form.password ?? '');
  if (!/^\d{4}$/.test(pin)) {
    errors.password = REGISTER_ERROR_MESSAGES.password_weak;
  }
  if (pin !== String(form.confirmPassword ?? '')) {
    errors.confirmPassword = REGISTER_ERROR_MESSAGES.password_mismatch;
  }

  return errors;
}

/**
 * Mock activation — returns resolved card payload on success.
 * @returns {Promise<{ ok: true, card: object } | { ok: false, code: string, message: string }>}
 */
export function activatePreissuedCard(form, existingCards = []) {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      const errors = validateRegisterForm(form, existingCards);
      const firstError = errors.form
        ?? errors.cardNumber
        ?? errors.expiry
        ?? errors.password
        ?? errors.confirmPassword;

      if (firstError) {
        const code = errors.form
          ? 'activation_failed'
          : errors.cardNumber?.includes('already')
            ? 'duplicate'
            : errors.cardNumber?.includes('not found')
              ? 'not_found'
              : errors.cardNumber
                ? 'invalid_number'
                : errors.expiry?.includes('expired')
                  ? 'expired'
                  : 'activation_failed';
        resolve({ ok: false, code, message: firstError, fieldErrors: errors });
        return;
      }

      const number = normalizeCardNumber(form.cardNumber);
      const preissued = MOCK_PREISSUED_CARDS.find((c) => c.number === number);

      resolve({
        ok: true,
        card: {
          id: `card-reg-${preissued.last4}-${Date.now()}`,
          last4: preissued.last4,
          variant: preissued.variant,
          label: preissued.label,
          status: 'active',
          balance: '$0.00',
          network: 'Visa',
          isPrimary: existingCards.length === 0,
        },
      });
    }, 900);
  });
}
