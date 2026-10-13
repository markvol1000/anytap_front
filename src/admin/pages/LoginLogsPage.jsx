import { useEffect, useState } from 'react';
import { AdminDataTable } from '../components/AdminDataTable.jsx';
import { AdminFilterBar, AdminPageHeader, AdminPanel, AdminTableWrap } from '../components/AdminFilterBar.jsx';
import {
  AdminDetailPanel,
  AdminDetailRow,
  AdminDetailSection,
  AdminSplitLayout,
} from '../components/AdminSplitLayout.jsx';
import { AdminStatusBadge, formatAdminDate } from '../components/AdminStatusBadge.jsx';
import { useAdminList } from '../hooks/useAdminList.js';
import { getLoginLogs, getMemberById, updateMember } from '../services/adminService.js';

const STATUS_STYLES = {
  active: {
    bg: '#ecfdf5',
    color: '#047857',
    border: '#a7f3d0',
    dot: '#10b981',
    ball: '🟢',
    label: 'Active',
  },
  suspended: {
    bg: '#fef2f2',
    color: '#dc2626',
    border: '#fca5a5',
    dot: '#ef4444',
    ball: '🔴',
    label: 'Suspended',
  },
  locked: {
    bg: '#fff7ed',
    color: '#c2410c',
    border: '#fed7aa',
    dot: '#f97316',
    ball: '🟠',
    label: 'Locked',
  },
  pending: {
    bg: '#f1f5f9',
    color: '#475569',
    border: '#cbd5e1',
    dot: '#94a3b8',
    ball: '⚪',
    label: 'Pending',
  },
  rejected: {
    bg: '#fef2f2',
    color: '#991b1b',
    border: '#fecaca',
    dot: '#ef4444',
    ball: '❌',
    label: 'Rejected',
  },
};

const fetchLoginLogs = (params) => getLoginLogs(params);

