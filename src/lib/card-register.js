/** B2B pre-issued card registration — validation helpers (Real API-driven). */

import { CARD_BINS } from './card-application.js';
import { bindExistingCard } from './services/account/accountApi.js';

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

  if (number.length !== 16) {
    errors.cardNumber = REGISTER_ERROR_MESSAGES.invalid_number;
  } else {
    const expDate = parseExpiry(expiry);
    if (!expDate) {
      errors.expiry = REGISTER_ERROR_MESSAGES.expiry_invalid;
    } else if (expDate < new Date()) {
      errors.expiry = REGISTER_ERROR_MESSAGES.expired;
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
 * Real activation — calls backend API to bind the card.
 * @returns {Promise<{ ok: true, card: object } | { ok: false, code: string, message: string }>}
 */
export async function activatePreissuedCard(form, existingCards = []) {
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
        : errors.cardNumber
          ? 'invalid_number'
          : errors.expiry?.includes('expired')
            ? 'expired'
            : 'activation_failed';
    return { ok: false, code, message: firstError, fieldErrors: errors };
  }

  try {
    const res = await bindExistingCard(form);
    const number = normalizeCardNumber(form.cardNumber);
    const last4 = number.slice(-4);
    
    // Determine card variant by card BIN rules
    const variant = number.startsWith('493875') ? 'virtual' : 'physical';
    const label = variant === 'virtual' ? 'Virtual Card' : 'Physical Card';
    
    return {
      ok: true,
      card: {
        id: res?.data?.cardId || `card-reg-${last4}-${Date.now()}`,
        last4: last4,
        variant: variant,
        label: label,
        status: 'active',
        balance: '$0.00',
        network: 'Visa',
        isPrimary: existingCards.length === 0,
      },
    };
  } catch (err) {
    const fallbackMsg = 'Failed to bind card. Please check the card details and try again.';
    const errMsg = err?.message || err?.response?.data?.message || fallbackMsg;
    return {
      ok: false,
      code: 'activation_failed',
      message: errMsg.includes('Exception') ? fallbackMsg : errMsg,
    };
  }
}
