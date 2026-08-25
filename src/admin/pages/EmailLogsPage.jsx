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
import { getEmailLogs } from '../services/adminService.js';

const fetchEmailLogs = (params) => getEmailLogs(params);

export function EmailLogsPage() {
  const [selectedId, setSelectedId] = useState(null);
  const list = useAdminList(fetchEmailLogs);
  const detail = list.items.find((r) => r.id === selectedId);

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Email Audit Logs"
        description="View email transmission history and status logs."
      />

      <AdminSplitLayout
        left={(
          <AdminPanel>
            <AdminFilterBar
              search={list.search}
              onSearchChange={list.setSearch}
              searchPlaceholder="Search Recipient, Subject, Status..."
            />
            <AdminTableWrap loading={list.loading} error={list.error} hasData={list.items.length > 0}>
              <AdminDataTable
                columns={[
                  { key: 'recipient', label: 'Recipient' },
                  { key: 'subject', label: 'Subject' },
                  { key: 'status', label: 'Status' },
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
          <AdminDetailPanel title="Email Details">
            {detail ? (
              <AdminDetailSection title="Email Info">
                <AdminDetailRow label="Recipient" value={detail.recipient} />
                <AdminDetailRow label="Subject" value={detail.subject} />
                <AdminDetailRow label="Status" value={detail.status} />
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
