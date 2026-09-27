import { NavLink } from 'react-router-dom';

export function ReportsTabs() {
  return (
    <div className="admin-fees-tabs" role="tablist" aria-label="Reports Navigation">
      <NavLink
        to="/admin/reports/cards"
        className={({ isActive }) => `admin-fees-tab-link${isActive ? ' is-active' : ''}`}
      >
        <span>💳</span> Card Application Status
      </NavLink>
      <NavLink
        to="/admin/reports/transfers"
        className={({ isActive }) => `admin-fees-tab-link${isActive ? ' is-active' : ''}`}
      >
        <span>🔁</span> Card Transfer Ledger
      </NavLink>
      <NavLink
        to="/admin/reports/fees"
        className={({ isActive }) => `admin-fees-tab-link${isActive ? ' is-active' : ''}`}
      >
        <span>💰</span> Fee Analysis Report
      </NavLink>
      <NavLink
        to="/admin/reports/emails"
        className={({ isActive }) => `admin-fees-tab-link${isActive ? ' is-active' : ''}`}
      >
        <span>✉️</span> Email Dispatch History
      </NavLink>
    </div>
  );
}
