import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
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
import { getHttpSession } from '../../lib/api/httpSession.js';

export function AdminLayout() {
  const [admin, setAdmin] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

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

  useEffect(() => {
    const handleExpired = (e) => {
      const reason = e?.detail?.reason;
      if (reason === 'server_unreachable') {
        // 서버 점검/무응답 시 차단 팝업 없이 로그인 페이지의 영문 토스트로 일관되게 처리
      } else if (reason === 'unauthorized') {
        window.alert('Admin session unauthorized or expired. Please sign in again.');
      } else {
        window.alert('Login session has expired due to 30 minutes of inactivity. Please log in again.');
      }
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
  const isMemberAdmin = hasMemberSession() && session && String(session.role).toUpperCase() === 'ADMIN';

  const canAccessAdmin = hasDemoAdminAccess()
    || isMemberAdmin
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
