// ===== Activity / Transactions =====
// ActivityList       — compact preview rows (dashboard, wallet, card)
// RecentActivitySection — titled preview block with View All
// TODO: Replace mock activityItems with API transaction endpoints

import { useEffect, useMemo, useState } from 'react';
import { Icon } from './ui.jsx';
import * as A from '../lib/account-data.js';
import { TxDetailSheet } from './account-transactions.jsx';

export function ActivityAmount({ amount, incoming, failed, kind, large = false, item = {} }) {
  const origAmt = item?.originalAmount;
  const origCurr = item?.originalCurrency;
  const useOriginal = origAmt && origCurr;

  const displayAmt = useOriginal ? origAmt : (item?.amount ?? amount);
  const displayCurr = useOriginal ? origCurr : (item?.currency || (kind === 'card_spend' || kind === 'refund' || kind === 'reversal' ? 'USD' : 'USDT'));

  const { sign } = A.formatActivityAmountParts(amount, incoming, kind, item);
  const val = Math.abs(Number(displayAmt) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const variant = failed ? 'fail' : incoming ? 'in' : 'out';

  return (
    <span className={`portal-tx__amt portal-tx__amt--${variant}${large ? ' portal-tx__amt--lg' : ''}`}>
      <span className="portal-tx__amt-value">{sign}{val}</span>{' '}
      <span className="portal-tx__amt-currency">{displayCurr}</span>
    </span>
  );
}

const ACTIVITY_DATE_STYLE_BY_PAGE = {
  dashboard: 'compact',
  wallet: 'standard',
  card: 'standard',
  rewards: 'standard',
};

function ActivityIcon({ tx, compact = false }) {
  const status = A.getActivityStatus(tx);
  const icVariant = A.getActivityIconVariant(tx);
  const iconSize = compact ? 16 : 18;
  const failSize = compact ? 18 : 20;

  return (
    <span
      className={`portal-tx__ic portal-tx__ic--${icVariant}${compact ? ' portal-dash-wf__tx-ic' : ''}`}
      aria-hidden="true">
      {status === 'failed' ? (
        <Icon name="xCircle" size={failSize} stroke={2} />
      ) : status === 'pending' ? (
        <Icon name="clock" size={iconSize} stroke={2} />
      ) : icVariant === 'reward' ? (
        <Icon name="gift" size={iconSize} stroke={2} />
      ) : icVariant === 'refund' ? (
        <Icon name="download" size={iconSize} stroke={2} />
      ) : icVariant === 'deposit' ? (
        <Icon name="download" size={iconSize} stroke={2} />
      ) : (
        <Icon name="arrowUpRight" size={iconSize} stroke={2} />
      )}
    </span>
  );
}

/** Icon · title · subtitle | amount · date — shared across dashboard / wallet / card / transactions */
export function ActivityRow({ tx, onClick, dateStyle = 'standard', variant = 'default' }) {
  const when = A.formatActivityWhen(tx.at, { style: 'standard' });
  const status = A.getActivityStatus(tx);
  const isCompact = variant === 'compact';
  const isGrouped = variant === 'grouped';
  const subtitle = A.activitySubtitleLabel(tx);

  const rowClass = isCompact
    ? 'portal-dash-wf__tx'
    : isGrouped
      ? `portal-tx-group__row${status === 'failed' ? ' is-failed' : ''}`
      : 'portal-tx';

  const inner = (
    <>
      <ActivityIcon tx={tx} compact={isCompact} />
      <span className={isCompact ? 'portal-dash-wf__tx-main' : isGrouped ? 'portal-tx-group__body' : 'portal-tx__body'}>
        <span className={isCompact ? 'portal-dash-wf__tx-merchant' : isGrouped ? 'portal-tx-group__merchant' : 'portal-tx__title'}>
          {tx.title}
        </span>
        {isCompact ? (
          <span className="portal-dash-wf__tx-time">{subtitle}</span>
        ) : isGrouped ? (
          <span className="portal-tx-group__type">{subtitle}</span>
        ) : (
          <span className="portal-tx__card">
            <span className="portal-tx__card-label">{subtitle}</span>
          </span>
        )}
      </span>
      <span className={isCompact ? 'portal-tx__side portal-dash-wf__tx-side' : isGrouped ? 'portal-tx-group__side' : 'portal-tx__side'}>
        <ActivityAmount amount={tx.amount} incoming={tx.incoming} failed={tx.failed} kind={tx.kind} item={tx} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="portal-tx__when">{when}</span>
            {status === 'failed' ? (
              <span style={{ fontSize: '10px', color: '#b91c1c', fontWeight: '700', textTransform: 'uppercase', backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.02em' }}>
                FAILED
              </span>
            ) : status === 'pending' ? (
              <span style={{ fontSize: '10px', color: '#b45309', fontWeight: '700', textTransform: 'uppercase', backgroundColor: '#fef3c7', padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.02em' }}>
                PENDING
              </span>
            ) : (tx.rawStatus === 'authorized' || (!tx.incoming && tx.kind !== 'card_topup' && tx.kind !== 'wallet_deposit' && tx.kind !== 'wallet_receive')) ? (
              <span style={{ fontSize: '10px', color: '#0f766e', fontWeight: '700', textTransform: 'uppercase', backgroundColor: '#ccfbf1', padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.02em' }}>
                AUTHORIZED
              </span>
            ) : (
              <span style={{ fontSize: '10px', color: '#15803d', fontWeight: '700', textTransform: 'uppercase', backgroundColor: '#dcfce7', padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.02em' }}>
                COMPLETED
              </span>
            )}
          </div>
        </div>
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={rowClass}
        onClick={onClick}
        aria-label={`View details for ${tx.title}`}>
        {inner}
      </button>
    );
  }

  return <div className={rowClass}>{inner}</div>;
}

/** Dashboard compact row — alias for ActivityRow variant="compact" */
export function DashboardActivityRow({ tx, onClick }) {
  return <ActivityRow tx={tx} onClick={onClick} dateStyle="compact" variant="compact" />;
}

/** All / Wallet / Card — matches Transactions page tab bar */
export function ActivityScopeTabBar({
  scope,
  onScopeChange,
  surfaceId = 'portal-tx-panel-surface',
  className = '',
}) {
  return (
    <div
      className={`portal-tx-panel__tabbar${className ? ` ${className}` : ''}`}
      role="tablist"
      aria-label="Activity scope">
      {A.ACTIVITY_SCOPE_FILTERS.map((f) => (
        <button
          key={f.id}
          type="button"
          role="tab"
          aria-selected={scope === f.id}
          aria-controls={surfaceId}
          className={`portal-tx-panel__tab${scope === f.id ? ' is-active' : ''}`}
          onClick={() => onScopeChange(f.id)}>
          {f.label}
        </button>
      ))}
    </div>
  );
}

export function ActivityList({
  items = A.ACTIVITY,
  showScopeFilters = false,
  limit,
  onItemClick,
  onViewAll,
  viewAllLabel = 'See all transactions →',
  emptyTitle = 'No activity yet',
  emptyMsg = 'Your transactions will appear here after your card is activated.',
  emptyIcon = null,
}) {
  const [scopeFilter, setScopeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setPage(1);
  }, [scopeFilter, items]);

  const filtered = useMemo(() => {
    let list = A.normalizeActivityItems(items);
    list = showScopeFilters
      ? A.filterActivityByScope(list, scopeFilter)
      : list;
    return A.sortActivityChronological(list);
  }, [items, scopeFilter, showScopeFilters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = useMemo(() => {
    if (limit) return filtered.slice(0, limit);
    return filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filtered, limit, currentPage, pageSize]);

  const scopeFilters = showScopeFilters ? (
    <ActivityScopeTabBar
      scope={scopeFilter}
      onScopeChange={setScopeFilter}
      surfaceId="portal-tx-panel-surface-preview"
    />
  ) : null;

  const listBody = !(items || []).length ? (
    <div className="portal-tx-empty">
      {emptyIcon && (
        <span className="portal-tx-empty__icon" aria-hidden="true">
          <Icon name={emptyIcon} size={32} stroke={1.5} />
        </span>
      )}
      <p className="portal-tx-empty__title">{emptyTitle}</p>
      <p className="portal-tx-empty__msg">{emptyMsg}</p>
    </div>
  ) : paginatedItems.length ? (
    <div className="portal-tx-list">
      {paginatedItems.map((tx, idx) => (
        <ActivityRow key={`${tx.id}-${idx}`} tx={tx} onClick={onItemClick ? () => onItemClick(tx) : undefined} />
      ))}
    </div>
  ) : (
    <div className="portal-tx-empty portal-tx-empty--inline">
      <p className="portal-tx-empty__msg">{emptyMsg}</p>
    </div>
  );

  const paginationControls = !limit && filtered.length > pageSize && (
    <div
      className="portal-tx-pagination"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        fontSize: '13px',
        color: 'var(--portal-muted, #a0aec0)',
      }}>
      <span>
        Page {currentPage} of {totalPages} ({filtered.length} total)
      </span>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button"
          className="portal-btn-secondary"
          style={{
            padding: '4px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            opacity: currentPage <= 1 ? 0.5 : 1,
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
          }}
          disabled={currentPage <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}>
          Previous
        </button>
        <button
          type="button"
          className="portal-btn-secondary"
          style={{
            padding: '4px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            opacity: currentPage >= totalPages ? 0.5 : 1,
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
          }}
          disabled={currentPage >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
          Next
        </button>
      </div>
    </div>
  );

  const viewAllFoot = onViewAll && (items || []).length && (filtered || []).length ? (
    <div className="portal-activity__foot">
      <button type="button" className="portal-activity__view-all" onClick={onViewAll}>
        {viewAllLabel}
      </button>
    </div>
  ) : null;

  if (showScopeFilters) {
    return (
      <div className={`portal-tx-panel portal-tx-panel--preview portal-tx-panel--tab-${scopeFilter}`}>
        {scopeFilters}
        <div className="portal-tx-panel__surface" id="portal-tx-panel-surface-preview">
          {listBody}
          {paginationControls}
          {viewAllFoot}
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="portal-tx-list-wrap">
        <div className="portal-tx-empty">
          {emptyIcon && (
            <span className="portal-tx-empty__icon" aria-hidden="true">
              <Icon name={emptyIcon} size={32} stroke={1.5} />
            </span>
          )}
          <p className="portal-tx-empty__title">{emptyTitle}</p>
          <p className="portal-tx-empty__msg">{emptyMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-tx-list-wrap">
      {listBody}
      {paginationControls}
      {viewAllFoot}
    </div>
  );
}

/** Recent activity preview — page-scoped filters keep wallet / card / reward feeds separate */
export function RecentActivitySection({
  title,
  items = [],
  pageFilter,
  card,
  cardLast4,
  scope = 'all',
  limit = 10,
  showScopeFilters = false,
  onViewAll,
  onItemClick,
  viewAllLabel,
  emptyTitle = 'No activity yet',
  emptyMsg = 'Your transactions will appear here.',
  emptyIcon = null,
  className = '',
}) {
  const [selectedModalTx, setSelectedModalTx] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const dateStyle = ACTIVITY_DATE_STYLE_BY_PAGE[pageFilter] ?? 'standard';
  const isDashboardCompact = pageFilter === 'dashboard';
  const resolvedViewAllLabel = viewAllLabel ?? (isDashboardCompact ? 'View All' : 'See all transactions →');

  useEffect(() => {
    setPage(1);
  }, [items, pageFilter, scope, card, cardLast4]);

  const handleRowClick = (tx) => {
    if (onItemClick) {
      onItemClick(tx);
    } else {
      setSelectedModalTx(tx);
    }
  };

  const allFilteredItems = useMemo(() => {
    let list = A.normalizeActivityItems(items);
    if (pageFilter === 'dashboard') {
      list = A.filterActivityForDashboard(list);
    } else if (pageFilter === 'wallet') {
      list = A.filterActivityForWalletPage(list);
    } else if (pageFilter === 'card') {
      list = A.filterActivityForCardPage(list, card || cardLast4);
    } else if (pageFilter === 'rewards') {
      list = A.filterActivityForRewardsPage(list);
    } else if (!showScopeFilters && scope !== 'all') {
      list = A.filterActivityByScope(list, scope);
    }
    return A.sortActivityChronological(list);
  }, [items, pageFilter, card, cardLast4, scope, showScopeFilters]);

  const totalPages = Math.max(1, Math.ceil(allFilteredItems.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const displayItems = useMemo(() => {
    if (isDashboardCompact) return allFilteredItems.slice(0, 5);
    return allFilteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [allFilteredItems, isDashboardCompact, currentPage, pageSize]);

  return (
    <section className={`portal-dash-section portal-activity portal-recent-tx${className ? ` ${className}` : ''}`}>
      {selectedModalTx && (
        <TxDetailSheet tx={selectedModalTx} onClose={() => setSelectedModalTx(null)} />
      )}
      <div className="portal-activity__head">
        <h2 className="portal-dash-section__title portal-dash-section__title--inline">{title}</h2>
      </div>
      {showScopeFilters ? (
        <ActivityList
          items={items}
          showScopeFilters
          onItemClick={handleRowClick}
          onViewAll={onViewAll}
          emptyTitle={emptyTitle}
          emptyMsg={emptyMsg}
          emptyIcon={emptyIcon}
        />
      ) : !displayItems.length ? (
        <div className="portal-tx-empty">
          {emptyIcon && (
            <span className="portal-tx-empty__icon" aria-hidden="true">
              <Icon name={emptyIcon} size={32} stroke={1.5} />
            </span>
          )}
          <p className="portal-tx-empty__title">{emptyTitle}</p>
          <p className="portal-tx-empty__msg">{emptyMsg}</p>
        </div>
      ) : isDashboardCompact ? (
        <>
          <div className="portal-dash-wf__tx-list">
            {displayItems.length ? displayItems.map((tx) => (
              <ActivityRow
                key={tx.id}
                tx={tx}
                dateStyle="compact"
                variant="compact"
                onClick={() => handleRowClick(tx)}
              />
            )) : (
              <p className="portal-dash-wf__tx-empty">{emptyMsg}</p>
            )}
          </div>
          {onViewAll && displayItems.length > 0 && (
            <button type="button" className="portal-dash-wf__tx-view-all" onClick={onViewAll}>
              {resolvedViewAllLabel}
            </button>
          )}
        </>
      ) : (
        <>
          <div className="portal-tx-list">
            {displayItems.length ? displayItems.map((tx) => (
              <ActivityRow
                key={tx.id}
                tx={tx}
                dateStyle={dateStyle}
                onClick={() => handleRowClick(tx)}
              />
            )) : (
              <div className="portal-tx-empty portal-tx-empty--inline">
                <p className="portal-tx-empty__msg">{emptyMsg}</p>
              </div>
            )}
          </div>
          {allFilteredItems.length > pageSize && (
            <div
              className="portal-activity__pagination"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '13px',
                color: 'var(--portal-muted, #a0aec0)',
              }}>
              <span>
                Page {currentPage} of {totalPages} ({allFilteredItems.length} total)
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="portal-btn-secondary"
                  style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    opacity: currentPage <= 1 ? 0.5 : 1,
                    cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                  }}
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Previous
                </button>
                <button
                  type="button"
                  className="portal-btn-secondary"
                  style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    opacity: currentPage >= totalPages ? 0.5 : 1,
                    cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                  }}
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  Next
                </button>
              </div>
            </div>
          )}
          {onViewAll && displayItems.length > 0 && (
            <div className="portal-activity__foot">
              <button type="button" className="portal-activity__view-all" onClick={onViewAll}>
                {resolvedViewAllLabel}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
