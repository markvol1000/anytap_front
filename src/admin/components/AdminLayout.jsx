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
} from '../../lib/services/authService.js';
import { hasDemoAdminAccess } from '../../lib/demo-session.js';
import { clearHttpSession, getHttpSession } from '../../lib/api/httpSession.js';

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
        .catch(() => {
          if (!cancelled) {
            const s = getHttpSession();
            if (s && (String(s.role).toUpperCase() === 'ADMIN' || String(s.role).toUpperCase() === 'SUPER_ADMIN')) {
              setAdmin({
                name: s?.loginId || s?.email?.split('@')[0] || 'Admin',
                email: s?.email || '',
                role: s?.role || 'ADMIN',
              });
            }
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
        const curSession = getHttpSession();
        const roleUpper = String(curSession?.role || '').trim().toUpperCase();
        if (roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN') {
          // Do not kick out admin on sub-resource unauthorized
          return;
        }
        window.alert('Admin session unauthorized or expired. Please sign in again.');
      } else {
        window.alert('Login session has expired due to 30 minutes of inactivity. Please log in again.');
      }
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
