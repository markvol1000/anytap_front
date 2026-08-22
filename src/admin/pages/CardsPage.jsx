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
import { AdminStatusBadge, formatAdminDate, shortenAddress } from '../components/AdminStatusBadge.jsx';
import { runConfirm, useAdminConfirm } from '../components/AdminConfirmModal.jsx';
import { useAdminList } from '../hooks/useAdminList.js';
import { useAdminDetail } from '../hooks/useAdminDetail.js';
import {
  activateCard,
  freezeCard,
  getCardApplications,
  getCardById,
  getCardTransactions,
  rejectCard,
  simulateCardTransaction,
  terminateCard,
  unfreezeCard,
} from '../services/api/adminApiService.js';

const isDevEnv = import.meta.env.DEV || import.meta.env.MODE === 'development' || import.meta.env.MODE === 'dev' || (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname));

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
      title={`클릭하여 전체 TXID 복사: ${txId}`}
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

  const list = useAdminList(fetchRegisteredCards, { onlyRegistered: true });
  const { detail, loading: detailLoading, setDetail } = useAdminDetail(fetchCardDetail, selectedId);

  const [txPage, setTxPage] = useState(1);
  const [txs, setTxs] = useState({ items: [], total: 0, totalPages: 1 });
  const [txLoading, setTxLoading] = useState(false);

  const [depositPage, setDepositPage] = useState(1);
  const [txSectionPage, setTxSectionPage] = useState(1);

  const [simAmount, setSimAmount] = useState('10.00');
  const [simMerchant, setSimMerchant] = useState('Starbucks Coffee');
  const [simDescription, setSimDescription] = useState('Admin Test Transaction');
  const [simLoading, setSimLoading] = useState(false);

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

  const items = list.items || [];
  const activeCount = items.filter(c => c.cardStatus === 'active' || c.status === 'active').length;
  const frozenCount = items.filter(c => c.cardStatus === 'frozen' || c.status === 'frozen').length;
  const virtualCount = items.filter(c => c.cardType === 'virtual').length;
  const physicalCount = items.filter(c => c.cardType === 'physical').length;

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Cards"
        description="실제 발급 및 승인 처리된 카드 라이프사이클(동결/해제, 승인, PIN 설정 및 결제이력) 전용 관리"
      />

      {/* Cards KPI Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '16px'
      }}>
        <div style={{ padding: '16px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
          <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '600' }}>💳 활성 카드 (Active)</span>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#15803d', marginTop: '4px' }}>{activeCount}개</div>
        </div>
        <div style={{ padding: '16px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
          <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: '600' }}>📱 가상 카드 (Virtual)</span>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#1d4ed8', marginTop: '4px' }}>{virtualCount}개</div>
        </div>
        <div style={{ padding: '16px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
          <span style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>📦 실물 카드 (Physical)</span>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b', marginTop: '4px' }}>{physicalCount}개</div>
        </div>
        <div style={{ padding: '16px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
          <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: '600' }}>❄️ 일시정지 (Frozen)</span>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#b91c1c', marginTop: '4px' }}>{frozenCount}개</div>
        </div>
      </div>

      <AdminSplitLayout
        left={(
          <AdminPanel>
            <AdminFilterBar
              search={list.search}
              onSearchChange={list.setSearch}
              searchPlaceholder="Holder ID, 카드번호, 회원 이메일, 성명 검색…"
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
                  key: 'status',
                  label: '카드 상태',
                  value: list.filters.status ?? 'all',
                  onChange: (v) => list.setFilter('status', v),
                  options: [
                    { value: 'all', label: '전체' },
                    { value: 'active', label: 'Active (활성)' },
                    { value: 'frozen', label: 'Frozen (동결)' },
                    { value: 'issued', label: 'Issued (발급완료)' },
                  ],
                },
              ]}
            />
            <AdminTableWrap loading={list.loading} error={list.error} hasData={(list.items || []).length > 0}>
              <AdminDataTable
                columns={[
                  { 
                    key: 'last4', 
                    label: '카드 4자리', 
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
                    label: '카드번호', 
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
                    label: 'Cregis 지갑주소', 
                    render: (r) => <CopyableTxId txId={r.cregisWalletAddress && r.cregisWalletAddress !== '-' ? r.cregisWalletAddress : r.wallet} color="#2563eb" />
                  },
                  { 
                    key: 'cregisActualBalance', 
                    label: '지갑 잔액', 
                    render: (r) => (
                      <span style={{ fontWeight: '700', color: '#047857', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {Number(r.cregisActualBalance ?? r.walletBalance ?? 0).toFixed(2)} USDT
                      </span>
                    ) 
                  },
                  { 
                    key: 'created', 
                    label: '등록일시', 
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
              />
            </AdminTableWrap>
          </AdminPanel>
        )}
        right={(
          <AdminDetailPanel
            title="등록 카드 상세 관리"
            loading={detailLoading}
            hasData={Boolean(detail)}
            emptyText="목록에서 카드를 선택해 주세요."
          >
            {detail && (
              <>
                <AdminDetailSection title="카드 기본 정보">
                  <AdminDetailRow label="카드번호" value={detail.wasabiCardId || detail.id} copyable />
                  <AdminDetailRow label="와사비 Holder ID" value={detail.wasabiHolderId || '—'} copyable />
                  <AdminDetailRow label="회원 ID" value={detail.memberId || detail.userId || '—'} copyable />
                  <AdminDetailRow label="이메일" value={detail.memberEmail || detail.email || '—'} copyable />
                  <AdminDetailRow label="카드종류" value={detail.cardTypeLabel || (detail.cardType === 'physical' ? '실물카드' : '가상카드')} />
                  <AdminDetailRow label="카드상태" value={<AdminStatusBadge status={detail.cardStatus || detail.status} />} />
                </AdminDetailSection>

                {/* Single-line Compact Card & Wallet Balances Section */}
                <AdminDetailSection title="💰 카드 및 지갑 잔액 현황">
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
                      <span style={{ color: '#16a34a', fontWeight: '600' }}>💳 카드 잔액:</span>
                      <span style={{ fontWeight: '800', color: '#15803d' }}>
                        ${Number(detail.cardBalance ?? detail.balance ?? 0).toFixed(2)} USD
                      </span>
                    </div>
                    <div style={{ width: '1px', height: '14px', backgroundColor: '#cbd5e1' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#2563eb', fontWeight: '600' }}>🔗 지갑 잔액:</span>
                      <span style={{ fontWeight: '800', color: '#1d4ed8' }}>
                        {Number(detail.cregisActualBalance ?? detail.walletBalance ?? 0).toFixed(2)} USDT
                      </span>
                    </div>
                  </div>
                  <div style={{ marginTop: '6px' }}>
                    <AdminDetailRow 
                      label="Cregis 입금 지갑" 
                      value={<CopyableTxId txId={detail.cregisWalletAddress && detail.cregisWalletAddress !== '-' ? detail.cregisWalletAddress : detail.wallet} color="#2563eb" />} 
                    />
                  </div>
                </AdminDetailSection>

                {/* Card Deposit / Recharge History Section */}
                <AdminDetailSection title="🔋 카드 충전/예치금 입금 내역">
                  {(() => {
                    const allDeposits = [...(detail.cardDeposits || []), ...(detail.recentDeposits || [])];
                    const totalDepositCount = allDeposits.length;
                    const totalDepositPages = Math.max(1, Math.ceil(totalDepositCount / 10));
                    const pagedDeposits = allDeposits.slice((depositPage - 1) * 10, depositPage * 10);

                    if (totalDepositCount === 0) {
                      return (
                        <div style={{ fontSize: '12px', color: '#94a3b8', padding: '8px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                          카드 충전(예치금) 내역이 없습니다.
                        </div>
                      );
                    }

                    return (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          {pagedDeposits.map((dep, idx) => (
                            <div key={dep.referenceId || dep.txHash || idx} style={{
                              padding: '6px 10px',
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
                                <span style={{ fontWeight: '600', color: '#1e293b' }}>⚡ 카드 충전</span>
                                <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>
                                  ({dep.wasabiTxId ? shortenAddress(dep.wasabiTxId, 4, 4) : (dep.referenceId ? shortenAddress(dep.referenceId, 4, 4) : 'Direct')})
                                </span>
                                <span style={{ color: '#cbd5e1' }}>•</span>
                                <span style={{ fontSize: '10px', color: '#64748b' }}>
                                  {formatAdminDate(dep.createdAt || dep.chainTime || dep.date)}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                                <span style={{ fontWeight: '700', color: '#059669' }}>
                                  +{Number(dep.depositAmount || dep.amount || 0).toFixed(2)} USDT
                                </span>
                                <span style={{
                                  fontSize: '9px',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  backgroundColor: (dep.status === 'CONFIRMED' || dep.wasabiTxId) ? '#dcfce7' : '#fef3c7',
                                  color: (dep.status === 'CONFIRMED' || dep.wasabiTxId) ? '#166534' : '#92400e',
                                  fontWeight: '600'
                                }}>
                                  {(dep.status === 'CONFIRMED' || dep.wasabiTxId) ? '✓ 충전완료' : '⏳ 대기중'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Deposit Pagination Controls */}
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
                              ‹ 이전
                            </button>
                            <span>
                              {depositPage} / {totalDepositPages} 페이지 (총 {totalDepositCount}건)
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
                              다음 ›
                            </button>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </AdminDetailSection>

                {/* Card Transactions & Auth History */}
                <AdminDetailSection title="🛒 카드 최근 결제/승인 거래 내역">
                  {txLoading ? (
                    <div style={{ fontSize: '12px', color: '#64748b', padding: '8px' }}>결제 내역 불러오는 중…</div>
                  ) : (() => {
                    const allTxs = [...(txs?.items || []), ...(detail.cardTransactions || [])];
                    const totalTxCount = allTxs.length;
                    const totalTxPages = Math.max(1, Math.ceil(totalTxCount / 10));
                    const pagedTxs = allTxs.slice((txSectionPage - 1) * 10, txSectionPage * 10);

                    if (totalTxCount === 0) {
                      return (
                        <div style={{ fontSize: '12px', color: '#94a3b8', padding: '8px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                          카드 승인/결제 거래 내역이 없습니다.
                        </div>
                      );
                    }

                    return (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          {pagedTxs.map((t, idx) => (
                            <div key={t.id || t.txId || idx} style={{
                              padding: '6px 10px',
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
                                <span style={{ fontWeight: '600', color: '#1e293b', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                  {t.merchantName || t.merchant || t.description || '가맹점 결제'}
                                </span>
                                <span style={{ color: '#cbd5e1' }}>•</span>
                                <span style={{ fontSize: '10px', color: '#64748b' }}>
                                  {formatAdminDate(t.at || t.createdDate || t.txTime)}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                                <span style={{ fontWeight: '700', color: '#047857' }}>
                                  ${Number(t.amount || t.transAmount || 0).toFixed(2)}
                                </span>
                                <span style={{
                                  fontSize: '9px',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  backgroundColor: (t.status === 'SUCCESS' || t.status === 'APPROVED' || !t.status) ? '#e0f2fe' : '#fee2e2',
                                  color: (t.status === 'SUCCESS' || t.status === 'APPROVED' || !t.status) ? '#0369a1' : '#b91c1c',
                                  fontWeight: '600'
                                }}>
                                  {t.status || 'SUCCESS'}
                                </span>
                              </div>
                            </div>
                          ))}
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
                              ‹ 이전
                            </button>
                            <span>
                              {txSectionPage} / {totalTxPages} 페이지 (총 {totalTxCount}건)
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
                              다음 ›
                            </button>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </AdminDetailSection>

                <AdminDetailSection title="카드 조작 (Quick Actions)">
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {(detail.cardStatus === 'frozen' || detail.status === 'frozen') ? (
                      <button
                        type="button"
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          borderRadius: '6px',
                          border: '1px solid #16a34a',
                          backgroundColor: '#f0fdf4',
                          color: '#15803d',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                        onClick={() => runCardAction('Unfreeze Card', unfreezeCard)}
                      >
                        🔓 정지 해제
                      </button>
                    ) : (
                      <button
                        type="button"
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          borderRadius: '6px',
                          border: '1px solid #f59e0b',
                          backgroundColor: '#fffbeb',
                          color: '#b45309',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                        onClick={() => runCardAction('Freeze Card', freezeCard, { danger: true })}
                      >
                        ❄️ 카드 일시정지
                      </button>
                    )}
                    <button
                      type="button"
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#334155',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      onClick={() => runCardAction('Activate Card', activateCard, {
                        showInput: true,
                        inputPlaceholder: '6-digit PIN code',
                        message: '카드 활성화를 위한 6자리 PIN 코드를 입력해 주세요.',
                      })}
                    >
                      🔑 PIN 설정 및 활성화
                    </button>
                  </div>
                </AdminDetailSection>

                {/* Dev-Only Simulated Transaction Panel */}
                {isDevEnv && (
                  <AdminDetailSection title="🧪 테스트 트랜잭션 시뮬레이터 (Dev)">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="number"
                          placeholder="금액 (USDT)"
                          value={simAmount}
                          onChange={(e) => setSimAmount(e.target.value)}
                          style={{ width: '100px', padding: '4px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                        <input
                          type="text"
                          placeholder="가맹점명 (Merchant)"
                          value={simMerchant}
                          onChange={(e) => setSimMerchant(e.target.value)}
                          style={{ flex: 1, padding: '4px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                      </div>
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary"
                        disabled={simLoading}
                        onClick={async () => {
                          setSimLoading(true);
                          try {
                            await simulateCardTransaction(detail.wasabiCardId || detail.id, {
                              amount: Number(simAmount),
                              merchantName: simMerchant,
                              description: simDescription
                            });
                            window.alert('시뮬레이션 승인 거래가 생성되었습니다.');
                            loadTxs(1);
                          } catch (err) {
                            window.alert(err.message);
                          } finally {
                            setSimLoading(false);
                          }
                        }}
                      >
                        {simLoading ? '생성 중…' : '💳 테스트 결제 승인 발생'}
                      </button>
                    </div>
                  </AdminDetailSection>
                )}
              </>
            )}
          </AdminDetailPanel>
        )}
      />
    </div>
  );
}
