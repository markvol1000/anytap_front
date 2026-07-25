// ===== Account Security =====
// Two-factor authentication, biometric login, password change
// TODO: Connect 2FA toggle to Supabase Auth MFA
// TODO: Connect biometric to device credential API (WebAuthn)
// TODO: Implement password reset via Supabase Auth resetPasswordForEmail

import { useState } from 'react';
import { AccountToggle } from '../../components/account/AccountToggle.jsx';

export function AccountSecurity({ s }) {
  const [twoFA, setTwoFA] = useState(true);
  const [biometric, setBiometric] = useState(false);

  return (
    <div className="portal-page portal-page--unified portal-detail">
      {/* 2FA toggle — TODO: Supabase MFA */}
      <div className="portal-notif-row">
        <div>
          <div className="portal-notif-row__label">Two-factor authentication</div>
          <div className="portal-notif-row__sub">Sign-in protection</div>
        </div>
        <AccountToggle on={twoFA} onToggle={() => setTwoFA(!twoFA)} />
      </div>

      {/* Biometric toggle — TODO: WebAuthn / platform credential API */}
      <div className="portal-notif-row">
        <div>
          <div className="portal-notif-row__label">Biometric login</div>
          <div className="portal-notif-row__sub">Face ID / fingerprint</div>
        </div>
        <AccountToggle on={biometric} onToggle={() => setBiometric(!biometric)} />
      </div>

      {/* TODO: Supabase Auth resetPasswordForEmail */}
      <button
        type="button"
        className="portal-btn-secondary portal-detail__btn"
        onClick={() => s.showToast('Password reset link sent')}>
        Change password
      </button>
    </div>
  );
}
