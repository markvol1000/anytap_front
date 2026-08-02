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
        title="이벤트 로그"
        description="시스템 이벤트와 사용자 행동을 추적합니다."
      />

      <AdminSplitLayout
        left={(
          <AdminPanel>
            <AdminFilterBar
              search={list.search}
              onSearchChange={list.setSearch}
              searchPlaceholder="유저 ID, 이벤트 타입 검색…"
            />
            <AdminTableWrap loading={list.loading} error={list.error} hasData={list.items.length > 0}>
              <AdminDataTable
                columns={[
                  { key: 'userId', label: '사용자 ID' },
                  { key: 'eventType', label: '이벤트' },
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
          <AdminDetailPanel title="이벤트 상세">
            {detail ? (
              <AdminDetailSection title="이벤트">
                <AdminDetailRow label="사용자 ID" value={detail.userId} />
                <AdminDetailRow label="이벤트 타입" value={detail.eventType} />
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
