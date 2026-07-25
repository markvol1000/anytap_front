import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui.jsx';

export function AdminTopbar() {
  return (
    <header className="admin-topbar">
      <Link to="/" className="admin-topbar__home">
        <Icon name="home" size={16} stroke={1.75} />
        <span>Go to homepage</span>
      </Link>
    </header>
  );
}
