/**
 * Map Wasabi card transaction API records → portal activity items.
 * Backend wraps Wasabi: { total, records: WasabiTransaction[] }
 */

function pickAmount(record) {
  const raw = record?.authorizedAmount
    ?? record?.settleAmount
    ?? record?.amount
    ?? record?.receivedAmount
    ?? 0;
  return Math.abs(Number(raw) || 0);
}

function pickCurrency(record) {
  const explicitCurr = record?.currency 
    || record?.originalCurrency 
    || record?.authorizedCurrency 
    || record?.settleCurrency;
  if (explicitCurr && String(explicitCurr).trim()) {
    return String(explicitCurr).trim().toUpperCase();
  }
  return (record?.kind === 'card_spend' || record?.kind === 'refund' || record?.kind === 'reversal' ? 'USD' : 'USDT');
}

function pickTimestamp(record) {
  const raw = record?.transactionTime
    ?? record?.tradeTime
    ?? record?.createdAt
    ?? record?.occurredAt;
  if (raw == null) return new Date().toISOString();
  if (typeof raw === 'number') {
    const ms = raw < 1e12 ? raw * 1000 : raw;
    return new Date(ms).toISOString();
  }
  if (typeof raw === 'string' && /^\d+$/.test(raw)) {
    const num = Number(raw);
    const ms = num < 1e12 ? num * 1000 : num;
    return new Date(ms).toISOString();
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function pickTitle(record) {
  const candidate = record?.merchantName
    || record?.merchantData?.name;
  if (candidate && !['SUCCESS', 'FAIL', 'FAILED', 'PENDING', 'CREATE', 'CARD_UPDATE', 'UPDATE_PIN', 'FREEZE', 'UNFREEZE'].includes(String(candidate).toUpperCase().trim())) {
    return candidate;
  }
  const typeStr = String(record?.type || record?.tradeType || record?.transactionType || '').toLowerCase();
  const subTypeStr = String(record?.subType || '').toLowerCase();
  if (typeStr.includes('update_pin') || subTypeStr.includes('update_pin') || typeStr.includes('reset pin')) return 'Reset PIN';
  if (typeStr.includes('unfreeze') || subTypeStr.includes('unfreeze')) return 'UnFreeze';
  if (typeStr.includes('freeze') || subTypeStr.includes('freeze')) return 'Freeze';
  if (typeStr.includes('card_update') || typeStr.includes('card update')) return 'Card Update';
  if (typeStr.includes('create')) return 'Create Card';
  if (typeStr.includes('topup') || typeStr.includes('deposit')) return 'Card Top Up';
  if (typeStr.includes('refund')) return 'Refund';
  if (typeStr.includes('reversal')) return 'Reversal';
  if (record?.description) return record.description;
  return 'Card Purchase';
}

function pickLast4(record, fallbackLast4 = '') {
  const cardNo = String(record?.cardNo || record?.balanceInfo?.cardNo || '');
  if (cardNo) {
    const digits = cardNo.replace(/\D/g, '');
    if (digits.length >= 4) return digits.slice(-4);
    return cardNo.slice(-4);
  }
  return fallbackLast4;
}

function mapWasabiType(type = '') {
  const t = String(type).toLowerCase();
  if (t.includes('refund')) return 'refund';
  if (t.includes('reversal') || t.includes('reverse')) return 'reversal';
  if (t.includes('deposit') || t.includes('topup') || t.includes('top_up')) {
    return 'card_topup';
  }
  return 'card_spend';
}

function mapWasabiStatus(status = '', type = '') {
  if (status == null) status = '';
  const s = String(status).toLowerCase().trim();

  if (['00', '0', 'success', 'completed', 'settled', 'authorized', 'succeed', 'approved', 'ok'].includes(s)) {
    return 'completed';
  }
  if (['1', '99', 'fail', 'failed', 'declined', 'rejected', 'error', 'denied'].includes(s)) {
    return 'failed';
  }
  if (s.includes('success') || s.includes('complete') || s.includes('settle') || s.includes('authorize') || s.includes('succeed') || s.includes('approve')) {
    return 'completed';
  }
  if (s.includes('fail') || s.includes('declin') || s.includes('reject') || s.includes('deni') || s.includes('cancel')) {
    return 'failed';
  }
  if (s.includes('wait') || s.includes('process') || s.includes('pending')) {
    return 'pending';
  }
  if (String(type).toLowerCase().includes('auth')) return 'completed';
  return 'completed';
}

function isIncomingKind(kind) {
  return kind === 'refund' || kind === 'reversal';
}

/**
 * @param {object} record — single Wasabi / backend transaction row
 * @param {{ last4?: string }} [opts]
 */
export function mapWasabiTransactionRecord(record, opts = {}) {
  if (!record || typeof record !== 'object') return null;

  const rawStatusVal = record.status ?? record.tradeStatus ?? record.authStatus ?? record.state ?? record.respCode ?? record.result;
  const kind = mapWasabiType(record.type || record.tradeType || record.transactionType);
  const status = mapWasabiStatus(rawStatusVal, record.type || record.tradeType || record.transactionType);
  const incoming = record.incoming != null ? !!record.incoming : isIncomingKind(kind);
  const id = String(
    record.tradeNo
    || record.transactionId
    || record.id
    || record.orderNo
    || `tx-${pickTimestamp(record)}-${pickTitle(record)}`,
  );

  return {
    id,
    title: pickTitle(record),
    at: pickTimestamp(record),
    amount: pickAmount(record),
    currency: pickCurrency(record),
    originalAmount: record.amount != null ? Math.abs(Number(record.amount) || 0) : undefined,
    originalCurrency: record.currency || undefined,
    incoming,
    failed: status === 'failed',
    kind,
    status,
    rawStatus: rawStatusVal ? String(rawStatusVal).toLowerCase() : (kind === 'card_spend' ? 'authorized' : 'completed'),
    authorizedAmount: record.authorizedAmount != null ? Math.abs(Number(record.authorizedAmount) || 0) : undefined,
    authorizedCurrency: record.authorizedCurrency || 'USD',
    reference: String(record.tradeNo || record.transactionId || record.orderNo || id),
    cardNo: String(record.cardNo || record.balanceInfo?.cardNo || opts.cardId || opts.wasabiCardId || ''),
    cardLast4: pickLast4(record, opts.last4 || '') || opts.last4 || '',
    cardNetwork: 'Visa',
    cardScheme: 'visa',
  };
}

function isSameCardNumber(rowCardNo, targetCardId) {
  if (!rowCardNo || !targetCardId) return true;
  const r = String(rowCardNo).trim();
  const t = String(targetCardId).trim();
  if (r === t || r.toLowerCase() === t.toLowerCase()) return true;

  const rDigits = r.replace(/\D/g, '');
  const tDigits = t.replace(/\D/g, '');

  if (rDigits && tDigits) {
    if (rDigits === tDigits) return true;
    const rLast4 = rDigits.length >= 4 ? rDigits.slice(-4) : rDigits;
    const tLast4 = tDigits.length >= 4 ? tDigits.slice(-4) : tDigits;
    if (rLast4 && tLast4 && rLast4 === tLast4) return true;
  }

  const rLast4 = rDigits.length >= 4 ? rDigits.slice(-4) : r.slice(-4);
  const tLast4 = tDigits.length >= 4 ? tDigits.slice(-4) : t.slice(-4);
  if (rLast4 && tLast4 && rLast4 === tLast4 && (r.includes('*') || t.includes('*') || t.length <= 4 || r.length <= 4)) {
    return true;
  }

  if (!rDigits || !tDigits) return true;

  return false;
}

/**
 * @param {object} payload — { total, records } from GET /cards/{userId}/transactions
 * @param {{ last4?: string, cardId?: string }} [opts]
 */
export function mapWasabiTransactionsResponse(payload, opts = {}) {
  const rawData = payload?.data ?? payload;
  const records = Array.isArray(rawData)
    ? rawData
    : (rawData?.records || rawData?.list || rawData?.data?.records || rawData?.data?.list || rawData?.data || []);

  return records
    .map((row) => {
      const item = mapWasabiTransactionRecord(row, opts);
      if (item && (!item.cardLast4 || item.cardLast4.length === 0) && opts.last4) {
        item.cardLast4 = opts.last4;
      }
      return item;
    })
    .filter(Boolean);
}
