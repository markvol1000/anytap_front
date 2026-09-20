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

export function ReferralMembersTable({ members = [], onDetail, onShowToast }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (status !== 'all' && (m.status || '').toLowerCase() !== status) return false;
      if (!q) return true;
      const nameMatch = (m.name || '').toLowerCase().includes(q);
      const emailMatch = (m.email || '').toLowerCase().includes(q);
      const idMatch = (m.id || m.userId || '').toLowerCase().includes(q);
      return nameMatch || emailMatch || idMatch;
    });
  }, [members, search, status]);

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pagedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  const handleExportCsv = () => {
    if (!filtered || filtered.length === 0) {
      if (onShowToast) onShowToast('No referred members available to export.');
      return;
    }
    const headers = ['Member ID', 'Name', 'Email', 'Status', 'Card Status', 'Joined Date'];
    const escapeCsv = (v) => {
      const s = String(v ?? '').replace(/"/g, '""');
      return `"${s}"`;
    };
    const rows = filtered.map((m) => {
      const cardCount = Number(m.cards) || 0;
      const hasCard = cardCount > 0 || (m.cardStatus && m.cardStatus !== 'not_issued');
      const cardStatusStr = hasCard ? `Issued (${cardCount > 0 ? cardCount : 1} cards)` : 'Not Issued (0 cards)';
      return [
        escapeCsv(m.id || m.userId || ''),
        escapeCsv(m.name || ''),
        escapeCsv(m.email || ''),
        escapeCsv(m.status || 'active'),
        escapeCsv(cardStatusStr),
        escapeCsv(formatDate(m.joinedAt)),
      ].join(',');
    });
    const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `referred_members_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (onShowToast) onShowToast('Referred members CSV exported successfully.');
  };

  return (
    <section className="portal-ref-dash__members portal-dash-panel" aria-labelledby="referral-members-title">
      <div className="portal-ref-dash__members-head" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 id="referral-members-title" className="portal-ref-dash__section-title" style={{ margin: 0 }}>
            My Referred Members ({filtered.length})
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--portal-text-muted, #94a3b8)' }}>
            List of members registered under your referral code
          </span>
        </div>

        <div className="portal-ref-dash__members-filters" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <label className="portal-ref-dash__search" style={{ height: '34px', padding: '0 10px', minWidth: '140px', maxWidth: '180px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
            <Icon name="scan" size={14} stroke={1.75} />
            <input
              type="search"
              placeholder="Member ID, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ fontSize: '12px' }}
            />
          </label>
          <select
            className="portal-ref-dash__select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
            style={{
              height: '34px',
              padding: '0 10px',
              fontSize: '12px',
              fontWeight: '600',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#fff',
              cursor: 'pointer',
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
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
              border: '1.5px solid #bae6fd',
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
        </div>
      </div>

      {/* Table List: ID / Status / Card Status / Joined (per requirements) */}
      <div className="portal-ref-dash__table-wrap">
        <table className="portal-ref-dash__table">
          <thead>
            <tr>
              <th scope="col">Member ID</th>
              <th scope="col">Status</th>
              <th scope="col">Card Status</th>
              <th scope="col">Joined</th>
            </tr>
          </thead>
          <tbody>
            {pagedItems.length > 0 ? pagedItems.map((m) => {
              const cardCount = Number(m.cards) || 0;
              const hasCard = cardCount > 0 || (m.cardStatus && m.cardStatus !== 'not_issued');
              const memId = m.id || m.userId || '—';
              return (
                <tr key={memId}>
                  <td data-label="Member ID">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span className="portal-ref-dash__member-name" style={{ fontFamily: 'monospace', fontWeight: '700', color: '#0f172a' }}>
                        {memId}
                      </span>
                      {m.email && <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>{m.email}</span>}
                    </div>
                  </td>
                  <td data-label="Status"><StatusBadge status={m.status} /></td>
                  <td data-label="Card Status">
                    {hasCard ? (
                      <span style={{ color: '#0284c7', fontWeight: '600', fontSize: '12px', background: '#f0f9ff', border: '1px solid #bae6fd', padding: '3px 8px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                        💳 Issued ({cardCount > 0 ? cardCount : 1} card{cardCount > 1 ? 's' : ''})
                      </span>
                    ) : (
                      <span style={{ color: '#64748b', fontSize: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '3px 8px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                        Not Issued (0 cards)
                      </span>
                    )}
                  </td>
                  <td data-label="Joined">{formatDate(m.joinedAt)}</td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={4} className="portal-ref-dash__table-empty">
                  No referred members match your search & filter parameters.
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
