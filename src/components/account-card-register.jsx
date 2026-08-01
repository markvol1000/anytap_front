// ===== Register Existing Card (B2B / pre-issued) =====
import { useState, useEffect } from 'react';
import { Icon } from './ui.jsx';
import { normalizeCardNumber, formatCardNumberInput, formatExpiryInput } from '../lib/card-register.js';
import { bindExistingCard, sendCardSecureCode, activatePhysicalCard } from '../lib/services/account/accountApi.js';

function RegisterField({ label, error, children }) {
  return (
    <label className="cregister-field">
      <span className="cregister-field__label">{label}</span>
      {children}
      {error ? <span className="cregister-field__error" role="alert">{error}</span> : null}
    </label>
  );
}

function RegisterSuccess({ card, onDone }) {
  return (
    <div className="cregister cregister--success portal-pop">
      <div className="cregister-success">
        <span className="cregister-success__icon" aria-hidden="true">
          <Icon name="checkCircle" size={48} stroke={1.75} />
        </span>
        <h2 className="cregister-success__title">Card activated</h2>
        <p className="cregister-success__msg">
          Your {card.label} ending in {card.last4} is now active and linked to your account.
          Card access and wallet connection will sync shortly.
        </p>
        <ul className="cregister-success__steps">
          <li>Card registered on backend</li>
          <li>Activation code verified</li>
          <li>Card settings and PIN initialized</li>
        </ul>
        <button type="button" className="portal-btn-primary cregister-success__cta" onClick={onDone}>
          View My Cards
        </button>
      </div>
    </div>
  );
}

