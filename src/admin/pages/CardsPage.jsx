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
  toggleCardDeliveryStatus,
  unfreezeCard,
} from '../services/api/adminApiService.js';

const isDevEnv = import.meta.env.DEV || import.meta.env.MODE === 'development' || import.meta.env.MODE === 'dev' || (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname));

const fetchCards = (params) => getCardApplications(params);
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
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy TXID:', err);
    }
  };

  const shortText = txId.length > 14 ? `${txId.slice(0, 10)}…` : txId;

  return (
    <span
      onClick={handleCopy}
      title={`클릭하여 전체 TXID 복사: ${txId}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        cursor: 'pointer',
        padding: '2px 6px',
        borderRadius: '4px',
        backgroundColor: copied ? '#dcfce7' : '#f8fafc',
        border: copied ? '1px solid #86efac' : '1px solid #e2e8f0',
        transition: 'all 0.15s ease',
        userSelect: 'all',
      }}
    >
      <span style={{ fontFamily: 'monospace', fontSize: '11px', color: copied ? '#15803d' : color, fontWeight: '600' }}>
        {shortText}
      </span>
      <span style={{ fontSize: '10px', color: copied ? '#15803d' : '#94a3b8' }}>
        {copied ? '✓ 복사됨' : '📋'}
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

  const list = useAdminList(fetchCards, {}, { urlKeys: ['status', 'delivered', 'cardType', 'startDate', 'endDate'] });
  const { detail, loading: detailLoading, setDetail } = useAdminDetail(fetchCardDetail, selectedId);

  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleDatePreset = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    const endStr = now.toISOString().slice(0, 10);
    let startStr = '';

    if (preset === 'today') {
      startStr = endStr;
    } else if (preset === '7d') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      startStr = d.toISOString().slice(0, 10);
    } else if (preset === '30d') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      startStr = d.toISOString().slice(0, 10);
    } else {
      startStr = '';
    }

    setStartDate(startStr);
    setEndDate(preset === 'all' ? '' : endStr);
    list.setFilter('startDate', startStr);
    list.setFilter('endDate', preset === 'all' ? '' : endStr);
  };

  const [txItems, setTxItems] = useState([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txPage, setTxPage] = useState(1);
  const [txLoading, setTxLoading] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);

  const [simModalOpen, setSimModalOpen] = useState(false);
  const [simType, setSimType] = useState('auth');
  const [simAmount, setSimAmount] = useState('10.00');
  const [simCurrency, setSimCurrency] = useState('USD');
  const [simMerchantName, setSimMerchantName] = useState('SEODAEMUN-GU OFFICE');
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
        description="Card applications and lifecycle management."
      />

      <AdminSplitLayout
        left={(
          <AdminPanel>
            {/* Date Range Control Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '12px 16px',
              marginBottom: '12px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                  📅 신청일자 조회:
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => handleDatePreset('all')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      borderRadius: '4px',
                      fontWeight: '600',
                      border: datePreset === 'all' ? '1px solid #2563eb' : '1px solid #cbd5e1',
                      backgroundColor: datePreset === 'all' ? '#eff6ff' : '#ffffff',
                      color: datePreset === 'all' ? '#1d4ed8' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    전체
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDatePreset('today')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      borderRadius: '4px',
                      fontWeight: '600',
                      border: datePreset === 'today' ? '1px solid #2563eb' : '1px solid #cbd5e1',
                      backgroundColor: datePreset === 'today' ? '#eff6ff' : '#ffffff',
                      color: datePreset === 'today' ? '#1d4ed8' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    오늘
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDatePreset('7d')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      borderRadius: '4px',
                      fontWeight: '600',
                      border: datePreset === '7d' ? '1px solid #2563eb' : '1px solid #cbd5e1',
                      backgroundColor: datePreset === '7d' ? '#eff6ff' : '#ffffff',
                      color: datePreset === '7d' ? '#1d4ed8' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    최근 7일
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDatePreset('30d')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      borderRadius: '4px',
                      fontWeight: '600',
                      border: datePreset === '30d' ? '1px solid #2563eb' : '1px solid #cbd5e1',
                      backgroundColor: datePreset === '30d' ? '#eff6ff' : '#ffffff',
                      color: datePreset === '30d' ? '#1d4ed8' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    최근 30일
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDatePreset('custom');
                    list.setFilter('startDate', e.target.value);
                  }}
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff'
                  }}
                />
                <span style={{ color: '#94a3b8' }}>~</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDatePreset('custom');
                    list.setFilter('endDate', e.target.value);
                  }}
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff'
                  }}
                />
                {(startDate || endDate) ? (
                  <button
                    type="button"
                    onClick={() => handleDatePreset('all')}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      borderRadius: '4px',
                      border: '1px solid #fca5a5',
                      backgroundColor: '#fef2f2',
                      color: '#dc2626',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    초기화
                  </button>
                ) : null}
              </div>
            </div>

            <AdminFilterBar
              search={list.search}
              onSearchChange={list.setSearch}
              searchPlaceholder="Search member, email or card…"
              filters={[
                {
                  key: 'cardType',
                  label: '카드 종류',
                  value: list.filters.cardType ?? 'all',
                  onChange: (v) => list.setFilter('cardType', v),
                  options: [
                    { value: 'all', label: '전체' },
                    { value: 'physical', label: '실물카드' },
                    { value: 'virtual', label: '가상카드' },
                  ],
                },
                {
                  key: 'delivered',
                  label: '배송 완료 여부',
                  value: list.filters.delivered ?? 'all',
                  onChange: (v) => list.setFilter('delivered', v),
                  options: [
                    { value: 'all', label: '전체' },
                    { value: 'true', label: '배송' },
                    { value: 'false', label: '미배송' },
                  ],
                },
                {
                  key: 'status',
                  label: '상태',
                  value: list.filters.status ?? 'all',
                  onChange: (v) => list.setFilter('status', v),
                  options: [
                    { value: 'all', label: '전체' },
                    { value: 'applied', label: '신청됨 (Applied)' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'approved', label: 'Approved' },
                    { value: 'active', label: 'Active' },
                    { value: 'frozen', label: 'Frozen' },
                    { value: 'rejected', label: 'Rejected' },
                  ],
                },
              ]}
            />
            <AdminTableWrap loading={list.loading} error={list.error} hasData={(list.items || []).length > 0}>
              <AdminDataTable
                columns={[
                  { 
                    key: 'created', 
                    label: '신청일시', 
                    render: (r) => (
                      <span style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                        {formatAdminDate(r.submittedAt || r.createdAt || r.created)}
                      </span>
                    ) 
                  },
                  {
                    key: 'memberEmail',
                    label: 'ID (이메일)',
                    render: (r) => (
                      <span style={{ fontWeight: '500', color: '#2563eb', fontSize: '12px' }}>
                        {r.memberEmail || r.email || r.loginId || '—'}
                      </span>
                    ),
                  },
                  { 
                    key: 'memberName', 
                    label: '성명', 
                    render: (r) => <span style={{ fontWeight: '600', fontSize: '12px' }}>{r.memberName || '—'}</span> 
                  },
                  { 
                    key: 'cardType', 
                    label: '카드종류', 
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
                        {r.cardTypeLabel || (r.cardType === 'physical' ? '실물카드' : '가상카드')}
                      </span>
                    ) 
                  },
                  {
                    key: 'status',
                    label: '카드상태',
                    render: (r) => <AdminStatusBadge status={r.cardStatus || r.status} />
                  },
                  { 
                    key: 'txIdInput', 
                    label: 'TXID->고객입력', 
                    render: (r) => <CopyableTxId txId={r.txIdInput} color="#b45309" />
                  },
                  { 
                    key: 'actualTxId', 
                    label: '실 TXID', 
                    render: (r) => <CopyableTxId txId={r.actualTxId} color="#047857" />
                  },
                  { 
                    key: 'depositAmount', 
                    label: '입금금액', 
                    render: (r) => (
                      <span style={{ fontWeight: '700', color: '#15803d', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {Number(r.depositAmount ?? 0).toFixed(2)} USDT
                      </span>
                    ) 
                  },
                  { 
                    key: 'wasabiCardId', 
                    label: '카드번호', 
                    render: (r) => {
                      const cardStr = r.wasabiCardId && r.wasabiCardId !== '—' ? r.wasabiCardId : (r.last4 && r.last4 !== '—' ? `•••• ${r.last4}` : '—');
                      return (
                        <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: '700', color: '#1e293b' }}>
                          {cardStr}
                        </span>
                      );
                    } 
                  },
                  { 
                    key: 'delivered', 
                    label: '배송', 
                    render: (r) => {
                      const isCompleted = r.delivered || r.cardStatus === 'active' || r.status === 'active';
                      return (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (r.deliveryId) {
                              try {
                                await toggleCardDeliveryStatus(r.deliveryId, !r.delivered);
                                list.reload();
                              } catch (err) {
                                window.alert('배송 상태 업데이트 실패: ' + err.message);
                              }
                            }
                          }}
                          style={{
                            padding: '3px 8px',
                            fontSize: '11px',
                            borderRadius: '4px',
                            border: isCompleted ? '1px solid #86efac' : '1px solid #cbd5e1',
                            backgroundColor: isCompleted ? '#f0fdf4' : '#f8fafc',
                            color: isCompleted ? '#166534' : '#64748b',
                            cursor: r.deliveryId ? 'pointer' : 'default',
                            fontWeight: '600'
                          }}
                        >
                          {isCompleted ? '완료' : '미배송'}
                        </button>
                      );
                    } 
                  },
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

            {/* Sub-table for Shipping Details (배송 정보 상세 표출) matching applycard_list.png */}
            {selectedId && detail?.shippingInfo ? (
              <div style={{
                marginTop: '16px',
                padding: '16px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                    📦 배송 정보 상세 ({detail.memberName})
                  </h4>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    신청일자의 행을 더블클릭/클릭하면 해당 ID의 배송 정보를 확인할 수 있습니다.
                  </span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', color: '#334155', borderRight: '1px solid #e2e8f0', width: '20%' }}>이름</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', color: '#334155', borderRight: '1px solid #e2e8f0', width: '20%' }}>우편번호</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', color: '#334155', borderRight: '1px solid #e2e8f0', width: '40%' }}>주소</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', color: '#334155', width: '20%' }}>전화번호</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '10px 12px', borderRight: '1px solid #e2e8f0', fontWeight: '500' }}>
                        {detail.shippingInfo.recipientName || detail.memberName || '—'}
                      </td>
                      <td style={{ padding: '10px 12px', borderRight: '1px solid #e2e8f0', fontFamily: 'monospace' }}>
                        {detail.shippingInfo.postalCode || '—'}
                      </td>
                      <td style={{ padding: '10px 12px', borderRight: '1px solid #e2e8f0' }}>
                        {`${detail.shippingInfo.address || ''} ${detail.shippingInfo.detailAddress || ''}`.trim() || '—'}
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>
                        {detail.shippingInfo.phoneNumber || '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : null}
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
                  <AdminDetailRow label="TXID (고객입력)" value={<CopyableTxId txId={detail.txIdInput} color="#b45309" />} />
                  <AdminDetailRow label="실 TXID" value={<CopyableTxId txId={detail.actualTxId} color="#047857" />} />
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
                          }}>{'\u20AE'}</span>
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
                        <span style={{ fontWeight: '600' }}>{formatAmountWithCurrency(detail.balance ?? 0, detail.currency || 'USD')}</span>
                      </div>
                    )} 
                  />
                  <AdminDetailRow label="Currency" value={detail.currency ?? '—'} />
                  <AdminDetailRow label="Created" value={formatAdminDate(detail.created)} />
                  <AdminDetailRow label="Tracking No" value={detail.trackingNumber || '—'} />
                  <AdminDetailRow label="Carrier" value={detail.carrier || '—'} />
                  {(detail.rejectReason || detail.failureReason) ? (
                    <div style={{
                      marginTop: '12px',
                      padding: '12px 14px',
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FCA5A5',
                      borderRadius: '8px',
                      color: '#991B1B',
                      fontSize: '13px',
                      lineHeight: '1.4'
                    }}>
                      <div style={{ fontWeight: '700', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>⚠️ 실패 / 거절 상세 사유 (Failure Reason)</span>
                      </div>
                      <div style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                        {detail.rejectReason || detail.failureReason}
                      </div>
                    </div>
                  ) : null}
                </AdminDetailSection>

                {detail.failureHistory && detail.failureHistory.length > 0 && (
                  <AdminDetailSection title={`카드 실패 이력 (Failure History - ${detail.failureHistory.length}건)`}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {detail.failureHistory.map((item, i) => (
                        <div key={i} style={{ padding: '8px 12px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B', marginBottom: '4px' }}>
                            <span style={{ fontWeight: '600', color: '#DC2626' }}>{item.status}</span>
                            <span>{formatAdminDate(item.timestamp)}</span>
                          </div>
                          <div style={{ color: '#334155', wordBreak: 'break-word', fontFamily: 'monospace', fontSize: '11px' }}>{item.reason || '—'}</div>
                        </div>
                      ))}
                    </div>
                  </AdminDetailSection>
                )}

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

                                const sign = (tx.type || tx.subType || '').toLowerCase().includes('refund') ? '+' : '-';
                                const amtVal = tx.amount != null ? Math.abs(Number(tx.amount)) : null;
                                const amtCurr = tx.currency || 'KRW';
                                const amt = amtVal != null ? `${sign}${formatAmountWithCurrency(amtVal, amtCurr)}` : '—';
                                const authAmtVal = tx.authorizedAmount != null ? Math.abs(Number(tx.authorizedAmount)) : null;
                                const authAmt = authAmtVal != null ? `${sign}${formatAmountWithCurrency(authAmtVal, tx.authorizedCurrency || 'USD')}` : '—';
                                const authFee = tx.fee != null ? formatAmountWithCurrency(tx.fee, tx.feeCurrency || 'USD') : (tx.assistFeeInfo?.authorizationFee != null ? formatAmountWithCurrency(tx.assistFeeInfo.authorizationFee, 'USD') : '0.00 USD');
                                const cbFee = tx.crossBoardFee != null ? formatAmountWithCurrency(tx.crossBoardFee, tx.crossBoardFeeCurrency || 'USD') : (tx.assistFeeInfo?.crossBorderFee != null ? formatAmountWithCurrency(tx.assistFeeInfo.crossBorderFee, 'USD') : '0.00 USD');
                                const settleAmtVal = tx.settleAmount != null ? Math.abs(Number(tx.settleAmount)) : null;
                                const settleAmt = settleAmtVal != null ? `${sign}${formatAmountWithCurrency(settleAmtVal, tx.settleCurrency || 'USD')}` : '—';
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
                <span style={{ color: 'var(--admin-muted)', display: 'block', fontSize: '11px' }}>Transaction Amount</span>
                <strong style={{ fontSize: '14px', color: '#3182CE' }}>
                  {selectedTx.amount != null ? formatAmountWithCurrency(selectedTx.amount, selectedTx.currency || 'KRW') : '—'}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--admin-muted)', display: 'block', fontSize: '11px' }}>Authorized Amount</span>
                <strong style={{ fontSize: '14px', color: '#2B6CB0' }}>
                  {selectedTx.authorizedAmount != null ? formatAmountWithCurrency(selectedTx.authorizedAmount, selectedTx.authorizedCurrency || 'USD') : '—'}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--admin-muted)', display: 'block', fontSize: '11px' }}>Authorized Fee</span>
                <strong>
                  {selectedTx.fee != null ? formatAmountWithCurrency(selectedTx.fee, selectedTx.feeCurrency || 'USD') : (selectedTx.assistFeeInfo?.authorizationFee != null ? formatAmountWithCurrency(selectedTx.assistFeeInfo.authorizationFee, 'USD') : '0.00 USD')}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--admin-muted)', display: 'block', fontSize: '11px' }}>Cross Border Fee</span>
                <strong>
                  {selectedTx.crossBoardFee != null ? formatAmountWithCurrency(selectedTx.crossBoardFee, selectedTx.crossBoardFeeCurrency || 'USD') : (selectedTx.assistFeeInfo?.crossBorderFee != null ? formatAmountWithCurrency(selectedTx.assistFeeInfo.crossBorderFee, 'USD') : '0.00 USD')}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--admin-muted)', display: 'block', fontSize: '11px' }}>Settlement Amount</span>
                <strong>
                  {selectedTx.settleAmount != null ? formatAmountWithCurrency(selectedTx.settleAmount, selectedTx.settleCurrency || 'USD') : '—'}
                </strong>
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

              {/* Currency Selector / Input */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '500' }}>
                  Transaction Currency (통화)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    value={simCurrency}
                    onChange={(e) => setSimCurrency(e.target.value)}
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
                    <option value="USD">USD ($)</option>
                    <option value="KRW">KRW (₩)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="JPY">JPY (¥)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '500' }}>
                  Transaction Amount ({simCurrency})
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#38bdf8' }}>
                    {simCurrency === 'KRW' ? '₩' : simCurrency === 'EUR' ? '€' : simCurrency === 'JPY' ? '¥' : simCurrency === 'GBP' ? '£' : '$'}
                  </span>
                  <input
                    type="number"
                    step={simCurrency === 'KRW' || simCurrency === 'JPY' ? '1' : '0.01'}
                    min="0.01"
                    value={simAmount}
                    onChange={(e) => setSimAmount(e.target.value)}
                    disabled={simLoading}
                    placeholder={simCurrency === 'KRW' ? '10000' : '10.00'}
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
                  <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>{simCurrency}</span>
                </div>
              </div>

              {/* Merchant Name (거래처 / 가맹점명) Input */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '500' }}>
                  Merchant Name (거래처 / 가맹점명)
                </label>
                <input
                  type="text"
                  value={simMerchantName}
                  onChange={(e) => setSimMerchantName(e.target.value)}
                  disabled={simLoading}
                  placeholder="e.g. SEODAEMUN-GU OFFICE, STARBUCKS"
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
                    const merchantNameVal = simMerchantName || 'Simulated Merchant';
                    await simulateCardTransaction(cardNo, {
                      type: simType,
                      amount: parseFloat(simAmount) || 10.0,
                      currency: simCurrency || 'USD',
                      merchantName: merchantNameVal,
                      merchantData: { name: merchantNameVal, country: 'KR', city: 'SEOUL' },
                      description: simDescription || 'Admin Simulated Transaction',
                    });
                    setSimModalOpen(false);
                    window.alert(`Simulated transaction (${simType}, ${simAmount} ${simCurrency}, Merchant: ${merchantNameVal}) triggered successfully!`);
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
