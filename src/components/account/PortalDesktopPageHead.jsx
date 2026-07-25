// Desktop content-area page title + optional breadcrumb (no back button).

export function PortalDesktopPageHead({ title, breadcrumb = [], actions = null }) {
  const crumbs = breadcrumb.filter(Boolean);

  return (
    <header className={`portal-desktop-page-head${actions ? ' portal-desktop-page-head--actions' : ''}`}>
      <div className="portal-desktop-page-head__main">
        {crumbs.length > 1 && (
          <nav className="portal-desktop-page-head__crumb" aria-label="Breadcrumb">
            <ol className="portal-desktop-page-head__crumb-list">
              {crumbs.map((label, i) => (
                <li key={`${label}-${i}`} className="portal-desktop-page-head__crumb-item">
                  {i > 0 && (
                    <span className="portal-desktop-page-head__crumb-sep" aria-hidden="true">
                      /
                    </span>
                  )}
                  <span>{label}</span>
                </li>
              ))}
            </ol>
          </nav>
        )}
        <h1 className="portal-desktop-page-head__title">{title}</h1>
      </div>
      {actions ? (
        <div className="portal-desktop-page-head__actions">{actions}</div>
      ) : null}
    </header>
  );
}
