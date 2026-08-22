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
