import { useMemo, useState } from 'react';
import { Icon } from '../ui.jsx';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'inactive', label: 'Inactive' },
];

function StatusBadge({ status }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={`portal-ref-dash__badge portal-ref-dash__badge--${status}`}>
      {label}
    </span>
  );
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatUsdt(n) {
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ReferralMembersTable({ members, onDetail, onShowToast }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (status !== 'all' && m.status !== status) return false;
      if (!q) return true;
      return m.name.toLowerCase().includes(q);
    });
  }, [members, search, status]);

  return (
    <section className="portal-ref-dash__members portal-dash-panel" aria-labelledby="referral-members-title">
      <div className="portal-ref-dash__members-head">
        <h2 id="referral-members-title" className="portal-ref-dash__section-title">Referral Members</h2>
        <div className="portal-ref-dash__members-filters">
          <label className="portal-ref-dash__search">
            <Icon name="scan" size={16} stroke={1.75} />
            <input
              type="search"
              placeholder="Search members"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select
            className="portal-ref-dash__select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status">
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="portal-ref-dash__table-wrap">
        <table className="portal-ref-dash__table">
          <thead>
            <tr>
              <th scope="col">Member</th>
              <th scope="col">Status</th>
              <th scope="col">Cards</th>
              <th scope="col">Top-up</th>
              <th scope="col">Reward</th>
              <th scope="col">Joined</th>
              <th scope="col"><span className="visually-hidden">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length ? filtered.map((m) => (
              <tr key={m.id}>
                <td data-label="Member">
                  <span className="portal-ref-dash__member-name">{m.name}</span>
                </td>
                <td data-label="Status"><StatusBadge status={m.status} /></td>
                <td data-label="Cards">{m.cards}</td>
                <td data-label="Top-up">{formatUsdt(m.topUpUsdt)} USDT</td>
                <td data-label="Reward">{formatUsdt(m.rewardUsdt)} USDT</td>
                <td data-label="Joined">{formatDate(m.joinedAt)}</td>
                <td data-label="">
                  <button
                    type="button"
                    className="portal-ref-dash__detail-btn"
                    onClick={() => {
                      onDetail?.(m);
                      onShowToast?.(`${m.name} details`);
                    }}>
                    Detail
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="portal-ref-dash__table-empty">No members match your filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
