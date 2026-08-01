/**
 * Card display utilities — masking, formatting, status badges.
 * Pure functions: no mock data, no side effects.
 */

/** Official Visa BINs — not user-selectable */
export const CARD_BINS = {
  virtual: '493875',
  physical: '493724',
};

/** Official Anytap card background — chip + Visa baked in (_bg artwork) */
export const CARD_IMAGES = {
  virtual: '/assets/cards/white_card_bg.png',
  physical: '/assets/cards/black_card_bg.png',
};

/** Alias — same paths as {@link CARD_IMAGES} */
export const CARD_BG_IMAGES = {
  virtual: CARD_IMAGES.virtual,
  physical: CARD_IMAGES.physical,
};

export const CARD_VARIANTS = {
  virtual: { label: 'Virtual Visa Card', network: 'Visa', scheme: 'visa' },
  physical: { label: 'Physical Visa Card', network: 'Visa', scheme: 'visa' },
};

// ─── Number masking ───────────────────────────────────────────────────────────

export function maskCardFull(last4) {
  return `**** **** **** ${last4}`;
}

export function maskCardShort(last4) {
  return `**** ${last4}`;
}

export function maskCardWithBin(card) {
  const last4 = card?.last4 ?? '0000';
  const bin = CARD_BINS[card?.variant ?? 'virtual'] ?? CARD_BINS.virtual;
  return `${bin.slice(0, 4)} ${bin.slice(4, 6)}•• ••••${last4}`;
}

export function maskCardEnding(card) {
  const last4 = card?.last4 ?? '0000';
  return `Visa ••••${last4}`;
}

// ─── Label helpers ────────────────────────────────────────────────────────────

export function cardBrandLabel() {
  return 'Anytap Visa';
}

export function cardVariantLabel(card) {
  if (!card) return '';
  return card.variant === 'virtual' ? 'Virtual Visa' : 'Physical Visa';
}

export function cardKindLabel(card) {
  if (!card) return '';
  return cardBrandLabel();
}

export function cardPrepaidKindLabel(card) {
  if (!card) return '';
  const variant = card.variant === 'physical' ? 'PHYSICAL' : 'VIRTUAL';
  return `${variant} · DEBIT`;
}

export function maskCardDots(last4) {
  return `•••• ${last4 ?? '0000'}`;
}

/** Dashboard / carousel — last four only */
export function maskCardDashboard(last4) {
  return maskCardDots(last4);
}

/** Card details — full masked PAN */
export function formatCardNumberMasked(last4) {
  if (!last4) return '—';
  return `•••• •••• •••• ${last4}`;
}

/** Card details — spaced expiry (MM / YY) */
export function formatExpiryDisplay(expiry) {
  if (!expiry) return '—';
  const parts = String(expiry).split('/');
  if (parts.length !== 2) return expiry;
  return `${parts[0].trim()} / ${parts[1].trim()}`;
}

/** Remaining daily spend headroom */
export function getCardAvailableLimit(card) {
  if (!card) return 0;
  if (typeof card.availableLimit === 'number') return Math.max(0, card.availableLimit);
  const limits = getCardLimitsSummary(card);
  if (!limits) return 0;
  return Math.max(0, limits.dailySpend.limit - limits.dailySpend.used);
}

export function formatAvailableLimit(card) {
  const available = getCardAvailableLimit(card);
  return `${available.toLocaleString('en-US')} USD`;
}

export function shortenWalletAddress(address) {
  if (!address) return '—';
  const raw = String(address).trim();
  if (raw.length <= 13) return raw;
  return `${raw.slice(0, 6)}...${raw.slice(-4)}`;
}

