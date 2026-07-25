import { useCallback, useState } from 'react';
import { AdminDataTable, AdminMiniTable } from '../components/AdminDataTable.jsx';
import { AdminFilterBar, AdminPageHeader, AdminPanel, AdminTableWrap } from '../components/AdminFilterBar.jsx';
import {
  AdminActionStack,
  AdminDetailPanel,
  AdminDetailRow,
  AdminDetailSection,
  AdminSplitLayout,
} from '../components/AdminSplitLayout.jsx';
import { AdminStatusBadge, formatUsdt } from '../components/AdminStatusBadge.jsx';
import { runConfirm, useAdminConfirm } from '../components/AdminConfirmModal.jsx';
import { useAdminList } from '../hooks/useAdminList.js';
import { useAdminDetail } from '../hooks/useAdminDetail.js';
import { adjustReferralReward, getReferralById, getReferrals } from '../services/adminService.js';

const fetchReferrals = (params) => getReferrals(params);
const fetchReferralDetail = (id) => getReferralById(id);

export function ReferralPage() {
  const confirm = useAdminConfirm();
  const [selectedId, setSelectedId] = useState(null);
  const list = useAdminList(fetchReferrals);
  const { detail, loading: detailLoading, setDetail } = useAdminDetail(fetchReferralDetail, selectedId);

  const handleAdjust = useCallback(async () => {
    if (!detail) return;
    const input = await runConfirm(confirm, {
      title: 'Reward adjustment',
      message: 'Enter adjustment amount (USDT). Use negative values to deduct.',
      confirmLabel: 'Apply',
      showInput: true,
      inputPlaceholder: 'e.g. 10 or -5',
    });
    if (input == null || input === '') return;
    const amount = parseFloat(input);
    if (Number.isNaN(amount)) {
      window.alert('Invalid amount');
      return;
    }
    const updated = await adjustReferralReward(detail.id, amount);
    setDetail(updated);
    list.reload();
  }, [confirm, detail, list, setDetail]);

  return (
    <div className="admin-page">
      <AdminPageHeader title="Referral" description="Partner programs, reward balances, and adjustments." />

      <AdminSplitLayout
        left={(
          <AdminPanel>
            <AdminFilterBar
              search={list.search}
              onSearchChange={list.setSearch}
              searchPlaceholder="Search code or member…"
            />
            <AdminTableWrap loading={list.loading} error={list.error} hasData={list.items.length > 0}>
              <AdminDataTable
                columns={[
                  { key: 'memberName', label: 'Member' },
                  { key: 'referralCode', label: 'Referral Code' },
                  { key: 'rewardBalance', label: 'Reward Balance', render: (r) => formatUsdt(r.rewardBalance) },
                  { key: 'available', label: 'Available', render: (r) => formatUsdt(r.available) },
                  { key: 'pending', label: 'Pending', render: (r) => formatUsdt(r.pending) },
                  { key: 'members', label: 'Members' },
                  { key: 'status', label: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
                ]}
                rows={list.items}
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
        right={(
          <AdminDetailPanel title={detail ? detail.memberName : null}>
            {detailLoading && !detail ? <p className="admin-loading admin-loading--inline">Loading…</p> : null}
            {!detailLoading && detail ? (
              <>
                <AdminDetailSection title="Reward detail">
                  <AdminDetailRow label="Code" value={detail.referralCode} />
                  <AdminDetailRow label="Balance" value={formatUsdt(detail.rewardBalance)} />
                  <AdminDetailRow label="Available" value={formatUsdt(detail.available)} />
                  <AdminDetailRow label="Pending" value={formatUsdt(detail.pending)} />
                  <AdminDetailRow label="Network size" value={detail.members} />
                  <AdminDetailRow label="Status" value={<AdminStatusBadge status={detail.status} />} />
                </AdminDetailSection>

                <AdminDetailSection title="Reward history">
                  <AdminMiniTable
                    columns={[
                      { key: 'kind', label: 'Type' },
                      { key: 'amount', label: 'Amount', render: (r) => formatUsdt(r.amount) },
                    ]}
                    rows={detail.history ?? []}
                  />
                  {!detail.history?.length ? <p className="admin-muted">No reward transactions yet.</p> : null}
                </AdminDetailSection>

                <AdminActionStack>
                  <button type="button" className="admin-btn admin-btn--primary" onClick={handleAdjust}>
                    Reward adjustment
                  </button>
                </AdminActionStack>
              </>
            ) : null}
          </AdminDetailPanel>
        )}
      />
    </div>
  );
}
