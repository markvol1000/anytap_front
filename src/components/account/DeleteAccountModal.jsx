import { useState, useCallback, useEffect, useRef } from 'react';
import { Icon } from '../ui.jsx';
import { isHttpApi } from '../../lib/api/config.js';

function DeleteAccountOtpInput({ value, onChange, length = 6 }) {
  const refs = useRef([]);

  const setDigit = (index, digit) => {
    const chars = (value || '').split('');
    while (chars.length < length) chars.push('');
    chars[index] = digit;
    const next = chars.join('').slice(0, length);
    onChange(next);
    if (digit && index < length - 1) refs.current[index + 1]?.focus();
  };

  return (
    <div className="verify-otp" role="group" aria-label="Verification code" style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          className="verify-otp__box"
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={value[i] || ''}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => setDigit(i, e.target.value.replace(/\D/g, '').slice(-1))}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !value[i] && i > 0) refs.current[i - 1]?.focus();
          }}
          onPaste={(e) => {
            e.preventDefault();
            const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
            if (!pasted) return;
            onChange(pasted);
            refs.current[Math.min(pasted.length, length - 1)]?.focus();
          }}
          style={{
            flex: 1,
            height: '52px',
            borderRadius: '10px',
            border: '1.5px solid var(--portal-border, rgba(0,0,0,0.12))',
            background: 'var(--paper, #fafafa)',
            fontSize: '22px',
            fontWeight: '700',
            textAlign: 'center',
            color: 'var(--portal-ink, #1a1a1a)',
            outline: 'none',
            transition: 'border-color 0.15s, background 0.15s'
          }}
        />
      ))}
    </div>
  );
}

