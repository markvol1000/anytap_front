import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminDataTable } from '../components/AdminDataTable.jsx';
import { AdminFilterBar, AdminPageHeader, AdminPanel, AdminTableWrap } from '../components/AdminFilterBar.jsx';
import {
  AdminActionStack,
  AdminDetailPanel,
  AdminDetailRow,
  AdminDetailSection,
  AdminSplitLayout,
} from '../components/AdminSplitLayout.jsx';
import { AdminStatusBadge, formatAdminDate, shortenAddress } from '../components/AdminStatusBadge.jsx';
import { runConfirm, useAdminConfirm } from '../components/AdminConfirmModal.jsx';
import { useAdminList } from '../hooks/useAdminList.js';
import { useAdminDetail } from '../hooks/useAdminDetail.js';
import { approveKyc, getKycApplications, getKycById, getKycHistory, rejectKyc } from '../services/adminService.js';

const fetchKyc = (params) => getKycApplications(params);
const fetchKycDetail = (id) => getKycById(id);

function CopyableId({ text, color = '#0284c7' }) {
  const [copied, setCopied] = useState(false);

  if (!text || text === '—' || text === '-') return <span>—</span>;

  const handleCopy = (e) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy ID:', err);
    }
  };

  const displayText = text.length > 16 ? shortenAddress(text, 8, 6) : text;

  return (
    <span
      onClick={handleCopy}
      title={`Click to copy: ${text}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        cursor: 'pointer',
        padding: '2px 6px',
        borderRadius: '4px',
        backgroundColor: copied ? '#dcfce7' : '#f0f9ff',
        border: `1px solid ${copied ? '#86efac' : '#bae6fd'}`,
        transition: 'all 0.15s ease',
        userSelect: 'none',
      }}
    >
      <span style={{ fontFamily: 'monospace', fontSize: '12px', color: copied ? '#15803d' : color, fontWeight: '700' }}>
        {displayText}
      </span>
      <span style={{ fontSize: '10px', color: copied ? '#15803d' : '#0284c7' }}>
        {copied ? '✓' : '📋'}
      </span>
    </span>
  );
}

export function KycPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlId = searchParams.get('id') || searchParams.get('userId');

  const confirm = useAdminConfirm();
  const [selectedId, setSelectedId] = useState(() => urlId || null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null); // Selected log for full-detail popup

  const list = useAdminList(fetchKyc, { status: 'all' }, { urlKeys: ['status'] });
  const { detail, loading: detailLoading, setDetail } = useAdminDetail(fetchKycDetail, selectedId);

  // Sync URL search param with selectedId
  useEffect(() => {
    if (urlId && urlId !== selectedId) {
      setSelectedId(urlId);
    }
  }, [urlId]);

  const handleSelectRow = (row) => {
    if (selectedId === row.id) {
      // Toggle off if clicking the already selected row
      setSelectedId(null);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('id');
        next.delete('userId');
        return next;
      });
    } else {
      setSelectedId(row.id);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('id', row.id);
        return next;
      });
    }
  };

  const handleCloseDetail = () => {
    setSelectedId(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('id');
      next.delete('userId');
      return next;
    });
  };

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
      message: `Approve identity verification for ${detail.memberName || detail.memberEmail || detail.id}?`,
      confirmLabel: 'Approve',
    });
    if (!ok) return;
    try {
      const updated = await approveKyc(detail.id);
      setDetail(updated);
      list.reload();
    } catch (err) {
      window.alert(`Approval failed: ${err?.message || 'Error occurred.'}`);
    }
  }, [confirm, detail, list, setDetail]);

  const handleReject = useCallback(async () => {
    if (!detail) return;
    const reason = await runConfirm(confirm, {
      title: 'Reject KYC',
      message: `Reject verification for ${detail.memberName || detail.memberEmail || detail.id}. Provide a reason.`,
      confirmLabel: 'Reject',
      danger: true,
      showInput: true,
      inputPlaceholder: 'Reject reason (e.g. Blurry photo, expired passport)…',
    });
    if (reason == null) return;
    try {
      const updated = await rejectKyc(detail.id, reason);
      setDetail(updated);
      list.reload();
    } catch (err) {
      window.alert(`Rejection failed: ${err?.message || 'Error occurred.'}`);
    }
  }, [confirm, detail, list, setDetail]);

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="KYC"
        description="Review identity submissions and approve or reject."
        onRefresh={() => {
          list.reload();
          if (selectedId) {
            fetchKycDetail(selectedId).then(setDetail).catch(() => {});
          }
        }}
        refreshing={list.loading}
      />

      <AdminSplitLayout
        left={(
          <AdminPanel>
            <AdminFilterBar
              search={list.search}
              onSearchChange={list.setSearch}
              searchPlaceholder="Search by member name, email, or ID…"
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
                    key: 'id',
                    label: 'Application / User ID',
                    render: (r) => <CopyableId text={r.id || r.memberId} />,
                  },
                  {
                    key: 'memberName',
                    label: 'Member',
                    render: (r) => {
                      const hasDistinctName = r.memberName && r.memberName !== r.memberEmail && r.memberName !== r.id && r.memberName !== '—';
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '130px' }}>
                          <span style={{ fontWeight: '700', color: 'var(--ink, #0f172a)' }}>
                            {hasDistinctName ? r.memberName : (r.memberEmail || r.id)}
                          </span>
                          {hasDistinctName && r.memberEmail ? (
                            <span style={{ fontSize: '11px', color: 'var(--fg-muted, #64748b)' }}>{r.memberEmail}</span>
                          ) : null}
                        </div>
                      );
                    },
                  },
                  {
                    key: 'country',
                    label: 'Country',
                    render: (r) => (
                      <span style={{ fontSize: '12px', fontWeight: '500' }}>
                        {r.country && r.country !== '-' ? r.country : '—'}
                      </span>
                    ),
                  },
                  {
                    key: 'documentType',
                    label: 'Document',
                    render: (r) => (
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: '#f1f5f9',
                        color: '#334155',
                        fontSize: '11px',
                        fontWeight: '600',
                        border: '1px solid #e2e8f0',
                      }}>
                        {r.documentType || 'Passport'}
                      </span>
                    ),
                  },
                  {
                    key: 'submittedAt',
                    label: 'Submitted',
                    render: (r) => (
                      <span style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {formatAdminDate(r.submittedAt)}
                      </span>
                    ),
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    render: (r) => <AdminStatusBadge status={r.status} />,
                  },
                  {
                    key: 'rejectReason',
                    label: 'Reason / Result',
                    render: (r) => {
                      if (r.status === 'approved') {
                        return <span style={{ color: '#166534', fontWeight: '600', fontSize: '12px' }}>✓ Approved</span>;
                      }
                      if (r.status === 'rejected') {
                        return (
                          <span
                            title={r.rejectReason}
                            style={{
                              color: '#dc2626',
                              fontWeight: '600',
                              fontSize: '12px',
                              display: 'inline-block',
                              maxWidth: '180px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {r.rejectReason || 'Rejected'}
                          </span>
                        );
                      }
                      return <span style={{ color: '#d97706', fontSize: '12px', fontWeight: '500' }}>⏳ Pending Review</span>;
                    },
                  },
                ]}
                rows={list.items || []}
                selectedId={selectedId}
                onSelectRow={handleSelectRow}
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
        right={(selectedId && (detail || detailLoading)) ? (
          <AdminDetailPanel
            title={detail ? `KYC Detail — ${detail.memberName || detail.memberEmail || detail.id}` : 'KYC Detail'}
            onClose={handleCloseDetail}
          >
            {detailLoading && !detail ? <p className="admin-loading admin-loading--inline">Loading…</p> : null}
            {!detailLoading && detail ? (
              <>
                <AdminDetailSection title="Applicant Information">
                  <AdminDetailRow
                    label="Member ID"
                    value={<CopyableId text={detail.memberId || detail.id} />}
                  />
                  <AdminDetailRow label="Name" value={detail.memberName || '—'} />
                  <AdminDetailRow label="Email" value={detail.memberEmail || '—'} />
                  <AdminDetailRow label="Country" value={detail.country || '—'} />
                  <AdminDetailRow label="Document Type" value={detail.documentType || 'Passport'} />
                  <AdminDetailRow label="Submitted At" value={formatAdminDate(detail.submittedAt)} />
                  <AdminDetailRow label="Current Status" value={<AdminStatusBadge status={detail.status} />} />
                </AdminDetailSection>

                {/* ── Verification Result & Status Reason ── */}
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
                      <span>Verification request is currently pending admin review. Review submitted details and take action below.</span>
                    </div>
                  )}
                </AdminDetailSection>

                {/* ── KYC Attempt & Verification History ── */}
                <AdminDetailSection title={`KYC Attempt & Verification History (${historyLogs.length})`}>
                  {historyLoading ? (
                    <p className="admin-loading admin-loading--inline">Loading history logs…</p>
                  ) : historyLogs.length === 0 ? (
                    <div style={{ padding: '12px 14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#64748b', fontSize: '13px' }}>
                      No past KYC attempt logs recorded for this user.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                      {historyLogs.map((logItem, index) => {
                        const attemptNum = historyLogs.length - index;
                        const reasonText = logItem.reason || logItem.description || logItem.message || 'No detail reason provided';
                        const isApproved = logItem.status === 'approved';
                        const isRejected = logItem.status === 'rejected';

                        return (
                          <div
                            key={logItem.id || index}
                            onClick={() => setSelectedLog({
                              attemptNum,
                              at: logItem.at,
                              status: logItem.status,
                              eventType: logItem.eventType,
                              reason: reasonText,
                              memberName: detail?.memberName || detail?.memberEmail || 'Member',
                              memberId: detail?.memberId || detail?.id || '',
                            })}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '5px',
                              padding: '9px 12px',
                              borderRadius: '8px',
                              backgroundColor: isApproved ? '#f0fdf4' : isRejected ? '#fef2f2' : '#f8fafc',
                              border: `1px solid ${isApproved ? '#bbf7d0' : isRejected ? '#fecaca' : '#e2e8f0'}`,
                              fontSize: '12px',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-1px)';
                              e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.06)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'none';
                              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
                            }}
                            title="Click to view full detail log"
                          >
                            {/* Line 1: Attempt #, Date, Status Badge, Event Type */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                                <span style={{ color: '#64748b', fontSize: '11px', fontWeight: '600' }}>
                                  {formatAdminDate(logItem.at)}
                                </span>
                                <span style={{
                                  fontWeight: '700',
                                  fontSize: '11px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: isApproved ? '#dcfce7' : isRejected ? '#fee2e2' : '#e2e8f0',
                                  color: isApproved ? '#15803d' : isRejected ? '#dc2626' : '#475569',
                                }}>
                                  {isApproved ? '✓ APPROVED' : isRejected ? '✕ FAILED' : '⏳ PENDING'}
                                </span>
                              </div>

                              <span style={{ fontSize: '10px', color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                🔍 Click to view
                              </span>
                            </div>

                            {/* Line 2: Detailed Reason / Error message (Up to 2 lines, clamped with ellipsis) */}
                            <div
                              style={{
                                color: isRejected ? '#991b1b' : isApproved ? '#166534' : '#334155',
                                fontWeight: '500',
                                fontSize: '12px',
                                lineHeight: '1.45',
                                display: '-webkit-box',
                                WebKitLineClamp: 2,
                                WebKitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                wordBreak: 'break-word',
                              }}
                            >
                              {reasonText}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </AdminDetailSection>

                {/* ── Admin Action Buttons (Approve / Reject) ── */}
                {detail.status === 'pending' ? (
                  <AdminActionStack>
                    <button type="button" className="admin-btn admin-btn--primary" onClick={handleApprove}>
                      ✓ Approve KYC
                    </button>
                    <button type="button" className="admin-btn admin-btn--danger" onClick={handleReject}>
                      ✕ Reject KYC
                    </button>
                  </AdminActionStack>
                ) : (
                  <AdminActionStack>
                    {detail.status === 'rejected' && (
                      <button type="button" className="admin-btn admin-btn--secondary" onClick={handleApprove}>
                        Re-Approve Verification
                      </button>
                    )}
                    {detail.status === 'approved' && (
                      <button type="button" className="admin-btn admin-btn--danger" onClick={handleReject}>
                        Revoke / Reject Verification
                      </button>
                    )}
                  </AdminActionStack>
                )}
              </>
            ) : null}
          </AdminDetailPanel>
        ) : null}
      />

      {/* Detail Popup Modal for Long KYC History / Log Reason */}
      {selectedLog && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backdropFilter: 'blur(3px)',
          }}
          onClick={() => setSelectedLog(null)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '560px',
              width: '100%',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              overflow: 'hidden',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontWeight: '800',
                  color: '#475569',
                  backgroundColor: '#e2e8f0',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}>
                  #{selectedLog.attemptNum}
                </span>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
                  KYC Verification Log Detail
                </h3>
              </div>
              <button
                type="button"
                className="admin-btn admin-btn--ghost admin-btn--sm"
                onClick={() => setSelectedLog(null)}
                style={{ padding: '4px 8px', fontSize: '13px' }}
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              {/* Meta information row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '10px',
                backgroundColor: '#f8fafc',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Member</span>
                  <strong style={{ color: '#0f172a', fontSize: '12px' }}>{selectedLog.memberName}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Date & Time</span>
                  <span style={{ color: '#0f172a', fontSize: '12px', fontWeight: '600' }}>{formatAdminDate(selectedLog.at)}</span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Status</span>
                  <span style={{
                    display: 'inline-block',
                    marginTop: '2px',
                    fontWeight: '700',
                    fontSize: '11px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: selectedLog.status === 'approved' ? '#dcfce7' : selectedLog.status === 'rejected' ? '#fee2e2' : '#e2e8f0',
                    color: selectedLog.status === 'approved' ? '#15803d' : selectedLog.status === 'rejected' ? '#dc2626' : '#475569',
                  }}>
                    {selectedLog.status === 'approved' ? '✓ APPROVED' : selectedLog.status === 'rejected' ? '✕ FAILED / REJECTED' : '⏳ PENDING'}
                  </span>
                </div>
                {selectedLog.eventType && (
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Event Code</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#0284c7', fontWeight: '700' }}>
                      {selectedLog.eventType}
                    </span>
                  </div>
                )}
              </div>

              {/* Full Reason / Error Message text box */}
              <div>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                  📝 Full Reason / Error Log Content
                </span>
                <div style={{
                  padding: '12px 14px',
                  backgroundColor: selectedLog.status === 'rejected' ? '#fef2f2' : '#f8fafc',
                  border: `1px solid ${selectedLog.status === 'rejected' ? '#fecaca' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  color: selectedLog.status === 'rejected' ? '#991b1b' : '#1e293b',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'inherit',
                }}>
                  {selectedLog.reason}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
              backgroundColor: '#f8fafc',
            }}>
              <button
                type="button"
                className="admin-btn admin-btn--ghost admin-btn--sm"
                onClick={() => {
                  try {
                    navigator.clipboard?.writeText(selectedLog.reason);
                    window.alert('Reason log copied to clipboard.');
                  } catch {}
                }}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                📋 Copy Text
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--primary admin-btn--sm"
                onClick={() => setSelectedLog(null)}
                style={{ fontSize: '12px', padding: '6px 16px' }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
