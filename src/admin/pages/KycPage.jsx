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
import { AdminStatusBadge, formatAdminDate } from '../components/AdminStatusBadge.jsx';
import { runConfirm, useAdminConfirm } from '../components/AdminConfirmModal.jsx';
import { useAdminList } from '../hooks/useAdminList.js';
import { useAdminDetail } from '../hooks/useAdminDetail.js';
import { approveKyc, getKycApplications, getKycById, rejectKyc } from '../services/adminService.js';

const fetchKyc = (params) => getKycApplications(params);
const fetchKycDetail = (id) => getKycById(id);

export function KycPage() {
  const confirm = useAdminConfirm();
  const [selectedId, setSelectedId] = useState(null);
  const list = useAdminList(fetchKyc, { status: 'all' }, { urlKeys: ['status'] });
  const { detail, loading: detailLoading, setDetail } = useAdminDetail(fetchKycDetail, selectedId);

  const handleApprove = useCallback(async () => {
    if (!detail) return;
    const ok = await runConfirm(confirm, {
      title: 'Approve KYC',
      message: `Approve identity verification for ${detail.memberName}?`,
      confirmLabel: 'Approve',
    });
    if (!ok) return;
    const updated = await approveKyc(detail.id);
    setDetail(updated);
    list.reload();
  }, [confirm, detail, list, setDetail]);

  const handleReject = useCallback(async () => {
    if (!detail) return;
    const reason = await runConfirm(confirm, {
      title: 'Reject KYC',
      message: `Reject verification for ${detail.memberName}. Provide a reason.`,
      confirmLabel: 'Reject',
      danger: true,
      showInput: true,
      inputPlaceholder: 'Reject reason…',
    });
    if (reason == null) return;
    const updated = await rejectKyc(detail.id, reason);
    setDetail(updated);
    list.reload();
  }, [confirm, detail, list, setDetail]);

  return (
    <div className="admin-page">
      <AdminPageHeader title="KYC" description="Review identity submissions and approve or reject." />

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
                  { key: 'id', label: 'Application' },
                  { key: 'memberName', label: 'Member' },
                  { key: 'memberEmail', label: 'Email' },
                  { key: 'country', label: 'Country' },
                  { key: 'documentType', label: 'Document' },
                  { key: 'submittedAt', label: 'Submitted' },
                  { key: 'status', label: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
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
        right={(
          <AdminDetailPanel title={detail ? `KYC — ${detail.memberName}` : null}>
            {detailLoading && !detail ? <p className="admin-loading admin-loading--inline">Loading…</p> : null}
            {!detailLoading && detail ? (
              <>
                <AdminDetailSection title="Member">
                  <AdminDetailRow label="Member ID" value={detail.memberId} />
                  <AdminDetailRow label="Email" value={detail.memberEmail} />
                  <AdminDetailRow label="Document" value={detail.documentType} />
                  <AdminDetailRow label="Submitted" value={formatAdminDate(detail.submittedAt)} />
                  <AdminDetailRow label="Status" value={<AdminStatusBadge status={detail.status} />} />
                  {detail.rejectReason ? (
                    <AdminDetailRow label="Reject reason" value={detail.rejectReason} />
                  ) : null}
                </AdminDetailSection>

                <AdminDetailSection title="ID document">
                  <div className="admin-doc-preview admin-doc-preview--id">ID Document Preview</div>
                </AdminDetailSection>

                <AdminDetailSection title="Selfie">
                  <div className="admin-doc-preview admin-doc-preview--selfie">Selfie Preview</div>
                </AdminDetailSection>

                {detail.status === 'pending' ? (
                  <AdminActionStack>
                    <button type="button" className="admin-btn admin-btn--primary" onClick={handleApprove}>
                      Approve
                    </button>
                    <button type="button" className="admin-btn admin-btn--danger" onClick={handleReject}>
                      Reject
                    </button>
                  </AdminActionStack>
                ) : null}
              </>
            ) : null}
          </AdminDetailPanel>
        )}
      />
    </div>
  );
}
