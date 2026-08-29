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
import { AdminStatusBadge, formatAdminDate, formatUsdt } from '../components/AdminStatusBadge.jsx';
import { runConfirm, useAdminConfirm } from '../components/AdminConfirmModal.jsx';
import { useAdminList } from '../hooks/useAdminList.js';
import { useAdminDetail } from '../hooks/useAdminDetail.js';
import {
  activateMember,
  deleteMember,
  getMemberById,
  getMemberCards,
  getMembers,
  saveMemberMemo,
  suspendMember,
  retryCregisWallet,
  triggerFeePayout,
  updateMember,
} from '../services/adminService.js';

const fetchMembers = (params) => getMembers(params);
const fetchMemberDetail = (id) => getMemberById(id);

export function MembersPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramId = searchParams.get('id') || searchParams.get('userId');

  const confirm = useAdminConfirm();
  const [selectedId, setSelectedId] = useState(null);
  const [memoDraft, setMemoDraft] = useState('');
  const [memberCards, setMemberCards] = useState([]);
  const [memberCardsLoading, setMemberCardsLoading] = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);
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
    } else {
      setMemberCards([]);
    }
  }, [detail?.id]);

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
      }
    } catch (err) {
      window.alert(`❌ Action error: ${err.message}`);
    }
  }, [confirm, detail, list, memoDraft, setDetail]);

  return (
    <div className="admin-page">
      <AdminPageHeader title="Members" description="Search, review, and manage member accounts." />

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
                  { key: 'id', label: 'Member ID' },
                  { key: 'name', label: 'Name' },
                  { key: 'email', label: 'Email' },
                  {
                    key: 'walletAddress',
                    label: 'Wallet Address',
                    render: (r) => {
                      const addr = r.cregisWalletAddress || r.walletAddress || r.depositAddress || '';
                      if (!addr || addr === '-') {
                        return <span style={{ color: '#64748b', fontSize: '11px' }}>—</span>;
                      }
                      return (
                        <span
                          title={`Click to copy: ${addr}`}
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            color: '#38bdf8',
                            background: 'rgba(56, 189, 248, 0.08)',
                            border: '1px solid rgba(56, 189, 248, 0.2)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
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
                  { key: 'walletBalance', label: 'Wallet (Actual) / Unpaid Fee', render: (r) => {
                    const avail = (Number(r.walletBalance) || 0).toFixed(2);
                    const actual = (Number(r.cregisActualBalance ?? r.walletBalance) || 0).toFixed(2);
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
                  } },
                  { key: 'referralStatus', label: 'Referral', render: (r) => <AdminStatusBadge status={r.referralStatus} /> },
                  { 
                    key: 'accountStatus', 
                    label: 'Account Status', 
                    render: (r) => {
                      const st = String(r.accountStatus || r.status || 'active').toLowerCase();
                      return (
                        <select
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
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            backgroundColor: st === 'active' ? '#ecfdf5' : st === 'suspended' ? '#fef2f2' : st === 'locked' ? '#fff7ed' : '#f1f5f9',
                            color: st === 'active' ? '#047857' : st === 'suspended' ? '#dc2626' : st === 'locked' ? '#c2410c' : '#475569',
                            border: st === 'active' ? '1px solid #a7f3d0' : st === 'suspended' ? '1px solid #fca5a5' : st === 'locked' ? '1px solid #ffedd5' : '1px solid #cbd5e1',
                            outline: 'none',
                          }}
                        >
                          <option value="active">🟢 Active</option>
                          <option value="suspended">🔴 Suspended</option>
                          <option value="locked">🟠 Locked</option>
                          <option value="pending">⚪ Pending</option>
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
        right={(
          <AdminDetailPanel title={detail ? detail.name : null}>
            {detailLoading && !detail ? <p className="admin-loading admin-loading--inline">Loading…</p> : null}
            {!detailLoading && detail ? (
              <>
                <AdminDetailSection title="Member info">
                  <AdminDetailRow label="Member ID" value={detail.id} />
                  <AdminDetailRow label="Email" value={detail.email} />
                  <AdminDetailRow label="Phone" value={detail.phone} />
                  <AdminDetailRow label="Country" value={detail.country} />
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
                      <span style={{ fontWeight: '600' }}>{formatUsdt(detail.walletBalance ?? 0)}</span>
                      <span style={{ color: 'var(--admin-text-muted, #888)' }}>
                        ({formatUsdt(detail.cregisActualBalance ?? detail.walletBalance ?? 0)}) / {formatUsdt(detail.unpaidTotalFee ?? 0)} Unpaid Fee
                      </span>
                    </div>
                  )} />
                  <AdminDetailRow label="Account Status" value={(
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <select
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
                      </select>
                      <AdminStatusBadge status={detail.accountStatus || detail.status} />
                    </div>
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

                <AdminDetailSection title="Issued Cards List">
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

                <AdminDetailSection title="Admin memo">
                  <textarea
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

                <AdminActionStack>
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
              </>
            ) : null}
          </AdminDetailPanel>
        )}
      />
    </div>
  );
}
