/**
 * Resolve display values — http mode never falls back to design mock constants.
 */

import { isHttpApi } from './config.js';
import { ADDRESS } from '../account-data.js';
import { MOCK_WALLET_BALANCE } from '../../utils/wallet-data.js';

export function resolveWalletBalance(balance) {
  if (balance != null && balance !== '') {
    const n = Number(balance);
    return Number.isFinite(n) ? n : 0;
  }
  return isHttpApi ? 0 : MOCK_WALLET_BALANCE;
}

export function resolveWalletAddress(address) {
  const value = String(address || '').trim();
  if (value) return value;
  return isHttpApi ? '' : ADDRESS;
}

export function resolveUnreadNotifications(count) {
  if (isHttpApi) return 0;
  return count ?? 0;
}
