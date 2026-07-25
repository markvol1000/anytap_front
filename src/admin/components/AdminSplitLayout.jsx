export function AdminSplitLayout({ left, right, className = '' }) {
  const showDetail = right != null && right !== false;

  return (
    <div className={`admin-stack${className ? ` ${className}` : ''}`}>
      <div className="admin-stack__main">{left}</div>
      {showDetail ? <div className="admin-stack__detail">{right}</div> : null}
    </div>
  );
}

export function AdminDetailPanel({ title, children }) {
  if (!children) return null;

  return (
    <div className="admin-detail">
      {title ? <h2 className="admin-detail__title">{title}</h2> : null}
      <div className="admin-detail__body">{children}</div>
    </div>
  );
}

export function AdminDetailSection({ title, children }) {
  return (
    <section className="admin-detail-section">
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

export function AdminActionStack({ children }) {
  return <div className="admin-action-stack">{children}</div>;
}
