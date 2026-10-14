import { useCallback, useEffect, useRef, useState } from 'react';

export function AdminSplitLayout({ left, right, className = '' }) {
  const showDetail = right != null && right !== false;

  return (
    <>
      <div className={`admin-stack${className ? ` ${className}` : ''}`}>
        <div className="admin-stack__main" style={{ width: '100%' }}>{left}</div>
      </div>
      {showDetail ? right : null}
    </>
  );
}

export function AdminDetailPanel({
  title,
  children,
  onClose,
  loading = false,
  hasData = true,
  emptyText,
}) {
  const [internalClosed, setInternalClosed] = useState(false);
  const modalRef = useRef(null);

  // If title or children changes, re-open if previously closed internally
  useEffect(() => {
    setInternalClosed(false);
  }, [title, children]);

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      setInternalClosed(true);
    }
  }, [onClose]);

  useEffect(() => {
    if (children && hasData && !internalClosed) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      setTimeout(() => {
        modalRef.current?.focus();
      }, 50);

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          handleClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [children, hasData, internalClosed, handleClose]);

  if (!children || !hasData || internalClosed) return null;

  return (
    <div
      className="admin-modal-backdrop"
      role="presentation"
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overscrollBehavior: 'contain',
      }}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(100%, 640px)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          background: '#ffffff',
          boxShadow: '0 20px 48px rgba(15, 23, 42, 0.25)',
          overflow: 'hidden',
          padding: 0,
          outline: 'none',
        }}
      >
        {/* Modal Header */}
        <div
          className="admin-modal__header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            margin: 0,
          }}
        >
          <h3 className="admin-modal__title" style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
            {title || 'Detail Information'}
          </h3>
          <button
            type="button"
            className="admin-modal__close"
            onClick={handleClose}
            title="Close"
            style={{ cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div
          className="admin-modal__body"
          style={{
            padding: '20px',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {loading ? <p className="admin-loading admin-loading--inline">Loading…</p> : children}
        </div>

        {/* Modal Footer */}
        <div
          className="admin-modal__footer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '12px 20px',
            borderTop: '1px solid #e2e8f0',
            margin: 0,
            backgroundColor: '#f8fafc',
          }}
        >
          <button
            type="button"
            className="admin-btn admin-btn--ghost"
            onClick={handleClose}
          >
            Close
          </button>
        </div>
      </div>
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

export function AdminDetailRow({ label, value, copyable = false }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    if (!copyable) return;
    e.stopPropagation();
    const strVal = typeof value === 'string' ? value : String(value || '');
    if (!strVal || strVal === '—' || strVal === '-') return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(strVal);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <div className="admin-detail-row">
      <span className="admin-detail-row__label">{label}</span>
      <span
        className="admin-detail-row__value"
        onClick={copyable ? handleCopy : undefined}
        style={copyable ? { cursor: 'pointer' } : undefined}
        title={copyable ? (copied ? 'Copied!' : 'Click to copy') : undefined}
      >
        {value ?? '—'}
        {copyable && copied && <span style={{ marginLeft: '4px', fontSize: '10px', color: '#16a34a' }}>✓</span>}
      </span>
    </div>
  );
}

export function AdminActionStack({ children, className = '' }) {
  return <div className={`admin-action-stack${className ? ` ${className}` : ''}`}>{children}</div>;
}