export function LoginLogsPage() {
  const [selectedId, setSelectedId] = useState(null);
  const [statusOverrides, setStatusOverrides] = useState({});
  const [memberInfoMap, setMemberInfoMap] = useState({});
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState(null);

  const list = useAdminList(fetchLoginLogs);
  const detail = list.items.find((r) => r.id === selectedId);

  // Lazy-resolve member info if not already in login log record
  useEffect(() => {
    if (!detail) return;
    const lookupKey = detail.userId && detail.userId !== '—' && detail.userId !== '-' ? detail.userId : detail.email;
    if (!lookupKey || lookupKey === '—' || memberInfoMap[detail.id]) return;

    if (detail.userExists != null) {
      setMemberInfoMap((prev) => ({
        ...prev,
        [detail.id]: {
          exists: detail.userExists,
          status: detail.userStatus || 'ACTIVE',
          resolvedUserId: detail.resolvedUserId || lookupKey,
        },
      }));
      return;
    }

    let isMounted = true;
    getMemberById(lookupKey)
      .then((mem) => {
        if (!isMounted) return;
        if (mem && (mem.userId || mem.id || mem.email)) {
          setMemberInfoMap((prev) => ({
            ...prev,
            [detail.id]: {
              exists: true,
              status: mem.accountStatus || mem.status || 'ACTIVE',
              resolvedUserId: mem.userId || mem.id,
            },
          }));
        } else {
          setMemberInfoMap((prev) => ({
            ...prev,
            [detail.id]: { exists: false },
          }));
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setMemberInfoMap((prev) => ({
          ...prev,
          [detail.id]: { exists: false },
        }));
      });

    return () => {
      isMounted = false;
    };
  }, [detail, memberInfoMap]);

  const currentMemberInfo = detail ? memberInfoMap[detail.id] : null;
  const isExistingUser = detail
    ? (detail.userExists != null ? detail.userExists : currentMemberInfo?.exists ?? false)
    : false;

  const currentStatus = detail
    ? (statusOverrides[detail.id] || currentMemberInfo?.status || detail.userStatus || 'ACTIVE')
    : 'ACTIVE';

  const effectiveUserId = detail
    ? (detail.resolvedUserId || currentMemberInfo?.resolvedUserId || (detail.userId && detail.userId !== '—' ? detail.userId : detail.email))
    : null;

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Login Audit Logs"
        description="Audit trail of user authentication attempts, IP addresses, and login statuses."
        onRefresh={list.reload}
        refreshing={list.loading}
      />

      <AdminSplitLayout
        left={(
          <AdminPanel>
            <AdminFilterBar
              search={list.search}
              onSearchChange={list.setSearch}
              searchPlaceholder="Search email, user ID, IP address…"
              filters={[
                {
                  key: 'status',
                  label: 'Status',
                  value: list.filters?.status ?? 'all',
                  onChange: (v) => list.setFilter('status', v),
                  options: [
                    { value: 'all', label: 'All Statuses' },
                    { value: 'SUCCESS', label: 'Success' },
                    { value: 'FAILURE', label: 'Failure' },
                  ],
                },
              ]}
            />
            <AdminTableWrap loading={list.loading} error={list.error} hasData={list.items.length > 0}>
              <AdminDataTable
                columns={[
                  {
                    key: 'email',
                    label: 'User Email',
                    render: (r) => (
                      <span
                        title={r.email}
                        style={{
                          fontWeight: 600,
                          color: '#0f172a',
                          maxWidth: '180px',
                          display: 'inline-block',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          verticalAlign: 'middle',
                        }}
                      >
                        {r.email || '—'}
                      </span>
                    ),
                  },
                  {
                    key: 'userId',
                    label: 'User ID',
                    render: (r) => (
                      <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#475569' }}>
                        {r.userId || '—'}
                      </span>
                    ),
                  },
                  {
                    key: 'userExists',
                    label: 'Status',
                    render: (r) => {
                      const overridden = statusOverrides[r.id];
                      const rawSt = String(overridden || r.userStatus || 'active').toLowerCase();
                      const effectiveId = r.resolvedUserId || (r.userId && r.userId !== '—' && r.userId !== '-' ? r.userId : r.email);
                      const isExisting = r.userExists === true || (r.userExists == null && Boolean(r.userId && r.userId !== '—' && r.userId !== '-'));

                      if (!isExisting) {
                        return (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              color: '#b91c1c',
                              background: '#fef2f2',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              border: '1px solid #fecaca',
                              whiteSpace: 'nowrap',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                            Non-existent
                          </span>
                        );
                      }

                      const theme = STATUS_STYLES[rawSt] || STATUS_STYLES.active;

                      return (
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '700',
                            backgroundColor: theme.bg,
                            color: theme.color,
                            border: `1px solid ${theme.border}`,
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          {theme.ball} {theme.label}
                        </span>
                      );
                    },
                  },
                  {
                    key: 'status',
                    label: 'Login Result',
                    render: (r) => (
                      <AdminStatusBadge
                        status={r.status === 'SUCCESS' ? 'active' : 'suspended'}
                        label={r.status}
                      />
                    ),
                  },
                  {
                    key: 'reason',
                    label: 'Reason / Note',
                    render: (r) => {
                      const note = r.reason && r.reason !== '—' ? r.reason : (r.status === 'SUCCESS' ? 'Normal Login' : '—');
                      return (
                        <span
                          title={note}
                          style={{
                            fontSize: '12px',
                            color: r.status === 'FAILURE' ? '#dc2626' : '#64748b',
                            maxWidth: '180px',
                            display: 'inline-block',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            verticalAlign: 'middle',
                          }}
                        >
                          {note}
                        </span>
                      );
                    },
                  },
                  {
                    key: 'ipAddress',
                    label: 'IP Address',
                    render: (r) => (
                      <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#334155', whiteSpace: 'nowrap' }}>
                        {r.ipAddress || '—'}
                      </span>
                    ),
                  },
                  {
                    key: 'createdAt',
                    label: 'Timestamp',
                    render: (r) => (
                      <span style={{ fontSize: '12px', color: '#475569', whiteSpace: 'nowrap' }}>
                        {formatAdminDate(r.createdAt)}
                      </span>
                    ),
                  },
                ]}
                rows={list.items}
                selectedId={selectedId}
                onSelectRow={(r) => {
                  setSelectedId(r.id);
                  setStatusFeedback(null);
                }}
                sortKey={list.sortKey}
                sortDir={list.sortDir}
                onSort={list.toggleSort}
                page={list.page}
                totalPages={list.totalPages}
                total={list.total}
                onPageChange={list.setPage}
                renderMobileCard={(r) => {
                  const note = r.reason && r.reason !== '—' ? r.reason : (r.status === 'SUCCESS' ? 'Normal Login' : '—');
                  const overridden = statusOverrides[r.id];
                  const st = overridden || r.userStatus;
                  return (
                    <>
                      <div className="admin-mobile-card__row1">
                        <div className="admin-mobile-card__left">
                          <span className="admin-mobile-card__title" title={r.email}>
                            {r.email || r.userId || '—'}
                          </span>
                          <AdminStatusBadge
                            status={r.status === 'SUCCESS' ? 'active' : 'suspended'}
                            label={r.status}
                          />
                          {r.userExists === false ? (
                            <span style={{ fontSize: '10px', color: '#b91c1c', background: '#fef2f2', padding: '1px 6px', borderRadius: '4px', border: '1px solid #fecaca', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                              Non-existent
                            </span>
                          ) : (
                            (() => {
                              const rawSt = String(st || 'active').toLowerCase();
                              const theme = STATUS_STYLES[rawSt] || STATUS_STYLES.active;
                              return (
                                <span style={{ fontSize: '10px', color: theme.color, background: theme.bg, padding: '1px 6px', borderRadius: '4px', border: `1px solid ${theme.border}`, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: theme.dot }} />
                                  {theme.label}
                                </span>
                              );
                            })()
                          )}
                        </div>
                        {r.userId && (
                          <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748b', flexShrink: 0 }}>
                            {r.userId}
                          </span>
                        )}
                      </div>
                      <div className="admin-mobile-card__row2">
                        <span className="admin-mobile-card__detail" title={note}>
                          {note}
                        </span>
                        {r.ipAddress && (
                          <>
                            <span style={{ color: '#cbd5e1' }}>•</span>
                            <span className="admin-mobile-card__meta" style={{ fontFamily: 'monospace', color: '#475569' }}>
                              {r.ipAddress}
                            </span>
                          </>
                        )}
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <span className="admin-mobile-card__date">
                          {formatAdminDate(r.createdAt)}
                        </span>
                      </div>
                    </>
                  );
                }}
              />
            </AdminTableWrap>
          </AdminPanel>
        )}
        right={(
          <AdminDetailPanel title="Login Attempt Detail" onClose={() => setSelectedId(null)}>
            {detail ? (
              <>
                <AdminDetailSection title="Account Existence & Status">
                  <AdminDetailRow
                    label="Account Existence"
                    value={
                      isExistingUser ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '700',
                            backgroundColor: '#ecfdf5',
                            color: '#047857',
                            border: '1px solid #a7f3d0',
                          }}
                        >
                          <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                          Existing Member {detail.isTemp ? '(Registration Pending)' : ''}
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '700',
                            backgroundColor: '#fef2f2',
                            color: '#b91c1c',
                            border: '1px solid #fecaca',
                          }}
                        >
                          <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                          Non-existent User (Unregistered Account)
                        </span>
                      )
                    }
                  />

                  {isExistingUser && (
                    <>
                      <AdminDetailRow
                        label="Member Identifier"
                        value={(
                          <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                            {effectiveUserId || detail.userId || detail.email}
                          </span>
                        )}
                      />
                      <AdminDetailRow
                        label="Status"
                        value={(
                          (() => {
                            const rawSt = String(currentStatus || 'active').toLowerCase();
                            const theme = STATUS_STYLES[rawSt] || STATUS_STYLES.active;
                            const isTemp = Boolean(detail.isTemp || (detail.userId && String(detail.userId).startsWith('temp-')));
                            return (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <select
                                  id={`user-status-select-${detail.id}`}
                                  name="accountStatus"
                                  aria-label="Update account status"
                                  value={rawSt}
                                  disabled={updatingStatus}
                                  onChange={async (e) => {
                                    const nextStatus = e.target.value;
                                    if (!effectiveUserId) return;
                                    setUpdatingStatus(true);
                                    setStatusFeedback(null);
                                    try {
                                      await updateMember(effectiveUserId, { status: nextStatus.toUpperCase() });
                                      setStatusOverrides((prev) => ({
                                        ...prev,
                                        [detail.id]: nextStatus.toUpperCase(),
                                      }));
                                      setStatusFeedback({
                                        type: 'success',
                                        message: `Successfully changed status to ${nextStatus.toUpperCase()}`,
                                      });
                                      list.reload();
                                    } catch (err) {
                                      setStatusFeedback({
                                        type: 'error',
                                        message: err.message || 'Failed to update account status.',
                                      });
                                    } finally {
                                      setUpdatingStatus(false);
                                    }
                                  }}
                                  style={{
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    cursor: updatingStatus ? 'not-allowed' : 'pointer',
                                    backgroundColor: theme.bg,
                                    color: theme.color,
                                    border: `1px solid ${theme.border}`,
                                    outline: 'none',
                                  }}
                                >
                                  {isTemp ? (
                                    <>
                                      <option value="pending">⚪ Pending</option>
                                      <option value="suspended">🔴 Suspended</option>
                                    </>
                                  ) : (
                                    <>
                                      <option value="active">🟢 Active</option>
                                      <option value="suspended">🔴 Suspended</option>
                                      <option value="locked">🟠 Locked</option>
                                      <option value="pending">⚪ Pending</option>
                                    </>
                                  )}
                                </select>
                                {updatingStatus && (
                                  <span style={{ fontSize: '11px', color: '#64748b' }}>Saving…</span>
                                )}
                              </div>
                            );
                          })()
                        )}
                      />

                      {statusFeedback && (
                        <div
                          style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '600',
                            marginTop: '8px',
                            backgroundColor: statusFeedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
                            color: statusFeedback.type === 'success' ? '#166534' : '#991b1b',
                            border: `1px solid ${statusFeedback.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                          }}
                        >
                          {statusFeedback.message}
                        </div>
                      )}
                    </>
                  )}
                </AdminDetailSection>

                <AdminDetailSection title="Authentication Info">
                  <AdminDetailRow label="User Email" value={detail.email} />
                  <AdminDetailRow label="User ID" value={detail.userId} />
                  <AdminDetailRow
                    label="Login Result"
                    value={(
                      <AdminStatusBadge
                        status={detail.status === 'SUCCESS' ? 'active' : 'suspended'}
                        label={detail.status}
                      />
                    )}
                  />
                  {detail.reason && detail.reason !== '—' && (
                    <AdminDetailRow label="Failure Reason" value={detail.reason} />
                  )}
                  <AdminDetailRow label="IP Address" value={detail.ipAddress} />
                  <AdminDetailRow label="User Agent" value={detail.userAgent} />
                  <AdminDetailRow label="Timestamp" value={formatAdminDate(detail.createdAt)} />
                </AdminDetailSection>
              </>
            ) : (
              <p style={{ padding: '16px', color: 'var(--admin-text-muted, #94a3b8)', fontSize: '13px' }}>
                Select a login record to view detailed authentication parameters and member status.
              </p>
            )}
          </AdminDetailPanel>
        )}
      />
    </div>
  );
}
