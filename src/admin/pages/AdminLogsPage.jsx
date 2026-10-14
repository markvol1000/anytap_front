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
        onRefresh={list.reload}
        refreshing={list.loading}
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
                    key: 'target',
                    label: 'Target',
                    render: (r) => (
                      <span
                        title={r.target}
                        style={{
                          fontSize: '12px',
                          color: '#475569',
                          maxWidth: '220px',
                          display: 'inline-block',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          verticalAlign: 'middle',
                        }}
                      >
                        {r.target || '—'}
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
                      {r.adminId && (
                        <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>
                          {r.adminId}
                        </span>
                      )}
                    </div>
                    <div className="admin-mobile-card__row2">
                      <span className="admin-mobile-card__detail" title={r.target || ''}>
                        {r.target || '—'}
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
        right={selectedId && detail ? (
          <AdminDetailPanel
            title="Log Detail"
            hasData={Boolean(detail)}
            onClose={() => setSelectedId(null)}
          >
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
        ) : null}
      />
    </div>
  );
}
