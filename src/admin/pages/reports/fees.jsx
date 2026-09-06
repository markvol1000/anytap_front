import React, { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { getFeesReport } from '../../services/api/adminApiService.js';

export function FeesReportPage() {
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('byUser'); // 'byUser' | 'byItem'
  const [reportData, setReportData] = useState({ summary: {}, byUser: [], byItem: [] });
  const [searchTerm, setSearchTerm] = useState('');
  const [feeTypeFilter, setFeeTypeFilter] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Date Range Filter States
  const [datePreset, setDatePreset] = useState('all'); // 'all' | 'today' | '7d' | '30d' | 'thisMonth' | 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, feeTypeFilter, startDate, endDate, viewMode]);

  // Handle Date Range Presets
  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7d') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === '30d') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Handle Custom Date Change
  const handleCustomDateChange = (s, e) => {
    setDatePreset('custom');
    setStartDate(s);
    setEndDate(e);
  };

  // Fetch Report Data from API
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    getFeesReport({
      feeType: feeTypeFilter !== 'ALL' ? feeTypeFilter : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    })
      .then((data) => {
        if (isMounted && data) {
          setReportData(data);
          if (data.byUser && data.byUser.length > 0) {
            setSelectedUser(data.byUser[0]);
          }
          if (data.byItem && data.byItem.length > 0) {
            setSelectedItem(data.byItem[0]);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load fee report:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, [feeTypeFilter, startDate, endDate]);

  // Filtered & Sorted By User list (Default Sorted by Last Fee Date DESC)
  const sortedUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const rawList = reportData.byUser || [];
    const filtered = rawList.filter(
      (u) =>
        !term ||
        String(u.userId || '').toLowerCase().includes(term) ||
        String(u.userName || '').toLowerCase().includes(term) ||
        String(u.userEmail || '').toLowerCase().includes(term) ||
        String(u.cregisWalletAddress || '').toLowerCase().includes(term)
    );

    // Sort by Last Fee Date DESC
    return [...filtered].sort((a, b) => {
      const dateA = a.lastFeeAt || '';
      const dateB = b.lastFeeAt || '';
      return dateB.localeCompare(dateA);
    });
  }, [reportData.byUser, searchTerm]);

  // Filtered & Sorted By Item list (Default Sorted by Fee Date DESC)
  const sortedItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const rawList = reportData.byItem || [];
    const filtered = rawList.filter((item) => {
      const matchSearch =
        !term ||
        String(item.txId || '').toLowerCase().includes(term) ||
        String(item.userId || '').toLowerCase().includes(term) ||
        String(item.userEmail || '').toLowerCase().includes(term) ||
        String(item.feeCode || '').toLowerCase().includes(term) ||
        String(item.feeName || '').toLowerCase().includes(term);

      const matchType = feeTypeFilter === 'ALL' || item.feeCode === feeTypeFilter;
      return matchSearch && matchType;
    });

    // Sort by Fee Date (createdAt) DESC
    return [...filtered].sort((a, b) => {
      const dateA = a.createdAt || '';
      const dateB = b.createdAt || '';
      return dateB.localeCompare(dateA);
    });
  }, [reportData.byItem, searchTerm, feeTypeFilter]);

  // Paginated Data
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedUsers.slice(start, start + pageSize);
  }, [sortedUsers, currentPage, pageSize]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, currentPage, pageSize]);

  const summary = reportData.summary || {};
  const totalUserCount = sortedUsers.length;
  const totalItemCount = sortedItems.length;
  const currentTotal = viewMode === 'byUser' ? totalUserCount : totalItemCount;
  const totalPages = Math.ceil(currentTotal / pageSize) || 1;

  // Export CSV
  const handleExportCsv = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    if (viewMode === 'byUser') {
      csvContent += 'User ID,Name,Email,Wallet Address,Total Fee (USDT),Unpaid Fee (USDT),Topup Fee (A3),Gas Fee,Tx Count,Last Date\n';
      sortedUsers.forEach((u) => {
        csvContent += `"${u.userId}","${u.userName}","${u.userEmail}","${u.cregisWalletAddress}",${u.totalFee},${u.unpaidTotalFee},${u.cardChargeFee},${u.gasFee},${u.txCount},"${u.lastFeeAt}"\n`;
      });
    } else {
      csvContent += 'Tx ID,User ID,Name,Email,Fee Code,Fee Name,Original Amount,Fee Rate (%),Fee Amount (USDT),Net Amount,Date\n';
      sortedItems.forEach((i) => {
        csvContent += `"${i.txId}","${i.userId}","${i.userName}","${i.userEmail}","${i.feeCode}","${i.feeName}",${i.originalAmount},${i.feeRate},${i.feeAmount},${i.netAmount},"${i.createdAt}"\n`;
      });
    }
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `fee_report_${viewMode}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for rendering fee policy explanations in English
  const getFeePolicyInfo = (code) => {
    switch (code) {
      case 'A3':
        return {
          title: 'Card Top-Up Platform Fee (A3 - 2.0%)',
          category: 'Card Top-Up',
          rateText: '2.00%',
          formula: 'Fee Amount = Gross Top-Up Amount × 2.0%',
          description:
            'A 2.0% platform revenue fee applied to all Wasabi card top-up requests. The fee is automatically deducted during settlement and collected into the AnyTap master wallet.',
          systemImpact: 'Deducted from user wallet balance prior to the 100.9% sweep to the Wasabi merchant deposit account.',
        };
      case 'CARD_CHARGE_FIXED':
        return {
          title: 'Fixed Network Gas Fee (Gas Fee 3.00 USDT)',
          category: 'TRON Blockchain Network',
          rateText: '3.00 USDT Fixed',
          formula: 'Fee Amount = Fixed 3.00 USDT per transaction',
          description:
            'A fixed network gas fee covering TRON TRC-20 energy and bandwidth consumption for on-chain transfer broadcasting.',
          systemImpact: 'Fixed deduction applied per top-up request to offset blockchain network execution costs.',
        };
      case 'A1':
        return {
          title: 'Card Application Deposit (A1 - Deposit)',
          category: 'Card Application',
          rateText: '100.00 USDT',
          formula: '$100 refundable deposit upon card application',
          description:
            'Refundable deposit required when applying for a new Virtual/Physical card. Recorded in the ledger for tracking.',
          systemImpact: 'Held in Cregis master collection account until eligible for user refund or cancellation.',
        };
      case 'A2':
        return {
          title: 'Card Production & Issuance Fee (A2)',
          category: 'Card Issuance',
          rateText: 'Standard Cost',
          formula: 'Issuance Fee = Plate engraving & bio-chip setup cost',
          description:
            'Fee covering physical/virtual card creation, plate engraving, chip programming, and shipping preparation.',
          systemImpact: 'Recorded upon card application approval.',
        };
      case 'B1':
        return {
          title: 'Wasabi Merchant Cost Fee (B1 - 0.9%)',
          category: 'Wasabi Merchant',
          rateText: '0.90%',
          formula: 'Wasabi Sweep Amount = Requested Amount × 100.9%',
          description:
            'System cost fee (0.9%) incurred when executing card sweeps via the Wasabi merchant API.',
          systemImpact: '100.9% gross amount is swept to Wasabi merchant deposit address.',
        };
      case 'WITHDRAWAL':
        return {
          title: 'External Withdrawal Network Fee',
          category: 'External Withdrawal',
          rateText: '3.00 USDT',
          formula: 'Fee Amount = Fixed 3.00 USDT per withdrawal',
          description:
            'Network processing fee charged when transferring funds from user Cregis wallet to external TRON addresses.',
          systemImpact: 'Deducted from transaction total during withdrawal execution.',
        };
      default:
        return {
          title: 'Standard Platform Settlement Fee',
          category: 'Platform Settlement',
          rateText: 'Base Policy Rate',
          formula: 'Fee Amount = Transaction Amount × Base Rate',
          description: 'Standard fee item recorded in AnyTap transaction settlement ledger.',
          systemImpact: 'Allocated to master platform fee account.',
        };
    }
  };

  const formatShortId = (id, head = 8, tail = 6) => {
    if (!id) return '—';
    const str = String(id);
    if (str.length <= head + tail + 3) return str;
    return `${str.slice(0, head)}...${str.slice(-tail)}`;
  };

  // Currently active selected item or user for bottom detail view
  const activeDetailItem = viewMode === 'byItem' ? selectedItem : null;
  const activeDetailUser = viewMode === 'byUser' ? selectedUser : null;
  const activeFeeCode = activeDetailItem ? activeDetailItem.feeCode : 'A3';
  const policyInfo = getFeePolicyInfo(activeFeeCode);

  return (
    <div className="admin-page admin-fees-report">
      {/* Reports Navigation Sub-Tabs */}
      <div className="admin-fees-tabs">
        <NavLink
          to="/admin/reports/cards"
          className={({ isActive }) => `admin-fees-tab-link${isActive ? ' is-active' : ''}`}
        >
          💳 Card Application Status
        </NavLink>
        <NavLink
          to="/admin/reports/transfers"
          className={({ isActive }) => `admin-fees-tab-link${isActive ? ' is-active' : ''}`}
        >
          🔁 Card Transfer Ledger
        </NavLink>
        <NavLink
          to="/admin/reports/fees"
          className={({ isActive }) => `admin-fees-tab-link${isActive ? ' is-active' : ''}`}
        >
          💰 Fee Analysis Report
        </NavLink>
      </div>

      {/* Page Title Header */}
      <div className="admin-fees-header">
        <div>
          <h1 className="admin-fees-header__title">Fee Analysis & Policy Report</h1>
          <p className="admin-fees-header__sub">
            Comprehensive fee collection logs by user & item, detailed calculation breakdown, and policy documentation.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          style={{
            padding: '8px 16px',
            backgroundColor: '#10B981',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          📥 Export Fee CSV ({viewMode === 'byUser' ? 'By User' : 'By Item'})
        </button>
      </div>

      {/* Top Metric KPI Cards */}
      <div className="admin-fees-kpi-grid">
        <div className="admin-fees-kpi-card">
          <div className="admin-fees-kpi-card__label">TOTAL FEES COLLECTED</div>
          <div className="admin-fees-kpi-card__val">
            ${Number(summary.totalFeesCollected || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
          </div>
          <div className="admin-fees-kpi-card__sub" style={{ color: '#10B981' }}>✓ Aggregate All Revenues</div>
        </div>

        <div className="admin-fees-kpi-card">
          <div className="admin-fees-kpi-card__label">CARD TOP-UP FEES (A3 - 2.0%)</div>
          <div className="admin-fees-kpi-card__val" style={{ color: '#2563EB' }}>
            ${Number(summary.totalChargeFeesA3 || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
          </div>
          <div className="admin-fees-kpi-card__sub">Platform 2% Fee Income</div>
        </div>

        <div className="admin-fees-kpi-card">
          <div className="admin-fees-kpi-card__label">FIXED GAS FEES (3 USDT)</div>
          <div className="admin-fees-kpi-card__val" style={{ color: '#D97706' }}>
            ${Number(summary.totalGasFeesFixed || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
          </div>
          <div className="admin-fees-kpi-card__sub">TRON Network Gas Fee</div>
        </div>

        <div className="admin-fees-kpi-card">
          <div className="admin-fees-kpi-card__label">PAYING USERS / AVG FEE</div>
          <div className="admin-fees-kpi-card__val" style={{ color: '#7C3AED' }}>
            {summary.activePayingUsers || 0} Users <span style={{ fontSize: '13px', color: '#64748B', fontWeight: '500' }}>(${summary.avgFeePerUser || 0}/User)</span>
          </div>
          <div className="admin-fees-kpi-card__sub">Active Paying Accounts</div>
        </div>
      </div>

      {/* Date Range Filter Bar */}
      <div className="admin-fees-date-bar">
        {/* Date Preset Buttons */}
        <div className="admin-fees-date-presets">
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#475569', marginRight: '6px' }}>📅 Fee Date Range:</span>
          {[
            { id: 'all', label: 'All Time' },
            { id: 'today', label: 'Today' },
            { id: '7d', label: 'Last 7 Days' },
            { id: '30d', label: 'Last 30 Days' },
            { id: 'thisMonth', label: 'This Month' },
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetChange(preset.id)}
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: '600',
                borderRadius: '6px',
                border: datePreset === preset.id ? '1px solid #2563EB' : '1px solid #CBD5E1',
                backgroundColor: datePreset === preset.id ? '#EFF6FF' : '#FFFFFF',
                color: datePreset === preset.id ? '#1D4ED8' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Custom Start & End Date Inputs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleCustomDateChange(e.target.value, endDate)}
            style={{
              padding: '5px 10px',
              fontSize: '12px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              color: '#334155',
              backgroundColor: '#FFFFFF',
            }}
          />
          <span style={{ color: '#94A3B8', fontWeight: '600' }}>~</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => handleCustomDateChange(startDate, e.target.value)}
            style={{
              padding: '5px 10px',
              fontSize: '12px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              color: '#334155',
              backgroundColor: '#FFFFFF',
            }}
          />
        </div>
      </div>

      {/* Controls Bar: Search, Category Filter, and Mode Toggle */}
      <div className="admin-fees-controls-bar">
        {/* Left: View Mode Toggle */}
        <div style={{ display: 'flex', gap: '4px', backgroundColor: '#CBD5E1', padding: '3px', borderRadius: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setViewMode('byUser')}
            style={{
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: '700',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              backgroundColor: viewMode === 'byUser' ? '#FFFFFF' : 'transparent',
              color: viewMode === 'byUser' ? '#2563EB' : '#475569',
              boxShadow: viewMode === 'byUser' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            👤 By User ({totalUserCount})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('byItem')}
            style={{
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: '700',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              backgroundColor: viewMode === 'byItem' ? '#FFFFFF' : 'transparent',
              color: viewMode === 'byItem' ? '#2563EB' : '#475569',
              boxShadow: viewMode === 'byItem' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            📋 By Fee Item ({totalItemCount})
          </button>
        </div>

        {/* Right: Search & Category Select */}
        <div className="admin-fees-controls-right">
          {viewMode === 'byItem' && (
            <select
              value={feeTypeFilter}
              onChange={(e) => setFeeTypeFilter(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                backgroundColor: '#FFFFFF',
                color: '#334155',
              }}
            >
              <option value="ALL">All Fee Types</option>
              <option value="A3">A3 - Card Top-up Fee (2.0%)</option>
              <option value="CARD_CHARGE_FIXED">Gas Fee - Fixed Network Fee (3.00 USDT)</option>
              <option value="A1">A1 - Card Deposit Fee ($100)</option>
              <option value="A2">A2 - Card Issuance Fee</option>
              <option value="B1">B1 - Wasabi Cost Fee (0.9%)</option>
              <option value="WITHDRAWAL">WITHDRAWAL - External Fee (3.00 USDT)</option>
            </select>
          )}

          <input
            type="text"
            placeholder={viewMode === 'byUser' ? "Search User ID, Name, Email, Wallet..." : "Search Tx ID, User ID, Email..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              fontSize: '13px',
              width: '240px',
              backgroundColor: '#FFFFFF',
            }}
          />

          <button
            type="button"
            title="Fee Calculation & Policy Guide"
            onClick={() => setShowInfoModal(true)}
            style={{
              padding: '7px 12px',
              borderRadius: '6px',
              border: '1px solid #93C5FD',
              backgroundColor: '#EFF6FF',
              color: '#1D4ED8',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            ℹ️ Formula Info
          </button>
        </div>
      </div>

      {/* Main List Table Area */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748B', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
          ⏳ Loading fee analysis report data...
        </div>
      ) : viewMode === 'byUser' ? (
        /* ================= USER BREAKDOWN TABLE & MOBILE CARD LIST ================= */
        <>
          {/* Desktop Table View */}
          <div className="admin-fees-desktop-table">
            <div className="admin-fees-table-wrap">
              <table className="admin-fees-table">
                <thead>
                  <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid #CBD5E1', color: '#475569', fontWeight: '700' }}>
                    <th style={{ padding: '12px 16px' }}>User ID / Member</th>
                    <th style={{ padding: '12px 16px' }}>Email</th>
                    <th style={{ padding: '12px 16px' }}>Cregis Wallet Address</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }} title="Total accumulated fees accrued across all transactions (Formula: A3 + Gas + Withdrawal)">
                      Total Fee (USDT) <span style={{ cursor: 'help', color: '#94A3B8' }}>ℹ️</span>
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }} title="Accrued fees remaining in user wallet awaiting sweep to master wallet (Formula: Total Fee - Swept Fee)">
                      Unpaid Fee (USDT) <span style={{ cursor: 'help', color: '#94A3B8' }}>ℹ️</span>
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }} title="2.0% platform fee charged on Wasabi card top-up requests (Formula: Top-up Amount × 2%)">
                      Top-up Fee (A3) <span style={{ cursor: 'help', color: '#94A3B8' }}>ℹ️</span>
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }} title="Fixed TRON network gas fee charged per on-chain transfer ($3.00 USDT per tx)">
                      Gas Fee (Fixed) <span style={{ cursor: 'help', color: '#94A3B8' }}>ℹ️</span>
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Tx Count</th>
                    <th style={{ padding: '12px 16px' }}>Last Fee Date (DESC ↓)</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>
                        No fee records found for the search query or date range.
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((user) => {
                      const isSelected = selectedUser?.userId === user.userId;
                      return (
                        <tr
                          key={user.userId}
                          onClick={() => {
                            setSelectedUser(user);
                            const sampleItem = (reportData.byItem || []).find((i) => i.userId === user.userId);
                            if (sampleItem) setSelectedItem(sampleItem);
                          }}
                          style={{
                            borderBottom: '1px solid #F1F5F9',
                            backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          <td style={{ padding: '12px 16px', fontWeight: '700', color: isSelected ? '#1D4ED8' : '#1E293B' }}>
                            {user.userName} <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '400' }}>({user.userId})</span>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#475569' }}>{user.userEmail || '—'}</td>
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', color: '#334155' }}>
                            {user.cregisWalletAddress || '—'}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '700', color: '#059669' }}>
                            ${Number(user.totalFee || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '700', color: '#DC2626' }}>
                            ${Number(user.unpaidTotalFee || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', color: '#2563EB' }}>
                            ${Number(user.cardChargeFee || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', color: '#D97706' }}>
                            ${Number(user.gasFee || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '12px', backgroundColor: '#E2E8F0', fontSize: '11px', fontWeight: '700' }}>
                              {user.txCount || 1}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#64748B', fontSize: '12px' }}>{user.lastFeeAt || '—'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile 3-Line Card View (< 768px) */}
          <div className="admin-fees-mobile-list-container">
            <div className="admin-fees-mobile-list-head">
              <span>👤 회원 정보 (Member / ID)</span>
              <span>💰 총 수수료 / 미수금</span>
            </div>
            {paginatedUsers.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
                No fee records found.
              </div>
            ) : (
              <div className="admin-fees-mobile-list">
                {paginatedUsers.map((user) => {
                  const isSelected = selectedUser?.userId === user.userId;
                  return (
                    <div
                      key={user.userId}
                      className={`admin-fees-mobile-card${isSelected ? ' is-selected' : ''}`}
                      onClick={() => {
                        setSelectedUser(user);
                        const sampleItem = (reportData.byItem || []).find((i) => i.userId === user.userId);
                        if (sampleItem) setSelectedItem(sampleItem);
                      }}
                    >
                      {/* Line 1: User Name & ID (Left) | Total Fee (Right) */}
                      <div className="admin-fees-mobile-card__line1">
                        <span className="admin-fees-mobile-card__user">
                          {user.userName} <span className="admin-fees-mobile-card__id">({user.userId})</span>
                        </span>
                        <span className="admin-fees-mobile-card__total-fee">
                          ${Number(user.totalFee || 0).toFixed(2)}
                        </span>
                      </div>

                      {/* Line 2: Email or Wallet (Left) | Unpaid Fee (Right) */}
                      <div className="admin-fees-mobile-card__line2">
                        <span className="admin-fees-mobile-card__subtext">
                          {user.userEmail || user.cregisWalletAddress || '—'}
                        </span>
                        <span className="admin-fees-mobile-card__unpaid-fee">
                          ${Number(user.unpaidTotalFee || 0).toFixed(2)}
                        </span>
                      </div>

                      {/* Line 3: Date (Left) | Breakdown & Tx Count (Right) */}
                      <div className="admin-fees-mobile-card__line3">
                        <span className="admin-fees-mobile-card__date">{user.lastFeeAt || '—'}</span>
                        <span className="admin-fees-mobile-card__breakdown">
                          A3: ${Number(user.cardChargeFee || 0).toFixed(2)} · Gas: ${Number(user.gasFee || 0).toFixed(2)} · {user.txCount || 1}tx
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        /* ================= ITEMIZED FEE TABLE & MOBILE CARD LIST ================= */
        <>
          {/* Desktop Table View */}
          <div className="admin-fees-desktop-table">
            <div className="admin-fees-table-wrap">
              <table className="admin-fees-table">
                <thead>
                  <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid #CBD5E1', color: '#475569', fontWeight: '700' }}>
                    <th style={{ padding: '12px 16px' }}>Tx ID</th>
                    <th style={{ padding: '12px 16px' }}>User ID / Member</th>
                    <th style={{ padding: '12px 16px' }}>Fee Item</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Original Gross</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Rate %</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Fee Amount</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Net Amount</th>
                    <th style={{ padding: '12px 16px' }}>Fee Date (DESC ↓)</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>
                        No itemized fee records found for the search query or date range.
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item) => {
                      const isSelected = selectedItem?.txId === item.txId;
                      return (
                        <tr
                          key={item.txId}
                          onClick={() => {
                            setSelectedItem(item);
                            const parentUser = (reportData.byUser || []).find((u) => u.userId === item.userId);
                            if (parentUser) setSelectedUser(parentUser);
                          }}
                          style={{
                            borderBottom: '1px solid #F1F5F9',
                            backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', fontWeight: '700', color: isSelected ? '#1D4ED8' : '#334155' }} title={item.txId}>
                            {formatShortId(item.txId)}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ fontWeight: '600', color: '#1E293B' }}>{item.userName}</span>{' '}
                            <span style={{ fontSize: '11px', color: '#64748B' }}>({item.userId})</span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '700',
                                backgroundColor: item.feeCode === 'A3' ? '#DBEAFE' : item.feeCode === 'CARD_CHARGE_FIXED' ? '#FEF3C7' : '#E2E8F0',
                                color: item.feeCode === 'A3' ? '#1E40AF' : item.feeCode === 'CARD_CHARGE_FIXED' ? '#92400E' : '#334155',
                              }}
                            >
                              {item.feeCode}
                            </span>{' '}
                            <span style={{ fontSize: '12px', color: '#334155', marginLeft: '4px' }}>{item.feeName}</span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', color: '#475569' }}>
                            ${Number(item.originalAmount || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', color: '#64748B', fontWeight: '600' }}>
                            {Number(item.feeRate || 0) > 0 ? `${item.feeRate}%` : 'Fixed'}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '700', color: '#059669' }}>
                            ${Number(item.feeAmount || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', color: '#334155' }}>
                            ${Number(item.netAmount || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#64748B', fontSize: '12px' }}>{item.createdAt || '—'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile 3-Line Card View (< 768px) */}
          <div className="admin-fees-mobile-list-container">
            <div className="admin-fees-mobile-list-head">
              <span>📋 수수료 항목 & 회원</span>
              <span>💰 수수료 금액</span>
            </div>
            {paginatedItems.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
                No itemized fee records found.
              </div>
            ) : (
              <div className="admin-fees-mobile-list">
                {paginatedItems.map((item) => {
                  const isSelected = selectedItem?.txId === item.txId;
                  return (
                    <div
                      key={item.txId}
                      className={`admin-fees-mobile-card${isSelected ? ' is-selected' : ''}`}
                      onClick={() => {
                        setSelectedItem(item);
                        const parentUser = (reportData.byUser || []).find((u) => u.userId === item.userId);
                        if (parentUser) setSelectedUser(parentUser);
                      }}
                    >
                      {/* Line 1: Fee Code & Name (Left) | Fee Amount (Right) */}
                      <div className="admin-fees-mobile-card__line1">
                        <div className="admin-fees-mobile-card__item-title">
                          <span className={`admin-fees-code-badge admin-fees-code-badge--${item.feeCode}`}>
                            {item.feeCode}
                          </span>
                          <span className="admin-fees-mobile-card__fee-name">{item.feeName}</span>
                        </div>
                        <span className="admin-fees-mobile-card__fee-amount">
                          ${Number(item.feeAmount || 0).toFixed(2)}
                        </span>
                      </div>

                      {/* Line 2: User Name & ID (Left) | Original Gross & Rate (Right) */}
                      <div className="admin-fees-mobile-card__line2">
                        <span className="admin-fees-mobile-card__user">
                          {item.userName} <span className="admin-fees-mobile-card__id">({item.userId})</span>
                        </span>
                        <span className="admin-fees-mobile-card__subtext">
                          ${Number(item.originalAmount || 0).toFixed(2)} ({Number(item.feeRate || 0) > 0 ? `${item.feeRate}%` : 'Fixed'})
                        </span>
                      </div>

                      {/* Line 3: Date (Left) | Tx ID & Net Amount (Right) */}
                      <div className="admin-fees-mobile-card__line3">
                        <span className="admin-fees-mobile-card__date">{item.createdAt || '—'}</span>
                        <span className="admin-fees-mobile-card__subtext">
                          {formatShortId(item.txId)} · Net: ${Number(item.netAmount || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Pagination Bar */}
      {!loading && currentTotal > 0 && (
        <div className="admin-fees-pagination">
          <div>
            Showing <strong>{Math.min((currentPage - 1) * pageSize + 1, currentTotal)}</strong> to <strong>{Math.min(currentPage * pageSize, currentTotal)}</strong> of <strong>{currentTotal}</strong> entries
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Page Navigation Buttons */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  borderRadius: '4px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: currentPage === 1 ? '#F1F5F9' : '#FFFFFF',
                  color: currentPage === 1 ? '#94A3B8' : '#334155',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                }}
              >
                « First
              </button>
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  borderRadius: '4px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: currentPage === 1 ? '#F1F5F9' : '#FFFFFF',
                  color: currentPage === 1 ? '#94A3B8' : '#334155',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                }}
              >
                ‹ Prev
              </button>
              <span style={{ padding: '4px 10px', fontWeight: '700', color: '#1D4ED8' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  borderRadius: '4px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: currentPage === totalPages ? '#F1F5F9' : '#FFFFFF',
                  color: currentPage === totalPages ? '#94A3B8' : '#334155',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                Next ›
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  borderRadius: '4px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: currentPage === totalPages ? '#F1F5F9' : '#FFFFFF',
                  color: currentPage === totalPages ? '#94A3B8' : '#334155',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                Last »
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BOTTOM DETAIL PANEL (Fee Item Detail & Policy Explanation in English) */}
      {/* ========================================================================= */}
      <div
        id="fee-detail-panel"
        className="admin-fees-detail-panel"
      >
        <div className="admin-fees-detail-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '18px', fontWeight: '800', color: '#1E293B' }}>
              📊 Fee Item Detail & Calculation Breakdown
            </span>
            <span
              style={{
                padding: '4px 10px',
                backgroundColor: '#3B82F6',
                color: '#FFFFFF',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '700',
              }}
            >
              SELECTED {activeDetailItem ? `TX: ${formatShortId(activeDetailItem.txId)}` : `USER: ${activeDetailUser?.userId}`}
            </span>
          </div>
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            Click any row above to inspect specific fee transaction & policy explanation
          </span>
        </div>

        <div className="admin-fees-detail-grid">
          {/* LEFT COLUMN: Calculation & Transaction Fields */}
          <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B', marginTop: 0, marginBottom: '14px' }}>
              📋 Transaction Calculation Breakdown
            </h3>

            <div className="admin-fees-detail-calc-grid">
              <div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>USER MEMBER</div>
                <div style={{ fontWeight: '700', color: '#0F172A', marginTop: '2px' }}>
                  {activeDetailUser?.userName || activeDetailItem?.userName || 'User'} ({activeDetailUser?.userId || activeDetailItem?.userId || '—'})
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>MEMBER EMAIL</div>
                <div style={{ color: '#334155', marginTop: '2px' }}>
                  {activeDetailUser?.userEmail || activeDetailItem?.userEmail || '—'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>FEE CODE & NAME</div>
                <div style={{ fontWeight: '700', color: '#2563EB', marginTop: '2px' }}>
                  [{activeFeeCode}] {activeDetailItem?.feeName || policyInfo.title}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>APPLIED RATE</div>
                <div style={{ color: '#059669', fontWeight: '700', marginTop: '2px' }}>
                  {policyInfo.rateText}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>GROSS TRANSACTION AMOUNT</div>
                <div style={{ color: '#1E293B', fontWeight: '700', marginTop: '2px' }}>
                  ${Number(activeDetailItem?.originalAmount || activeDetailUser?.totalFee || 0).toFixed(2)} USDT
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>DEDUCTED FEE AMOUNT</div>
                <div style={{ color: '#D97706', fontWeight: '800', marginTop: '2px', fontSize: '15px' }}>
                  ${Number(activeDetailItem?.feeAmount || activeDetailUser?.totalFee || 0).toFixed(2)} USDT
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>NET CREDITED TO WASABI/USER</div>
                <div style={{ color: '#059669', fontWeight: '700', marginTop: '2px' }}>
                  ${Number(activeDetailItem?.netAmount || 0).toFixed(2)} USDT
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>TRANSACTION DATE</div>
                <div style={{ color: '#475569', marginTop: '2px' }}>
                  {activeDetailItem?.createdAt || activeDetailUser?.lastFeeAt || '—'}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed #E2E8F0', fontSize: '12px', color: '#475569', wordBreak: 'break-all' }}>
              <span style={{ fontWeight: '600' }}>CREGIS WALLET:</span>{' '}
              <span style={{ fontFamily: 'monospace', color: '#1E293B' }}>
                {activeDetailUser?.cregisWalletAddress || activeDetailItem?.fromAddress || '—'}
              </span>
            </div>
          </div>

          {/* RIGHT COLUMN: Policy Explanation & Policy Description */}
          <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B', marginTop: 0, marginBottom: '14px' }}>
              ℹ️ Fee Policy & Detailed Explanation
            </h3>

            <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#334155' }}>
              <div style={{ marginBottom: '10px' }}>
                <span style={{ fontWeight: '700', color: '#1E293B' }}>Item Title:</span>{' '}
                <span style={{ color: '#2563EB', fontWeight: '600' }}>{policyInfo.title}</span>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <span style={{ fontWeight: '700', color: '#1E293B' }}>Category:</span>{' '}
                <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#F1F5F9', fontSize: '11px', fontWeight: '700' }}>
                  {policyInfo.category}
                </span>
              </div>

              {/* Formula Highlight Box */}
              <div
                style={{
                  backgroundColor: '#EFF6FF',
                  borderLeft: '4px solid #3B82F6',
                  padding: '10px 12px',
                  borderRadius: '4px',
                  marginBottom: '12px',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#1D4ED8',
                }}
              >
                📐 Formula: {policyInfo.formula}
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontWeight: '700', color: '#1E293B', marginBottom: '4px' }}>💡 Detailed Policy Explanation:</div>
                <div style={{ backgroundColor: '#F8FAFC', padding: '10px', borderRadius: '6px', fontSize: '12px', color: '#475569' }}>
                  {policyInfo.description}
                </div>
              </div>

              <div>
                <div style={{ fontWeight: '700', color: '#1E293B', marginBottom: '4px' }}>⚙️ System Settlement & Processing Impact:</div>
                <div style={{ backgroundColor: '#F8FAFC', padding: '10px', borderRadius: '6px', fontSize: '12px', color: '#475569' }}>
                  {policyInfo.systemImpact}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FEE FORMULA INFO POPUP MODAL */}
      {/* ========================================================================= */}
      {showInfoModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justify: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={() => setShowInfoModal(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              padding: '20px 24px',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ℹ️ Fee Definitions & Calculation Guide
              </h3>
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                style={{
                  border: 'none',
                  background: 'none',
                  fontSize: '18px',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: '4px',
                  fontWeight: '700',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontWeight: '700', color: '#1E40AF', marginBottom: '2px' }}>📊 Total Fee (USDT)</div>
                <div style={{ color: '#1E3A8A' }}>A3 Top-up + Fixed Gas + Withdrawal</div>
                <div style={{ fontSize: '11px', color: '#2563EB', marginTop: '4px', fontWeight: '700', fontFamily: 'monospace' }}>
                  Formula: A3 + Gas + Withdrawal
                </div>
              </div>

              <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontWeight: '700', color: '#991B1B', marginBottom: '2px' }}>⏳ Unpaid Fee (USDT)</div>
                <div style={{ color: '#7F1D1D' }}>Fees awaiting sweep to master wallet</div>
                <div style={{ fontSize: '11px', color: '#DC2626', marginTop: '4px', fontWeight: '700', fontFamily: 'monospace' }}>
                  Formula: Total Fee - Swept Fee
                </div>
              </div>

              <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #86EFAC', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontWeight: '700', color: '#166534', marginBottom: '2px' }}>💳 Top-up Fee (A3 - 2%)</div>
                <div style={{ color: '#14532D' }}>2.0% platform fee on card top-up</div>
                <div style={{ fontSize: '11px', color: '#16A34A', marginTop: '4px', fontWeight: '700', fontFamily: 'monospace' }}>
                  Formula: Top-up Amount × 2.0%
                </div>
              </div>

              <div style={{ backgroundColor: '#FFF7ED', border: '1px solid #FDBA74', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontWeight: '700', color: '#9A3412', marginBottom: '2px' }}>⛽ Gas Fee (Fixed)</div>
                <div style={{ color: '#7C2D12' }}>Fixed TRON TRC-20 network gas fee</div>
                <div style={{ fontSize: '11px', color: '#EA580C', marginTop: '4px', fontWeight: '700', fontFamily: 'monospace' }}>
                  Formula: Tx Count × 3.00 USDT
                </div>
              </div>
            </div>

            <div style={{ marginTop: '18px', textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                style={{
                  padding: '7px 18px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
