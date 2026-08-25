import { NavLink, useLocation } from 'react-router-dom';
import { Icon } from '../../components/ui.jsx';

const OPS_NAV = [
  { to: '/admin/hanzb', end: true, label: 'Dashboard', icon: 'chart' },
  { to: '/admin/members', label: 'Members', icon: 'users' },
  { to: '/admin/kyc', label: 'KYC', icon: 'shield' },
  { to: '/admin/cards', label: 'Cards', icon: 'creditCard' },
  { to: '/admin/reports', label: 'Reports', icon: 'list' },
  { to: '/admin/wallets', label: 'Wallets', icon: 'wallet' },
  { to: '/admin/transactions', label: 'Transactions', icon: 'receipt' },
  { to: '/admin/referral', label: 'Referral List', icon: 'trophy' },
  { to: '/admin/withdrawals', label: 'Withdrawals', icon: 'arrowUpRight' },
];

const SYSTEM_NAV = [
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
  const location = useLocation();
  const currentPath = location.pathname;

  return items.map((item) => {
    if (item.subItems) {
      const isParentActive = currentPath.startsWith(item.to);
      return (
        <div key={item.to} className="admin-sidebar__group" style={{ marginBottom: '4px' }}>
          <NavLink
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `admin-sidebar__link${isActive || isParentActive ? ' is-active' : ''}`}>
            <Icon name={item.icon} size={17} stroke={1.75} />
            <span>{item.label}</span>
          </NavLink>
          <div className="admin-sidebar__subnav" style={{ paddingLeft: '28px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {item.subItems.map((sub) => (
              <NavLink
                key={sub.to}
                to={sub.to}
                className={({ isActive }) =>
                  `admin-sidebar__sublink${isActive ? ' is-active' : ''}`}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  padding: '5px 10px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  color: isActive ? 'var(--admin-primary, #2563EB)' : 'var(--admin-sidebar-text, #64748B)',
                  backgroundColor: isActive ? 'var(--admin-primary-bg, #EFF6FF)' : 'transparent',
                  fontWeight: isActive ? '600' : '400',
                  textDecoration: 'none'
                })}>
                <span>{sub.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      );
    }

    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        className={({ isActive }) => {
          const isPrefixActive = !item.end && item.to !== '/admin' && currentPath.startsWith(item.to);
          return `admin-sidebar__link${isActive || isPrefixActive ? ' is-active' : ''}`;
        }}>
        <Icon name={item.icon} size={17} stroke={1.75} />
        <span>{item.label}</span>
      </NavLink>
    );
  });
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
