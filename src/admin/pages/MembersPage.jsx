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
  activateMember,
  deleteMember,
  getMemberById,
  getMembers,
  saveMemberMemo,
  suspendMember,
  retryCregisWallet,
} from '../services/adminService.js';

const fetchMembers = (params) => getMembers(params);
const fetchMemberDetail = (id) => getMemberById(id);

export function MembersPage() {
  const confirm = useAdminConfirm();
  const [selectedId, setSelectedId] = useState(null);
  const [memoDraft, setMemoDraft] = useState('');
  const list = useAdminList(fetchMembers);
  const { detail, loading: detailLoading, setDetail } = useAdminDetail(fetchMemberDetail, selectedId);

  const selectRow = (row) => {
    setSelectedId(row.id);
    setMemoDraft(row.memo ?? '');
  };

  const handleAction = useCallback(async (action) => {
    if (!detail) return;
    try {
      if (action === 'suspend') {
        const ok = await runConfirm(confirm, {
          title: 'Suspend member',
          message: `Suspend ${detail.name}? They will lose access to the portal.`,
          confirmLabel: 'Suspend',
          danger: true,
        });
        if (!ok) return;
        const updated = await suspendMember(detail.id);
        setDetail(updated);
        list.reload();
      } else if (action === 'activate') {
        const updated = await activateMember(detail.id);
        setDetail(updated);
        list.reload();
      } else if (action === 'delete') {
        const ok = await runConfirm(confirm, {
          title: 'Delete member',
          message: `Permanently delete ${detail.name}? This cannot be undone.`,
          confirmLabel: 'Delete',
          danger: true,
        });
        if (!ok) return;
        await deleteMember(detail.id);
        setSelectedId(null);
        list.reload();
      } else if (action === 'saveMemo') {
        await saveMemberMemo(detail.id, memoDraft);
        setDetail({ ...detail, memo: memoDraft });
      } else if (action === 'retryWallet') {
        const ok = await runConfirm(confirm, {
          title: 'Retry Cregis Wallet Allocation',
          message: `Attempt to generate Cregis USDT wallet address for ${detail.name} again?`,
          confirmLabel: 'Retry',
        });
        if (!ok) return;
        const updated = await retryCregisWallet(detail.id);
        setDetail(updated);
        list.reload();
      }
    } catch (err) {
      window.alert(err.message);
    }
  }, [confirm, detail, list, memoDraft, setDetail]);

  return (
    <div className="admin-page">
      <AdminPageHeader title="Members" description="Search, review, and manage member accounts." />

      <AdminSplitLayout
        left={(
          <AdminPanel>
            <AdminFilterBar
              search={list.search}
              onSearchChange={list.setSearch}
              searchPlaceholder="Search name, email, ID…"
              filters={[
                {
                  key: 'accountStatus',
                  label: 'Status',
                  value: list.filters.accountStatus ?? 'all',
                  onChange: (v) => list.setFilter('accountStatus', v),
                  options: [
                    { value: 'all', label: 'All statuses' },
                    { value: 'active', label: 'Active' },
                    { value: 'suspended', label: 'Suspended' },
                  ],
                },
              ]}
            />
            <AdminTableWrap loading={list.loading} error={list.error} hasData={(list.items || []).length > 0}>
              <AdminDataTable
                columns={[
                  { key: 'id', label: 'Member ID' },
                  { key: 'name', label: 'Name' },
                  { key: 'email', label: 'Email' },
                  { key: 'country', label: 'Country' },
                  { key: 'joinDate', label: 'Join Date', render: (r) => formatAdminDate(r.joinDate) },
                  { key: 'kycStatus', label: 'KYC', render: (r) => <AdminStatusBadge status={r.kycStatus} /> },
                  { key: 'cardStatus', label: 'Card', render: (r) => (
                    <AdminStatusBadge
                      status={r.cardStatus}
                      label={r.cardStatus + (r.cardLast4 ? ` (${r.cardLast4})` : '')}
                    />
                  ) },
                  { key: 'walletBalance', label: 'Wallet', render: (r) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: '#26a17b',
                        color: '#fff',
                        fontSize: '9px',
                        fontWeight: 'bold',
                        lineHeight: 1
                      }}>₮</span>
                      <span>{formatUsdt(r.walletBalance)}</span>
                    </div>
                  ) },
                  { key: 'referralStatus', label: 'Referral', render: (r) => <AdminStatusBadge status={r.referralStatus} /> },
                  { key: 'accountStatus', label: 'Account', render: (r) => <AdminStatusBadge status={r.accountStatus} /> },
                ]}
                rows={list.items || []}
                selectedId={selectedId}
                onSelectRow={selectRow}
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
          <AdminDetailPanel title={detail ? detail.name : null}>
            {detailLoading && !detail ? <p className="admin-loading admin-loading--inline">Loading…</p> : null}
            {!detailLoading && detail ? (
              <>
                <AdminDetailSection title="Member info">
                  <AdminDetailRow label="Member ID" value={detail.id} />
                  <AdminDetailRow label="Email" value={detail.email} />
                  <AdminDetailRow label="Phone" value={detail.phone} />
                  <AdminDetailRow label="Country" value={detail.country} />
                  <AdminDetailRow label="Join date" value={formatAdminDate(detail.joinDate)} />
                  <AdminDetailRow label="KYC" value={<AdminStatusBadge status={detail.kycStatus} />} />
                  <AdminDetailRow label="Card" value={(
                    <AdminStatusBadge
                      status={detail.cardStatus}
                      label={detail.cardStatus + (detail.cardLast4 ? ` (${detail.cardLast4})` : '')}
                    />
                  )} />
                  <AdminDetailRow label="Wallet" value={(
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: '#26a17b',
                        color: '#fff',
                        fontSize: '9px',
                        fontWeight: 'bold',
                        lineHeight: 1
                      }}>₮</span>
                      <span>{formatUsdt(detail.walletBalance)}</span>
                    </div>
                  )} />
                  <AdminDetailRow label="Account" value={<AdminStatusBadge status={detail.accountStatus} />} />
                </AdminDetailSection>

                <AdminDetailSection title="Cregis Connection Info">
                  <AdminDetailRow label="USDT Deposit Address" value={detail.cregisWalletAddress ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '12px' }}>
                      {detail.cregisWalletAddress}
                    </div>
                  ) : 'Not allocated'} />
                </AdminDetailSection>

                <AdminDetailSection title="Wasabi Connection Info">
                  <AdminDetailRow label="Holder ID" value={detail.wasabiHolderId || '—'} />
                  {detail.wasabiCardId ? (
                    <>
                      <AdminDetailRow label="Card ID" value={detail.wasabiCardId} />
                      <AdminDetailRow label="Card Type" value={detail.cardType || '—'} />
                      <AdminDetailRow label="Card Last 4" value={detail.cardLast4 || '—'} />
                      <AdminDetailRow label="Card Status" value={<AdminStatusBadge status={detail.cardStatus} />} />
                    </>
                  ) : (
                    <p className="admin-muted" style={{ paddingLeft: '8px', fontSize: '13px' }}>No card issued yet.</p>
                  )}
                </AdminDetailSection>

                <AdminDetailSection title="Admin memo">
                  <textarea
                    className="admin-textarea"
                    rows={4}
                    value={memoDraft}
                    onChange={(e) => setMemoDraft(e.target.value)}
                    placeholder="Internal notes…"
                  />
                  <button type="button" className="admin-btn admin-btn--ghost admin-btn--sm" onClick={() => handleAction('saveMemo')}>
                    Save memo
                  </button>
                </AdminDetailSection>

                <AdminActionStack>
                  {detail.accountStatus === 'pending_wallet' ? (
                    <button type="button" className="admin-btn admin-btn--primary" style={{ backgroundColor: '#3b82f6', color: '#fff', fontWeight: 'bold' }} onClick={() => handleAction('retryWallet')}>
                      ⚡ Retry Wallet Allocation
                    </button>
                  ) : null}
                  {detail.accountStatus === 'suspended' ? (
                    <button type="button" className="admin-btn admin-btn--primary" onClick={() => handleAction('activate')}>
                      Reactivate member
                    </button>
                  ) : (
                    detail.accountStatus !== 'pending_wallet' && (
                      <button type="button" className="admin-btn admin-btn--warning" onClick={() => handleAction('suspend')}>
                        Suspend member
                      </button>
                    )
                  )}
                  <button type="button" className="admin-btn admin-btn--danger" onClick={() => handleAction('delete')}>
                    Delete member
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
