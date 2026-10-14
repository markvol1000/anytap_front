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
      <AdminPageHeader
        title="Withdrawals"
        description="Review and process member withdrawal requests."
        onRefresh={list.reload}
        refreshing={list.loading}
      />

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
                  {
                    key: 'memberName',
                    label: 'Member',
                    render: (r) => (
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>
                        {r.memberName || '—'}
                      </span>
                    ),
                  },
                  {
                    key: 'amount',
                    label: 'Amount',
                    render: (r) => (
                      <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#059669' }}>
                        {formatUsdt(r.amount)}
                      </span>
                    ),
                  },
                  {
                    key: 'toWallet',
                    label: 'To Wallet',
                    render: (r) => {
                      const w = r.toWallet || r.wallet || '—';
                      return (
                        <span
                          title={w}
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            color: '#0284c7',
                            maxWidth: '160px',
                            display: 'inline-block',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            verticalAlign: 'middle',
                          }}
                        >
                          {w}
                        </span>
                      );
                    },
                  },
                  {
                    key: 'targetMember',
                    label: 'Target Member',
                    render: (r) => (
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        {r.targetMember || '—'}
                      </span>
                    ),
                  },
                  { key: 'status', label: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
                  {
                    key: 'date',
                    label: 'Date',
                    render: (r) => (
                      <span style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {formatAdminDate(r.date)}
                      </span>
                    ),
                  },
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
                renderMobileCard={(r) => (
                  <>
                    <div className="admin-mobile-card__row1">
                      <div className="admin-mobile-card__left">
                        <span className="admin-mobile-card__title">
                          {r.memberName || 'Member'}
                        </span>
                        <AdminStatusBadge status={r.status} />
                      </div>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '12px', color: '#059669', flexShrink: 0 }}>
                        {formatUsdt(r.amount)}
                      </span>
                    </div>
                    <div className="admin-mobile-card__row2">
                      <span className="admin-mobile-card__detail" style={{ fontFamily: 'monospace' }} title={r.toWallet || r.wallet || ''}>
                        {r.toWallet || r.wallet || '—'}
                      </span>
                      {r.targetMember && r.targetMember !== '—' && (
                        <>
                          <span style={{ color: '#cbd5e1' }}>•</span>
                          <span className="admin-mobile-card__meta">
                            {r.targetMember}
                          </span>
                        </>
                      )}
                      <span style={{ color: '#cbd5e1' }}>•</span>
                      <span className="admin-mobile-card__date">
                        {formatAdminDate(r.date)}
                      </span>
                    </div>
                  </>
                )}
              />
            </AdminTableWrap>
          </AdminPanel>
        )}
        right={selectedId && detail ? (
          <AdminDetailPanel
            title={`Withdrawal — ${detail.memberName || detail.id}`}
            hasData={Boolean(detail)}
            onClose={() => {
              setSelectedId(null);
              setDetail(null);
            }}
          >
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
        ) : null}
      />
    </div>
  );
}
