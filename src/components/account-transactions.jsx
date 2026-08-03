// ===== Transactions Page =====
// Full history — filters + responsive table/list
// TODO: Replace mock data with Cregis + Wasabi APIs

import { useMemo, useState, useEffect, useCallback } from 'react';
import { Icon } from './ui.jsx';
import { ActivityAmount, ActivityRow, ActivityScopeTabBar } from './account-activity.jsx';
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
}) {
  return (
    <div className="portal-tx-panel__toolbar">
      <div className="portal-tx-page__toolbar">
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

        <label className="portal-tx-page__field portal-tx-page__field--search">
          <span className="portal-tx-page__field-label visually-hidden">Search</span>
          <input
            type="search"
            className="portal-tx-page__input portal-tx-page__input--search"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search merchant, reference, transaction ID, or card number..."
            aria-label="Search merchant, reference, transaction ID, or card number"
          />
        </label>
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

export function TransactionDetailsDrawer({ tx, onClose, onCopyTxId, copyState }) {
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

  return (
    <div className="portal-sheet portal-tx-detail" role="dialog" aria-modal="true" aria-label="Transaction details">
      <button type="button" className="portal-sheet__backdrop" onClick={onClose} aria-label="Close" />
      <div className="portal-sheet__panel portal-tx-detail__panel">
        <div className="portal-sheet__head">
          <h3 className="portal-sheet__title">Transaction Details</h3>
          <button type="button" className="portal-sheet__close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={20} stroke={2} />
          </button>
        </div>

        <div className="portal-tx-detail__hero">
          <TxIcon tx={tx} />
          <div className="portal-tx-detail__hero-body">
            <span className="portal-tx-detail__hero-type">{tx.typeLabel}</span>
            <ActivityAmount
              amount={tx.amount}
              incoming={tx.incoming}
              failed={tx.failed}
              kind={tx.kind}
              large
            />
            <TxStatusBadge status={status} />
          </div>
        </div>

        <dl className="portal-tx-detail__list">
          {['card_spend', 'refund', 'reversal'].includes(tx.kind) && A.getActivityMerchantLabel(tx) && A.getActivityMerchantLabel(tx) !== '—' && (
            <DetailRow label="Merchant">{A.getActivityMerchantLabel(tx)}</DetailRow>
          )}
          <DetailRow label="Transaction Type">{tx.typeLabel}</DetailRow>
          <DetailRow label="Amount">{A.formatActivityAmount(tx.amount, tx.incoming, tx.kind)}</DetailRow>
          <DetailRow label="Date & Time">{A.formatActivityDateTime(tx.at)}</DetailRow>
          <DetailRow label="Status">{A.formatActivityStatusLabel(status)}</DetailRow>
          <DetailRow label="Wallet / Card">{A.getActivitySourceLabel(tx)}</DetailRow>
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
      </div>
    </div>
  );
}

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
            {group.items.map((tx) => {
              const rowWhenStyle = group.bucket === 'prior' ? 'grouped-row' : 'grouped-time';
              return (
                <li key={tx.id}>
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

export function TransactionsPage({ items = [], initialScope = 'all' }) {
  const [scope, setScope] = useState(initialScope);
  const [dateRange, setDateRange] = useState('90d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [status, setStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState(null);
  const [copiedTxId, setCopiedTxId] = useState('');

  useEffect(() => {
    setScope(initialScope);
  }, [initialScope]);

  const filtered = useMemo(
    () => A.applyTransactionFilters(items, {
      scope,
      dateRange,
      customFrom,
      customTo,
      status,
      searchQuery,
    }),
    [items, scope, dateRange, customFrom, customTo, status, searchQuery],
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
          />

          <div className="portal-wallet-notice" style={{ margin: '12px 16px', padding: '10px 14px' }} role="note">
            <span className="portal-wallet-notice__ic" aria-hidden="true">!</span>
            <span>Card transaction confirmation and full merchant details may take up to 3 days to reflect. (거래 내역 확인까지 최대 3일이 소요될 수 있습니다.)</span>
          </div>

          {filtered.length ? (
            <div className="portal-tx-feed portal-tx-panel__feed">
              <TransactionsGroupedFeed items={filtered} onSelect={setSelectedTx} />
            </div>
          ) : (
            <div className="portal-tx-empty portal-tx-panel__empty">
              <p className="portal-tx-empty__title">No transactions found</p>
              <p className="portal-tx-empty__msg">Try adjusting your filters or search query.</p>
            </div>
          )}
        </div>
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
