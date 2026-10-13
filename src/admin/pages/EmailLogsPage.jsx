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
                  {
                    key: 'recipient',
                    label: 'Recipient',
                    render: (r) => (
                      <span
                        title={r.recipient}
                        style={{
                          fontWeight: 600,
                          color: '#0f172a',
                          maxWidth: '200px',
                          display: 'inline-block',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          verticalAlign: 'middle',
                        }}
                      >
                        {r.recipient || '—'}
                      </span>
                    ),
                  },
                  {
                    key: 'subject',
                    label: 'Subject',
                    render: (r) => (
                      <span
                        title={r.subject}
                        style={{
                          fontSize: '12px',
                          color: '#334155',
                          maxWidth: '240px',
                          display: 'inline-block',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          verticalAlign: 'middle',
                        }}
                      >
                        {r.subject || '—'}
                      </span>
                    ),
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    render: (r) => {
                      const st = String(r.status || '').toUpperCase();
                      const isOk = st.includes('SUCCESS') || st.includes('SENT') || st.includes('DELIVERED') || st.includes('OK');
                      return (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '3px',
                            backgroundColor: isOk ? '#f0fdf4' : '#fef2f2',
                            color: isOk ? '#15803d' : '#b91c1c',
                            border: `1px solid ${isOk ? '#bbf7d0' : '#fca5a5'}`,
                            lineHeight: 1.2,
                            display: 'inline-block',
                          }}
                        >
                          {r.status || '—'}
                        </span>
                      );
                    },
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
                  const st = String(r.status || '').toUpperCase();
                  const isOk = st.includes('SUCCESS') || st.includes('SENT') || st.includes('DELIVERED') || st.includes('OK');
                  return (
                    <>
                      <div className="admin-mobile-card__row1">
                        <div className="admin-mobile-card__left">
                          <span className="admin-mobile-card__title" title={r.recipient}>
                            {r.recipient || 'Recipient'}
                          </span>
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
                            }}
                          >
                            {r.status || 'Status'}
                          </span>
                        </div>
                        {r.apiResponseCode && (
                          <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748b', flexShrink: 0 }}>
                            {r.apiResponseCode}
                          </span>
                        )}
                      </div>
                      <div className="admin-mobile-card__row2">
                        <span className="admin-mobile-card__detail" title={r.subject || ''}>
                          {r.subject || '—'}
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
