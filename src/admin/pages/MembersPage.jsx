import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AdminDataTable, AdminMiniTable } from '../components/AdminDataTable.jsx';
import { AdminFilterBar, AdminPageHeader, AdminPanel, AdminTableWrap } from '../components/AdminFilterBar.jsx';
import {
  AdminActionStack,
  AdminDetailPanel,
  AdminDetailRow,
  AdminDetailSection,
  AdminSplitLayout,
} from '../components/AdminSplitLayout.jsx';
import { AdminStatusBadge, formatAdminDate, formatAmountWithCurrency, formatUsdt } from '../components/AdminStatusBadge.jsx';
import { runConfirm, useAdminConfirm } from '../components/AdminConfirmModal.jsx';
import { useAdminList } from '../hooks/useAdminList.js';
import { useAdminDetail } from '../hooks/useAdminDetail.js';
import {
  activateMember,
  deleteMember,
  getMemberById,
  getMemberCards,
  getMembers,
  getTransactions,
  saveMemberMemo,
  suspendMember,
  retryCregisWallet,
  simulateWasabiKycWebhook,
  triggerFeePayout,
  updateMember,
} from '../services/adminService.js';

const isDevEnv = (import.meta.env.DEV || import.meta.env.MODE === 'development' || import.meta.env.MODE === 'dev' || (typeof window !== 'undefined' && (['localhost', '127.0.0.1'].includes(window.location.hostname) || window.location.hostname.includes('dev') || window.location.port === '5173'))) && !(typeof window !== 'undefined' && (window.location.hostname.endsWith('anytap.io') && !window.location.hostname.includes('dev')));

const fetchMembers = (params) => getMembers(params);
const fetchMemberDetail = (id) => getMemberById(id);

function CurrencyBadgeMini({ currency }) {
  if (!currency || !String(currency).trim() || String(currency).trim().toLowerCase() === 'null') {
    return null;
  }
  const code = String(currency).toUpperCase().trim();
  if (code === 'USDT') {
    return (
      <img
        src="https://cryptologos.cc/logos/tether-usdt-logo.png?v=032"
        alt="USDT"
        style={{ width: '15px', height: '15px', borderRadius: '50%', flexShrink: 0 }}
      />
    );
  }
  if (code === 'KRW' || code === '₩') {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '15px',
        height: '15px',
        borderRadius: '50%',
        backgroundColor: '#2563eb',
        color: '#fff',
        fontSize: '9px',
        fontWeight: 'bold',
        flexShrink: 0
      }}>₩</span>
    );
  }
  if (code === 'USD' || code === '$') {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '15px',
        height: '15px',
        borderRadius: '50%',
        backgroundColor: '#16a34a',
        color: '#fff',
        fontSize: '9px',
        fontWeight: 'bold',
        flexShrink: 0
      }}>$</span>
    );
  }
  if (code === 'EUR' || code === '€') {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '15px',
        height: '15px',
        borderRadius: '50%',
        backgroundColor: '#4f46e5',
        color: '#fff',
        fontSize: '9px',
        fontWeight: 'bold',
        flexShrink: 0
      }}>€</span>
    );
  }
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 4px',
      borderRadius: '4px',
      backgroundColor: '#f1f5f9',
      color: '#334155',
      fontSize: '9px',
      fontWeight: '700',
      border: '1px solid #cbd5e1',
      flexShrink: 0
    }}>{code}</span>
  );
}

