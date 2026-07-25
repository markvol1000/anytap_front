import { AdminPagination } from './AdminFilterBar.jsx';

export function AdminDataTable({
  columns,
  rows,
  rowKey = 'id',
  selectedId,
  onSelectRow,
  sortKey,
  sortDir,
  onSort,
  page,
  totalPages,
  total,
  onPageChange,
  emptyMessage = 'No records found',
}) {
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
          onPageChange={onPageChange}
        />
      ) : null}
    </>
  );
}

export function AdminMiniTable({ columns, rows = [], rowKey = 'id', emptyMessage = 'No records found' }) {
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
          ) : rows.map((row) => (
            <tr key={row[rowKey]}>
              {columns.map((col) => (
                <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
