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
                  {
                    key: 'adminName',
                    label: 'Admin',
                    render: (r) => (
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>
                        {r.adminName || 'Admin'}
                      </span>
                    ),
                  },
                  {
                    key: 'ipAddress',
                    label: 'IP',
                    render: (r) => (
                      <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#475569', whiteSpace: 'nowrap' }}>
                        {r.ipAddress || '—'}
                      </span>
                    ),
                  },
                  {
                    key: 'apiResponseCode',
                    label: 'Response Code',
                    render: (r) => (
                      <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>
                        {r.apiResponseCode || '—'}
                      </span>
                    ),
                  },
                  {
                    key: 'action',
                    label: 'Action',
                    render: (r) => (
                      <span
                        title={r.action}
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '3px',
                          backgroundColor: '#f1f5f9',
                          color: '#334155',
                          border: '1px solid #cbd5e1',
                          display: 'inline-block',
                          maxWidth: '180px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: 1.2,
                        }}
                      >
                        {r.action || '—'}
                      </span>
                    ),
                  },
                  {
                    key: 'at',
                    label: 'When',
                    render: (r) => (
                      <span style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {formatAdminDate(r.at)}
                      </span>
                    ),
                  },
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
                renderMobileCard={(r) => (
                  <>
                    <div className="admin-mobile-card__row1">
                      <div className="admin-mobile-card__left">
                        <span className="admin-mobile-card__title">
                          {r.adminName || 'Admin'}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '3px',
                            backgroundColor: '#f1f5f9',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            lineHeight: 1.2,
                          }}
                        >
                          {r.action || 'Action'}
                        </span>
                      </div>
                      {r.apiResponseCode && (
                        <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>
                          {r.apiResponseCode}
                        </span>
                      )}
                    </div>
                    <div className="admin-mobile-card__row2">
                      <span className="admin-mobile-card__detail" style={{ fontFamily: 'monospace' }} title={r.ipAddress || ''}>
                        {r.ipAddress || '—'}
                      </span>
                      <span style={{ color: '#cbd5e1' }}>•</span>
                      <span className="admin-mobile-card__date">
                        {formatAdminDate(r.at)}
                      </span>
                    </div>
                  </>
                )}
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
