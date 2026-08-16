// ===== Account Profile =====
// User profile fields + Password change functionality.

import { useState } from 'react';
import * as A from '../../lib/account-data.js';
import { changePassword } from '../../lib/services/authService.js';
import { PasswordRequirementsChecklist } from '../../components/sub-auth.jsx';
import { passwordPolicyOk } from '../../lib/password-policy.ts';

export function AccountProfile({ s }) {
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');

  const unset = (v) => {
    const val = String(v || '').trim();
    return val || 'Not set';
  };

  const fn = String(s.accountState?.firstName || s.profile?.firstName || '').trim();
  const ln = String(s.accountState?.lastName || s.profile?.lastName || '').trim();
  const fullNameCombined = (fn || ln)
    ? `${fn} ${ln}`.trim()
    : (s.accountState?.name || s.accountState?.fullName || 'User');

  const countryVal = String(s.accountState?.country || s.accountState?.nationality || s.profile?.country || '').trim();

  const fields = [
    { label: 'Full name', value: fullNameCombined },
    { label: 'Email', value: unset(s.accountState?.email) },
    { label: 'Login ID', value: unset(s.accountState?.loginId || s.accountState?.userId) },
    { label: 'Phone', value: unset(s.accountState?.phone) },
    ...(countryVal && countryVal !== 'Not set' && countryVal !== '—' ? [{ label: 'Country', value: countryVal }] : []),
  ];

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!oldPassword) {
      setErrorMsg('Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters long.');
      return;
    }
    if (!passwordPolicyOk(newPassword)) {
      setErrorMsg('New password does not meet the security requirements.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const userId = s.accountState?.userId || s.session?.userId || '';
      const res = await changePassword({
        userId,
        currentPassword: oldPassword,
        newPassword,
      });

      if (!res.ok) {
        throw new Error(res.message || 'Failed to change password');
      }

      s.showToast(res.message || 'Password updated successfully.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordChange(false);
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-page portal-page--unified portal-detail" style={{ maxWidth: '540px', margin: '0 auto', padding: '24px 16px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#1A202C' }}>
        My Profile & Account Info
      </h2>

      {/* Profile fields */}
      <div style={{ marginBottom: '24px' }}>
        {fields.map((f) => (
          <div className="portal-field" key={f.label}>
            <div className="portal-field__k">{f.label}</div>
            <div className="portal-field__v">{f.value}</div>
          </div>
        ))}
      </div>

      {/* Action buttons (Edit Profile removed) */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button
          type="button"
          className="portal-btn-primary portal-detail__btn"
          style={{ flex: 1 }}
          onClick={() => {
            setShowPasswordChange((prev) => !prev);
            setErrorMsg('');
          }}>
          {showPasswordChange ? 'Cancel Password Change' : 'Change Password'}
        </button>
      </div>

      {/* Inline Password Change Section */}
      {showPasswordChange && (
        <div style={{
          padding: '20px',
          borderRadius: '10px',
          backgroundColor: 'rgba(248, 250, 252, 0.9)',
          border: '1px solid #E2E8F0',
          marginTop: '16px'
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', color: '#2D3748' }}>
            Change Password
          </h3>

          {errorMsg && (
            <div style={{ padding: '10px 14px', borderRadius: '6px', backgroundColor: '#FFF5F5', color: '#E53E3E', fontSize: '13px', marginBottom: '16px', border: '1px solid #FEB2B2' }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#4A5568' }}>
                CURRENT PASSWORD
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showOldPw ? 'text' : 'password'}
                  className="cregister-input"
                  style={{ width: '100%', padding: '10px 38px 10px 12px', borderRadius: '6px', border: '1px solid #CBD5E0', fontSize: '14px' }}
                  placeholder="Enter current password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowOldPw((v) => !v)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#718096' }}>
                  {showOldPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#4A5568' }}>
                NEW PASSWORD
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPw ? 'text' : 'password'}
                  className="cregister-input"
                  style={{ width: '100%', padding: '10px 38px 10px 12px', borderRadius: '6px', border: '1px solid #CBD5E0', fontSize: '14px' }}
                  placeholder="Enter new password (min. 8 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw((v) => !v)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#718096' }}>
                  {showNewPw ? 'Hide' : 'Show'}
                </button>
              </div>
              <PasswordRequirementsChecklist password={newPassword} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#4A5568' }}>
                CONFIRM NEW PASSWORD
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  className="cregister-input"
                  style={{ width: '100%', padding: '10px 38px 10px 12px', borderRadius: '6px', border: '1px solid #CBD5E0', fontSize: '14px' }}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw((v) => !v)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#718096' }}>
                  {showConfirmPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>


            <button
              type="submit"
              className="portal-btn-primary"
              style={{ width: '100%', padding: '12px', borderRadius: '6px', marginTop: '10px', fontWeight: '600' }}
              disabled={loading}>
              {loading ? <><span className="btn-spinner"></span>Updating...</> : 'Update Password'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
