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
  return record?.authorizedCurrency
    || record?.settleCurrency
    || (record?.kind === 'card_spend' || record?.kind === 'refund' || record?.kind === 'reversal' ? 'USD' : 'USDT');
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
  const s = String(status).toLowerCase();
  if (['failed', 'fail', 'declined', 'rejected', 'cancelled', 'canceled'].some((k) => s.includes(k))) {
    return 'failed';
  }
  if (['wait_process', 'processing'].some((k) => s.includes(k)) || (s.includes('pending') && !s.includes('authorized'))) {
    return 'pending';
  }
  if (s.includes('success') || s.includes('complete') || s.includes('settled') || s.includes('authorized') || s.includes('succeed')) {
    return 'completed';
  }
  if (String(type).toLowerCase().includes('auth')) return 'completed';
  return 'completed';
}

function isIncomingKind(kind) {
  return kind === 'refund' || kind === 'reversal' || kind === 'card_topup';
}

/**
 * @param {object} record — single Wasabi / backend transaction row
 * @param {{ last4?: string }} [opts]
 */
export function mapWasabiTransactionRecord(record, opts = {}) {
  if (!record || typeof record !== 'object') return null;

  const kind = mapWasabiType(record.type || record.tradeType || record.transactionType);
  const status = mapWasabiStatus(record.status, record.type);
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
    reference: String(record.tradeNo || record.transactionId || record.orderNo || id),
    cardNo: String(record.cardNo || opts.cardId || opts.wasabiCardId || ''),
    cardLast4: pickLast4(record, opts.last4 || '') || opts.last4 || '',
    cardNetwork: 'Visa',
    cardScheme: 'visa',
  };
}

/**
 * @param {object} payload — { total, records } from GET /cards/{userId}/transactions
 * @param {{ last4?: string }} [opts]
 */
export function mapWasabiTransactionsResponse(payload, opts = {}) {
  const rawData = payload?.data ?? payload;
  const records = Array.isArray(rawData)
    ? rawData
    : (rawData?.records || rawData?.list || rawData?.data?.records || rawData?.data?.list || rawData?.data || []);

  return records
    .map((row) => {
      const item = mapWasabiTransactionRecord(row, opts);
      if (item && !item.cardLast4 && opts.last4) {
        item.cardLast4 = opts.last4;
      }
      return item;
    })
    .filter(Boolean);
}
