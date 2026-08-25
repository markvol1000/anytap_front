import { NavLink, useLocation } from 'react-router-dom';
import { Icon } from '../../components/ui.jsx';

const BASE_OPS_NAV = [
  { path: '', end: true, label: 'Dashboard', icon: 'chart' },
  { path: '/members', label: 'Members', icon: 'users' },
  { path: '/kyc', label: 'KYC', icon: 'shield' },
  { path: '/cards', label: 'Cards', icon: 'creditCard' },
  { path: '/reports', label: 'Reports', icon: 'list' },
  { path: '/wallets', label: 'Wallets', icon: 'wallet' },
  { path: '/transactions', label: 'Transactions', icon: 'receipt' },
  { path: '/referral', label: 'Referral List', icon: 'trophy' },
  { path: '/withdrawals', label: 'Withdrawals', icon: 'arrowUpRight' },
];

const BASE_SYSTEM_NAV = [
  { path: '/notifications', label: 'Notifications', icon: 'bell' },
  { path: '/content', label: 'Content Management', icon: 'fileText' },
  { path: '/settings', label: 'Settings', icon: 'settings' },
  { path: '/login-logs', label: 'Login Logs', icon: 'lock' },
  { path: '/logs', label: 'Admin Logs', icon: 'clock' },
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

function NavItems({ items, basePath }) {
  const location = useLocation();
  const currentPath = location.pathname;

  return items.map((item) => {
    const fullPath = `${basePath}${item.path}`;

    return (
      <NavLink
        key={fullPath}
        to={fullPath}
        end={item.end}
        className={({ isActive }) => {
          const isPrefixActive = !item.end && item.path && currentPath.startsWith(fullPath);
          return `admin-sidebar__link${isActive || isPrefixActive ? ' is-active' : ''}`;
        }}>
        <Icon name={item.icon} size={17} stroke={1.75} />
        <span>{item.label}</span>
      </NavLink>
    );
  });
}

export function AdminSidebar({ admin }) {
  const location = useLocation();
  const basePath = location.pathname.startsWith('/admin/hanzb') ? '/admin/hanzb' : '/admin';

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar__brand">
        <div className="admin-sidebar__logo">
          <Icon name="shieldCheck" size={24} />
        </div>
        <div className="admin-sidebar__brand-text">
          <strong className="admin-sidebar__title">AnyTap Admin</strong>
          <span className="admin-sidebar__subtitle">Ops Console</span>
        </div>
      </div>

      <nav className="admin-sidebar__nav">
        <div className="admin-sidebar__section-label">OPERATIONS</div>
        <NavItems items={BASE_OPS_NAV} basePath={basePath} />

        <div className="admin-sidebar__section-label" style={{ marginTop: '20px' }}>SYSTEM</div>
        <NavItems items={BASE_SYSTEM_NAV} basePath={basePath} />
      </nav>

      <div className="admin-sidebar__user">
        <div className="admin-sidebar__avatar">
          {initials(admin?.name || admin?.email || 'Admin')}
        </div>
        <div className="admin-sidebar__user-info">
          <strong className="admin-sidebar__user-name">{admin?.name || admin?.email?.split('@')[0] || 'Admin'}</strong>
          <span className="admin-sidebar__user-role">{formatRole(admin?.role)}</span>
        </div>
      </div>
    </aside>
  );
}
