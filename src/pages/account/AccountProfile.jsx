// ===== Account Profile =====
// User profile fields from accountState (KYC + session).

import * as A from '../../lib/account-data.js';

export function AccountProfile({ s }) {
  const memberSince = A.PROFILE_FIELDS.find((f) => f.label === 'Member since')?.value ?? '—';
  const unset = (v) => {
    const s = String(v || '').trim();
    return s || 'Not set';
  };
  const fields = [
    { label: 'Full name', value: s.accountState?.name || 'User' },
    { label: 'Email', value: unset(s.accountState?.email) },
    { label: 'Login ID', value: unset(s.accountState?.loginId || s.accountState?.userId) },
    { label: 'Phone', value: unset(s.accountState?.phone) },
    { label: 'Country', value: unset(s.accountState?.country) },
  ];

  return (
    <div className="portal-page portal-page--unified portal-detail">
      {/* Profile fields — TODO: replace mock fields with Supabase user data */}
      {fields.map((f) => (
        <div className="portal-field" key={f.label}>
          <div className="portal-field__k">{f.label}</div>
          <div className="portal-field__v">{f.value}</div>
        </div>
      ))}

      {/* TODO: Implement profile edit form */}
      <button
        type="button"
        className="portal-btn-secondary portal-detail__btn"
        onClick={() => s.showToast('Edit profile coming soon')}>
        Edit profile
      </button>
    </div>
  );
}
