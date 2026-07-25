import { Link } from 'react-router-dom';
import { Icon } from '../../../components/ui.jsx';

/**
 * Ops queue tile — pending work item (higher priority than KPI).
 */
export function AdminPendingTaskCard({ label, count, icon, tone = 'orange', to, urgent = false }) {
  const resolvedTone = urgent && count > 0 ? 'red' : tone;
  const className = `admin-pending-task admin-pending-task--${resolvedTone}`;

  const body = (
    <>
      <span className="admin-pending-task__icon" aria-hidden="true">
        <Icon name={icon} size={18} stroke={1.75} />
      </span>
      <span className="admin-pending-task__body">
        <span className="admin-pending-task__label">{label}</span>
        <span className="admin-pending-task__count">{count}</span>
      </span>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={`${className} admin-pending-task--link`}>
        {body}
      </Link>
    );
  }

  return <article className={className}>{body}</article>;
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
    <div className="admin-dash-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={`admin-dash-tabs__btn${active === tab.id ? ' is-active' : ''}`}
          onClick={() => onChange(tab.id)}>
          {tab.label}
          {tab.count != null ? (
            <span className="admin-dash-tabs__count">{tab.count}</span>
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
