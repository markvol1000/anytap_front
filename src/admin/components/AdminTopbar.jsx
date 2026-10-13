import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../../components/ui.jsx';
import { clearAdminSession, attemptLogout } from '../../lib/services/authService.js';
import { clearHttpSession } from '../../lib/api/httpSession.js';
import { clearAccessToken } from '../../lib/api/httpClient.js';

export function AdminTopbar({ onLogout }) {
  const navigate = useNavigate();

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
      <button
        type="button"
        onClick={handleLogout}
        className="admin-topbar__home"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          marginLeft: 'auto',
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
    </header>
  );
}