export function MembersPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramId = searchParams.get('id') || searchParams.get('userId');

  const confirm = useAdminConfirm();
  const [selectedId, setSelectedId] = useState(null);
  const [memoDraft, setMemoDraft] = useState('');
  const [memberCards, setMemberCards] = useState([]);
  const [memberCardsLoading, setMemberCardsLoading] = useState(false);
  const [memberTx, setMemberTx] = useState([]);
  const [memberTxLoading, setMemberTxLoading] = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);
  const [simulatingKyc, setSimulatingKyc] = useState(false);
  const [copiedTxId, setCopiedTxId] = useState(null);
  const list = useAdminList(fetchMembers);
  const { detail, loading: detailLoading, setDetail } = useAdminDetail(fetchMemberDetail, selectedId);

  useEffect(() => {
    if (paramId) {
      setSelectedId(paramId);
    }
  }, [paramId]);

  useEffect(() => {
    if (detail?.id) {
      setMemberCardsLoading(true);
      getMemberCards(detail.id)
        .then((cards) => setMemberCards(cards || []))
        .catch(() => setMemberCards([]))
        .finally(() => setMemberCardsLoading(false));

      setMemberTxLoading(true);
      getTransactions({ search: detail.id || detail.email, pageSize: 50, limit: 50 })
        .then((res) => {
          const list = Array.isArray(res) ? res : (res?.items || []);
          const dId = String(detail.id || '').toLowerCase();
          const dEmail = String(detail.email || '').toLowerCase();
          const matched = list.filter((t) => {
            const mId = String(t.memberId || t.userId || '').toLowerCase();
            const mEmail = String(t.memberEmail || t.email || '').toLowerCase();
            return (dId && mId === dId) || (dEmail && mEmail === dEmail);
          });
          setMemberTx(matched.length > 0 ? matched : list);
        })
        .catch(() => setMemberTx([]))
        .finally(() => setMemberTxLoading(false));
    } else {
      setMemberCards([]);
      setMemberTx([]);
    }
  }, [detail?.id, detail?.email]);

  const selectRow = (row) => {
    setSelectedId(row.id);
    setMemoDraft(row.memo ?? '');
  };

  const walletAddr = String(detail?.cregisWalletAddress || detail?.walletAddress || detail?.depositAddress || '').trim();
  const hasNoWallet = !walletAddr || walletAddr === '-' || walletAddr === '—' || walletAddr === 'Not allocated' || walletAddr === 'null' || walletAddr === 'undefined';

  const handleAction = useCallback(async (action) => {
    if (!detail) return;
    try {
      if (action === 'suspend') {
        const ok = await runConfirm(confirm, {
          title: 'Suspend member',
          message: `Suspend ${detail.name}? They will lose access to the portal.`,
          confirmLabel: 'Suspend',
          danger: true,
        });
        if (!ok) return;
        const updated = await suspendMember(detail.id);
        setDetail(updated);
        list.reload();
      } else if (action === 'activate') {
        const updated = await activateMember(detail.id);
        setDetail(updated);
        list.reload();
      } else if (action === 'delete') {
        const ok = await runConfirm(confirm, {
          title: 'Delete member',
          message: `Permanently delete ${detail.name}? This cannot be undone.`,
          confirmLabel: 'Delete',
          danger: true,
        });
        if (!ok) return;
        await deleteMember(detail.id);
        setSelectedId(null);
        list.reload();
      } else if (action === 'saveMemo') {
        await saveMemberMemo(detail.id, memoDraft);
        setDetail({ ...detail, memo: memoDraft });
        window.alert('✅ Internal memo saved successfully.');
      } else if (action === 'retryWallet') {
        const ok = await runConfirm(confirm, {
          title: 'Generate Wallet (Cregis USDT)',
          message: `Generate Cregis USDT wallet address for member ${detail.name} (${detail.id})?`,
          confirmLabel: 'Generate Wallet',
        });
        if (!ok) return;

        setRetryLoading(true);
        try {
          const res = await retryCregisWallet(detail.id);
          const allocatedAddress = res?.address || res?.data?.address || (res?.cregisWalletAddress) || 'Allocated';
          window.alert(`✅ Cregis USDT wallet address issued successfully!\n\nAssigned Address:\n${allocatedAddress}`);
          const updated = await getMemberById(detail.id);
          setDetail(updated);
          list.reload();
        } catch (retryErr) {
          window.alert(`❌ Cregis wallet creation failed:\n${retryErr.message || 'Cregis API communication error occurred.'}`);
        } finally {
          setRetryLoading(false);
        }
      } else if (action === 'triggerFeePayout') {
        const latestDetail = await getMemberById(detail.id);
        setDetail(latestDetail);

        const unpaidFee = Number(latestDetail?.unpaidTotalFee ?? 0);
        if (unpaidFee <= 0) {
          await runConfirm(confirm, {
            title: 'No Unpaid Fee',
            message: `${latestDetail?.name || latestDetail?.id} has no unpaid fees available for sweep. (Unpaid Fee: $0.00)`,
            confirmLabel: 'Close',
            hideCancel: true,
          });
          return;
        }

        const ok1 = await runConfirm(confirm, {
          title: 'Trigger Fee Payout (Sweep Fee)',
          message: `Sweep unpaid total fee (${formatUsdt(unpaidFee)}) for ${latestDetail.name} to Cregis master collection wallet?`,
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

        const res = await triggerFeePayout(latestDetail.id);
        const msg = res?.message || (typeof res?.data === 'string' ? res.data : 'Fee payout processed successfully.');
        window.alert(`✅ ${msg}`);
        const updated = await getMemberById(latestDetail.id);
        setDetail(updated);
        list.reload();
      } else if (action === 'simulateKycSuccess') {
        const ok = await runConfirm(confirm, {
          title: 'Simulate Wasabi KYC Success (Approved)',
          message: `[Dev/Testing] Trigger simulated Wasabi KYC Approval webhook for ${detail.name || detail.id}?\n\n• Webhook Status: APPROVED\n• Updates account status to ACTIVE\n• Auto-generates Cregis USDT wallet\n• Records KYC_ACTIVE event log`,
          confirmLabel: 'Trigger KYC Success',
        });
        if (!ok) return;

        setSimulatingKyc(true);
        try {
          const res = await simulateWasabiKycWebhook(detail.id, 'APPROVED');
          const data = res?.data || res;
          window.alert(`✅ Wasabi KYC Success Webhook Simulated Successfully!\n\nUser ID: ${data?.userId}\nStatus: ${data?.accountStatus}\nCregis Wallet: ${data?.cregisWalletAddress || 'Generated'}`);
          const updated = await getMemberById(detail.id);
          setDetail(updated);
          list.reload();
        } catch (err) {
          window.alert(`❌ Failed to simulate Wasabi KYC success webhook:\n${err.message}`);
        } finally {
          setSimulatingKyc(false);
        }
      } else if (action === 'simulateKycFail') {
        const reasonInput = window.prompt(`[Dev/Testing] Trigger simulated Wasabi KYC Failure webhook for ${detail.name || detail.id}.\n\nEnter rejection reason (optional):`, 'Identity document verification failed (Simulated)');
        if (reasonInput === null) return; // User cancelled prompt

        const ok = await runConfirm(confirm, {
          title: 'Simulate Wasabi KYC Failure (Rejected)',
          message: `Are you sure you want to trigger KYC Rejection webhook for ${detail.name || detail.id}?\n\n• Webhook Status: REJECTED\n• Reason: ${reasonInput || 'None'}\n• Updates account status to REJECTED\n• Records KYC_REJECTED event log`,
          confirmLabel: 'Trigger KYC Fail',
          danger: true,
        });
        if (!ok) return;

        setSimulatingKyc(true);
        try {
          const res = await simulateWasabiKycWebhook(detail.id, 'REJECTED', reasonInput || 'Identity verification failed');
          const data = res?.data || res;
          window.alert(`✅ Wasabi KYC Fail Webhook Simulated Successfully!\n\nUser ID: ${data?.userId}\nStatus: ${data?.accountStatus || 'REJECTED'}\nSimulated: REJECTED`);
          const updated = await getMemberById(detail.id);
          setDetail(updated);
          list.reload();
        } catch (err) {
          window.alert(`❌ Failed to simulate Wasabi KYC fail webhook:\n${err.message}`);
        } finally {
          setSimulatingKyc(false);
        }
      }
    } catch (err) {
      window.alert(`❌ Action error: ${err.message}`);
    }
  }, [confirm, detail, list, memoDraft, setDetail]);

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Members"
        description="Search, review, and manage member accounts."
        onRefresh={list.reload}
        refreshing={list.loading}
      />

      <AdminSplitLayout
        left={(
          <AdminPanel>
            <AdminFilterBar
              search={list.search}
              onSearchChange={list.setSearch}
              searchPlaceholder="Search name, email, ID, wallet address…"
              filters={[
                {
                  key: 'accountStatus',
                  label: 'Status',
                  value: list.filters.accountStatus ?? 'all',
                  onChange: (v) => list.setFilter('accountStatus', v),
                  options: [
                    { value: 'all', label: 'All statuses' },
                    { value: 'active', label: 'Active' },
                    { value: 'suspended', label: 'Suspended' },
                  ],
                },
              ]}
            />
            <AdminTableWrap loading={list.loading} error={list.error} hasData={(list.items || []).length > 0}>
              <AdminDataTable
                columns={[
                  { key: 'id', label: 'Member ID', render: (r) => (
                    <span style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '12px' }}>{r.id}</span>
                  ) },
                  { 
                    key: 'name', 
                    label: 'Member',
                    render: (r) => {
                      const hasDistinctName = r.name && r.name !== r.email && r.name !== r.id && r.name !== '—';
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '130px' }}>
                          <span style={{ fontWeight: '700', color: 'var(--ink, #0f172a)' }}>
                            {hasDistinctName ? r.name : (r.email || r.id)}
                          </span>
                          {hasDistinctName && r.email ? (
                            <span style={{ fontSize: '11px', color: 'var(--fg-muted, #64748b)' }}>{r.email}</span>
                          ) : null}
                        </div>
                      );
                    }
                  },
                  {
                    key: 'walletAddress',
                    label: 'USDT Deposit Address',
                    render: (r) => {
                      const addr = r.cregisWalletAddress || r.walletAddress || r.depositAddress || '';
                      if (!addr || addr === '-' || addr === '—') {
                        return <span style={{ color: '#94a3b8', fontSize: '11px' }}>Not allocated</span>;
                      }
                      return (
                        <span
                          title={`Click to copy: ${addr}`}
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            color: '#0284c7',
                            background: '#f0f9ff',
                            border: '1px solid #bae6fd',
                            padding: '3px 7px',
                            borderRadius: '5px',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            try { navigator.clipboard?.writeText(addr); } catch {}
                            setSelectedId(r.id);
                            setMemoDraft(r.memo ?? '');
                          }}
                        >
                          {addr.length > 14 ? `${addr.slice(0, 7)}...${addr.slice(-5)}` : addr} 📋
                        </span>
                      );
                    },
                  },
                  { key: 'joinDate', label: 'Join Date', render: (r) => formatAdminDate(r.joinDate) },
                  { key: 'kycStatus', label: 'KYC', render: (r) => <AdminStatusBadge status={r.kycStatus} /> },
                  { key: 'cardStatus', label: 'Card', render: (r) => <AdminStatusBadge status={r.cardStatus} /> },
                  { 
                    key: 'walletBalance', 
                    label: 'Wallet Balance', 
                    render: (r) => {
                      const avail = (Number(r.walletBalance) || 0).toFixed(2);
                      const actual = (Number(r.cregisActualBalance ?? r.actualBalance ?? r.walletBalance) || 0).toFixed(2);
                      const unpaid = (Number(r.unpaidTotalFee) || 0).toFixed(2);
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700' }}>
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
                            <span style={{ color: '#047857' }}>{avail} USDT</span>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                              ({actual})
                            </span>
                          </div>
                          {Number(unpaid) > 0 ? (
                            <span style={{ fontSize: '10px', color: '#ea580c', fontWeight: '600' }}>
                              Fee due: {unpaid}
                            </span>
                          ) : null}
                        </div>
                      );
                    } 
                  },
                  { 
                    key: 'accountStatus', 
                    label: 'Account Status', 
                    render: (r) => {
                      const st = String(r.accountStatus || r.status || 'active').toLowerCase();
                      const statusColorMap = {
                        active: { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
                        suspended: { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
                        locked: { bg: '#fff7ed', color: '#c2410c', border: '#ffedd5' },
                        pending: { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
                        rejected: { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
                      };
                      const theme = statusColorMap[st] || statusColorMap.active;
                      return (
                        <select
                          id={`member-status-${r.id}`}
                          name={`memberStatus-${r.id}`}
                          aria-label={`Update account status for ${r.name || r.id}`}
                          value={st}
                          onClick={(e) => e.stopPropagation()}
                          onChange={async (e) => {
                            e.stopPropagation();
                            const nextSt = e.target.value;
                            try {
                              await updateMember(r.id, { status: nextSt });
                              if (detail?.id === r.id) {
                                const updated = await getMemberById(r.id);
                                setDetail(updated);
                              }
                              list.reload();
                            } catch (err) {
                              window.alert(`Failed to update status: ${err.message}`);
                            }
                          }}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            backgroundColor: theme.bg,
                            color: theme.color,
                            border: `1px solid ${theme.border}`,
                            outline: 'none',
                          }}
                        >
                          <option value="active">🟢 Active</option>
                          <option value="suspended">🔴 Suspended</option>
                          <option value="locked">🟠 Locked</option>
                          <option value="pending">⚪ Pending</option>
                          {st === 'rejected' ? <option value="rejected">❌ Rejected</option> : null}
                        </select>
                      );
                    } 
                  },
                ]}
                rows={list.items || []}
                selectedId={selectedId}
                onSelectRow={selectRow}
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
        right={(selectedId && detail) ? (
          <AdminDetailPanel 
            title={detail ? (detail.name || detail.email || detail.id) : null}
            onClose={() => setSelectedId(null)}
          >
            {detailLoading && !detail ? <p className="admin-loading admin-loading--inline">Loading…</p> : null}
            {!detailLoading && detail ? (
              <>
                <AdminDetailSection title="Member info">
                  <AdminDetailRow label="Member ID" value={detail.id} />
                  <AdminDetailRow label="Email" value={detail.email} />
                  {detail.phone && detail.phone !== '—' && detail.phone !== '-' ? (
                    <AdminDetailRow label="Phone" value={detail.phone} />
                  ) : null}
                  {detail.country && detail.country !== '—' && detail.country !== '-' ? (
                    <AdminDetailRow label="Country" value={detail.country} />
                  ) : null}
                  <AdminDetailRow label="Join date" value={formatAdminDate(detail.joinDate)} />
                  <AdminDetailRow label="KYC" value={<AdminStatusBadge status={detail.kycStatus} />} />
                  <AdminDetailRow label="Card" value={<AdminStatusBadge status={detail.cardStatus} />} />
                  <AdminDetailRow label="Wallet" value={(
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', flexWrap: 'wrap' }}>
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
                      <span style={{ fontWeight: '700', color: '#047857' }}>
                        {formatUsdt(detail.walletBalance ?? 0)}
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        ({Number(detail.cregisActualBalance ?? detail.actualBalance ?? detail.walletBalance ?? 0).toFixed(2)})
                      </span>
                      {Number(detail.unpaidTotalFee) > 0 ? (
                        <span style={{ color: '#ea580c', fontWeight: '600', fontSize: '12px' }}>
                          (Fee due: {formatUsdt(detail.unpaidTotalFee)})
                        </span>
                      ) : null}
                    </div>
                  )} />
                  <AdminDetailRow label="Account Status" value={(
                    <select
                      id="detail-member-status"
                      name="accountStatus"
                      aria-label="Update member status"
                      value={String(detail.accountStatus || detail.status || 'active').toLowerCase()}
                      onChange={async (e) => {
                        const nextSt = e.target.value;
                        try {
                          const updated = await updateMember(detail.id, { status: nextSt });
                          setDetail(updated);
                          list.reload();
                        } catch (err) {
                          window.alert(`Failed to update status: ${err.message}`);
                        }
                      }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        backgroundColor: String(detail.accountStatus || detail.status || 'active').toLowerCase() === 'active' ? '#ecfdf5' : String(detail.accountStatus || detail.status || 'active').toLowerCase() === 'suspended' ? '#fef2f2' : String(detail.accountStatus || detail.status || 'active').toLowerCase() === 'locked' ? '#fff7ed' : '#f1f5f9',
                        color: String(detail.accountStatus || detail.status || 'active').toLowerCase() === 'active' ? '#047857' : String(detail.accountStatus || detail.status || 'active').toLowerCase() === 'suspended' ? '#dc2626' : String(detail.accountStatus || detail.status || 'active').toLowerCase() === 'locked' ? '#c2410c' : '#475569',
                        border: '1px solid #cbd5e1',
                        outline: 'none',
                      }}
                    >
                      <option value="active">🟢 Active</option>
                      <option value="suspended">🔴 Suspended</option>
                      <option value="locked">🟠 Locked</option>
                      <option value="pending">⚪ Pending</option>
                      {String(detail.accountStatus || detail.status || '').toLowerCase() === 'rejected' ? (
                        <option value="rejected">❌ Rejected</option>
                      ) : null}
                    </select>
                  )} />
                </AdminDetailSection>

                <AdminDetailSection title="Cregis Connection Info">
                  <AdminDetailRow label="USDT Deposit Address" value={(
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '12px' }}>
                      <span>{hasNoWallet ? 'Not allocated' : walletAddr}</span>
                      {hasNoWallet ? (
                        <button
                          type="button"
                          className="admin-btn admin-btn--ghost admin-btn--sm"
                          disabled={retryLoading}
                          onClick={() => handleAction('retryWallet')}
                          style={{
                            padding: '2px 8px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            color: '#3b82f6',
                            borderColor: 'rgba(59, 130, 246, 0.3)',
                            cursor: retryLoading ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {retryLoading ? '⏳ Generating...' : '⚡ Generate Wallet'}
                        </button>
                      ) : null}
                    </div>
                  )} />
                </AdminDetailSection>


                <AdminDetailSection title="Wasabi Connection Info">
                  <AdminDetailRow label="Holder ID" value={detail.wasabiHolderId || '—'} />
                  <AdminDetailRow 
                    label="Card Count" 
                    value={`${memberCards?.length || (detail.cardStatus && detail.cardStatus !== 'not_issued' ? 1 : 0)} cards`} 
                  />
                  <AdminDetailRow label="Card Status" value={<AdminStatusBadge status={detail.cardStatus} />} />
                </AdminDetailSection>

                <AdminDetailSection title="Issued Cards List" className="admin-detail-full-width">
                  {memberCardsLoading ? (
                    <p className="admin-loading admin-loading--inline">Loading cards…</p>
                  ) : memberCards && memberCards.length > 0 ? (
                    <AdminMiniTable
                      columns={[
                        {
                          key: 'wasabiCardId',
                          label: 'Wasabi ID',
                          render: (r) => (
                            <button
                              type="button"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#2563eb',
                                textDecoration: 'underline',
                                cursor: 'pointer',
                                padding: 0,
                                fontWeight: '700',
                                fontFamily: 'monospace',
                                fontSize: '11px',
                              }}
                              onClick={() => navigate(`/admin/cards?id=${encodeURIComponent(r.wasabiCardId || r.id)}`)}
                              title="Click to view card detail in Cards menu"
                            >
                              {r.wasabiCardId || r.id}
                            </button>
                          ),
                        },
                        {
                          key: 'cardNo',
                          label: 'Card Number',
                          render: (r) => (
                            <button
                              type="button"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#0f172a',
                                cursor: 'pointer',
                                padding: 0,
                                fontWeight: '700',
                                fontFamily: 'monospace',
                                fontSize: '12px',
                                textAlign: 'left',
                              }}
                              onClick={() => navigate(`/admin/cards?id=${encodeURIComponent(r.wasabiCardId || r.id)}`)}
                              title="Click to view card detail in Cards menu"
                            >
                              💳 •••• {r.last4 || r.cardLast4 || '—'}
                            </button>
                          ),
                        },
                        {
                          key: 'cardType',
                          label: 'Type',
                          render: (r) => r.cardType || r.type || 'physical',
                        },
                        {
                          key: 'status',
                          label: 'Status',
                          render: (r) => <AdminStatusBadge status={r.status || r.cardStatus || 'active'} />,
                        },
                      ]}
                      rows={memberCards}
                    />
                  ) : (
                    <p className="admin-muted" style={{ paddingLeft: '8px', fontSize: '13px' }}>No cards issued for this member.</p>
                  )}
                </AdminDetailSection>

                {/* Failure & Rejection History Section */}
                {((detail.failureHistory && detail.failureHistory.length > 0) || detail.failureReason || detail.rejectReason) ? (
                  <AdminDetailSection title="⚠️ Failure & Rejection History" className="admin-detail-full-width">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                      {detail.failureReason && (!detail.failureHistory || detail.failureHistory.length === 0) ? (
                        <div style={{
                          padding: '10px 14px',
                          borderRadius: '6px',
                          backgroundColor: '#fef2f2',
                          border: '1px solid #fecaca',
                          color: '#991b1b',
                          fontSize: '12px',
                          lineHeight: 1.5,
                        }}>
                          <div style={{ fontWeight: '700', marginBottom: '4px' }}>Latest Rejection / Failure Reason:</div>
                          <div style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{detail.failureReason}</div>
                        </div>
                      ) : null}

                      {detail.failureHistory && detail.failureHistory.length > 0 ? (
                        <AdminMiniTable
                          columns={[
                            {
                              key: 'timestamp',
                              label: 'Date & Time',
                              render: (r) => (
                                <span style={{ fontSize: '11px', color: '#475569', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                  {formatAdminDate(r.timestamp || r.date || r.createdAt)}
                                </span>
                              ),
                            },
                            {
                              key: 'status',
                              label: 'Status Code',
                              render: (r) => (
                                <span style={{
                                  display: 'inline-block',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: '#fee2e2',
                                  color: '#b91c1c',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  fontFamily: 'monospace'
                                }}>
                                  {r.status || r.code || 'FAILED'}
                                </span>
                              ),
                            },
                            {
                              key: 'reason',
                              label: 'Failure Reason / Error Detail',
                              render: (r) => (
                                <div style={{
                                  color: '#7f1d1d',
                                  fontSize: '12px',
                                  fontFamily: 'monospace',
                                  wordBreak: 'break-word',
                                  whiteSpace: 'pre-wrap'
                                }}>
                                  {r.reason || r.message || r.error || '—'}
                                </div>
                              ),
                            },
                          ]}
                          rows={detail.failureHistory}
                        />
                      ) : null}
                    </div>
                  </AdminDetailSection>
                ) : null}

                {/* Member Recent Transactions Section */}
                <AdminDetailSection title="Activity & Transaction History (입 / 출금 내역)" className="admin-detail-full-width">
                  {memberTxLoading ? (
                    <p className="admin-loading admin-loading--inline">Loading transactions…</p>
                  ) : memberTx && memberTx.length > 0 ? (
                    <AdminMiniTable
                      columns={[
                        {
                          key: 'id',
                          label: 'Tx ID',
                          render: (r) => {
                            const rawId = String(r.id ?? '');
                            const isCopied = copiedTxId === rawId;
                            return (
                              <button
                                type="button"
                                title={`Click to copy: ${rawId}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  try {
                                    navigator.clipboard?.writeText(rawId);
                                    setCopiedTxId(rawId);
                                    setTimeout(() => setCopiedTxId((curr) => (curr === rawId ? null : curr)), 1500);
                                  } catch {}
                                }}
                                style={{
                                  fontFamily: 'monospace',
                                  fontSize: '11px',
                                  color: '#0284c7',
                                  background: '#f0f9ff',
                                  border: '1px solid #bae6fd',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  whiteSpace: 'nowrap',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <span>{rawId.length > 12 ? `${rawId.slice(0, 6)}...${rawId.slice(-4)}` : rawId}</span>
                                <span style={{ fontSize: '10px' }}>{isCopied ? '✓' : '📋'}</span>
                              </button>
                            );
                          },
                        },
                        {
                          key: 'kind',
                          label: 'Type',
                          render: (r) => {
                            const k = String(r.kind || '').toLowerCase();
                            const isInflow = k === 'wallet_topup' || k === 'deposit' || k === 'refund';
                            const isSpend = k === 'card_spend' || k === 'payment';
                            
                            let label = 'Deposit';
                            let bg = '#f0fdf4';
                            let text = '#16a34a';
                            let border = '#bbf7d0';

                            if (k === 'wallet_withdraw' || k === 'withdraw') {
                              label = 'Withdrawal';
                              bg = '#fff7ed';
                              text = '#ea580c';
                              border = '#fed7aa';
                            } else if (isSpend) {
                              label = 'Card Spend';
                              bg = '#fdf2f8';
                              text = '#db2777';
                              border = '#fbcfe8';
                            } else if (k === 'refund') {
                              label = 'Refund';
                              bg = '#eff6ff';
                              text = '#2563eb';
                              border = '#bfdbfe';
                            }

                            return (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '700',
                                backgroundColor: bg,
                                color: text,
                                border: `1px solid ${border}`
                              }}>
                                {isInflow ? '📥 ' : '📤 '}{label}
                              </span>
                            );
                          },
                        },
                        {
                          key: 'amount',
                          label: 'Amount (+ / -)',
                          render: (r) => {
                            const k = String(r.kind || '').toLowerCase();
                            const isInflow = k === 'wallet_topup' || k === 'deposit' || k === 'refund';
                            const sign = isInflow ? '+' : '-';
                            const color = isInflow ? '#16a34a' : '#dc2626';
                            const bg = isInflow ? '#f0fdf4' : '#fef2f2';
                            const border = isInflow ? '#bbf7d0' : '#fecaca';
                            const num = Math.abs(Number(r.amount) || 0).toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            });

                            return (
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '2px 8px',
                                borderRadius: '5px',
                                backgroundColor: bg,
                                border: `1px solid ${border}`,
                                fontWeight: '800',
                                fontSize: '12px',
                                color: color,
                                fontFamily: 'monospace',
                              }}>
                                <CurrencyBadgeMini currency={r.transCurrency || r.originalCurrency || r.currency} />
                                <span>{sign}{formatAmountWithCurrency(Math.abs(Number(r.transAmount ?? r.amount) || 0), r.transCurrency || r.originalCurrency || r.currency || '')}</span>
                              </div>
                            );
                          },
                        },
                        {
                          key: 'status',
                          label: 'Status',
                          render: (r) => <AdminStatusBadge status={r.status || 'success'} />,
                        },
                        {
                          key: 'at',
                          label: 'Date & Time',
                          render: (r) => (
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              {formatAdminDate(r.at)}
                            </span>
                          ),
                        },
                      ]}
                      rows={memberTx}
                    />
                  ) : (
                    <p className="admin-muted" style={{ paddingLeft: '8px', fontSize: '13px' }}>
                      No recent transactions found for this member.
                    </p>
                  )}
                </AdminDetailSection>

                <AdminDetailSection title="Admin memo" className="admin-detail-full-width">
                  <textarea
                    id="admin-member-memo"
                    name="adminMemo"
                    aria-label="Admin internal notes"
                    className="admin-textarea"
                    rows={4}
                    value={memoDraft}
                    onChange={(e) => setMemoDraft(e.target.value)}
                    placeholder="Internal notes…"
                  />
                  <button type="button" className="admin-btn admin-btn--ghost admin-btn--sm" onClick={() => handleAction('saveMemo')}>
                    Save memo
                  </button>
                </AdminDetailSection>

                <AdminActionStack className="admin-detail-full-width">
                  {hasNoWallet ? (
                    <button 
                      type="button" 
                      className="admin-btn admin-btn--primary" 
                      disabled={retryLoading}
                      style={{ 
                        backgroundColor: retryLoading ? '#94a3b8' : '#3b82f6', 
                        color: '#fff', 
                        fontWeight: 'bold',
                        cursor: retryLoading ? 'not-allowed' : 'pointer'
                      }} 
                      onClick={() => handleAction('retryWallet')}
                    >
                      {retryLoading ? '⏳ Generating Wallet...' : '⚡ Generate Wallet'}
                    </button>
                  ) : null}

                  {detail.accountStatus === 'suspended' ? (
                    <button type="button" className="admin-btn admin-btn--primary" onClick={() => handleAction('activate')}>
                      Reactivate member
                    </button>
                  ) : (
                    detail.accountStatus !== 'pending_wallet' && (
                      <button type="button" className="admin-btn admin-btn--warning" onClick={() => handleAction('suspend')}>
                        Suspend member
                      </button>
                    )
                  )}
                </AdminActionStack>

                {/* Dev-Only Simulated KYC Webhook Panel (운영상에서는 절대 미노출) */}
                {isDevEnv && (
                  <AdminDetailSection title="🧪 KYC Webhook Simulator (Dev Only)" className="admin-detail-full-width">
                    <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
                      [개발/테스트 전용] Wasabi KYC 인증 완료/반려 웹훅을 가상으로 시뮬레이션합니다. 운영 환경에서는 노출되지 않습니다.
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="admin-btn admin-btn--outline admin-btn--sm"
                        disabled={simulatingKyc}
                        onClick={() => handleAction('simulateKycSuccess')}
                        title="Wasabi KYC 승인(APPROVED) 웹훅을 가상으로 백엔드에 트리거합니다."
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: '700',
                          color: '#059669',
                          borderColor: '#a7f3d0',
                          backgroundColor: '#ecfdf5',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: simulatingKyc ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {simulatingKyc ? '⏳ Processing…' : '⚡ KYC Success (Approved)'}
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn--outline admin-btn--sm"
                        disabled={simulatingKyc}
                        onClick={() => handleAction('simulateKycFail')}
                        title="Wasabi KYC 반려/실패(REJECTED) 웹훅을 가상으로 백엔드에 트리거합니다."
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: '700',
                          color: '#dc2626',
                          borderColor: '#fca5a5',
                          backgroundColor: '#fef2f2',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: simulatingKyc ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {simulatingKyc ? '⏳ Processing…' : '✕ KYC Fail (Rejected)'}
                      </button>
                    </div>
                  </AdminDetailSection>
                )}
              </>
            ) : null}
          </AdminDetailPanel>
        ) : null}
      />
    </div>
  );
}