export function DeleteAccountModal({ open, onClose, s }) {
  const [verificationCode, setVerificationCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [codeCountdown, setCodeCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isUnderstood, setIsUnderstood] = useState(false);

  useEffect(() => {
    let timer;
    if (codeCountdown > 0) {
      timer = setInterval(() => {
        setCodeCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [codeCountdown]);

  const handleResetClose = useCallback(() => {
    if (loading) return;
    setVerificationCode('');
    setCodeCountdown(0);
    setIsUnderstood(false);
    onClose?.();
  }, [loading, onClose]);

  const handleSendCode = useCallback(async () => {
    const targetUser = s?.accountState?.userId || s?.accountState?.email || s?.accountState?.loginId;
    if (!targetUser) {
      s?.showToast?.('User identifier not found. Please log in again.');
      return;
    }
    setSendingCode(true);
    try {
      if (isHttpApi) {
        const res = await fetch(`/api/v1/users/${encodeURIComponent(targetUser)}/delete-account/send-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const json = await res.json();
        if (json?.result !== false && !json?.error) {
          s?.showToast?.('Verification code sent to your registered email.');
          setCodeCountdown(60);
        } else {
          s?.showToast?.(json?.message || 'Failed to send verification code.');
        }
      } else {
        s?.showToast?.('Mock: Verification code sent to your email.');
        setCodeCountdown(60);
      }
    } catch (err) {
      s?.showToast?.('Failed to send code: ' + (err.message || 'Error'));
    } finally {
      setSendingCode(false);
    }
  }, [s]);

  const handleConfirmDelete = useCallback(async () => {
    if (!isUnderstood) {
      s?.showToast?.('Please check "I understand" to proceed.');
      return;
    }
    if (!verificationCode || verificationCode.trim().length !== 6) {
      s?.showToast?.('Please enter the 6-digit email verification code.');
      return;
    }

    setLoading(true);
    try {
      const targetUser = s?.accountState?.userId || s?.accountState?.email || s?.accountState?.loginId;
      if (isHttpApi && targetUser) {
        const res = await fetch(`/api/v1/users/${encodeURIComponent(targetUser)}/delete-account`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ verificationCode: verificationCode.trim() })
        });
        const json = await res.json();
        if (json?.result !== false && json?.data) {
          s?.showToast?.('Your account has been suspended.');
          handleResetClose();
          // Log out user
          setTimeout(() => {
            s?.logout?.();
          }, 800);
        } else {
          s?.showToast?.(json?.message || 'Account deletion failed.');
        }
      } else {
        // Mock fallback
        s?.showToast?.('Mock: Account status set to suspended.');
        handleResetClose();
        setTimeout(() => {
          s?.logout?.();
        }, 800);
      }
    } catch (err) {
      s?.showToast?.('Account deletion failed: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  }, [verificationCode, isUnderstood, s, handleResetClose]);

  if (!open) return null;

  const email = s?.accountState?.email || 'your registered email';

  return (
    <div className="portal-sheet" role="dialog" aria-modal="true" aria-label="Delete Account">
      <button type="button" className="portal-sheet__backdrop" onClick={loading ? undefined : handleResetClose} aria-label="Close" />
      <div className="portal-sheet__panel portal-wallet-sheet" style={{ minHeight: '480px', maxHeight: 'min(94vh, 720px)', padding: '24px 24px calc(28px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="portal-sheet__head">
          <h3 className="portal-sheet__title" style={{ color: '#ef4444' }}>Delete Account</h3>
          <button type="button" className="portal-sheet__close" onClick={loading ? undefined : handleResetClose} disabled={loading} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>

        <p className="portal-wallet-sheet__sub" style={{ color: '#64748b' }}>
          Deleting your account will immediately suspend your login access and all connected services.
        </p>

        {/* Warning Callout */}
        <div style={{
          marginTop: '16px',
          marginBottom: '16px',
          padding: '14px 16px',
          backgroundColor: '#fff1f2',
          border: '1.5px solid #f87171',
          borderRadius: '10px',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)',
        }}>
          <strong style={{ color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '800' }}>
            <span>⚠️</span>
            <span>Delete your account? This cannot be undone.</span>
          </strong>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#1e293b', fontSize: '13.5px', fontWeight: '700', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #fecaca' }}>
            <input
              type="checkbox"
              checked={isUnderstood}
              onChange={(e) => setIsUnderstood(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: '#ef4444', cursor: 'pointer' }}
            />
            <span>I understand that this action cannot be undone</span>
          </label>
        </div>

        {/* Email OTP Verification Section */}
        <div className="portal-wallet-field" style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span className="portal-wallet-field__label" style={{ margin: 0 }}>
              Email Verification Code ({email})
            </span>
            <button
              type="button"
              onClick={handleSendCode}
              disabled={sendingCode || codeCountdown > 0 || loading}
              style={{
                border: 'none',
                background: codeCountdown > 0 ? 'var(--bg-subtle, #e2e8f0)' : 'var(--brand-primary, #ff5500)',
                color: codeCountdown > 0 ? 'var(--portal-muted, #64748b)' : '#fff',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: (sendingCode || codeCountdown > 0 || loading) ? 'not-allowed' : 'pointer'
              }}>
              {sendingCode ? 'Sending...' : codeCountdown > 0 ? `Resend (${codeCountdown}s)` : 'Send Code'}
            </button>
          </div>
          <DeleteAccountOtpInput
            value={verificationCode}
            onChange={(code) => setVerificationCode(code)}
            length={6}
          />
        </div>

        {/* Action buttons */}
        <div className="portal-wallet-sheet__actions" style={{ marginTop: '24px' }}>
          <button
            type="button"
            className="portal-btn-secondary portal-wallet-sheet__btn"
            onClick={handleResetClose}
            disabled={loading}
            style={{ height: '48px', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}>
            Cancel
          </button>
          <button
            type="button"
            className="portal-btn-primary portal-wallet-sheet__btn portal-wallet-sheet__btn--danger"
            disabled={loading || !isUnderstood || verificationCode.length !== 6}
            onClick={handleConfirmDelete}
            style={{
              height: '48px',
              fontSize: '13px',
              fontWeight: 700,
              textTransform: 'uppercase',
              backgroundColor: (!isUnderstood || verificationCode.length !== 6) ? '#fca5a5' : '#ef4444',
              borderColor: (!isUnderstood || verificationCode.length !== 6) ? '#fca5a5' : '#ef4444',
            }}>
            {loading ? <><span className="btn-spinner"></span>Suspending Account...</> : 'Suspend & Delete Account'}
          </button>
        </div>
      </div>
    </div>
  );
}
