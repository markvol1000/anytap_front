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
  const [phase, setPhase] = useState('register');

  const [form, setForm] = useState({
    cardNumber: '',
    expiry: '',
    activeCode: '',
    pin: '',
    confirmPin: '',
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

  const [isRegistered, setIsRegistered] = useState(false);
  const [webhookReceived, setWebhookReceived] = useState(false);
  const [registeredWasabiCardId, setRegisteredWasabiCardId] = useState('');
  const isStep1Valid = form.cardNumber.replace(/\s/g, '').length === 16 && /^(\d{2})\/(\d{2})$/.test(form.expiry.trim());

  // Polling effect when card is registered to wait for card network webhook signal
  useEffect(() => {
    if (!isRegistered || webhookReceived) return;

    let pollInterval = setInterval(async () => {
      try {
        await s.reloadAccount?.();
        // Strictly match by Wasabi Card ID as the unique key
        const matchedCard = registeredWasabiCardId
          ? s.userCards?.find((c) => String(c?.wasabiCardId || c?.cardNo || c?.id || '') === registeredWasabiCardId)
          : null;

        // Webhook is confirmed ONLY when Wasabi activation_code webhook has arrived and saved secureCode in DB!
        const hasSecureCode = matchedCard?.hasSecureCode === true;
        const isReady = matchedCard && (hasSecureCode || matchedCard?.status === 'active');

        if (isReady) {
          setWebhookReceived(true);
          s.showToast?.('Network signal received! You can now activate your card.');
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error('Error polling activation signal:', err);
      }
    }, 2000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [isRegistered, webhookReceived, registeredWasabiCardId, s]);

  // Step 1 Handler: Register / Bind Card
  const handleRegisterOnly = async () => {
    setFormError('');
    setFieldErrors({});

    const errors = {};
    const number = normalizeCardNumber(form.cardNumber);
    const expiry = String(form.expiry ?? '').trim();

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

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return false;
    }

    setLoading(true);
    try {
      const result = await bindExistingCard({
        cardNumber: number,
        expiry: expiry,
      });
      if (!result.ok) {
        const msg = result.message || 'Card registration failed.';
        setFormError(msg);
        s.showToast?.(msg);
        return false;
      }
      if (result.data?.wasabiCardId || result.data?.id || result.data?.cardId) {
        setRegisteredWasabiCardId(result.data.wasabiCardId || result.data.id || result.data.cardId);
      }
      setIsRegistered(true);
      s.showToast?.('Card registered! Receiving activation signal...');
      return true;
    } catch (err) {
      const msg = err.message || 'Failed to register card.';
      setFormError(msg);
      s.showToast?.(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Step 2 Handler: Activate Card with PIN
  const handleActivateOnly = async () => {
    setFormError('');
    setFieldErrors({});

    const errors = {};
    const pin = form.pin.trim();
    const confirmPin = form.confirmPin.trim();

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
      const cardNoRaw = registeredWasabiCardId || normalizeCardNumber(form.cardNumber);
      const result = await activatePhysicalCard(cardNoRaw, pin, '');
      if (!result.ok) {
        setFormError(result.message || 'Card activation failed. Please check your PIN and try again.');
        return;
      }

      const last4 = normalizeCardNumber(form.cardNumber).slice(-4);
      const variant = normalizeCardNumber(form.cardNumber).startsWith('493875') ? 'virtual' : 'physical';
      const label = variant === 'virtual' ? 'Virtual Card' : 'Physical Card';

      setActivatedCard({
        last4,
        label,
      });
      s.showToast?.('Card activated successfully!');
    } catch (err) {
      setFormError(err.message || 'Failed to activate card. Please try again.');
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

  const isStep2Enabled = isRegistered && webhookReceived;

  return (
    <div className="cregister portal-pop">
      <p className="cregister__lead">
        Enter your card details, register your card, and set your 6-digit PIN to activate.
      </p>

      {formError && (
        <div className="cregister-alert cregister-alert--error" style={{ marginBottom: '16px', padding: '12px', borderRadius: '8px', background: '#FFF0F0', color: '#E53E3E', fontSize: '14px' }} role="alert">
          {formError}
        </div>
      )}

      <div className="cregister-form" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Step 1: Card Details & Register Button */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--portal-text-muted, #4B5563)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Step 1. Card Information
          </span>
          <RegisterField label="Card Number" error={fieldErrors.cardNumber}>
            <input
              className="cregister-input cregister-input--mono"
              type="text"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="4938 7500 0000 0000"
              value={form.cardNumber}
              disabled={loading || isRegistered}
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
              disabled={loading || isRegistered}
              onChange={(e) => setField('expiry', formatExpiryInput(e.target.value))}
            />
          </RegisterField>

          <button
            type="button"
            className="portal-btn-primary"
            disabled={loading || !isStep1Valid || isRegistered}
            style={{
              marginTop: '4px',
              padding: '10px 16px',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '14px',
              backgroundColor: isRegistered ? '#38A169' : undefined,
              opacity: (loading || !isStep1Valid) && !isRegistered ? 0.6 : 1,
              cursor: (loading || !isStep1Valid || isRegistered) ? 'not-allowed' : 'pointer'
            }}
            onClick={handleRegisterOnly}>
            {loading && !isRegistered ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <span className="portal-spin" style={{ width: '14px', height: '14px' }} />
                <span>Registering Card...</span>
              </span>
            ) : (isRegistered ? '✓ Card Registered' : 'Register Card')}
          </button>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--portal-border, #E5E7EB)', margin: '4px 0' }} />

        {/* Step 2: PIN Setup & Activate Card Button */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', opacity: isStep2Enabled ? 1 : 0.4, pointerEvents: isStep2Enabled ? 'auto' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--portal-text-muted, #4B5563)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Step 2. Set Transaction PIN
            </span>
            {isRegistered && !webhookReceived && (
              <span style={{ fontSize: '12px', color: '#D69E2E', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
                <span className="portal-spin" style={{ width: '12px', height: '12px' }} />
                <span>Waiting for network callback...</span>
              </span>
            )}
            {isRegistered && webhookReceived && (
              <span style={{ fontSize: '12px', color: '#38A169', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
                <span>✓ Network confirmed</span>
              </span>
            )}
          </div>

          <RegisterField label="Set 6-digit PIN" error={fieldErrors.pin}>
            <input
              className="cregister-input cregister-input--mono"
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••••"
              value={form.pin}
              disabled={!isStep2Enabled || loading}
              onChange={(e) => setField('pin', e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <span style={{ color: '#6B7280', fontSize: '12px', marginTop: '4px', display: 'block', fontWeight: '500' }}>
              ATM withdrawals use only the first 4 digits of your PIN.
            </span>
          </RegisterField>

          <RegisterField label="Confirm PIN" error={fieldErrors.confirmPin}>
            <input
              className="cregister-input cregister-input--mono"
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••••"
              value={form.confirmPin}
              disabled={!isStep2Enabled || loading}
              onChange={(e) => setField('confirmPin', e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </RegisterField>
        </div>
      </div>

      <footer className="cregister-foot" style={{ marginTop: '24px' }}>
        <button type="button" className="portal-btn-secondary cregister-foot__cancel" onClick={() => s.go('card')} disabled={loading}>
          Cancel
        </button>
        <button
          type="button"
          className="portal-btn-primary cregister-foot__submit"
          disabled={loading || !isStep2Enabled || form.pin.length !== 6 || form.confirmPin.length !== 6}
          style={{ opacity: (loading || !isStep2Enabled || form.pin.length !== 6 || form.confirmPin.length !== 6) ? 0.6 : 1, cursor: (loading || !isStep2Enabled) ? 'not-allowed' : 'pointer' }}
          onClick={handleActivateOnly}>
          {loading && isRegistered ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              <span className="portal-spin" style={{ width: '16px', height: '16px' }} aria-label="Activating" />
              <span>Activating...</span>
            </span>
          ) : isRegistered && !webhookReceived ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              <span className="portal-spin" style={{ width: '16px', height: '16px' }} />
              <span>Waiting for Network Signal...</span>
            </span>
          ) : 'Activate Card'}
        </button>
      </footer>
    </div>
  );
}
