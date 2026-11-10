import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminMiniTable } from '../components/AdminDataTable.jsx';
import { AdminPanel, AdminPagination, AdminPageHeader } from '../components/AdminFilterBar.jsx';
import { AdminStatusBadge, formatAdminDate, formatUsdt } from '../components/AdminStatusBadge.jsx';
import {
  AdminDetailPanel,
  AdminDetailRow,
  AdminDetailSection,
} from '../components/AdminSplitLayout.jsx';
import {
  AdminChartDateFilter,
  AdminDashSection,
  AdminDashTabs,
  AdminRequestDistributionChart,
} from '../components/dashboard/AdminDashboardBlocks.jsx';
import {
  getDashboardData,
  getKycById,
  getCardById,
  getWithdrawalById,
  getBannedIps,
  getLoginLogs,
} from '../services/adminService.js';

function getPresetDates(presetId) {
  const today = new Date();
  const format = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const todayStr = format(today);

  if (presetId === 'today') {
    return { start: todayStr, end: todayStr };
  }
  if (presetId === '7d') {
    const d = new Date(today);
    d.setDate(d.getDate() - 6);
    return { start: format(d), end: todayStr };
  }
  if (presetId === '1m') {
    const d = new Date(today);
    d.setMonth(d.getMonth() - 1);
    return { start: format(d), end: todayStr };
  }
  return { start: '', end: '' };
}

const REQUEST_TABS = [
  { id: 'all', label: 'All' },
  { id: 'kyc', label: 'KYC' },
  { id: 'card', label: 'Card' },
  { id: 'withdrawal', label: 'Withdrawal' },
];

const REQUEST_PAGE_SIZE = 10;

