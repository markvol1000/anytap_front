// ===== Card Constants =====
// Card-related business rules and display config.
// BIN numbers and network names must not be exposed to end users (internal only).

/** Max cards a user can hold simultaneously */
export const MAX_CARDS_PER_USER = 999;

/** Fee charged at card issuance — TODO: fetch from Wasabi API config */
export const CARD_ISSUANCE_FEES = {
  virtual: { amount: 20, currency: 'USDT' },
  physical: { amount: 100, currency: 'USDT' },
} as const;

/** @deprecated use getCardIssuanceFee(cardType) */
export const CARD_ISSUANCE_FEE = CARD_ISSUANCE_FEES.physical;

export function getCardIssuanceFee(cardType: keyof typeof CARD_ISSUANCE_FEES = 'physical') {
  return CARD_ISSUANCE_FEES[cardType] ?? CARD_ISSUANCE_FEES.physical;
}

/** Card theme mapping: virtual = light (white card), physical = dark (black card) */
export const CARD_THEME: Record<'virtual' | 'physical', 'dark' | 'light'> = {
  virtual: 'light',
  physical: 'dark',
};

/** Brand label shown on card face */
export const CARD_BRAND_LABEL = 'Anytap Visa';

/** Network — Visa only (no Mastercard branding in UI) */
export const CARD_NETWORK = 'Visa' as const;
