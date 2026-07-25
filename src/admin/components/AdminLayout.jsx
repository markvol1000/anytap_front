import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar.jsx';
import { AdminTopbar } from './AdminTopbar.jsx';
import { AdminConfirmProvider } from './AdminConfirmModal.jsx';
import { getCurrentAdmin } from '../services/adminService.js';
import {
  hasAdminSession,
  hasMemberSession,
  hasMockSession,
  isAdminEmail,
  getMockSessionEmail,
  establishLoginSession,
} from '../../lib/services/authService.js';
import { hasDemoAdminAccess } from '../../lib/demo-session.js';

export function AdminLayout() {
  const [admin, setAdmin] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const email = getMockSessionEmail();
      if (isAdminEmail(email)) {
        establishLoginSession(email);
      }
      if (!cancelled) setAuthChecked(true);

      const demoAdmin = hasDemoAdminAccess();
      if (!hasMemberSession() && !demoAdmin) return;

      getCurrentAdmin()
        .then((a) => { if (!cancelled) setAdmin(a); })
        .catch(() => {
          if (!cancelled) {
            setAdmin({
              name: demoAdmin ? 'Demo Admin' : (email?.split('@')[0] || 'Admin'),
              email: email || 'demo-admin@anytap.io',
              role: demoAdmin ? 'demo_preview' : 'temporary_access',
            });
          }
        });
    }

    check();
    return () => { cancelled = true; };
  }, [location.pathname]);

  if (!authChecked) {
    return <div className="admin-shell admin-shell--gate"><p className="admin-loading">Loading…</p></div>;
  }

  const canAccessAdmin = hasDemoAdminAccess()
    || hasMemberSession()
    || hasAdminSession()
    || (hasMockSession() && isAdminEmail(getMockSessionEmail()));

  if (!canAccessAdmin) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname.startsWith('/admin') ? location.pathname : '/admin' }}
      />
    );
  }

  return (
    <AdminConfirmProvider>
      <div className="admin-shell">
        <AdminSidebar admin={admin} />
        <div className="admin-shell__body">
          <AdminTopbar />
          <main className="admin-main">
            <Outlet />
          </main>
        </div>
      </div>
    </AdminConfirmProvider>
  );
}
