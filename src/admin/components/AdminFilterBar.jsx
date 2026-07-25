export function AdminFilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters = [],
  extra,
}) {
  return (
    <div className="admin-filter-bar">
      <div className="admin-filter-bar__search">
        <input
          type="search"
          className="admin-input admin-input--search"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search"
        />
      </div>
      {filters.map((f) => (
        <label key={f.key} className="admin-filter-bar__field">
          <span className="admin-filter-bar__label">{f.label}</span>
          <select
            className="admin-select"
            value={f.value}
            onChange={(e) => f.onChange(e.target.value)}>
            {(f.options ?? []).map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>
      ))}
      {extra ? <div className="admin-filter-bar__extra">{extra}</div> : null}
    </div>
  );
}

export function AdminPageHeader({ title, description, actions }) {
  return (
    <header className="admin-page-head">
      <div>
        <h1 className="admin-page-head__title">{title}</h1>
        {description ? <p className="admin-page-head__desc">{description}</p> : null}
      </div>
      {actions ? <div className="admin-page-head__actions">{actions}</div> : null}
    </header>
  );
}

export function AdminPanel({ children, className = '' }) {
  return <div className={`admin-panel${className ? ` ${className}` : ''}`}>{children}</div>;
}

export function AdminTableWrap({ children, loading, error, hasData = false }) {
  const showBlockingLoader = loading && !hasData;

  return (
    <div className={`admin-table-wrap${loading && hasData ? ' admin-table-wrap--refreshing' : ''}`}>
      {showBlockingLoader ? <div className="admin-table-wrap__state">Loading…</div> : null}
      {error ? <div className="admin-table-wrap__state admin-table-wrap__state--error">{error}</div> : null}
      {!showBlockingLoader && !error ? children : null}
    </div>
  );
}

export function AdminPagination({ page, totalPages, total, onPageChange }) {
  return (
    <div className="admin-pagination">
      <span className="admin-pagination__info">{total} total</span>
      <div className="admin-pagination__controls">
        <button
          type="button"
          className="admin-btn admin-btn--ghost admin-btn--sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}>
          Previous
        </button>
        <span className="admin-pagination__page">{page} / {totalPages}</span>
        <button
          type="button"
          className="admin-btn admin-btn--ghost admin-btn--sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
