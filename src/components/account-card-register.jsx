// ===== Register Existing Card (B2B / pre-issued) =====
// TODO: Wasabi API — card validation + activation
// TODO: Cregis API — wallet linkage after activation

import { useState } from 'react';
import { Icon } from './ui.jsx';
import * as R from '../lib/card-register.js';

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
          Your {card.label} ending in {card.last4} is now linked to your account.
          Card access and wallet connection will sync shortly.
        </p>
        <ul className="cregister-success__steps">
          <li>Card linked to your Anytap account</li>
          <li>Wallet connection initiated</li>
          <li>Card settings prepared for use</li>
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
    password: '',
    confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activatedCard, setActivatedCard] = useState(null);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined, form: undefined }));
    setFormError('');
  };

  const handleSubmit = async () => {
    setFormError('');
    const clientErrors = R.validateRegisterForm(form, s.userCards ?? []);
    if (Object.keys(clientErrors).length) {
      setFieldErrors(clientErrors);
      return;
    }

    setLoading(true);
    try {
      const result = await R.activatePreissuedCard(form, s.userCards ?? []);
      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        setFormError(result.message ?? R.REGISTER_ERROR_MESSAGES.activation_failed);
        return;
      }
      setActivatedCard(result.card);
      s.showToast?.('Card activated successfully');
      await s.reloadAccount?.();
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
      <p className="cregister__lead">
        Activate a pre-issued Anytap card using the details printed on your card mailer.
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
            onChange={(e) => setField('cardNumber', R.formatCardNumberInput(e.target.value))}
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
            onChange={(e) => setField('expiry', R.formatExpiryInput(e.target.value))}
          />
        </RegisterField>

        <RegisterField label="Password (4 digits)" error={fieldErrors.password}>
          <input
            className="cregister-input cregister-input--mono"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            maxLength={4}
            placeholder="••••"
            value={form.password}
            onChange={(e) => setField('password', e.target.value.replace(/\D/g, '').slice(0, 4))}
          />
        </RegisterField>

        <RegisterField label="Confirm Password" error={fieldErrors.confirmPassword}>
          <input
            className="cregister-input cregister-input--mono"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            maxLength={4}
            placeholder="••••"
            value={form.confirmPassword}
            onChange={(e) => setField('confirmPassword', e.target.value.replace(/\D/g, '').slice(0, 4))}
          />
        </RegisterField>
      </div>

      <div className="cregister-notice" role="note">
        <span className="cregister-notice__ic" aria-hidden="true">!</span>
        <span>
          Pre-issued cards are distributed by partners. If activation fails, contact the issuer
          or Anytap support with your card reference.
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
          onClick={handleSubmit}>
          {loading ? <span className="portal-spin" aria-label="Activating" /> : 'Activate Card'}
        </button>
      </footer>
    </div>
  );
}
