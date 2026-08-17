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

  // Date Range & Filtering State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [datePreset, setDatePreset] = useState('all');

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

  // List 1: Partners / Referral Codes (referral_codes table)
  const partnerList = useAdminList(fetchReferrals);

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

  // Filter Apply Callback
  const handleApplyFilter = useCallback(() => {
    partnerList.setFilter('startDate', startDate);
    partnerList.setFilter('endDate', endDate);
    memberList.setFilter('startDate', startDate);
    memberList.setFilter('endDate', endDate);
    ledgerList.setFilter('startDate', startDate);
    ledgerList.setFilter('endDate', endDate);
  }, [startDate, endDate, partnerList, memberList, ledgerList]);

  // Date Preset Quick Filter
  const handleDatePreset = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    let start = '';
    let end = now.toISOString().split('T')[0];

    if (preset === 'today') {
      start = end;
    } else if (preset === '7d') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      start = d.toISOString().split('T')[0];
    } else if (preset === '30d') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      start = d.toISOString().split('T')[0];
    } else if (preset === 'all') {
      start = '';
      end = '';
    }

    setStartDate(start);
    setEndDate(end);
    partnerList.setFilter('startDate', start);
    partnerList.setFilter('endDate', end);
    memberList.setFilter('startDate', start);
    memberList.setFilter('endDate', end);
    ledgerList.setFilter('startDate', start);
    ledgerList.setFilter('endDate', end);
  };

  // Summary Metrics
  const totalReferredDeposit = useMemo(() => {
    return (partnerList.items || []).reduce((acc, r) => acc + (Number(r.totalDeposit) || 0), 0);
  }, [partnerList.items]);

  const totalCommissionPaid = useMemo(() => {
    return (partnerList.items || []).reduce((acc, r) => acc + (Number(r.available) || 0) + (Number(r.pending) || 0), 0);
  }, [partnerList.items]);

  const totalReferredMembersCount = useMemo(() => {
    return (partnerList.items || []).reduce((acc, r) => acc + (Number(r.members) || 0), 0);
  }, [partnerList.items]);

  // Edit Referral Code Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTargetRow, setEditTargetRow] = useState(null);
  const [editCode, setEditCode] = useState('');
  const [editUserId, setEditUserId] = useState('');
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState('ACTIVE');
  const [editRate, setEditRate] = useState('5.0');

  const handleOpenEdit = (target) => {
    const r = target || detail;
    if (!r) return;
    setEditTargetRow(r);
    setEditCode(r.referralCode || r.code || '');
    setEditUserId(r.userId || r.user_id || '');
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
        userId: editUserId.trim(),
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
          userId: editUserId.trim(),
          memberName: editName.trim(),
          status: editStatus.toLowerCase(),
        } : null));
      }
      memberList?.reload?.();
      window.alert('Referral code row updated successfully!');
    } catch (err) {
      window.alert(err.message || 'Failed to update referral code.');
    }
  }, [editTargetRow, editCode, editUserId, editName, editStatus, editRate, partnerList, detail, setDetail, memberList]);

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
        title="Referral Management & Member Network"
        description="Track total referred deposits, view partner owner details, set date range filters, and manage referral payouts."
        actions={(
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={() => setShowCreateModal(true)}>
            + New Referral Code
          </button>
        )}
      />

      {/* ── TOP KPI SUMMARY CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <div className="admin-card" style={{ padding: '16px 20px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0, 0, 0, 0.06)' }}>
          <div style={{ fontSize: '12px', color: '#475569', marginBottom: '6px', fontWeight: '600' }}>💰 총 피추천 회원 입금액 (Total Deposit)</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#0284c7' }}>{formatUsdt(totalReferredDeposit)}</div>
        </div>
        <div className="admin-card" style={{ padding: '16px 20px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0, 0, 0, 0.06)' }}>
          <div style={{ fontSize: '12px', color: '#475569', marginBottom: '6px', fontWeight: '600' }}>🎁 총 발생/지급 수당 (Total Commission)</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#059669' }}>{formatUsdt(totalCommissionPaid)}</div>
        </div>
        <div className="admin-card" style={{ padding: '16px 20px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0, 0, 0, 0.06)' }}>
          <div style={{ fontSize: '12px', color: '#475569', marginBottom: '6px', fontWeight: '600' }}>🏷️ 추천인 코드 / 파트너 수</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#7c3aed' }}>{partnerList.total || partnerList.items.length} 개</div>
        </div>
        <div className="admin-card" style={{ padding: '16px 20px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0, 0, 0, 0.06)' }}>
          <div style={{ fontSize: '12px', color: '#475569', marginBottom: '6px', fontWeight: '600' }}>👥 연결 피추천 회원 총수</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#ea580c' }}>{totalReferredMembersCount} 명</div>
        </div>
      </div>

      {/* ── DATE RANGE & FILTER CONTROL BAR WITH SEARCH BUTTON ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', background: '#ffffff', padding: '14px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0, 0, 0, 0.06)', marginBottom: '16px' }}>
        <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>📅 기간 및 검색 조건 (Date & Filter):</span>
        
        {/* Preset Quick Buttons */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button type="button" className={`admin-btn ${datePreset === 'all' ? 'admin-btn--primary' : 'admin-btn--secondary'}`} style={{ padding: '4px 10px', fontSize: '12px', fontWeight: '600' }} onClick={() => handleDatePreset('all')}>전체</button>
          <button type="button" className={`admin-btn ${datePreset === 'today' ? 'admin-btn--primary' : 'admin-btn--secondary'}`} style={{ padding: '4px 10px', fontSize: '12px', fontWeight: '600' }} onClick={() => handleDatePreset('today')}>오늘</button>
          <button type="button" className={`admin-btn ${datePreset === '7d' ? 'admin-btn--primary' : 'admin-btn--secondary'}`} style={{ padding: '4px 10px', fontSize: '12px', fontWeight: '600' }} onClick={() => handleDatePreset('7d')}>최근 7일</button>
          <button type="button" className={`admin-btn ${datePreset === '30d' ? 'admin-btn--primary' : 'admin-btn--secondary'}`} style={{ padding: '4px 10px', fontSize: '12px', fontWeight: '600' }} onClick={() => handleDatePreset('30d')}>최근 30일</button>
        </div>

        {/* Date Inputs */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setDatePreset('custom'); }}
            style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500' }}
          />
          <span style={{ color: '#64748b', fontWeight: 'bold' }}>~</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setDatePreset('custom'); }}
            style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500' }}
          />
        </div>

        {/* Search Query Input */}
        <div style={{ flex: '1', minWidth: '200px' }}>
          <input
            type="text"
            placeholder="추천인 코드, 사용자 ID, 이메일 검색..."
            value={partnerList.search}
            onChange={(e) => {
              partnerList.setSearch(e.target.value);
              memberList.setSearch(e.target.value);
            }}
            style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '500' }}
          />
        </div>

        {/* Search Button */}
        <button
          type="button"
          className="admin-btn admin-btn--primary"
          style={{ padding: '6px 16px', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap' }}
          onClick={handleApplyFilter}
        >
          🔍 조회 (Search Filter)
        </button>
      </div>

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
                      label: 'User Email',
                      render: (r) => (
                        <span style={{ fontSize: '12px', color: '#0f172a', fontWeight: '500' }}>
                          {r.userEmail || '—'}
                        </span>
                      ),
                    },
                    { key: 'memberName', label: 'Owner / Partner Name' },
                    { key: 'joinDate', label: 'Joined', render: (r) => formatAdminDate(r.joinDate || r.createdAt || r.created_at) },
                    { key: 'totalDeposit', label: 'Total Deposit (총 입금액)', render: (r) => <strong style={{ color: '#38bdf8' }}>{formatUsdt(r.totalDeposit)}</strong> },
                    { key: 'available', label: 'Reward Balance', render: (r) => formatUsdt(r.available) },
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
                    <AdminDetailRow label="Total Member Deposit" value={<strong style={{ color: '#38bdf8' }}>{formatUsdt(detail.totalDeposit)}</strong>} />
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
                          { key: 'joinDate', label: 'Joined', render: (r) => formatAdminDate(r.joinDate || r.createdAt || r.created_at) },
                          { key: 'totalDeposit', label: 'Total Deposit (입금액)', render: (r) => <strong style={{ color: '#38bdf8' }}>{formatUsdt(r.totalDeposit)}</strong> },
                          { key: 'earnedCommission', label: 'Commission (발생 수당)', render: (r) => <strong style={{ color: '#10b981' }}>{formatUsdt(r.earnedCommission)}</strong> },
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

      {/* TAB 2: Commission Ledger (Paginated) */}
      {activeTab === 'ledger' && (
        <AdminPanel title="Commission Payout Ledger">
          <AdminFilterBar
            search={ledgerList.search}
            onSearchChange={ledgerList.setSearch}
            searchPlaceholder="Search member name, email or ID…"
          />
          <AdminTableWrap loading={ledgerList.loading} error={ledgerList.error} hasData={ledgerList.items.length > 0}>
            <AdminDataTable
              columns={[
                { key: 'userId', label: 'Member ID' },
                { key: 'memberName', label: 'Login ID / Name' },
                { key: 'email', label: 'Email' },
                { key: 'referralCode', label: 'Referral Code', render: (r) => <strong style={{ color: '#38bdf8' }}>{r.referralCode || '—'}</strong> },
                { key: 'amount', label: 'Commission Amount', render: (r) => <strong style={{ color: '#10b981' }}>{formatUsdt(r.amount)}</strong> },
                { key: 'status', label: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
                { key: 'createdAt', label: 'Payout Date', render: (r) => formatAdminDate(r.createdAt || r.payoutDate) },
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

      {/* Modal 1: New Referral Code Creation */}
      {showCreateModal && (
        <div className="admin-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="admin-modal" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal__header">
              <h3>Create New Referral Code (+ Member Match)</h3>
              <button type="button" className="admin-modal__close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateCode} className="admin-modal__body admin-form-grid">
              <div className="admin-form-group">
                <label>1. Search & Select ACTIVE Member (*)</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="Type member ID, name or email..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  style={{ marginBottom: '8px' }}
                />
                <div style={{ maxHeight: '140px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px', background: '#f8fafc' }}>
                  {filteredActiveMembers.length === 0 ? (
                    <div style={{ fontSize: '12px', color: '#94a3b8', padding: '8px' }}>No active members found.</div>
                  ) : (
                    filteredActiveMembers.slice(0, 10).map((mem) => {
                      const isSelected = newUserId === (mem.id || mem.userId);
                      return (
                        <div
                          key={mem.id || mem.userId}
                          style={{
                            padding: '8px 10px',
                            cursor: 'pointer',
                            borderRadius: '6px',
                            background: isSelected ? '#eff6ff' : 'transparent',
                            fontSize: '12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            border: isSelected ? '1px solid #3b82f6' : '1px solid transparent',
                          }}
                          onClick={() => handleSelectActiveMember(mem)}
                        >
                          <span><strong style={{ color: '#0f172a' }}>{mem.name || mem.loginId}</strong> ({mem.id || mem.userId})</span>
                          <span style={{ color: '#64748b' }}>{mem.email || '—'}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="admin-form-group">
                <label>Selected User ID (*)</label>
                <input type="text" className="admin-input" value={newUserId} readOnly style={{ background: '#f1f5f9', color: '#2563eb', fontWeight: 'bold' }} />
              </div>

              <div className="admin-form-group">
                <label>2. Referral Code (*)</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="e.g. PARTNER01"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  required
                />
              </div>

              <div className="admin-form-group">
                <label>Partner / Owner Description</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="e.g. Official VIP Partner"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>

              <div className="admin-form-group">
                <label>Commission Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="admin-input"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  placeholder="5.0"
                />
              </div>

              <div className="admin-modal__footer">
                <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setShowCreateModal(false)}>
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

      {/* Modal 2: Edit Referral Code Row */}
      {showEditModal && (
        <div className="admin-modal-backdrop" onClick={() => setShowEditModal(false)}>
          <div className="admin-modal" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal__header">
              <h3>Edit Referral Code ({editCode})</h3>
              <button type="button" className="admin-modal__close" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveEdit} className="admin-modal__body admin-form-grid">
              <div className="admin-form-group">
                <label>Referral Code (*)</label>
                <input
                  type="text"
                  className="admin-input"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                  required
                />
              </div>

              <div className="admin-form-group">
                <label>User ID (user_id) (*)</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="e.g. US512799 또는 회원 ID"
                  value={editUserId}
                  onChange={(e) => setEditUserId(e.target.value)}
                  required
                />
              </div>

              <div className="admin-form-group">
                <label>Owner / Partner Name (*)</label>
                <input
                  type="text"
                  className="admin-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className="admin-form-group">
                <label>Commission Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="admin-input"
                  value={editRate}
                  onChange={(e) => setEditRate(e.target.value)}
                />
              </div>

              <div className="admin-form-group">
                <label>Status</label>
                <select className="admin-select" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="PENDING">PENDING</option>
                </select>
              </div>

              <div className="admin-modal__footer">
                <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setShowEditModal(false)}>
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
