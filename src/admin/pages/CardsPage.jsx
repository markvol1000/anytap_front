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
import { AdminStatusBadge, formatAdminDate, formatAmountWithCurrency, shortenAddress } from '../components/AdminStatusBadge.jsx';
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

const isDevEnv = (import.meta.env.DEV || import.meta.env.MODE === 'development' || import.meta.env.MODE === 'dev' || (typeof window !== 'undefined' && (['localhost', '127.0.0.1'].includes(window.location.hostname) || window.location.hostname.includes('dev') || window.location.port === '5173'))) && !(typeof window !== 'undefined' && (window.location.hostname.endsWith('anytap.io') && !window.location.hostname.includes('dev')));

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

const SIM_CURRENCIES = [
  { code: 'KRW', label: '₩ KRW', name: '한국 원', symbol: '₩', defaultAmt: '15000', defaultMerch: 'Starbucks Gangnam' },
  { code: 'USD', label: '$ USD', name: '미국 달러', symbol: '$', defaultAmt: '10.00', defaultMerch: 'Starbucks Coffee' },
  { code: 'EUR', label: '€ EUR', name: '유로', symbol: '€', defaultAmt: '10.00', defaultMerch: 'Paris Bistro' },
  { code: 'SGD', label: 'S$ SGD', name: '싱가포르', symbol: 'S$', defaultAmt: '15.00', defaultMerch: 'Marina Bay Merchant' },
  { code: 'HKD', label: 'HK$ HKD', name: '홍콩 달러', symbol: 'HK$', defaultAmt: '80.00', defaultMerch: 'Central Cafe HK' },
  { code: 'CNY', label: '¥ CNY', name: '중국 위안', symbol: '¥', defaultAmt: '70.00', defaultMerch: 'Shanghai Mart' },
  { code: 'PHP', label: '₱ PHP', name: '필리핀 페소', symbol: '₱', defaultAmt: '500.00', defaultMerch: 'Manila Store' },
  { code: 'IDR', label: 'Rp IDR', name: '인도네시아', symbol: 'Rp', defaultAmt: '150000', defaultMerch: 'Jakarta Cafe' },
  { code: 'USDT', label: '₮ USDT', name: '테더', symbol: '₮', defaultAmt: '10.00', defaultMerch: 'Online Crypto Store' },
];

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

  const [showSimModal, setShowSimModal] = useState(false);
  const [simCurrency, setSimCurrency] = useState('KRW');
  const [simType, setSimType] = useState('auth');
  const [simAmount, setSimAmount] = useState('15000');
  const [simMerchant, setSimMerchant] = useState('Starbucks Gangnam');
  const [simDescription, setSimDescription] = useState('Test Card Payment Auth');
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

  const handleRunSimulation = useCallback(async (e) => {
    if (e) e.preventDefault();
    if (!detail) return;
    setSimLoading(true);
    try {
      const cardId = detail.wasabiCardId || detail.id;
      await simulateCardTransaction(cardId, {
        amount: Number(simAmount),
        currency: simCurrency,
        type: simType,
        merchantName: simMerchant,
        description: simDescription || simMerchant,
      });
      window.alert(`[${simCurrency}] ${Number(simAmount).toLocaleString()} ${simCurrency} payment simulation successfully executed.`);
      setShowSimModal(false);
      loadTxs(1);
    } catch (err) {
      window.alert(err.message || 'Failed to create payment simulation.');
    } finally {
      setSimLoading(false);
    }
  }, [detail, simAmount, simCurrency, simType, simMerchant, simDescription, loadTxs]);

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
        window.alert('PIN code must be a 6-digit number.');
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
        description="Management for issued card lifecycle including freeze/unfreeze, activation, PIN setting, and transaction history."
        onRefresh={() => {
          list.reload();
          if (selectedId) loadTxs(txPage);
        }}
        refreshing={list.loading}
      />

      {/* Cards KPI Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '16px'
      }}>
        <div style={{ padding: '16px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
          <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '600' }}>💳 Active Cards</span>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#15803d', marginTop: '4px' }}>{activeCount}</div>
        </div>
        <div style={{ padding: '16px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
          <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: '600' }}>📱 Virtual Cards</span>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#1d4ed8', marginTop: '4px' }}>{virtualCount}</div>
        </div>
        <div style={{ padding: '16px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
          <span style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>📦 Physical Cards</span>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b', marginTop: '4px' }}>{physicalCount}</div>
        </div>
        <div style={{ padding: '16px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
          <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: '600' }}>❄️ Frozen Cards</span>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#b91c1c', marginTop: '4px' }}>{frozenCount}</div>
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
                    label: 'Wallet Balance (가용/실잔액)', 
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
          >
            {detail && (
              <>
                <AdminDetailSection title="Card Basic Info">
                  <AdminDetailRow label="Card Number" value={detail.wasabiCardId || detail.id} copyable />
                  <AdminDetailRow label="Holder ID" value={detail.wasabiHolderId || '—'} copyable />
                  <AdminDetailRow label="Member ID" value={detail.memberId || detail.userId || '—'} copyable />
                  <AdminDetailRow label="Email" value={detail.memberEmail || detail.email || '—'} copyable />
                  <AdminDetailRow label="Card Type" value={detail.cardType || 'Physical'} />
                  <AdminDetailRow label="Status" value={<AdminStatusBadge status={detail.cardStatus || detail.status} />} />
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
                <AdminDetailSection title="Card Balance & Transfer History (충전 및 이체 내역)">
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
                            const amountVal = Math.abs(Number(dep.depositAmount || dep.grossAmount || dep.amount || dep.netAmount || 0));
                            const curr = dep.currency || 'USD';

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
                      const resolvedAmt = Math.abs(Number(t.originalAmount ?? t.amount ?? t.transAmount ?? 0));
                      const resolvedCurr = t.originalCurrency || t.currency || t.authorizedCurrency || 'USD';
                      const resolvedMerch = t.merchantName || t.merchant || t.description || 'Merchant Transaction';

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

                            const rawStatus = String(t.status || 'SUCCESS').toUpperCase();
                            const isAuth = rawStatus.includes('AUTH');
                            const isFailed = rawStatus.includes('FAIL') || rawStatus.includes('REJECT') || rawStatus.includes('DECLIN');

                            let statusLabel = '✓ Completed';
                            let statusBg = '#dcfce7';
                            let statusColor = '#166534';

                            if (isAuth) {
                              statusLabel = '⏳ Authorized';
                              statusBg = '#e0f2fe';
                              statusColor = '#0369a1';
                            } else if (isFailed) {
                              statusLabel = '✕ Failed';
                              statusBg = '#fee2e2';
                              statusColor = '#b91c1c';
                            }

                            return (
                              <div key={t.resolvedTxId || idx} style={{
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

                <AdminDetailSection title="Card Actions (Quick Actions)">
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {(detail.cardStatus === 'frozen' || detail.status === 'frozen') ? (
                      <button
                        type="button"
                        style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', cursor: 'pointer' }}
                        onClick={() => runCardAction('Unfreeze Card', unfreezeCard)}
                      >
                        Unfreeze Card
                      </button>
                    ) : (
                      <button
                        type="button"
                        style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#dc2626', cursor: 'pointer' }}
                        onClick={() => runCardAction('Freeze Card', freezeCard)}
                      >
                        Freeze Card
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
                        message: 'Please enter a 6-digit PIN code to activate the card.',
                      })}
                    >
                      🔑 Set PIN & Activate
                    </button>
                  </div>
                </AdminDetailSection>

                {/* Dev-Only Simulated Transaction Panel */}
                {isDevEnv && (
                  <AdminDetailSection title="🧪 Test Transaction Simulator (Dev)">
                    <div style={{ padding: '4px' }}>
                      <button
                        type="button"
                        className="admin-btn admin-btn--sm admin-btn--secondary"
                        style={{ fontSize: '11px', padding: '4px 10px', width: 'fit-content' }}
                        onClick={() => setShowSimModal(true)}
                      >
                        💳 Simulate Test Payment Approval
                      </button>
                    </div>
                  </AdminDetailSection>
                )}
              </>
            )}
          </AdminDetailPanel>
        )}
      />

      {/* Test Transaction Simulation Modal Popup */}
      {showSimModal && detail && (
        <div className="admin-modal-backdrop" onClick={() => setShowSimModal(false)}>
          <div className="admin-modal" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>
                💳 Card Payment Approval Simulator (Test Payment)
              </h3>
              <button
                type="button"
                className="admin-modal__close"
                onClick={() => setShowSimModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleRunSimulation} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* 1. Currency Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                  1. Select Payment Currency (결제 통화 선택)
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px'
                }}>
                  {SIM_CURRENCIES.map((cur) => {
                    const isSelected = simCurrency === cur.code;
                    return (
                      <button
                        key={cur.code}
                        type="button"
                        onClick={() => {
                          setSimCurrency(cur.code);
                          setSimAmount(cur.defaultAmt);
                          setSimMerchant(cur.defaultMerch);
                        }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '8px 6px',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                          backgroundColor: isSelected ? '#eff6ff' : '#f8fafc',
                          color: isSelected ? '#1d4ed8' : '#334155',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontWeight: '800', fontSize: '13px' }}>{cur.label}</span>
                        </div>
                        <span style={{ fontSize: '10px', color: isSelected ? '#2563eb' : '#64748b', marginTop: '2px' }}>
                          {cur.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Amount & Type */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                    2. Payment Amount ({simCurrency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    className="admin-input"
                    value={simAmount}
                    onChange={(e) => setSimAmount(e.target.value)}
                    placeholder={simCurrency === 'KRW' ? '15000' : '10.00'}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  />
                </div>

                <div style={{ width: '130px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                    Payment Type
                  </label>
                  <select
                    value={simType}
                    onChange={(e) => setSimType(e.target.value)}
                    style={{ width: '100%', padding: '8px 6px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#ffffff' }}
                  >
                    <option value="auth">Auth</option>
                    <option value="refund">Refund</option>
                    <option value="reversal">Reversal</option>
                  </select>
                </div>
              </div>

              {/* 3. Merchant Name */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  3. Merchant Name
                </label>
                <input
                  type="text"
                  required
                  className="admin-input"
                  value={simMerchant}
                  onChange={(e) => setSimMerchant(e.target.value)}
                  placeholder="e.g. Starbucks Gangnam, GS25"
                  style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </div>

              {/* 4. Description */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  4. Description
                </label>
                <input
                  type="text"
                  className="admin-input"
                  value={simDescription}
                  onChange={(e) => setSimDescription(e.target.value)}
                  placeholder="Test simulation description"
                  style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost"
                  onClick={() => setShowSimModal(false)}
                  disabled={simLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn--primary"
                  disabled={simLoading}
                  style={{ fontWeight: '600', padding: '8px 16px' }}
                >
                  {simLoading ? 'Processing...' : '💳 Execute Payment Simulation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
