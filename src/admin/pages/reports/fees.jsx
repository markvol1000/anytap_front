import React, { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { getFeesReport } from '../../services/adminService.js';

export function FeesReportPage() {
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('byUser'); // 'byUser' | 'byItem'
  const [reportData, setReportData] = useState({ summary: {}, byUser: [], byItem: [] });
  const [searchTerm, setSearchTerm] = useState('');
  const [feeTypeFilter, setFeeTypeFilter] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  // Date Range Filter States
  const [datePreset, setDatePreset] = useState('all'); // 'all' | 'today' | '7d' | '30d' | 'thisMonth' | 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, feeTypeFilter, startDate, endDate, viewMode, pageSize]);

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
    <div className="admin-page" style={{ backgroundColor: '#ffffff', minHeight: '100vh', padding: '24px', color: '#333333' }}>
      {/* Reports Navigation Sub-Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        borderBottom: '2px solid #E0E0E0',
        marginBottom: '24px',
      }}>
        <NavLink
          to="/admin/reports/cards"
          style={({ isActive }) => ({
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '700',
            color: isActive ? '#007BFF' : '#64748B',
            borderBottom: isActive ? '3px solid #007BFF' : '3px solid transparent',
            textDecoration: 'none',
            marginBottom: '-2px',
            transition: 'all 0.15s ease',
          })}
        >
          💳 Card Application Status
        </NavLink>
        <NavLink
          to="/admin/reports/fees"
          style={({ isActive }) => ({
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '700',
            color: isActive ? '#007BFF' : '#64748B',
            borderBottom: isActive ? '3px solid #007BFF' : '3px solid transparent',
            textDecoration: 'none',
            marginBottom: '-2px',
            transition: 'all 0.15s ease',
          })}
        >
          💰 Fee Analysis Report
        </NavLink>
      </div>

      {/* Page Title Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1E293B', margin: 0 }}>Fee Analysis & Policy Report</h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>TOTAL FEES COLLECTED</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#0F172A', marginTop: '6px' }}>
            ${Number(summary.totalFeesCollected || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
          </div>
          <div style={{ fontSize: '11px', color: '#10B981', marginTop: '4px' }}>✓ Aggregate All Revenues</div>
        </div>

        <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>CARD TOP-UP FEES (A3 - 2.0%)</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#2563EB', marginTop: '6px' }}>
            ${Number(summary.totalChargeFeesA3 || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>Platform 2% Fee Income</div>
        </div>

        <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>FIXED GAS FEES (3 USDT)</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#D97706', marginTop: '6px' }}>
            ${Number(summary.totalGasFeesFixed || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>TRON Network Gas Fee</div>
        </div>

        <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>PAYING USERS / AVG FEE</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#7C3AED', marginTop: '6px' }}>
            {summary.activePayingUsers || 0} Users <span style={{ fontSize: '13px', color: '#64748B', fontWeight: '500' }}>(${summary.avgFeePerUser || 0}/User)</span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>Active Paying Accounts</div>
        </div>
      </div>

      {/* Fee Calculation & Policy Formula Guide Banner */}
      <div style={{
        backgroundColor: '#EFF6FF',
        border: '1px solid #BFDBFE',
        borderRadius: '8px',
        padding: '14px 18px',
        marginBottom: '20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        fontSize: '12px',
      }}>
        <div>
          <div style={{ fontWeight: '700', color: '#1E40AF', marginBottom: '2px' }}>📊 Total Fee (USDT)</div>
          <div style={{ color: '#1E3A8A' }}>A3 Top-up + Fixed Gas + Withdrawal</div>
          <div style={{ fontSize: '11px', color: '#2563EB', marginTop: '3px', fontWeight: '600', fontFamily: 'monospace' }}>
            Formula: A3 + Gas + Withdrawal
          </div>
        </div>
        <div>
          <div style={{ fontWeight: '700', color: '#991B1B', marginBottom: '2px' }}>⏳ Unpaid Fee (USDT)</div>
          <div style={{ color: '#7F1D1D' }}>Fees awaiting sweep to master wallet</div>
          <div style={{ fontSize: '11px', color: '#DC2626', marginTop: '3px', fontWeight: '600', fontFamily: 'monospace' }}>
            Formula: Total Fee - Swept Fee
          </div>
        </div>
        <div>
          <div style={{ fontWeight: '700', color: '#166534', marginBottom: '2px' }}>💳 Top-up Fee (A3 - 2%)</div>
          <div style={{ color: '#14532D' }}>2.0% platform fee on card top-up</div>
          <div style={{ fontSize: '11px', color: '#16A34A', marginTop: '3px', fontWeight: '600', fontFamily: 'monospace' }}>
            Formula: Top-up Amount × 2.0%
          </div>
        </div>
        <div>
          <div style={{ fontWeight: '700', color: '#9A3412', marginBottom: '2px' }}>⛽ Gas Fee (Fixed)</div>
          <div style={{ color: '#7C2D12' }}>Fixed TRON TRC-20 network gas fee</div>
          <div style={{ fontSize: '11px', color: '#EA580C', marginTop: '3px', fontWeight: '600', fontFamily: 'monospace' }}>
            Formula: Tx Count × 3.00 USDT
          </div>
        </div>
      </div>

      {/* Date Range Filter Bar */}
      <div style={{
        backgroundColor: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        {/* Date Preset Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        backgroundColor: '#F1F5F9',
        padding: '12px 16px',
        borderRadius: '8px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        {/* Left: View Mode Toggle */}
        <div style={{ display: 'flex', gap: '4px', backgroundColor: '#CBD5E1', padding: '3px', borderRadius: '6px' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
              width: '260px',
              backgroundColor: '#FFFFFF',
            }}
          />
        </div>
      </div>

      {/* Main List Table Area */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748B', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
          ⏳ Loading fee analysis report data...
        </div>
      ) : viewMode === 'byUser' ? (
        /* ================= USER BREAKDOWN TABLE ================= */
        <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden', marginBottom: '24px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
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
      ) : (
        /* ================= ITEMIZED FEE TABLE ================= */
        <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden', marginBottom: '24px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
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
      )}

      {/* Pagination Bar */}
      {!loading && currentTotal > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          backgroundColor: '#F8FAFC',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
          marginBottom: '24px',
          fontSize: '13px',
          color: '#475569',
        }}>
          <div>
            Showing <strong>{Math.min((currentPage - 1) * pageSize + 1, currentTotal)}</strong> to <strong>{Math.min(currentPage * pageSize, currentTotal)}</strong> of <strong>{currentTotal}</strong> entries
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Page Size Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12px',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>per page</span>
            </div>

            {/* Page Navigation Buttons */}
            <div style={{ display: 'flex', gap: '4px' }}>
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
        style={{
          backgroundColor: '#F8FAFC',
          borderRadius: '10px',
          border: '2px solid #3B82F6',
          padding: '24px',
          marginTop: '28px',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* LEFT COLUMN: Calculation & Transaction Fields */}
          <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B', marginTop: 0, marginBottom: '14px' }}>
              📋 Transaction Calculation Breakdown
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
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

            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed #E2E8F0', fontSize: '12px', color: '#475569' }}>
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
    </div>
  );
}
