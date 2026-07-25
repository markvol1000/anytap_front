import { Icon } from '../ui.jsx';
import { PortalButton } from '../portal/PortalButton';
import * as D from '../../lib/dashboard-state.js';

/** Single guidance screen when a portal page has no state-specific content yet */
export function PortalStateGuide({ s, title, body, cta }) {
  return (
    <section className="portal-state-guide portal-pop" aria-label={title}>
      <div className="portal-state-guide__card">
        <span className="portal-state-guide__icon" aria-hidden="true">
          <Icon name="shield" size={28} stroke={1.75} />
        </span>
        <h1 className="portal-state-guide__title">{title}</h1>
        {body ? <p className="portal-state-guide__body">{body}</p> : null}
        {cta ? (
          <PortalButton
            variant="primary"
            className="portal-state-guide__cta"
            onClick={() => D.runDashboardCta(s, cta)}>
            {cta.label}
          </PortalButton>
        ) : null}
      </div>
    </section>
  );
}
