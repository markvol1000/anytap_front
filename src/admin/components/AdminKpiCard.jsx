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
const SPARKLINE_PATHS = {
  blue: 'M0,20 Q15,8 30,16 T60,6 T90,14 T120,4',
  green: 'M0,18 Q15,22 30,10 T60,14 T90,4 T120,8',
  orange: 'M0,22 Q15,12 30,18 T60,8 T90,16 T120,6',
  red: 'M0,10 Q15,18 30,8 T60,20 T90,12 T120,16',
};

const SPARKLINE_COLORS = {
  blue: '#2563eb',
  green: '#16a34a',
  orange: '#ff5500',
  red: '#dc2626',
};

export function AdminKpiCard({ label, value, icon, tone = 'blue', to, sparkline = true }) {
  const className = `admin-kpi admin-kpi--${tone}`;
  const strokeColor = SPARKLINE_COLORS[tone] || '#2563eb';
  const pathD = SPARKLINE_PATHS[tone] || SPARKLINE_PATHS.blue;

  const body = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <span className="admin-kpi__icon" aria-hidden="true">
          <Icon name={icon} size={15} stroke={1.75} />
        </span>
        <span style={{ fontSize: '10px', fontWeight: '700', color: strokeColor, background: `color-mix(in srgb, ${strokeColor} 12%, transparent)`, padding: '2px 6px', borderRadius: '999px' }}>
          Menu ➔
        </span>
      </div>
      <p className="admin-kpi__value">{value}</p>
      <p className="admin-kpi__label">{label}</p>
      {sparkline && (
        <div className="admin-kpi__sparkline">
          <svg width="100%" height="36" viewBox="0 0 120 32" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
            <path
              d={pathD}
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={`${className} admin-kpi--link`} title={`Navigate to ${label}`}>
        {body}
      </Link>
    );
  }

  return <article className={className}>{body}</article>;
}

export function AdminKpiGrid({ children }) {
  return <div className="admin-kpi-grid">{children}</div>;
}
