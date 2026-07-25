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
import { AdminStatusBadge, formatUsdt, shortenAddress } from '../components/AdminStatusBadge.jsx';
import { runConfirm, useAdminConfirm } from '../components/AdminConfirmModal.jsx';
import { useAdminList } from '../hooks/useAdminList.js';
import { useAdminDetail } from '../hooks/useAdminDetail.js';
import { getWalletById, getWallets, lockWallet, unlockWallet } from '../services/adminService.js';

const fetchWallets = (params) => getWallets(params);
const fetchWalletDetail = (id) => getWalletById(id);

export function WalletsPage() {
  const confirm = useAdminConfirm();
  const [selectedId, setSelectedId] = useState(null);
  const list = useAdminList(fetchWallets);
  const { detail, loading: detailLoading, setDetail } = useAdminDetail(fetchWalletDetail, selectedId);

  const toggleLock = useCallback(async (lock) => {
    if (!detail) return;
    const label = lock ? 'Wallet Lock' : 'Wallet Unlock';
    const ok = await runConfirm(confirm, {
      title: label,
      message: `${lock ? 'Lock' : 'Unlock'} wallet for ${detail.memberName}?`,
      confirmLabel: lock ? 'Lock' : 'Unlock',
      danger: lock,
    });
    if (!ok) return;
    const updated = lock ? await lockWallet(detail.id) : await unlockWallet(detail.id);
    setDetail(updated);
    list.reload();
  }, [confirm, detail, list, setDetail]);

  return (
    <div className="admin-page">
      <AdminPageHeader title="Wallets" description="Monitor balances, deposits, and top-ups." />

      <AdminSplitLayout
        left={(
          <AdminPanel>
            <AdminFilterBar
              search={list.search}
              onSearchChange={list.setSearch}
              searchPlaceholder="Search address or member…"
              filters={[
                {
                  key: 'status',
                  label: 'Status',
                  value: list.filters.status ?? 'all',
                  onChange: (v) => list.setFilter('status', v),
                  options: [
                    { value: 'all', label: 'All' },
                    { value: 'active', label: 'Active' },
                    { value: 'locked', label: 'Locked' },
                  ],
                },
              ]}
            />
            <AdminTableWrap loading={list.loading} error={list.error} hasData={list.items.length > 0}>
              <AdminDataTable
                columns={[
                  { key: 'memberName', label: 'Member' },
                  { key: 'address', label: 'Address', render: (r) => shortenAddress(r.address, 8, 6) },
                  { key: 'balance', label: 'Balance', render: (r) => formatUsdt(r.balance) },
                  { key: 'status', label: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
                  { key: 'created', label: 'Created' },
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
          <AdminDetailPanel title={detail ? `Wallet — ${detail.memberName}` : null}>
            {detailLoading && !detail ? <p className="admin-loading admin-loading--inline">Loading…</p> : null}
            {!detailLoading && detail ? (
              <>
                <AdminDetailSection title="Wallet detail">
                  <AdminDetailRow label="Wallet ID" value={detail.id} />
                  <AdminDetailRow label="Address" value={detail.address} />
                  <AdminDetailRow label="Network" value={detail.network} />
                  <AdminDetailRow label="Balance" value={formatUsdt(detail.balance)} />
                  <AdminDetailRow label="Status" value={<AdminStatusBadge status={detail.status} />} />
                </AdminDetailSection>

                <AdminDetailSection title="Recent deposits">
                  <AdminMiniTable
                    columns={[
                      { key: 'kind', label: 'Type' },
                      { key: 'amount', label: 'Amount', render: (r) => formatUsdt(r.amount) },
                    ]}
                    rows={detail.recentDeposits ?? []}
                  />
                </AdminDetailSection>

                <AdminDetailSection title="Recent top-ups">
                  <AdminMiniTable
                    columns={[
                      { key: 'kind', label: 'Type' },
                      { key: 'amount', label: 'Amount', render: (r) => formatUsdt(r.amount) },
                    ]}
                    rows={detail.recentTopUps ?? []}
                  />
                </AdminDetailSection>

                <AdminActionStack>
                  {detail.status === 'locked' ? (
                    <button type="button" className="admin-btn admin-btn--primary" onClick={() => toggleLock(false)}>
                      Unlock wallet
                    </button>
                  ) : (
                    <button type="button" className="admin-btn admin-btn--danger" onClick={() => toggleLock(true)}>
                      Lock wallet
                    </button>
                  )}
                </AdminActionStack>
              </>
            ) : null}
          </AdminDetailPanel>
        )}
      />
    </div>
  );
}
