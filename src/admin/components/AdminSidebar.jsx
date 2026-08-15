import { NavLink } from 'react-router-dom';
import { Icon } from '../../components/ui.jsx';

const OPS_NAV = [
  { to: '/admin', end: true, label: 'Dashboard', icon: 'chart' },
  { to: '/admin/members', label: 'Members', icon: 'users' },
  { to: '/admin/kyc', label: 'KYC', icon: 'shield' },
  { to: '/admin/cards', label: 'Cards', icon: 'creditCard' },
  { to: '/admin/wallets', label: 'Wallets', icon: 'wallet' },
  { to: '/admin/transactions', label: 'Transactions', icon: 'receipt' },
  { to: '/admin/referral', label: 'Referral List', icon: 'trophy' },
  { to: '/admin/withdrawals', label: 'Withdrawals', icon: 'arrowUpRight' },
];

const SYSTEM_NAV = [
  { to: '/admin/db-backups', label: 'DB Backups', icon: 'database' },
  { to: '/admin/operations', label: 'Operations & System Health', icon: 'server' },
  { to: '/admin/notifications', label: 'Notifications', icon: 'bell' },
  { to: '/admin/content', label: 'Content Management', icon: 'fileText' },
  { to: '/admin/settings', label: 'Settings', icon: 'settings' },
  { to: '/admin/login-logs', label: 'Login Logs', icon: 'lock' },
  { to: '/admin/logs', label: 'Admin Logs', icon: 'clock' },
];

function formatRole(role) {
  if (!role) return 'Admin';
  return role
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function initials(name) {
  if (!name) return 'A';
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function NavItems({ items }) {
  return items.map((item) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `admin-sidebar__link${isActive ? ' is-active' : ''}`}>
      <Icon name={item.icon} size={17} stroke={1.75} />
      <span>{item.label}</span>
    </NavLink>
  ));
}

export function AdminSidebar({ admin }) {
  return (
    <aside className="admin-sidebar" aria-label="Admin navigation">
      <div className="admin-sidebar__brand">
        <span className="admin-sidebar__logo">Anytap</span>
        <span className="admin-sidebar__badge">Admin</span>
      </div>

      <nav className="admin-sidebar__nav">
        <p className="admin-sidebar__section-label">Operations</p>
        <NavItems items={OPS_NAV} />

        <div className="admin-sidebar__divider" role="separator" />

        <p className="admin-sidebar__section-label">System</p>
        <NavItems items={SYSTEM_NAV} />
      </nav>

      <div className="admin-sidebar__foot">
        <div className="admin-sidebar__profile">
          <span className="admin-sidebar__avatar" aria-hidden="true">
            {initials(admin?.name)}
          </span>
          <div className="admin-sidebar__profile-body">
            <p className="admin-sidebar__user">{admin?.name ?? 'Admin'}</p>
            <p className="admin-sidebar__role">{formatRole(admin?.role)}</p>
          </div>
          <span className="admin-sidebar__online">
            <span className="admin-sidebar__online-dot" aria-hidden="true" />
            Online
          </span>
        </div>
        <p className="admin-sidebar__email">{admin?.email ?? ''}</p>
      </div>
    </aside>
  );
}
