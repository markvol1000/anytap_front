/**
 * Map Wasabi card transaction API records → portal activity items.
 * Backend wraps Wasabi: { total, records: WasabiTransaction[] }
 */

function pickAmount(record) {
  const raw = record?.amount
    ?? record?.authorizedAmount
    ?? record?.settleAmount
    ?? record?.receivedAmount
    ?? 0;
  return Math.abs(Number(raw) || 0);
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
  return record?.merchantName
    || record?.merchantData?.name
    || record?.description
    || record?.title
    || record?.type
    || 'Card transaction';
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
  if (t.includes('deposit') || t.includes('create') || t.includes('topup') || t.includes('top_up')) {
    return 'card_topup';
  }
  return 'card_spend';
}

function mapWasabiStatus(status = '', type = '') {
  const s = String(status).toLowerCase();
  if (['failed', 'fail', 'declined', 'rejected', 'cancelled', 'canceled'].some((k) => s.includes(k))) {
    return 'failed';
  }
  if (['pending', 'wait_process', 'processing', 'authorized'].some((k) => s.includes(k))) {
    return 'pending';
  }
  if (s.includes('success') || s.includes('complete') || s.includes('settled')) return 'completed';
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
    incoming,
    failed: status === 'failed',
    kind,
    status,
    reference: String(record.tradeNo || record.transactionId || record.orderNo || id),
    cardLast4: pickLast4(record, opts.last4 || ''),
    cardNetwork: 'Visa',
    cardScheme: 'visa',
  };
}

/**
 * @param {object} payload — { total, records } from GET /cards/{userId}/transactions
 * @param {{ last4?: string }} [opts]
 */
export function mapWasabiTransactionsResponse(payload, opts = {}) {
  const records = Array.isArray(payload)
    ? payload
    : (payload?.records || payload?.list || payload?.data || []);

  return records
    .map((row) => mapWasabiTransactionRecord(row, opts))
    .filter(Boolean);
}