export function AccountCardRegister({ s }) {
  const [phase, setPhase] = useState(() => {
    const cardStatus = s.accountState?.cardStatus;
    // If card status is 'issued' or 'pending_activation', go straight to manual activate fallback
    return (cardStatus === 'issued' || cardStatus === 'pending_activation') ? 'activate' : 'register';
  });

  const [form, setForm] = useState(() => {
    const cardStatus = s.accountState?.cardStatus;
    const isInitialActivate = cardStatus === 'issued' || cardStatus === 'pending_activation';
    if (isInitialActivate) {
      const registeredCard = s.userCards?.find(c => c.status === 'issued' || c.status === 'pending_activation') 
                           || s.userCards?.[0];
      const cardId = s.accountState?.cardId || registeredCard?.id || '';
      return {
        cardNumber: cardId ? formatCardNumberInput(cardId) : '',
        expiry: registeredCard?.expiry || '',
        activeCode: '',
        pin: '',
        confirmPin: '',
      };
    } else {
      return {
        cardNumber: '',
        expiry: '',
        activeCode: '',
        pin: '',
        confirmPin: '',
      };
    }
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(20);
  const [resendStatus, setResendStatus] = useState('');
  const [activatedCard, setActivatedCard] = useState(null);

  // Polling effect when phase is 'waiting'
  useEffect(() => {
    if (phase !== 'waiting') return;

    let pollInterval;
    let timerInterval;

    // Start countdown timer
    timerInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Start API polling
    pollInterval = setInterval(async () => {
      try {
        await s.reloadAccount?.();
        // Check if card has become active
        const cardStatus = s.accountState?.cardStatus;
        const hasActive = s.userCards?.some(c => c.status === 'active') || cardStatus === 'active';
        if (hasActive) {
          clearInterval(pollInterval);
          clearInterval(timerInterval);
          
          const cardNoRaw = normalizeCardNumber(form.cardNumber);
          const last4 = cardNoRaw.slice(-4);
          const variant = cardNoRaw.startsWith('493875') ? 'virtual' : 'physical';
          const label = variant === 'virtual' ? 'Virtual Card' : 'Physical Card';
          
          setActivatedCard({
            last4,
            label,
          });
          s.showToast?.('Card activated successfully!');
        }
      } catch (err) {
        console.error('Error polling card status:', err);
      }
    }, 3000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(timerInterval);
    };
  }, [phase, form.cardNumber, s]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    setFormError('');
  };

  const handleRegister = async () => {
    setFormError('');
    setFieldErrors({});
    
    // Validate Card Number, Expiry Date, and PIN
    const errors = {};
    const number = normalizeCardNumber(form.cardNumber);
    const expiry = String(form.expiry ?? '').trim();
    const pin = form.pin.trim();
    const confirmPin = form.confirmPin.trim();

    if (number.length !== 16) {
      errors.cardNumber = 'Invalid card number. Check the 16-digit number on your card.';
    }
    
    const match = expiry.match(/^(\d{2})\/(\d{2})$/);
    if (!match) {
      errors.expiry = 'Enter a valid expiry date (MM/YY).';
    } else {
      const month = parseInt(match[1], 10);
      const year = 2000 + parseInt(match[2], 10);
      if (month < 1 || month > 12) {
        errors.expiry = 'Enter a valid expiry date (MM/YY).';
      } else {
        const expDate = new Date(year, month, 0, 23, 59, 59);
        if (expDate < new Date()) {
          errors.expiry = 'This card has expired.';
        }
      }
    }

    if (!/^\d{6}$/.test(pin)) {
      errors.pin = 'Enter a 6-digit PIN.';
    }
    if (pin !== confirmPin) {
      errors.confirmPin = 'PINs do not match.';
    }

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const result = await bindExistingCard({
        cardNumber: number,
        expiry: expiry,
      });
      if (!result.ok) {
        setFormError(result.message || 'Card registration failed.');
        return;
      }
      s.showToast?.('Card registered. Initiating activation...');
      setCountdown(20);
      setPhase('waiting');
    } catch (err) {
      setFormError(err.message || 'Failed to register card.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResendStatus('Sending code...');
    try {
      const result = await sendCardSecureCode();
      if (result.ok) {
        setResendStatus('Code resent successfully! Check your email.');
        setTimeout(() => setResendStatus(''), 4000);
      } else {
        setResendStatus('Failed to resend code.');
      }
    } catch (err) {
      setResendStatus('Error resending code.');
    }
  };

  const handleActivate = async () => {
    setFormError('');
    setFieldErrors({});

    const errors = {};
    const code = form.activeCode.trim();

    if (!/^\d{6}$/.test(code)) {
      errors.activeCode = 'Enter the 6-digit activation code.';
    }

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const cardNoRaw = normalizeCardNumber(form.cardNumber);
      const result = await activatePhysicalCard(cardNoRaw, form.pin.trim(), code);
      if (!result.ok) {
        setFormError(result.message || 'Activation failed.');
        return;
      }
      
      const last4 = cardNoRaw.slice(-4);
      const variant = cardNoRaw.startsWith('493875') ? 'virtual' : 'physical';
      const label = variant === 'virtual' ? 'Virtual Card' : 'Physical Card';
      
      setActivatedCard({
        last4,
        label,
      });
      s.showToast?.('Card activated successfully');
    } catch (err) {
      setFormError(err.message || 'Failed to activate card.');
    } finally {
      setLoading(false);
    }
  };

  if (activatedCard) {
    return (
      <RegisterSuccess
        card={activatedCard}
        onDone={async () => {
          await s.reloadAccount?.();
          s.go('card');
        }}
      />
    );
  }

  return (
    <div className="cregister portal-pop">
      {phase === 'register' && (
        <>
          <p className="cregister__lead">
            Enter the card details printed on your Anytap card to link it to your account.
          </p>

          {formError && (
            <div className="cregister-alert cregister-alert--error" role="alert">
              {formError}
            </div>
          )}

          <div className="cregister-form">
            <RegisterField label="Card Number" error={fieldErrors.cardNumber}>
              <input
                className="cregister-input cregister-input--mono"
                type="text"
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="4938 7500 0000 0000"
                value={form.cardNumber}
                onChange={(e) => setField('cardNumber', formatCardNumberInput(e.target.value))}
              />
            </RegisterField>

            <RegisterField label="Expiry Date" error={fieldErrors.expiry}>
              <input
                className="cregister-input cregister-input--mono"
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/YY"
                value={form.expiry}
                onChange={(e) => setField('expiry', formatExpiryInput(e.target.value))}
              />
            </RegisterField>

            <RegisterField label="Set 6-digit PIN" error={fieldErrors.pin}>
              <input
                className="cregister-input cregister-input--mono"
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••••"
                value={form.pin}
                onChange={(e) => setField('pin', e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </RegisterField>

            <RegisterField label="Confirm PIN" error={fieldErrors.confirmPin}>
              <input
                className="cregister-input cregister-input--mono"
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••••"
                value={form.confirmPin}
                onChange={(e) => setField('confirmPin', e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </RegisterField>
          </div>

          <div className="cregister-notice" role="note">
            <span className="cregister-notice__ic" aria-hidden="true">!</span>
            <span>
              Linking your card starts the secure activation process. You will receive an activation code via email shortly after registering.
            </span>
          </div>

          <footer className="cregister-foot">
            <button type="button" className="portal-btn-secondary cregister-foot__cancel" onClick={() => s.go('card')}>
              Cancel
            </button>
            <button
              type="button"
              className="portal-btn-primary cregister-foot__submit"
              disabled={loading}
              onClick={handleRegister}>
              {loading ? <span className="portal-spin" aria-label="Registering" /> : 'Register Card'}
            </button>
          </footer>
        </>
      )}

      {phase === 'waiting' && (
        <div className="cregister-waiting" style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <span className="portal-spin" style={{ width: '48px', height: '48px', borderWidth: '3px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Activating Card Automatically...</h3>
            <p className="cregister__lead" style={{ maxWidth: '400px', margin: '0 auto' }}>
              We are communicating with the card network to activate your card. This usually takes up to 20 seconds.
            </p>
            {countdown > 0 ? (
              <div style={{ fontSize: '14px', color: '#718096', fontWeight: '500' }}>
                Remaining time: {countdown}s
              </div>
            ) : (
              <div style={{ fontSize: '14px', color: '#E53E3E', fontWeight: '500', maxWidth: '400px', margin: '8px auto' }}>
                ⚠️ Auto-activation is taking longer than expected. You can check your email for the activation code and click "Activate Manually" below to finish.
              </div>
            )}
          </div>

          <footer className="cregister-foot" style={{ marginTop: '32px' }}>
            <button 
              type="button" 
              className="portal-btn-secondary cregister-foot__cancel" 
              onClick={() => s.go('card')}>
              Cancel
            </button>
            <button
              type="button"
              className="portal-btn-primary cregister-foot__submit"
              disabled={countdown > 0}
              onClick={() => setPhase('activate')}>
              Activate Manually
            </button>
          </footer>
        </div>
      )}

      {phase === 'activate' && (
        <>
          <p className="cregister__lead">
            An activation code has been sent to your email. Enter the code and set a 6-digit transaction PIN to activate your card.
          </p>

          {formError && (
            <div className="cregister-alert cregister-alert--error" role="alert">
              {formError}
            </div>
          )}

          <div className="cregister-form">
            <RegisterField label="Activation Code" error={fieldErrors.activeCode}>
              <input
                className="cregister-input cregister-input--mono"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={form.activeCode}
                onChange={(e) => setField('activeCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </RegisterField>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-8px', marginBottom: '8px' }}>
              <button 
                type="button" 
                className="portal-btn-link" 
                onClick={handleResendCode}
                style={{ fontSize: '13px', textDecoration: 'underline' }}>
                Resend Code
              </button>
            </div>

            {resendStatus && (
              <div 
                className="cregister-alert cregister-alert--info" 
                style={{ marginBottom: '16px', padding: '8px', fontSize: '13px', background: '#EBF8FF', color: '#2B6CB0', borderRadius: '4px' }}>
                {resendStatus}
              </div>
            )}
          </div>

          <footer className="cregister-foot">
            <button type="button" className="portal-btn-secondary cregister-foot__cancel" onClick={() => setPhase('register')}>
              Back
            </button>
            <button
              type="button"
              className="portal-btn-primary cregister-foot__submit"
              disabled={loading}
              onClick={handleActivate}>
              {loading ? <span className="portal-spin" aria-label="Activating" /> : 'Activate Card'}
            </button>
          </footer>
        </>
      )}
    </div>
  );
}
