// ===== KYC / Identity verification (standalone page) =====

import { useState } from 'react';
import * as C from '../../lib/card-application.js';
import { isHttpApi } from '../../lib/api/config.js';
import { profilePatchFromKycForm } from '../../lib/member-profile.js';
import { KycDocField } from '../../components/kyc-doc-field.jsx';
import { phoneCountryCodeOptions } from '../../lib/phone-country-codes.js';
import { nationalityOptions } from '../../lib/nationality-options.ts';

function FormField({ label, children, className = '' }) {
  return (
    <label className={`capply-field ${className}`.trim()}>
      <span className="capply-field__label">{label}</span>
      {children}
    </label>
  );
}

function todayDateInputValue() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

function NationalitySelect({ value, onChange }) {
  const options = nationalityOptions(value);
  return (
    <select
      className="capply-input capply-input--select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Nationality">
      <option value="" disabled>Select…</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
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

function initialKycForm(accountState) {
  const existingName = accountState?.name ?? '';
  const split = C.splitFullName(existingName);
  return {
    ...C.EMPTY_KYC_FORM,
    firstName: split.firstName,
    lastName: split.lastName,
    fullName: existingName,
  };
}

export function AccountKyc({ s }) {
  const [kycForm, setKycForm] = useState(() => initialKycForm(s.accountState));
  const [kycSubmitting, setKycSubmitting] = useState(false);
  const [kycAwaitingReview, setKycAwaitingReview] = useState(false);
  const [kycRetryOpen, setKycRetryOpen] = useState(false);

  const kycStatusForGate = kycAwaitingReview && !s.profileReady
    ? 'under_review'
    : s.accountState?.kycStatus;
  const kycApplyStatus = C.mapKycApplyStatus(kycStatusForGate);

  const blocked = kycApplyStatus === 'under_review';
  const rejected = kycApplyStatus === 'rejected' && !kycRetryOpen;
  const verified = s.profileReady || kycApplyStatus === 'approved';
  const showForm = !blocked && !rejected && !verified;

  const setKyc = (key, val) => setKycForm((f) => {
    const next = { ...f, [key]: val };
    if (key === 'firstName' || key === 'lastName') {
      next.fullName = C.composeFullName(next);
    }
    return next;
  });

  const goHome = () => s.go('home');
  const goApply = () => s.go('cardApply');

  const handleVerify = async () => {
    if (!C.isKycFormValid(kycForm) || kycSubmitting) return;
    setKycSubmitting(true);
    try {
      if (isHttpApi) {
        await s.submitKycApplication(kycForm);
        await s.reloadAccount?.();
      } else {
        profilePatchFromKycForm(kycForm);
        setKycAwaitingReview(true);
      }
      setKycRetryOpen(false);
      s.showToast('Identity submitted for verification');
    } catch {
      s.showToast('Could not submit verification. Please try again.');
    } finally {
      setKycSubmitting(false);
    }
  };

  if (verified) {
    return (
      <div className="capply capply-shell">
        <div className="capply-alert">
          <p><strong>Identity verified</strong></p>
          <p className="capply-alert__sub">
            Your profile is unlocked. You can apply for a card next.
          </p>
        </div>
        <StickyFoot
          secondaryLabel="Back to Home"
          primaryLabel="Apply Card"
          primaryDisabled={false}
          onSecondary={goHome}
          onPrimary={goApply}
        />
      </div>
    );
  }

  return (
    <div className="capply capply-shell">
      <p className="capply__sub capply__sub--lead">
        Verify your identity to unlock card application and wallet.
      </p>

      {blocked && (
        <div className="capply-alert">
          <p><strong>Under review</strong></p>
          <p className="capply-alert__sub">
            Your identity verification is being reviewed. Usually takes a few minutes.
          </p>
        </div>
      )}

      {rejected && (
        <div className="capply-alert capply-alert--warn">
          <p>Verification failed. Please check your information and try again.</p>
          <button type="button" className="portal-btn-primary capply-alert__btn" onClick={() => setKycRetryOpen(true)}>
            Retry verification
          </button>
        </div>
      )}

      {showForm && (
        <>
          <div className="capply-kyc-notice" role="note">
            <p className="capply-kyc-notice__title">{C.KYC_IDENTITY_NOTICE.title}</p>
            <p className="capply-kyc-notice__body">{C.KYC_IDENTITY_NOTICE.body}</p>
          </div>
          <div className="capply-form">
            <div className="capply-form__row capply-form__row--name">
              <FormField label="Last name">
                <input
                  className="capply-input"
                  value={kycForm.lastName}
                  onChange={(e) => setKyc('lastName', e.target.value)}
                  placeholder="Surname"
                  autoComplete="family-name"
                />
              </FormField>
              <FormField label="First name">
                <input
                  className="capply-input"
                  value={kycForm.firstName}
                  onChange={(e) => setKyc('firstName', e.target.value)}
                  placeholder="Given name"
                  autoComplete="given-name"
                />
              </FormField>
            </div>
            <FormField label="Date of birth">
              <input className="capply-input" type="date" value={kycForm.dateOfBirth} onChange={(e) => setKyc('dateOfBirth', e.target.value)} />
            </FormField>
            <FormField label="Nationality">
              <NationalitySelect
                value={kycForm.nationality}
                onChange={(nationality) => setKyc('nationality', nationality)}
              />
            </FormField>
            <FormField label="ID document type">
              <select className="capply-input" value={kycForm.idDocType} onChange={(e) => setKyc('idDocType', e.target.value)}>
                {C.ID_DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </FormField>
            <FormField label="ID document number">
              <input className="capply-input" value={kycForm.idDocNumber} onChange={(e) => setKyc('idDocNumber', e.target.value)} />
            </FormField>
            <FormField label={kycForm.idDocType === 'Passport' ? 'Passport expiry date' : 'Document expiry date'}>
              <input
                className="capply-input"
                type="date"
                value={kycForm.idDocExpiry}
                min={todayDateInputValue()}
                onChange={(e) => setKyc('idDocExpiry', e.target.value)}
              />
            </FormField>
            <div className="capply-form__row capply-form__row--phone">
              <FormField label="Country code">
                <PhoneCountryCodeSelect
                  value={kycForm.phoneCountryCode}
                  onChange={(code) => setKyc('phoneCountryCode', code)}
                />
              </FormField>
              <FormField label="Phone number">
                <input className="capply-input" type="tel" value={kycForm.phoneNumber} onChange={(e) => setKyc('phoneNumber', e.target.value)} />
              </FormField>
            </div>
            <p className="capply-doc__lead">
              On mobile you can take a photo or upload a file. On desktop, upload an image file.
            </p>
            <KycDocField
              label="ID document front"
              required
              facing="environment"
              file={kycForm.idFrontFile}
              onChange={(file) => setKyc('idFrontFile', file)}
            />
            <KycDocField
              label="ID document back"
              required
              facing="environment"
              file={kycForm.idBackFile}
              onChange={(file) => setKyc('idBackFile', file)}
            />
            <KycDocField
              label="Face photo"
              required
              facing="user"
              accept="image/jpeg,image/png,image/webp"
              file={kycForm.selfieFile}
              onChange={(file) => setKyc('selfieFile', file)}
            />
          </div>
        </>
      )}

      <StickyFoot
        secondaryLabel="Cancel"
        primaryLabel={showForm ? 'Verify Identity' : 'Back to Home'}
        primaryDisabled={(showForm && !C.isKycFormValid(kycForm)) || kycSubmitting}
        onSecondary={goHome}
        onPrimary={showForm ? handleVerify : goHome}
        loading={kycSubmitting}
      />
    </div>
  );
}
