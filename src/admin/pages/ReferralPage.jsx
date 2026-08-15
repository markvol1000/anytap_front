import { useCallback, useState } from 'react';
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

  // New Code Form State
  const [newCode, setNewCode] = useState('');
  const [newUserId, setNewUserId] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newRate, setNewRate] = useState('5.0');

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
    try {
      await createReferralCode({
        code: newCode.trim().toUpperCase(),
        userId: newUserId.trim() || undefined,
        description: newDesc.trim() || undefined,
        referralRatePercent: parseFloat(newRate) || 5.0,
        status: 'ACTIVE',
      });
      setShowCreateModal(false);
      setNewCode('');
      setNewUserId('');
      setNewDesc('');
      setNewRate('5.0');
      partnerList.reload();
      window.alert('Referral code created successfully.');
    } catch (err) {
      window.alert(err.message || 'Failed to create referral code.');
    }
  }, [newCode, newUserId, newDesc, newRate, partnerList]);

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
                searchPlaceholder="Search referral code or member…"
              />
              <AdminTableWrap loading={partnerList.loading} error={partnerList.error} hasData={partnerList.items.length > 0}>
                <AdminDataTable
                  columns={[
                    { key: 'referralCode', label: 'Referral Code', render: (r) => <strong style={{ color: '#2563eb' }}>{r.referralCode}</strong> },
                    { key: 'memberName', label: 'Owner / Partner' },
                    { key: 'rewardBalance', label: 'Balance', render: (r) => formatUsdt(r.rewardBalance) },
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
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#999', marginBottom: '4px' }}>Referral Code *</label>
                <input
                  type="text"
                  className="admin-input"
                  style={{ width: '100%' }}
                  placeholder="e.g. AT0002 or VIP_PARTNER"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  required
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#999', marginBottom: '4px' }}>Partner User ID (Optional)</label>
                <input
                  type="text"
                  className="admin-input"
                  style={{ width: '100%' }}
                  placeholder="e.g. M001 or login ID"
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#999', marginBottom: '4px' }}>Description / Partner Name</label>
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
