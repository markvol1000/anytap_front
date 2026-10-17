import { useState, useMemo } from 'react';
import { Icon } from '../ui.jsx';

function formatUsdt(n) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(isoStr) {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return String(isoStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(isoStr);
  }
}

function getDefaultPastMonthRange() {
  const now = new Date();
  const toStr = now.toISOString().slice(0, 10);
  const fromObj = new Date(now);
  fromObj.setMonth(fromObj.getMonth() - 1);
  const fromStr = fromObj.toISOString().slice(0, 10);
  return { fromStr, toStr };
}

function extractDateYmd(raw) {
  if (!raw) return '';
  if (typeof raw === 'number') {
    try { return new Date(raw).toISOString().slice(0, 10); } catch { return ''; }
  }
  const str = String(raw).trim();
  if (str.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  } catch {}
  return '';
}

const PAGE_SIZE = 5;

export function ReferralDailyDepositsTable({ deposits = [], memberRows = [], onShowToast }) {
  const defaultDates = useMemo(() => getDefaultPastMonthRange(), []);

  const [searchInput, setSearchInput] = useState('');
  const [fromDateInput, setFromDateInput] = useState(defaultDates.fromStr);
  const [toDateInput, setToDateInput] = useState(defaultDates.toStr);

  const [appliedFilters, setAppliedFilters] = useState({
    fromDate: defaultDates.fromStr,
    toDate: defaultDates.toStr,
    search: '',
  });

  const [page, setPage] = useState(1);

  // Raw card charge rows from backend (filtered exclusively for wallet-to-card charges)
  const rawData = useMemo(() => {
    if (Array.isArray(deposits) && deposits.length > 0) {
      return deposits
        .filter((d) => {
          const txType = (d.txType || d.type || '').toUpperCase();
          if (txType === 'DEPOSIT' || txType === 'WITHDRAW' || txType === 'CARD_SPEND' || txType === 'REFUND') return false;
          if (d.toAddress === 'Wasabi Card Deposit') return false;
          return true;
        })
        .map((d, idx) => ({
          ...d,
          id: d.id || d.txId || `charge-${idx + 1}`,
          date: d.date || d.depositDate || d.createdAt || d.at || d.timestamp || d.chainTime,
          memberId: d.memberId || d.userId || (d.id && String(d.id).startsWith('US') ? d.id : `US_${idx + 1}`),
          memberName: d.memberName || d.userEmail || d.loginId || d.email || '',
          memberEmail: d.memberEmail || d.email || d.loginId || (d.memberName && d.memberName.includes('@') ? d.memberName : ''),
          amount: Number(d.amount || d.topUpAmount || d.topUpUsdt || 0),
          feeAmount: Number(d.feeAmount ?? d.commission ?? d.referrerAllowance ?? d.fee ?? 0),
        }));
    }
    return [];
  }, [deposits]);

  const handleSearchSubmit = (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    setAppliedFilters({
      fromDate: fromDateInput,
      toDate: toDateInput,
      search: searchInput,
    });
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setFromDateInput('');
    setToDateInput('');
    setAppliedFilters({ fromDate: '', toDate: '', search: '' });
    setPage(1);
  };

  const filtered = useMemo(() => {
    let res = rawData;
    const { fromDate, toDate, search } = appliedFilters;

    if (fromDate) {
      res = res.filter((d) => {
        const dateYmd = extractDateYmd(d.date || d.at || d.createdAt);
        return !dateYmd || dateYmd >= fromDate;
      });
    }

    if (toDate) {
      res = res.filter((d) => {
        const dateYmd = extractDateYmd(d.date || d.at || d.createdAt);
        return !dateYmd || dateYmd <= toDate;
      });
    }

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      res = res.filter((d) => (
        (d.memberEmail && String(d.memberEmail).toLowerCase().includes(q)) ||
        (d.memberName && String(d.memberName).toLowerCase().includes(q)) ||
        (d.memberId && String(d.memberId).toLowerCase().includes(q)) ||
        (d.id && String(d.id).toLowerCase().includes(q))
      ));
    }

    // Sort descending chronologically (latest first)
    return [...res].sort((a, b) => {
      const ta = new Date(a.date || a.createdAt || 0).getTime();
      const tb = new Date(b.date || b.createdAt || 0).getTime();
      return tb - ta;
    });
  }, [rawData, appliedFilters]);

  const summaryTotals = useMemo(() => {
    let totalAmount = 0;
    let totalFee = 0;
    filtered.forEach((d) => {
      totalAmount += Number(d.amount || 0);
      totalFee += Number(d.feeAmount || 0);
    });
    return {
      count: filtered.length,
      totalAmount,
      totalFee,
    };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const handleExportCsv = () => {
    if (filtered.length === 0) {
      if (onShowToast) onShowToast('No data to export.');
      return;
    }
    const headers = ['Date & Time', 'Login ID (Email)', 'Card Charge Amount (USDT)', 'Rate (%)', 'Fee (USDT)'];
    const escapeCsv = (v) => {
      const s = String(v ?? '').replace(/"/g, '""');
      return `"${s}"`;
    };
    const rows = filtered.map((d) => {
      const rateStr = d.ratePercent != null
        ? `${d.ratePercent}%`
        : (d.amount > 0 && d.feeAmount > 0
          ? `${((d.feeAmount / d.amount) * 100).toFixed(1)}%`
          : '—');
      return [
        escapeCsv(formatDate(d.date || d.at)),
        escapeCsv(d.memberEmail || d.memberName || d.loginId || d.email || d.memberId || ''),
        escapeCsv(d.amount?.toFixed(2) || '0.00'),
        escapeCsv(rateStr),
        escapeCsv(d.feeAmount?.toFixed(2) || '0.00'),
      ].join(',');
    });
    const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `referral_card_charges_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (onShowToast) onShowToast('CSV exported successfully.');
  };

  const hasActiveFilter = Boolean(fromDateInput || toDateInput || searchInput || appliedFilters.search || appliedFilters.fromDate || appliedFilters.toDate);

  return (
    <section className="portal-ref-dash__members portal-dash-panel" aria-labelledby="referral-daily-deposits-title">
      <div className="portal-ref-dash__members-head" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 id="referral-daily-deposits-title" className="portal-ref-dash__section-title" style={{ margin: 0 }}>
            Member Card Charge History
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--portal-text-muted, #94a3b8)' }}>
            Real-time card charge performance per referred member
          </span>
        </div>

        {/* Filter Form with Search, Reset & Export Buttons */}
        <form className="portal-ref-dash__members-filters" onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {/* Date Range Picker (Compact, without From/To labels) */}
          <div className="portal-ref-dash__date-range" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="date"
              aria-label="Filter start date"
              className="portal-ref-dash__date-input"
              value={fromDateInput}
              onChange={(e) => setFromDateInput(e.target.value)}
              style={{
                height: '34px',
                padding: '0 8px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '12px',
                backgroundColor: '#ffffff',
                color: '#1a1a1a',
              }}
            />
            <span style={{ color: 'var(--fg-muted, #94a3b8)', fontSize: '12px', fontWeight: '700' }}>~</span>
            <input
              type="date"
              aria-label="Filter end date"
              className="portal-ref-dash__date-input"
              value={toDateInput}
              onChange={(e) => setToDateInput(e.target.value)}
              style={{
                height: '34px',
                padding: '0 8px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '12px',
                backgroundColor: '#ffffff',
                color: '#1a1a1a',
              }}
            />
          </div>

          <label className="portal-ref-dash__search" style={{ height: '34px', padding: '0 10px', minWidth: '140px', maxWidth: '180px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
            <Icon name="scan" size={14} stroke={1.75} />
            <input
              type="search"
              placeholder="Search email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearchSubmit(e);
              }}
              style={{ fontSize: '12px' }}
            />
          </label>

          {/* Search Button */}
          <button
            type="button"
            className="portal-ref-dash__search-btn"
            onClick={handleSearchSubmit}
            style={{
              height: '34px',
              padding: '0 12px',
              fontSize: '12px',
              fontWeight: '700',
              borderRadius: '6px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Search
          </button>

          {/* Reset Button */}
          {hasActiveFilter && (
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                height: '34px',
                padding: '0 10px',
                fontSize: '12px',
                fontWeight: '700',
                color: '#475569',
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              Reset
            </button>
          )}

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCsv}
            style={{
              height: '34px',
              padding: '0 10px',
              fontSize: '12px',
              fontWeight: '700',
              color: '#0284c7',
              backgroundColor: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
            }}
          >
            📥 Export CSV
          </button>
        </form>
      </div>

      <div className="portal-ref-dash__table-wrap">
        <table className="portal-ref-dash__table">
          <thead>
            <tr>
              <th scope="col">Date & Time</th>
              <th scope="col">Login ID (Email)</th>
              <th scope="col">Card Charge Amount</th>
              <th scope="col">Rate (%)</th>
              <th scope="col">Fee</th>
            </tr>
          </thead>
          <tbody>
            {pagedItems.length > 0 ? pagedItems.map((d) => {
              const displayEmail = d.memberEmail || d.memberName || d.loginId || d.email || d.memberId || '—';
              const rateVal = d.ratePercent != null
                ? Number(d.ratePercent)
                : (d.amount > 0 && d.feeAmount > 0
                  ? Number(((d.feeAmount / d.amount) * 100).toFixed(2))
                  : null);
              return (
                <tr key={d.id}>
                  <td data-label="Date & Time">{formatDate(d.date || d.at)}</td>
                  <td data-label="Login ID (Email)">
                    <span style={{ fontWeight: '600', color: 'var(--ink, #0f172a)' }}>
                      {displayEmail}
                    </span>
                  </td>
                  <td data-label="Card Charge Amount" style={{ fontWeight: '800', color: '#0284c7', fontSize: '14px' }}>
                    +{formatUsdt(d.amount)} USDT
                  </td>
                  <td data-label="Rate (%)">
                    {rateVal != null ? (
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '1px 6px',
                          borderRadius: '3px',
                          fontWeight: '700',
                          fontSize: '11px',
                          color: rateVal > 0 ? '#0284c7' : '#64748b',
                          backgroundColor: rateVal > 0 ? '#f0f9ff' : '#f1f5f9',
                          border: `1px solid ${rateVal > 0 ? '#bae6fd' : '#e2e8f0'}`,
                        }}
                      >
                        {rateVal}%
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '12px' }}>—</span>
                    )}
                  </td>
                  <td data-label="Fee" style={{ fontWeight: '600', color: 'var(--ink, #0f172a)', fontSize: '13px' }}>
                    {formatUsdt(d.feeAmount)} USDT
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={5} className="portal-ref-dash__table-empty">
                  No card charge records match your search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Period Summary Totals Bar */}
      {filtered.length > 0 && (
        <div
          className="portal-ref-dash__summary-bar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginTop: '14px',
            padding: '12px 16px',
            background: 'var(--portal-bg-surface-elevated, #f8fafc)',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Period Summary
            </span>
            <span style={{ fontSize: '12px', color: '#cbd5e1' }}>•</span>
            <span style={{ fontSize: '12px', color: '#475569', fontWeight: '500' }}>
              <strong>{summaryTotals.count}</strong> transaction{summaryTotals.count === 1 ? '' : 's'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Total Card Top-up:</span>
              <strong style={{ fontSize: '13px', color: '#0284c7', fontFamily: 'monospace' }}>
                +{formatUsdt(summaryTotals.totalAmount)} USDT
              </strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Total Commission:</span>
              <strong style={{ fontSize: '13px', color: '#16a34a', fontFamily: 'monospace' }}>
                +{formatUsdt(summaryTotals.totalFee)} USDT
              </strong>
            </div>
          </div>
        </div>
      )}

      {filtered.length > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: '1px solid #e2e8f0',
          fontSize: '13px',
          color: '#64748b',
          flexWrap: 'wrap',
          gap: '10px',
        }}>
          <span>
            Showing <strong>{Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}</strong> - <strong>{Math.min(currentPage * PAGE_SIZE, filtered.length)}</strong> of <strong>{filtered.length}</strong> records
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{
                backgroundColor: currentPage <= 1 ? '#f1f5f9' : '#ffffff',
                border: '1px solid #cbd5e1',
                color: currentPage <= 1 ? '#94a3b8' : '#0f172a',
                padding: '5px 12px',
                borderRadius: '6px',
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                fontWeight: '600',
                boxShadow: currentPage <= 1 ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.05)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease',
              }}
            >
              ◀ Prev
            </button>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#334155', padding: '0 4px' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={{
                backgroundColor: currentPage >= totalPages ? '#f1f5f9' : '#ffffff',
                border: '1px solid #cbd5e1',
                color: currentPage >= totalPages ? '#94a3b8' : '#0f172a',
                padding: '5px 12px',
                borderRadius: '6px',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                fontWeight: '600',
                boxShadow: currentPage >= totalPages ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.05)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease',
              }}
            >
              Next ▶
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
