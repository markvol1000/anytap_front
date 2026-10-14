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
        onRefresh={list.reload}
        refreshing={list.loading}
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
                  {
                    key: 'userId',
                    label: 'User ID',
                    render: (r) => (
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '12px', color: '#0f172a' }}>
                        {r.userId || '—'}
                      </span>
                    ),
                  },
                  {
                    key: 'eventType',
                    label: 'Event Type',
                    render: (r) => (
                      <span
                        title={r.eventType}
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '3px',
                          backgroundColor: '#e0f2fe',
                          color: '#0369a1',
                          border: '1px solid #bae6fd',
                          display: 'inline-block',
                          maxWidth: '200px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: 1.2,
                        }}
                      >
                        {r.eventType || '—'}
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
                    render: (r) => {
                      const code = r.apiResponseCode;
                      const isOk = code && (String(code).startsWith('2') || code === 'OK' || code === 'SUCCESS');
                      return (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '3px',
                            backgroundColor: isOk ? '#f0fdf4' : '#fef2f2',
                            color: isOk ? '#15803d' : '#b91c1c',
                            border: `1px solid ${isOk ? '#bbf7d0' : '#fca5a5'}`,
                            lineHeight: 1.2,
                          }}
                        >
                          {code || '—'}
                        </span>
                      );
                    },
                  },
                  {
                    key: 'at',
                    label: 'Time',
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
                renderMobileCard={(r) => {
                  const code = r.apiResponseCode;
                  const isOk = code && (String(code).startsWith('2') || code === 'OK' || code === 'SUCCESS');
                  return (
                    <>
                      <div className="admin-mobile-card__row1">
                        <div className="admin-mobile-card__left">
                          <span className="admin-mobile-card__title" style={{ fontFamily: 'monospace' }}>
                            {r.userId || 'User'}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: '3px',
                              backgroundColor: '#e0f2fe',
                              color: '#0369a1',
                              border: '1px solid #bae6fd',
                              lineHeight: 1.2,
                            }}
                          >
                            {r.eventType || 'Event'}
                          </span>
                        </div>
                        {code && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: '3px',
                              backgroundColor: isOk ? '#f0fdf4' : '#fef2f2',
                              color: isOk ? '#15803d' : '#b91c1c',
                              border: `1px solid ${isOk ? '#bbf7d0' : '#fca5a5'}`,
                              lineHeight: 1.2,
                              flexShrink: 0,
                            }}
                          >
                            {code}
                          </span>
                        )}
                      </div>
                      <div className="admin-mobile-card__row2">
                        {r.ipAddress && (
                          <span className="admin-mobile-card__meta" style={{ fontFamily: 'monospace', color: '#475569' }}>
                            {r.ipAddress}
                          </span>
                        )}
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <span className="admin-mobile-card__date">
                          {formatAdminDate(r.at)}
                        </span>
                      </div>
                    </>
                  );
                }}
              />
            </AdminTableWrap>
          </AdminPanel>
        )}
        right={selectedId && detail ? (
          <AdminDetailPanel
            title="Event Details"
            hasData={Boolean(detail)}
            onClose={() => setSelectedId(null)}
          >
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
        ) : null}
      />
    </div>
  );
}
