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
        title="이메일 로그"
        description="이메일 전송 이력 및 상태를 확인합니다."
      />

      <AdminSplitLayout
        left={(
          <AdminPanel>
            <AdminFilterBar
              search={list.search}
              onSearchChange={list.setSearch}
              searchPlaceholder="수신자, 제목, 상태 검색…"
            />
            <AdminTableWrap loading={list.loading} error={list.error} hasData={list.items.length > 0}>
              <AdminDataTable
                columns={[
                  { key: 'recipient', label: '수신자' },
                  { key: 'subject', label: '제목' },
                  { key: 'status', label: '상태' },
                  { key: 'ipAddress', label: 'IP' },
                  { key: 'apiResponseCode', label: '응답 코드' },
                  { key: 'at', label: '시간', render: (r) => formatAdminDate(r.at) },
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
          <AdminDetailPanel title="이메일 상세">
            {detail ? (
              <AdminDetailSection title="이메일">
                <AdminDetailRow label="수신자" value={detail.recipient} />
                <AdminDetailRow label="제목" value={detail.subject} />
                <AdminDetailRow label="상태" value={detail.status} />
                <AdminDetailRow label="IP" value={detail.ipAddress} />
                <AdminDetailRow label="응답 코드" value={detail.apiResponseCode} />
                <AdminDetailRow label="시간" value={formatAdminDate(detail.at)} />
              </AdminDetailSection>
            ) : null}
          </AdminDetailPanel>
        )}
      />
    </div>
  );
}