export function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requestTab, setRequestTab] = useState('all');
  const [requestPage, setRequestPage] = useState(1);

  // Request detail modal states
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestDetail, setRequestDetail] = useState(null);
  const [requestDetailLoading, setRequestDetailLoading] = useState(false);

  const handleSelectRequest = async (row) => {
    setSelectedRequest(row);
    setRequestDetail(null);
    setRequestDetailLoading(true);

    try {
      const targetId = row.id || row.memberId;
      if (row.type === 'kyc') {
        const res = await getKycById(targetId);
        setRequestDetail(res);
      } else if (row.type === 'card') {
        const res = await getCardById(targetId);
        setRequestDetail(res);
      } else if (row.type === 'withdrawal') {
        const res = await getWithdrawalById(targetId);
        setRequestDetail(res);
      }
    } catch (err) {
      console.error('Failed to load request detail:', err);
    } finally {
      setRequestDetailLoading(false);
    }
  };

  const handleCloseRequestModal = () => {
    setSelectedRequest(null);
    setRequestDetail(null);
  };

  // Default to 7 days
  const default7d = getPresetDates('7d');
  const [chartPreset, setChartPreset] = useState('7d');
  const [chartStartDate, setChartStartDate] = useState(default7d.start);
  const [chartEndDate, setChartEndDate] = useState(default7d.end);
  const [activeDateFilter, setActiveDateFilter] = useState({ start: default7d.start, end: default7d.end });

  // Security status states
  const [bannedIps, setBannedIps] = useState([]);
  const [loginAuditLogs, setLoginAuditLogs] = useState([]);
  const [securityLoading, setSecurityLoading] = useState(false);

  const handleChartPresetChange = (presetId) => {
    setChartPreset(presetId);
    const { start, end } = getPresetDates(presetId);
    setChartStartDate(start);
    setChartEndDate(end);
    setActiveDateFilter({ start, end });
  };

  const handleApplyCustomDates = () => {
    setActiveDateFilter({ start: chartStartDate, end: chartEndDate });
  };

  const reloadDashboard = () => {
    setLoading(true);
    setSecurityLoading(true);

    getDashboardData()
      .then(setData)
      .finally(() => setLoading(false));

    Promise.all([
      getBannedIps({ page: 1, pageSize: 200 }),
      getLoginLogs({ page: 1, pageSize: 200 }),
    ])
      .then(([bannedRes, loginRes]) => {
        setBannedIps(bannedRes?.items || bannedRes || []);
        setLoginAuditLogs(loginRes?.items || loginRes || []);
      })
      .catch((err) => {
        console.warn('Failed to load security metrics:', err);
      })
      .finally(() => setSecurityLoading(false));
  };

  useEffect(() => {
    reloadDashboard();
  }, []);

  const kycRows = data?.recentRequests?.kyc ?? [];
  const cardRows = data?.recentRequests?.card ?? [];
  const withdrawalRows = data?.recentRequests?.withdrawal ?? [];

  const isRowInChartDateRange = (row) => {
    const { start, end } = activeDateFilter;
    if (!start && !end) return true;

    const rawDate = row.submittedAt || row.created || row.at || row.createdAt || row.date;
    if (!rawDate) return true;

    const ts = new Date(rawDate).getTime();
    if (Number.isNaN(ts)) return true;

    if (start) {
      const startMs = new Date(`${start}T00:00:00`).getTime();
      if (ts < startMs) return false;
    }
    if (end) {
      const endMs = new Date(`${end}T23:59:59.999`).getTime();
      if (ts > endMs) return false;
    }
    return true;
  };

  const chartKycRows = kycRows.filter(isRowInChartDateRange);
  const chartCardRows = cardRows.filter(isRowInChartDateRange);
  const chartWithdrawalRows = withdrawalRows.filter(isRowInChartDateRange);

  // Security status metrics calculation
  const filteredBannedIps = bannedIps.filter((item) => {
    const rawDate = item.bannedAt || item.createdAt;
    return isRowInChartDateRange({ at: rawDate });
  });

  const filteredLoginLogs = loginAuditLogs.filter((item) => {
    const rawDate = item.createdAt || item.at;
    return isRowInChartDateRange({ at: rawDate });
  });

  const failedLogins = filteredLoginLogs.filter((l) => l.status === 'FAILED' || l.status === 'suspended');
  const autoDetectedBans = filteredBannedIps.filter((b) => b.bannedBy === 'AUTO_DETECTION');
  const activeBansCount = filteredBannedIps.filter((b) => b.isActive).length;

  let requestRows = [];
  if (requestTab === 'all') {
    requestRows = [...kycRows, ...cardRows, ...withdrawalRows];
  } else {
    requestRows = data?.recentRequests?.[requestTab] ?? [];
  }

  // Sort by date descending
  requestRows.sort((a, b) => {
    const timeA = new Date(a.at || 0).getTime();
    const timeB = new Date(b.at || 0).getTime();
    return timeB - timeA;
  });

  const totalRequestCount = requestRows.length;
  const totalRequestPages = Math.ceil(totalRequestCount / REQUEST_PAGE_SIZE) || 1;
  const safeRequestPage = Math.min(Math.max(1, requestPage), totalRequestPages);

  const paginatedRequestRows = requestRows.slice(
    (safeRequestPage - 1) * REQUEST_PAGE_SIZE,
    safeRequestPage * REQUEST_PAGE_SIZE
  );

  const requestTabCounts = {
    all: (kycRows.filter((r) => r.status === 'pending').length) +
         (cardRows.filter((r) => r.status === 'pending').length) +
         (withdrawalRows.filter((r) => r.status === 'pending').length),
    kyc: kycRows.filter((r) => r.status === 'pending').length,
    card: cardRows.filter((r) => r.status === 'pending').length,
    withdrawal: withdrawalRows.filter((r) => r.status === 'pending').length,
  };

  return (
    <div className="admin-page admin-page--dashboard">
      <AdminPageHeader
        title="Dashboard"
        description="Real-time operational summary, review tasks, volume trends, and request breakdown."
        onRefresh={reloadDashboard}
        refreshing={loading}
      />

      {loading ? <p className="admin-loading">Loading…</p> : null}

      {data ? (
        <>
          {/* TOP OVERVIEW: 2 COLUMNS (LEFT: REQUEST DISTRIBUTION DONUT CHART, RIGHT: SECURITY & ACCESS DEFENSE) */}
          <div className="admin-dashboard-two-col">
            {/* LEFT COLUMN: Request Distribution Donut Chart */}
            <AdminDashSection
              title="Request Distribution"
              action={
                <AdminChartDateFilter
                  preset={chartPreset}
                  onPresetChange={handleChartPresetChange}
                  startDate={chartStartDate}
                  endDate={chartEndDate}
                  onStartDateChange={(val) => {
                    setChartStartDate(val);
                    setChartPreset('custom');
                  }}
                  onEndDateChange={(val) => {
                    setChartEndDate(val);
                    setChartPreset('custom');
                  }}
                  onApply={handleApplyCustomDates}
                />
              }
            >
              <AdminRequestDistributionChart
                kycCount={chartKycRows.length}
                cardCount={chartCardRows.length}
                withdrawalCount={chartWithdrawalRows.length}
              />
            </AdminDashSection>

            {/* RIGHT COLUMN: Security & Access Defense Overview */}
            <AdminDashSection
              title="Security & Access Defense Overview"
              action={
                <Link to="/admin/ip-blacklist" className="admin-panel__link" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span>Manage IP Blacklist</span>
                  <span>➔</span>
                </Link>
              }
            >
              <div className="admin-sec-overview-card">
                <div className="admin-sec-grid">
                  <div className="admin-sec-stat-tile admin-sec-stat-tile--red">
                    <span className="admin-sec-stat-tile__lbl">Banned IPs</span>
                    <div className="admin-sec-stat-tile__val-row">
                      <span className="admin-sec-stat-tile__val" style={{ color: '#b91c1c' }}>{filteredBannedIps.length}</span>
                      <span className="admin-sec-stat-tile__sub">({activeBansCount} active)</span>
                    </div>
                    <span className="admin-sec-stat-tile__desc">Total blocked in selected period</span>
                  </div>

                  <div className="admin-sec-stat-tile admin-sec-stat-tile--orange">
                    <span className="admin-sec-stat-tile__lbl">Auto-Detected</span>
                    <div className="admin-sec-stat-tile__val-row">
                      <span className="admin-sec-stat-tile__val" style={{ color: '#ea580c' }}>{autoDetectedBans.length}</span>
                      <span className="admin-sec-stat-tile__sub">
                        ({filteredBannedIps.length > 0 ? Math.round((autoDetectedBans.length / filteredBannedIps.length) * 100) : 0}%)
                      </span>
                    </div>
                    <span className="admin-sec-stat-tile__desc">Rate-limit & threat triggers</span>
                  </div>

                  <div className="admin-sec-stat-tile admin-sec-stat-tile--yellow">
                    <span className="admin-sec-stat-tile__lbl">Failed Logins</span>
                    <div className="admin-sec-stat-tile__val-row">
                      <span className="admin-sec-stat-tile__val" style={{ color: '#ca8a04' }}>{failedLogins.length}</span>
                      <span className="admin-sec-stat-tile__sub">/ {filteredLoginLogs.length}</span>
                    </div>
                    <span className="admin-sec-stat-tile__desc">Suspicious auth attempts</span>
                  </div>

                  <div className="admin-sec-stat-tile admin-sec-stat-tile--green">
                    <span className="admin-sec-stat-tile__lbl">Perimeter Status</span>
                    <div className="admin-sec-stat-tile__val-row" style={{ marginTop: '5px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', flexShrink: 0 }} />
                      <span style={{ fontSize: '14px', fontWeight: '800', color: '#047857' }}>Active & Enforced</span>
                    </div>
                    <span className="admin-sec-stat-tile__desc">Zero-trust gateway defense</span>
                  </div>
                </div>

                {/* Recent Banned IPs Preview Mini-List */}
                {filteredBannedIps.length > 0 && (
                  <div className="admin-sec-recent-box">
                    <div className="admin-sec-recent-head">
                      <span className="admin-sec-recent-title">Recent Banned IP Accesses ({Math.min(4, filteredBannedIps.length)})</span>
                      <Link to="/admin/ip-blacklist" className="admin-sec-recent-link">View All ({filteredBannedIps.length}) ➔</Link>
                    </div>
                    <div className="admin-sec-recent-list">
                      {filteredBannedIps.slice(0, 4).map((ipItem) => (
                        <div key={ipItem.id} className="admin-sec-recent-item">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#0f172a' }}>{ipItem.ipAddress}</span>
                            <span style={{
                              fontSize: '9px',
                              fontWeight: '700',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              backgroundColor: ipItem.bannedBy === 'AUTO_DETECTION' ? '#fee2e2' : '#e0f2fe',
                              color: ipItem.bannedBy === 'AUTO_DETECTION' ? '#991b1b' : '#0369a1',
                            }}>
                              {ipItem.bannedBy === 'AUTO_DETECTION' ? 'AUTO' : 'ADMIN'}
                            </span>
                            <span style={{ color: '#64748b', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                              {ipItem.reason || '—'}
                            </span>
                          </div>
                          <span style={{ color: '#94a3b8', whiteSpace: 'nowrap', fontSize: '10px' }}>
                            {formatAdminDate(ipItem.bannedAt || ipItem.createdAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </AdminDashSection>
          </div>

          {/* BOTTOM SECTION: RECENT REQUESTS (10 items per page) */}
          <AdminDashSection
            title="Recent Requests"
            action={<span className="admin-dash-section__hint">Newest first (10 per page)</span>}>
            <AdminPanel className="admin-panel--compact admin-panel--flush">
              <AdminDashTabs
                tabs={REQUEST_TABS.map((t) => ({
                  ...t,
                  count: requestTabCounts[t.id] || undefined,
                }))}
                active={requestTab}
                onChange={(tab) => {
                  setRequestTab(tab);
                  setRequestPage(1);
                }}
              />
              <AdminMiniTable
                columns={[
                  {
                    key: 'memberName',
                    label: 'Member',
                    render: (r) => {
                      const memberId = r.memberId || r.id;
                      const memberEmail = r.memberEmail || r.email;
                      let displayText = '—';
                      if (memberId && memberEmail && memberEmail !== '—') {
                        displayText = `${memberId} / ${memberEmail}`;
                      } else if (memberId) {
                        displayText = memberId;
                      } else if (memberEmail && memberEmail !== '—') {
                        displayText = memberEmail;
                      }
                      return (
                        <span style={{ fontWeight: '600', color: '#2563eb' }}>{displayText}</span>
                      );
                    },
                  },
                  { key: 'meta', label: 'Detail' },
                  { key: 'status', label: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
                  { key: 'at', label: 'Submitted', render: (r) => formatAdminDate(r.at) },
                ]}
                rows={paginatedRequestRows}
                selectedId={selectedRequest?.id}
                onSelectRow={handleSelectRequest}
                renderMobileCard={(r) => {
                  const memberId = r.memberId || r.id;
                  const memberEmail = r.memberEmail || r.email;
                  let displayText = '—';
                  if (memberId && memberEmail && memberEmail !== '—') {
                    displayText = `${memberId} / ${memberEmail}`;
                  } else if (memberId) {
                    displayText = memberId;
                  } else if (memberEmail && memberEmail !== '—') {
                    displayText = memberEmail;
                  }
                  return (
                    <>
                      {/* Line 1: Member Name/Email (Left) & Request Type (Right) - Status removed per user instruction */}
                      <div className="admin-mobile-card__row1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <span
                          className="admin-mobile-card__title"
                          style={{
                            color: '#0f172a',
                            fontWeight: '700',
                            fontSize: '13px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={displayText}
                        >
                          {displayText}
                        </span>
                        {r.type && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              color: '#2563eb',
                              textTransform: 'uppercase',
                              backgroundColor: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              letterSpacing: '0.02em',
                              flexShrink: 0,
                            }}
                          >
                            {r.type}
                          </span>
                        )}
                      </div>

                      {/* Line 2: Detail Meta (Left) & Submitted Date (Right) */}
                      <div
                        className="admin-mobile-card__row2"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          fontSize: '11px',
                          marginTop: '4px',
                        }}
                      >
                        <span className="admin-mobile-card__detail" style={{ color: '#475569', fontWeight: '500' }} title={r.meta}>
                          {r.meta || '—'}
                        </span>
                        <span className="admin-mobile-card__date" style={{ fontWeight: '600', color: '#64748b', whiteSpace: 'nowrap' }}>
                          {formatAdminDate(r.at)}
                        </span>
                      </div>
                    </>
                  );
                }}
              />
              {totalRequestCount > 0 && (
                <AdminPagination
                  page={safeRequestPage}
                  totalPages={totalRequestPages}
                  total={totalRequestCount}
                  onPageChange={setRequestPage}
                />
              )}
            </AdminPanel>
          </AdminDashSection>
        </>
      ) : null}

      {/* Request Detail Modal Popup */}
      {selectedRequest && (
        <AdminDetailPanel
          title={
            selectedRequest.type === 'kyc'
              ? `KYC Detail — ${selectedRequest.memberName || selectedRequest.memberEmail || selectedRequest.id}`
              : selectedRequest.type === 'card'
              ? `Card Application Detail — ${selectedRequest.memberName || selectedRequest.id}`
              : `Withdrawal Request Detail — ${selectedRequest.memberName || selectedRequest.id}`
          }
          loading={requestDetailLoading}
          hasData={Boolean(requestDetail || selectedRequest)}
          onClose={handleCloseRequestModal}
        >
          {requestDetailLoading && !requestDetail ? (
            <p className="admin-loading admin-loading--inline">Loading detail data…</p>
          ) : (
            <>
              {selectedRequest.type === 'kyc' && (
                <>
                  <AdminDetailSection title="Applicant Information">
                    <AdminDetailRow label="Member ID" value={requestDetail?.memberId || selectedRequest.memberId} copyable />
                    <AdminDetailRow label="Name" value={requestDetail?.memberName || selectedRequest.memberName || '—'} />
                    <AdminDetailRow label="Email" value={requestDetail?.memberEmail || selectedRequest.memberEmail || '—'} copyable />
                    <AdminDetailRow label="Country" value={requestDetail?.country || '—'} />
                    <AdminDetailRow label="Document Type" value={requestDetail?.documentType || selectedRequest.meta || 'Passport'} />
                    <AdminDetailRow label="Submitted At" value={formatAdminDate(requestDetail?.submittedAt || selectedRequest.at)} />
                    <AdminDetailRow label="Current Status" value={<AdminStatusBadge status={requestDetail?.status || selectedRequest.status} />} />
                  </AdminDetailSection>

                  <AdminDetailSection title="Verification Result & Reason">
                    {(requestDetail?.status || selectedRequest.status) === 'approved' && (
                      <div style={{ padding: '12px 14px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', fontSize: '13px' }}>
                        <strong style={{ display: 'block', marginBottom: '2px', color: '#15803d' }}>✓ Verification Approved</strong>
                        <span>Identity verification has been verified and approved.</span>
                      </div>
                    )}
                    {(requestDetail?.status || selectedRequest.status) === 'rejected' && (
                      <div style={{ padding: '12px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '13px' }}>
                        <strong style={{ display: 'block', marginBottom: '2px', color: '#dc2626' }}>✕ Verification Rejected</strong>
                        <span>{requestDetail?.rejectReason || 'Verification document was rejected.'}</span>
                      </div>
                    )}
                    {(requestDetail?.status || selectedRequest.status) === 'pending' && (
                      <div style={{ padding: '12px 14px', backgroundColor: '#fefce8', border: '1px solid #fef08a', borderRadius: '8px', color: '#854d0e', fontSize: '13px' }}>
                        <strong style={{ display: 'block', marginBottom: '2px', color: '#ca8a04' }}>⏳ Pending Review</strong>
                        <span>Verification request is currently pending admin review.</span>
                      </div>
                    )}
                  </AdminDetailSection>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                    <Link
                      to={`/admin/kyc?id=${selectedRequest.id || selectedRequest.memberId}`}
                      className="admin-btn admin-btn--secondary"
                      style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <span>Open Full KYC Management</span>
                      <span>➔</span>
                    </Link>
                  </div>
                </>
              )}

              {selectedRequest.type === 'card' && (
                <>
                  <AdminDetailSection title="Card Application Info">
                    <AdminDetailRow label="Card Number" value={requestDetail?.wasabiCardId || requestDetail?.id || selectedRequest.id} copyable />
                    <AdminDetailRow label="Holder ID" value={requestDetail?.wasabiHolderId || '—'} copyable />
                    <AdminDetailRow label="Member ID" value={requestDetail?.memberId || selectedRequest.memberId || '—'} copyable />
                    <AdminDetailRow label="Email" value={requestDetail?.memberEmail || selectedRequest.memberEmail || '—'} copyable />
                    <AdminDetailRow label="Card Type" value={requestDetail?.cardType || selectedRequest.meta || 'Physical'} />
                    <AdminDetailRow label="Status" value={<AdminStatusBadge status={requestDetail?.cardStatus || requestDetail?.status || selectedRequest.status} />} />
                    <AdminDetailRow label="Applied Date" value={formatAdminDate(requestDetail?.createdAt || selectedRequest.at)} />
                  </AdminDetailSection>

                  {requestDetail?.shippingInfo && (
                    <AdminDetailSection title="Shipping Address">
                      <AdminDetailRow label="Recipient" value={requestDetail.shippingInfo.recipientName || '—'} />
                      <AdminDetailRow label="Phone Number" value={requestDetail.shippingInfo.phoneNumber || '—'} />
                      <AdminDetailRow label="Postal Code" value={requestDetail.shippingInfo.postalCode || '—'} />
                      <AdminDetailRow label="Address" value={`${requestDetail.shippingInfo.address || ''} ${requestDetail.shippingInfo.detailAddress || ''}`} />
                    </AdminDetailSection>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                    <Link
                      to={`/admin/cards?id=${selectedRequest.id}`}
                      className="admin-btn admin-btn--secondary"
                      style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <span>Open Full Card Management</span>
                      <span>➔</span>
                    </Link>
                  </div>
                </>
              )}

              {selectedRequest.type === 'withdrawal' && (
                <>
                  <AdminDetailSection title="Withdrawal Request Info">
                    <AdminDetailRow label="Request ID" value={requestDetail?.id || selectedRequest.id} copyable />
                    <AdminDetailRow label="Member" value={requestDetail?.memberName || selectedRequest.memberName} />
                    <AdminDetailRow label="Amount" value={formatUsdt(requestDetail?.amount != null ? requestDetail.amount : (selectedRequest.meta || 0))} />
                    <AdminDetailRow label="To Wallet" value={requestDetail?.toWallet || requestDetail?.wallet || '—'} copyable />
                    <AdminDetailRow label="Status" value={<AdminStatusBadge status={requestDetail?.status || selectedRequest.status} />} />
                    <AdminDetailRow label="Date" value={formatAdminDate(requestDetail?.date || selectedRequest.at)} />
                    {requestDetail?.txHash && <AdminDetailRow label="Tx Hash" value={requestDetail.txHash} copyable />}
                    {requestDetail?.memo && <AdminDetailRow label="Memo" value={requestDetail.memo} />}
                  </AdminDetailSection>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                    <Link
                      to={`/admin/withdrawals?id=${selectedRequest.id}`}
                      className="admin-btn admin-btn--secondary"
                      style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <span>Open Full Withdrawal Management</span>
                      <span>➔</span>
                    </Link>
                  </div>
                </>
              )}
            </>
          )}
        </AdminDetailPanel>
      )}
    </div>
  );
}
