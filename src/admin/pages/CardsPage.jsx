import { useCallback, useEffect, useState } from 'react';
import { AdminDataTable } from '../components/AdminDataTable.jsx';
import { AdminFilterBar, AdminPageHeader, AdminPanel, AdminTableWrap } from '../components/AdminFilterBar.jsx';
import {
  AdminActionStack,
  AdminDetailPanel,
  AdminDetailRow,
  AdminDetailSection,
  AdminSplitLayout,
} from '../components/AdminSplitLayout.jsx';
import { AdminStatusBadge, formatAdminDate, shortenAddress } from '../components/AdminStatusBadge.jsx';
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
  getCardTransactions,
  issueCard,
  rejectCard,
  simulateCardTransaction,
  terminateCard,
  unfreezeCard,
} from '../services/api/adminApiService.js';

const isDevEnv = import.meta.env.DEV || import.meta.env.MODE === 'development' || import.meta.env.MODE === 'dev' || (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname));

const fetchCards = (params) => getCardApplications(params);
const fetchCardDetail = (id) => getCardById(id);

export function CardsPage() {
  const confirm = useAdminConfirm();
  const [selectedId, setSelectedId] = useState(null);
  const list = useAdminList(fetchCards, {}, { urlKeys: ['status'] });
  const { detail, loading: detailLoading, setDetail } = useAdminDetail(fetchCardDetail, selectedId);

  const [txItems, setTxItems] = useState([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txPage, setTxPage] = useState(1);
  const [txLoading, setTxLoading] = useState(false);

  const loadTxs = useCallback(async (page = 1) => {
    if (!selectedId) {
      setTxItems([]);
      setTxTotal(0);
      return;
    }
    setTxLoading(true);
    try {
      const res = await getCardTransactions(detail?.memberId || selectedId, detail?.wasabiCardId, page, 10);
      let records = [];
      let totalCount = 0;
      if (res) {
        if (Array.isArray(res.records)) {
          records = res.records;
          totalCount = res.total ?? res.records.length;
        } else if (Array.isArray(res.data)) {
          records = res.data;
          totalCount = res.total ?? res.data.length;
        } else if (Array.isArray(res)) {
          records = res;
          totalCount = res.length;
        }
      }
      setTxItems(records);
      setTxTotal(totalCount);
      setTxPage(page);
    } catch (err) {
      console.error("Failed to load card transactions", err);
      setTxItems([]);
      setTxTotal(0);
    } finally {
      setTxLoading(false);
    }
  }, [selectedId, detail?.memberId, detail?.wasabiCardId]);

  useEffect(() => {
    setTxPage(1);
    loadTxs(1);
  }, [selectedId, detail?.memberId, detail?.wasabiCardId, loadTxs]);

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
      const inputVal = String(ok).trim();
      if (label.includes('Activate') && !/^\d{6}$/.test(inputVal)) {
        window.alert('PIN 번호는 6자리 숫자여야 합니다.');
        return;
      }
      try {
        const updated = await fn(detail.id, inputVal);
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
                  {
                    key: 'memberName',
                    label: 'Member',
                    render: (r) => {
                      const memberId = r.memberId || r.id;
                      const memberEmail = r.memberEmail || r.email;
                      let displayText = '—';
                      if (memberId && memberEmail && memberEmail !== '—') {
                        displayText = `${memberId} / ${memberEmail}`;
                      } else if (memberId) {
                        displayText = memberId;
                      } else if (memberEmail && memberEmail !== '—') {
                        displayText = memberEmail;
                      }
                      return (
                        <span style={{ fontWeight: '500' }}>{displayText}</span>
                      );
                    },
                  },
                  { 
                    key: 'wasabiCardId', 
                    label: 'Card No', 
                    render: (r) => (
                      <span style={{ fontFamily: 'monospace' }}>
                        {r.wasabiCardId || '—'}
                      </span>
                    ) 
                  },
                  { key: 'last4', label: 'Last 4', render: (r) => r.last4 ? `•••• ${r.last4}` : '—' },
                  { key: 'cardType', label: 'Card Type' },
                  { key: 'status', label: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
                  { 
                    key: 'wallet', 
                    label: 'Wallet', 
                    render: (r) => (
                      r.wallet && r.wallet !== '—' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <img 
                            src="https://cryptologos.cc/logos/tether-usdt-logo.png?v=032" 
                            alt="USDT" 
                            style={{ width: '16px', height: '16px', borderRadius: '50%' }} 
                          />
                          <span style={{ fontFamily: 'monospace' }}>{shortenAddress(r.wallet, 8, 6)}</span>
                        </div>
                      ) : '—'
                    ) 
                  },
                  { key: 'balance', label: 'Balance', render: (r) => r.balance ?? '—' },
                  { key: 'currency', label: 'Currency', render: (r) => r.currency ?? '—' },
                  { key: 'created', label: 'Created', render: (r) => formatAdminDate(r.created) },
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
                  <AdminDetailRow 
                    label="Member" 
                    value={
                      (() => {
                        const memberId = detail.memberId || detail.id;
                        const memberEmail = detail.memberEmail || detail.email;
                        if (memberId && memberEmail && memberEmail !== '—') {
                          return `${memberId} / ${memberEmail}`;
                        }
                        return memberId || memberEmail || '—';
                      })()
                    } 
                  />
                  <AdminDetailRow label="Card No (Wasabi)" value={<span style={{ fontFamily: 'monospace' }}>{detail.wasabiCardId || '—'}</span>} />
                  <AdminDetailRow label="Last 4" value={detail.last4 ? `•••• ${detail.last4}` : '—'} />
                  <AdminDetailRow label="Type" value={detail.cardType} />
                  <AdminDetailRow label="Status" value={<AdminStatusBadge status={detail.status} />} />
                  <AdminDetailRow 
                    label="Wallet" 
                    value={
                      detail.wallet && detail.wallet !== '—' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <img 
                            src="https://cryptologos.cc/logos/tether-usdt-logo.png?v=032" 
                            alt="USDT" 
                            style={{ width: '18px', height: '18px', borderRadius: '50%' }} 
                          />
                          <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{detail.wallet}</span>
                        </div>
                      ) : '—'
                    } 
                  />
                  <AdminDetailRow label="Balance" value={detail.balance ?? '—'} />
                  <AdminDetailRow label="Currency" value={detail.currency ?? '—'} />
                  <AdminDetailRow label="Created" value={formatAdminDate(detail.created)} />
                  <AdminDetailRow label="Tracking No" value={detail.trackingNumber || '—'} />
                  <AdminDetailRow label="Carrier" value={detail.carrier || '—'} />
                  {detail.rejectReason ? (
                    <AdminDetailRow label="Reject reason" value={detail.rejectReason} />
                  ) : null}
                </AdminDetailSection>

                <AdminActionStack>
                  {/* issued/shipping 상태: Activate 버튼 */}
                  {['issued', 'shipping'].includes(detail.status) ? (
                    <button
                      type="button"
                      className="admin-btn admin-btn--primary"
                      onClick={() => runCardAction('Activate Card', activateCard, {
                        showInput: true,
                        inputPlaceholder: 'PIN 번호 6자리 입력 (예: 123456)',
                      })}>
                      Activate
                    </button>
                  ) : (
                    <>
                      {/* pending/applied/application_review: Approve + Reject + Issue */}
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
                      {detail.status === 'frozen' ? (
                        <button type="button" className="admin-btn admin-btn--primary" onClick={() => runCardAction('Unfreeze Card', unfreezeCard)}>
                          Unfreeze
                        </button>
                      ) : null}
                      {detail.status === 'active' ? (
                        <button type="button" className="admin-btn admin-btn--warning" onClick={() => runCardAction('Freeze Card', freezeCard)}>
                          Freeze
                        </button>
                      ) : null}
                      {isDevEnv && (detail.wasabiCardId || ['active', 'normal', 'issued', 'shipping'].includes(detail.status)) ? (
                        <button
                          type="button"
                          className="admin-btn admin-btn--secondary"
                          onClick={() => runCardAction('Simulate Card Transaction', async (id, inputVal) => {
                            const amt = parseFloat(inputVal) || 10.0;
                            await simulateCardTransaction(detail.wasabiCardId || detail.id, { type: 'auth', amount: amt, currency: 'USD', description: 'Admin Test Purchase' });
                            const updated = await getCardById(id);
                            return updated;
                          }, {
                            showInput: true,
                            inputPlaceholder: 'Enter transaction amount (e.g. 10.00)…',
                          })}>
                          🧪 Simulate Tx
                        </button>
                      ) : null}
                      {detail.status !== 'terminated' && detail.status !== 'rejected' && detail.status !== 'issued' && detail.status !== 'shipping' ? (
                        <button
                          type="button"
                          className="admin-btn admin-btn--danger"
                          onClick={() => runCardAction('Terminate Card', terminateCard, { danger: true })}>
                          Terminate
                        </button>
                      ) : null}
                    </>
                  )}
                </AdminActionStack>

                <div style={{ marginTop: '24px' }}>
                  <AdminDetailSection 
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <span>Card Transaction History</span>
                        <button
                          type="button"
                          className="admin-btn admin-btn--secondary"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                          disabled={txLoading}
                          onClick={() => loadTxs(txPage)}>
                          {txLoading ? 'Refreshing…' : '🔄 Refresh'}
                        </button>
                      </div>
                    }>
                    {txLoading && !txItems.length ? (
                      <p className="admin-loading admin-loading--inline">Loading transactions…</p>
                    ) : txItems && txItems.length > 0 ? (
                      <>
                        <div className="admin-detail-table-wrap" style={{ marginTop: '12px' }}>
                          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', border: '1px solid var(--admin-border-subtle)' }}>
                            <thead>
                              <tr style={{ background: 'var(--admin-bg-subtle)', borderBottom: '1px solid var(--admin-border)', textAlign: 'left' }}>
                                <th style={{ padding: '10px 8px', fontWeight: '600' }}>Date</th>
                                <th style={{ padding: '10px 8px', fontWeight: '600' }}>Type</th>
                                <th style={{ padding: '10px 8px', fontWeight: '600' }}>Amount</th>
                                <th style={{ padding: '10px 8px', fontWeight: '600' }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {txItems.map((tx, idx) => (
                                <tr key={tx.id || tx.orderNo || idx} style={{ borderBottom: '1px solid var(--admin-border-subtle)' }}>
                                  <td style={{ padding: '10px 8px', color: 'var(--admin-text)' }}>
                                    {formatAdminDate(tx.transactionTime || tx.created || tx.at)}
                                  </td>
                                  <td style={{ padding: '10px 8px', textTransform: 'capitalize', color: 'var(--admin-text)' }}>
                                    {tx.type || tx.subType || 'Payment'}
                                  </td>
                                  <td style={{ padding: '10px 8px', fontWeight: '500', color: 'var(--admin-text)' }}>
                                    {tx.amount} {tx.currency || 'USD'}
                                  </td>
                                  <td style={{ padding: '10px 8px' }}>
                                    <AdminStatusBadge status={tx.status} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Transactions Pagination */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', fontSize: '12px', color: 'var(--admin-muted)' }}>
                          <span>Page {txPage} of {Math.max(1, Math.ceil(txTotal / 10))} ({txTotal} total)</span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              className="admin-btn admin-btn--secondary"
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                              disabled={txPage <= 1 || txLoading}
                              onClick={() => loadTxs(txPage - 1)}>
                              Prev
                            </button>
                            <button
                              type="button"
                              className="admin-btn admin-btn--secondary"
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                              disabled={txPage >= Math.ceil(txTotal / 10) || txLoading}
                              onClick={() => loadTxs(txPage + 1)}>
                              Next
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p style={{ fontSize: '13px', color: 'var(--admin-muted)', padding: '12px 8px', background: 'var(--admin-bg-subtle)', borderRadius: '6px' }}>
                        No transaction history found for this card.
                      </p>
                    )}
                  </AdminDetailSection>
                </div>
              </>
            ) : null}
          </AdminDetailPanel>
        )}
      />
    </div>
  );
}
