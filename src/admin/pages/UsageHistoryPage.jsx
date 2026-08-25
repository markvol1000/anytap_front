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

// Fetch usage logs (IP and API response code) using the generic admin logs endpoint
const fetchUsageLogs = (params) => getAdminLogs(params);

export function UsageHistoryPage() {
  const [selectedId, setSelectedId] = useState(null);
  const list = useAdminList(fetchUsageLogs);
  const detail = list.items.find((r) => r.id === selectedId);

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Usage Audit History"
        description="View admin audit logs including IP addresses and API response codes."
      />

      <AdminSplitLayout
        left={(
          <AdminPanel>
            <AdminFilterBar
              search={list.search}
              onSearchChange={list.setSearch}
              searchPlaceholder="Search IP or Response Code..."
            />
            <AdminTableWrap loading={list.loading} error={list.error} hasData={list.items.length > 0}>
              <AdminDataTable
                columns={[
                  { key: 'adminName', label: 'Admin' },
                  { key: 'ipAddress', label: 'IP' },
                  { key: 'apiResponseCode', label: 'Response Code' },
                  { key: 'action', label: 'Action' },
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
          <AdminDetailPanel title="Log Details">
            {detail ? (
              <AdminDetailSection title="Detailed Info">
                <AdminDetailRow label="Admin" value={detail.adminName} />
                <AdminDetailRow label="Admin ID" value={detail.adminId} />
                <AdminDetailRow label="IP" value={detail.ipAddress} />
                <AdminDetailRow label="Response Code" value={detail.apiResponseCode} />
                <AdminDetailRow label="Action" value={detail.action} />
                <AdminDetailRow label="Timestamp" value={formatAdminDate(detail.at)} />
              </AdminDetailSection>
            ) : null}
          </AdminDetailPanel>
        )}
      />
    </div>
  );
}
