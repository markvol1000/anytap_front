// ===== Card Detail Panel =====
// Security-gated card number / expiry / CVV reveal
// Requires email OTP verification before showing sensitive data
// TODO: Replace mock card data with Wasabi API card detail endpoint
// TODO: Replace mock email OTP with real email verification (Supabase Auth / custom OTP)

import { useState } from 'react';
import * as A from '../../lib/account-data.js';

export function AccountCardDetailsPanel({ s }) {
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const card = s.currentCard;
  // TODO: Fetch fullNumber from Wasabi API on demand (never stored in DB)
  const fullNumber = card?.fullNumber ?? A.MOCK_CARD.fullNumber;

  if (!s.cardHasNumber || !card) return null;

  const openDetails = () => {
    s.setShowCardDetails(true);
    s.setIsCardDetailVerified(false);
    s.setShowCvv(false);
    s.setVerifyCodeSent(false);
    setVerifyCode('');
  };

  // TODO: Send real OTP via Supabase Auth or custom email service
  const sendVerifyCode = () => {
    s.setVerifyCodeSent(true);
    s.showToast(`Verification code sent to ${s.accountState.email}`);
  };

  const confirmVerifyCode = () => {
    if (verifyCode.trim().length < 6) {
      s.showToast('Enter the 6-digit code from your email');
      return;
    }
    setVerifyLoading(true);
    // TODO: Verify OTP against Supabase or custom verification endpoint
    setTimeout(() => {
      setVerifyLoading(false);
      s.setIsCardDetailVerified(true);
      s.showToast('Identity verified');
    }, 700);
  };

  // Initial state: show "View Card Info" button
  if (!s.showCardDetails) {
    return (
      <div className="portal-card-details">
        <button type="button" className="portal-btn-primary portal-card-details__toggle" onClick={openDetails}>
          View Card Info
        </button>
      </div>
    );
  }

  // Verification step before revealing card info
  if (!s.isCardDetailVerified) {
    return (
      <div className="portal-card-details portal-card-details__panel">
        <div className="portal-card-details__head">
          <h3 className="portal-card-details__title">Verify to view Card Info</h3>
          <button type="button" className="portal-btn-link" onClick={s.resetCardDetails}>Cancel</button>
        </div>
        <p className="portal-card-verify__msg">
          For your security, verify your identity before viewing your card info.
        </p>
        {!s.verifyCodeSent ? (
          <button type="button" className="portal-btn-primary portal-card-verify__btn" onClick={sendVerifyCode}>
            Send code to email
          </button>
        ) : (
          <div className="portal-card-verify__form">
            <label className="portal-label" htmlFor="card-verify-code">
              Enter the 6-digit code sent to {s.accountState.email}
            </label>
            <input
              id="card-verify-code"
              className="portal-input portal-card-verify__input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
            />
            <button
              type="button"
              className="portal-btn-primary portal-card-verify__btn"
              disabled={verifyLoading}
              onClick={confirmVerifyCode}>
              {verifyLoading ? <span className="portal-spin" /> : 'Verify code'}
            </button>
            <button type="button" className="portal-btn-link portal-card-verify__resend" onClick={sendVerifyCode}>
              Resend code
            </button>
          </div>
        )}
      </div>
    );
  }

  // Verified: show card info
  return (
    <div className="portal-card-details portal-card-details__panel">
      <div className="portal-card-details__head portal-card-details__head--actions">
        <button type="button" className="portal-btn-link" onClick={s.resetCardDetails}>Hide</button>
      </div>

      {/* Card number, expiry, CVV — TODO: fetched from Wasabi on demand */}
      <div className="portal-info">
        <div className="portal-info__row">
          <span className="portal-info__k">Card Number</span>
          <span className="portal-info__v portal-info__v--mono">{fullNumber}</span>
        </div>
        <div className="portal-info__row">
          <span className="portal-info__k">Expiry</span>
          <span className="portal-info__v portal-info__v--mono">{card.expiry}</span>
        </div>
        <div className="portal-info__row">
          <span className="portal-info__k">CVV</span>
          <span className="portal-info__v portal-info__v--mono">
            {s.showCvv ? card.cvv : '***'}
          </span>
        </div>
      </div>

      {/* CVV reveal — auto-hides after 30s */}
      {!s.showCvv ? (
        <button type="button" className="portal-btn-secondary portal-card-details__cvv" onClick={() => s.setShowCvv(true)}>
          Show CVV
        </button>
      ) : (
        <p className="portal-card-details__cvv-hint">CVV will hide automatically in 30 seconds</p>
      )}

      <p className="portal-card-details__note">
        Sensitive card info is fetched on demand and is never stored in our database.
      </p>

      {/* Activate card CTA — only shown for issued but not yet activated cards */}
      {s.accountState.cardStatus === 'issued' && card.status === 'issued' && (
        <button
          type="button"
          className="portal-btn-primary portal-card-details__activate"
          onClick={() => s.showToast('Card activation coming soon')}>
          Activate Card
        </button>
      )}
    </div>
  );
}
