import { useState } from 'react';
import { AdminDataTable } from '../components/AdminDataTable.jsx';
import { AdminFilterBar, AdminPageHeader, AdminPanel, AdminTableWrap } from '../components/AdminFilterBar.jsx';
import {
  AdminDetailPanel,
  AdminDetailRow,
  AdminDetailSection,
  AdminSplitLayout,
} from '../components/AdminSplitLayout.jsx';
import { AdminStatusBadge } from '../components/AdminStatusBadge.jsx';
import { useAdminList } from '../hooks/useAdminList.js';
import { getContentItems } from '../services/adminService.js';

const fetchContent = (params) => getContentItems(params);

const CONTENT_SECTIONS = [
  'Homepage Banner',
  'FAQ',
  'About',
  'Terms',
  'Privacy',
  'Support',
];

export function ContentPage() {
  const [selectedId, setSelectedId] = useState(null);
  const list = useAdminList(fetchContent);
  const detail = list.items.find((r) => r.id === selectedId);

  return (
    <div className="admin-page">
      <AdminPageHeader title="Content Management" description="Marketing pages and legal content." />

      <div className="admin-chip-row">
        {CONTENT_SECTIONS.map((label) => (
          <span key={label} className="admin-chip">{label}</span>
        ))}
      </div>

      <AdminSplitLayout
        left={(
          <AdminPanel>
            <AdminFilterBar
              search={list.search}
              onSearchChange={list.setSearch}
              searchPlaceholder="Search content…"
            />
            <AdminTableWrap loading={list.loading} error={list.error} hasData={list.items.length > 0}>
              <AdminDataTable
                columns={[
                  { key: 'label', label: 'Page' },
                  { key: 'slug', label: 'Slug' },
                  { key: 'updatedAt', label: 'Updated' },
                  { key: 'status', label: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
                ]}
                rows={list.items}
                selectedId={selectedId}
                onSelectRow={(r) => setSelectedId(r.id)}
                page={list.page}
                totalPages={list.totalPages}
                total={list.total}
                onPageChange={list.setPage}
              />
            </AdminTableWrap>
          </AdminPanel>
        )}
        right={(
          <AdminDetailPanel title={detail?.label ?? null}>
            {detail ? (
              <>
                <AdminDetailSection title="Page info">
                  <AdminDetailRow label="Slug" value={detail.slug} />
                  <AdminDetailRow label="Last updated" value={detail.updatedAt} />
                  <AdminDetailRow label="Status" value={<AdminStatusBadge status={detail.status} />} />
                </AdminDetailSection>
                <AdminDetailSection title="Editor">
                  <textarea
                    className="admin-textarea"
                    rows={10}
                    placeholder="Markdown / rich content…"
                    defaultValue={`# ${detail.label}\n\nContent preview for ${detail.slug}.`}
                  />
                  <button type="button" className="admin-btn admin-btn--primary admin-btn--sm">Publish</button>
                </AdminDetailSection>
              </>
            ) : null}
          </AdminDetailPanel>
        )}
      />
    </div>
  );
}
