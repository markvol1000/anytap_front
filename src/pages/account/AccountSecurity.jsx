import { useState } from 'react';
import { changePassword } from '../../lib/services/authService.js';
import { PasswordRequirementsChecklist } from '../../components/sub-auth.jsx';
import { passwordPolicyOk } from '../../lib/password-policy.ts';

export function AccountSecurity({ s }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');


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
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-page portal-page--unified portal-detail" style={{ maxWidth: '460px', margin: '0 auto', padding: '24px 16px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#1A202C' }}>Change Password</h2>

      {errorMsg && (
        <div style={{ padding: '10px 14px', borderRadius: '6px', backgroundColor: '#FFF5F5', color: '#E53E3E', fontSize: '13px', marginBottom: '16px', border: '1px solid #FEB2B2' }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#4A5568' }}>
            CURRENT PASSWORD
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showOldPw ? 'text' : 'password'}
              className="cregister-input"
              style={{ width: '100%', padding: '10px 38px 10px 12px', borderRadius: '6px', border: '1px solid #CBD5E0' }}
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
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#4A5568' }}>
            NEW PASSWORD
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showNewPw ? 'text' : 'password'}
              className="cregister-input"
              style={{ width: '100%', padding: '10px 38px 10px 12px', borderRadius: '6px', border: '1px solid #CBD5E0' }}
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
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#4A5568' }}>
            CONFIRM NEW PASSWORD
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showConfirmPw ? 'text' : 'password'}
              className="cregister-input"
              style={{ width: '100%', padding: '10px 38px 10px 12px', borderRadius: '6px', border: '1px solid #CBD5E0' }}
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
          style={{ width: '100%', padding: '12px', borderRadius: '6px', marginTop: '12px', fontWeight: '600' }}
          disabled={loading}>
          {loading ? <><span className="btn-spinner"></span>Updating...</> : 'Update Password'}
        </button>
      </form>
    </div>
  );
}

