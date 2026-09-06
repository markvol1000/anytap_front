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
}) {
  const page = pagination?.page ?? pageProp;
  const totalPages = pagination?.totalPages ?? totalPagesProp;
  const total = pagination?.total ?? totalProp;
  const pageSize = pagination?.pageSize;
  const onPageChange = pagination?.onPageChange ?? onPageChangeProp;
  const onPageSizeChange = pagination?.onPageSizeChange;

  return (
    <>
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

  return (
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
    </div>
  );
}

