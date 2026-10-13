import { useState } from 'react';
import { AdminDataTable } from '../components/AdminDataTable.jsx';
import { AdminFilterBar, AdminPageHeader, AdminPanel, AdminTableWrap } from '../components/AdminFilterBar.jsx';
import {
  AdminDetailPanel,
  AdminDetailRow,
  AdminDetailSection,
  AdminSplitLayout,
} from '../components/AdminSplitLayout.jsx';
import { AdminStatusBadge, formatAdminDate } from '../components/AdminStatusBadge.jsx';
import { useAdminList } from '../hooks/useAdminList.js';
import { getBannedIps, banIpAddress, unbanIpAddress } from '../services/adminService.js';
import { Icon } from '../../components/ui.jsx';

const fetchBannedIps = (params) => getBannedIps(params);

export function IpBlacklistPage() {
  const [selectedId, setSelectedId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [unbanTarget, setUnbanTarget] = useState(null);
  const [banInputIp, setBanInputIp] = useState('');
  const [banInputReason, setBanInputReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const list = useAdminList(fetchBannedIps, {}, {
    initialSortKey: 'bannedAt',
    initialSortDir: 'desc',
  });
  const detail = list.items.find((r) => r.id === selectedId);

  const handleOpenBanModal = () => {
    setBanInputIp('');
    setBanInputReason('');
    setModalOpen(true);
  };

  const handleExecuteBan = async (e) => {
    e.preventDefault();
    if (!banInputIp.trim()) return;

    setActionLoading(true);
    try {
      await banIpAddress(banInputIp.trim(), banInputReason.trim());
      setFeedback({ type: 'success', message: `IP ${banInputIp.trim()} has been successfully blacklisted.` });
      setModalOpen(false);
      list.reload();
    } catch (err) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to blacklist IP address.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmUnban = async () => {
    if (!unbanTarget) return;

    setActionLoading(true);
    try {
      await unbanIpAddress(unbanTarget.ipAddress);
      setFeedback({ type: 'success', message: `IP ${unbanTarget.ipAddress} has been successfully unbanned.` });
      setUnbanTarget(null);
      list.reload();
    } catch (err) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to unban IP address.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickReban = async (ip, reason) => {
    setActionLoading(true);
    try {
      await banIpAddress(ip, reason || 'Re-banned by administrator');
      setFeedback({ type: 'success', message: `IP ${ip} has been re-banned.` });
      list.reload();
    } catch (err) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to ban IP address.' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="IP Blacklist & Access Control"
        description="Audit trail of blocked and auto-banned IP addresses. Enforce real-time perimeter defense."
        actions={(
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={handleOpenBanModal}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Icon name="plus" size={15} />
            <span>Ban IP Address</span>
          </button>
        )}
      />

      {feedback && (
        <div
          style={{
            margin: '0 0 16px',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: feedback.type === 'error' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(34, 197, 94, 0.12)',
            color: feedback.type === 'error' ? '#ef4444' : '#22c55e',
            border: `1px solid ${feedback.type === 'error' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(34, 197, 94, 0.25)'}`,
          }}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '16px' }}
          >
            ×
          </button>
        </div>
      )}

      <AdminSplitLayout
        left={(
          <AdminPanel>
            <AdminFilterBar
              search={list.search}
              onSearchChange={list.setSearch}
              searchPlaceholder="Search IP address, reason, account…"
              filters={[
                {
                  key: 'status',
                  label: 'Status',
                  value: list.filters?.status ?? 'all',
                  onChange: (val) => list.setFilter('status', val),
                  options: [
                    { value: 'all', label: 'All Statuses' },
                    { value: 'ACTIVE', label: 'Active (Banned)' },
                    { value: 'INACTIVE', label: 'Inactive (Unbanned)' },
                  ],
                },
              ]}
            />
            <AdminTableWrap loading={list.loading} error={list.error} hasData={list.items.length > 0}>
              <AdminDataTable
                columns={[
                  {
                    key: 'ipAddress',
                    label: 'IP Address',
                    sortable: true,
                    render: (r) => (
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          fontSize: '13px',
                          color: '#0f172a',
                          letterSpacing: '0.02em',
                        }}
                      >
                        {r.ipAddress}
                      </span>
                    ),
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    sortable: true,
                    render: (r) => (
                      <AdminStatusBadge
                        status={r.isActive ? 'suspended' : 'active'}
                        label={r.isActive ? 'BANNED' : 'UNBANNED'}
                      />
                    ),
                  },
                  {
                    key: 'reason',
                    label: 'Reason / Detection',
                    sortable: true,
                    render: (r) => (
                      <span
                        title={r.reason || '—'}
                        style={{
                          fontSize: '12px',
                          fontWeight: 500,
                          color: '#1e293b',
                          maxWidth: '220px',
                          display: 'inline-block',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          verticalAlign: 'middle',
                        }}
                      >
                        {r.reason || '—'}
                      </span>
                    ),
                  },
                  {
                    key: 'attemptedAccount',
                    label: 'Target Account',
                    sortable: true,
                    render: (r) => (
                      <span
                        title={r.attemptedAccount || '—'}
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: r.attemptedAccount && r.attemptedAccount !== '—' ? '#b45309' : '#64748b',
                          maxWidth: '140px',
                          display: 'inline-block',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          verticalAlign: 'middle',
                        }}
                      >
                        {r.attemptedAccount || '—'}
                      </span>
                    ),
                  },
                  {
                    key: 'bannedBy',
                    label: 'Origin',
                    sortable: true,
                    render: (r) => (
                      <span
                        title={r.bannedBy || 'ADMIN'}
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: '3px',
                          backgroundColor: r.bannedBy === 'AUTO_DETECTION' ? '#fee2e2' : '#e0f2fe',
                          color: r.bannedBy === 'AUTO_DETECTION' ? '#991b1b' : '#0369a1',
                          border: `1px solid ${r.bannedBy === 'AUTO_DETECTION' ? '#fca5a5' : '#bae6fd'}`,
                          letterSpacing: '0.02em',
                          lineHeight: 1.2,
                          display: 'inline-block',
                        }}
                      >
                        {r.bannedBy === 'AUTO_DETECTION' ? 'AUTO' : (r.bannedBy || 'ADMIN')}
                      </span>
                    ),
                  },
                  {
                    key: 'bannedAt',
                    label: 'Banned At',
                    sortable: true,
                    render: (r) => (
                      <span style={{ fontSize: '12px', fontWeight: 500, color: '#334155', whiteSpace: 'nowrap' }}>
                        {formatAdminDate(r.bannedAt || r.createdAt)}
                      </span>
                    ),
                  },
                  {
                    key: 'actions',
                    label: 'Actions',
                    render: (r) => (
                      r.isActive ? (
                        <button
                          type="button"
                          className="admin-btn admin-btn--secondary"
                          style={{
                            padding: '3px 8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#0f172a',
                            borderColor: '#cbd5e1',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setUnbanTarget(r);
                          }}
                        >
                          Unban
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="admin-btn admin-btn--secondary"
                          style={{
                            padding: '3px 8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#b91c1c',
                            borderColor: '#fca5a5',
                            backgroundColor: '#fef2f2',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickReban(r.ipAddress, r.reason);
                          }}
                        >
                          Re-ban
                        </button>
                      )
                    ),
                  },
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
                renderMobileCard={(r) => (
                  <>
                    <div className="admin-mobile-card__row1">
                      <div className="admin-mobile-card__left">
                        <span className="admin-mobile-card__title" style={{ fontFamily: 'monospace' }}>{r.ipAddress}</span>
                        <AdminStatusBadge
                          status={r.isActive ? 'suspended' : 'active'}
                          label={r.isActive ? 'BANNED' : 'UNBANNED'}
                        />
                        <span
                          title={r.bannedBy || 'ADMIN'}
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '3px',
                            backgroundColor: r.bannedBy === 'AUTO_DETECTION' ? '#fee2e2' : '#e0f2fe',
                            color: r.bannedBy === 'AUTO_DETECTION' ? '#991b1b' : '#0369a1',
                            border: `1px solid ${r.bannedBy === 'AUTO_DETECTION' ? '#fca5a5' : '#bae6fd'}`,
                            letterSpacing: '0.02em',
                            lineHeight: 1.2,
                          }}
                        >
                          {r.bannedBy === 'AUTO_DETECTION' ? 'AUTO' : (r.bannedBy || 'ADMIN')}
                        </span>
                      </div>

                      <div style={{ flexShrink: 0 }}>
                        {r.isActive ? (
                          <button
                            type="button"
                            className="admin-btn admin-btn--secondary"
                            style={{
                              padding: '3px 8px',
                              fontSize: '11px',
                              fontWeight: 600,
                              color: '#0f172a',
                              borderColor: '#cbd5e1',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setUnbanTarget(r);
                            }}
                          >
                            Unban
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="admin-btn admin-btn--secondary"
                            style={{
                              padding: '3px 8px',
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#b91c1c',
                              borderColor: '#fca5a5',
                              backgroundColor: '#fef2f2',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickReban(r.ipAddress, r.reason);
                            }}
                          >
                            Re-ban
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="admin-mobile-card__row2">
                      <span className="admin-mobile-card__detail" title={r.reason || ''}>
                        {r.reason || '—'}
                      </span>
                      {r.attemptedAccount && r.attemptedAccount !== '—' && (
                        <>
                          <span style={{ color: '#cbd5e1' }}>•</span>
                          <span className="admin-mobile-card__meta" title={r.attemptedAccount}>
                            {r.attemptedAccount}
                          </span>
                        </>
                      )}
                      <span style={{ color: '#cbd5e1' }}>•</span>
                      <span className="admin-mobile-card__date">
                        {formatAdminDate(r.bannedAt || r.createdAt)}
                      </span>
                    </div>
                  </>
                )}
              />
            </AdminTableWrap>
          </AdminPanel>
        )}
        right={(
          <AdminDetailPanel title="IP Blacklist Detail">
            {detail ? (
              <>
                <AdminDetailSection title="Security Perimeter Info">
                  <AdminDetailRow
                    label="IP Address"
                    value={
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          fontSize: '14px',
                          color: '#0f172a',
                        }}
                      >
                        {detail.ipAddress}
                      </span>
                    }
                  />
                  <AdminDetailRow
                    label="Status"
                    value={(
                      <AdminStatusBadge
                        status={detail.isActive ? 'suspended' : 'active'}
                        label={detail.isActive ? 'BANNED' : 'UNBANNED'}
                      />
                    )}
                  />
                  <AdminDetailRow
                    label="Reason"
                    value={
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>
                        {detail.reason || '—'}
                      </span>
                    }
                  />
                  <AdminDetailRow
                    label="Target Account"
                    value={
                      <span
                        style={{
                          fontWeight: 600,
                          color: detail.attemptedAccount && detail.attemptedAccount !== '—' ? '#b45309' : '#64748b',
                        }}
                      >
                        {detail.attemptedAccount || '—'}
                      </span>
                    }
                  />
                  <AdminDetailRow
                    label="Banned By"
                    value={
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: detail.bannedBy === 'AUTO_DETECTION' ? '#fee2e2' : '#e0f2fe',
                          color: detail.bannedBy === 'AUTO_DETECTION' ? '#991b1b' : '#0369a1',
                          border: `1px solid ${detail.bannedBy === 'AUTO_DETECTION' ? '#fca5a5' : '#bae6fd'}`,
                        }}
                      >
                        {detail.bannedBy || 'ADMIN'}
                      </span>
                    }
                  />
                  <AdminDetailRow
                    label="Banned Date"
                    value={
                      <span style={{ fontWeight: 600, color: '#334155' }}>
                        {formatAdminDate(detail.bannedAt || detail.createdAt)}
                      </span>
                    }
                  />
                  {detail.expiresAt && (
                    <AdminDetailRow
                      label="Expires At"
                      value={
                        <span style={{ fontWeight: 600, color: '#334155' }}>
                          {formatAdminDate(detail.expiresAt)}
                        </span>
                      }
                    />
                  )}
                </AdminDetailSection>

                <div style={{ marginTop: '20px', display: 'flex', gap: '8px' }}>
                  {detail.isActive ? (
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary"
                      onClick={() => setUnbanTarget(detail)}
                      disabled={actionLoading}
                      style={{ width: '100%' }}
                    >
                      Unban This IP
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="admin-btn admin-btn--primary"
                      onClick={() => handleQuickReban(detail.ipAddress, detail.reason)}
                      disabled={actionLoading}
                      style={{ width: '100%' }}
                    >
                      Re-ban This IP
                    </button>
                  )}
                </div>
              </>
            ) : null}
          </AdminDetailPanel>
        )}
      />

      {/* Manual Ban Modal */}
      {modalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div
            className="admin-modal"
            style={{ maxWidth: 460, width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#f8fafc' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal__header" style={{ borderBottomColor: '#334155' }}>
              <h3 className="admin-modal__title" style={{ color: '#f8fafc' }}>
                Ban IP Address
              </h3>
              <button
                type="button"
                className="admin-modal__close"
                onClick={() => setModalOpen(false)}
                style={{ background: '#0f172a', borderColor: '#334155', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>
            <p className="admin-modal__msg" style={{ color: '#94a3b8' }}>
              Enter an IPv4 address to add to the database blacklist. Traffic from this IP will be immediately blocked across all instances.
            </p>

            <form onSubmit={handleExecuteBan}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  IP Address <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 192.168.1.100"
                  value={banInputIp}
                  onChange={(e) => setBanInputIp(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #334155',
                    background: '#0f172a',
                    color: '#f8fafc',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Reason / Threat Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Brute-force probing, unauthorized intrusion"
                  value={banInputReason}
                  onChange={(e) => setBanInputReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #334155',
                    background: '#0f172a',
                    color: '#f8fafc',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div className="admin-modal__footer" style={{ borderTopColor: '#334155' }}>
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary"
                  onClick={() => setModalOpen(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn--primary"
                  disabled={actionLoading || !banInputIp.trim()}
                  style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}
                >
                  {actionLoading ? 'Banning...' : 'Confirm Ban'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unban Confirmation Modal */}
      {unbanTarget && (
        <div className="admin-modal-backdrop" onClick={() => setUnbanTarget(null)}>
          <div
            className="admin-modal"
            style={{ maxWidth: 440, width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#f8fafc' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal__header" style={{ borderBottomColor: '#334155' }}>
              <h3 className="admin-modal__title" style={{ color: '#f8fafc' }}>
                Unban IP Address
              </h3>
              <button
                type="button"
                className="admin-modal__close"
                onClick={() => setUnbanTarget(null)}
                style={{ background: '#0f172a', borderColor: '#334155', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>
            <p className="admin-modal__msg" style={{ color: '#94a3b8' }}>
              Are you sure you want to unban IP <strong style={{ color: '#f1f5f9', fontFamily: 'monospace' }}>{unbanTarget.ipAddress}</strong>? Traffic from this IP address will be permitted immediately.
            </p>
            <div className="admin-modal__footer" style={{ borderTopColor: '#334155' }}>
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => setUnbanTarget(null)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                onClick={handleConfirmUnban}
                disabled={actionLoading}
              >
                {actionLoading ? 'Unbanning...' : 'Confirm Unban'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
