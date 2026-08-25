import { useState } from 'react';
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
import { getLoginLogs } from '../services/adminService.js';

const fetchLoginLogs = (params) => getLoginLogs(params);

export function LoginLogsPage() {
  const [selectedId, setSelectedId] = useState(null);
  const list = useAdminList(fetchLoginLogs);
  const detail = list.items.find((r) => r.id === selectedId);

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Login Audit Logs"
        description="Audit trail of user authentication attempts, IP addresses, and login statuses."
      />

      <AdminSplitLayout
        left={(
          <AdminPanel>
            <AdminFilterBar
              search={list.search}
              onSearchChange={list.setSearch}
              searchPlaceholder="Search email, user ID, IP address…"
              status={list.status}
              onStatusChange={list.setStatus}
              statusOptions={[
                { value: 'all', label: 'All Statuses' },
                { value: 'SUCCESS', label: 'Success' },
                { value: 'FAILURE', label: 'Failure' },
              ]}
            />
            <AdminTableWrap loading={list.loading} error={list.error} hasData={list.items.length > 0}>
              <AdminDataTable
                columns={[
                  { key: 'email', label: 'User Email' },
                  { key: 'userId', label: 'User ID' },
                  {
                    key: 'status',
                    label: 'Status',
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
                    render: (r) => (
                      <span style={{ fontSize: '12px', color: r.status === 'FAILURE' ? '#f87171' : '#94a3b8' }}>
                        {r.reason && r.reason !== '—' ? r.reason : (r.status === 'SUCCESS' ? 'Normal Login' : '—')}
                      </span>
                    ),
                  },
                  { key: 'ipAddress', label: 'IP Address' },
                  { key: 'createdAt', label: 'Timestamp', render: (r) => formatAdminDate(r.createdAt) },
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
          <AdminDetailPanel title="Login Attempt Detail">
            {detail ? (
              <AdminDetailSection title="Authentication Info">
                <AdminDetailRow label="User Email" value={detail.email} />
                <AdminDetailRow label="User ID" value={detail.userId} />
                <AdminDetailRow
                  label="Status"
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
            ) : (
              <p style={{ padding: '16px', color: 'var(--admin-text-muted, #94a3b8)', fontSize: '13px' }}>
                Select a login record to view detailed authentication parameters.
              </p>
            )}
          </AdminDetailPanel>
        )}
      />
    </div>
  );
}
