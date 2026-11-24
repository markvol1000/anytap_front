import { useCallback, useState, useEffect, useMemo } from 'react';
import { Icon } from '../../components/ui.jsx';
import { AdminKpiCard, AdminKpiGrid } from '../components/AdminKpiCard.jsx';
import { AdminDataTable } from '../components/AdminDataTable.jsx';
import { AdminFilterBar, AdminPageHeader, AdminPanel, AdminTableWrap } from '../components/AdminFilterBar.jsx';
import { AdminStatusBadge, formatAdminDate, formatUsdt } from '../components/AdminStatusBadge.jsx';
import { getReferralSettlementSummary, getReferralSettlementDetails, confirmReferralSettlement } from '../services/adminService.js';

export function SettlementPage() {
  // Master Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [referralCodeSearch, setReferralCodeSearch] = useState('');
  const [selectedPartner, setSelectedPartner] = useState(null);

  // Detail Sub-filter ('ALL' | 'CARD_CHARGE' | 'CARD_ISSUANCE')
  const [detailFilterType, setDetailFilterType] = useState('ALL');
  const [detailSearch, setDetailSearch] = useState('');
  const [detailPage, setDetailPage] = useState(1);
  const [detailPageSize, setDetailPageSize] = useState(25);

  // Master Summary State
  const [summaryList, setSummaryList] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Detail Items State & Editable Values
  const [detailItems, setDetailItems] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());
  const [editedRates, setEditedRates] = useState({});
  const [editedPayables, setEditedPayables] = useState({});
  const [actionLoading, setActionLoading] = useState(false);

  // Load Master Summary
  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await getReferralSettlementSummary({
        referralCode: referralCodeSearch.trim() || null,
        startDate: startDate || null,
        endDate: endDate || null,
      });
      const items = res?.items || [];
      setSummaryList(items);

      // Auto-select first partner if not selected or current selection missing
      if (items.length > 0) {
        if (!selectedPartner || !items.some((p) => p.referralCode === selectedPartner.referralCode)) {
          setSelectedPartner(items[0]);
        }
      } else {
        setSelectedPartner(null);
      }
    } catch (err) {
      console.error('Failed to load settlement summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  }, [referralCodeSearch, startDate, endDate, selectedPartner]);

  // Initial Load & Filter change
  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // Load Details whenever selectedPartner or detailFilterType changes
  const loadDetails = useCallback(async () => {
    if (!selectedPartner?.referralCode) {
      setDetailItems([]);
      setSelectedRowIds(new Set());
      setEditedRates({});
      setEditedPayables({});
      setDetailPage(1);
      return;
    }

    setDetailLoading(true);
    try {
      const res = await getReferralSettlementDetails({
        referralCode: selectedPartner.referralCode,
        filterType: detailFilterType,
        startDate: startDate || null,
        endDate: endDate || null,
      });
      const items = res?.items || [];
      setDetailItems(items);

      // Initialize edit buffers with current backend values
      const rates = {};
      const payables = {};
      items.forEach((item) => {
        rates[item.id] = item.feeRatePercent != null ? String(item.feeRatePercent) : '0';
        payables[item.id] = item.payableAmount != null ? String(item.payableAmount) : '0';
      });
      setEditedRates(rates);
      setEditedPayables(payables);
      setSelectedRowIds(new Set());
      setDetailPage(1);
    } catch (err) {
      console.error('Failed to load settlement details:', err);
      setDetailItems([]);
    } finally {
      setDetailLoading(false);
    }
  }, [selectedPartner, detailFilterType, startDate, endDate]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  // Client-side search and filtering for Details
  const filteredDetailItems = useMemo(() => {
    if (!detailSearch.trim()) return detailItems;
    const q = detailSearch.toLowerCase().trim();
    return detailItems.filter((item) => {
      const idMatch = String(item.id || '').toLowerCase().includes(q);
      const txIdMatch = String(item.txId || '').toLowerCase().includes(q);
      const userMatch = String(item.userId || '').toLowerCase().includes(q);
      const nameMatch = String(item.userName || '').toLowerCase().includes(q);
      const emailMatch = String(item.email || '').toLowerCase().includes(q);
      const statusMatch = String(item.status || '').toLowerCase().includes(q);
      return idMatch || txIdMatch || userMatch || nameMatch || emailMatch || statusMatch;
    });
  }, [detailItems, detailSearch]);

  // Pagination for Details
  const detailTotalPages = Math.max(1, Math.ceil(filteredDetailItems.length / detailPageSize));
  const paginatedDetailItems = useMemo(() => {
    const start = (detailPage - 1) * detailPageSize;
    return filteredDetailItems.slice(start, start + detailPageSize);
  }, [filteredDetailItems, detailPage, detailPageSize]);

  // Toggle single row selection
  const handleToggleSelectRow = (rowId) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  // Toggle select all (operates on current filtered items)
  const handleToggleSelectAll = () => {
    if (selectedRowIds.size === filteredDetailItems.length && filteredDetailItems.length > 0) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(filteredDetailItems.map((d) => d.id)));
    }
  };

  // Inline rate change handler (auto updates payable amount for card charge)
  const handleChangeRate = (rowId, newRateStr, originalAmount) => {
    setEditedRates((prev) => ({ ...prev, [rowId]: newRateStr }));
    const parsedRate = parseFloat(newRateStr);
    if (!isNaN(parsedRate) && originalAmount > 0) {
      const calculated = (originalAmount * (parsedRate / 100)).toFixed(2);
      setEditedPayables((prev) => ({ ...prev, [rowId]: calculated }));
    }
  };

  // Inline payable amount manual override
  const handleChangePayable = (rowId, newPayableStr) => {
    setEditedPayables((prev) => ({ ...prev, [rowId]: newPayableStr }));
  };

  // Execute Confirmation / Exclusion Action (Phase 2)
  const handleExecuteBatchAction = async (actionType) => {
    if (!selectedPartner?.referralCode) {
      window.alert('Please select a referral agent first.');
      return;
    }
    if (selectedRowIds.size === 0) {
      window.alert(`Please select at least one row to ${actionType === 'CONFIRM' ? 'confirm' : 'exclude'}.`);
      return;
    }

    const confirmMsg = actionType === 'CONFIRM'
      ? `Confirm and finalize ${selectedRowIds.size} selected settlement line(s)?\nConfirmed lines will be saved to the database.`
      : `Exclude ${selectedRowIds.size} selected settlement line(s) from payout (0 USDT)?`;

    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const targetItems = detailItems
        .filter((d) => selectedRowIds.has(d.id))
        .map((d) => ({
          ...d,
          feeRatePercent: parseFloat(editedRates[d.id] ?? d.feeRatePercent) || 0,
          payableAmount: parseFloat(editedPayables[d.id] ?? d.payableAmount) || 0,
        }));

      await confirmReferralSettlement({
        referralCode: selectedPartner.referralCode,
        action: actionType,
        items: targetItems,
      });

      window.alert(`Successfully ${actionType === 'CONFIRM' ? 'confirmed' : 'excluded'} ${targetItems.length} transaction(s)!`);
      await loadDetails();
      await loadSummary();
    } catch (err) {
      window.alert(err.message || 'Failed to update settlement status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Totals for top KPI Cards
  const kpiTotals = useMemo(() => {
    let totalCharge = 0;
    let totalCards = 0;
    let totalCommission = 0;
    let totalPayable = 0;

    summaryList.forEach((s) => {
      totalCharge += Number(s.totalChargeAmount || 0);
      totalCards += Number(s.activeCardCount || 0);
      totalCommission += Number(s.calculatedFeeAmount || 0);
      totalPayable += Number(s.payableAmount || 0);
    });

    return {
      partnerCount: summaryList.length,
      totalCharge,
      totalCards,
      totalCommission,
      totalPayable,
    };
  }, [summaryList]);

  // Master Table Columns
  const masterColumns = [
    {
      key: 'referralCode',
      label: 'Referral Code',
      render: (r) => (
        <strong style={{ fontFamily: 'monospace', color: '#0284c7', fontSize: '13px' }}>
          {r.referralCode}
        </strong>
      ),
    },
    {
      key: 'account',
      label: 'Partner Account',
      render: (r) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{r.memberName || r.loginId || r.userId}</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>{r.email}</div>
        </div>
      ),
    },
    {
      key: 'payoutWalletAddress',
      label: 'Payout Wallet',
      render: (r) => (
        <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#475569' }} title={r.payoutWalletAddress}>
          {r.payoutWalletAddress && r.payoutWalletAddress.length > 18
            ? `${r.payoutWalletAddress.slice(0, 8)}...${r.payoutWalletAddress.slice(-8)}`
            : (r.payoutWalletAddress || '—')}
        </span>
      ),
    },
    {
      key: 'totalChargeAmount',
      label: 'Total Top-up',
      render: (r) => (
        <strong style={{ color: '#0284c7', fontFamily: 'monospace' }}>
          {formatUsdt(r.totalChargeAmount)} USDT
        </strong>
      ),
    },
    {
      key: 'feeRatePercent',
      label: 'Base Rate',
      render: (r) => (
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '12px',
            backgroundColor: '#f0fdf4',
            color: '#16a34a',
            border: '1px solid #bbf7d0',
          }}
        >
          {r.feeRatePercent}%
        </span>
      ),
    },
    {
      key: 'calculatedFeeAmount',
      label: 'Charge Fee',
      render: (r) => (
        <span style={{ fontFamily: 'monospace', color: '#334155' }}>
          +{formatUsdt(r.calculatedFeeAmount)}
        </span>
      ),
    },
    {
      key: 'activeCardCount',
      label: 'Issued Cards',
      render: (r) => (
        <span style={{ fontWeight: 600, color: '#0f172a' }}>
          {r.activeCardCount} cards
        </span>
      ),
    },
    {
      key: 'payableAmount',
      label: 'Payable Target',
      render: (r) => (
        <strong style={{ color: '#16a34a', fontFamily: 'monospace', fontSize: '13px' }}>
          +{formatUsdt(r.payableAmount)} USDT
        </strong>
      ),
    },
    {
      key: 'status',
      label: 'Settlement Status',
      render: (r) => <AdminStatusBadge status={r.status || 'DRAFT'} />,
    },
  ];

  // Detail Table Columns with Checkboxes & Inline Input Controls
  const detailColumns = [
    {
      key: 'select',
      label: (
        <input
          type="checkbox"
          checked={filteredDetailItems.length > 0 && selectedRowIds.size === filteredDetailItems.length}
          onChange={handleToggleSelectAll}
          style={{ cursor: 'pointer' }}
        />
      ),
      render: (r) => (
        <input
          type="checkbox"
          checked={selectedRowIds.has(r.id)}
          onChange={() => handleToggleSelectRow(r.id)}
          onClick={(e) => e.stopPropagation()}
          style={{ cursor: 'pointer' }}
        />
      ),
    },
    {
      key: 'txDate',
      label: 'Date',
      render: (r) => formatAdminDate(r.txDate),
    },
    {
      key: 'itemType',
      label: 'Type',
      render: (r) => {
        const isCharge = r.itemType === 'CARD_CHARGE';
        return (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: isCharge ? '#eff6ff' : '#faf5ff',
              color: isCharge ? '#2563eb' : '#9333ea',
              border: `1px solid ${isCharge ? '#bfdbfe' : '#e9d5ff'}`,
            }}
          >
            {isCharge ? '💳 Top-up Fee' : '🪪 Card Issuance'}
          </span>
        );
      },
    },
    {
      key: 'user',
      label: 'Member ID / Email',
      render: (r) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{r.userName || r.userId}</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>{r.email}</div>
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Tx Amount',
      render: (r) => (
        <span style={{ fontFamily: 'monospace', color: '#0284c7' }}>
          {r.amount > 0 ? `${formatUsdt(r.amount)} USDT` : '—'}
        </span>
      ),
    },
    {
      key: 'feeRatePercent',
      label: 'Fee Rate (%)',
      render: (r) => {
        if (r.itemType === 'CARD_ISSUANCE') {
          return <span style={{ fontSize: '11px', color: '#64748b' }}>Fixed Unit</span>;
        }
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              className="admin-input"
              style={{ width: '65px', padding: '3px 6px', fontSize: '12px', textAlign: 'right' }}
              value={editedRates[r.id] ?? r.feeRatePercent ?? '0'}
              onChange={(e) => handleChangeRate(r.id, e.target.value, r.amount)}
              onClick={(e) => e.stopPropagation()}
            />
            <span style={{ fontSize: '11px', color: '#64748b' }}>%</span>
          </div>
        );
      },
    },
    {
      key: 'feeAmount',
      label: 'Calculated Fee',
      render: (r) => (
        <span style={{ fontFamily: 'monospace' }}>
          +{formatUsdt(r.feeAmount)} USDT
        </span>
      ),
    },
    {
      key: 'payableAmount',
      label: 'Payable Amount (USDT)',
      render: (r) => (
        <input
          type="number"
          step="0.01"
          min="0"
          className="admin-input"
          style={{ width: '85px', padding: '3px 6px', fontSize: '12px', fontWeight: 600, textAlign: 'right', color: '#16a34a' }}
          value={editedPayables[r.id] ?? r.payableAmount ?? '0'}
          onChange={(e) => handleChangePayable(r.id, e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => {
        const isConfirmed = r.status === 'CONFIRMED';
        const isExcluded = r.status === 'EXCLUDED';
        return (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: isConfirmed ? '#f0fdf4' : isExcluded ? '#fef2f2' : '#f8fafc',
              color: isConfirmed ? '#16a34a' : isExcluded ? '#dc2626' : '#64748b',
              border: `1px solid ${isConfirmed ? '#bbf7d0' : isExcluded ? '#fecaca' : '#e2e8f0'}`,
            }}
          >
            {isConfirmed ? 'CONFIRMED (O)' : isExcluded ? 'EXCLUDED (X)' : 'PENDING'}
          </span>
        );
      },
    },
    {
      key: 'confirmedAt',
      label: 'Confirmed Date',
      render: (r) => (r.confirmedAt ? formatAdminDate(r.confirmedAt) : '—'),
    },
  ];

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Referral Settlement Console"
        subtitle="Review, audit, override commission rates, and finalize settlement lines with instant database persistence."
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={() => window.alert('Excel export will be available in Phase 3.')}
            >
              📥 Export Excel
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={() => window.alert('Email dispatch pipeline will be available in Phase 3.')}
            >
              ✉️ Send Statement Mail
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <AdminKpiGrid>
        <AdminKpiCard
          label="Active Referral Partners"
          value={kpiTotals.partnerCount}
          sub="Queried agent codes"
          color="#0284c7"
        />
        <AdminKpiCard
          label="Referred Card Top-up Total"
          value={`${formatUsdt(kpiTotals.totalCharge)} USDT`}
          sub="Wallet-to-card volume"
          color="#2563eb"
        />
        <AdminKpiCard
          label="Active Issued Cards"
          value={`${kpiTotals.totalCards} Cards`}
          sub="Eligible for incentive"
          color="#8b5cf6"
        />
        <AdminKpiCard
          label="Total Settlement Target"
          value={`${formatUsdt(kpiTotals.totalPayable)} USDT`}
          sub="Charge fees + Card rewards"
          color="#16a34a"
        />
      </AdminKpiGrid>

      {/* Master Filter Bar */}
      <AdminFilterBar>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Period:</span>
            <input
              type="date"
              className="admin-input"
              style={{ width: '140px', padding: '6px 10px', fontSize: '12px' }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span style={{ color: '#94a3b8' }}>~</span>
            <input
              type="date"
              className="admin-input"
              style={{ width: '140px', padding: '6px 10px', fontSize: '12px' }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Referral Code:</span>
            <input
              type="text"
              placeholder="e.g. VIP888, ALL"
              className="admin-input"
              style={{ width: '160px', padding: '6px 10px', fontSize: '12px' }}
              value={referralCodeSearch}
              onChange={(e) => setReferralCodeSearch(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="admin-btn admin-btn--primary"
            style={{ padding: '6px 14px', fontSize: '12px' }}
            onClick={loadSummary}
            disabled={summaryLoading}
          >
            {summaryLoading ? 'Searching…' : '🔍 Search'}
          </button>
        </div>
      </AdminFilterBar>

      {/* ── Section 1: Master Grid (Agent Summary) ── */}
      <AdminPanel style={{ marginTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
              📊 Referral Agent Settlement Summary (Master)
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              Select a referral agent row to audit and finalize individual transaction lines below.
            </p>
          </div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Total: <strong>{summaryList.length}</strong> partners
          </span>
        </div>

        <AdminTableWrap>
          <AdminDataTable
            columns={masterColumns}
            rows={summaryList}
            selectedId={selectedPartner?.referralCode}
            onSelectRow={(r) => setSelectedPartner(r)}
            page={1}
            totalPages={1}
            total={summaryList.length}
            onPageChange={() => {}}
          />
        </AdminTableWrap>
      </AdminPanel>

      {/* ── Section 2: Detail Grid (Transaction Audit & Confirmation) ── */}
      <AdminPanel style={{ marginTop: '24px', border: '1px solid #cbd5e1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                📋 Detailed Transactions & Confirmation Control
              </h3>
              {selectedPartner && (
                <span
                  style={{
                    backgroundColor: '#e0f2fe',
                    color: '#0369a1',
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                  }}
                >
                  Agent: {selectedPartner.referralCode} ({selectedPartner.memberName || selectedPartner.loginId})
                </span>
              )}
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              Override individual fee rates or payable amounts, select items using checkboxes, and finalize with the action buttons.
            </p>
          </div>

          {/* Search Box & Sub Tab Filter */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Quick Search Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="text"
                placeholder="Search user, ID, email, status..."
                className="admin-input"
                style={{ width: '220px', padding: '5px 10px', fontSize: '12px' }}
                value={detailSearch}
                onChange={(e) => {
                  setDetailSearch(e.target.value);
                  setDetailPage(1);
                }}
              />
              {detailSearch && (
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary"
                  style={{ padding: '4px 8px', fontSize: '11px' }}
                  onClick={() => {
                    setDetailSearch('');
                    setDetailPage(1);
                  }}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Type Filters */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                className={`admin-btn ${detailFilterType === 'ALL' ? 'admin-btn--primary' : 'admin-btn--secondary'}`}
                style={{ padding: '4px 10px', fontSize: '12px' }}
                onClick={() => setDetailFilterType('ALL')}
              >
                All Records ({filteredDetailItems.length})
              </button>
              <button
                type="button"
                className={`admin-btn ${detailFilterType === 'CARD_CHARGE' ? 'admin-btn--primary' : 'admin-btn--secondary'}`}
                style={{ padding: '4px 10px', fontSize: '12px' }}
                onClick={() => setDetailFilterType('CARD_CHARGE')}
              >
                Top-up Fees
              </button>
              <button
                type="button"
                className={`admin-btn ${detailFilterType === 'CARD_ISSUANCE' ? 'admin-btn--primary' : 'admin-btn--secondary'}`}
                style={{ padding: '4px 10px', fontSize: '12px' }}
                onClick={() => setDetailFilterType('CARD_ISSUANCE')}
              >
                Card Issuance
              </button>
            </div>
          </div>
        </div>

        {/* Action Control Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            backgroundColor: '#f8fafc',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            marginBottom: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
              Selected: <strong>{selectedRowIds.size}</strong> of {filteredDetailItems.length} lines
            </span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              • Viewing {detailPageSize} items per page (Page {detailPage} of {detailTotalPages})
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              style={{ padding: '4px 12px', fontSize: '12px', color: '#dc2626' }}
              onClick={() => handleExecuteBatchAction('EXCLUDE')}
              disabled={actionLoading || selectedRowIds.size === 0}
            >
              ✖ Exclude Selected (X)
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              style={{ padding: '4px 14px', fontSize: '12px' }}
              onClick={() => handleExecuteBatchAction('CONFIRM')}
              disabled={actionLoading || selectedRowIds.size === 0}
            >
              {actionLoading ? 'Saving…' : '✔ Confirm Selected (O)'}
            </button>
          </div>
        </div>

        <AdminTableWrap>
          {detailLoading ? (
            <p className="admin-loading admin-loading--inline">Loading transaction details…</p>
          ) : filteredDetailItems.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
              {detailSearch ? `No records matching "${detailSearch}".` : 'No transaction or card issuance records found for the selected period.'}
            </div>
          ) : (
            <AdminDataTable
              columns={detailColumns}
              rows={paginatedDetailItems}
              page={detailPage}
              totalPages={detailTotalPages}
              total={filteredDetailItems.length}
              pageSize={detailPageSize}
              onPageChange={(p) => setDetailPage(p)}
              onPageSizeChange={(sz) => {
                setDetailPageSize(sz);
                setDetailPage(1);
              }}
            />
          )}
        </AdminTableWrap>
      </AdminPanel>
    </div>
  );
}
