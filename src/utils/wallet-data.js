/** Mock wallet constants and formatting helpers. */

export const MOCK_WALLET_BALANCE = 2480.5;
export const MIN_TOPUP = 50;
export const MIN_SEND = 50;
export const GAS_FEE_CHARGE = 3;
export const CARD_CHARGE_FEE_RATE = 0.02;
export const GAS_FEE_SEND = 3;
export const QUICK_AMOUNTS = [50, 100, 200, 500];
export const WALLET_NETWORK = 'TRC-20 (TRON)';
export const MIN_DEPOSIT_LABEL = '10 USDT';

/** Mock address returned when QR scan succeeds (TRC-20) */
export const MOCK_SCAN_ADDRESS = 'TXkR9n2pQ4mL8vW6sY1aB3cD5eF7gH9j';

/** Issuance fee deposit — shown after card apply until shipping starts */
export const ISSUANCE_DEPOSIT_AMOUNT = 100;
export const ISSUANCE_DEPOSIT_CURRENCY = 'USDT';
/** Mock TRC-20 address for $100 issuance fee (until API provides issuanceDepositAddress) */
export const MOCK_ISSUANCE_DEPOSIT_ADDRESS = '';
export const ISSUANCE_DEPOSIT_CARD_STATUSES = [
  'application_review',
  'applied',
  'deposit_received',
  'creating',
];

export function showsIssuanceDepositWallet(cardStatus) {
  return ISSUANCE_DEPOSIT_CARD_STATUSES.includes(String(cardStatus || ''));
}

export function resolveIssuanceDepositAddress(accountState = {}) {
  if (!showsIssuanceDepositWallet(accountState.cardStatus)) return '';
  const fromApi = String(accountState.issuanceDepositAddress || '').trim();
  return fromApi || MOCK_ISSUANCE_DEPOSIT_ADDRESS;
}

export function resolveIssuanceDepositAmount(accountState = {}) {
  if (!showsIssuanceDepositWallet(accountState.cardStatus)) return null;
  const n = Number(accountState.issuanceDepositAmount);
  return Number.isFinite(n) && n > 0 ? n : ISSUANCE_DEPOSIT_AMOUNT;
}

export function parseCardBalanceUsdt(balance) {
  if (!balance) return '0.00';
  const match = String(balance).match(/[\d,.]+/);
  if (!match) return '0.00';
  return parseFloat(match[0].replace(/,/g, '')).toFixed(2);
}

export function formatUsdtAmount(amount, { hidden = false } = {}) {
  if (hidden) return '••••••';
  const n = typeof amount === 'string' ? parseFloat(amount.replace(/,/g, '')) : amount;
  if (Number.isNaN(n)) return '0.00';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** USDT ≈ USD display for wallet summary */
export function formatUsdApprox(amount, { hidden = false } = {}) {
  if (hidden) return '≈ •••••• USD';
  const n = typeof amount === 'string' ? parseFloat(amount.replace(/,/g, '')) : amount;
  if (Number.isNaN(n)) return '≈ $0 USD';
  return `≈ $${Math.floor(n).toLocaleString('en-US')} USD`;
}

export function maskAddress(addr, head = 6, tail = 4) {
  if (!addr || addr.length <= head + tail) return addr ?? '';
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export function topUpCtaLabel(amount) {
  const v = parseFloat(amount);
  if (!Number.isNaN(v) && v >= MIN_TOPUP) return `Top Up ${v.toFixed(2)} USDT`;
  return 'Top Up Card';
}

export function hasTopUpAmountEntered(amount) {
  const trimmed = String(amount ?? '').trim();
  if (!trimmed) return false;
  const v = parseFloat(trimmed);
  return !Number.isNaN(v) && v > 0;
}

export function isValidTopUp(amount) {
  const v = parseFloat(amount);
  return !Number.isNaN(v) && v >= MIN_TOPUP;
}

export function isValidSend(amount, available = MOCK_WALLET_BALANCE) {
  const v = parseFloat(amount);
  return !Number.isNaN(v) && v >= MIN_SEND && (v + GAS_FEE_SEND) <= available;
}

export function isValidTronAddress(address) {
  const trimmed = String(address || '').trim();
  return /^T[a-zA-Z0-9]{33}$/.test(trimmed);
}
