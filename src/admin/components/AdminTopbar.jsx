import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../../components/ui.jsx';
import { clearAdminSession, attemptLogout } from '../../lib/services/authService.js';
import { clearHttpSession } from '../../lib/api/httpSession.js';
import { clearAccessToken } from '../../lib/api/httpClient.js';
import { useAdminRefresh } from '../context/AdminRefreshContext.jsx';

export function AdminTopbar({ onLogout }) {
  const navigate = useNavigate();
  const { refreshHandler, isRefreshing } = useAdminRefresh();

  const handleLogout = async () => {
    if (onLogout) {
      await onLogout();
      return;
    }
    try {
      await attemptLogout();
    } catch { /* noop */ }
    clearHttpSession();
    clearAdminSession();
    clearAccessToken();
    navigate('/login', { replace: true });
  };

  return (
    <header className="admin-topbar">
      <Link to="/" className="admin-topbar__home">
        <Icon name="home" size={16} stroke={1.75} />
        <span>Go to homepage</span>
      </Link>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          type="button"
          onClick={() => {
            if (typeof refreshHandler === 'function') {
              refreshHandler();
            } else {
              window.location.reload();
            }
          }}
          disabled={isRefreshing}
          className="admin-topbar__refresh"
          aria-label="Refresh latest data"
          title="Refresh latest data"
          style={{
            background: 'none',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '6px 8px',
            cursor: 'pointer',
            color: 'var(--admin-text-muted, #64748b)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: isRefreshing ? 'rotate(360deg)' : 'none',
              transition: 'transform 0.6s ease',
            }}
          >
            <Icon name="refresh" size={15} stroke={2} />
          </span>
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="admin-topbar__home"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--admin-text-muted, #94a3b8)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          <Icon name="logOut" size={16} stroke={1.75} />
          <span>Log Out</span>
        </button>
      </div>
    </header>
  );
}
