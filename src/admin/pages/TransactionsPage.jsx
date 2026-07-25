import { useCallback, useState } from 'react';
import { AdminDataTable } from '../components/AdminDataTable.jsx';
import { AdminFilterBar, AdminPageHeader, AdminPanel, AdminTableWrap } from '../components/AdminFilterBar.jsx';
import { AdminDetailPanel, AdminDetailRow, AdminSplitLayout } from '../components/AdminSplitLayout.jsx';
import { AdminStatusBadge, formatAdminDate, formatUsdt } from '../components/AdminStatusBadge.jsx';
import { useAdminList } from '../hooks/useAdminList.js';
import { exportTransactionsCsv, getTransactions } from '../services/adminService.js';

const fetchTx = (params) => getTransactions(params);

const KIND_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'card', label: 'Card' },
  { value: 'wallet_topup', label: 'Top Up' },
  { value: 'card_spend', label: 'Payment' },
  { value: 'refund', label: 'Refund' },
  { value: 'wallet_withdraw', label: 'Withdrawal' },
];

export function TransactionsPage() {
  const [selectedId, setSelectedId] = useState(null);
  const list = useAdminList(fetchTx, {}, { urlKeys: ['kind', 'status'] });

  const handleExport = useCallback(async () => {
    const csv = await exportTransactionsCsv({
      search: list.search,
      kind: list.filters.kind,
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'anytap-transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [list.filters.kind, list.search]);

  const selected = (list.items || []).find((r) => r.id === selectedId);

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Transactions"
        description="Unified ledger — wallet, card, top-up, payment, refund, withdrawal."
        actions={(
          <button type="button" className="admin-btn admin-btn--primary" onClick={handleExport}>
            CSV Export
          </button>
        )}
      />

      <AdminSplitLayout
        left={(
          <AdminPanel>
            <AdminFilterBar
              search={list.search}
              onSearchChange={list.setSearch}
              searchPlaceholder="Search member or reference…"
              filters={[
                {
                  key: 'kind',
                  label: 'Type',
                  value: list.filters.kind ?? 'all',
                  onChange: (v) => list.setFilter('kind', v),
                  options: KIND_OPTIONS,
                },
              ]}
            />
            <AdminTableWrap loading={list.loading} error={list.error} hasData={(list.items || []).length > 0}>
              <AdminDataTable
                columns={[
                  { key: 'id', label: 'ID' },
                  { key: 'memberName', label: 'Member' },
                  { key: 'kind', label: 'Kind' },
                  { key: 'amount', label: 'Amount', render: (r) => formatUsdt(r.amount) },
                  { key: 'status', label: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
                  { key: 'at', label: 'Date', render: (r) => formatAdminDate(r.at) },
                  { key: 'reference', label: 'Reference' },
                ]}
                rows={list.items || []}
                selectedId={selectedId}
                onSelectRow={(r) => setSelectedId(r.id)}
                sortKey={list.sortKey}
                sortDir={list.sortDir}
                onSort={list.toggleSort}
                page={list.page}
                totalPages={list.totalPages}
                total={list.total}
                onPageChange={list.setPage}
              />
            </AdminTableWrap>
          </AdminPanel>
        )}
        right={selected ? (
          <AdminDetailPanel title="Transaction detail">
            <AdminDetailRow label="ID" value={selected.id} />
            <AdminDetailRow label="Member" value={selected.memberName} />
            <AdminDetailRow label="Kind" value={selected.kind} />
            <AdminDetailRow label="Amount" value={formatUsdt(selected.amount)} />
            <AdminDetailRow label="Status" value={<AdminStatusBadge status={selected.status} />} />
            <AdminDetailRow label="Date" value={formatAdminDate(selected.at)} />
            <AdminDetailRow label="Reference" value={selected.reference} />
          </AdminDetailPanel>
        ) : null}
      />
    </div>
  );
}
