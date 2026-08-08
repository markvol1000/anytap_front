import { useCallback, useState } from 'react';
import { AdminDataTable } from '../components/AdminDataTable.jsx';
import { AdminFilterBar, AdminPageHeader, AdminPanel, AdminTableWrap } from '../components/AdminFilterBar.jsx';
import {
  AdminActionStack,
  AdminDetailPanel,
  AdminDetailRow,
  AdminDetailSection,
  AdminSplitLayout,
} from '../components/AdminSplitLayout.jsx';
import { AdminStatusBadge, formatAdminDate, formatUsdt } from '../components/AdminStatusBadge.jsx';
import { runConfirm, useAdminConfirm } from '../components/AdminConfirmModal.jsx';
import { useAdminList } from '../hooks/useAdminList.js';
import { useAdminDetail } from '../hooks/useAdminDetail.js';
import {
  approveWithdrawal,
  getWithdrawalById,
  getWithdrawals,
  rejectWithdrawal,
} from '../services/adminService.js';

const fetchWithdrawals = (params) => getWithdrawals(params);
const fetchWithdrawalDetail = (id) => getWithdrawalById(id);

export function WithdrawalsPage() {
  const confirm = useAdminConfirm();
  const [selectedId, setSelectedId] = useState(null);
  const [txHash, setTxHash] = useState('');
  const list = useAdminList(fetchWithdrawals, { status: 'all' }, { urlKeys: ['status'] });
  const { detail, loading: detailLoading, setDetail } = useAdminDetail(fetchWithdrawalDetail, selectedId);

  const handleApprove = useCallback(async () => {
    if (!detail) return;
    const ok = await runConfirm(confirm, {
      title: 'Approve Withdrawal',
      message: `Approve ${formatUsdt(detail.amount)} withdrawal for ${detail.memberName}?`,
      confirmLabel: 'Approve',
    });
    if (!ok) return;
    const updated = await approveWithdrawal(detail.id, txHash);
    setDetail(updated);
    list.reload();
  }, [confirm, detail, list, setDetail, txHash]);

  const handleReject = useCallback(async () => {
    if (!detail) return;
    const memo = await runConfirm(confirm, {
      title: 'Reject Withdrawal',
      message: 'Provide a memo for the rejection.',
      confirmLabel: 'Reject',
      danger: true,
      showInput: true,
      inputPlaceholder: 'Memo…',
    });
    if (memo == null) return;
    const updated = await rejectWithdrawal(detail.id, memo);
    setDetail(updated);
    list.reload();
  }, [confirm, detail, list, setDetail]);

  return (
    <div className="admin-page">
      <AdminPageHeader title="Withdrawals" description="Review and process member withdrawal requests." />

      <AdminSplitLayout
        left={(
          <AdminPanel>
            <AdminFilterBar
              search={list.search}
              onSearchChange={list.setSearch}
              searchPlaceholder="Search member…"
              filters={[
                {
                  key: 'status',
                  label: 'Status',
                  value: list.filters.status ?? 'all',
                  onChange: (v) => list.setFilter('status', v),
                  options: [
                    { value: 'all', label: 'All' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'approved', label: 'Approved' },
                    { value: 'rejected', label: 'Rejected' },
                  ],
                },
              ]}
            />
            <AdminTableWrap loading={list.loading} error={list.error} hasData={(list.items || []).length > 0}>
              <AdminDataTable
                columns={[
                  { key: 'memberName', label: 'Member' },
                  { key: 'amount', label: 'Amount', render: (r) => formatUsdt(r.amount) },
                  { key: 'toWallet', label: 'To Wallet', render: (r) => r.toWallet || r.wallet || '—' },
                  { key: 'targetMember', label: 'Target Member', render: (r) => r.targetMember || '—' },
                  { key: 'status', label: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
                  { key: 'date', label: 'Date', render: (r) => formatAdminDate(r.date) },
                ]}
                rows={list.items || []}
                selectedId={selectedId}
                onSelectRow={(r) => { setSelectedId(r.id); setTxHash(''); }}
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
        right={(
          <AdminDetailPanel title={detail ? `Withdrawal — ${detail.memberName}` : null}>
            {detailLoading && !detail ? <p className="admin-loading admin-loading--inline">Loading…</p> : null}
            {!detailLoading && detail ? (
              <>
                <AdminDetailSection title="Request">
                  <AdminDetailRow label="ID" value={detail.id} />
                  <AdminDetailRow label="Member" value={detail.memberName} />
                  <AdminDetailRow label="Amount" value={formatUsdt(detail.amount)} />
                  <AdminDetailRow label="To Wallet" value={detail.toWallet || detail.wallet || '—'} />
                  <AdminDetailRow label="Target Member" value={detail.targetMember || '—'} />
                  <AdminDetailRow label="Status" value={<AdminStatusBadge status={detail.status} />} />
                  <AdminDetailRow label="Date" value={formatAdminDate(detail.date)} />
                  {detail.txHash ? <AdminDetailRow label="Tx hash" value={detail.txHash} /> : null}
                  {detail.memo ? <AdminDetailRow label="Memo" value={detail.memo} /> : null}
                </AdminDetailSection>

                {detail.status === 'pending' ? (
                  <>
                    <AdminDetailSection title="Transaction hash">
                      <input
                        className="admin-input"
                        value={txHash}
                        onChange={(e) => setTxHash(e.target.value)}
                        placeholder="0x…"
                      />
                    </AdminDetailSection>
                    <AdminActionStack>
                      <button type="button" className="admin-btn admin-btn--primary" onClick={handleApprove}>
                        Approve
                      </button>
                      <button type="button" className="admin-btn admin-btn--danger" onClick={handleReject}>
                        Reject
                      </button>
                    </AdminActionStack>
                  </>
                ) : null}
              </>
            ) : null}
          </AdminDetailPanel>
        )}
      />
    </div>
  );
}
