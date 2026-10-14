import { useState, useEffect } from 'react';
import { AdminPagination } from './AdminFilterBar.jsx';

export function AdminDataTable({
  columns,
  rows,
  rowKey = 'id',
  selectedId,
  onSelectRow,
  onDoubleClickRow,
  sortKey,
  sortDir,
  onSort,
  page: pageProp,
  totalPages: totalPagesProp,
  total: totalProp,
  onPageChange: onPageChangeProp,
  pagination,
  emptyMessage = 'No records found',
  renderMobileCard,
}) {
  const page = pagination?.page ?? pageProp;
  const totalPages = pagination?.totalPages ?? totalPagesProp;
  const total = pagination?.total ?? totalProp;
  const pageSize = pagination?.pageSize;
  const onPageChange = pagination?.onPageChange ?? onPageChangeProp;
  const onPageSizeChange = pagination?.onPageSizeChange;

  const defaultRenderMobileCard = (row) => {
    // Pick first column for title/identifier
    const firstCol = columns[0];
    const firstVal = firstCol?.render ? firstCol.render(row) : row[firstCol?.key];

    // Find any status/badge column
    const statusCol = columns.find((c) => {
      const k = String(c.key || '').toLowerCase();
      return (
        k.includes('status') ||
        k.includes('role') ||
        k.includes('channel') ||
        k.includes('type') ||
        k === 'origin' ||
        k === 'bannedby'
      );
    });
    const statusVal = statusCol && statusCol !== firstCol ? (statusCol.render ? statusCol.render(row) : row[statusCol.key]) : null;

    // Find any action column
    const actionCol = columns.find((c) => c.key === 'actions' || c.key === 'action');
    const actionVal = actionCol && actionCol !== firstCol && actionCol !== statusCol ? (actionCol.render ? actionCol.render(row) : row[actionCol.key]) : null;

    // Find date/time column
    const dateCol = columns.find((c) => {
      const k = String(c.key || '').toLowerCase();
      return k.includes('date') || k.includes('at') || k.includes('time') || k.includes('created');
    });
    const dateVal = dateCol && dateCol !== firstCol ? (dateCol.render ? dateCol.render(row) : row[dateCol.key]) : null;

    // Find secondary descriptive/note column
    const detailCol = columns.find((c) => {
      if (c === firstCol || c === statusCol || c === actionCol || c === dateCol) return false;
      const k = String(c.key || '').toLowerCase();
      return (
        k.includes('reason') ||
        k.includes('note') ||
        k.includes('desc') ||
        k.includes('target') ||
        k.includes('email') ||
        k.includes('name') ||
        k.includes('amount') ||
        k.includes('ip') ||
        k.includes('address') ||
        k.includes('subject')
      );
    });
    const detailVal = detailCol ? (detailCol.render ? detailCol.render(row) : row[detailCol.key]) : null;

    // Find meta column if available
    const metaCol = columns.find((c) => (
      c !== firstCol &&
      c !== statusCol &&
      c !== actionCol &&
      c !== dateCol &&
      c !== detailCol
    ));
    const metaVal = metaCol ? (metaCol.render ? metaCol.render(row) : row[metaCol.key]) : null;

    return (
      <>
        <div className="admin-mobile-card__row1">
          <div className="admin-mobile-card__left">
            <span className="admin-mobile-card__title">{firstVal}</span>
            {statusVal}
          </div>
          {actionVal && <div style={{ flexShrink: 0 }}>{actionVal}</div>}
        </div>
        <div className="admin-mobile-card__row2">
          {detailVal && <span className="admin-mobile-card__detail">{detailVal}</span>}
          {metaVal && (
            <>
              {detailVal && <span style={{ color: '#cbd5e1' }}>•</span>}
              <span className="admin-mobile-card__meta">{metaVal}</span>
            </>
          )}
          {dateVal && (
            <>
              {(detailVal || metaVal) && <span style={{ color: '#cbd5e1' }}>•</span>}
              <span className="admin-mobile-card__date">{dateVal}</span>
            </>
          )}
        </div>
      </>
    );
  };

  const cardRenderer = renderMobileCard || defaultRenderMobileCard;

  return (
    <>
      {/* Desktop Table View */}
      <div className="admin-table-desktop-view">
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key} scope="col">
                    {col.sortable !== false && onSort ? (
                      <button
                        type="button"
                        className={`admin-table__sort${sortKey === col.key ? ' is-active' : ''}`}
                        onClick={() => onSort(col.key)}>
                        {col.label}
                        {sortKey === col.key ? (
                          <span className="admin-table__sort-dir" aria-hidden="true">
                            {sortDir === 'asc' ? '↑' : '↓'}
                          </span>
                        ) : null}
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="admin-table__empty">{emptyMessage}</td>
                </tr>
              ) : rows.map((row) => {
                const id = row[rowKey];
                const active = selectedId === id;
                return (
                  <tr
                    key={id}
                    className={active ? 'is-selected' : ''}
                    onClick={() => onSelectRow?.(row)}
                    onDoubleClick={() => (onDoubleClickRow ? onDoubleClickRow(row) : onSelectRow?.(row))}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectRow?.(row);
                      }
                    }}>
                    {columns.map((col) => (
                      <td key={col.key}>
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile 2-Line Responsive View */}
      <div className="admin-table-mobile-view">
        {rows.length === 0 ? (
          <div className="admin-table__empty" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            {emptyMessage}
          </div>
        ) : (
          rows.map((row) => {
            const id = row[rowKey];
            const active = selectedId === id;
            return (
              <div
                key={id}
                className={`admin-mobile-card${active ? ' is-selected' : ''}`}
                onClick={() => onSelectRow?.(row)}
                onDoubleClick={() => (onDoubleClickRow ? onDoubleClickRow(row) : onSelectRow?.(row))}
              >
                {cardRenderer(row, active)}
              </div>
            );
          })
        )}
      </div>

      {onPageChange ? (
        <AdminPagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      ) : null}
    </>
  );
}

export function AdminMiniTable({
  columns,
  rows = [],
  rowKey = 'id',
  pageSize = 10,
  pagination = true,
  page: controlledPage,
  onPageChange: controlledOnPageChange,
  emptyMessage = 'No records found',
  renderMobileCard,
}) {
  const [internalPage, setInternalPage] = useState(1);

  // Reset internal page to 1 if rows reference or length changes significantly
  useEffect(() => {
    setInternalPage(1);
  }, [rows]);

  const isControlled = typeof controlledPage === 'number' && typeof controlledOnPageChange === 'function';
  const total = rows.length;
  const isPaged = pagination && pageSize > 0;
  const totalPages = isPaged ? Math.max(1, Math.ceil(total / pageSize)) : 1;

  const currentPage = isControlled
    ? Math.max(1, Math.min(controlledPage, totalPages))
    : Math.max(1, Math.min(internalPage, totalPages));

  const handlePageChange = (newPage) => {
    const clamped = Math.max(1, Math.min(newPage, totalPages));
    if (isControlled) {
      controlledOnPageChange(clamped);
    } else {
      setInternalPage(clamped);
    }
  };

  const pagedRows = isPaged
    ? rows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : rows;

  const defaultRenderCard = (row) => {
    const firstCol = columns[0];
    const firstVal = firstCol?.render ? firstCol.render(row) : row[firstCol?.key];

    const statusCol = columns.find((c) => {
      const k = String(c.key || '').toLowerCase();
      return (
        k.includes('status') ||
        k.includes('role') ||
        k.includes('channel') ||
        k.includes('type')
      );
    });
    const statusVal = statusCol && statusCol !== firstCol ? (statusCol.render ? statusCol.render(row) : row[statusCol.key]) : null;

    const actionCol = columns.find((c) => c.key === 'actions' || c.key === 'action');
    const actionVal = actionCol && actionCol !== firstCol && actionCol !== statusCol ? (actionCol.render ? actionCol.render(row) : row[actionCol.key]) : null;

    const dateCol = columns.find((c) => {
      const k = String(c.key || '').toLowerCase();
      return k.includes('date') || k.includes('at') || k.includes('time') || k.includes('created');
    });
    const dateVal = dateCol && dateCol !== firstCol ? (dateCol.render ? dateCol.render(row) : row[dateCol.key]) : null;

    const detailCol = columns.find((c) => {
      if (c === firstCol || c === statusCol || c === actionCol || c === dateCol) return false;
      const k = String(c.key || '').toLowerCase();
      return (
        k.includes('reason') ||
        k.includes('note') ||
        k.includes('desc') ||
        k.includes('meta') ||
        k.includes('detail') ||
        k.includes('target') ||
        k.includes('email') ||
        k.includes('name') ||
        k.includes('amount') ||
        k.includes('ip') ||
        k.includes('address')
      );
    });
    const detailVal = detailCol ? (detailCol.render ? detailCol.render(row) : row[detailCol.key]) : null;

    return (
      <>
        <div className="admin-mobile-card__row1">
          <div className="admin-mobile-card__left">
            <span className="admin-mobile-card__title">{firstVal}</span>
            {statusVal}
          </div>
          {actionVal && <div style={{ flexShrink: 0 }}>{actionVal}</div>}
        </div>
        <div className="admin-mobile-card__row2">
          {detailVal && <span className="admin-mobile-card__detail">{detailVal}</span>}
          {dateVal && (
            <>
              {detailVal && <span style={{ color: '#cbd5e1' }}>•</span>}
              <span className="admin-mobile-card__date">{dateVal}</span>
            </>
          )}
        </div>
      </>
    );
  };

  const cardRenderer = renderMobileCard || defaultRenderCard;

  return (
    <>
      <div className="admin-table-desktop-view">
        <div className="admin-table-scroll admin-table-scroll--compact">
          <table className="admin-table admin-table--compact">
            <thead>
              <tr>
                {columns.map((col) => <th key={col.key}>{col.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="admin-table__empty">{emptyMessage}</td>
                </tr>
              ) : (
                pagedRows.map((row, rIdx) => {
                  const globalIndex = isPaged ? (currentPage - 1) * pageSize + rIdx : rIdx;
                  return (
                    <tr key={row[rowKey] || globalIndex}>
                      {columns.map((col) => (
                        <td key={col.key}>
                          {col.render ? col.render(row, globalIndex) : row[col.key]}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-table-mobile-view" style={{ padding: '8px' }}>
        {rows.length === 0 ? (
          <div className="admin-table__empty" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            {emptyMessage}
          </div>
        ) : (
          pagedRows.map((row, rIdx) => {
            const globalIndex = isPaged ? (currentPage - 1) * pageSize + rIdx : rIdx;
            const id = row[rowKey] || globalIndex;
            return (
              <div key={id} className="admin-mobile-card">
                {cardRenderer(row)}
              </div>
            );
          })
        )}
      </div>

      {isPaged && totalPages > 1 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc',
          fontSize: '12px',
          color: '#64748b',
        }}>
          <div>
            <span>Total <strong style={{ color: '#1e293b' }}>{total}</strong> items (Page {currentPage} of {totalPages})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              className="admin-btn admin-btn--ghost admin-btn--sm"
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
              style={{ padding: '3px 8px', fontSize: '11px', lineHeight: 1 }}
            >
              ‹ Prev
            </button>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#1e293b', minWidth: '45px', textAlign: 'center' }}>
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              className="admin-btn admin-btn--ghost admin-btn--sm"
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              style={{ padding: '3px 8px', fontSize: '11px', lineHeight: 1 }}
            >
              Next ›
            </button>
          </div>
        </div>
      )}
    </>
  );
}

