import { useEffect, useMemo, useState } from 'react';
import { Icon } from './ui.jsx';
import * as A from '../lib/account-data.js';
import * as C from '../lib/card-application.js';
import { isHttpApi } from '../lib/api/config.js';
import { phoneCountryCodeOptions } from '../lib/phone-country-codes.js';
import { IssuanceDepositPanel } from './account-wallet.jsx';

function ApplyStepBar({ step, cardType, kycApproved }) {
  const skippedDetails = cardType === 'virtual' && kycApproved;

  return (
    <nav className="capply-steps" aria-label="Application progress">
      <ol className="capply-steps__list">
        {C.CARD_APPLY_STEPS.map((label, i) => {
          const n = i + 1;
          const done = step > n || (skippedDetails && n === 2 && step >= 3);
          const active = step === n;
          const skipped = skippedDetails && n === 2;
          return (
            <li
              key={label}
              className={[
                'capply-steps__item',
                done ? 'is-done' : '',
                active ? 'is-active' : '',
                skipped ? 'is-skipped' : '',
              ].filter(Boolean).join(' ')}>
              <span className="capply-steps__dot" aria-hidden="true">
                {done ? <Icon name="check" size={12} stroke={2.5} /> : skipped ? '—' : n}
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

function ChooseCardStep({ cardType, setCardType, blocked }) {
  return (
    <section className="capply-section">
      <h2 className="capply-section__title">Choose your card</h2>
      <p className="capply-section__lead">Compare options and select the card that fits how you spend.</p>

      <div className="capply-pick">
        {Object.values(C.CARD_TYPE_OPTIONS).map((opt) => {
          const selected = cardType === opt.id;
          const fee = C.getCardIssuanceFee(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              disabled={blocked || opt.id === 'virtual'}
              className={`capply-pick__option${selected ? ' is-selected' : ''}${opt.id === 'virtual' ? ' is-disabled' : ''}`}
              style={opt.id === 'virtual' ? { opacity: 0.55, cursor: 'not-allowed' } : {}}
              onClick={() => setCardType(opt.id)}>
              <span className={`capply-pick__radio${selected ? ' is-on' : ''}`} aria-hidden="true" />
              <div className={`capply-pick__visual capply-pick__visual--${opt.id}${selected ? ' is-selected' : ''}`}>
                <img
                  src={opt.image}
                  alt=""
                  className="capply-pick__img"
                  width={1240}
                  height={728}
                  draggable={false}
                />
              </div>
              <div className="capply-pick__body">
                <div className="capply-pick__head">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <strong className="capply-pick__title">{opt.title}</strong>
                    {opt.id === 'virtual' && (
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#E53E3E', background: '#FFF0F0', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>
                        Unavailable
                      </span>
                    )}
                  </div>
                  <span className="capply-pick__subtitle">{opt.subtitle}</span>
                </div>
                <ul className="capply-pick__benefits">
                  {opt.benefits.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
                <p className="capply-pick__fee">
                  <span className="capply-pick__fee-label">Issuing fee</span>
                  <strong className="capply-pick__fee-amount">{fee.amount} {fee.currency}</strong>
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function DetailsStep({ shipping, setShip }) {
  return (
    <section className="capply-section">
      <h2 className="capply-section__title">Delivery address</h2>
      <p className="capply-section__lead">Where should we ship your physical Visa card?</p>
      <div className="capply-form">
        <FormField label="Recipient name">
          <input className="capply-input" value={shipping.recipientName} onChange={(e) => setShip('recipientName', e.target.value)} />
        </FormField>
        <FormField label="Country">
          <input className="capply-input" value={shipping.country} onChange={(e) => setShip('country', e.target.value)} />
        </FormField>
        <FormField label="State / Province">
          <input className="capply-input" value={shipping.state} onChange={(e) => setShip('state', e.target.value)} />
        </FormField>
        <FormField label="City">
          <input className="capply-input" value={shipping.city} onChange={(e) => setShip('city', e.target.value)} />
        </FormField>
        <FormField label="Address line 1">
          <input className="capply-input" value={shipping.addressLine1} onChange={(e) => setShip('addressLine1', e.target.value)} />
        </FormField>
        <FormField label="Address line 2 (optional)">
          <input className="capply-input" value={shipping.addressLine2} onChange={(e) => setShip('addressLine2', e.target.value)} />
        </FormField>
        <FormField label="Postal code">
          <input className="capply-input" value={shipping.postalCode} onChange={(e) => setShip('postalCode', e.target.value)} />
        </FormField>
        <div className="capply-form__row capply-form__row--phone">
          <FormField label="Country code">
            <PhoneCountryCodeSelect
              value={shipping.phoneCountryCode}
              onChange={(code) => setShip('phoneCountryCode', code)}
            />
          </FormField>
          <FormField label="Phone number">
            <input className="capply-input" type="tel" value={shipping.phoneNumber} onChange={(e) => setShip('phoneNumber', e.target.value)} />
          </FormField>
        </div>
      </div>
    </section>
  );
}

function ReviewStep({ s, cardType, shipping, fee }) {
  const opt = C.CARD_TYPE_OPTIONS[cardType];

  return (
    <section className="capply-section">
      <h2 className="capply-section__title">Review application</h2>
      <p className="capply-section__lead">Confirm your details before submitting.</p>

      <div className="capply-review-card">
        <div className={`capply-review-card__visual capply-review-card__visual--${cardType}`}>
          <img
            src={opt?.image}
            alt=""
            className="capply-review-card__img"
            width={1240}
            height={728}
            draggable={false}
          />
        </div>
        <div className="capply-review-card__meta">
          <strong>{opt?.title}</strong>
          <span>{opt?.subtitle}</span>
        </div>
      </div>

      <dl className="capply-summary">
        <div><dt>Name</dt><dd>{s.accountState.name}</dd></div>
        <div><dt>Email</dt><dd>{s.accountState.email}</dd></div>
        <div><dt>Card type</dt><dd>{C.getCardTypeLabel(cardType)}</dd></div>
        <div><dt>Network</dt><dd>Visa</dd></div>
        {cardType === 'physical' && shipping.addressLine1 && (
          <>
            <div><dt>Delivery</dt><dd>{shipping.recipientName}</dd></div>
            <div><dt>Address</dt><dd>{[shipping.addressLine1, shipping.city, shipping.country].filter(Boolean).join(', ')}</dd></div>
          </>
        )}
      </dl>

      <div className="capply-fee">
        <p className="capply-fee__label">Issuing fee</p>
        <p className="capply-fee__amount">{fee.amount} {fee.currency}</p>
        <ul className="capply-fee__list">
          <li>Pay in USDT on TRC-20 after approval.</li>
          <li>Fee is non-refundable once payment is confirmed.</li>
        </ul>
      </div>
    </section>
  );
}

function CompleteStep({ application, cardType, s }) {
  const fee = application?.issuingFee ?? C.getCardIssuanceFee(cardType);
  return (
    <section className="capply-section capply-section--center">
      <span className="capply-done__icon" aria-hidden="true">
        <Icon name="checkCircle" size={48} stroke={2} />
      </span>
      <h2 className="capply-section__title">Application submitted</h2>
      <p className="capply-section__lead">We&apos;ll review your application and notify you by email.</p>
      <p className="capply-section__lead" style={{ marginBottom: '24px' }}>
        After approval, deposit <strong>{fee.amount} {fee.currency}</strong> to activate your {C.getCardTypeLabel(cardType).toLowerCase()}.
      </p>
      {application && (
        <p className="capply-done__ref" style={{ marginBottom: '32px' }}>Reference {application.applicationNumber}</p>
      )}

      {/* Display deposit panel at the bottom of application completion */}
      <div style={{ maxWidth: '480px', margin: '32px auto 0 auto', textAlign: 'left', borderTop: '1px solid #E2E8F0', paddingTop: '32px' }}>
        <IssuanceDepositPanel s={s} />
      </div>
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
        <div><dt>Payment status</dt><dd>{C.PAYMENT_STATUS[application.paymentStatus] ?? application.paymentStatus}</dd></div>
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
      {!cancelAllowed && (
        <p className="capply-status__note">This application can no longer be cancelled because payment has been received.</p>
      )}
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
  const [cardType, setCardType] = useState('physical');
  const [shipping, setShipping] = useState({
    ...C.EMPTY_SHIPPING,
    recipientName: s.accountState.name ?? '',
  });
  const [application, setApplication] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isHttpApi) return;
    if (scenarioApp && ['cardApplied', 'cardShipping', 'cardRegistered', 'cardActiveWithTransactions', 'cardActiveThree', 'depositReceived', 'cardCreating', 'issued'].includes(s.scenarioKey)) {
      setApplication(scenarioApp);
    }
  }, [scenarioApp, s.scenarioKey]);

  const kycApproved = s.kycApproved;
  const setShip = (key, val) => setShipping((f) => ({ ...f, [key]: val }));

  const goToCards = () => s.go('card');

  const goNext = () => {
    if (step === 1) {
      setStep(cardType === 'physical' ? 2 : 3);
      return;
    }
    if (step === 2) {
      setStep(3);
      return;
    }
    if (step === 3) {
      handleSubmit();
      return;
    }
    if (step === 4) {
      goToCards();
    }
  };

  const goBack = () => {
    if (step === 1 || step === 4) {
      goToCards();
      return;
    }
    if (step === 3 && cardType === 'virtual') {
      setStep(1);
      return;
    }
    setStep((n) => Math.max(1, n - 1));
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const fee = C.getCardIssuanceFee(cardType);
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
      setStep(4);
      s.showToast(`Application submitted — ${fee.amount} ${fee.currency} due after approval`);
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

  const step1Valid = Boolean(cardType) && !blocked;
  const step2Valid = C.isShippingValid(shipping);
  const primaryDisabled = submitting
    || (step === 1 && !step1Valid)
    || (step === 2 && !step2Valid);

  const primaryLabel = step === 3 ? 'Submit Application' : step === 4 ? 'Back to My Cards' : 'Continue';
  const secondaryLabel = step === 4 ? null : step === 1 ? 'Cancel' : 'Back';

  return (
    <div className="capply capply-shell">
      <p className="capply__sub capply__sub--lead">
        <span className="capply__sub-step">Step {step} of {C.CARD_APPLY_STEPS.length}</span>
        {' '}Choose your card, review details, and submit.
      </p>

      <ApplyStepBar step={step} cardType={cardType} kycApproved={kycApproved} />

      {blocked && (
        <div className="capply-alert capply-alert--warn" role="alert">
          You can hold up to {A.MAX_CARDS_PER_USER} cards.
        </div>
      )}

      {step === 1 && (
        <ChooseCardStep
          cardType={cardType}
          setCardType={setCardType}
          blocked={blocked}
        />
      )}

      {step === 2 && cardType === 'physical' && (
        <DetailsStep shipping={shipping} setShip={setShip} />
      )}

      {step === 3 && (
        <ReviewStep s={s} cardType={cardType} shipping={shipping} fee={C.getCardIssuanceFee(cardType)} />
      )}

      {step === 4 && <CompleteStep application={application} cardType={cardType} s={s} />}

      {step < 4 && scenarioApp && step === 1 && (
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
