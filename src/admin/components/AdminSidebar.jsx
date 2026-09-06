import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Icon } from '../../components/ui.jsx';

const OPS_NAV = [
  { to: '/admin', end: true, label: 'Dashboard', icon: 'chart' },
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

function NavItems({ items, onItemClick }) {
  const location = useLocation();
  const currentPath = location.pathname;

  return items.map((item) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      onClick={onItemClick}
      className={({ isActive }) => {
        const isPrefixActive = !item.end && item.to !== '/admin' && currentPath.startsWith(item.to);
        const isDashActive = item.end && (currentPath === '/admin' || currentPath === '/admin/' || currentPath === '/admin/dashboard');
        return `admin-sidebar__link${isActive || isPrefixActive || isDashActive ? ' is-active' : ''}`;
      }}>
      <Icon name={item.icon} size={17} stroke={1.75} />
      <span>{item.label}</span>
    </NavLink>
  ));
}

export function AdminSidebar({ admin }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const currentPath = location.pathname;

  // Identify current page title for mobile topbar
  const allNav = [...OPS_NAV, ...SYSTEM_NAV];
  const currentPage = allNav.find((it) =>
    it.end
      ? currentPath === it.to || currentPath === `${it.to}/` || currentPath === '/admin/dashboard'
      : currentPath.startsWith(it.to)
  );
  const pageTitle = currentPage ? currentPage.label : 'Ops Console';

  // Automatically close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && mobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  return (
    <>
      {/* ── Desktop Sidebar (Hidden on mobile < 768px via CSS) ── */}
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
          <NavItems items={OPS_NAV} />

          <div className="admin-sidebar__section-label" style={{ marginTop: '20px' }}>SYSTEM</div>
          <NavItems items={SYSTEM_NAV} />
        </nav>

        <div className="admin-sidebar__foot">
          <div className="admin-sidebar__profile">
            <div className="admin-sidebar__avatar">
              {initials(admin?.name || admin?.email || 'Admin')}
            </div>
            <div className="admin-sidebar__profile-body">
              <div className="admin-sidebar__user">{admin?.name || admin?.email?.split('@')[0] || 'Admin'}</div>
              <div className="admin-sidebar__role">{formatRole(admin?.role)}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Mobile Sticky Topbar (Visible only on mobile < 768px via CSS) ── */}
      <header className="admin-mobile-header">
        <div className="admin-mobile-header__brand">
          <div className="admin-sidebar__logo" style={{ color: '#fff' }}>
            <Icon name="shieldCheck" size={22} />
          </div>
          <div className="admin-mobile-header__titles">
            <strong className="admin-mobile-header__title">AnyTap Admin</strong>
            <span className="admin-mobile-header__subtitle">{pageTitle}</span>
          </div>
        </div>

        <button
          type="button"
          className="admin-mobile-header__burger"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileOpen}
        >
          <Icon name={mobileOpen ? 'close' : 'menu'} size={22} />
        </button>
      </header>

      {/* ── Mobile Slide-Over Drawer with Blurred Backdrop ── */}
      <div
        className={`admin-mobile-drawer${mobileOpen ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Admin Navigation Menu"
        aria-hidden={!mobileOpen}
      >
        {/* Backdrop with Blur */}
        <div
          className="admin-mobile-drawer__backdrop"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu backdrop"
        />

        {/* Drawer Panel */}
        <aside className="admin-mobile-drawer__panel">
          <div className="admin-mobile-drawer__head">
            <div className="admin-sidebar__brand" style={{ padding: 0 }}>
              <div className="admin-sidebar__logo">
                <Icon name="shieldCheck" size={22} />
              </div>
              <div className="admin-sidebar__brand-text">
                <strong className="admin-sidebar__title">AnyTap Admin</strong>
                <span className="admin-sidebar__subtitle">Ops Console</span>
              </div>
            </div>

            <button
              type="button"
              className="admin-mobile-drawer__close"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation menu"
            >
              <Icon name="close" size={20} />
            </button>
          </div>

          <nav className="admin-mobile-drawer__nav">
            <div className="admin-sidebar__section-label">OPERATIONS</div>
            <NavItems items={OPS_NAV} onItemClick={() => setMobileOpen(false)} />

            <div className="admin-sidebar__section-label" style={{ marginTop: '20px' }}>SYSTEM</div>
            <NavItems items={SYSTEM_NAV} onItemClick={() => setMobileOpen(false)} />

            <div className="admin-mobile-drawer__divider" />

            <Link
              to="/"
              className="admin-sidebar__link admin-mobile-drawer__homelink"
              onClick={() => setMobileOpen(false)}
            >
              <Icon name="home" size={17} stroke={1.75} />
              <span>Go to Homepage</span>
            </Link>
          </nav>

          <div className="admin-sidebar__foot" style={{ marginTop: 'auto', paddingTop: '16px' }}>
            <div className="admin-sidebar__profile">
              <div className="admin-sidebar__avatar">
                {initials(admin?.name || admin?.email || 'Admin')}
              </div>
              <div className="admin-sidebar__profile-body">
                <div className="admin-sidebar__user">{admin?.name || admin?.email?.split('@')[0] || 'Admin'}</div>
                <div className="admin-sidebar__role">{formatRole(admin?.role)}</div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
