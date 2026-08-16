import { useCallback, useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  adjustReferralReward,
  createReferralCode,
  getCommissionLedger,
  getReferredMembers,
  getReferralById,
  getReferrals,
  getActiveMembers,
  updateReferralCode,
  updateMemberReferralCode,
} from '../services/adminService.js';

const fetchReferrals = (params) => getReferrals(params);
const fetchReferralDetail = (id) => getReferralById(id);

export function ReferralPage() {
  const navigate = useNavigate();
  const confirm = useAdminConfirm();
  const [activeTab, setActiveTab] = useState('partners'); // 'partners' | 'ledger'
  const [selectedId, setSelectedId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Active Users List for Referral Partner Registration
  const [activeMembers, setActiveMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');

  // New Code Form State
  const [newCode, setNewCode] = useState('');
  const [newUserId, setNewUserId] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newRate, setNewRate] = useState('5.0');

  useEffect(() => {
    if (showCreateModal) {
      getActiveMembers()
        .then((list) => setActiveMembers(list || []))
        .catch(() => setActiveMembers([]));
    }
  }, [showCreateModal]);

  const filteredActiveMembers = useMemo(() => {
    if (!memberSearch.trim()) return activeMembers;
    const q = memberSearch.toLowerCase().trim();
    return activeMembers.filter((m) => (
      (m.id && String(m.id).toLowerCase().includes(q)) ||
      (m.name && String(m.name).toLowerCase().includes(q)) ||
      (m.email && String(m.email).toLowerCase().includes(q)) ||
      (m.loginId && String(m.loginId).toLowerCase().includes(q))
    ));
  }, [activeMembers, memberSearch]);

  const existingReferralUserIds = useMemo(() => {
    const set = new Set();
    (partnerList.items || []).forEach((r) => {
      if (r.userId && r.userId !== '—') set.add(String(r.userId).toLowerCase());
    });
    return set;
  }, [partnerList.items]);

  const existingReferralEmails = useMemo(() => {
    const set = new Set();
    (partnerList.items || []).forEach((r) => {
      if (r.userEmail && r.userEmail !== '—') set.add(String(r.userEmail).toLowerCase());
    });
    return set;
  }, [partnerList.items]);

  const handleSelectActiveMember = (mem) => {
    if (!mem) return;
    const memId = String(mem.id || mem.userId || '').toLowerCase();
    const memEmail = String(mem.email || '').toLowerCase();
    if (existingReferralUserIds.has(memId) || (memEmail && existingReferralEmails.has(memEmail))) {
      window.alert(`⚠️ 이 회원 (User ID: ${mem.id || mem.userId}, Email: ${mem.email || '—'})은 이미 추천인 코드가 등록되어 있습니다.\n동일한 회원/이메일로는 중복 추천인 등록이 불가능합니다.`);
      setNewUserId('');
      setNewDesc('');
      return;
    }
    setNewUserId(mem.id || mem.userId || '');
    setNewDesc(mem.name || mem.email || '');
    if (!newCode) {
      const codeSuggest = `REF_${(mem.id || '00').slice(-4).toUpperCase()}`;
      setNewCode(codeSuggest);
    }
  };

  // List 1: Partners / Referral Codes (referral_codes table)
  const partnerList = useAdminList(fetchReferrals);
  const { detail, loading: detailLoading, setDetail } = useAdminDetail(fetchReferralDetail, selectedId);

  // Selected Referral Code (default to selected row or first item's code or 'ALL')
  const selectedCode = detail?.referralCode || detail?.code || (partnerList.items[0]?.referralCode) || 'ALL';

  // List 2: Referred Members for the selected referral code (Paginated)
  const memberFetcher = useCallback(
    (params) => getReferredMembers(selectedCode, params),
    [selectedCode]
  );
  const memberList = useAdminList(memberFetcher);

  // List 3: Commission Ledger (Paginated)
  const ledgerFetcher = useCallback((params) => getCommissionLedger(params), []);
  const ledgerList = useAdminList(ledgerFetcher);

  // Edit Referral Code Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTargetRow, setEditTargetRow] = useState(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState('ACTIVE');
  const [editRate, setEditRate] = useState('5.0');

  const handleOpenEdit = (target) => {
    const r = target || detail;
    if (!r) return;
    setEditTargetRow(r);
    setEditCode(r.referralCode || r.code || '');
    setEditName(r.memberName || r.name || r.description || '');
    setEditStatus((r.status || 'ACTIVE').toUpperCase());
    setEditRate(r.referralRatePercent != null ? String(r.referralRatePercent) : '5.0');
    setShowEditModal(true);
  };

  const handleSaveEdit = useCallback(async (e) => {
    e.preventDefault();
    if (!editTargetRow) return;
    const targetId = editTargetRow.id || editTargetRow.referralCode;
    try {
      await updateReferralCode(targetId, {
        referralCode: editCode.trim().toUpperCase(),
        memberName: editName.trim(),
        status: editStatus.toLowerCase(),
        referralRatePercent: parseFloat(editRate) || 5.0,
      });
      setShowEditModal(false);
      partnerList.reload();
      if (setDetail && (detail?.id === targetId || detail?.referralCode === targetId)) {
        setDetail((prev) => (prev ? {
          ...prev,
          referralCode: editCode.trim().toUpperCase(),
          memberName: editName.trim(),
          status: editStatus.toLowerCase(),
        } : null));
      }
      memberList?.reload?.();
      window.alert('Referral code row updated successfully!');
    } catch (err) {
      window.alert(err.message || 'Failed to update referral code.');
    }
  }, [editTargetRow, editCode, editName, editStatus, editRate, partnerList, detail, setDetail, memberList]);

  const handleCreateCode = useCallback(async (e) => {
    e.preventDefault();
    if (!newCode.trim()) {
      window.alert('Please enter a referral code.');
      return;
    }
    if (!newUserId.trim()) {
      window.alert('Please search and select an ACTIVE member.');
      return;
    }

    const targetUid = newUserId.trim().toLowerCase();
    if (existingReferralUserIds.has(targetUid)) {
      window.alert(`⚠️ 이 회원 (User ID: ${newUserId})은 이미 추천인 코드가 등록되어 있습니다.\n동일한 회원/이메일로는 중복 추천인 등록이 불가능합니다.`);
      return;
    }

    try {
      await createReferralCode({
        code: newCode.trim().toUpperCase(),
        userId: newUserId.trim(),
        description: newDesc.trim() || undefined,
        referralRatePercent: parseFloat(newRate) || 5.0,
        status: 'ACTIVE',
      });
      setShowCreateModal(false);
      setNewCode('');
      setNewUserId('');
      setNewDesc('');
      setNewRate('5.0');
      setMemberSearch('');
      partnerList.reload();
      window.alert(`Referral code '${newCode.trim().toUpperCase()}' created for active member ${newUserId}!`);
    } catch (err) {
      window.alert(err.message || 'Failed to create referral code.');
    }
  }, [newCode, newUserId, newDesc, newRate, existingReferralUserIds, partnerList]);

  const handleAdjust = useCallback(async () => {
    if (!detail) return;
    const input = await runConfirm(confirm, {
      title: 'Reward adjustment',
      message: 'Enter adjustment amount (USDT). Use negative values to deduct.',
      confirmLabel: 'Apply',
      showInput: true,
      inputPlaceholder: 'e.g. 10 or -5',
    });
    if (input == null || input === '') return;
    const amount = parseFloat(input);
    if (Number.isNaN(amount)) {
      window.alert('Invalid amount');
      return;
    }
    const updated = await adjustReferralReward(detail.id, amount);
    setDetail(updated);
    partnerList.reload();
  }, [confirm, detail, partnerList, setDetail]);

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Referral List"
        description="Manage referral codes, view partner owner details, and track referred users."
        actions={(
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={() => setShowCreateModal(true)}>
            + New Referral Code
          </button>
        )}
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
        <button
          type="button"
          className={`admin-btn ${activeTab === 'partners' ? 'admin-btn--primary' : 'admin-btn--secondary'}`}
          onClick={() => setActiveTab('partners')}>
          Referral List & Member Networks
        </button>
        <button
          type="button"
          className={`admin-btn ${activeTab === 'ledger' ? 'admin-btn--primary' : 'admin-btn--secondary'}`}
          onClick={() => setActiveTab('ledger')}>
          Commission Payout Ledger
        </button>
      </div>

      {/* TAB 1: Referral List & Member Networks */}
      {activeTab === 'partners' && (
        <AdminSplitLayout
          left={(
            <AdminPanel title="Referral List">
              <AdminFilterBar
                search={partnerList.search}
                onSearchChange={partnerList.setSearch}
                searchPlaceholder="Search code, user ID, email, or member…"
              />
              <AdminTableWrap loading={partnerList.loading} error={partnerList.error} hasData={partnerList.items.length > 0}>
                <AdminDataTable
                  columns={[
                    { key: 'referralCode', label: 'Referral Code', render: (r) => <strong style={{ color: '#38bdf8' }}>{r.referralCode}</strong> },
                    {
                      key: 'userId',
                      label: 'User ID (user_id)',
                      render: (r) => {
                        const uid = r.userId || '—';
                        if (!uid || uid === '—') return <span style={{ color: '#64748b' }}>—</span>;
                        return (
                          <Link
                            to={`/admin/members?id=${uid}`}
                            style={{ color: '#38bdf8', fontWeight: '700', textDecoration: 'underline' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {uid} ➔
                          </Link>
                        );
                      },
                    },
                    {
                      key: 'userEmail',
                      label: 'User Email (email)',
                      render: (r) => (
                        <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
                          {r.userEmail || '—'}
                        </span>
                      ),
                    },
                    { key: 'memberName', label: 'Owner / Partner Name' },
                    { key: 'available', label: 'Available', render: (r) => formatUsdt(r.available) },
                    { key: 'members', label: 'Referred Count' },
                    { key: 'status', label: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
                    {
                      key: 'actions',
                      label: 'Edit',
                      render: (r) => (
                        <button
                          type="button"
                          className="admin-btn admin-btn--secondary"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(r);
                          }}
                        >
                          ✏️ Edit
                        </button>
                      ),
                    },
                  ]}
                  rows={partnerList.items}
                  selectedId={selectedId}
                  onSelectRow={(r) => setSelectedId(r.id)}
                  sortKey={partnerList.sortKey}
                  sortDir={partnerList.sortDir}
                  onSort={partnerList.toggleSort}
                  page={partnerList.page}
                  totalPages={partnerList.totalPages}
                  total={partnerList.total}
                  onPageChange={partnerList.setPage}
                />
              </AdminTableWrap>
            </AdminPanel>
          )}
          right={(
            <AdminDetailPanel title={detail ? `Code: ${detail.referralCode} (${detail.memberName})` : 'Select a Referral Code'}>
              {detailLoading && !detail ? <p className="admin-loading admin-loading--inline">Loading detail…</p> : null}
              {!detailLoading && detail ? (
                <>
                  <AdminDetailSection title="Referral Code Detail">
                    <AdminDetailRow label="Referral Code" value={<strong style={{ fontSize: '15px', color: '#2563eb' }}>{detail.referralCode}</strong>} />
                    <AdminDetailRow label="Owner / Member" value={detail.memberName} />
                    <AdminDetailRow label="Reward Balance" value={formatUsdt(detail.rewardBalance)} />
                    <AdminDetailRow label="Available Amount" value={formatUsdt(detail.available)} />
                    <AdminDetailRow label="Pending Amount" value={formatUsdt(detail.pending)} />
                    <AdminDetailRow label="Referred Users" value={<span style={{ fontWeight: '700', color: '#10b981' }}>{detail.members} Users</span>} />
                    <AdminDetailRow label="Code Status" value={<AdminStatusBadge status={detail.status} />} />
                  </AdminDetailSection>

                  <AdminActionStack>
                    <button type="button" className="admin-btn admin-btn--primary" onClick={() => handleOpenEdit(detail)}>
                      ✏️ Edit Referral Code
                    </button>
                    <button type="button" className="admin-btn admin-btn--secondary" onClick={handleAdjust}>
                      Reward adjustment
                    </button>
                  </AdminActionStack>

                  {/* ── LOWER SECTION: Referred Users List for THIS Referral Code ── */}
                  <AdminDetailSection title={`👥 Users using '${detail.referralCode}' as Referrer`}>
                    <AdminFilterBar
                      search={memberList.search}
                      onSearchChange={memberList.setSearch}
                      searchPlaceholder="Search member name or email…"
                    />
                    <AdminTableWrap loading={memberList.loading} error={memberList.error} hasData={memberList.items.length > 0}>
                      <AdminDataTable
                        columns={[
                          {
                            key: 'id',
                            label: 'User ID',
                            render: (r) => {
                              const memId = r.id || r.userId;
                              return (
                                <Link
                                  to={`/admin/members?id=${memId}`}
                                  style={{ color: '#2563eb', fontWeight: '700', textDecoration: 'underline' }}
                                  title={`Open member ${memId} detail`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {memId} ➔
                                </Link>
                              );
                            },
                          },
                          {
                            key: 'name',
                            label: 'Name',
                            render: (r) => {
                              const memId = r.id || r.userId;
                              return (
                                <Link
                                  to={`/admin/members?id=${memId}`}
                                  style={{ color: 'inherit', fontWeight: '600' }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {r.name || r.memberName || 'Member'}
                                </Link>
                              );
                            },
                          },
                          { key: 'email', label: 'Email' },
                          { key: 'joinDate', label: 'Joined', render: (r) => formatAdminDate(r.joinDate || r.createdAt) },
                          { key: 'status', label: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
                        ]}
                        rows={memberList.items}
                        onSelectRow={(r) => {
                          const memId = r.id || r.userId;
                          if (memId) navigate(`/admin/members?id=${memId}`);
                        }}
                        sortKey={memberList.sortKey}
                        sortDir={memberList.sortDir}
                        onSort={memberList.toggleSort}
                        page={memberList.page}
                        totalPages={memberList.totalPages}
                        total={memberList.total}
                        onPageChange={memberList.setPage}
                      />
                    </AdminTableWrap>
                  </AdminDetailSection>
                </>
              ) : (
                <p className="admin-muted">Click any referral code on the left table to view details and referred users.</p>
              )}
            </AdminDetailPanel>
          )}
        />
      )}

      {/* TAB 2: Referred Members List (Paginated) */}
      {activeTab === 'members' && (
        <AdminPanel>
          <AdminFilterBar
            search={memberList.search}
            onSearchChange={memberList.setSearch}
            searchPlaceholder="Search member name, email or ID…"
          />
          <AdminTableWrap loading={memberList.loading} error={memberList.error} hasData={memberList.items.length > 0}>
            <AdminDataTable
              columns={[
                { key: 'userId', label: 'Member ID' },
                { key: 'memberName', label: 'Login ID / Name' },
                { key: 'email', label: 'Email' },
                { key: 'referralCode', label: 'Used Referral Code' },
                { key: 'cards', label: 'Cards' },
                { key: 'topUpUsdt', label: 'Top-up (USDT)', render: (r) => formatUsdt(r.topUpUsdt || 0) },
                { key: 'rewardUsdt', label: 'Generated Reward', render: (r) => formatUsdt(r.rewardUsdt || 0) },
                { key: 'joinedAt', label: 'Joined Date', render: (r) => formatAdminDate(r.joinedAt || r.createdAt) },
                { key: 'status', label: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
              ]}
              rows={memberList.items}
              sortKey={memberList.sortKey}
              sortDir={memberList.sortDir}
              onSort={memberList.toggleSort}
              page={memberList.page}
              totalPages={memberList.totalPages}
              total={memberList.total}
              onPageChange={memberList.setPage}
            />
          </AdminTableWrap>
        </AdminPanel>
      )}

      {/* TAB 3: Commission Ledger (Paginated) */}
      {activeTab === 'ledger' && (
        <AdminPanel>
          <AdminFilterBar
            search={ledgerList.search}
            onSearchChange={ledgerList.setSearch}
            searchPlaceholder="Search ledger records…"
          />
          <AdminTableWrap loading={ledgerList.loading} error={ledgerList.error} hasData={ledgerList.items.length > 0}>
            <AdminDataTable
              columns={[
                { key: 'id', label: 'Ledger ID' },
                { key: 'referralCode', label: 'Referral Code' },
                { key: 'memberId', label: 'Source Member' },
                { key: 'eventType', label: 'Event Type', render: (r) => r.eventType || 'CARD_TOPUP' },
                { key: 'grossAmount', label: 'Transaction Amount', render: (r) => formatUsdt(r.grossAmount || r.amount || 0) },
                { key: 'referrerAllowance', label: 'Earned Commission', render: (r) => formatUsdt(r.referrerAllowance || 0) },
                { key: 'createdAt', label: 'Date', render: (r) => formatAdminDate(r.createdAt || r.at) },
              ]}
              rows={ledgerList.items}
              sortKey={ledgerList.sortKey}
              sortDir={ledgerList.sortDir}
              onSort={ledgerList.toggleSort}
              page={ledgerList.page}
              totalPages={ledgerList.totalPages}
              total={ledgerList.total}
              onPageChange={ledgerList.setPage}
            />
          </AdminTableWrap>
        </AdminPanel>
      )}

      {/* Create Referral Code Modal */}
      {showCreateModal && (
        <div className="admin-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="admin-modal" style={{ background: '#1c1e24', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '24px', maxWidth: '440px', width: '90%', color: '#fff' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Create New Referral Code</h2>
            <form onSubmit={handleCreateCode}>
              {/* Select Active User Field (추천인 가입 조건: Active User) */}
              <div style={{ marginBottom: '14px', background: 'rgba(56, 189, 248, 0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#38bdf8', marginBottom: '6px', fontWeight: '600' }}>
                  Search & Select Active Member (활성 회원 검색) *
                </label>
                <input
                  type="text"
                  className="admin-input"
                  style={{ width: '100%', marginBottom: '8px', fontSize: '12px' }}
                  placeholder="Search by name, email, or user ID..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                />
                <select
                  className="admin-select"
                  style={{ width: '100%', padding: '8px 10px', fontSize: '12px', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '6px' }}
                  value={newUserId}
                  onChange={(e) => {
                    const selected = activeMembers.find((m) => String(m.id || m.userId) === e.target.value);
                    if (selected) handleSelectActiveMember(selected);
                    else setNewUserId(e.target.value);
                  }}
                  required
                >
                  <option value="">-- Select Active Member ({filteredActiveMembers.length} active) --</option>
                  {filteredActiveMembers.map((m) => (
                    <option key={m.id || m.userId} value={m.id || m.userId}>
                      [{m.id || m.userId}] {m.name || m.email || 'Member'} - {m.email || 'no email'}
                    </option>
                  ))}
                </select>
                {newUserId && (
                  <div style={{ marginTop: '6px', fontSize: '11px', color: '#34d399', fontWeight: '600' }}>
                    ✅ Selected Active User: {newUserId} ({newDesc})
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '4px', fontWeight: '600' }}>
                  Referral Code *
                </label>
                <input
                  type="text"
                  className="admin-input"
                  style={{ width: '100%', fontFamily: 'monospace', fontWeight: '700', color: '#38bdf8' }}
                  placeholder="e.g. AT003 or VIP_PARTNER"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  required
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '4px', fontWeight: '600' }}>
                  Owner / Partner Name
                </label>
                <input
                  type="text"
                  className="admin-input"
                  style={{ width: '100%' }}
                  placeholder="e.g. VIP Partner Channel A"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#999', marginBottom: '4px' }}>Commission Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="admin-input"
                  style={{ width: '100%' }}
                  placeholder="5.0"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary"
                  onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn admin-btn--primary">
                  Create Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Referral Code Row Modal */}
      {showEditModal && (
        <div className="admin-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="admin-modal" style={{ background: '#1c1e24', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '24px', maxWidth: '460px', width: '90%', color: '#fff' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>✏️ Edit Referral Code Row</h2>
            
            <form onSubmit={handleSaveEdit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '4px', fontWeight: '600' }}>
                  Referral Code *
                </label>
                <input
                  type="text"
                  className="admin-input"
                  style={{ width: '100%', fontFamily: 'monospace', fontWeight: '700', color: '#38bdf8' }}
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                  required
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '4px', fontWeight: '600' }}>
                  Owner / Partner Name
                </label>
                <input
                  type="text"
                  className="admin-input"
                  style={{ width: '100%' }}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. VIP Partner Channel A"
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '4px', fontWeight: '600' }}>
                  Code Status
                </label>
                <select
                  className="admin-select"
                  style={{ width: '100%', padding: '10px 12px', fontSize: '13px', fontWeight: '600', borderRadius: '8px', background: '#0f172a', color: '#fff', border: '1px solid #334155' }}
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  <option value="ACTIVE">ACTIVE (활성)</option>
                  <option value="INACTIVE">INACTIVE (비활성)</option>
                  <option value="SUSPENDED">SUSPENDED (정지)</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '4px', fontWeight: '600' }}>
                  Commission Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="admin-input"
                  style={{ width: '100%' }}
                  value={editRate}
                  onChange={(e) => setEditRate(e.target.value)}
                  placeholder="5.0"
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary"
                  onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn admin-btn--primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
