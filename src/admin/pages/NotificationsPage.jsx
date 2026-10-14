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
import { getNotifications } from '../services/adminService.js';

const fetchNotifications = (params) => getNotifications(params);

const TYPE_TABS = [
  { id: 'all', label: 'All' },
  { id: 'announcement', label: 'Announcements' },
  { id: 'push', label: 'Push' },
  { id: 'email', label: 'Email' },
  { id: 'banner', label: 'Banner' },
];

export function NotificationsPage() {
  const [selectedId, setSelectedId] = useState(null);
  const [typeTab, setTypeTab] = useState('all');
  const list = useAdminList(fetchNotifications, { status: 'all' });

  const rows = typeTab === 'all'
    ? list.items
    : list.items.filter((n) => n.type === typeTab);

  const detail = rows.find((r) => r.id === selectedId) ?? list.items.find((r) => r.id === selectedId);

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Notifications"
        description="Announcements, push, email, banners, and scheduled sends."
        onRefresh={list.reload}
        refreshing={list.loading}
        actions={(
          <button type="button" className="admin-btn admin-btn--primary">New notification</button>
        )}
      />

      <div className="admin-tabs" role="tablist">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className={`admin-tabs__btn${typeTab === tab.id ? ' is-active' : ''}`}
            onClick={() => setTypeTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      <AdminSplitLayout
        left={(
          <AdminPanel>
            <AdminFilterBar
              search={list.search}
              onSearchChange={list.setSearch}
              searchPlaceholder="Search title…"
            />
            <AdminTableWrap loading={list.loading} error={list.error} hasData={list.items.length > 0}>
              <AdminDataTable
                columns={[
                  {
                    key: 'type',
                    label: 'Channel',
                    render: (r) => (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '3px',
                          backgroundColor: '#f1f5f9',
                          color: '#334155',
                          border: '1px solid #cbd5e1',
                          lineHeight: 1.2,
                          textTransform: 'uppercase',
                        }}
                      >
                        {r.type || 'all'}
                      </span>
                    ),
                  },
                  {
                    key: 'title',
                    label: 'Title',
                    render: (r) => (
                      <span
                        title={r.title}
                        style={{
                          fontWeight: 600,
                          color: '#0f172a',
                          maxWidth: '260px',
                          display: 'inline-block',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          verticalAlign: 'middle',
                        }}
                      >
                        {r.title || '—'}
                      </span>
                    ),
                  },
                  { key: 'status', label: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
                  {
                    key: 'scheduledAt',
                    label: 'Scheduled',
                    render: (r) => (
                      <span style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {formatAdminDate(r.scheduledAt)}
                      </span>
                    ),
                  },
                ]}
                rows={rows}
                selectedId={selectedId}
                onSelectRow={(r) => setSelectedId(r.id)}
                page={list.page}
                totalPages={list.totalPages}
                total={list.total}
                onPageChange={list.setPage}
                renderMobileCard={(r) => (
                  <>
                    <div className="admin-mobile-card__row1">
                      <div className="admin-mobile-card__left">
                        <span className="admin-mobile-card__title" title={r.title}>
                          {r.title || 'Notification'}
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
                            textTransform: 'uppercase',
                          }}
                        >
                          {r.type || 'all'}
                        </span>
                        <AdminStatusBadge status={r.status} />
                      </div>
                    </div>
                    <div className="admin-mobile-card__row2">
                      <span className="admin-mobile-card__date" style={{ marginLeft: 0 }}>
                        Scheduled: {formatAdminDate(r.scheduledAt)}
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
            title={detail?.title || 'Notification Details'}
            hasData={Boolean(detail)}
            onClose={() => setSelectedId(null)}
          >
            {detail ? (
              <>
                <AdminDetailSection title="Details">
                  <AdminDetailRow label="Channel" value={detail.type} />
                  <AdminDetailRow label="Status" value={<AdminStatusBadge status={detail.status} />} />
                  <AdminDetailRow label="Scheduled" value={formatAdminDate(detail.scheduledAt)} />
                </AdminDetailSection>
                <AdminDetailSection title="Compose">
                  <p className="admin-muted">Rich editor connects to CMS API in production.</p>
                  <textarea className="admin-textarea" rows={6} defaultValue={detail.title} />
                  <button type="button" className="admin-btn admin-btn--ghost admin-btn--sm">Schedule send</button>
                </AdminDetailSection>
              </>
            ) : null}
          </AdminDetailPanel>
        ) : null}
      />
    </div>
  );
}
