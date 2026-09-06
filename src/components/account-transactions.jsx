// ===== Transactions Page =====
// Full history — filters + responsive table/list
// TODO: Replace mock data with Cregis + Wasabi APIs

import { useMemo, useState, useEffect, useCallback } from 'react';
import { Icon } from './ui.jsx';
import { ActivityAmount, ActivityRow, ActivityScopeTabBar } from './account-activity.jsx';
import { AccountReferral } from './account-referral.jsx';
import { isHttpApi } from '../lib/api/config.js';
import { getHttpSession, hasHttpSession } from '../lib/api/httpSession.js';
import { fetchCardTransactions } from '../lib/services/account/accountApi.js';
import * as A from '../lib/account-data.js';

function TxIcon({ tx }) {
  const status = A.getActivityStatus(tx);
  const icVariant = A.getActivityIconVariant(tx);

  return (
    <span className={`portal-tx__ic portal-tx__ic--${icVariant}`} aria-hidden="true">
      {status === 'failed' ? (
        <Icon name="xCircle" size={20} stroke={2} />
      ) : status === 'pending' ? (
        <Icon name="clock" size={18} stroke={2} />
      ) : icVariant === 'reward' ? (
        <Icon name="gift" size={18} stroke={2} />
      ) : icVariant === 'refund' ? (
        <Icon name="download" size={18} stroke={2} />
      ) : icVariant === 'deposit' ? (
        <Icon name="download" size={18} stroke={2} />
      ) : (
        <Icon name="arrowUpRight" size={18} stroke={2} />
      )}
    </span>
  );
}

function TxStatusBadge({ status }) {
  return (
    <span className={`portal-tx-feed__status portal-tx-feed__status--${status}`}>
      {A.formatActivityStatusLabel(status)}
    </span>
  );
}

