// ===== Register Existing Card (B2B / pre-issued) =====
import { useState, useEffect, useRef } from 'react';
import { Icon } from './ui.jsx';
import { normalizeCardNumber, formatCardNumberInput, formatExpiryInput } from '../lib/card-register.js';
import { bindExistingCard, sendCardSecureCode, activatePhysicalCard, checkCardActivationStatus } from '../lib/services/account/accountApi.js';

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
  const [form, setForm] = useState({
    cardNumber: '',
    expiry: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activatedCard, setActivatedCard] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [webhookReceived, setWebhookReceived] = useState(false);
  const [registeredWasabiCardId, setRegisteredWasabiCardId] = useState('');
  const [timeoutModalOpen, setTimeoutModalOpen] = useState(false);

  const isStep1Valid = form.cardNumber.replace(/\s/g, '').length === 16 && /^(\d{2})\/(\d{2})$/.test(form.expiry.trim());

  const sRef = useRef(s);
  useEffect(() => {
    sRef.current = s;
  });

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    setFormError('');
  };

  // Polling effect: Check our DB for secureCode & cardId (5s interval, 12 attempts = 60s total)
  useEffect(() => {
    if (!isRegistered || webhookReceived) return;

    let webhookPollAttempts = 0;
    const MAX_WEBHOOK_POLLS = 12; // 12 attempts * 5s = 60s (1 minute)
    const targetLast4 = normalizeCardNumber(form.cardNumber).slice(-4);

    const pollActivation = async () => {
      webhookPollAttempts += 1;
      if (webhookPollAttempts > MAX_WEBHOOK_POLLS) {
        clearInterval(pollInterval);
        setTimeoutModalOpen(true);
        return;
      }

      try {
        // Query only our backend DB for card secureCode existence by targetLast4 & registeredWasabiCardId
        const checkResult = await checkCardActivationStatus(registeredWasabiCardId, targetLast4);
        if (checkResult.isReady) {
          const activeCardId = checkResult.wasabiCardId || registeredWasabiCardId;
          if (activeCardId && !registeredWasabiCardId) {
            setRegisteredWasabiCardId(activeCardId);
          }
          clearInterval(pollInterval);

          // Build target card object for activation modal
          const targetCard = {
            id: activeCardId,
            cardNo: activeCardId,
            wasabiCardId: activeCardId,
            last4: targetLast4,
            status: 'issued',
            hasSecureCode: true,
            cardType: normalizeCardNumber(form.cardNumber).startsWith('493875') ? 'virtual' : 'physical',
          };

          // Immediately open activation sheet so backdrop transitions seamlessly with zero gap
          if (typeof sRef.current?.openActivePhysical === 'function') {
            sRef.current.openActivePhysical(targetCard);
          }
          setWebhookReceived(true);
          sRef.current?.showToast?.('Card ready for activation! Please set your PIN.', 2500);

          // Reload account state in background to sync userCards
          if (sRef.current?.reloadAccount) {
            sRef.current.reloadAccount().catch((e) => console.error('Failed to sync account:', e));
          }
        }
      } catch (err) {
        console.error('Error checking activation signal:', err);
      }
    };

    // Immediate initial check
    pollActivation();
    const pollInterval = setInterval(pollActivation, 5000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [isRegistered, webhookReceived, registeredWasabiCardId, form.cardNumber]);

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
      s.showToast?.('Card registered! Checking activation readiness...', 2500);
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

  const handleOpenActivationModal = () => {
    const targetLast4 = normalizeCardNumber(form.cardNumber).slice(-4);
    const targetCard = {
      id: registeredWasabiCardId,
      cardNo: registeredWasabiCardId,
      wasabiCardId: registeredWasabiCardId,
      last4: targetLast4,
      status: 'issued',
      hasSecureCode: true,
      cardType: normalizeCardNumber(form.cardNumber).startsWith('493875') ? 'virtual' : 'physical',
    };
    s.openActivePhysical?.(targetCard);
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
      <p className="cregister__lead">
        Enter your card details and register your card. Once verified, you can set your PIN to activate.
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

        {/* Step 2: Information & Activation Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--portal-text-muted, #4B5563)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Step 2. Set Transaction PIN
            </span>
          </div>

          {/* Status Indicator Line between Title and Description */}
          <div style={{ display: 'flex', alignItems: 'center', minHeight: '20px' }}>
            {!isRegistered && (
              <span style={{ fontSize: '12px', color: '#9CA3AF', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: '500' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#D1D5DB' }} />
                <span>Awaiting card registration (Step 1)</span>
              </span>
            )}
            {isRegistered && !webhookReceived && (
              <span style={{ fontSize: '12px', color: '#D69E2E', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
                <span className="portal-spin" style={{ width: '12px', height: '12px', borderWidth: '2px', borderTopColor: '#D69E2E', borderColor: 'rgba(214, 158, 46, 0.25)' }} />
                <span>Waiting for network callback...</span>
              </span>
            )}
            {isRegistered && webhookReceived && (
              <span style={{ fontSize: '12px', color: '#38A169', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: '600' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#38A169' }} />
                <span>✓ Ready for PIN Setup</span>
              </span>
            )}
          </div>

          <div style={{
            padding: '12px 14px',
            borderRadius: '8px',
            backgroundColor: 'var(--portal-paper-subtle, #F9FAFB)',
            border: '1px solid var(--portal-border, #E5E7EB)',
            fontSize: '13px',
            lineHeight: '1.5',
            color: 'var(--portal-text-muted, #4B5563)'
          }}>
            <p style={{ margin: 0 }}>
              <strong style={{ color: '#D97706', fontWeight: '700' }}>PIN setup window will appear automatically</strong> once confirmed. You can also <strong style={{ color: '#D97706', fontWeight: '700' }}>activate anytime from the Cards menu</strong>.
            </p>
          </div>
        </div>
      </div>

      <footer className="cregister-foot" style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
        <button
          type="button"
          className="portal-btn-secondary cregister-foot__cancel"
          style={{ flex: '1', height: '44px', fontWeight: '600', cursor: 'pointer' }}
          onClick={() => {
            if (isRegistered) {
              s.reloadAccount?.();
            }
            s.go('card');
          }}
          disabled={loading}>
          Cancel
        </button>

        <button
          type="button"
          className="portal-btn-primary cregister-foot__submit"
          disabled={loading || !(isRegistered && webhookReceived)}
          style={{
            flex: '1',
            height: '44px',
            fontWeight: '600',
            opacity: (isRegistered && webhookReceived) ? 1 : 0.6,
            cursor: (isRegistered && webhookReceived) ? 'pointer' : 'not-allowed'
          }}
          onClick={handleOpenActivationModal}>
          Activate Card
        </button>
      </footer>

      {/* Loading Spinner Modal during 1-Minute Signal Waiting */}
      {isRegistered && !webhookReceived && !timeoutModalOpen && (
        <div className="portal-sheet" role="dialog" aria-modal="true" aria-label="Waiting for Network Confirmation" style={{ zIndex: 1000 }}>
          <div className="portal-sheet__backdrop" />
          <div className="portal-sheet__panel" style={{ maxWidth: '400px', padding: '36px 24px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <div
                className="portal-spin"
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  border: '3.5px solid rgba(255, 85, 0, 0.15)',
                  borderTopColor: '#ff5500',
                  animation: 'portal-spin 0.8s linear infinite',
                  display: 'inline-block'
                }}
              />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '10px', color: 'var(--portal-text, #111827)' }}>
              Verifying Card Network Signal
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--portal-text-muted, #4B5563)', lineHeight: '1.6', margin: '0 0 24px 0' }}>
              Please wait a moment while the card network confirms your registration. The PIN activation window will open automatically.
            </p>
            <button
              type="button"
              className="portal-btn-secondary"
              style={{ width: '100%', height: '42px', borderRadius: '8px', fontSize: '13px', fontWeight: '600' }}
              onClick={() => {
                s.reloadAccount?.();
                s.go?.('card');
              }}>
              Continue Later in Cards Menu
            </button>
          </div>
        </div>
      )}

      {/* 1-Minute Timeout Modal */}
      {timeoutModalOpen && (
        <div className="portal-sheet" role="dialog" aria-modal="true" aria-label="Network Signal Timeout" style={{ zIndex: 1000 }}>
          <div className="portal-sheet__backdrop" onClick={() => {
            setTimeoutModalOpen(false);
            s.reloadAccount?.();
            s.go?.('card');
          }} />
          <div className="portal-sheet__panel" style={{ maxWidth: '440px', padding: '24px', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Icon name="clock" size={26} stroke={2} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', color: 'var(--portal-text, #111827)' }}>
              Network Confirmation Pending
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--portal-text-muted, #4B5563)', lineHeight: '1.5', marginBottom: '24px' }}>
              Card network confirmation is taking longer than usual. Please check your card status and activate directly from the <strong>Cards</strong> menu once the network signal arrives.
            </p>
            <button
              type="button"
              className="portal-btn-primary"
              style={{ width: '100%', height: '44px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
              onClick={() => {
                setTimeoutModalOpen(false);
                s.showToast?.('Please check and activate your card from the Cards menu.');
                s.reloadAccount?.();
                s.go?.('card');
              }}>
              Go to Cards Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
