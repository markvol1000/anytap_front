export function AdminSplitLayout({ left, right, className = '' }) {
  const showDetail = right != null && right !== false;

  return (
    <div className={`admin-stack${showDetail ? ' admin-stack--split' : ''}${className ? ` ${className}` : ''}`}>
      <div className="admin-stack__main">{left}</div>
      {showDetail ? <div className="admin-stack__detail">{right}</div> : null}
    </div>
  );
}

export function AdminDetailPanel({ title, children, onClose }) {
  if (!children) return null;

  return (
    <div className="admin-detail">
      {title ? (
        <div className="admin-detail__head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 className="admin-detail__title" style={{ margin: 0 }}>{title}</h2>
          {onClose ? (
            <button
              type="button"
              className="admin-btn admin-btn--ghost admin-btn--sm"
              onClick={onClose}
              style={{ padding: '2px 8px', fontSize: '12px' }}
              title="Close panel"
            >
              ✕ Close
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="admin-detail__body">{children}</div>
    </div>
  );
}

export function AdminDetailSection({ title, children, className = '' }) {
  return (
    <section className={`admin-detail-section${className ? ` ${className}` : ''}`}>
      {title ? <h3 className="admin-detail-section__title">{title}</h3> : null}
      {children}
    </section>
  );
}

export function AdminDetailRow({ label, value }) {
  return (
    <div className="admin-detail-row">
      <span className="admin-detail-row__label">{label}</span>
      <span className="admin-detail-row__value">{value ?? '—'}</span>
    </div>
  );
}

export function AdminActionStack({ children, className = '' }) {
  return <div className={`admin-action-stack${className ? ` ${className}` : ''}`}>{children}</div>;
}
