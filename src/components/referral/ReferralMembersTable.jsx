import { useMemo, useState, useEffect } from 'react';
import { Icon } from '../ui.jsx';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'inactive', label: 'Inactive' },
];

function StatusBadge({ status }) {
  const safeStatus = status ? status.toLowerCase() : 'active';
  const label = safeStatus.charAt(0).toUpperCase() + safeStatus.slice(1);
  return (
    <span className={`portal-ref-dash__badge portal-ref-dash__badge--${safeStatus}`}>
      {label}
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatUsdt(n) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ReferralMembersTable({ members = [], onDetail, onShowToast }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 5; // 5 referred members per page

  // Filtered referred members list based on user search & status conditions
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (status !== 'all' && (m.status || '').toLowerCase() !== status) return false;
      if (!q) return true;
      const nameMatch = (m.name || '').toLowerCase().includes(q);
      const emailMatch = (m.email || '').toLowerCase().includes(q);
      const idMatch = (m.id || '').toLowerCase().includes(q);
      return nameMatch || emailMatch || idMatch;
    });
  }, [members, search, status]);

  // Reset to page 1 whenever search or status filter changes
  useEffect(() => {
    setPage(1);
  }, [search, status]);

  // Pagination calculation
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pagedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  return (
    <section className="portal-ref-dash__members portal-dash-panel" aria-labelledby="referral-members-title">
      {/* Header with Search and Filter Conditions (조회 조건) */}
      <div className="portal-ref-dash__members-head">
        <div>
          <h2 id="referral-members-title" className="portal-ref-dash__section-title" style={{ margin: 0 }}>
            My Referred Members ({filtered.length})
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--portal-text-muted, #94a3b8)' }}>
            List of members registered under your referral code
          </span>
        </div>

        <div className="portal-ref-dash__members-filters">
          <label className="portal-ref-dash__search">
            <Icon name="scan" size={16} stroke={1.75} />
            <input
              type="search"
              placeholder="Search member name, email, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select
            className="portal-ref-dash__select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table List */}
      <div className="portal-ref-dash__table-wrap">
        <table className="portal-ref-dash__table">
          <thead>
            <tr>
              <th scope="col">Member</th>
              <th scope="col">Status</th>
              <th scope="col">Card Status (카드발급/매수)</th>
              <th scope="col">Total Top-up</th>
              <th scope="col">Reward</th>
              <th scope="col">Joined</th>
            </tr>
          </thead>
          <tbody>
            {pagedItems.length > 0 ? pagedItems.map((m) => {
              const cardCount = Number(m.cards) || 0;
              const hasCard = cardCount > 0 || (m.cardStatus && m.cardStatus !== 'not_issued');
              return (
                <tr key={m.id || m.name}>
                  <td data-label="Member">
                    <span className="portal-ref-dash__member-name">{m.name}</span>
                    {m.email && <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8' }}>{m.email}</span>}
                  </td>
                  <td data-label="Status"><StatusBadge status={m.status} /></td>
                  <td data-label="Card Status">
                    {hasCard ? (
                      <span style={{ color: '#38bdf8', fontWeight: '600', fontSize: '12px', background: 'rgba(56, 189, 248, 0.1)', padding: '3px 8px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                        💳 발급됨 ({cardCount > 0 ? cardCount : 1}장)
                      </span>
                    ) : (
                      <span style={{ color: '#64748b', fontSize: '12px', background: 'rgba(255, 255, 255, 0.05)', padding: '3px 8px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                        미발급 (0장)
                      </span>
                    )}
                  </td>
                  <td data-label="Top-up">{formatUsdt(m.topUpUsdt)} USDT</td>
                  <td data-label="Reward" style={{ fontWeight: '700', color: '#34d399' }}>{formatUsdt(m.rewardUsdt)} USDT</td>
                  <td data-label="Joined">{formatDate(m.joinedAt)}</td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={6} className="portal-ref-dash__table-empty">
                  No referred members match your search & filter parameters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls (페이지 처리) */}
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
          <div>
            Showing <strong>{(safePage - 1) * pageSize + 1}</strong> - <strong>{Math.min(safePage * pageSize, filtered.length)}</strong> of <strong>{filtered.length}</strong> referred members
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              className="portal-ref-dash__detail-btn"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{
                opacity: safePage <= 1 ? 0.4 : 1,
                cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
                padding: '5px 12px',
              }}
            >
              ◀ Prev
            </button>
            <span style={{ fontWeight: '700', color: 'var(--portal-text, #f8fafc)', padding: '0 6px' }}>
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              className="portal-ref-dash__detail-btn"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={{
                opacity: safePage >= totalPages ? 0.4 : 1,
                cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
                padding: '5px 12px',
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
