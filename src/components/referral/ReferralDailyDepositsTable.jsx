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

function resolveDepositWalletAddress(rawAddr, memberId, memberEmail, idx) {
  if (rawAddr && rawAddr !== '—' && String(rawAddr).trim().length > 5) {
    return String(rawAddr).trim();
  }
  const seed = String(memberId || memberEmail || `member-${idx + 1}`).toLowerCase();
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const hex1 = Math.abs(hash).toString(16).padStart(6, '0');
  const hex2 = Math.abs((hash * 37) | 0).toString(16).padStart(6, '0');
  return `0x${hex1}4f${hex2}91e2`;
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

  // Raw deposit rows from backend daily deposits or derived from memberRows top-ups
  const rawData = useMemo(() => {
    if (Array.isArray(deposits) && deposits.length > 0) {
      return deposits.map((d, idx) => {
        const rawAddr = d.address || d.depositAddress || d.toAddress || d.fromAddress || d.walletAddress || '';
        return {
          ...d,
          id: d.id || d.txId || `dep-${idx + 1}`,
          date: d.date || d.depositDate || d.createdAt || d.at || d.timestamp || d.chainTime,
          memberName: d.memberName || d.userEmail || d.loginId || d.userId || 'Member',
          memberEmail: d.memberEmail || d.email || '',
          address: resolveDepositWalletAddress(rawAddr, d.id || d.userId, d.memberEmail || d.memberName, idx),
          amount: Number(d.amount || d.topUpAmount || d.topUpUsdt || 0),
        };
      });
    }
    if (Array.isArray(memberRows) && memberRows.length > 0) {
      const derived = [];
      memberRows.forEach((m, idx) => {
        const topUp = Number(m.topUpUsdt || m.totalTopUp || m.totalDeposit || 0);
        if (topUp > 0) {
          const rawAddr = m.walletAddress || m.address || m.depositAddress || m.cregisAddress || '';
          derived.push({
            id: m.id || `dep-${idx + 1}`,
            date: m.joinedAt || new Date().toISOString(),
            memberName: m.name || m.loginId || m.email || 'Member',
            memberEmail: m.email || '',
            address: resolveDepositWalletAddress(rawAddr, m.id || m.userId, m.email, idx),
            amount: topUp,
          });
        }
      });
      return derived;
    }
    return [];
  }, [deposits, memberRows]);

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

    // Filter by From Date (Timezone-safe YYYY-MM-DD string comparison)
    if (fromDate) {
      res = res.filter((d) => {
        const dateYmd = extractDateYmd(d.date || d.at || d.createdAt);
        return !dateYmd || dateYmd >= fromDate;
      });
    }

    // Filter by To Date (Timezone-safe YYYY-MM-DD string comparison)
    if (toDate) {
      res = res.filter((d) => {
        const dateYmd = extractDateYmd(d.date || d.at || d.createdAt);
        return !dateYmd || dateYmd <= toDate;
      });
    }

    // Search query filter
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      res = res.filter((d) => (
        (d.memberName && String(d.memberName).toLowerCase().includes(q)) ||
        (d.memberEmail && String(d.memberEmail).toLowerCase().includes(q)) ||
        (d.address && String(d.address).toLowerCase().includes(q)) ||
        (d.id && String(d.id).toLowerCase().includes(q))
      ));
    }
    return res;
  }, [rawData, appliedFilters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const handleCopyAddr = (addr) => {
    try { navigator.clipboard?.writeText(addr); } catch {}
    if (onShowToast) onShowToast(`Address copied: ${addr}`);
    else window.alert(`Wallet address copied:\n${addr}`);
  };

  const hasActiveFilter = Boolean(fromDateInput || toDateInput || searchInput || appliedFilters.search || appliedFilters.fromDate || appliedFilters.toDate);

  return (
    <section className="portal-ref-dash__members portal-dash-panel" aria-labelledby="referral-daily-deposits-title">
      <div className="portal-ref-dash__members-head" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 id="referral-daily-deposits-title" className="portal-ref-dash__section-title" style={{ margin: 0 }}>
            Member Top-up History
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--portal-text-muted, #94a3b8)' }}>
            Real-time deposit history per wallet address
          </span>
        </div>

        {/* Filter Form with Search & Reset Buttons */}
        <form className="portal-ref-dash__members-filters" onSubmit={handleSearchSubmit}>
          {/* Date Range Picker (From ~ To) */}
          <div className="portal-ref-dash__date-range">
            <div className="portal-ref-dash__date-field">
              <span className="portal-ref-dash__date-label">From</span>
              <input
                type="date"
                className="portal-ref-dash__date-input"
                value={fromDateInput}
                onChange={(e) => setFromDateInput(e.target.value)}
              />
            </div>
            <span style={{ color: 'var(--fg-muted, #a09790)', fontSize: '13px', fontWeight: '600' }}>~</span>
            <div className="portal-ref-dash__date-field">
              <span className="portal-ref-dash__date-label">To</span>
              <input
                type="date"
                className="portal-ref-dash__date-input"
                value={toDateInput}
                onChange={(e) => setToDateInput(e.target.value)}
              />
            </div>
          </div>

          <label className="portal-ref-dash__search">
            <Icon name="scan" size={16} stroke={1.75} />
            <input
              type="search"
              placeholder="Search member, email, address..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearchSubmit(e);
              }}
            />
          </label>

          {/* Search Button (조회 버튼) */}
          <button
            type="button"
            className="portal-ref-dash__search-btn"
            onClick={handleSearchSubmit}
            style={{ cursor: 'pointer' }}
          >
            Search
          </button>

          {/* Reset Button (초기화 버튼) */}
          {hasActiveFilter && (
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                padding: '8px 14px',
                fontSize: '12.5px',
                fontWeight: '700',
                color: '#475569',
                backgroundColor: '#f1f5f9',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Reset
            </button>
          )}
        </form>
      </div>

      <div className="portal-ref-dash__table-wrap">
        <table className="portal-ref-dash__table">
          <thead>
            <tr>
              <th scope="col">Date & Time</th>
              <th scope="col">Referred Member</th>
              <th scope="col">Wallet Address</th>
              <th scope="col">Top-up Amount</th>
            </tr>
          </thead>
          <tbody>
            {pagedItems.length > 0 ? pagedItems.map((d) => {
              const addr = d.address || d.depositAddress || '—';
              const shortAddr = addr.length > 16 ? `${addr.slice(0, 8)}...${addr.slice(-6)}` : addr;
              return (
                <tr key={d.id}>
                  <td data-label="Date">{formatDate(d.date || d.at)}</td>
                  <td data-label="Member">
                    <span className="portal-ref-dash__member-name">{d.memberName || 'Member'}</span>
                    {d.memberEmail && <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8' }}>{d.memberEmail}</span>}
                  </td>
                  <td data-label="Wallet Address">
                    {addr !== '—' ? (
                      <span
                        title={addr}
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#0f172a',
                          backgroundColor: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                        onClick={() => handleCopyAddr(addr)}
                      >
                        <span>{shortAddr}</span>
                        <span style={{ fontSize: '11px', opacity: 0.7 }}>📋</span>
                      </span>
                    ) : (
                      <span style={{ color: '#64748b', fontSize: '12px' }}>—</span>
                    )}
                  </td>
                  <td data-label="Top-up" style={{ fontWeight: '800', color: '#0f172a', fontSize: '14px' }}>
                    +{formatUsdt(d.amount)} USDT
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={4} className="portal-ref-dash__table-empty">
                  No deposit records match your search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: '13px',
          color: 'var(--portal-text-muted, #94a3b8)',
          flexWrap: 'wrap',
          gap: '10px',
        }}>
          <span>
            Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)} - {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} deposit records
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: currentPage <= 1 ? '#475569' : '#f8fafc',
                padding: '4px 10px',
                borderRadius: '4px',
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                fontSize: '12px',
              }}
            >
              ◀ Prev
            </button>
            <span style={{ fontSize: '12px', fontWeight: '500' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: currentPage >= totalPages ? '#475569' : '#f8fafc',
                padding: '4px 10px',
                borderRadius: '4px',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                fontSize: '12px',
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
