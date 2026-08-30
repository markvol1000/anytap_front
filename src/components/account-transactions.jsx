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
        {cards && cards.length > 0 && (scope === 'card' || scope === 'all') && (
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

export function TxDetailSheet({ tx, onClose }) {
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
              item={tx}
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
          <DetailRow label="Amount">{A.formatActivityAmount(tx.amount, tx.incoming, tx.kind, tx)}</DetailRow>
          {tx.originalAmount && tx.originalCurrency && (
            <DetailRow label="Original Billing Amount">
              {A.formatActivityAmountParts(tx.amount, tx.incoming, tx.kind, tx).sign}{tx.originalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {tx.originalCurrency}
            </DetailRow>
          )}
          <DetailRow label="Date & Time">{A.formatActivityDateTime(tx.at)}</DetailRow>
          <DetailRow label="Status">
            <span className={`portal-tx-detail__status-badge portal-tx-detail__status-badge--${status}`}>
              {A.formatActivityStatusLabel(status)}
            </span>
          </DetailRow>

          {tx.remainingBalance != null && !Number.isNaN(tx.remainingBalance) && (
            <DetailRow label="Remaining Balance">
              <span style={{ fontWeight: '600', color: '#2b6cb0' }}>
                ${Number(tx.remainingBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </span>
            </DetailRow>
          )}
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

    const targetCard = cards.find(
      (c) => c.last4 === selectedCardId || c.id === selectedCardId || c.cardNo === selectedCardId || c.wasabiCardId === selectedCardId
    );

    const cNo = targetCard ? String(targetCard.cardNo || targetCard.wasabiCardId || '') : (selectedCardId !== 'all' ? selectedCardId : '');
    const l4 = targetCard?.last4 || (cNo.replace(/\D/g, '').length >= 4 ? cNo.replace(/\D/g, '').slice(-4) : '');

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
  }, [selectedCardId, cards]);

  const activeItems = useMemo(() => {
    let list = items;
    if (liveCardTxs != null) {
      if (selectedCardId && selectedCardId !== 'all') {
        list = liveCardTxs;
      } else {
        const localTxs = items.filter((item) => item.kind !== 'card_spend' && item.kind !== 'refund');
        list = [...localTxs, ...liveCardTxs];
      }
    }
    const seen = new Set();
    return list.filter((item) => {
      if (!item) return false;
      const sig = `${item.id || ''}_${item.kind || ''}_${item.at || ''}_${item.amount || ''}_${item.txId || ''}`;
      if (seen.has(sig)) return false;
      seen.add(sig);
      return true;
    });
  }, [items, liveCardTxs, selectedCardId]);

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
      cardLast4: liveCardTxs != null ? 'all' : selectedCardId,
      cardId: liveCardTxs != null ? 'all' : selectedCardId,
    }),
    [activeItems, scope, dateRange, customFrom, customTo, status, searchQuery, selectedCardId, liveCardTxs],
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
