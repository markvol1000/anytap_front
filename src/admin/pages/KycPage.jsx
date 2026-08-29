import { useCallback, useEffect, useState } from 'react';
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
import { approveKyc, getKycApplications, getKycById, getKycHistory, rejectKyc } from '../services/adminService.js';

const fetchKyc = (params) => getKycApplications(params);
const fetchKycDetail = (id) => getKycById(id);

export function KycPage() {
  const confirm = useAdminConfirm();
  const [selectedId, setSelectedId] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const list = useAdminList(fetchKyc, { status: 'all' }, { urlKeys: ['status'] });
  const { detail, loading: detailLoading, setDetail } = useAdminDetail(fetchKycDetail, selectedId);

  useEffect(() => {
    const targetUserId = detail?.memberId || detail?.id || selectedId;
    const targetEmail = detail?.memberEmail || detail?.email || '';
    if (!targetUserId && !targetEmail) {
      setHistoryLogs([]);
      return;
    }
    setHistoryLoading(true);
    getKycHistory(targetUserId, targetEmail)
      .then((logs) => setHistoryLogs(logs || []))
      .catch(() => setHistoryLogs([]))
      .finally(() => setHistoryLoading(false));
  }, [detail?.memberId, detail?.id, detail?.memberEmail, detail?.email, selectedId]);

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
                  { key: 'submittedAt', label: 'Submitted', render: (r) => formatAdminDate(r.submittedAt) },
                  { key: 'status', label: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
                  {
                    key: 'rejectReason',
                    label: 'Reason / Result',
                    render: (r) => {
                      if (r.status === 'approved') {
                        return <span style={{ color: '#166534', fontWeight: '600', fontSize: '13px' }}>✓ Approved</span>;
                      }
                      if (r.status === 'rejected') {
                        return <span style={{ color: '#dc2626', fontWeight: '600', fontSize: '13px' }}>{r.rejectReason || 'Rejected'}</span>;
                      }
                      return <span style={{ color: '#d97706', fontSize: '12px' }}>Pending Review</span>;
                    },
                  },
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
                  <AdminDetailRow label="Country" value={detail.country || '—'} />
                  <AdminDetailRow label="Document" value={detail.documentType} />
                  <AdminDetailRow label="Submitted" value={formatAdminDate(detail.submittedAt)} />
                  <AdminDetailRow label="Status" value={<AdminStatusBadge status={detail.status} />} />
                </AdminDetailSection>

                <AdminDetailSection title="Verification Result & Reason">
                  {detail.status === 'approved' && (
                    <div style={{ padding: '14px 16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', fontSize: '13px', lineHeight: '1.5' }}>
                      <strong style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: '#15803d' }}>✓ Verification Approved</strong>
                      <span>User identity verification has been successfully verified and approved.</span>
                    </div>
                  )}
                  {detail.status === 'rejected' && (
                    <div style={{ padding: '14px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '13px', lineHeight: '1.5' }}>
                      <strong style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: '#dc2626' }}>✕ Verification Rejected</strong>
                      <span style={{ fontWeight: '600' }}>{detail.rejectReason || 'Identity verification document was rejected by admin.'}</span>
                    </div>
                  )}
                  {detail.status === 'pending' && (
                    <div style={{ padding: '14px 16px', backgroundColor: '#fefce8', border: '1px solid #fef08a', borderRadius: '8px', color: '#854d0e', fontSize: '13px', lineHeight: '1.5' }}>
                      <strong style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: '#ca8a04' }}>⏳ Pending Review</strong>
                      <span>Verification request is currently pending admin review.</span>
                    </div>
                  )}
                </AdminDetailSection>

                <AdminDetailSection title={`KYC Attempt & Verification History (${historyLogs.length})`}>
                  {historyLoading ? (
                    <p className="admin-loading admin-loading--inline">Loading history logs…</p>
                  ) : historyLogs.length === 0 ? (
                    <div style={{ padding: '12px 14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#64748b', fontSize: '13px' }}>
                      No past KYC attempt logs recorded for this user.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }}>
                      {historyLogs.map((logItem, index) => {
                        const attemptNum = historyLogs.length - index;
                        return (
                          <div
                            key={logItem.id || index}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 10px',
                              borderRadius: '6px',
                              backgroundColor: logItem.status === 'approved' ? '#f0fdf4' : logItem.status === 'rejected' ? '#fef2f2' : '#f8fafc',
                              border: `1px solid ${logItem.status === 'approved' ? '#bbf7d0' : logItem.status === 'rejected' ? '#fecaca' : '#e2e8f0'}`,
                              fontSize: '12px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                            }}>
                            {/* 1. Reverse Counted Number (#5, #4 ... #1) */}
                            <span style={{
                              fontWeight: '800',
                              color: '#475569',
                              backgroundColor: '#e2e8f0',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              flexShrink: 0,
                              minWidth: '28px',
                              textAlign: 'center',
                            }}>
                              #{attemptNum}
                            </span>

                            {/* 2. Date */}
                            <span style={{ color: '#64748b', fontSize: '11px', fontWeight: '600', flexShrink: 0 }}>
                              {formatAdminDate(logItem.at)}
                            </span>

                            {/* 3. Status Badge */}
                            <span style={{
                              fontWeight: '700',
                              fontSize: '11px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              flexShrink: 0,
                              backgroundColor: logItem.status === 'approved' ? '#dcfce7' : logItem.status === 'rejected' ? '#fee2e2' : '#e2e8f0',
                              color: logItem.status === 'approved' ? '#15803d' : logItem.status === 'rejected' ? '#dc2626' : '#475569',
                            }}>
                              {logItem.status === 'approved' ? '✓ APPROVED' : logItem.status === 'rejected' ? '✕ FAILED' : '⏳ PENDING'}
                            </span>

                            {/* 4. Single-line Reason / Error Message */}
                            <span
                              title={logItem.reason}
                              style={{
                                color: '#334155',
                                fontWeight: '500',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flex: 1,
                              }}>
                              {logItem.reason}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
