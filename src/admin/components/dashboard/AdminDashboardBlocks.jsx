import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../../../components/ui.jsx';

/**
 * Ops queue tile — pending work item (higher priority than KPI).
 */
export function AdminPendingTaskCard({ label, count, icon, tone = 'orange', to, urgent = false }) {
  const resolvedTone = urgent && count > 0 ? 'red' : tone;
  const className = `admin-pending-task admin-pending-task--${resolvedTone}`;

  const body = (
    <div className="admin-pending-task__content">
      <span className="admin-pending-task__label" title={label}>{label}</span>
      <div className="admin-pending-task__val-row">
        <span className="admin-pending-task__icon" aria-hidden="true">
          <Icon name={icon} size={15} stroke={1.75} />
        </span>
        <span className="admin-pending-task__count" title={String(count)}>{count}</span>
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className={`${className} admin-pending-task--link`} title={label}>
        {body}
      </Link>
    );
  }

  return <article className={className} title={label}>{body}</article>;
}

export function AdminPendingTaskGrid({ children }) {
  return <div className="admin-pending-task-grid">{children}</div>;
}

export function AdminDashSection({ title, action, children, className = '' }) {
  return (
    <section className={`admin-dash-section${className ? ` ${className}` : ''}`}>
      <div className="admin-dash-section__head">
        <h2 className="admin-dash-section__title">{title}</h2>
        {action ?? null}
      </div>
      {children}
    </section>
  );
}

