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
import { AdminStatusBadge, formatAdminDate, formatUsdt, shortenAddress } from '../components/AdminStatusBadge.jsx';
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
  const [selectedTx, setSelectedTx] = useState(null);

  const [simModalOpen, setSimModalOpen] = useState(false);
  const [simType, setSimType] = useState('auth');
  const [simAmount, setSimAmount] = useState('10.00');
  const [simDescription, setSimDescription] = useState('Admin Test Transaction');
  const [simLoading, setSimLoading] = useState(false);

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
                    key: 'last4', 
                    label: 'Last 4', 
                    render: (r) => {
                      const l4 = r.last4 || (r.wasabiCardId && r.wasabiCardId.length >= 4 ? r.wasabiCardId.slice(-4) : '—');
                      return (
                        <span style={{ fontWeight: '500' }}>
                          {l4 !== '—' ? `•••• ${l4}` : '—'}
                        </span>
                      );
                    } 
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
                  { key: 'status', label: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
                  { 
                    key: 'wallet', 
                    label: 'Wallet (Actual) / Unpaid Fee', 
                    render: (r) => {
                      const avail = (Number(r.walletBalance ?? r.balance) || 0).toFixed(2);
                      const actual = (Number(r.cregisActualBalance ?? r.actualBalance ?? r.walletBalance ?? r.balance) || 0).toFixed(2);
                      const unpaid = (Number(r.unpaidTotalFee) || 0).toFixed(2);
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', whiteSpace: 'nowrap' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '15px',
                            height: '15px',
                            borderRadius: '50%',
                            backgroundColor: '#26a17b',
                            color: '#fff',
                            fontSize: '9px',
                            fontWeight: 'bold',
                            lineHeight: 1
                          }}>₮</span>
                          <span>{avail}({actual}) / {unpaid}</span>
                        </div>
                      );
                    } 
                  },
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
                    value={(
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            backgroundColor: '#26a17b',
                            color: '#fff',
                            fontSize: '9px',
                            fontWeight: 'bold',
                            lineHeight: 1
                          }}>₮</span>
                          <span style={{ fontWeight: '600' }}>{formatUsdt(detail.walletBalance ?? detail.balance ?? 0)}</span>
                          <span style={{ color: 'var(--admin-text-muted, #888)' }}>
                            ({formatUsdt(detail.cregisActualBalance ?? detail.actualBalance ?? detail.walletBalance ?? detail.balance ?? 0)}) / {formatUsdt(detail.unpaidTotalFee ?? 0)} Unpaid Fee
                          </span>
                        </div>
                        {detail.wallet && detail.wallet !== '—' ? (
                          <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--admin-muted, #888)' }}>
                            Address: {detail.wallet}
                          </span>
                        ) : null}
                      </div>
                    )} 
                  />
                  <AdminDetailRow 
                    label="Balance" 
                    value={(
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                        <img 
                          src="https://cryptologos.cc/logos/tether-usdt-logo.png?v=032" 
                          alt={detail.currency || 'USD'} 
                          style={{ width: '18px', height: '18px', borderRadius: '50%' }} 
                        />
                        <span style={{ fontWeight: '600' }}>{formatUsdt(detail.balance ?? 0)}</span>
                        <span style={{ fontSize: '12px', color: 'var(--admin-muted, #888)' }}>{detail.currency || 'USD'}</span>
                      </div>
                    )} 
                  />
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
                          onClick={() => setSimModalOpen(true)}>
                          🧪 Simulate Tx
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
                        <div className="admin-detail-table-wrap" style={{ marginTop: '12px', overflowX: 'auto' }}>
                          <table style={{ width: '100%', minWidth: '1100px', fontSize: '12px', borderCollapse: 'collapse', border: '1px solid var(--admin-border-subtle)' }}>
                            <thead>
                              <tr style={{ background: 'var(--admin-bg-subtle)', borderBottom: '1px solid var(--admin-border)', textAlign: 'left', whiteSpace: 'nowrap' }}>
                                <th style={{ padding: '8px 6px', fontWeight: '600' }}>Date/Time</th>
                                <th style={{ padding: '8px 6px', fontWeight: '600' }}>Merchant</th>
                                <th style={{ padding: '8px 6px', fontWeight: '600' }}>MCC</th>
                                <th style={{ padding: '8px 6px', fontWeight: '600' }}>Type</th>
                                <th style={{ padding: '8px 6px', fontWeight: '600' }}>Amount</th>
                                <th style={{ padding: '8px 6px', fontWeight: '600' }}>Auth Amount</th>
                                <th style={{ padding: '8px 6px', fontWeight: '600' }}>Auth Fee</th>
                                <th style={{ padding: '8px 6px', fontWeight: '600' }}>Cross Board Fee</th>
                                <th style={{ padding: '8px 6px', fontWeight: '600' }}>Settle Amount</th>
                                <th style={{ padding: '8px 6px', fontWeight: '600' }}>Settle Date</th>
                                <th style={{ padding: '8px 6px', fontWeight: '600' }}>Status</th>
                                <th style={{ padding: '8px 6px', fontWeight: '600', textAlign: 'center' }}>Detail</th>
                              </tr>
                            </thead>
                            <tbody>
                              {txItems.map((tx, idx) => {
                                const merchant = tx.merchantName || tx.merchantData?.name || tx.description || '—';
                                const mcc = tx.merchantData?.categoryCode ? `${tx.merchantData.categoryCode}${tx.merchantData?.category ? ` (${tx.merchantData.category})` : ''}` : (tx.merchantData?.category || '—');
                                const curr = tx.currency ? String(tx.currency).toUpperCase() : 'KRW';
                                const authCurr = tx.authorizedCurrency ? String(tx.authorizedCurrency).toUpperCase() : 'USD';
                                const feeCurr = tx.feeCurrency ? String(tx.feeCurrency).toUpperCase() : 'USD';
                                const cbFeeCurr = tx.crossBoardFeeCurrency ? String(tx.crossBoardFeeCurrency).toUpperCase() : 'USD';
                                const settleCurr = tx.settleCurrency ? String(tx.settleCurrency).toUpperCase() : 'USD';

                                const amt = tx.amount != null ? `${Number(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${curr}` : '—';
                                const authAmt = tx.authorizedAmount != null ? `${Number(tx.authorizedAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${authCurr}` : '—';
                                const authFee = tx.fee != null ? `${Number(tx.fee).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${feeCurr}` : (tx.assistFeeInfo?.authorizationFee != null ? `${Number(tx.assistFeeInfo.authorizationFee).toFixed(2)} USD` : '0.00 USD');
                                const cbFee = tx.crossBoardFee != null ? `${Number(tx.crossBoardFee).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cbFeeCurr}` : (tx.assistFeeInfo?.crossBorderFee != null ? `${Number(tx.assistFeeInfo.crossBorderFee).toFixed(2)} USD` : '0.00 USD');
                                const settleAmt = tx.settleAmount != null ? `${Number(tx.settleAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${settleCurr}` : (tx.authorizedAmount != null ? `${Number(tx.authorizedAmount).toFixed(2)} USD` : '—');
                                const settleDt = tx.settleDate ? formatAdminDate(tx.settleDate) : '—';

                                return (
                                  <tr 
                                    key={tx.tradeNo || tx.id || tx.orderNo || idx} 
                                    style={{ borderBottom: '1px solid var(--admin-border-subtle)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                    onClick={() => setSelectedTx(tx)}>
                                    <td style={{ padding: '8px 6px', color: 'var(--admin-text)' }}>
                                      {formatAdminDate(tx.transactionTime || tx.created || tx.at)}
                                    </td>
                                    <td style={{ padding: '8px 6px', fontWeight: '500', color: 'var(--admin-text)' }}>
                                      {merchant}
                                    </td>
                                    <td style={{ padding: '8px 6px', color: 'var(--admin-muted)' }}>
                                      {mcc}
                                    </td>
                                    <td style={{ padding: '8px 6px', textTransform: 'capitalize', color: 'var(--admin-text)' }}>
                                      {tx.type || tx.subType || 'auth'}
                                    </td>
                                    <td style={{ padding: '8px 6px', fontWeight: '500', color: 'var(--admin-text)' }}>
                                      {amt}
                                    </td>
                                    <td style={{ padding: '8px 6px', color: 'var(--admin-text)' }}>
                                      {authAmt}
                                    </td>
                                    <td style={{ padding: '8px 6px', color: 'var(--admin-muted)' }}>
                                      {authFee}
                                    </td>
                                    <td style={{ padding: '8px 6px', color: 'var(--admin-muted)' }}>
                                      {cbFee}
                                    </td>
                                    <td style={{ padding: '8px 6px', color: 'var(--admin-text)' }}>
                                      {settleAmt}
                                    </td>
                                    <td style={{ padding: '8px 6px', color: 'var(--admin-muted)' }}>
                                      {settleDt}
                                    </td>
                                    <td style={{ padding: '8px 6px' }}>
                                      <AdminStatusBadge status={tx.status} />
                                    </td>
                                    <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                                      <button 
                                        type="button" 
                                        className="admin-btn admin-btn--secondary" 
                                        style={{ padding: '2px 8px', fontSize: '11px' }}
                                        onClick={(e) => { e.stopPropagation(); setSelectedTx(tx); }}>
                                        View
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
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

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedTx(null)}>
          <div style={{ backgroundColor: 'var(--admin-bg-panel, #ffffff)', borderRadius: '12px', border: '1px solid var(--admin-border)', padding: '24px', width: '90%', maxWidth: '640px', maxHeight: '85vh', overflowY: 'auto', color: 'var(--admin-text)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--admin-border)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>💳 Card Transaction Detail</h3>
              <button type="button" className="admin-btn admin-btn--secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => setSelectedTx(null)}>✕ Close</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
              <div>
                <span style={{ color: 'var(--admin-muted)', display: 'block', fontSize: '11px' }}>Transaction ID (Trade No)</span>
                <strong>{selectedTx.tradeNo || selectedTx.orderNo || '—'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--admin-muted)', display: 'block', fontSize: '11px' }}>Origin Trade No</span>
                <strong>{selectedTx.originTradeNo || '—'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--admin-muted)', display: 'block', fontSize: '11px' }}>Wasabi Card No</span>
                <strong>{selectedTx.cardNo || '—'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--admin-muted)', display: 'block', fontSize: '11px' }}>Transaction Time</span>
                <strong>{formatAdminDate(selectedTx.transactionTime || selectedTx.created || selectedTx.at)}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--admin-muted)', display: 'block', fontSize: '11px' }}>Transaction Type</span>
                <strong style={{ textTransform: 'capitalize' }}>{selectedTx.type || 'auth'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--admin-muted)', display: 'block', fontSize: '11px' }}>Status</span>
                <AdminStatusBadge status={selectedTx.status} />
              </div>
              <div>
                <span style={{ color: 'var(--admin-muted)', display: 'block', fontSize: '11px' }}>Merchant Name</span>
                <strong>{selectedTx.merchantName || selectedTx.merchantData?.name || selectedTx.description || '—'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--admin-muted)', display: 'block', fontSize: '11px' }}>MCC (Category Code / Name)</span>
                <strong>{selectedTx.merchantData?.categoryCode ? `${selectedTx.merchantData.categoryCode} (${selectedTx.merchantData?.category || ''})` : (selectedTx.merchantData?.category || '—')}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--admin-muted)', display: 'block', fontSize: '11px' }}>Merchant MID / Wallet</span>
                <strong>{selectedTx.merchantData?.mid || selectedTx.merchantData?.walletType || '—'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--admin-muted)', display: 'block', fontSize: '11px' }}>Merchant Location</span>
                <strong>{[selectedTx.merchantData?.city, selectedTx.merchantData?.state, selectedTx.merchantData?.country].filter(Boolean).join(', ') || '—'}</strong>
              </div>
              <div style={{ gridColumn: 'span 2', height: '1px', background: 'var(--admin-border-subtle)', margin: '4px 0' }} />
              <div>
                <span style={{ color: 'var(--admin-muted)', display: 'block', fontSize: '11px' }}>Local Transaction Amount</span>
                <strong style={{ fontSize: '14px', color: '#3182CE' }}>{selectedTx.amount != null ? `${Number(selectedTx.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${selectedTx.currency || 'KRW'}` : '—'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--admin-muted)', display: 'block', fontSize: '11px' }}>Card Authorized Amount (USD)</span>
                <strong style={{ fontSize: '14px', color: '#2B6CB0' }}>{selectedTx.authorizedAmount != null ? `${Number(selectedTx.authorizedAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${selectedTx.authorizedCurrency || 'USD'}` : '—'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--admin-muted)', display: 'block', fontSize: '11px' }}>Authorized Fee</span>
                <strong>{selectedTx.fee != null ? `${Number(selectedTx.fee).toFixed(2)} ${selectedTx.feeCurrency || 'USD'}` : (selectedTx.assistFeeInfo?.authorizationFee != null ? `${Number(selectedTx.assistFeeInfo.authorizationFee).toFixed(2)} USD` : '0.00 USD')}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--admin-muted)', display: 'block', fontSize: '11px' }}>Cross Border Fee</span>
                <strong>{selectedTx.crossBoardFee != null ? `${Number(selectedTx.crossBoardFee).toFixed(2)} ${selectedTx.crossBoardFeeCurrency || 'USD'}` : (selectedTx.assistFeeInfo?.crossBorderFee != null ? `${Number(selectedTx.assistFeeInfo.crossBorderFee).toFixed(2)} USD` : '0.00 USD')}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--admin-muted)', display: 'block', fontSize: '11px' }}>Settlement Amount</span>
                <strong>{selectedTx.settleAmount != null ? `${Number(selectedTx.settleAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${selectedTx.settleCurrency || 'USD'}` : (selectedTx.authorizedAmount != null ? `${Number(selectedTx.authorizedAmount).toFixed(2)} USD` : '—')}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--admin-muted)', display: 'block', fontSize: '11px' }}>Settlement Date</span>
                <strong>{selectedTx.settleDate ? formatAdminDate(selectedTx.settleDate) : '—'}</strong>
              </div>
            </div>

            {selectedTx.description && (
              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--admin-border-subtle)' }}>
                <span style={{ color: 'var(--admin-muted)', display: 'block', fontSize: '11px', marginBottom: '4px' }}>Description / Remark</span>
                <p style={{ margin: 0, fontSize: '13px', background: 'var(--admin-bg-subtle)', padding: '8px 12px', borderRadius: '6px' }}>{selectedTx.description}</p>
              </div>
            )}

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="admin-btn admin-btn--primary" onClick={() => setSelectedTx(null)}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Simulate Tx Modal */}
      {simModalOpen && (
        <div
          className="admin-modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => !simLoading && setSimModalOpen(false)}
        >
          <div
            className="admin-modal"
            style={{
              backgroundColor: 'var(--admin-bg-surface, #1e293b)',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#fff',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🧪 Simulate Card Transaction
              </h3>
              <button
                type="button"
                onClick={() => setSimModalOpen(false)}
                disabled={simLoading}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Transaction Type Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '500' }}>
                  Transaction Type (모든 Wasabi API 타입)
                </label>
                <select
                  value={simType}
                  onChange={(e) => setSimType(e.target.value)}
                  disabled={simLoading}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#0f172a',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="auth">auth (Payment Authorization / 결제 승인)</option>
                  <option value="refund">refund (Refund / 환불)</option>
                  <option value="Void">Void (Transaction Cancellation / 결제 취소)</option>
                  <option value="maintain_fee">maintain_fee (Card Maintenance Fee / 카드 유지 수수료)</option>
                </select>
              </div>

              {/* Amount Input */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '500' }}>
                  Transaction Amount (USD)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#38bdf8' }}>$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={simAmount}
                    onChange={(e) => setSimAmount(e.target.value)}
                    disabled={simLoading}
                    placeholder="10.00"
                    style={{
                      width: '140px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#0f172a',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#fff',
                      fontSize: '15px',
                      fontWeight: '600',
                      outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>USD</span>
                </div>
              </div>

              {/* Description Input */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '500' }}>
                  Description (비고)
                </label>
                <input
                  type="text"
                  value={simDescription}
                  onChange={(e) => setSimDescription(e.target.value)}
                  disabled={simLoading}
                  placeholder="Admin Test Transaction"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#0f172a',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => setSimModalOpen(false)}
                disabled={simLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                disabled={simLoading || !simAmount || parseFloat(simAmount) <= 0}
                onClick={async () => {
                  setSimLoading(true);
                  try {
                    const cardNo = detail.wasabiCardId || detail.id;
                    await simulateCardTransaction(cardNo, {
                      type: simType,
                      amount: parseFloat(simAmount) || 10.0,
                      currency: 'USD',
                      description: simDescription || 'Admin Simulated Transaction',
                    });
                    setSimModalOpen(false);
                    window.alert(`Simulated transaction (${simType}, $${simAmount}) triggered successfully!`);
                    const updated = await getCardById(selectedId);
                    setDetail(updated);
                    loadTxs(1);
                  } catch (err) {
                    window.alert(err.message || 'Failed to trigger simulated transaction.');
                  } finally {
                    setSimLoading(false);
                  }
                }}
                style={{ backgroundColor: '#3b82f6', color: '#fff', fontWeight: 'bold' }}
              >
                {simLoading ? 'Executing…' : 'Execute Simulate Tx'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
