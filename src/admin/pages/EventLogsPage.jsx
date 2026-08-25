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
import { getEventLogs } from '../services/adminService.js';

const fetchEventLogs = (params) => getEventLogs(params);

export function EventLogsPage() {
  const [selectedId, setSelectedId] = useState(null);
  const list = useAdminList(fetchEventLogs);
  const detail = list.items.find((r) => r.id === selectedId);

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="System Event Logs"
        description="Track system events and user activity audit trail."
      />

      <AdminSplitLayout
        left={(
          <AdminPanel>
            <AdminFilterBar
              search={list.search}
              onSearchChange={list.setSearch}
              searchPlaceholder="Search User ID, Event Type..."
            />
            <AdminTableWrap loading={list.loading} error={list.error} hasData={list.items.length > 0}>
              <AdminDataTable
                columns={[
                  { key: 'userId', label: 'User ID' },
                  { key: 'eventType', label: 'Event Type' },
                  { key: 'ipAddress', label: 'IP' },
                  { key: 'apiResponseCode', label: 'Response Code' },
                  { key: 'at', label: 'Time', render: (r) => formatAdminDate(r.at) },
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
          <AdminDetailPanel title="Event Details">
            {detail ? (
              <AdminDetailSection title="Event Info">
                <AdminDetailRow label="User ID" value={detail.userId} />
                <AdminDetailRow label="Event Type" value={detail.eventType} />
                <AdminDetailRow label="IP" value={detail.ipAddress} />
                <AdminDetailRow label="Response Code" value={detail.apiResponseCode} />
                <AdminDetailRow label="Timestamp" value={formatAdminDate(detail.at)} />
              </AdminDetailSection>
            ) : null}
          </AdminDetailPanel>
        )}
      />
    </div>
  );
}