export function formatIssuedDate(card) {
  const raw = card?.issuedAt;
  if (!raw) return '—';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

export function cardDebitTypeLabel(card) {
  if (!card) return '';
  return card.variant === 'physical' ? 'PHYSICAL · DEBIT' : 'VIRTUAL · DEBIT';
}

/** Spending balance on card face — always USD */
export function formatCardSpendingBalance(card) {
  if (!card) return '$0.00';
  let val;
  if (typeof card.balanceUsdt === 'number') {
    val = card.balanceUsdt;
  } else if (card.balance) {
    const stripped = String(card.balance).replace(/[^\d.]/g, '');
    val = parseFloat(stripped);
  }
  if (val == null || Number.isNaN(val)) return '$0.00';
  return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Spending balance numeric part (no $ prefix) */
export function formatCardSpendingBalanceValue(card) {
  return formatCardSpendingBalance(card).replace(/^\$/, '');
}

export function getCardStatusDisplay(card) {
  const base = getCardStatusBadge(card);
  if (card?.status === 'frozen') {
    return { ...base, label: 'FROZEN' };
  }
  if (['creating', 'shipping'].includes(card?.status)) {
    return { label: 'CARD ISSUING...', dot: '#F6C77A', text: '#C2860E' };
  }
  if (card?.status === 'pending_activation' || card?.status === 'pending_active') {
    return { label: 'ACTIVATING...', dot: '#F6C77A', text: '#C2860E' };
  }
  return { ...base, label: base.label.toUpperCase() };
}

/** Card limits summary — demo values from card record; no top-up max */
export function getCardLimitsSummary(card) {
  if (!card) return null;

  const dailyLimit = card.dailySpendLimit ?? 2000;
  const atmLimit = card.atmDailyLimit ?? 500;
  const dailyUsed = card.dailySpendUsed ?? 0;
  const atmUsed = card.atmDailyUsed ?? 0;

  return {
    dailySpend: { limit: dailyLimit, used: dailyUsed },
    atmWithdrawal: { limit: atmLimit, used: atmUsed },
    cardType: {
      variant: card.variant === 'physical' ? 'Physical' : 'Virtual',
      kind: 'Debit',
    },
  };
}

export function formatLimitUsd(amount) {
  return `$${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function cardTypeLine(card) {
  if (!card) return '';
  return cardVariantLabel(card);
}

// ─── Balance formatting ───────────────────────────────────────────────────────

/** Card overlay balance — `$ 250.00` */
export function formatCardBalance(balance) {
  if (!balance) return '';
  const raw = String(balance).trim();
  if (/USDT/i.test(raw)) return raw;
  const stripped = raw.replace(/^\$?\s*/, '').replace(/,/g, '');
  const val = parseFloat(stripped);
  if (Number.isNaN(val)) return balance;
  return `$ ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Status display ───────────────────────────────────────────────────────────

export function getCardStatusBadge(card) {
  const map = {
    active:             { label: 'Active',     dot: '#7DE0AC', text: '#38A169' },
    issued:             { label: 'Issued',     dot: '#F6C77A', text: '#C2860E' },
    frozen:             { label: 'Frozen',     dot: '#EB5757', text: '#EB5757' },
    shipping:           { label: 'Shipping',   dot: '#F6C77A', text: '#C2860E' },
    pending_activation: { label: 'Activating', dot: '#F6C77A', text: '#C2860E' },
    pending_active:     { label: 'Activating', dot: '#F6C77A', text: '#C2860E' },
  };
  return map[card?.status] ?? { label: 'Inactive', dot: '#C4C9D1', text: '#9298A4' };
}

// ─── Dashboard mask helpers ───────────────────────────────────────────────────

export function dashboardCardMask(cardStatusDef, card, dimmed) {
  if (dimmed || !card || !cardStatusDef.showCardLast4) return null;
  if (cardStatusDef.cardMask === 'full' || card.status === 'issued') {
    return maskCardFull(card.last4);
  }
  return maskCardShort(card.last4);
}

export function cardMaskFor(card, accountCardStatus) {
  if (!card) return null;
  if (card.status === 'issued' || accountCardStatus === 'issued') return maskCardFull(card.last4);
  return maskCardShort(card.last4);
}
