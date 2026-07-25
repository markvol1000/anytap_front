// Compact in-page header for portal child screens (Back + centered title).

import { Icon } from '../ui.jsx';

export function PortalPageHeader({ title, onBack, action = null }) {
  return (
    <header className="portal-page-bar">
      <div className="portal-page-bar__side portal-page-bar__side--start">
        <button
          type="button"
          className="portal-page-bar__back"
          onClick={onBack}
          aria-label="Go back">
          <Icon name="chevronLeft" size={24} stroke={2} />
        </button>
      </div>
      <h1 className="portal-page-bar__title">{title}</h1>
      <div className="portal-page-bar__side portal-page-bar__side--end">
        {action}
      </div>
    </header>
  );
}
