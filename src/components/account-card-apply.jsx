import { useEffect, useMemo, useState } from 'react';
import { Icon } from './ui.jsx';
import * as A from '../lib/account-data.js';
import * as C from '../lib/card-application.js';
import { isHttpApi } from '../lib/api/config.js';
import { phoneCountryCodeOptions } from '../lib/phone-country-codes.js';
import { fetchSystemAddress } from '../lib/services/accountService.js';

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

function ChooseCardStep({ cardType, setCardType, blocked }) {
  return (
    <section className="capply-section">
      <h2 className="capply-section__title">Choose your card</h2>
      <p className="capply-section__lead">Compare options and select the card that fits how you spend.</p>

      <div className="capply-pick">
        {Object.values(C.CARD_TYPE_OPTIONS).map((opt) => {
          const selected = cardType === opt.id;
          const fee = C.getCardIssuanceFee(opt.id);
          const isVirtual = opt.id === 'virtual';
          const comingSoon = Boolean(opt.comingSoon) || isVirtual;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={blocked || comingSoon}
              className={`capply-pick__option${selected ? ' is-selected' : ''}${comingSoon ? ' is-disabled' : ''}`}
              onClick={() => { if (!comingSoon) setCardType(opt.id); }}>
              <span className={`capply-pick__radio${selected ? ' is-on' : ''}`} aria-hidden="true" />
              {comingSoon ? <span className="capply-pick__badge">Coming soon</span> : null}
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
                  <strong className="capply-pick__title">{opt.title}</strong>
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
        <FormField label="Recipient name" htmlFor="shipping_recipientName">
          <input id="shipping_recipientName" name="recipientName" className="capply-input" value={shipping.recipientName} placeholder="e.g. John Smith" onChange={(e) => setShip('recipientName', e.target.value)} />
        </FormField>
        <FormField label="Country" htmlFor="shipping_country">
          <input id="shipping_country" name="country" className="capply-input" value={shipping.country} placeholder="e.g. United States" onChange={(e) => setShip('country', e.target.value)} />
        </FormField>
        <FormField label="State / Province" htmlFor="shipping_state">
          <input id="shipping_state" name="state" className="capply-input" value={shipping.state} placeholder="e.g. California" onChange={(e) => setShip('state', e.target.value)} />
        </FormField>
        <FormField label="City" htmlFor="shipping_city">
          <input id="shipping_city" name="city" className="capply-input" value={shipping.city} placeholder="e.g. Los Angeles" onChange={(e) => setShip('city', e.target.value)} />
        </FormField>
        <FormField label="Address line 1" htmlFor="shipping_addressLine1">
          <input id="shipping_addressLine1" name="addressLine1" className="capply-input" value={shipping.addressLine1} placeholder="e.g. 100 Main Street" onChange={(e) => setShip('addressLine1', e.target.value)} />
        </FormField>
        <FormField label="Address line 2 (optional)" htmlFor="shipping_addressLine2">
          <input id="shipping_addressLine2" name="addressLine2" className="capply-input" value={shipping.addressLine2} placeholder="e.g. Apt 402, Building B" onChange={(e) => setShip('addressLine2', e.target.value)} />
        </FormField>
        <FormField label="Postal code" htmlFor="shipping_postalCode">
          <input id="shipping_postalCode" name="postalCode" className="capply-input" value={shipping.postalCode} placeholder="e.g. 90210" onChange={(e) => setShip('postalCode', e.target.value)} />
        </FormField>
        <div className="capply-form__row capply-form__row--phone">
          <FormField label="Country code" htmlFor="shipping_phoneCountryCode">
            <PhoneCountryCodeSelect
              id="shipping_phoneCountryCode"
              name="phoneCountryCode"
              value={shipping.phoneCountryCode}
              onChange={(code) => setShip('phoneCountryCode', code)}
            />
          </FormField>
          <FormField label="Phone number" htmlFor="shipping_phoneNumber">
            <input id="shipping_phoneNumber" name="phoneNumber" className="capply-input" type="tel" value={shipping.phoneNumber} placeholder="e.g. 2125550199" onChange={(e) => setShip('phoneNumber', e.target.value)} />
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
        {s.accountState.email && (
          <div><dt>Email</dt><dd>{s.accountState.email}</dd></div>
        )}
        <div><dt>Card type</dt><dd>{C.getCardTypeLabel(cardType)}</dd></div>
        <div><dt>Network</dt><dd>Visa</dd></div>
        {cardType === 'physical' && shipping.addressLine1 && (
          <>
            {shipping.recipientName && <div><dt>Delivery</dt><dd>{shipping.recipientName}</dd></div>}
            <div><dt>Address</dt><dd>{[shipping.addressLine1, shipping.city, shipping.country].filter(Boolean).join(', ')}</dd></div>
          </>
        )}
      </dl>

      <div className="capply-fee">
        <p className="capply-fee__label">Issuing fee</p>
        <p className="capply-fee__amount">{fee.amount} {fee.currency}</p>
      </div>
    </section>
  );
}

function DepositQrBox({ s }) {
  const [systemAddress, setSystemAddress] = useState('');

  useEffect(() => {
    fetchSystemAddress().then((addr) => {
      if (addr) setSystemAddress(addr);
    });
  }, []);

  const address = s?.accountState?.cregisWalletAddress 
    || s?.accountState?.issuanceDepositAddress 
    || systemAddress 
    || '';

  const handleCopy = () => {
    if (address) {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(address);
      }
      s?.showToast?.('Deposit address copied to clipboard!');
    }
  };

  return (
    <div className="portal-issuance-deposit" style={{ marginTop: '20px', marginBottom: '20px', padding: '24px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', textAlign: 'left' }}>
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <span style={{ fontSize: '12px', fontWeight: '700', color: '#FF5500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Card Issuance Fee Deposit
        </span>
        <h3 style={{ fontSize: '22px', fontWeight: '800', margin: '4px 0 8px 0', color: '#0F172A' }}>
          100 USDT (TRC-20)
        </h3>
        <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
          Deposit exactly 100 USDT to your personal TRC-20 address below to complete your card application and start delivery.
        </p>
      </div>

      <div className="portal-qrbox" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', background: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
        {address ? (
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(address)}`}
            alt="TRC-20 Deposit QR Code"
            width={160}
            height={160}
            style={{ width: '160px', height: '160px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '4px', background: '#FFFFFF' }}
          />
        ) : (
          <div className="portal-qr" style={{ width: '160px', height: '160px', padding: '8px', background: '#FFFFFF', borderRadius: '8px', border: '1px solid #CBD5E1' }} dangerouslySetInnerHTML={{ __html: A.buildQR() }} />
        )}
        <p style={{ fontSize: '12px', fontWeight: '600', color: '#475569', margin: 0 }}>
          TRC-20 USDT Deposit Address
        </p>
        <div style={{ fontFamily: 'monospace', fontSize: '13px', padding: '10px 14px', background: '#F1F5F9', borderRadius: '8px', width: '100%', wordBreak: 'break-all', textAlign: 'center', color: '#0F172A', fontWeight: '700' }}>
          {address}
        </div>
        <button
          type="button"
          className="portal-btn-primary"
          style={{ width: '100%', padding: '10px', fontSize: '14px', fontWeight: '600', borderRadius: '8px', cursor: 'pointer' }}
          onClick={handleCopy}>
          Copy Address
        </button>
      </div>

      <div style={{ marginTop: '16px', padding: '12px', borderRadius: '8px', backgroundColor: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', fontSize: '12px', lineHeight: '1.5' }}>
        <strong>Notice:</strong> Please send the TxID to support@anytap.io after depositing 100 USDT to the address above, or submit it by scanning the TxID.
      </div>
    </div>
  );
}

function CompleteStep({ application, cardType, s }) {
  return (
    <section className="capply-section capply-section--center">
      <span className="capply-done__icon" aria-hidden="true">
        <Icon name="checkCircle" size={48} stroke={2} />
      </span>
      <h2 className="capply-section__title">Application Submitted!</h2>
      <p className="capply-section__lead">
        Please deposit <strong>100 USDT (TRC-20)</strong> using the QR code or address below to activate card delivery.
      </p>

      <DepositQrBox s={s} />

    </section>
  );
}

function ApplicationStatusCard({ application, onCancel, onBack, s }) {
  const cancelAllowed = C.canCancelApplication(application);

  return (
    <div className="capply-status portal-page portal-page--unified">
      <h2 className="capply-status__title">Application Status</h2>
      <dl className="capply-status__grid">
        <div><dt>Application number</dt><dd>{application.applicationNumber}</dd></div>
        <div><dt>Card type</dt><dd>{C.getCardTypeLabel(application.cardType)}</dd></div>
        <div><dt>Card network</dt><dd>{application.cardNetwork}</dd></div>
        <div><dt>Card status</dt><dd>{A.CARD_STATUS_DEFS[application.cardStatus]?.label ?? application.cardStatus}</dd></div>
        <div><dt>Created</dt><dd>{new Date(application.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</dd></div>
      </dl>

      <DepositQrBox s={s} />

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
  const [cardType, setCardType] = useState('physical');
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
        s={s}
      />
    );
  }

  const step1Valid = Boolean(cardType) && cardType !== 'virtual' && !blocked;
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

      <ApplyStepBar step={step} />

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