function TransactionsToolbar({
  dateRange,
  onDateRangeChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  status,
  onStatusChange,
  searchQuery,
  onSearchQueryChange,
  scope,
  cards = [],
  selectedCardId = 'all',
  onCardChange,
}) {
  return (
    <div className="portal-tx-panel__toolbar">
      <div className="portal-tx-page__toolbar">
        <div className="portal-tx-page__toolbar-row portal-tx-page__toolbar-row--filters">
          {cards && cards.length > 0 && scope === 'card' && (
            <div className="portal-tx-page__toolbar-card">
              <label className="portal-tx-page__field portal-tx-page__field--card-select">
                <span className="portal-tx-page__field-label">Card</span>
                <select
                  className="portal-tx-page__select"
                  value={selectedCardId}
                  onChange={(e) => onCardChange?.(e.target.value)}
                  aria-label="Select card">
                  <option value="all">All Cards</option>
                  {cards.map((c) => {
                    const last4 = c.last4 || (c.cardNo ? c.cardNo.slice(-4) : '');
                    const label = `${c.variant === 'physical' ? 'Physical' : 'Virtual'} Card${last4 ? ` (*${last4})` : ''}`;
                    const val = c.wasabiCardId || c.cardNo || c.id || c.last4;
                    return (
                      <option key={c.id || val} value={val}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </label>
            </div>
          )}

          <div className="portal-tx-page__toolbar-date">
            <label className="portal-tx-page__field portal-tx-page__field--date-range">
              <span className="portal-tx-page__field-label">Date</span>
              <select
                className="portal-tx-page__select"
                value={dateRange}
                onChange={(e) => onDateRangeChange(e.target.value)}
                aria-label="Date range">
                {A.TX_DATE_RANGES.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </label>
            {dateRange === 'custom' && (
              <>
                <label className="portal-tx-page__field portal-tx-page__field--date">
                  <span className="portal-tx-page__field-label">From</span>
                  <input
                    type="date"
                    className="portal-tx-page__input"
                    value={customFrom}
                    onChange={(e) => onCustomFromChange(e.target.value)}
                    aria-label="Custom range from"
                  />
                </label>
                <label className="portal-tx-page__field portal-tx-page__field--date">
                  <span className="portal-tx-page__field-label">To</span>
                  <input
                    type="date"
                    className="portal-tx-page__input"
                    value={customTo}
                    onChange={(e) => onCustomToChange(e.target.value)}
                    aria-label="Custom range to"
                  />
                </label>
              </>
            )}
          </div>

          <div
            className="portal-tx-filters portal-tx-filters--status portal-tx-filters--compact"
            role="tablist"
            aria-label="Transaction status">
            {A.TX_STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={status === f.id}
                className={`portal-tx-filters__chip${status === f.id ? ' is-active' : ''}`}
                onClick={() => onStatusChange(f.id)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="portal-tx-page__toolbar-row portal-tx-page__toolbar-row--search">
          <label className="portal-tx-page__field portal-tx-page__field--search">
            <span className="portal-tx-page__field-label visually-hidden">Search</span>
            <div className="portal-tx-search-wrap">
              <span className="portal-tx-search-icon" aria-hidden="true">
                <Icon name="search" size={15} stroke={2} />
              </span>
              <input
                type="search"
                className="portal-tx-page__input portal-tx-page__input--search"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder="Search merchant, reference, transaction ID, or card number..."
                aria-label="Search merchant, reference, transaction ID, or card number"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="portal-tx-search-clear"
                  onClick={() => onSearchQueryChange('')}
                  aria-label="Clear search">
                  <Icon name="close" size={13} stroke={2} />
                </button>
              )}
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, children }) {
  return (
    <div className="portal-tx-detail__row">
      <dt className="portal-tx-detail__label">{label}</dt>
      <dd className="portal-tx-detail__value">{children}</dd>
    </div>
  );
}

function downloadTransactionJpg(tx, { displayTypeLabel, status, maskedCard, network, fromLoginId, toLoginId, isTransfer }) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const scale = 2; // 2x retina sharpness
  const width = 560;

  // Build rows matching the drawer exactly
  const rows = [];
  if (['card_spend', 'refund', 'reversal'].includes(tx.kind) && !isTransfer && A.getActivityMerchantLabel(tx) && A.getActivityMerchantLabel(tx) !== '—') {
    rows.push(['Merchant', A.getActivityMerchantLabel(tx)]);
  }
  rows.push(['Transaction Type', displayTypeLabel]);
  rows.push(['Amount', A.formatActivityAmount(tx.amount, tx.incoming, tx.kind, tx)]);
  rows.push(['Date & Time', A.formatActivityDateTime(tx.at)]);
  rows.push(['Status', A.formatActivityStatusLabel(status)]);

  if (fromLoginId || (isTransfer && toLoginId)) {
    rows.push(['From', fromLoginId || '—']);
  }
  if (toLoginId || (isTransfer && fromLoginId)) {
    rows.push(['To', toLoginId || '—']);
  }

  if (tx.remainingBalance != null && !Number.isNaN(tx.remainingBalance)) {
    rows.push(['Remaining Balance', `$${Number(tx.remainingBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`]);
  }

  rows.push(['Wallet / Card', A.getActivitySourceFullLabel(tx)]);

  if (maskedCard) {
    rows.push(['Card Number', maskedCard]);
  }

  if (tx.reference && tx.reference.trim() !== '' && tx.reference.trim() !== '—') {
    rows.push(['Reference Number', tx.reference.trim()]);
  }

  if (network) {
    rows.push(['Network', network]);
  }

  // Dimensions
  const paddingX = 36;
  const headerHeight = 72;
  const heroHeight = 114;
  const rowHeight = 36;
  const rowsHeight = rows.length * rowHeight;
  const footerHeight = 64;
  const height = headerHeight + heroHeight + rowsHeight + footerHeight + 40;

  canvas.width = width * scale;
  canvas.height = height * scale;
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Outer border
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.strokeRect(12, 12, width - 24, height - 24);

  // 1. Header (Brand)
  let curY = 46;
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'left';
  ctx.fillText('AnyTap', paddingX, curY);

  ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'right';
  ctx.fillText('TRANSACTION RECEIPT', width - paddingX, curY - 2);

  // Divider 1
  curY += 24;
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(paddingX, curY);
  ctx.lineTo(width - paddingX, curY);
  ctx.stroke();

  // 2. Hero Section
  curY += 28;
  ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'center';
  ctx.fillText(displayTypeLabel, width / 2, curY);

  curY += 34;
  ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const amountStr = A.formatActivityAmount(tx.amount, tx.incoming, tx.kind, tx);
  if (status === 'failed' || tx.failed) {
    ctx.fillStyle = '#dc2626';
  } else if (tx.incoming) {
    ctx.fillStyle = '#16a34a';
  } else {
    ctx.fillStyle = '#0f172a';
  }
  ctx.fillText(amountStr, width / 2, curY);

  // Status Pill Badge
  curY += 26;
  const statusLabel = A.formatActivityStatusLabel(status).toUpperCase();
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const textWidth = ctx.measureText(statusLabel).width;
  const badgeWidth = textWidth + 22;
  const badgeHeight = 22;
  const badgeX = (width - badgeWidth) / 2;
  const badgeY = curY - 14;

  let badgeBg = '#dcfce7';
  let badgeFg = '#15803d';
  if (status === 'failed' || tx.failed) {
    badgeBg = '#fee2e2';
    badgeFg = '#b91c1c';
  } else if (status === 'pending' || tx.pending) {
    badgeBg = '#fef3c7';
    badgeFg = '#b45309';
  }

  // Draw rounded pill
  ctx.fillStyle = badgeBg;
  ctx.beginPath();
  const radius = 11;
  ctx.moveTo(badgeX + radius, badgeY);
  ctx.lineTo(badgeX + badgeWidth - radius, badgeY);
  ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY, badgeX + badgeWidth, badgeY + radius);
  ctx.lineTo(badgeX + badgeWidth, badgeY + badgeHeight - radius);
  ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY + badgeHeight, badgeX + badgeWidth - radius, badgeY + badgeHeight);
  ctx.lineTo(badgeX + radius, badgeY + badgeHeight);
  ctx.quadraticCurveTo(badgeX, badgeY + badgeHeight, badgeX, badgeY + badgeHeight - radius);
  ctx.lineTo(badgeX, badgeY + radius);
  ctx.quadraticCurveTo(badgeX, badgeY, badgeX + radius, badgeY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = badgeFg;
  ctx.textAlign = 'center';
  ctx.fillText(statusLabel, width / 2, curY + 1);

  // Divider 2
  curY += 24;
  ctx.strokeStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.moveTo(paddingX, curY);
  ctx.lineTo(width - paddingX, curY);
  ctx.stroke();

  // 3. Detail Rows
  curY += 16;
  for (const [label, val] of rows) {
    curY += rowHeight;

    // Label
    ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'left';
    ctx.fillText(label, paddingX, curY);

    // Value
    ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'right';

    // Truncate value if too wide to avoid overlapping label
    let safeVal = String(val || '');
    const maxValWidth = width - (paddingX * 2) - 130;
    while (safeVal.length > 4 && ctx.measureText(safeVal).width > maxValWidth) {
      safeVal = safeVal.slice(0, -2) + '…';
    }
    ctx.fillText(safeVal, width - paddingX, curY);
  }

  // Divider 3
  curY += 20;
  ctx.strokeStyle = '#e2e8f0';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(paddingX, curY);
  ctx.lineTo(width - paddingX, curY);
  ctx.stroke();
  ctx.setLineDash([]);

  // 4. Footer
  curY += 22;
  ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'center';
  ctx.fillText('Official AnyTap Transaction Record · anytap.com', width / 2, curY);

  curY += 15;
  const genDate = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  ctx.font = '400 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(`Generated at: ${genDate}`, width / 2, curY);

  // Convert to Blob and trigger JPG download
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const refCode = (tx.reference || tx.txId || tx.id || Date.now()).toString().replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `anytap-transaction-${refCode}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/jpeg', 0.95);
}

export function TxDetailSheet({ tx, onClose }) {
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!tx) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [tx, onClose]);

  if (!tx) return null;

  const status = A.getActivityStatus(tx);
  const network = A.getActivityNetwork(tx);
  const maskedCard = A.getActivityMaskedCard(tx);

  const fromLoginId = tx.fromLoginId || tx.from_login_id || '';
  const toLoginId = tx.toLoginId || tx.to_login_id || '';

  const isTransfer = Boolean(
    fromLoginId ||
    toLoginId ||
    tx.kind === 'card_transfer_out' ||
    tx.kind === 'card_transfer_in' ||
    tx.kind === 'card_transfer' ||
    tx.kind === 'wallet_send' ||
    tx.kind === 'wallet_receive' ||
    String(tx.type || tx.txType || '').toUpperCase().includes('TRANSFER') ||
    String(tx.title || tx.description || '').toLowerCase().includes('transfer')
  );

  const displayTypeLabel = isTransfer
    ? (['card_spend', 'Card Purchase'].includes(tx.kind) || tx.typeLabel === 'Card Purchase'
        ? (tx.incoming ? 'Transfer Received' : 'Transfer Sent')
        : (tx.typeLabel || (tx.incoming ? 'Transfer Received' : 'Transfer Sent')))
    : (tx.typeLabel || 'Transaction');

  const handleDownloadJpg = () => {
    setIsDownloading(true);
    try {
      downloadTransactionJpg(tx, {
        displayTypeLabel,
        status,
        maskedCard,
        network,
        fromLoginId,
        toLoginId,
        isTransfer,
      });
    } catch (err) {
      console.error('[TxDetailSheet] Failed to generate transaction JPG', err);
    } finally {
      setTimeout(() => setIsDownloading(false), 600);
    }
  };

  return (
    <div className="portal-sheet portal-tx-detail" role="dialog" aria-modal="true" aria-label="Transaction details">
      <button type="button" className="portal-sheet__backdrop" onClick={onClose} aria-label="Close" />
      <div className="portal-sheet__panel portal-tx-detail__panel" style={{ maxHeight: 'min(96vh, 920px)', maxWidth: '500px' }}>
        <div className="portal-sheet__head">
          <h3 className="portal-sheet__title">Transaction Details</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="portal-sheet__close"
              onClick={handleDownloadJpg}
              title="Download Receipt (JPG)"
              aria-label="Download Receipt as JPG"
              disabled={isDownloading}
            >
              <Icon name="download" size={17} />
            </button>
            <button type="button" className="portal-sheet__close" onClick={onClose} aria-label="Close">
              <Icon name="close" size={18} />
            </button>
          </div>
        </div>

        <div className="portal-tx-detail__hero">
          <TxIcon tx={{ ...tx, typeLabel: displayTypeLabel, kind: isTransfer && tx.kind === 'card_spend' ? 'card_transfer_out' : tx.kind }} />
          <div className="portal-tx-detail__hero-body">
            <span className="portal-tx-detail__hero-type">{displayTypeLabel}</span>
            <ActivityAmount
              amount={tx.amount}
              incoming={tx.incoming}
              failed={tx.failed}
              kind={isTransfer && tx.kind === 'card_spend' ? 'card_transfer_out' : tx.kind}
              item={tx}
              large
            />
            <TxStatusBadge status={status} />
          </div>
        </div>

        <dl className="portal-tx-detail__list">
          {['card_spend', 'refund', 'reversal'].includes(tx.kind) && !isTransfer && A.getActivityMerchantLabel(tx) && A.getActivityMerchantLabel(tx) !== '—' && (
            <DetailRow label="Merchant">{A.getActivityMerchantLabel(tx)}</DetailRow>
          )}
          <DetailRow label="Transaction Type">{displayTypeLabel}</DetailRow>
          <DetailRow label="Amount">{A.formatActivityAmount(tx.amount, tx.incoming, tx.kind, tx)}</DetailRow>
          <DetailRow label="Date & Time">{A.formatActivityDateTime(tx.at)}</DetailRow>
          <DetailRow label="Status">
            <span className={`portal-tx-detail__status-badge portal-tx-detail__status-badge--${status}`}>
              {A.formatActivityStatusLabel(status)}
            </span>
          </DetailRow>

          {(fromLoginId || (isTransfer && toLoginId)) && (
            <DetailRow label="From">{fromLoginId || '—'}</DetailRow>
          )}
          {(toLoginId || (isTransfer && fromLoginId)) && (
            <DetailRow label="To">{toLoginId || '—'}</DetailRow>
          )}

          {tx.remainingBalance != null && !Number.isNaN(tx.remainingBalance) && (
            <DetailRow label="Remaining Balance">
              <span style={{ fontWeight: '600', color: '#2b6cb0' }}>
                ${Number(tx.remainingBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </span>
            </DetailRow>
          )}
          <DetailRow label="Wallet / Card">{A.getActivitySourceFullLabel(tx)}</DetailRow>
          {maskedCard && (
            <DetailRow label="Card Number">{maskedCard}</DetailRow>
          )}
          {tx.reference && tx.reference.trim() !== '' && tx.reference.trim() !== '—' && (
            <DetailRow label="Reference Number">{tx.reference}</DetailRow>
          )}

          {network && (
            <DetailRow label="Network">{network}</DetailRow>
          )}
        </dl>

        <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--portal-border, #eee)' }}>
          <button
            type="button"
            className="portal-btn portal-btn--primary"
            onClick={handleDownloadJpg}
            disabled={isDownloading}
            style={{
              width: '100%',
              height: '44px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '600',
              borderRadius: '10px',
              cursor: isDownloading ? 'wait' : 'pointer',
            }}
          >
            <Icon name="download" size={18} />
            <span>{isDownloading ? 'Generating JPG...' : 'Download Receipt (JPG)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export const TransactionDetailsDrawer = TxDetailSheet;

function TransactionsGroupedFeed({ items, onSelect }) {
  const groups = useMemo(() => A.groupActivityByDate(items), [items]);

  return (
    <div className="portal-tx-group-feed">
      {groups.map((group) => (
        <section key={group.key} className="portal-tx-group" aria-label={group.label}>
          <header className="portal-tx-group__head">
            <h3 className="portal-tx-group__title">{group.label}</h3>
            <div className="portal-tx-group__rule" aria-hidden="true" />
          </header>
          <ul className="portal-tx-group__list">
            {group.items.map((tx, idx) => {
              const rowWhenStyle = group.bucket === 'prior' ? 'grouped-row' : 'grouped-time';
              const itemKey = tx.id ? `${tx.id}_${tx.kind || ''}_${tx.at || ''}_${idx}` : `tx_${idx}`;
              return (
                <li key={itemKey}>
                  <ActivityRow
                    tx={tx}
                    dateStyle={rowWhenStyle}
                    variant="grouped"
                    onClick={() => onSelect(tx)}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function TransactionsPage({ items = [], initialScope = 'all', initialCardId = 'all', s }) {
  const [scope, setScope] = useState(initialScope);
  const [dateRange, setDateRange] = useState('90d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [status, setStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Owned user cards for selector dropdown
  const cards = useMemo(() => {
    if (s?.userCards && s.userCards.length > 0) return s.userCards;
    return A.resolveUserCards(s?.accountState || {});
  }, [s?.userCards, s?.accountState]);

  // Determine initial selected card ID
  const resolvedInitialCardId = useMemo(() => {
    if (initialCardId && initialCardId !== 'all') return initialCardId;
    if (initialScope === 'card' && s?.currentCard) {
      return s.currentCard.last4 || s.currentCard.id || s.currentCard.cardNo || 'all';
    }
    return 'all';
  }, [initialCardId, initialScope, s?.currentCard]);

  const [selectedCardId, setSelectedCardId] = useState(resolvedInitialCardId);
  const [selectedTx, setSelectedTx] = useState(null);
  const [copiedTxId, setCopiedTxId] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setScope(initialScope);
  }, [initialScope]);

  useEffect(() => {
    if (resolvedInitialCardId) {
      setSelectedCardId(resolvedInitialCardId);
    }
  }, [resolvedInitialCardId]);

  // Fetch fresh card transactions from API whenever selected card changes
  const [liveCardTxs, setLiveCardTxs] = useState(null);

  useEffect(() => {
    if (!isHttpApi || !hasHttpSession()) return undefined;
    const session = getHttpSession();
    if (!session?.userId) return undefined;

    let cancelled = false;

    // When scope is 'card' and a specific card is selected, fetch for that card.
    // When scope is 'all', fetch for all cards (empty cardId & last4).
    let cNo = '';
    let l4 = '';
    if (scope === 'card' && selectedCardId !== 'all') {
      const targetCard = cards.find(
        (c) => c.last4 === selectedCardId || c.id === selectedCardId || c.cardNo === selectedCardId || c.wasabiCardId === selectedCardId
      );
      cNo = targetCard ? String(targetCard.cardNo || targetCard.wasabiCardId || '') : selectedCardId;
      l4 = targetCard?.last4 || (cNo.replace(/\D/g, '').length >= 4 ? cNo.replace(/\D/g, '').slice(-4) : '');
    }

    fetchCardTransactions(session.userId, { cardId: cNo, last4: l4 })
      .then((res) => {
        if (!cancelled && res?.items) {
          setLiveCardTxs(res.items);
        }
      })
      .catch(() => {
        if (!cancelled) setLiveCardTxs(null);
      });

    return () => { cancelled = true; };
  }, [scope, selectedCardId, cards]);

  const activeItems = useMemo(() => {
    let list = items;
    if (liveCardTxs != null) {
      const localTxs = items.filter((item) => item.kind !== 'card_spend' && item.kind !== 'refund' && item.kind !== 'reversal');
      list = [...liveCardTxs, ...localTxs];
    }
    const seen = new Set();
    return list.filter((item) => {
      if (!item) return false;
      const sig = `${item.id || ''}_${item.kind || ''}_${item.at || ''}_${item.amount || ''}_${item.txId || ''}`;
      if (seen.has(sig)) return false;
      seen.add(sig);
      return true;
    });
  }, [items, liveCardTxs]);

  // Reset page to 1 when any filter changes
  useEffect(() => {
    setPage(1);
  }, [scope, dateRange, customFrom, customTo, status, searchQuery, selectedCardId]);

  const filtered = useMemo(
    () => A.applyTransactionFilters(activeItems, {
      scope,
      dateRange,
      customFrom,
      customTo,
      status,
      searchQuery,
      cardLast4: scope === 'card' ? selectedCardId : 'all',
      cardId: scope === 'card' ? selectedCardId : 'all',
    }),
    [activeItems, scope, dateRange, customFrom, customTo, status, searchQuery, selectedCardId],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize],
  );

  const handleCopyTxId = useCallback((txId) => {
    try { navigator.clipboard?.writeText(txId); } catch { /* noop */ }
    setCopiedTxId(txId);
    window.setTimeout(() => setCopiedTxId(''), 2000);
  }, []);

  const closeDetails = useCallback(() => setSelectedTx(null), []);

  return (
    <div className="portal-tx-page portal-pop">
      <div className={`portal-tx-panel portal-tx-panel--tab-${scope}`}>
        <ActivityScopeTabBar scope={scope} onScopeChange={setScope} />

        {scope === 'referral' ? (
          <div style={{ marginTop: '16px' }}>
            <AccountReferral s={s || {}} />
          </div>
        ) : (
          <div className="portal-tx-panel__surface" id="portal-tx-panel-surface">
          <TransactionsToolbar
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            customFrom={customFrom}
            customTo={customTo}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
            status={status}
            onStatusChange={setStatus}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            scope={scope}
            cards={cards}
            selectedCardId={selectedCardId}
            onCardChange={setSelectedCardId}
          />

          <div className="portal-wallet-notice" style={{ margin: '12px 16px', padding: '10px 14px' }} role="note">
            <span className="portal-wallet-notice__ic" aria-hidden="true">!</span>
            <span>Card transaction confirmation and full merchant details may take up to 3 days to reflect.</span>
          </div>

          {filtered.length ? (
            <>
              <div className="portal-tx-feed portal-tx-panel__feed">
                <TransactionsGroupedFeed items={paginatedItems} onSelect={setSelectedTx} />
              </div>

              {/* Activity Pagination Controls (Max 10 per page) */}
              <div 
                className="portal-tx-pagination"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'space-between',
                  padding: '16px 20px',
                  borderTop: '1px solid var(--portal-border, rgba(255,255,255,0.08))',
                  fontSize: '13px',
                  color: 'var(--portal-muted, #a0aec0)'
                }}
              >
                <span>
                  Page {currentPage} of {totalPages} ({filtered.length} total)
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="portal-btn-secondary"
                    style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '13px', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', opacity: currentPage <= 1 ? 0.5 : 1 }}
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    Previous
                  </button>
                  <button
                    type="button"
                    className="portal-btn-secondary"
                    style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '13px', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', opacity: currentPage >= totalPages ? 0.5 : 1 }}
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="portal-tx-empty portal-tx-panel__empty">
              <p className="portal-tx-empty__title">No transactions found</p>
              <p className="portal-tx-empty__msg">Try adjusting your filters or search query.</p>
            </div>
          )}
        </div>
      )}
      </div>

      <TransactionDetailsDrawer
        tx={selectedTx}
        onClose={closeDetails}
        onCopyTxId={handleCopyTxId}
        copyState={copiedTxId}
      />
    </div>
  );
}
