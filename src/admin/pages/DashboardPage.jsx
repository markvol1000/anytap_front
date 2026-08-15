import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminKpiCard, AdminKpiGrid } from '../components/AdminKpiCard.jsx';
import { AdminMiniTable } from '../components/AdminDataTable.jsx';
import { AdminPanel, AdminPagination } from '../components/AdminFilterBar.jsx';
import { AdminStatusBadge, formatAdminDate, formatUsdt } from '../components/AdminStatusBadge.jsx';
import {
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
import { getDashboardData } from '../services/adminService.js';

function formatCount(n) {
  return Number(n ?? 0).toLocaleString('en-US');
}

function formatMoney(amount) {
  if (amount == null) return '—';
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(2)}M`;
  if (amount >= 10000) return `$${(amount / 1000).toFixed(1)}k`;
  return `$${Number(amount).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
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

  useEffect(() => {
    getDashboardData()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const isMaintenance = data?.systemSummary?.systemStatus === 'maintenance';
  const pending = data?.pendingTasks;
  const summary = data?.systemSummary;

  const kycRows = data?.recentRequests?.kyc ?? [];
  const cardRows = data?.recentRequests?.card ?? [];
  const withdrawalRows = data?.recentRequests?.withdrawal ?? [];

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
      <header className="admin-dash-head">
        <h1 className="admin-dash-head__title">Dashboard</h1>
        {summary ? (
          <Link
            to="/admin/settings"
            className={`admin-dash-head__status admin-dash-head__status--${isMaintenance ? 'red' : 'green'}`}>
            <span className="admin-dash-head__status-dot" aria-hidden="true" />
            {isMaintenance ? 'Maintenance' : 'All systems operational'}
          </Link>
        ) : null}
      </header>

      {loading ? <p className="admin-loading">Loading…</p> : null}

      {pending ? (
        <AdminDashSection
          title="Pending tasks"
          action={<Link to="/admin/logs" className="admin-panel__link">View queue history</Link>}>
          <AdminPendingTaskGrid>
            <AdminPendingTaskCard
              label="Pending KYC"
              icon="shield"
              tone="orange"
              count={formatCount(pending.pendingKyc)}
              to="/admin/kyc?status=pending"
            />
            <AdminPendingTaskCard
              label="Card Applications"
              icon="creditCard"
              tone="orange"
              count={formatCount(pending.cardApplications)}
              to="/admin/cards?status=pending"
            />
            <AdminPendingTaskCard
              label="Withdrawal Requests"
              icon="arrowUpRight"
              tone="orange"
              count={formatCount(pending.withdrawalRequests)}
              to="/admin/withdrawals?status=pending"
              urgent
            />
            <AdminPendingTaskCard
              label="Deposit Verification"
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
            action={<span className="admin-dash-section__hint">Click chart segment or card to switch menu</span>}>
            <div className="admin-chart-grid">
              <AdminRequestDistributionChart
                kycCount={kycRows.length}
                cardCount={cardRows.length}
                withdrawalCount={withdrawalRows.length}
              />
              <AdminTxVolumeChart
                walletTxCount={data.walletTransactions?.length ?? 0}
                cardTxCount={data.cardTransactions?.length ?? 0}
                todayTopUp={summary?.todayTopUp ?? 0}
                todayPayments={summary?.todayPayments ?? 0}
              />
            </div>
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
                        <Link to={requestDetailRoute(r)} className="admin-table-link">
                          <span style={{ fontWeight: '600' }}>{displayText}</span>
                        </Link>
                      );
                    },
                  },
                  { key: 'meta', label: 'Detail' },
                  { key: 'status', label: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
                  { key: 'at', label: 'Submitted', render: (r) => formatAdminDate(r.at) },
                ]}
                rows={paginatedRequestRows}
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
    </div>
  );
}
