import { useCallback, useState } from 'react';
import { AdminDataTable } from '../components/AdminDataTable.jsx';
import { AdminFilterBar, AdminPageHeader, AdminPanel, AdminTableWrap } from '../components/AdminFilterBar.jsx';
import {
  AdminActionStack,
  AdminDetailPanel,
  AdminDetailRow,
  AdminDetailSection,
  AdminSplitLayout,
} from '../components/AdminSplitLayout.jsx';
import { AdminStatusBadge } from '../components/AdminStatusBadge.jsx';
import { runConfirm, useAdminConfirm } from '../components/AdminConfirmModal.jsx';
import { useAdminList } from '../hooks/useAdminList.js';
import { useAdminDetail } from '../hooks/useAdminDetail.js';
import {
  MAX_CARDS_PER_MEMBER,
  activateCard,
  approveCard,
  freezeCard,
  getCardApplications,
  getCardById,
  issueCard,
  rejectCard,
  terminateCard,
} from '../services/adminService.js';

const fetchCards = (params) => getCardApplications(params);
const fetchCardDetail = (id) => getCardById(id);

export function CardsPage() {
  const confirm = useAdminConfirm();
  const [selectedId, setSelectedId] = useState(null);
  const list = useAdminList(fetchCards, {}, { urlKeys: ['status'] });
  const { detail, loading: detailLoading, setDetail } = useAdminDetail(fetchCardDetail, selectedId);

  const runCardAction = useCallback(async (label, fn, options = {}) => {
    if (!detail) return;
    const ok = await runConfirm(confirm, {
      title: label,
      message: options.message ?? `${label} for ${detail.memberName}?`,
      confirmLabel: label,
      danger: options.danger,
      showInput: options.showInput,
      inputPlaceholder: options.inputPlaceholder,
    });
    if (options.showInput) {
      if (ok == null) return;
      try {
        const updated = await fn(detail.id, ok);
        setDetail(updated);
        list.reload();
      } catch (err) {
        window.alert(err.message);
      }
      return;
    }
    if (!ok) return;
    try {
      const updated = await fn(detail.id);
      setDetail(updated);
      list.reload();
    } catch (err) {
      window.alert(err.message);
    }
  }, [confirm, detail, list, setDetail]);

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Cards"
        description={`Card applications and lifecycle — max ${MAX_CARDS_PER_MEMBER} cards per member.`}
      />

      <AdminSplitLayout
        left={(
          <AdminPanel>
            <AdminFilterBar
              search={list.search}
              onSearchChange={list.setSearch}
              searchPlaceholder="Search member or card…"
              filters={[
                {
                  key: 'status',
                  label: 'Status',
                  value: list.filters.status ?? 'all',
                  onChange: (v) => list.setFilter('status', v),
                  options: [
                    { value: 'all', label: 'All' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'approved', label: 'Approved' },
                    { value: 'active', label: 'Active' },
                    { value: 'frozen', label: 'Frozen' },
                    { value: 'rejected', label: 'Rejected' },
                    { value: 'terminated', label: 'Terminated' },
                  ],
                },
              ]}
            />
            <AdminTableWrap loading={list.loading} error={list.error} hasData={(list.items || []).length > 0}>
              <AdminDataTable
                columns={[
                  { key: 'memberName', label: 'Member' },
                  { key: 'cardType', label: 'Card Type' },
                  { key: 'status', label: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
                  { key: 'wallet', label: 'Wallet' },
                  { key: 'created', label: 'Created' },
                ]}
                rows={list.items || []}
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
          <AdminDetailPanel title={detail ? `Card — ${detail.memberName}` : null}>
            {detailLoading && !detail ? <p className="admin-loading admin-loading--inline">Loading…</p> : null}
            {!detailLoading && detail ? (
              <>
                <AdminDetailSection title="Card detail">
                  <AdminDetailRow label="Application ID" value={detail.id} />
                  <AdminDetailRow label="Member" value={detail.memberName} />
                  <AdminDetailRow label="Type" value={detail.cardType} />
                  <AdminDetailRow label="Status" value={<AdminStatusBadge status={detail.status} />} />
                  <AdminDetailRow label="Wallet" value={detail.wallet} />
                  <AdminDetailRow label="Last 4" value={detail.last4 ?? '—'} />
                  <AdminDetailRow label="Created" value={detail.created} />
                  {detail.rejectReason ? (
                    <AdminDetailRow label="Reject reason" value={detail.rejectReason} />
                  ) : null}
                </AdminDetailSection>

                <AdminActionStack>
                  {['pending', 'applied', 'application_review'].includes(detail.status) ? (
                    <>
                      <button type="button" className="admin-btn admin-btn--primary" onClick={() => runCardAction('Approve Card', approveCard)}>
                        Approve
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn--danger"
                        onClick={() => runCardAction('Reject Card', rejectCard, {
                          showInput: true,
                          inputPlaceholder: 'Reject reason…',
                          danger: true,
                        })}>
                        Reject
                      </button>
                    </>
                  ) : null}
                  {['approved', 'pending', 'applied', 'application_review'].includes(detail.status) ? (
                    <button type="button" className="admin-btn admin-btn--primary" onClick={() => runCardAction('Issue Card', issueCard)}>
                      Issue
                    </button>
                  ) : null}
                  {['issued', 'frozen'].includes(detail.status) ? (
                    <button type="button" className="admin-btn admin-btn--primary" onClick={() => runCardAction('Activate Card', activateCard)}>
                      Activate
                    </button>
                  ) : null}
                  {detail.status === 'active' ? (
                    <button type="button" className="admin-btn admin-btn--warning" onClick={() => runCardAction('Freeze Card', freezeCard)}>
                      Freeze
                    </button>
                  ) : null}
                  {detail.status !== 'terminated' && detail.status !== 'rejected' ? (
                    <button
                      type="button"
                      className="admin-btn admin-btn--danger"
                      onClick={() => runCardAction('Terminate Card', terminateCard, { danger: true })}>
                      Terminate
                    </button>
                  ) : null}
                </AdminActionStack>
              </>
            ) : null}
          </AdminDetailPanel>
        )}
      />
    </div>
  );
}