export function AdminDashTabs({ tabs, active, onChange }) {
  return (
    <div className="admin-boxed-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={`admin-boxed-tab${active === tab.id ? ' is-active' : ''}`}
          onClick={() => onChange(tab.id)}
          title={tab.label}
        >
          <span className="admin-boxed-tab__label">{tab.label}</span>
          {tab.count != null ? (
            <span className="admin-boxed-tab__badge">{tab.count}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

const TX_KIND_ROUTES = {
  wallet_topup: '/admin/transactions?kind=wallet_topup',
  card_topup: '/admin/transactions?kind=card_topup',
  card_spend: '/admin/transactions?kind=card_spend',
  wallet_withdraw: '/admin/transactions?kind=wallet_withdraw',
  refund: '/admin/transactions?kind=refund',
  wallet_receive: '/admin/transactions?kind=wallet_receive&status=pending',
};

export function AdminTxKindChips() {
  const chips = [
    { label: 'Top Up', kind: 'wallet_topup' },
    { label: 'Payment', kind: 'card_spend' },
    { label: 'Withdrawal', kind: 'wallet_withdraw' },
    { label: 'Refund', kind: 'refund' },
  ];

  return (
    <div className="admin-tx-chips">
      {chips.map((chip) => (
        <Link
          key={chip.kind}
          to={TX_KIND_ROUTES[chip.kind]}
          className="admin-tx-chips__link">
          {chip.label}
        </Link>
      ))}
    </div>
  );
}

export function formatTxKind(kind) {
  const map = {
    wallet_topup: 'Top Up',
    card_topup: 'Card Top Up',
    card_spend: 'Payment',
    wallet_withdraw: 'Withdrawal',
    wallet_receive: 'Deposit',
    wallet_send: 'Send',
    refund: 'Refund',
    referral_reward: 'Reward',
  };
  return map[kind] ?? kind;
}

export function requestDetailRoute(row) {
  if (row.type === 'kyc') return `/admin/kyc?status=${row.status === 'pending' ? 'pending' : 'all'}`;
  if (row.type === 'card') return `/admin/cards?status=${row.status === 'pending' ? 'pending' : 'all'}`;
  return `/admin/withdrawals?status=${row.status === 'pending' ? 'pending' : 'all'}`;
}

function describeArc(cx, cy, r, startAngleDeg, endAngleDeg) {
  let angleDiff = endAngleDeg - startAngleDeg;
  if (angleDiff >= 360) angleDiff = 359.999;
  if (angleDiff <= 0.01) return '';

  const startRad = ((startAngleDeg - 90) * Math.PI) / 180;
  const endRad = (((startAngleDeg + angleDiff) - 90) * Math.PI) / 180;

  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);

  const largeArcFlag = angleDiff > 180 ? 1 : 0;

  return `M ${x1.toFixed(3)} ${y1.toFixed(3)} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2.toFixed(3)} ${y2.toFixed(3)}`;
}

export function AdminRequestDistributionChart({ kycCount = 0, cardCount = 0, withdrawalCount = 0 }) {
  const navigate = useNavigate();
  const totalCount = kycCount + cardCount + withdrawalCount;
  const safeTotal = totalCount || 1;

  const kycRatio = totalCount ? kycCount / safeTotal : 0;
  const cardRatio = totalCount ? cardCount / safeTotal : 0;
  const withdrawalRatio = totalCount ? withdrawalCount / safeTotal : 0;

  const kycPct = totalCount ? Math.round(kycRatio * 100) : 0;
  const cardPct = totalCount ? Math.round(cardRatio * 100) : 0;
  const withdrawalPct = totalCount ? Math.max(0, 100 - kycPct - cardPct) : 0;

  // Compute arc angles dynamically
  const kycAngle = kycRatio * 360;
  const cardAngle = cardRatio * 360;
  const withdrawalAngle = withdrawalRatio * 360;

  let currentAngle = 0;
  let pathKyc = '';
  if (kycCount > 0) {
    pathKyc = describeArc(110, 110, 75, currentAngle, currentAngle + kycAngle);
    currentAngle += kycAngle;
  }

  let pathCard = '';
  if (cardCount > 0) {
    pathCard = describeArc(110, 110, 75, currentAngle, currentAngle + cardAngle);
    currentAngle += cardAngle;
  }

  let pathWithdrawal = '';
  if (withdrawalCount > 0) {
    pathWithdrawal = describeArc(110, 110, 75, currentAngle, currentAngle + withdrawalAngle);
    currentAngle += withdrawalAngle;
  }

  return (
    <div className="admin-chart-card">
      <div className="admin-chart-card__head">
        <h3 className="admin-chart-card__title">Request Types Distribution</h3>
        <span className="admin-chart-card__badge">{totalCount} Total Requests</span>
      </div>

      <div
        className="admin-donut-layout"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          alignItems: 'center',
          gap: '20px',
          width: '100%',
          boxSizing: 'border-box',
        }}>
        <div
          className="admin-donut-wrap"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
          }}>
          <svg width="200" height="200" viewBox="0 0 220 220" className="admin-donut-svg">
            {/* Background ring */}
            <circle cx="110" cy="110" r="75" fill="none" stroke="#e2e8f0" strokeWidth="28" />
            
            {/* KYC Arc Path (Vibrant Royal Blue) */}
            {pathKyc ? (
              <path
                d={pathKyc}
                fill="none"
                stroke="#2563eb"
                strokeWidth="28"
                className="admin-donut-segment"
                onClick={() => navigate('/admin/kyc')}
              >
                <title>{`KYC Requests: ${kycCount} (${kycPct}%) — Click to open KYC menu`}</title>
              </path>
            ) : null}

            {/* Card Arc Path (Vibrant Emerald Green) */}
            {pathCard ? (
              <path
                d={pathCard}
                fill="none"
                stroke="#10b981"
                strokeWidth="28"
                className="admin-donut-segment"
                onClick={() => navigate('/admin/cards')}
              >
                <title>{`Card Applications: ${cardCount} (${cardPct}%) — Click to open Cards menu`}</title>
              </path>
            ) : null}

            {/* Withdrawal Arc Path (Vibrant Brand Orange) */}
            {pathWithdrawal ? (
              <path
                d={pathWithdrawal}
                fill="none"
                stroke="#ff5500"
                strokeWidth="28"
                className="admin-donut-segment"
                onClick={() => navigate('/admin/withdrawals')}
              >
                <title>{`Withdrawal Requests: ${withdrawalCount} (${withdrawalPct}%) — Click to open Withdrawals menu`}</title>
              </path>
            ) : null}

            {/* Center Text */}
            <text x="110" y="104" textAnchor="middle" className="admin-donut-center-val">
              {totalCount}
            </text>
            <text x="110" y="126" textAnchor="middle" className="admin-donut-center-lbl">
              REQUESTS
            </text>
          </svg>
        </div>

        <div
          className="admin-donut-legend"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            width: '100%',
            minWidth: 0,
            boxSizing: 'border-box',
          }}>
          <Link
            to="/admin/kyc"
            className="admin-donut-card admin-donut-card--blue"
            style={{ width: '100%', boxSizing: 'border-box' }}>
            <span className="admin-donut-card__icon" aria-hidden="true">
              <Icon name="shield" size={18} stroke={1.75} />
            </span>
            <div className="admin-donut-card__body">
              <span className="admin-donut-card__label">KYC Requests</span>
              <div className="admin-donut-card__val-row">
                <span className="admin-donut-card__count">{kycCount}</span>
                <span className="admin-donut-card__pct">{kycPct}%</span>
              </div>
            </div>
            <span className="admin-donut-card__arrow" aria-hidden="true">➔</span>
          </Link>

          <Link
            to="/admin/cards"
            className="admin-donut-card admin-donut-card--green"
            style={{ width: '100%', boxSizing: 'border-box' }}>
            <span className="admin-donut-card__icon" aria-hidden="true">
              <Icon name="creditCard" size={18} stroke={1.75} />
            </span>
            <div className="admin-donut-card__body">
              <span className="admin-donut-card__label">Card Applications</span>
              <div className="admin-donut-card__val-row">
                <span className="admin-donut-card__count">{cardCount}</span>
                <span className="admin-donut-card__pct">{cardPct}%</span>
              </div>
            </div>
            <span className="admin-donut-card__arrow" aria-hidden="true">➔</span>
          </Link>

          <Link
            to="/admin/withdrawals"
            className="admin-donut-card admin-donut-card--orange"
            style={{ width: '100%', boxSizing: 'border-box' }}>
            <span className="admin-donut-card__icon" aria-hidden="true">
              <Icon name="arrowUpRight" size={18} stroke={1.75} />
            </span>
            <div className="admin-donut-card__body">
              <span className="admin-donut-card__label">Withdrawal Requests</span>
              <div className="admin-donut-card__val-row">
                <span className="admin-donut-card__count">{withdrawalCount}</span>
                <span className="admin-donut-card__pct">{withdrawalPct}%</span>
              </div>
            </div>
            <span className="admin-donut-card__arrow" aria-hidden="true">➔</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function AdminTxVolumeChart({
  walletTxCount = 0,
  cardTxCount = 0,
  withdrawalTxCount = 0,
  todayTopUp = 0,
  todayPayments = 0,
  walletAssets = 0,
}) {
  const topUpVal = Number(todayTopUp || 0);
  const payVal = Number(todayPayments || 0);
  const withdrawVal = Number(withdrawalTxCount || 0);
  const assetsVal = Number(walletAssets || 0);

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    const absStr = Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return num < 0 ? `-$${absStr}` : `$${absStr}`;
  };

  const rawItems = [
    {
      label: 'Wallet Top Up',
      numericVal: Math.abs(topUpVal),
      amount: formatCurrency(topUpVal),
      count: walletTxCount,
      color: '#2563eb',
      gradient: 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)',
      route: '/admin/transactions?kind=wallet_topup',
    },
    {
      label: 'Card Payments',
      numericVal: Math.abs(payVal),
      amount: formatCurrency(payVal),
      count: cardTxCount,
      color: '#10b981',
      gradient: 'linear-gradient(180deg, #10b981 0%, #047857 100%)',
      route: '/admin/transactions?kind=card_spend',
    },
    {
      label: 'Withdrawals',
      numericVal: withdrawVal,
      amount: `${withdrawVal} reqs`,
      count: withdrawVal,
      color: '#ff5500',
      gradient: 'linear-gradient(180deg, #ff5500 0%, #c23b00 100%)',
      route: '/admin/withdrawals',
    },
    {
      label: 'Wallet Assets',
      numericVal: Math.abs(assetsVal),
      amount: formatCurrency(assetsVal),
      count: walletTxCount,
      color: '#8b5cf6',
      gradient: 'linear-gradient(180deg, #8b5cf6 0%, #6d28d9 100%)',
      route: '/admin/wallets',
    },
  ];

  const maxVal = Math.max(...rawItems.map((i) => i.numericVal), 1);
  const items = rawItems.map((item) => {
    let heightPct = 8;
    if (item.numericVal > 0) {
      heightPct = Math.max(18, Math.round((item.numericVal / maxVal) * 100));
    }
    return { ...item, heightPct };
  });

  return (
    <div className="admin-chart-card">
      <div className="admin-chart-card__head">
        <h3 className="admin-chart-card__title">Transaction & Activity Breakdown</h3>
        <span className="admin-chart-card__badge" style={{ background: '#eff6ff', color: '#1d4ed8', fontWeight: 700 }}>Live Activity</span>
      </div>

      <div className="admin-tx-hbar-list">
        {items.map((item) => (
          <Link
            key={item.label}
            to={item.route}
            className="admin-tx-hbar-row"
            title={`Click to open ${item.label} menu`}>
            <div className="admin-tx-hbar-meta">
              <span className="admin-tx-hbar-dot" style={{ background: item.color }} />
              <span className="admin-tx-hbar-label">{item.label}</span>
            </div>

            <div className="admin-tx-hbar-track">
              <div
                className="admin-tx-hbar-fill"
                style={{ width: `${item.heightPct}%`, background: item.gradient }}
              />
            </div>

            <div className="admin-tx-hbar-stat">
              <span className="admin-tx-hbar-amount">{item.amount}</span>
              {item.count > 0 && <span className="admin-tx-hbar-cnt">{item.count} txs</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function AdminChartDateFilter({
  preset,
  onPresetChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onApply,
}) {
  return (
    <div className="admin-chart-filter-bar">
      <div className="admin-chart-filter-bar__presets">
        {[
          { id: 'all', label: 'All' },
          { id: 'today', label: 'Today' },
          { id: '7d', label: 'Last 7 Days' },
          { id: '1m', label: 'Last 30 Days' },
        ].map((p) => (
          <button
            key={p.id}
            type="button"
            className={`admin-chart-filter-btn${preset === p.id ? ' is-active' : ''}`}
            onClick={() => onPresetChange(p.id)}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="admin-chart-filter-bar__dates">
        <input
          type="date"
          id="admin-chart-start-date"
          name="startDate"
          aria-label="Filter Start Date"
          className="admin-input admin-input--date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
        />
        <span className="admin-chart-filter-bar__sep">~</span>
        <input
          type="date"
          id="admin-chart-end-date"
          name="endDate"
          aria-label="Filter End Date"
          className="admin-input admin-input--date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
        />
        <button
          type="button"
          className="admin-btn admin-btn--primary admin-btn--sm admin-chart-search-btn"
          onClick={onApply}>
          Search
        </button>
      </div>
    </div>
  );
}

