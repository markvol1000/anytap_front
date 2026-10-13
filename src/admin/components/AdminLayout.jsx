import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar.jsx';
import { AdminTopbar } from './AdminTopbar.jsx';
import { AdminConfirmProvider } from './AdminConfirmModal.jsx';
import { getCurrentAdmin } from '../services/adminService.js';
import {
  clearAdminSession,
  hasAdminSession,
  hasMemberSession,
  hasMockSession,
  getMockSessionEmail,
  establishLoginSession,
  attemptLogout,
} from '../../lib/services/authService.js';
import { hasDemoAdminAccess } from '../../lib/demo-session.js';
import { clearHttpSession, getHttpSession } from '../../lib/api/httpSession.js';
import { clearAccessToken } from '../../lib/api/httpClient.js';
import { Icon } from '../../components/ui.jsx';

export function AdminLayout() {
  const [admin, setAdmin] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!cancelled) setAuthChecked(true);

      if (!hasMemberSession()) return;

      getCurrentAdmin()
        .then((a) => { if (!cancelled) setAdmin(a); })
        .catch((err) => {
          console.warn('[AdminLayout] getCurrentAdmin error:', err);
          const localSession = getHttpSession();
          const roleUpper = String(localSession?.role || '').trim().toUpperCase();
          if (localSession && (roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN')) {
            if (!cancelled) {
              setAdmin({
                name: localSession.name || localSession.loginId || localSession.email || 'Admin',
                email: localSession.email || '',
                role: roleUpper,
              });
            }
          } else if (!cancelled) {
            clearHttpSession();
            clearAdminSession();
            setAdmin(null);
            navigate('/login?expired=1&reason=forbidden', { replace: true });
          }
        });
    }

    check();
    return () => { cancelled = true; };
  }, [location.pathname, navigate]);

  useEffect(() => {
    const handleExpired = (e) => {
      const reason = e?.detail?.reason;
      clearHttpSession();
      clearAdminSession();
      setAdmin(null);
      setAuthChecked(true);
      navigate(`/login?expired=1&reason=${encodeURIComponent(reason || 'expired')}`, {
        replace: true,
        state: { from: location.pathname.startsWith('/admin') ? location.pathname : '/admin' },
      });
    };
    window.addEventListener('anytap-session-expired', handleExpired);
    return () => window.removeEventListener('anytap-session-expired', handleExpired);
  }, [location.pathname, navigate]);

  if (!authChecked) {
    return <div className="admin-shell admin-shell--gate"><p className="admin-loading">Loading…</p></div>;
  }

  const session = getHttpSession();
  const roleUpper = String(session?.role || '').trim().toUpperCase();
  const isAdmin = hasMemberSession() && session && (roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN');

  if (!isAdmin) {
    if (hasMemberSession()) {
      return <Navigate to="/account" replace />;
    }
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname.startsWith('/admin') ? location.pathname : '/admin' }}
      />
    );
  }

  const handleLogout = async () => {
    try {
      await attemptLogout();
    } catch { /* noop */ }
    clearHttpSession();
    clearAdminSession();
    clearAccessToken();
    navigate('/login', { replace: true });
  };

  return (
    <AdminConfirmProvider>
      <div className="admin-shell">
        <AdminSidebar admin={admin} onLogout={handleLogout} />
        <div className="admin-shell__body">
          <AdminTopbar onLogout={handleLogout} />
          <main className="admin-main">
            <Outlet />
          </main>
        </div>

        {/* Mobile floating bottom-left logout button */}
        <button
          type="button"
          className="admin-mobile-floating-logout"
          onClick={handleLogout}
          aria-label="Log Out"
        >
          <Icon name="logOut" size={15} stroke={1.75} />
          <span>Log Out</span>
        </button>
      </div>
    </AdminConfirmProvider>
  );
}
