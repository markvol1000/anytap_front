import { useEffect, useMemo, useState } from 'react';
import { Icon } from './ui.jsx';
import * as A from '../lib/account-data.js';
import * as C from '../lib/card-application.js';
import { isHttpApi } from '../lib/api/config.js';
import { phoneCountryCodeOptions } from '../lib/phone-country-codes.js';
import { IssuanceDepositPanel } from './account-wallet.jsx';

function ApplyStepBar({ step }) {
  return (
    <nav className="capply-steps" aria-label="Application progress">
      <ol className="capply-steps__list">
        {C.CARD_APPLY_STEPS.map((label, i) => {
          const n = i + 1;
          const done = step > n;
          const active = step === n;
          return (
            <li
              key={label}
              className={[
                'capply-steps__item',
                done ? 'is-done' : '',
                active ? 'is-active' : '',
              ].filter(Boolean).join(' ')}>
              <span className="capply-steps__dot" aria-hidden="true">
                {done ? <Icon name="check" size={12} stroke={2.5} /> : n}
              </span>
              <span className="capply-steps__label">{label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function FormField({ label, children, className = '' }) {
  return (
    <label className={`capply-field ${className}`.trim()}>
      <span className="capply-field__label">{label}</span>
      {children}
    </label>
  );
}

function PhoneCountryCodeSelect({ value, onChange }) {
  const options = phoneCountryCodeOptions(value);
  return (
    <select
      className="capply-input capply-input--select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Country code">
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

function StickyFoot({ secondaryLabel, primaryLabel, primaryDisabled, onSecondary, onPrimary, loading }) {
  return (
    <footer className="capply-sticky-foot">
      {secondaryLabel ? (
        <button type="button" className="portal-btn-secondary capply-sticky-foot__cancel" onClick={onSecondary}>
          {secondaryLabel}
        </button>
      ) : null}
      <button
        type="button"
        className={`portal-btn-primary capply-sticky-foot__continue${secondaryLabel ? '' : ' capply-sticky-foot__continue--solo'}`}
        disabled={primaryDisabled}
        onClick={onPrimary}>
        {loading ? <span className="portal-spin" /> : primaryLabel}
      </button>
    </footer>
  );
}

function DetailsStep({ shipping, setShip, readOnly = false }) {
  return (
    <section className="capply-section">
      <h2 className="capply-section__title">{readOnly ? 'Delivery address details' : 'Delivery address'}</h2>
      <p className="capply-section__lead">{readOnly ? 'Please review your shipping details below.' : 'Where should we ship your physical Visa card?'}</p>
      <div className="capply-form">
        <FormField label="Recipient name">
          <input className="capply-input" value={shipping.recipientName || ''} placeholder="e.g. Gildong Hong" readOnly={readOnly} disabled={readOnly} onChange={(e) => !readOnly && setShip('recipientName', e.target.value)} />
        </FormField>
        <FormField label="Country">
          <input className="capply-input" value={shipping.country || ''} placeholder="e.g. South Korea" readOnly={readOnly} disabled={readOnly} onChange={(e) => !readOnly && setShip('country', e.target.value)} />
        </FormField>
        <FormField label="State / Province">
          <input className="capply-input" value={shipping.state || ''} placeholder="e.g. Seoul" readOnly={readOnly} disabled={readOnly} onChange={(e) => !readOnly && setShip('state', e.target.value)} />
        </FormField>
        <FormField label="City">
          <input className="capply-input" value={shipping.city || ''} placeholder="e.g. Gangnam-gu" readOnly={readOnly} disabled={readOnly} onChange={(e) => !readOnly && setShip('city', e.target.value)} />
        </FormField>
        <FormField label="Address line 1">
          <input className="capply-input" value={shipping.addressLine1 || ''} placeholder="e.g. 123 Teheran-ro" readOnly={readOnly} disabled={readOnly} onChange={(e) => !readOnly && setShip('addressLine1', e.target.value)} />
        </FormField>
        <FormField label="Address line 2 (optional)">
          <input className="capply-input" value={shipping.addressLine2 || ''} placeholder="e.g. Apt 402, Building B" readOnly={readOnly} disabled={readOnly} onChange={(e) => !readOnly && setShip('addressLine2', e.target.value)} />
        </FormField>
        <FormField label="Postal code">
          <input className="capply-input" value={shipping.postalCode || ''} placeholder="e.g. 06123" readOnly={readOnly} disabled={readOnly} onChange={(e) => !readOnly && setShip('postalCode', e.target.value)} />
        </FormField>
        <div className="capply-form__row capply-form__row--phone">
          <FormField label="Country code">
            {readOnly ? (
              <input className="capply-input" value={shipping.phoneCountryCode || ''} readOnly disabled />
            ) : (
              <PhoneCountryCodeSelect
                value={shipping.phoneCountryCode}
                onChange={(code) => setShip('phoneCountryCode', code)}
              />
            )}
          </FormField>
          <FormField label="Phone number">
            <input className="capply-input" type="tel" value={shipping.phoneNumber || ''} placeholder="e.g. 01012345678" readOnly={readOnly} disabled={readOnly} onChange={(e) => !readOnly && setShip('phoneNumber', e.target.value)} />
          </FormField>
        </div>
      </div>
    </section>
  );
}

function ReviewStep({ shipping }) {
  const opt = C.CARD_TYPE_OPTIONS.physical;

  return (
    <section className="capply-section">
      <h2 className="capply-section__title">Review application</h2>
      <p className="capply-section__lead">Confirm your delivery details before submitting your card request.</p>

      <div className="capply-review-card">
        <div className="capply-review-card__visual capply-review-card__visual--physical">
          <img
            src={opt?.image}
            alt=""
            className="capply-review-card__img"
            width={1240}
            height={780}
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="capply-review-card__info">
          <h3 className="capply-review-card__title">Physical Visa Card</h3>
          <p className="capply-review-card__sub">Visa · Physical Card Delivery</p>
        </div>
      </div>

      <DetailsStep shipping={shipping} setShip={() => {}} readOnly={true} />

      <div className="capply-review-notice" style={{ marginTop: '20px' }}>
        <p className="capply-review-notice__text">
          By clicking &ldquo;Submit Application&rdquo;, your card delivery request will be processed and shipped to the specified address.
        </p>
      </div>
    </section>
  );
}

function CompleteStep({ application }) {
  return (
    <section className="capply-section capply-section--center">
      <span className="capply-done__icon" aria-hidden="true">
        <Icon name="checkCircle" size={48} stroke={2} />
      </span>
      <h2 className="capply-section__title">Card Application Submitted</h2>
      <p className="capply-section__lead">Your physical card request has been successfully registered.</p>
      <p className="capply-section__lead" style={{ marginBottom: '24px' }}>
        Our team will package and deliver your physical Visa card to your shipping address.
      </p>
      {application && (
        <p className="capply-done__ref" style={{ marginBottom: '32px' }}>Reference {application.applicationNumber}</p>
      )}
    </section>
  );
}

function ApplicationStatusCard({ application, onCancel, onBack }) {
  const cancelAllowed = C.canCancelApplication(application);

  return (
    <div className="capply-status portal-page portal-page--unified">
      <h2 className="capply-status__title">Application Status</h2>
      <dl className="capply-status__grid">
        <div><dt>Application number</dt><dd>{application.applicationNumber}</dd></div>
        <div><dt>Card type</dt><dd>{C.getCardTypeLabel(application.cardType)}</dd></div>
        <div><dt>Card network</dt><dd>{application.cardNetwork}</dd></div>
        <div><dt>KYC status</dt><dd>{C.KYC_APPLY_LABELS[application.kycStatus] ?? application.kycStatus}</dd></div>
        <div><dt>Card status</dt><dd>{A.CARD_STATUS_DEFS[application.cardStatus]?.label ?? application.cardStatus}</dd></div>
        <div><dt>Created</dt><dd>{new Date(application.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</dd></div>
      </dl>
      <div className="capply-status__actions">
        <button type="button" className="portal-btn-secondary" onClick={onBack}>Back to My Cards</button>
        {cancelAllowed && (
          <button type="button" className="portal-btn-secondary capply-status__cancel" onClick={onCancel}>
            Cancel Application
          </button>
        )}
      </div>
    </div>
  );
}

export function AccountCardApply({ s }) {
  const blocked = !C.canStartNewApplication(s.cardLimit);
  const scenarioApp = useMemo(
    () => (isHttpApi ? null : C.getScenarioApplication(s.scenarioKey, s.accountState)),
    [s.scenarioKey, s.accountState],
  );

  const [view, setView] = useState('flow');
  const [step, setStep] = useState(1);
  const cardType = 'physical';
  const [shipping, setShipping] = useState({
    ...C.EMPTY_SHIPPING,
    recipientName: (s.accountState?.name && s.accountState.name !== 'User') ? s.accountState.name : '',
  });
  const [application, setApplication] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isHttpApi) return;
    if (scenarioApp && ['cardApplied', 'cardShipping', 'cardRegistered', 'cardActiveWithTransactions', 'cardActiveThree', 'depositReceived', 'cardCreating', 'issued'].includes(s.scenarioKey)) {
      setApplication(scenarioApp);
    }
  }, [scenarioApp, s.scenarioKey]);

  const setShip = (key, val) => setShipping((f) => ({ ...f, [key]: val }));
  const goToCards = () => s.go('card');

  const goNext = () => {
    if (step === 1) {
      setStep(2);
      return;
    }
    if (step === 2) {
      handleSubmit();
      return;
    }
    if (step === 3) {
      goToCards();
    }
  };

  const goBack = () => {
    if (step === 1 || step === 3) {
      goToCards();
      return;
    }
    setStep((n) => Math.max(1, n - 1));
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const kycForm = { fullName: s.accountState.name ?? '' };
      if (isHttpApi) {
        const result = await s.submitCardApplication({ cardType, shipping });
        await s.reloadAccount?.();
        setApplication(C.createApplication({
          cardType,
          accountState: s.accountState,
          kycForm,
          shipping,
          reference: result?.reference,
        }));
      } else {
        await new Promise((r) => window.setTimeout(r, 1200));
        setApplication(C.createApplication({
          cardType,
          accountState: s.accountState,
          kycForm,
          shipping,
        }));
        const nextScenario = C.getPostSubmitScenario(s.scenarioKey, s.accountState.kycStatus);
        s.setScenarioKey(nextScenario);
      }
      setStep(3);
      s.showToast('Card application submitted successfully');
    } catch (err) {
      s.showToast(err?.message || 'Could not submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelApplication = () => {
    setApplication(null);
    s.showToast('Application cancelled');
    goToCards();
  };

  if (view === 'status' && application) {
    return (
      <ApplicationStatusCard
        application={application}
        onCancel={handleCancelApplication}
        onBack={goToCards}
      />
    );
  }

  const step1Valid = C.isShippingValid(shipping) && !blocked;
  const primaryDisabled = submitting || (step === 1 && !step1Valid);

  const primaryLabel = step === 2 ? 'Submit Application' : step === 3 ? 'Back to My Cards' : 'Continue';
  const secondaryLabel = step === 3 ? null : step === 1 ? 'Cancel' : 'Back';

  return (
    <div className="capply capply-shell">
      <p className="capply__sub capply__sub--lead">
        <span className="capply__sub-step">Step {step} of {C.CARD_APPLY_STEPS.length}</span>
        {' '}Enter your shipping address to receive your physical Visa card.
      </p>

      <ApplyStepBar step={step} />

      {blocked && (
        <div className="capply-alert capply-alert--warn" role="alert">
          You can hold up to {A.MAX_CARDS_PER_USER} cards.
        </div>
      )}

      {step === 1 && (
        <DetailsStep shipping={shipping} setShip={setShip} />
      )}

      {step === 2 && (
        <ReviewStep shipping={shipping} />
      )}

      {step === 3 && <CompleteStep application={application} />}

      {step < 3 && scenarioApp && step === 1 && (
        <p className="capply__existing">
          <button type="button" className="portal-btn-link" onClick={() => { setApplication(scenarioApp); setView('status'); }}>
            View existing application status
          </button>
        </p>
      )}

      <StickyFoot
        secondaryLabel={secondaryLabel}
        primaryLabel={primaryLabel}
        primaryDisabled={primaryDisabled}
        onSecondary={goBack}
        onPrimary={goNext}
        loading={submitting}
      />
    </div>
  );
}
