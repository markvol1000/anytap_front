import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminKpiCard, AdminKpiGrid } from '../components/AdminKpiCard.jsx';
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
  AdminPendingTaskCard,
  AdminPendingTaskGrid,
  AdminRequestDistributionChart,
  AdminTxKindChips,
  AdminTxVolumeChart,
  formatTxKind,
  requestDetailRoute,
} from '../components/dashboard/AdminDashboardBlocks.jsx';
import {
  getDashboardData,
  getKycById,
  getCardById,
  getWithdrawalById,
  getBannedIps,
  getLoginLogs,
} from '../services/adminService.js';

function formatCount(n) {
  return Number(n ?? 0).toLocaleString('en-US');
}

function formatMoney(amount) {
  if (amount == null) return '—';
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(2)}M`;
  if (amount >= 10000) return `$${(amount / 1000).toFixed(1)}k`;
  return `$${Number(amount).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

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

  // Default to 7 days per user request
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

  const isMaintenance = data?.systemSummary?.systemStatus === 'maintenance';
  const pending = data?.pendingTasks;
  const summary = data?.systemSummary;

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

  const chartWalletTxs = (data?.walletTransactions ?? []).filter(isRowInChartDateRange);
  const chartCardTxs = (data?.cardTransactions ?? []).filter(isRowInChartDateRange);

  const chartTopUpAmount = chartWalletTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const chartPaymentsAmount = chartCardTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const displayTopUp = (!activeDateFilter.start && !activeDateFilter.end) ? (summary?.todayTopUp || chartTopUpAmount) : chartTopUpAmount;
  const displayPayments = (!activeDateFilter.start && !activeDateFilter.end) ? (summary?.todayPayments || chartPaymentsAmount) : chartPaymentsAmount;

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
        description="Real-time operational summary, pending review tasks, volume trends, and request breakdown."
        onRefresh={reloadDashboard}
        refreshing={loading}
      />

      {loading ? <p className="admin-loading">Loading…</p> : null}

      {pending ? (
        <AdminDashSection
          title="Pending tasks"
          action={<Link to="/admin/logs" className="admin-panel__link">View queue history</Link>}>
          <AdminPendingTaskGrid>
            <AdminPendingTaskCard
              label="KYC"
              icon="shield"
              tone="orange"
              count={formatCount(pending.pendingKyc)}
              to="/admin/kyc?status=pending"
            />
            <AdminPendingTaskCard
              label="CARD"
              icon="creditCard"
              tone="orange"
              count={formatCount(pending.cardApplications)}
              to="/admin/cards?status=pending"
            />
            <AdminPendingTaskCard
              label="With"
              icon="arrowUpRight"
              tone="orange"
              count={formatCount(pending.withdrawalRequests)}
              to="/admin/withdrawals?status=pending"
              urgent
            />
            <AdminPendingTaskCard
              label="Dep"
              icon="coins"
              tone="orange"
              count={formatCount(pending.depositVerification)}
              to="/admin/transactions?kind=wallet_receive&status=pending"
              urgent
            />
          </AdminPendingTaskGrid>
        </AdminDashSection>
      ) : null}

      {data ? (
        <>
          {/* 1. VISUAL CHARTS OVERVIEW (Placed ABOVE the list) */}
          <AdminDashSection
            title="Performance & Activity Charts"
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
            }>
            <div className="admin-chart-grid">
              <AdminRequestDistributionChart
                kycCount={chartKycRows.length}
                cardCount={chartCardRows.length}
                withdrawalCount={chartWithdrawalRows.length}
              />
              <AdminTxVolumeChart
                walletTxCount={chartWalletTxs.length}
                cardTxCount={chartCardTxs.length}
                withdrawalTxCount={chartWithdrawalRows.length}
                todayTopUp={displayTopUp}
                todayPayments={displayPayments}
                walletAssets={summary?.walletAssets ?? 0}
              />
            </div>
          </AdminDashSection>

          {/* 1-1. SECURITY & ACCESS DEFENSE OVERVIEW */}
          <AdminDashSection
            title="Security & Access Defense Overview"
            action={
              <Link to="/admin/ip-blacklist" className="admin-panel__link" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span>Manage IP Blacklist</span>
                <span>➔</span>
              </Link>
            }
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              <div style={{ padding: '14px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', borderLeft: '4px solid #ef4444', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Banned IPs (Filtered)</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
                  <span style={{ fontSize: '26px', fontWeight: '800', color: '#b91c1c', fontFamily: 'monospace' }}>{filteredBannedIps.length}</span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>({activeBansCount} active)</span>
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                  Total blocked during selected period
                </div>
              </div>

              <div style={{ padding: '14px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', borderLeft: '4px solid #f97316', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Auto-Detected Blocks</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
                  <span style={{ fontSize: '26px', fontWeight: '800', color: '#ea580c', fontFamily: 'monospace' }}>{autoDetectedBans.length}</span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    ({filteredBannedIps.length > 0 ? Math.round((autoDetectedBans.length / filteredBannedIps.length) * 100) : 0}%)
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                  Triggered by rate-limit & attack detection
                </div>
              </div>

              <div style={{ padding: '14px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', borderLeft: '4px solid #eab308', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Failed Login Attempts</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
                  <span style={{ fontSize: '26px', fontWeight: '800', color: '#ca8a04', fontFamily: 'monospace' }}>{failedLogins.length}</span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>/ {filteredLoginLogs.length} attempts</span>
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                  Authentication failures tracked
                </div>
              </div>

              <div style={{ padding: '14px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', borderLeft: '4px solid #10b981', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Defense Perimeter Status</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                  <span style={{ fontSize: '16px', fontWeight: '800', color: '#047857' }}>Active & Enforced</span>
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                  Zero-trust real-time gateway defense
                </div>
              </div>
            </div>

            {/* Recent Banned IPs Preview Mini-List */}
            {filteredBannedIps.length > 0 && (
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>Recent Banned IP Accesses ({Math.min(5, filteredBannedIps.length)})</span>
                  <Link to="/admin/ip-blacklist" style={{ fontSize: '11px', color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>View All ({filteredBannedIps.length}) ➔</Link>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {filteredBannedIps.slice(0, 5).map((ipItem) => (
                    <div
                      key={ipItem.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        background: '#f8fafc',
                        borderRadius: '6px',
                        fontSize: '11px',
                        border: '1px solid #f1f5f9'
                      }}
                    >
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
                        <span style={{ color: '#64748b', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '240px' }}>
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
          </AdminDashSection>

          {/* 2. SYSTEM KPI METRICS GRID (Placed ABOVE the list) */}
          {summary ? (
            <AdminDashSection
              title="System Summary Metrics"
              className="admin-dash-section--muted">
              <AdminKpiGrid>
                <AdminKpiCard label="Members" icon="users" tone="green" to="/admin/members" value={formatCount(summary.members)} />
                <AdminKpiCard label="Wallets" icon="wallet" tone="green" to="/admin/wallets" value={formatCount(summary.wallets)} />
                <AdminKpiCard label="Cards" icon="creditCard" tone="green" to="/admin/cards" value={formatCount(summary.cards)} />
                <AdminKpiCard label="Today's Top-up" icon="arrowUp" tone="blue" to="/admin/transactions?kind=wallet_topup" value={formatMoney(summary.todayTopUp)} />
                <AdminKpiCard label="Today's Payments" icon="receipt" tone="green" to="/admin/transactions?kind=card_spend" value={formatMoney(summary.todayPayments)} />
                <AdminKpiCard label="Referral Rewards" icon="trophy" tone="blue" to="/admin/referral" value={formatMoney(summary.referralRewards)} />
                <AdminKpiCard label="Wallet Assets" icon="bank" tone="green" to="/admin/wallets" value={formatMoney(summary.walletAssets)} />
              </AdminKpiGrid>
            </AdminDashSection>
          ) : null}

          {/* 3. ONLY LIST SECTION: RECENT REQUESTS (10 items per page) */}
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
