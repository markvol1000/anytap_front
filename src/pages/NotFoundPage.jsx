import { Link } from 'react-router-dom';
import { Icon } from '../components/ui.jsx';

export function NotFoundPage() {
  return (
    <section className="section authwrap">
      <div className="shell authwrap__inner">
        <div className="authcard" style={{ textAlign: 'center' }}>
          <p className="eyebrow" style={{ justifyContent: 'center' }}>
            <span className="dot" /> 404
          </p>
          <h1 className="authcard__title">Page not found</h1>
          <p className="authcard__sub">The page you are looking for does not exist or has moved.</p>
          <Link to="/" className="btn btn--accent btn--lg" style={{ marginTop: 16 }}>
            Back to home <Icon name="arrowRight" size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
