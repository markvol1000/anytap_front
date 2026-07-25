import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui.jsx';

/** @typedef {'green' | 'orange' | 'red' | 'blue'} AdminKpiTone */

/**
 * Compact scannable KPI tile — value dominant, label subtle.
 * @param {object} props
 * @param {string} props.label
 * @param {import('react').ReactNode} props.value
 * @param {string} props.icon — Icon name from ui.jsx
 * @param {AdminKpiTone} [props.tone]
 * @param {string} [props.to] — navigates with optional pre-filter query
 */
export function AdminKpiCard({ label, value, icon, tone = 'blue', to }) {
  const className = `admin-kpi admin-kpi--${tone}`;

  const body = (
    <>
      <span className="admin-kpi__icon" aria-hidden="true">
        <Icon name={icon} size={15} stroke={1.75} />
      </span>
      <p className="admin-kpi__value">{value}</p>
      <p className="admin-kpi__label">{label}</p>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={`${className} admin-kpi--link`}>
        {body}
      </Link>
    );
  }

  return <article className={className}>{body}</article>;
}

export function AdminKpiGrid({ children }) {
  return <div className="admin-kpi-grid">{children}</div>;
}
