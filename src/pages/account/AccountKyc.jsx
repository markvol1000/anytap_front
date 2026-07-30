// ===== KYC / Identity verification (standalone page) =====

import { useState } from 'react';
import * as C from '../../lib/card-application.js';
import { isHttpApi } from '../../lib/api/config.js';
import { profilePatchFromKycForm } from '../../lib/member-profile.js';
import { KycDocField } from '../../components/kyc-doc-field.jsx';
import { phoneCountryCodeOptions } from '../../lib/phone-country-codes.js';

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

export function AccountKyc({ s }) {
  const [kycForm, setKycForm] = useState({
    ...C.EMPTY_KYC_FORM,
    firstName: '',
    lastName: '',
  });
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

  const setKyc = (key, val) => setKycForm((f) => ({ ...f, [key]: val }));

  const handleAddressChange = (key, rawValue) => {
    const invalidCharPattern = /[^a-zA-Z0-9\s-]/;
    if (invalidCharPattern.test(rawValue)) {
      s.showToast("Address only supports English alphabets, numbers, hyphens(-), and spaces. Special characters (,.#/) and Korean are not allowed.");
    }
    const cleaned = rawValue.replace(/[^a-zA-Z0-9\s-]/g, '');
    setKyc(key, cleaned);
  };

  const goHome = () => s.go('home');
  const goApply = () => s.go('cardApply');

  const handleVerify = async () => {
    if (kycSubmitting) return;

    const firstName = String(kycForm.firstName || '').trim();
    if (!firstName) {
      s.showToast('Please enter your English first name.');
      return;
    }
    if (!/^[a-zA-Z\s.-]+$/.test(firstName)) {
      s.showToast('First name only supports English alphabets.');
      return;
    }
    const lastName = String(kycForm.lastName || '').trim();
    if (!lastName) {
      s.showToast('Please enter your English last name.');
      return;
    }
    if (!/^[a-zA-Z\s.-]+$/.test(lastName)) {
      s.showToast('Last name only supports English alphabets.');
      return;
    }

    const invalidPattern = /\b(test|sandbox|mock)\b/i;
    if (invalidPattern.test(firstName) || invalidPattern.test(lastName)) {
      s.showToast('Please enter your real legal name. "Test", "Sandbox", or "Mock" names are not allowed.');
      return;
    }
    if (!kycForm.dateOfBirth) {
      s.showToast('Please select your date of birth.');
      return;
    }
    const birthDate = new Date(kycForm.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 18 || age > 100) {
      s.showToast('Please ensure that the date range is between 18 - 100 years from the current year.');
      return;
    }
    if (!kycForm.nationality?.trim()) {
      s.showToast('Please enter your nationality.');
      return;
    }
    const countryPattern = /^[a-zA-Z]{2}$/;
    if (!countryPattern.test(kycForm.nationality.trim())) {
      s.showToast('Please enter your 2-letter ISO country code for Nationality (e.g. KR, US).');
      return;
    }
    if (!kycForm.country?.trim()) {
      s.showToast('Please enter your country.');
      return;
    }
    if (!countryPattern.test(kycForm.country.trim())) {
      s.showToast('Please enter your 2-letter ISO country code for Country of Residence (e.g. KR, US).');
      return;
    }
    if (!kycForm.state?.trim()) {
      s.showToast('Please enter your state or region.');
      return;
    }
    if (!/^[a-zA-Z0-9\s-]+$/.test(kycForm.state.trim())) {
      s.showToast('State/Region only supports English alphabets, numbers, hyphens(-), and spaces. Special characters (,.#/) are not allowed.');
      return;
    }
    if (!kycForm.city?.trim()) {
      s.showToast('Please enter your city.');
      return;
    }
    if (!/^[a-zA-Z0-9\s-]+$/.test(kycForm.city.trim())) {
      s.showToast('City only supports English alphabets, numbers, hyphens(-), and spaces. Special characters (,.#/) are not allowed.');
      return;
    }
    if (!kycForm.addressLine1?.trim()) {
      s.showToast('Please enter your address.');
      return;
    }
    if (!/^[a-zA-Z0-9\s-]+$/.test(kycForm.addressLine1.trim())) {
      s.showToast('Street Address only supports English alphabets, numbers, hyphens(-), and spaces. Special characters (,.#/) are not allowed.');
      return;
    }
    if (!kycForm.postalCode?.trim()) {
      s.showToast('Please enter your postal code.');
      return;
    }
    if (!kycForm.idDocType) {
      s.showToast('Please select an ID document type.');
      return;
    }
    const idDocNumber = String(kycForm.idDocNumber || '').trim();
    if (!idDocNumber) {
      s.showToast('Please enter your ID document number.');
      return;
    }
    if (!/^[a-zA-Z0-9-]+$/.test(idDocNumber) || idDocNumber.length < 5) {
      s.showToast('Please enter a valid ID document number (minimum 5 alphanumeric characters).');
      return;
    }
    const phoneCountryCode = String(kycForm.phoneCountryCode || '').trim();
    const phoneNumber = String(kycForm.phoneNumber || '').trim();
    if (!phoneCountryCode || !phoneNumber) {
      s.showToast('Please enter your phone number.');
      return;
    }
    const phoneDigits = phoneNumber.replace(/[^\d]/g, '');
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      s.showToast('Please enter a valid phone number (7 to 15 digits).');
      return;
    }
    if (isHttpApi && !kycForm.idFrontFile && !kycForm.idFrontId) {
      s.showToast('Please upload the front image of your ID document.');
      return;
    }
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
    } catch (err) {
      const fallbackMsg = 'Verification failed. Please check your input fields and try again.';
      const errMsg = err?.message || err?.response?.data?.message || fallbackMsg;
      if ((errMsg.includes('Exception') || errMsg.includes('java.') || errMsg.length > 120) && !errMsg.toLowerCase().includes('size')) {
        s.showToast(fallbackMsg);
      } else {
        s.showToast(errMsg);
      }
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
            <div className="capply-form__row">
              <FormField label="First name (English)">
                <input className="capply-input" value={kycForm.firstName} onChange={(e) => setKyc('firstName', e.target.value)} placeholder="e.g. Gildong" />
              </FormField>
              <FormField label="Last name (English)">
                <input className="capply-input" value={kycForm.lastName} onChange={(e) => setKyc('lastName', e.target.value)} placeholder="e.g. Hong" />
              </FormField>
            </div>
            <div className="capply-form__row">
              <FormField label="Date of birth">
                <input className="capply-input" type="date" value={kycForm.dateOfBirth} onChange={(e) => setKyc('dateOfBirth', e.target.value)} />
              </FormField>
              <FormField label="Gender">
                <select className="capply-input" value={kycForm.gender} onChange={(e) => setKyc('gender', e.target.value)}>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </FormField>
            </div>
            <div className="capply-form__row">
              <FormField label="Nationality">
                <select className="capply-input" value={kycForm.nationality} onChange={(e) => setKyc('nationality', e.target.value)}>
                  {C.KYC_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
              </FormField>
              <FormField label="Country of Residence">
                <select className="capply-input" value={kycForm.country} onChange={(e) => setKyc('country', e.target.value)}>
                  {C.KYC_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
              </FormField>
            </div>
            <div className="capply-form__row">
              <FormField label="State / Region">
                <input className="capply-input" value={kycForm.state} onChange={(e) => handleAddressChange('state', e.target.value)} placeholder="e.g. Seoul" />
              </FormField>
              <FormField label="City">
                <input className="capply-input" value={kycForm.city} onChange={(e) => handleAddressChange('city', e.target.value)} placeholder="e.g. Gangnam-gu" />
              </FormField>
            </div>
            <div className="capply-form__row">
              <FormField label="Street Address">
                <input className="capply-input" value={kycForm.addressLine1} onChange={(e) => handleAddressChange('addressLine1', e.target.value)} placeholder="e.g. Gangnam-daero 123" />
              </FormField>
              <FormField label="Postal Code">
                <input className="capply-input" value={kycForm.postalCode} onChange={(e) => setKyc('postalCode', e.target.value)} placeholder="e.g. 06123" />
              </FormField>
            </div>
            <FormField label="Annual Salary">
              <select className="capply-input" value={kycForm.annualSalary} onChange={(e) => setKyc('annualSalary', e.target.value)}>
                <option value="10000 USD">Under 10,000 USD</option>
                <option value="30000 USD">10,000 - 30,000 USD</option>
                <option value="50000 USD">30,000 - 50,000 USD</option>
                <option value="100000 USD">50,000 - 100,000 USD</option>
                <option value="200000 USD">Over 100,000 USD</option>
              </select>
            </FormField>
            <div className="capply-form__row">
              <FormField label="Purpose of Account">
                <select className="capply-input" value={kycForm.accountPurpose} onChange={(e) => setKyc('accountPurpose', e.target.value)}>
                  <option value="Living Expense">Living Expense</option>
                  <option value="Savings">Savings</option>
                  <option value="Investment">Investment</option>
                  <option value="Business">Business</option>
                </select>
              </FormField>
              <FormField label="Expected Monthly Volume">
                <select className="capply-input" value={kycForm.expectedMonthlyVolume} onChange={(e) => setKyc('expectedMonthlyVolume', e.target.value)}>
                  <option value="1000 USD">Under 1,000 USD</option>
                  <option value="5000 USD">1,000 - 5,000 USD</option>
                  <option value="10000 USD">5,000 - 10,000 USD</option>
                  <option value="50000 USD">Over 10,000 USD</option>
                </select>
              </FormField>
            </div>
            <FormField label="ID document type">
              <select className="capply-input" value={kycForm.idDocType} onChange={(e) => setKyc('idDocType', e.target.value)}>
                {C.ID_DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </FormField>
            <FormField label="ID document number">
              <input className="capply-input" value={kycForm.idDocNumber} onChange={(e) => setKyc('idDocNumber', e.target.value)} />
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
              onChange={(file) => {
                if (file && file.size > 2 * 1024 * 1024) {
                  s.showToast('Image is larger than 2MB. We will automatically compress it upon submission.');
                }
                setKyc('idFrontFile', file);
              }}
            />
            <KycDocField
              label="ID document back (optional)"
              facing="environment"
              file={kycForm.idBackFile}
              onChange={(file) => {
                if (file && file.size > 2 * 1024 * 1024) {
                  s.showToast('Image is larger than 2MB. We will automatically compress it upon submission.');
                }
                setKyc('idBackFile', file);
              }}
            />
            <KycDocField
              label="Selfie (optional)"
              facing="user"
              accept="image/jpeg,image/png,image/webp"
              file={kycForm.selfieFile}
              onChange={(file) => {
                if (file && file.size > 2 * 1024 * 1024) {
                  s.showToast('Image is larger than 2MB. We will automatically compress it upon submission.');
                }
                setKyc('selfieFile', file);
              }}
            />
          </div>
        </>
      )}

      <StickyFoot
        secondaryLabel="Cancel"
        primaryLabel={showForm ? 'Verify Identity' : 'Back to Home'}
        primaryDisabled={kycSubmitting}
        onSecondary={goHome}
        onPrimary={showForm ? handleVerify : goHome}
        loading={kycSubmitting}
      />
    </div>
  );
}
