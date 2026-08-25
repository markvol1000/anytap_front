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

export function AdminPagination({ page, totalPages, total, pageSize, onPageChange, onPageSizeChange }) {
  return (
    <div className="admin-pagination" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      borderTop: '1px solid #e2e8f0',
      backgroundColor: '#ffffff'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: '#64748b' }}>
        <span>Total <strong style={{ color: '#0f172a' }}>{total}</strong> items</span>
        {onPageSizeChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Per page:</span>
            <select
              value={pageSize || 10}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              style={{
                padding: '2px 6px',
                fontSize: '12px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                color: '#1e293b',
                backgroundColor: '#ffffff'
              }}
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
        )}
      </div>

      <div className="admin-pagination__controls" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          className="admin-btn admin-btn--ghost admin-btn--sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          style={{ padding: '4px 10px', fontSize: '12px' }}
        >
          ‹ Prev
        </button>
        <span className="admin-pagination__page" style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
          {page} / {totalPages || 1} Pages
        </span>
        <button
          type="button"
          className="admin-btn admin-btn--ghost admin-btn--sm"
          disabled={page >= (totalPages || 1)}
          onClick={() => onPageChange(page + 1)}
          style={{ padding: '4px 10px', fontSize: '12px' }}
        >
          Next ›
        </button>
      </div>
    </div>
  );
}
