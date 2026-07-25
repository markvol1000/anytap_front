import { useState } from 'react';
import { AdminDataTable } from '../components/AdminDataTable.jsx';
import { AdminFilterBar, AdminPageHeader, AdminPanel, AdminTableWrap } from '../components/AdminFilterBar.jsx';
import {
  AdminDetailPanel,
  AdminDetailRow,
  AdminDetailSection,
  AdminSplitLayout,
} from '../components/AdminSplitLayout.jsx';
import { formatAdminDate } from '../components/AdminStatusBadge.jsx';
import { useAdminList } from '../hooks/useAdminList.js';
import { getAdminLogs } from '../services/adminService.js';

const fetchLogs = (params) => getAdminLogs(params);

export function AdminLogsPage() {
  const [selectedId, setSelectedId] = useState(null);
  const list = useAdminList(fetchLogs);
  const detail = list.items.find((r) => r.id === selectedId);

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Admin Logs"
        description="Audit trail — who changed what and when."
      />

      <AdminSplitLayout
        left={(
          <AdminPanel>
            <AdminFilterBar
              search={list.search}
              onSearchChange={list.setSearch}
              searchPlaceholder="Search admin, action, target…"
            />
            <AdminTableWrap loading={list.loading} error={list.error} hasData={list.items.length > 0}>
              <AdminDataTable
                columns={[
                  { key: 'adminName', label: 'Admin' },
                  { key: 'action', label: 'Action' },
                  { key: 'target', label: 'Target' },
                  { key: 'at', label: 'When', render: (r) => formatAdminDate(r.at) },
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
          <AdminDetailPanel title="Log detail">
            {detail ? (
              <AdminDetailSection title="Event">
                <AdminDetailRow label="Admin" value={detail.adminName} />
                <AdminDetailRow label="Admin ID" value={detail.adminId} />
                <AdminDetailRow label="Action" value={detail.action} />
                <AdminDetailRow label="Target" value={detail.target} />
                <AdminDetailRow label="Timestamp" value={formatAdminDate(detail.at)} />
              </AdminDetailSection>
            ) : null}
          </AdminDetailPanel>
        )}
      />
    </div>
  );
}
