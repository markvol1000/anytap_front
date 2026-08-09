import { useCallback, useEffect, useState } from 'react';
import { AdminDataTable, AdminMiniTable } from '../components/AdminDataTable.jsx';
import { AdminFilterBar, AdminPageHeader, AdminPanel, AdminTableWrap } from '../components/AdminFilterBar.jsx';
import {
  AdminActionStack,
  AdminDetailPanel,
  AdminDetailRow,
  AdminDetailSection,
  AdminSplitLayout,
} from '../components/AdminSplitLayout.jsx';
import { AdminStatusBadge, formatUsdt, shortenAddress } from '../components/AdminStatusBadge.jsx';
import { runConfirm, useAdminConfirm } from '../components/AdminConfirmModal.jsx';
import { useAdminList } from '../hooks/useAdminList.js';
import { useAdminDetail } from '../hooks/useAdminDetail.js';
import { getWalletById, getWallets, lockWallet, unlockWallet, getCregisDepositList, syncUserCregisDeposits, triggerFeePayout } from '../services/adminService.js';
import { fetchLocalTransactions } from '../../lib/services/account/accountApi.js';

const fetchWallets = (params) => getWallets(params);
const fetchWalletDetail = (id) => getWalletById(id);

export function WalletsPage() {
  const confirm = useAdminConfirm();
  const [selectedId, setSelectedId] = useState(null);
  const list = useAdminList(fetchWallets);
  const { detail, loading: detailLoading, setDetail } = useAdminDetail(fetchWalletDetail, selectedId);

  const [singleSyncStatus, setSingleSyncStatus] = useState('idle');
  const [singleSyncMsg, setSingleSyncMsg] = useState('');

  const [depositPage, setDepositPage] = useState(1);
  const [depositListItems, setDepositListItems] = useState([]);
  const [depositTotalPages, setDepositTotalPages] = useState(1);
  const [depositTotal, setDepositTotal] = useState(0);
  const [depositListLoading, setDepositListLoading] = useState(false);
  const [localTxs, setLocalTxs] = useState([]);

  const fetchDepositList = useCallback(async (targetUserId, page = 1) => {
    if (!targetUserId) return;
    setDepositListLoading(true);
    setDepositPage(page);
    try {
      const res = await getCregisDepositList(targetUserId, page, 10);
      const innerData = res?.data || res;
      const rows = innerData?.rows || (Array.isArray(innerData) ? innerData : []);
      setDepositListItems(rows);
      setDepositTotalPages(innerData?.totalPages || 1);
      setDepositTotal(innerData?.total || rows.length);
    } catch (err) {
      console.error('Failed to fetch deposit list:', err);
    } finally {
      setDepositListLoading(false);
    }
  }, []);

  const handleSingleWalletSync = useCallback(async (targetUserId) => {
    if (!targetUserId) return;
    setSingleSyncStatus('syncing');
    try {
      const res = await syncUserCregisDeposits(targetUserId);
      const count = res?.syncedCount ?? res?.data?.syncedCount ?? 0;
      setSingleSyncMsg(count > 0 ? `완료 (${count}건 동기화)` : '완료 (누락 없음)');
      setSingleSyncStatus('success');

      if (detail) {
        const updated = await getWalletById(detail.id, true);
        setDetail(updated);
      }
      fetchDepositList(targetUserId, 1);
      list.reload();

      setTimeout(() => setSingleSyncStatus('idle'), 4000);
    } catch (err) {
      setSingleSyncMsg('실패');
      setSingleSyncStatus('error');
      setTimeout(() => setSingleSyncStatus('idle'), 4000);
    }
  }, [detail, fetchDepositList, list, setDetail]);

  useEffect(() => {
    if (detail) {
      const targetUserId = detail.memberId || detail.id;
      fetchDepositList(targetUserId, 1);
      fetchLocalTransactions(targetUserId)
        .then((txs) => setLocalTxs(Array.isArray(txs) ? txs : []))
        .catch(() => setLocalTxs([]));
    } else {
      setDepositListItems([]);
      setDepositTotal(0);
      setDepositTotalPages(1);
      setLocalTxs([]);
    }
  }, [detail, fetchDepositList]);

  const handleSweepFee = useCallback(async () => {
    if (!detail) return;
    const targetUserId = detail.memberId || detail.id;

    const latestDetail = await getWalletById(detail.id, true);
    setDetail(latestDetail);

    const unpaidFee = Number(latestDetail?.unpaidTotalFee ?? 0);
    if (unpaidFee <= 0) {
      await runConfirm(confirm, {
        title: 'No Unpaid Fee',
        message: `${latestDetail?.memberName || targetUserId} has no unpaid fees available for sweep. (Unpaid Fee: $0.00)`,
        confirmLabel: 'Close',
        hideCancel: true,
      });
      return;
    }

    const ok1 = await runConfirm(confirm, {
      title: 'Trigger Fee Payout (Sweep Fee)',
      message: `Sweep unpaid total fee (${formatUsdt(unpaidFee)}) for ${latestDetail.memberName || targetUserId} to Cregis master collection wallet?`,
      confirmLabel: 'Proceed',
    });
    if (!ok1) return;

    const ok2 = await runConfirm(confirm, {
      title: 'Are you sure?',
      message: 'This will trigger a real blockchain transaction to sweep the fee. Do you want to proceed?',
      confirmLabel: 'Yes, Sweep Now',
      danger: true,
    });
    if (!ok2) return;

    try {
      const res = await triggerFeePayout(targetUserId);
      const msg = res?.message || (typeof res?.data === 'string' ? res.data : 'Fee payout processed successfully.');
      window.alert(msg);
      const updated = await getWalletById(detail.id, true);
      setDetail(updated);
      list.reload();
    } catch (err) {
      window.alert(err.message);
    }
  }, [confirm, detail, list, setDetail]);

  const toggleLock = useCallback(async (lock) => {
    if (!detail) return;
    const label = lock ? 'Wallet Lock' : 'Wallet Unlock';
    const ok = await runConfirm(confirm, {
      title: label,
      message: `${lock ? 'Lock' : 'Unlock'} wallet for ${detail.memberName}?`,
      confirmLabel: lock ? 'Lock' : 'Unlock',
      danger: lock,
    });
    if (!ok) return;
    const updated = lock ? await lockWallet(detail.id) : await unlockWallet(detail.id);
    setDetail(updated);
    list.reload();
  }, [confirm, detail, list, setDetail]);

  return (
    <div className="admin-page">
      <AdminPageHeader title="Wallets" description="Monitor balances, deposits, and top-ups." />

      <AdminSplitLayout
        left={(
          <AdminPanel>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
              <button
                type="button"
                className="admin-btn admin-btn--ghost admin-btn--sm"
                onClick={() => list.reload()}
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                🔄 Refresh List
              </button>
            </div>
            <AdminFilterBar
              search={list.search}
              onSearchChange={list.setSearch}
              searchPlaceholder="Search address or member…"
              filters={[
                {
                  key: 'status',
                  label: 'Status',
                  value: list.filters.status ?? 'all',
                  onChange: (v) => list.setFilter('status', v),
                  options: [
                    { value: 'all', label: 'All' },
                    { value: 'active', label: 'Active' },
                    { value: 'locked', label: 'Locked' },
                  ],
                },
              ]}
            />
            <AdminTableWrap loading={list.loading} error={list.error} hasData={list.items.length > 0}>
              <AdminDataTable
                columns={[
                  { key: 'memberName', label: 'Member' },
                  { key: 'address', label: 'Address', render: (r) => shortenAddress(r.address, 8, 6) },
                  {
                    key: 'balance',
                    label: 'Balance (Actual) / Unpaid Fee',
                    render: (r) => {
                      const avail = (Number(r.balance) || 0).toFixed(2);
                      const actual = (Number(r.cregisActualBalance ?? r.balance) || 0).toFixed(2);
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
                    },
                  },
                  { key: 'status', label: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
                  { key: 'created', label: 'Created' },
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
          <AdminDetailPanel title={detail ? `Wallet — ${detail.memberName}` : null}>
            {detailLoading && !detail ? <p className="admin-loading admin-loading--inline">Loading…</p> : null}
            {!detailLoading && detail ? (
              <>
                <AdminDetailSection title="Wallet detail">
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '10px' }}>
                    <button
                      type="button"
                      className="admin-btn admin-btn--primary admin-btn--sm"
                      onClick={() => handleSingleWalletSync(detail.memberId || detail.id)}
                      disabled={singleSyncStatus === 'syncing'}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: singleSyncStatus === 'syncing' ? '#64748b' : (singleSyncStatus === 'success' ? '#10b981' : (singleSyncStatus === 'error' ? '#ef4444' : '#2563eb')),
                        borderColor: 'transparent',
                        color: '#ffffff',
                        fontWeight: '600',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        cursor: singleSyncStatus === 'syncing' ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {singleSyncStatus === 'syncing' && '⏳ 동기화 중...'}
                      {singleSyncStatus === 'success' && `✅ ${singleSyncMsg}`}
                      {singleSyncStatus === 'error' && '❌ 동기화 실패'}
                      {singleSyncStatus === 'idle' && '⚡ Cregis 입금 동기화'}
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--ghost admin-btn--sm"
                      onClick={() => fetchDepositList(detail.memberId || detail.id, 1)}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)' }}
                    >
                      🔄 Refresh Cregis Deposits
                    </button>
                  </div>
                  <AdminDetailRow label="Wallet ID" value={detail.id} />
                  <AdminDetailRow label="Address" value={detail.address} />
                  <AdminDetailRow label="Network" value={detail.network} />
                  <AdminDetailRow 
                    label="Balance" 
                    value={
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                        <img 
                          src="https://cryptologos.cc/logos/tether-usdt-logo.png?v=032" 
                          alt="USDT" 
                          style={{ width: '18px', height: '18px', borderRadius: '50%' }} 
                        />
                        <span style={{ fontWeight: '600' }}>{formatUsdt(detail.balance)}</span>
                        <span style={{ color: 'var(--admin-text-muted, #888)' }}>
                          ({formatUsdt(detail.cregisActualBalance ?? detail.balance)}) / {formatUsdt(detail.unpaidTotalFee ?? 0)} Unpaid Fee
                        </span>
                        <button
                          type="button"
                          className="admin-btn admin-btn--ghost admin-btn--sm"
                          onClick={handleSweepFee}
                          title="Sweep unpaid fee to Cregis master wallet"
                          style={{
                            padding: '2px 6px',
                            fontSize: '11px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            color: '#3b82f6',
                            borderColor: 'rgba(59, 130, 246, 0.3)',
                            marginLeft: '4px'
                          }}
                        >
                          💸 Sweep Fee
                        </button>
                      </div>
                    } 
                  />
                  <AdminDetailRow label="Status" value={<AdminStatusBadge status={detail.status} />} />
                </AdminDetailSection>

                <AdminDetailSection title="💳 Unified Wallet Transaction & On-Chain History (통합 거래 & 온체인 입금 원장)">
                  <AdminMiniTable
                    columns={[
                      { key: 'title', label: 'Type' },
                      { 
                        key: 'amount', 
                        label: 'Amount (Net/Gross)', 
                        render: (r) => {
                          const curr = (r.currency || 'USDT').toUpperCase();
                          const formattedAmt = curr === 'KRW'
                            ? `${Number(r.amount || 0).toLocaleString('ko-KR')} KRW`
                            : formatUsdt(r.amount);
                          const formattedGross = curr === 'KRW'
                            ? `${Number(r.rawAmount || 0).toLocaleString('ko-KR')} KRW`
                            : formatUsdt(r.rawAmount);

                          const isPlus = r.incoming || r.cardIncoming;
                          return (
                            <div>
                              <span style={{ color: isPlus ? '#38A169' : '#E53E3E', fontWeight: 600 }}>
                                {isPlus ? '+' : '-'}{formattedAmt}
                              </span>
                              {r.incoming && r.rawAmount && r.rawAmount !== r.amount && (
                                <div style={{ fontSize: '10px', color: 'var(--admin-text-muted, #888)' }}>
                                  (Gross: {formattedGross})
                                </div>
                              )}
                            </div>
                          );
                        } 
                      },
                      {
                        key: 'feeAmount',
                        label: 'Fee (수수료)',
                        render: (r) => (
                          <span style={{ fontSize: '12px', color: r.feeAmount > 0 ? '#E53E3E' : 'var(--admin-text-muted, #888)' }}>
                            {r.feeAmount > 0 ? formatUsdt(r.feeAmount) : '-'}
                          </span>
                        )
                      },
                      { 
                        key: 'status', 
                        label: 'Status', 
                        render: (r) => (
                          <span style={{ 
                            textTransform: 'uppercase', 
                            fontSize: '11px', 
                            fontWeight: 600, 
                            color: (r.status === 'completed' || r.status === 'success' || r.status === '1') ? '#38A169' : (r.status === 'failed' || r.status === '2') ? '#E53E3E' : '#F6A623' 
                          }}>
                            {(r.status === '1' || r.status === 'success' || r.status === 'completed') ? 'SUCCESS' : (r.status === '0' || r.status === 'pending') ? 'PENDING' : r.status}
                          </span>
                        ) 
                      },
                      { key: 'at', label: 'Date', render: (r) => r.at ? new Date(r.at).toLocaleString('ko-KR') : '-' }
                    ]}
                    rows={localTxs ?? []}
                  />
                </AdminDetailSection>

                <AdminActionStack>
                  {detail.status === 'locked' ? (
                    <button type="button" className="admin-btn admin-btn--primary" onClick={() => toggleLock(false)}>
                      Unlock wallet
                    </button>
                  ) : (
                    <button type="button" className="admin-btn admin-btn--danger" onClick={() => toggleLock(true)}>
                      Lock wallet
                    </button>
                  )}
                </AdminActionStack>
              </>
            ) : null}
          </AdminDetailPanel>
        )}
      />
    </div>
  );
}
