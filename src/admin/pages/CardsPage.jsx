import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminDataTable } from '../components/AdminDataTable.jsx';
import { AdminFilterBar, AdminPageHeader, AdminPanel, AdminTableWrap } from '../components/AdminFilterBar.jsx';
import {
  AdminActionStack,
  AdminDetailPanel,
  AdminDetailRow,
  AdminDetailSection,
  AdminSplitLayout,
} from '../components/AdminSplitLayout.jsx';
import { AdminStatusBadge, formatAdminDate, formatAmountWithCurrency, formatUsdt, shortenAddress } from '../components/AdminStatusBadge.jsx';
import { runConfirm, useAdminConfirm } from '../components/AdminConfirmModal.jsx';
import { useAdminList } from '../hooks/useAdminList.js';
import { useAdminDetail } from '../hooks/useAdminDetail.js';
import {
  getCardApplications,
  getCardById,
  getCardTransactions,
} from '../services/api/adminApiService.js';


const fetchRegisteredCards = (params) => getCardApplications({ ...params, onlyRegistered: true });
const fetchCardDetail = (id) => getCardById(id);

function CopyableTxId({ txId, color = '#b45309' }) {
  const [copied, setCopied] = useState(false);

  if (!txId || txId === '—' || txId === '-') return <span>—</span>;

  const handleCopy = (e) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txId);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = txId;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy TXID:', err);
    }
  };

  const shortText = shortenAddress(txId, 6, 6);

  return (
    <span
      onClick={handleCopy}
      title={`Click to copy full TXID: ${txId}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        cursor: 'pointer',
        padding: '2px 6px',
        borderRadius: '4px',
        backgroundColor: copied ? '#dcfce7' : '#fef3c7',
        border: `1px solid ${copied ? '#86efac' : '#fde68a'}`,
        transition: 'all 0.15s ease',
        userSelect: 'none',
      }}
    >
      <span style={{ fontFamily: 'monospace', fontSize: '11px', color: copied ? '#15803d' : color, fontWeight: '600' }}>
        {shortText}
      </span>
      <span style={{ fontSize: '10px', color: copied ? '#15803d' : '#94a3b8' }}>
        {copied ? '✓ Copied' : '📋'}
      </span>
    </span>
  );
}

export function CardsPage() {
  const confirm = useAdminConfirm();
  const [searchParams] = useSearchParams();
  const urlCardId = searchParams.get('id') || searchParams.get('cardId');
  const [selectedId, setSelectedId] = useState(() => urlCardId || null);

  useEffect(() => {
    if (urlCardId && urlCardId !== selectedId) {
      setSelectedId(urlCardId);
    }
  }, [urlCardId]);

  const list = useAdminList(fetchRegisteredCards, { onlyRegistered: true });
  const { detail, loading: detailLoading, setDetail } = useAdminDetail(fetchCardDetail, selectedId);

  const [txPage, setTxPage] = useState(1);
  const [txs, setTxs] = useState({ items: [], total: 0, totalPages: 1 });
  const [txLoading, setTxLoading] = useState(false);

  const [depositPage, setDepositPage] = useState(1);
  const [txSectionPage, setTxSectionPage] = useState(1);

  const [selectedAuthTx, setSelectedAuthTx] = useState(null);


  const loadTxs = useCallback(async (p = 1) => {
    if (!selectedId) return;
    setTxLoading(true);
    try {
      const wasabiCardId = detail?.wasabiCardId || selectedId;
      const res = await getCardTransactions(detail?.memberId || selectedId, wasabiCardId, p, 10);
      setTxs(res);
    } catch (err) {
      console.error('[CardsPage] Failed to fetch card transactions', err);
    } finally {
      setTxLoading(false);
    }
  }, [selectedId, detail?.memberId, detail?.wasabiCardId]);

  useEffect(() => {
    setTxPage(1);
    setDepositPage(1);
    setTxSectionPage(1);
    loadTxs(1);
  }, [selectedId, detail?.memberId, detail?.wasabiCardId, loadTxs]);

  const items = list.items || [];
  const activeCount = items.filter(c => c.cardStatus === 'active' || c.status === 'active').length;
  const frozenCount = items.filter(c => c.cardStatus === 'frozen' || c.status === 'frozen').length;
  const virtualCount = items.filter(c => c.cardType === 'virtual').length;
  const physicalCount = items.filter(c => c.cardType === 'physical').length;

  let detailLast4 = detail?.last4 && detail?.last4 !== '—' && detail?.last4 !== '-' ? detail.last4 : '';
  if (!detailLast4 && detail?.wasabiCardId && detail?.wasabiCardId !== '—' && detail.wasabiCardId.length >= 4) {
    detailLast4 = detail.wasabiCardId.slice(-4);
  }
  if (!detailLast4 && detail?.id && String(detail.id).length >= 4) {
    detailLast4 = String(detail.id).slice(-4);
  }

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Cards"
        description="Management for issued card lifecycle including freeze/unfreeze, activation, PIN setting, and transaction history."
        onRefresh={() => {
          list.reload();
          if (selectedId) loadTxs(txPage);
        }}
        refreshing={list.loading}
      />

      {/* Cards KPI Summary (1-row responsive) */}
      <div className="cards-kpi-grid">
        <div className="cards-kpi-card cards-kpi-card--active">
          <span className="cards-kpi-label">💳 Active</span>
          <div className="cards-kpi-value">{activeCount}</div>
        </div>
        <div className="cards-kpi-card cards-kpi-card--virtual">
          <span className="cards-kpi-label">📱 Virtual</span>
          <div className="cards-kpi-value">{virtualCount}</div>
        </div>
        <div className="cards-kpi-card cards-kpi-card--physical">
          <span className="cards-kpi-label">📦 Physical</span>
          <div className="cards-kpi-value">{physicalCount}</div>
        </div>
        <div className="cards-kpi-card cards-kpi-card--frozen">
          <span className="cards-kpi-label">❄️ Frozen</span>
          <div className="cards-kpi-value">{frozenCount}</div>
        </div>
      </div>

      <AdminSplitLayout
        left={(
          <AdminPanel>
            <AdminFilterBar
              search={list.search}
              onSearchChange={list.setSearch}
              searchPlaceholder="Search Holder ID, Card Number, Email, Name..."
              filters={[
                {
                  key: 'cardType',
                  label: 'Card Type',
                  value: list.filters.cardType ?? 'all',
                  onChange: (v) => list.setFilter('cardType', v),
                  options: [
                    { value: 'all', label: 'All' },
                    { value: 'physical', label: 'Physical Card' },
                    { value: 'virtual', label: 'Virtual Card' },
                  ],
                },
                {
                  key: 'status',
                  label: 'Card Status',
                  value: list.filters.status ?? 'all',
                  onChange: (v) => list.setFilter('status', v),
                  options: [
                    { value: 'all', label: 'All' },
                    { value: 'active', label: 'Active' },
                    { value: 'frozen', label: 'Frozen' },
                    { value: 'issued', label: 'Issued' },
                  ],
                },
              ]}
            />
            <AdminTableWrap loading={list.loading} error={list.error} hasData={(list.items || []).length > 0}>
              <AdminDataTable
                columns={[
                  { 
                    key: 'last4', 
                    label: 'Card Last 4 Digits', 
                    render: (r) => {
                      let last4Str = r.last4 && r.last4 !== '—' && r.last4 !== '-' ? r.last4 : '';
                      if (!last4Str && r.wasabiCardId && r.wasabiCardId !== '—' && r.wasabiCardId.length >= 4) {
                        last4Str = r.wasabiCardId.slice(-4);
                      }
                      return (
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: '12px',
                          fontWeight: '700',
                          color: last4Str ? '#0f172a' : '#94a3b8',
                          backgroundColor: last4Str ? '#f1f5f9' : 'transparent',
                          padding: last4Str ? '2px 6px' : '0',
                          borderRadius: '4px',
                          border: last4Str ? '1px solid #cbd5e1' : 'none',
                          whiteSpace: 'nowrap'
                        }}>
                          {last4Str ? last4Str : '—'}
                        </span>
                      );
                    } 
                  },
                  { 
                    key: 'wasabiCardId', 
                    label: 'Card Number', 
                    render: (r) => {
                      const cardStr = r.wasabiCardId && r.wasabiCardId !== '—' ? r.wasabiCardId : '—';
                      return (
                        <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: '700', color: '#1e293b' }}>
                          {cardStr}
                        </span>
                      );
                    } 
                  },
                  {
                    key: 'memberEmail',
                    label: 'ID (Email)',
                    render: (r) => (
                      <span style={{ fontWeight: '500', color: '#2563eb', fontSize: '12px' }}>
                        {r.memberEmail || r.email || r.loginId || '—'}
                      </span>
                    ),
                  },
                  { 
                    key: 'memberName', 
                    label: 'Name', 
                    render: (r) => <span style={{ fontWeight: '600', fontSize: '12px' }}>{r.memberName || '—'}</span> 
                  },
                  { 
                    key: 'cardType', 
                    label: 'Card Type', 
                    render: (r) => (
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        backgroundColor: r.cardType === 'physical' ? '#eff6ff' : '#f3f4f6',
                        color: r.cardType === 'physical' ? '#1d4ed8' : '#4b5563',
                        border: r.cardType === 'physical' ? '1px solid #bfdbfe' : '1px solid #e5e7eb'
                      }}>
                        {r.cardTypeLabel || (r.cardType === 'physical' ? 'Physical Card' : 'Virtual Card')}
                      </span>
                    ) 
                  },
                  {
                    key: 'status',
                    label: 'Card Status',
                    render: (r) => <AdminStatusBadge status={r.cardStatus || r.status} />
                  },
                  { 
                    key: 'wasabiHolderId', 
                    label: 'Holder ID', 
                    render: (r) => (
                      <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#0f172a', fontWeight: '700' }}>
                        {r.wasabiHolderId || '—'}
                      </span>
                    ) 
                  },
                  { 
                    key: 'cregisWalletAddress', 
                    label: 'Cregis Wallet Address', 
                    render: (r) => <CopyableTxId txId={r.cregisWalletAddress && r.cregisWalletAddress !== '-' ? r.cregisWalletAddress : r.wallet} color="#2563eb" />
                  },
                  { 
                    key: 'cregisActualBalance', 
                    label: 'Wallet Balance (Avail / Actual)', 
                    render: (r) => {
                      const avail = Number(r.walletBalance ?? r.balance ?? 0).toFixed(2);
                      const actual = Number(r.cregisActualBalance ?? r.actualBalance ?? r.walletBalance ?? 0).toFixed(2);
                      return (
                        <div style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: '800', color: '#047857' }}>{avail} USDT</span>
                          <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '4px' }}>
                            ({actual})
                          </span>
                        </div>
                      );
                    } 
                  },
                  { 
                    key: 'created', 
                    label: 'Registration Date', 
                    render: (r) => (
                      <span style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                        {formatAdminDate(r.createdAt || r.created)}
                      </span>
                    ) 
                  }
                ]}
                rows={list.items || []}
                selectedId={selectedId}
                onSelectRow={(row) => setSelectedId(row.id)}
                pagination={{
                  page: list.page,
                  pageSize: list.pageSize,
                  total: list.total,
                  totalPages: list.totalPages,
                  onPageChange: list.setPage,
                  onPageSizeChange: list.setPageSize,
                }}
                renderMobileCard={(r) => {
                  let last4Str = r.last4 && r.last4 !== '—' && r.last4 !== '-' ? r.last4 : '';
                  if (!last4Str && r.wasabiCardId && r.wasabiCardId !== '—' && r.wasabiCardId.length >= 4) {
                    last4Str = r.wasabiCardId.slice(-4);
                  }
                  return (
                    <>
                      <div className="admin-mobile-card__row1">
                        <div className="admin-mobile-card__left">
                          <span
                            className="admin-mobile-card__title"
                            style={{
                              fontFamily: 'monospace',
                              backgroundColor: last4Str ? '#f1f5f9' : 'transparent',
                              padding: last4Str ? '1px 5px' : '0',
                              borderRadius: '3px',
                              border: last4Str ? '1px solid #cbd5e1' : 'none',
                              fontSize: '12px',
                            }}
                          >
                            {last4Str ? `•••• ${last4Str}` : (r.wasabiCardId || 'Card')}
                          </span>
                          <span
                            style={{
                              padding: '1px 5px',
                              borderRadius: '3px',
                              fontSize: '10px',
                              fontWeight: '700',
                              backgroundColor: r.cardType === 'physical' ? '#eff6ff' : '#f3f4f6',
                              color: r.cardType === 'physical' ? '#1d4ed8' : '#4b5563',
                              border: r.cardType === 'physical' ? '1px solid #bfdbfe' : '1px solid #e5e7eb',
                              lineHeight: 1.2,
                            }}
                          >
                            {r.cardType === 'physical' ? 'Physical' : 'Virtual'}
                          </span>
                          <AdminStatusBadge status={r.cardStatus || r.status} />
                        </div>
                        {r.balance != null && (
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '11px', color: '#059669', flexShrink: 0 }}>
                            {formatUsdt(r.balance)}
                          </span>
                        )}
                      </div>
                      <div className="admin-mobile-card__row2">
                        <span className="admin-mobile-card__detail" title={r.memberEmail || r.memberName || ''}>
                          {r.memberName || r.memberEmail || '—'}
                        </span>
                        {r.memberEmail && r.memberName && (
                          <>
                            <span style={{ color: '#cbd5e1' }}>•</span>
                            <span className="admin-mobile-card__meta" style={{ color: '#64748b' }}>
                              {r.memberEmail}
                            </span>
                          </>
                        )}
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <span className="admin-mobile-card__date">
                          {formatAdminDate(r.createdAt || r.created)}
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
          <AdminDetailPanel
            title="Registered Card Detail Management"
            loading={detailLoading}
            hasData={Boolean(detail)}
            emptyText="Please select a card from the list."
            onClose={() => {
              setSelectedId(null);
              setDetail(null);
            }}
          >
            {detail && (
              <>
                <AdminDetailSection title="Card Basic Info">
                  <AdminDetailRow label="Card Number" value={detail.wasabiCardId || detail.id} copyable />
                  <AdminDetailRow 
                    label="Card Last 4 Digits" 
                    value={
                      detailLast4 ? (
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: '12px',
                          fontWeight: '700',
                          color: '#0f172a',
                          backgroundColor: '#f1f5f9',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          display: 'inline-block',
                        }}>
                          {detailLast4}
                        </span>
                      ) : '—'
                    } 
                    copyable={Boolean(detailLast4 && detailLast4 !== '—')} 
                  />
                  <AdminDetailRow label="Holder ID" value={detail.wasabiHolderId || '—'} copyable />
                  <AdminDetailRow label="Member ID" value={detail.memberId || detail.userId || '—'} copyable />
                  <AdminDetailRow label="Email" value={detail.memberEmail || detail.email || '—'} copyable />
                  <AdminDetailRow label="Card Type" value={detail.cardType || 'Physical'} />
                  <AdminDetailRow 
                    label="Status" 
                    value={<AdminStatusBadge status={detail.cardStatus || detail.status} />} 
                  />
                </AdminDetailSection>

                {/* Single-line Compact Card & Wallet Balances Section */}
                <AdminDetailSection title="💰 Card & Wallet Balances">
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '8px 12px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#16a34a', fontWeight: '600' }}>💳 Card Balance:</span>
                      <span style={{ fontWeight: '800', color: '#15803d' }}>
                        ${Number(detail.cardBalance ?? detail.balance ?? 0).toFixed(2)} USD
                      </span>
                    </div>
                    <div style={{ width: '1px', height: '14px', backgroundColor: '#cbd5e1' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#2563eb', fontWeight: '600' }}>🔗 Wallet Balance:</span>
                      <span style={{ fontWeight: '800', color: '#1d4ed8' }}>
                        {Number(detail.walletBalance ?? detail.balance ?? 0).toFixed(2)} USDT
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        ({Number(detail.cregisActualBalance ?? detail.actualBalance ?? detail.walletBalance ?? 0).toFixed(2)})
                      </span>
                    </div>
                  </div>
                  <div style={{ marginTop: '6px' }}>
                    <AdminDetailRow 
                      label="Cregis Deposit Wallet" 
                      value={<CopyableTxId txId={detail.cregisWalletAddress && detail.cregisWalletAddress !== '-' ? detail.cregisWalletAddress : detail.wallet} color="#2563eb" />} 
                    />
                  </div>
                </AdminDetailSection>

                {/* Card Deposit / Top-Up & Transfer In/Out History Section */}
                <AdminDetailSection title="Card Balance & Transfer History">
                  {(() => {
                    // Also capture any deposit/topup/transfer transactions from txs or cardTransactions
                    const txItems = [...(txs?.items || []), ...(detail.cardTransactions || [])];
                    const cardTransfersFromTx = txItems.filter((t) => {
                      const rawType = String(t.type || t.txType || t.kind || '').toUpperCase();
                      const rawDesc = String(t.description || t.merchantName || t.merchant || '').toLowerCase();
                      return rawType.includes('WITHDRAW') || rawType.includes('TRANSFER') || rawType.includes('CHARGE')
                        || rawType.includes('DEPOSIT') || rawType.includes('TOPUP') || rawType.includes('TOP_UP')
                        || rawDesc.includes('withdrawal') || rawDesc.includes('transfer') || rawDesc.includes('top up') || rawDesc.includes('deposit');
                    });

                    const rawList = [
                      ...(detail.cardDeposits || []),
                      ...(detail.transfers || []),
                      ...(detail.recentDeposits || []),
                      ...(detail.recentTopUps || []),
                      ...cardTransfersFromTx,
                    ];

                    const seenKeys = new Set();
                    const allDeposits = rawList.filter((d) => {
                      const k = d.id || d.referenceId || d.txHash || d.wasabiTxId || d.merchantOrderNo;
                      if (!k) return true;
                      if (seenKeys.has(k)) return false;
                      seenKeys.add(k);
                      return true;
                    });

                    // Sort descending by date
                    allDeposits.sort((a, b) => {
                      const tA = new Date(a.createdAt || a.chainTime || a.date || a.completedAt || 0).getTime();
                      const tB = new Date(b.createdAt || b.chainTime || b.date || b.completedAt || 0).getTime();
                      return tB - tA;
                    });

                    const totalDepositCount = allDeposits.length;
                    const totalDepositPages = Math.max(1, Math.ceil(totalDepositCount / 10));
                    const pagedDeposits = allDeposits.slice((depositPage - 1) * 10, depositPage * 10);

                    if (totalDepositCount === 0) {
                      return (
                        <div style={{ fontSize: '12px', color: '#94a3b8', padding: '8px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                          No deposit or transfer history found.
                        </div>
                      );
                    }

                    return (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {pagedDeposits.map((dep, idx) => {
                            const rawType = String(dep.type || dep.kind || dep.txType || '').toLowerCase();
                            const isOutflow = rawType.includes('out') || rawType.includes('send') || rawType.includes('withdraw');
                            const isTransfer = rawType.includes('transfer') || dep.merchantOrderNo?.startsWith('TRANSFER') || dep.destinationEmail || dep.sourceCardNo;
                            
                            let label = '⚡ Card Top-Up';
                            if (isTransfer) {
                              label = isOutflow ? '📤 Transfer Out' : '📥 Transfer In';
                            } else if (isOutflow) {
                              label = '📤 Withdrawal';
                            } else if (rawType.includes('deposit') || rawType.includes('wallet')) {
                              label = '📥 Deposit';
                            }

                            const sign = isOutflow ? '-' : '+';
                            const numColor = isOutflow ? '#dc2626' : '#16a34a';
                            const numBg = isOutflow ? '#fef2f2' : '#f0fdf4';
                            const numBorder = isOutflow ? '#fecaca' : '#bbf7d0';

                            const txIdent = dep.wasabiTxId || dep.referenceId || dep.txHash || dep.merchantOrderNo || dep.id;
                            const amountVal = Math.abs(Number(dep.transAmount || dep.originalAmount || dep.depositAmount || dep.grossAmount || dep.amount || dep.netAmount || 0));
                            const curr = dep.transCurrency || dep.originalCurrency || dep.currency || dep.authorizedCurrency || dep.coinType || '';

                            return (
                              <div key={txIdent || idx} style={{
                                padding: '8px 10px',
                                backgroundColor: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontSize: '11px',
                                gap: '8px',
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                  <span style={{ fontWeight: '700', color: '#1e293b' }}>
                                    {label}
                                  </span>
                                  {txIdent && (
                                    <CopyableTxId txId={txIdent} color="#64748b" />
                                  )}
                                  <span style={{ color: '#cbd5e1' }}>•</span>
                                  <span style={{ fontSize: '10px', color: '#64748b' }}>
                                    {formatAdminDate(dep.createdAt || dep.chainTime || dep.date || dep.completedAt)}
                                  </span>
                                  {dep.destinationEmail && (
                                    <span style={{ fontSize: '10px', color: '#64748b' }}>
                                      (To: {dep.destinationEmail})
                                    </span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                                  <span style={{
                                    fontWeight: '800',
                                    color: numColor,
                                    backgroundColor: numBg,
                                    border: `1px solid ${numBorder}`,
                                    padding: '2px 8px',
                                    borderRadius: '5px',
                                    fontSize: '11px',
                                    fontFamily: 'monospace',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '2px',
                                  }}>
                                    <span>{sign}</span>
                                    <span>{formatAmountWithCurrency(amountVal, curr)}</span>
                                  </span>
                                  <span style={{
                                    fontSize: '9px',
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                    backgroundColor: (dep.status === 'CONFIRMED' || dep.status === 'SUCCESS' || dep.status === 'COMPLETED' || dep.wasabiTxId) ? '#dcfce7' : '#fef3c7',
                                    color: (dep.status === 'CONFIRMED' || dep.status === 'SUCCESS' || dep.status === 'COMPLETED' || dep.wasabiTxId) ? '#166534' : '#92400e',
                                    fontWeight: '600'
                                  }}>
                                    {(dep.status === 'CONFIRMED' || dep.status === 'SUCCESS' || dep.status === 'COMPLETED' || dep.wasabiTxId) ? '✓ Completed' : '⏳ Pending'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Deposit & Transfer Pagination Controls */}
                        {totalDepositPages > 1 && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: '8px',
                            paddingTop: '6px',
                            borderTop: '1px solid #f1f5f9',
                            fontSize: '11px',
                            color: '#64748b'
                          }}>
                            <button
                              type="button"
                              disabled={depositPage <= 1}
                              onClick={() => setDepositPage(p => Math.max(1, p - 1))}
                              style={{
                                padding: '3px 8px',
                                fontSize: '11px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: depositPage <= 1 ? '#f1f5f9' : '#ffffff',
                                color: depositPage <= 1 ? '#94a3b8' : '#334155',
                                cursor: depositPage <= 1 ? 'not-allowed' : 'pointer'
                              }}
                            >
                              ‹ Prev
                            </button>
                            <span>
                              {depositPage} / {totalDepositPages} Pages (Total {totalDepositCount})
                            </span>
                            <button
                              type="button"
                              disabled={depositPage >= totalDepositPages}
                              onClick={() => setDepositPage(p => Math.min(totalDepositPages, p + 1))}
                              style={{
                                padding: '3px 8px',
                                fontSize: '11px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: depositPage >= totalDepositPages ? '#f1f5f9' : '#ffffff',
                                color: depositPage >= totalDepositPages ? '#94a3b8' : '#334155',
                                cursor: depositPage >= totalDepositPages ? 'not-allowed' : 'pointer'
                              }}
                            >
                              Next ›
                            </button>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </AdminDetailSection>

                {/* Card Transactions & Auth History */}
                <AdminDetailSection title="Authorization Transaction History">
                  {txLoading ? (
                    <div style={{ fontSize: '12px', color: '#64748b', padding: '8px' }}>Loading transaction history...</div>
                  ) : (() => {
                    // 1. Combine lists and deduplicate intelligently
                    const rawCombined = [...(txs?.items || []), ...(detail.cardTransactions || [])];
                    const seenKeys = new Set();
                    const filteredTxs = [];

                    for (const t of rawCombined) {
                      const rawType = String(t.type || t.txType || t.kind || '').toUpperCase();
                      const rawDesc = String(t.description || t.merchantName || t.merchant || '').toLowerCase();
                      if (rawType.includes('WITHDRAW') || rawType.includes('TRANSFER') || rawType.includes('CHARGE')
                          || rawDesc.includes('withdrawal') || rawDesc.includes('transfer') || rawDesc.includes('top up')) {
                        continue;
                      }

                      // Resolve Tx ID from any available identifier
                      const resolvedTxId = t.txId || t.id || t.transId || t.referenceNo || t.orderNo || t.authCode || '';
                      // Resolve date from all possible date fields
                      const resolvedDate = t.at || t.txTime || t.createdDate || t.createdAt || t.transactionDate || t.authDate || t.date || '';
                      const resolvedAmt = Math.abs(Number(t.transAmount ?? t.originalAmount ?? t.amount ?? 0));
                      const resolvedCurr = t.transCurrency || t.originalCurrency || t.currency || t.authorizedCurrency || t.settleCurrency || '';
                      const resolvedMerch = t.merchantName || t.merchant || t.description || '—';

                      // Deduplication key: If txId exists, use it; otherwise deduplicate by date + amount + merchant
                      const dedupeKey = resolvedTxId 
                        ? `ID_${resolvedTxId}` 
                        : `M_${resolvedMerch}_${resolvedAmt}_${resolvedCurr}_${resolvedDate ? resolvedDate.slice(0, 16) : ''}`;

                      if (seenKeys.has(dedupeKey)) continue;
                      seenKeys.add(dedupeKey);

                      filteredTxs.push({
                        ...t,
                        resolvedTxId,
                        resolvedDate,
                        resolvedAmt,
                        resolvedCurr,
                        resolvedMerch,
                      });
                    }

                    // Sort descending by date (records with dates first, then others)
                    filteredTxs.sort((a, b) => {
                      const tA = a.resolvedDate ? new Date(a.resolvedDate).getTime() : 0;
                      const tB = b.resolvedDate ? new Date(b.resolvedDate).getTime() : 0;
                      return tB - tA;
                    });

                    const totalTxCount = filteredTxs.length;
                    const totalTxPages = Math.max(1, Math.ceil(totalTxCount / 10));
                    const pagedTxs = filteredTxs.slice((txSectionPage - 1) * 10, txSectionPage * 10);

                    if (totalTxCount === 0) {
                      return (
                        <div style={{ fontSize: '12px', color: '#94a3b8', padding: '8px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                          No card transaction history found.
                        </div>
                      );
                    }

                    return (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {pagedTxs.map((t, idx) => {
                            const rawType = String(t.type || t.txType || t.kind || '').toLowerCase();
                            const isRefund = rawType.includes('refund') || rawType.includes('reversal') || rawType.includes('deposit') || rawType.includes('topup');
                            const sign = isRefund ? '+' : '-';
                            const numColor = isRefund ? '#16a34a' : '#dc2626';
                            const numBg = isRefund ? '#f0fdf4' : '#fef2f2';
                            const numBorder = isRefund ? '#bbf7d0' : '#fecaca';

                            const rawStatus = String(t.status || t.rawStatus || 'SUCCESS').toUpperCase();
                            const rawDesc = String(t.description || t.merchantName || t.merchant || t.remark || t.reason || t.declineReason || t.errorMsg || '').toUpperCase();
                            const isAuth = rawStatus.includes('AUTH');
                            const isFailed = rawStatus.includes('FAIL') || rawStatus.includes('REJECT') || rawStatus.includes('DECLIN') || rawStatus.includes('BLOCK');
                            const isPinBlocked = isFailed && (rawDesc.includes('PIN') || rawStatus.includes('PIN') || rawDesc.includes('BLOCK') || rawStatus.includes('BLOCK'));
                            const isJustBlocked = isFailed && !isPinBlocked && (rawDesc.includes('BLOCK') || rawStatus.includes('BLOCK') || rawDesc.includes('FROZEN') || detail?.cardStatus === 'frozen' || detail?.status === 'frozen');

                            let statusLabel = '✓ Completed';
                            let statusBg = '#dcfce7';
                            let statusColor = '#166534';
                            let statusBorder = '#bbf7d0';

                            if (isPinBlocked) {
                              statusLabel = '✕ Blocked (PIN Error)';
                              statusBg = '#fee2e2';
                              statusColor = '#991b1b';
                              statusBorder = '#f87171';
                            } else if (isJustBlocked) {
                              statusLabel = '✕ Card Blocked';
                              statusBg = '#fee2e2';
                              statusColor = '#991b1b';
                              statusBorder = '#fca5a5';
                            } else if (isFailed) {
                              statusLabel = '✕ Failed';
                              statusBg = '#fee2e2';
                              statusColor = '#b91c1c';
                              statusBorder = '#fecaca';
                            } else if (isAuth) {
                              statusLabel = '⏳ Authorized';
                              statusBg = '#e0f2fe';
                              statusColor = '#0369a1';
                              statusBorder = '#bae6fd';
                            }

                            return (
                              <div
                                key={t.resolvedTxId || idx}
                                onClick={() => setSelectedAuthTx(t)}
                                role="button"
                                tabIndex={0}
                                title="Click to view transaction details"
                                style={{
                                  padding: '8px 10px',
                                  backgroundColor: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  fontSize: '11px',
                                  gap: '8px',
                                  cursor: 'pointer',
                                  transition: 'background-color 0.15s ease, border-color 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                                  e.currentTarget.style.borderColor = '#cbd5e1';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = '#f8fafc';
                                  e.currentTarget.style.borderColor = '#e2e8f0';
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                  <span style={{ fontWeight: '600', color: '#1e293b', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                    {t.resolvedMerch}
                                  </span>
                                  {t.resolvedTxId && (
                                    <CopyableTxId txId={t.resolvedTxId} color="#64748b" />
                                  )}
                                  <span style={{ color: '#cbd5e1' }}>•</span>
                                  <span style={{ fontSize: '10px', color: t.resolvedDate ? '#64748b' : '#94a3b8' }}>
                                    {t.resolvedDate ? formatAdminDate(t.resolvedDate) : '—'}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                                  <span style={{
                                    fontWeight: '800',
                                    color: numColor,
                                    backgroundColor: numBg,
                                    border: `1px solid ${numBorder}`,
                                    padding: '2px 8px',
                                    borderRadius: '5px',
                                    fontSize: '11px',
                                    fontFamily: 'monospace',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '2px',
                                  }}>
                                    <span>{sign}</span>
                                    <span>{formatAmountWithCurrency(t.resolvedAmt, t.resolvedCurr)}</span>
                                  </span>
                                  <span style={{
                                    fontSize: '9px',
                                    padding: '1px 6px',
                                    borderRadius: '3px',
                                    backgroundColor: statusBg,
                                    color: statusColor,
                                    fontWeight: '700'
                                  }}>
                                    {statusLabel}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Transaction Pagination Controls */}
                        {totalTxPages > 1 && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: '8px',
                            paddingTop: '6px',
                            borderTop: '1px solid #f1f5f9',
                            fontSize: '11px',
                            color: '#64748b'
                          }}>
                            <button
                              type="button"
                              disabled={txSectionPage <= 1}
                              onClick={() => setTxSectionPage(p => Math.max(1, p - 1))}
                              style={{
                                padding: '3px 8px',
                                fontSize: '11px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: txSectionPage <= 1 ? '#f1f5f9' : '#ffffff',
                                color: txSectionPage <= 1 ? '#94a3b8' : '#334155',
                                cursor: txSectionPage <= 1 ? 'not-allowed' : 'pointer'
                              }}
                            >
                              ‹ Prev
                            </button>
                            <span>
                              {txSectionPage} / {totalTxPages} Pages (Total {totalTxCount})
                            </span>
                            <button
                              type="button"
                              disabled={txSectionPage >= totalTxPages}
                              onClick={() => setTxSectionPage(p => Math.min(totalTxPages, p + 1))}
                              style={{
                                padding: '3px 8px',
                                fontSize: '11px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: txSectionPage >= totalTxPages ? '#f1f5f9' : '#ffffff',
                                color: txSectionPage >= totalTxPages ? '#94a3b8' : '#334155',
                                cursor: txSectionPage >= totalTxPages ? 'not-allowed' : 'pointer'
                              }}
                            >
                              Next ›
                            </button>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </AdminDetailSection>

              </>
            )}
          </AdminDetailPanel>
        )}
      />


      {/* Authorization Transaction Detail Modal Popup */}
      {selectedAuthTx && (
        <div className="admin-modal-backdrop" onClick={() => setSelectedAuthTx(null)}>
          <div
            className="admin-modal"
            style={{ maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>💳</span>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>
                  Authorization Transaction Detail
                </h3>
              </div>
              <button
                type="button"
                className="admin-modal__close"
                onClick={() => setSelectedAuthTx(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
              >
                ×
              </button>
            </div>

            {(() => {
              const t = selectedAuthTx;
              const rawType = String(t.type || t.txType || t.kind || '').toLowerCase();
              const isRefund = rawType.includes('refund') || rawType.includes('reversal') || rawType.includes('deposit') || rawType.includes('topup');
              const sign = isRefund ? '+' : '-';
              const numColor = isRefund ? '#16a34a' : '#dc2626';
              const numBg = isRefund ? '#f0fdf4' : '#fef2f2';
              const numBorder = isRefund ? '#bbf7d0' : '#fecaca';

              const rawStatus = String(t.status || t.rawStatus || 'SUCCESS').toUpperCase();
              const rawDesc = String(t.description || t.merchantName || t.merchant || t.remark || t.reason || t.declineReason || t.errorMsg || '').toUpperCase();
              const isAuth = rawStatus.includes('AUTH');
              const isFailed = rawStatus.includes('FAIL') || rawStatus.includes('REJECT') || rawStatus.includes('DECLIN') || rawStatus.includes('BLOCK');
              const isPinBlocked = isFailed && (rawDesc.includes('PIN') || rawStatus.includes('PIN') || rawDesc.includes('BLOCK') || rawStatus.includes('BLOCK'));
              const isJustBlocked = isFailed && !isPinBlocked && (rawDesc.includes('BLOCK') || rawStatus.includes('BLOCK') || rawDesc.includes('FROZEN') || detail?.cardStatus === 'frozen' || detail?.status === 'frozen');

              let statusLabel = 'Completed';
              let statusBg = '#dcfce7';
              let statusColor = '#166534';
              if (isPinBlocked) {
                statusLabel = 'Blocked (PIN Error)';
                statusBg = '#fee2e2';
                statusColor = '#991b1b';
              } else if (isJustBlocked) {
                statusLabel = 'Card Blocked';
                statusBg = '#fee2e2';
                statusColor = '#991b1b';
              } else if (isFailed) {
                statusLabel = 'Failed / Declined';
                statusBg = '#fee2e2';
                statusColor = '#b91c1c';
              } else if (isAuth) {
                statusLabel = 'Authorized';
                statusBg = '#e0f2fe';
                statusColor = '#0369a1';
              }

              const txId = t.resolvedTxId || t.txId || t.id || t.tradeNo || t.orderNo || '—';
              const authCode = t.authCode || t.authorizationCode || '—';
              const merchant = t.resolvedMerch || t.merchantName || t.merchant || t.description || '—';
              const mcc = t.mcc || t.merchantCategoryCode || '—';
              const dateStr = t.resolvedDate || t.at || t.txTime || t.createdDate || t.createdAt || '';
              const cardMasked = t.cardMasked || (t.last4 ? `VISA **** ${t.last4}` : (detail?.last4 ? `VISA **** ${detail.last4}` : '—'));

              const amountFormatted = formatAmountWithCurrency(t.resolvedAmt ?? t.amount ?? 0, t.resolvedCurr || t.currency);

              const billingAmt = t.billingAmount ?? t.settleAmount;
              const billingCurr = t.billingCurrency ?? t.settleCurrency;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Amount & Status Banner */}
                  <div style={{
                    padding: '14px 16px',
                    borderRadius: '8px',
                    backgroundColor: numBg,
                    border: `1px solid ${numBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: '700', color: '#64748b', letterSpacing: '0.04em' }}>
                        Transaction Amount
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: numColor, fontFamily: 'monospace', marginTop: '2px' }}>
                        {sign}{amountFormatted}
                      </div>
                      {billingAmt != null && Number(billingAmt) > 0 && billingCurr && (billingCurr !== (t.resolvedCurr || t.currency) || Number(billingAmt) !== Number(t.resolvedAmt)) && (
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                          Settlement: {formatAmountWithCurrency(billingAmt, billingCurr)}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                      <span style={{
                        fontSize: '11px',
                        padding: '3px 10px',
                        borderRadius: '20px',
                        backgroundColor: statusBg,
                        color: statusColor,
                        fontWeight: '700',
                      }}>
                        {statusLabel}
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'capitalize' }}>
                        {t.type || t.txType || (isRefund ? 'Refund' : 'Card Purchase')}
                      </span>
                    </div>
                  </div>

                  {/* Prominent Decline / Security Alert Banner */}
                  {isFailed && (
                    <div style={{
                      backgroundColor: '#fef2f2',
                      border: '1px solid #f87171',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      color: '#991b1b'
                    }}>
                      <span style={{ fontSize: '22px', lineHeight: 1 }}>🚫</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '3px' }}>
                          {isPinBlocked
                            ? 'Card Payment Declined & Blocked (PIN Verification Failed)'
                            : isJustBlocked
                              ? 'Card Payment Declined (Card Blocked / Frozen)'
                              : 'Card Payment Declined / Failed'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#b91c1c', lineHeight: 1.4 }}>
                          {t.declineReason || t.remark || t.reason || t.errorMessage || (
                            isPinBlocked
                              ? 'The payment was declined due to multiple incorrect PIN entries. For security protection, the card has been automatically blocked and frozen.'
                              : isJustBlocked
                                ? 'The transaction was declined because the card is currently blocked or frozen.'
                                : 'The transaction could not be processed and was declined by the card network.'
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Detail Key-Value Grid */}
                  <div style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px',
                    fontSize: '12px'
                  }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>Merchant Name</div>
                      <div style={{ fontWeight: '700', color: '#1e293b' }}>{merchant}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>Transaction Date & Time</div>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{dateStr ? formatAdminDate(dateStr) : '—'}</div>
                    </div>
                    {isFailed && (
                      <>
                        <div>
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>Decline Reason</div>
                          <div style={{ fontWeight: '700', color: '#b91c1c' }}>
                            {t.declineReason || (isPinBlocked ? 'Incorrect PIN (Card Blocked)' : isJustBlocked ? 'Card Blocked / Frozen' : 'Declined')}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>Security Impact</div>
                          <div style={{ fontWeight: '700', color: (isPinBlocked || isJustBlocked) ? '#dc2626' : '#64748b' }}>
                            {(isPinBlocked || isJustBlocked) ? '🔒 Card Blocked (Frozen)' : 'None'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>Network Response Code</div>
                          <div style={{ fontWeight: '700', color: '#1e293b', fontFamily: 'monospace' }}>
                            {t.respCode || t.responseCode || (isPinBlocked ? '55 (Incorrect PIN)' : '05 (Declined)')}
                          </div>
                        </div>
                      </>
                    )}
                    <div style={{ gridColumn: 'span 2' }}>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>Transaction ID (Trade No)</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', color: '#1e293b' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '11.5px', wordBreak: 'break-all' }}>{txId}</span>
                        {txId !== '—' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              try {
                                if (navigator.clipboard && navigator.clipboard.writeText) {
                                  navigator.clipboard.writeText(txId);
                                }
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                            title="Copy full Transaction ID"
                            style={{
                              border: '1px solid #cbd5e1',
                              background: '#fff',
                              borderRadius: '4px',
                              padding: '2px 8px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: '#475569',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            📋 Copy
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>Authorization Code</div>
                      <div style={{ fontWeight: '600', color: '#1e293b', fontFamily: 'monospace' }}>{authCode}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>Card Number</div>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{cardMasked}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>Card Last 4 Digits</div>
                      <div style={{ fontWeight: '700', color: '#0f172a', fontFamily: 'monospace' }}>
                        {t.last4 || (cardMasked && cardMasked !== '—' && cardMasked.length >= 4 ? cardMasked.slice(-4) : '—')}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>Merchant Category (MCC)</div>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{mcc}</div>
                    </div>
                    {(t.merchantCity || t.merchantCountry) && (
                      <div style={{ gridColumn: 'span 2' }}>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>Location</div>
                        <div style={{ fontWeight: '600', color: '#1e293b' }}>
                          {[t.merchantCity, t.merchantCountry].filter(Boolean).join(', ')}
                        </div>
                      </div>
                    )}
                    {t.fee != null && Number(t.fee) > 0 && (
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>Fee</div>
                        <div style={{ fontWeight: '600', color: '#d97706' }}>
                          {formatAmountWithCurrency(t.fee, t.feeCurrency || t.resolvedCurr || t.currency)}
                        </div>
                      </div>
                    )}
                    {t.exchangeRate != null && Number(t.exchangeRate) > 0 && (
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>Exchange Rate</div>
                        <div style={{ fontWeight: '600', color: '#1e293b', fontFamily: 'monospace' }}>{t.exchangeRate}</div>
                      </div>
                    )}
                  </div>

                  {/* Raw Data Accordion */}
                  <details style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '11px'
                  }}>
                    <summary style={{ cursor: 'pointer', fontWeight: '600', color: '#64748b', userSelect: 'none' }}>
                      View Raw Payload (JSON)
                    </summary>
                    <pre style={{
                      marginTop: '8px',
                      padding: '8px',
                      backgroundColor: '#f1f5f9',
                      borderRadius: '4px',
                      fontSize: '10.5px',
                      fontFamily: 'monospace',
                      overflowX: 'auto',
                      maxHeight: '180px',
                      color: '#0f172a',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all'
                    }}>
                      {JSON.stringify(t, null, 2)}
                    </pre>
                  </details>

                  {/* Modal Footer */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                    <button
                      type="button"
                      className="admin-btn admin-btn--primary"
                      onClick={() => setSelectedAuthTx(null)}
                      style={{ padding: '8px 20px', fontWeight: '600' }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
