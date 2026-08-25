// ===== KYC / Identity verification (standalone page) =====

import { useState } from 'react';
import * as C from '../../lib/card-application.js';
import { isHttpApi } from '../../lib/api/config.js';
import { profilePatchFromKycForm } from '../../lib/member-profile.js';
import { KycDocField } from '../../components/kyc-doc-field.jsx';
import { phoneCountryCodeOptions } from '../../lib/phone-country-codes.js';
import { nationalityOptions } from '../../lib/nationality-options.ts';
import { getHttpSession } from '../../lib/api/httpSession.js';

function FormField({ label, children, className = '', htmlFor }) {
  return (
    <label className={`capply-field ${className}`.trim()} htmlFor={htmlFor}>
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

function PhoneCountryCodeSelect({ value, onChange, id = "phoneCountryCode", name = "phoneCountryCode", style }) {
  const options = phoneCountryCodeOptions(value);
  return (
    <select
      id={id}
      name={name}
      style={style}
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

function NationalitySelect({ value, onChange, id = "nationality", name = "nationality", style }) {
  const options = nationalityOptions(value);
  return (
    <select
      id={id}
      name={name}
      style={style}
      className="capply-input capply-input--select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Nationality">
      <option value="" disabled>Select</option>
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
  const [kycForm, setKycForm] = useState(() => {
    const sess = getHttpSession() || {};
    return {
      ...C.EMPTY_KYC_FORM,
      firstName: sess.firstName || '',
      lastName: sess.lastName || '',
      phoneCountryCode: sess.phoneCountryCode || '',
      phoneNumber: sess.phoneNumber || sess.phone || '',
      nationality: sess.nationality || '',
      country: sess.country || '',
    };
  });
  const [kycSubmitting, setKycSubmitting] = useState(false);
  const [kycAwaitingReview, setKycAwaitingReview] = useState(false);
  const [kycRetryOpen, setKycRetryOpen] = useState(false);
  const [errorField, setErrorField] = useState('');

  const focusAndHighlight = (fieldId, message) => {
    if (message) s.showToast(message);
    if (!fieldId) return;
    setErrorField(fieldId);
    window.setTimeout(() => {
      const el = document.getElementById(fieldId) || document.querySelector(`[name="${fieldId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (typeof el.focus === 'function') {
          el.focus({ preventScroll: true });
        } else {
          const btn = el.querySelector('button, input');
          if (btn && typeof btn.focus === 'function') {
            btn.focus({ preventScroll: true });
          }
        }
        if (typeof el.select === 'function' && el.tagName === 'INPUT') {
          try { el.select(); } catch { /* noop */ }
        }
      }
    }, 50);
  };

  const kycStatusForGate = kycAwaitingReview && !s.profileReady
    ? 'under_review'
    : s.accountState?.kycStatus;
  const kycApplyStatus = C.mapKycApplyStatus(kycStatusForGate);

  const blocked = kycApplyStatus === 'under_review';
  const rejected = kycApplyStatus === 'rejected' && !kycRetryOpen;
  const verified = s.profileReady || kycApplyStatus === 'approved';
  const showForm = !blocked && !rejected && !verified;

  const setKyc = (key, val) => {
    setErrorField((cur) => (cur === key ? '' : cur));
    setKycForm((f) => ({ ...f, [key]: val }));
  };

  const handleAddressChange = (key, rawValue) => {
    setErrorField((cur) => (cur === key ? '' : cur));
    const invalidCharPattern = /[^a-zA-Z0-9\s-]/;
    if (invalidCharPattern.test(rawValue)) {
      s.showToast("Address only supports English alphabets, numbers, hyphens(-), and spaces. Special characters (,.#/) and Korean are not allowed.");
    }
    const cleaned = rawValue.replace(/[^a-zA-Z0-9\s-]/g, '');
    setKycForm((f) => ({ ...f, [key]: cleaned }));
  };

  const goHome = () => s.go('home');
  const goRegister = () => s.go('cardRegister');

  const handleVerify = async () => {
    if (kycSubmitting) return;

    const firstName = String(kycForm.firstName || '').trim();
    if (!firstName) {
      focusAndHighlight('firstName', 'Please enter your English first name.');
      return;
    }
    if (firstName.length < 2 || firstName.length > 32) {
      focusAndHighlight('firstName', 'First name must be between 2 and 32 characters.');
      return;
    }
    if (!/^[a-zA-Z\s]+$/.test(firstName)) {
      focusAndHighlight('firstName', 'First name only supports English alphabets and spaces.');
      return;
    }

    const lastName = String(kycForm.lastName || '').trim();
    if (!lastName) {
      focusAndHighlight('lastName', 'Please enter your English last name.');
      return;
    }
    if (lastName.length < 2 || lastName.length > 32) {
      focusAndHighlight('lastName', 'Last name must be between 2 and 32 characters.');
      return;
    }
    if (!/^[a-zA-Z\s]+$/.test(lastName)) {
      focusAndHighlight('lastName', 'Last name only supports English alphabets and spaces.');
      return;
    }

    const totalNameLen = (firstName + " " + lastName).length;
    if (totalNameLen > 32) {
      focusAndHighlight('firstName', 'The combined length of First Name and Last Name cannot exceed 32 characters.');
      return;
    }

    const invalidPattern = /\b(test|sandbox|mock)\b/i;
    if (invalidPattern.test(firstName) || invalidPattern.test(lastName)) {
      focusAndHighlight(invalidPattern.test(firstName) ? 'firstName' : 'lastName', 'Please enter your real legal name. "Test", "Sandbox", or "Mock" names are not allowed.');
      return;
    }

    const rawDob = String(kycForm.dateOfBirth || '').replace(/[^\d]/g, '');
    if (rawDob.length !== 8) {
      focusAndHighlight('dateOfBirth', 'Please enter your date of birth in YYYYMMDD format (8 digits).');
      return;
    }
    const year = parseInt(rawDob.substring(0, 4), 10);
    const month = parseInt(rawDob.substring(4, 6), 10) - 1; // 0-indexed in JS
    const day = parseInt(rawDob.substring(6, 8), 10);
    const birthDate = new Date(year, month, day);
    if (isNaN(birthDate.getTime()) || birthDate.getFullYear() !== year || birthDate.getMonth() !== month || birthDate.getDate() !== day) {
      focusAndHighlight('dateOfBirth', 'Please enter a valid date of birth.');
      return;
    }
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 18 || age > 100) {
      focusAndHighlight('dateOfBirth', 'Please ensure that the date range is between 18 - 100 years from the current year.');
      return;
    }

    if (!kycForm.nationality?.trim()) {
      focusAndHighlight('nationality', 'Please select your nationality.');
      return;
    }
    const countryPattern = /^[a-zA-Z]{2}$/;
    if (!countryPattern.test(kycForm.nationality.trim())) {
      focusAndHighlight('nationality', 'Please select a valid nationality.');
      return;
    }

    if (!kycForm.country?.trim()) {
      focusAndHighlight('country', 'Please select your country of residence.');
      return;
    }
    if (!countryPattern.test(kycForm.country.trim())) {
      focusAndHighlight('country', 'Please select a valid country of residence.');
      return;
    }

    if (!kycForm.state?.trim()) {
      focusAndHighlight('state', 'Please enter your state or region.');
      return;
    }
    if (!/^[a-zA-Z0-9\s-]+$/.test(kycForm.state.trim())) {
      focusAndHighlight('state', 'State/Region only supports English alphabets, numbers, hyphens(-), and spaces.');
      return;
    }

    if (!kycForm.city?.trim()) {
      focusAndHighlight('city', 'Please enter your city.');
      return;
    }
    if (!/^[a-zA-Z0-9\s-]+$/.test(kycForm.city.trim())) {
      focusAndHighlight('city', 'City only supports English alphabets, numbers, hyphens(-), and spaces.');
      return;
    }

    if (!kycForm.addressLine1?.trim()) {
      focusAndHighlight('addressLine1', 'Please enter your address.');
      return;
    }
    const addr = kycForm.addressLine1.trim();
    if (addr.length < 2 || addr.length > 40) {
      focusAndHighlight('addressLine1', 'Address must be between 2 and 40 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9\s-]+$/.test(addr)) {
      focusAndHighlight('addressLine1', 'Street Address only supports English alphabets, numbers, hyphens(-), and spaces.');
      return;
    }

    if (!kycForm.postalCode?.trim()) {
      focusAndHighlight('postalCode', 'Please enter your postal code.');
      return;
    }
    const post = kycForm.postalCode.trim();
    if (post.length < 2 || post.length > 15) {
      focusAndHighlight('postalCode', 'Postal code must be between 2 and 15 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9]+$/.test(post)) {
      focusAndHighlight('postalCode', 'Postal code must contain English letters and numbers only.');
      return;
    }

    if (!kycForm.idDocType) {
      focusAndHighlight('idDocType', 'Please select an ID document type.');
      return;
    }

    const idDocNumber = String(kycForm.idDocNumber || '').trim();
    if (!idDocNumber) {
      focusAndHighlight('idDocNumber', 'Please enter your ID document number.');
      return;
    }
    if (idDocNumber.length < 2 || idDocNumber.length > 50) {
      focusAndHighlight('idDocNumber', 'ID document number must be between 2 and 50 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9-]+$/.test(idDocNumber)) {
      focusAndHighlight('idDocNumber', 'ID document number supports English letters, numbers, and hyphens(-) only.');
      return;
    }

    const rawIssueDate = String(kycForm.issueDate || '').replace(/[^\d]/g, '');
    if (!rawIssueDate) {
      focusAndHighlight('issueDate', 'Please enter your ID document issue date.');
      return;
    }
    if (rawIssueDate.length !== 8) {
      focusAndHighlight('issueDate', 'Please enter your ID document issue date in YYYYMMDD format (8 digits).');
      return;
    }
    const iYear = parseInt(rawIssueDate.substring(0, 4), 10);
    const iMonth = parseInt(rawIssueDate.substring(4, 6), 10) - 1;
    const iDay = parseInt(rawIssueDate.substring(6, 8), 10);
    const issueDateObj = new Date(iYear, iMonth, iDay);
    if (isNaN(issueDateObj.getTime()) || issueDateObj.getFullYear() !== iYear || issueDateObj.getMonth() !== iMonth || issueDateObj.getDate() !== iDay) {
      focusAndHighlight('issueDate', 'Please enter a valid ID document issue date.');
      return;
    }

    const phoneCountryCode = String(kycForm.phoneCountryCode || '').trim();
    const phoneNumber = String(kycForm.phoneNumber || '').trim();
    if (!phoneCountryCode || !phoneNumber) {
      focusAndHighlight(phoneNumber ? 'phoneCountryCode' : 'phoneNumber', 'Please enter your phone number.');
      return;
    }
    if (phoneCountryCode.length < 2 || phoneCountryCode.length > 5) {
      focusAndHighlight('phoneCountryCode', 'Phone country code must be between 2 and 5 characters.');
      return;
    }
    const phoneDigits = phoneNumber.replace(/[^\d]/g, '');
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      focusAndHighlight('phoneNumber', 'Please enter a valid mobile number with 7-15 digits.');
      return;
    }

    if (isHttpApi && !kycForm.idFrontFile && !kycForm.idFrontId) {
      focusAndHighlight('idFrontFile', 'Please upload the front image of your ID document.');
      return;
    }

    if (isHttpApi && !kycForm.selfieFile && !kycForm.selfieId) {
      focusAndHighlight('selfieFile', 'Please upload a selfie photo.');
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
      const lowerMsg = errMsg.toLowerCase();
      if (lowerMsg.includes('phone') || lowerMsg.includes('mobile') || lowerMsg.includes('cell')) focusAndHighlight('phoneNumber');
      else if (lowerMsg.includes('first name') || lowerMsg.includes('firstname')) focusAndHighlight('firstName');
      else if (lowerMsg.includes('last name') || lowerMsg.includes('lastname')) focusAndHighlight('lastName');
      else if (lowerMsg.includes('birth') || lowerMsg.includes('dob')) focusAndHighlight('dateOfBirth');
      else if (lowerMsg.includes('nationality')) focusAndHighlight('nationality');
      else if (lowerMsg.includes('country') || lowerMsg.includes('residence')) focusAndHighlight('country');
      else if (lowerMsg.includes('state') || lowerMsg.includes('region') || lowerMsg.includes('province')) focusAndHighlight('state');
      else if (lowerMsg.includes('city')) focusAndHighlight('city');
      else if (lowerMsg.includes('address') || lowerMsg.includes('street')) focusAndHighlight('addressLine1');
      else if (lowerMsg.includes('postal') || lowerMsg.includes('zip')) focusAndHighlight('postalCode');
      else if (lowerMsg.includes('doc type') || lowerMsg.includes('document type')) focusAndHighlight('idDocType');
      else if (lowerMsg.includes('id document number') || lowerMsg.includes('document number') || lowerMsg.includes('id number') || lowerMsg.includes('id_number') || lowerMsg.includes('id_no') || lowerMsg.includes('doc_no')) focusAndHighlight('idDocNumber');
      else if (lowerMsg.includes('issue date')) focusAndHighlight('issueDate');
      else if (lowerMsg.includes('expir')) focusAndHighlight('idNoExpiryDate');
      else if (lowerMsg.includes('front')) focusAndHighlight('idFrontFile');
      else if (lowerMsg.includes('selfie')) focusAndHighlight('selfieFile');
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
            Your profile is unlocked. You can register your card next.
          </p>
        </div>
        <StickyFoot
          secondaryLabel="Back to Home"
          primaryLabel="Register Card"
          primaryDisabled={false}
          onSecondary={goHome}
          onPrimary={goRegister}
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
              <FormField label="First name (English)" htmlFor="firstName">
                <input id="firstName" name="firstName" className="capply-input" style={errorField === 'firstName' ? { borderColor: '#e53e3e', boxShadow: '0 0 0 2px rgba(229, 62, 62, 0.25)' } : undefined} value={kycForm.firstName} onChange={(e) => setKyc('firstName', e.target.value)} placeholder="e.g. John" />
              </FormField>
              <FormField label="Last name (English)" htmlFor="lastName">
                <input id="lastName" name="lastName" className="capply-input" style={errorField === 'lastName' ? { borderColor: '#e53e3e', boxShadow: '0 0 0 2px rgba(229, 62, 62, 0.25)' } : undefined} value={kycForm.lastName} onChange={(e) => setKyc('lastName', e.target.value)} placeholder="e.g. Smith" />
              </FormField>
            </div>
            <div className="capply-form__row">
              <FormField label="Date of birth" htmlFor="dateOfBirth">
                <input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  className="capply-input"
                  style={errorField === 'dateOfBirth' ? { borderColor: '#e53e3e', boxShadow: '0 0 0 2px rgba(229, 62, 62, 0.25)' } : undefined}
                  type="text"
                  maxLength={8}
                  value={kycForm.dateOfBirth}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^\d]/g, '');
                    setKyc('dateOfBirth', val);
                  }}
                  placeholder="yyyymmdd"
                />
              </FormField>
              <FormField label="Gender" htmlFor="gender">
                <select id="gender" name="gender" className="capply-input" style={errorField === 'gender' ? { borderColor: '#e53e3e', boxShadow: '0 0 0 2px rgba(229, 62, 62, 0.25)' } : undefined} value={kycForm.gender} onChange={(e) => setKyc('gender', e.target.value)}>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </FormField>
            </div>
            <div className="capply-form__row">
              <FormField label="Nationality" htmlFor="nationality">
                <select id="nationality" name="nationality" className="capply-input" style={errorField === 'nationality' ? { borderColor: '#e53e3e', boxShadow: '0 0 0 2px rgba(229, 62, 62, 0.25)' } : undefined} value={kycForm.nationality} onChange={(e) => setKyc('nationality', e.target.value)}>
                  <option value="">Select Nationality</option>
                  {C.KYC_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
              </FormField>
              <FormField label="Country of Residence" htmlFor="country">
                <select id="country" name="country" className="capply-input" style={errorField === 'country' ? { borderColor: '#e53e3e', boxShadow: '0 0 0 2px rgba(229, 62, 62, 0.25)' } : undefined} value={kycForm.country} onChange={(e) => setKyc('country', e.target.value)}>
                  <option value="">Select Country</option>
                  {C.KYC_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
              </FormField>
            </div>
            <div className="capply-form__row">
              <FormField label="State / Region" htmlFor="state">
                <input id="state" name="state" className="capply-input" style={errorField === 'state' ? { borderColor: '#e53e3e', boxShadow: '0 0 0 2px rgba(229, 62, 62, 0.25)' } : undefined} value={kycForm.state} onChange={(e) => handleAddressChange('state', e.target.value)} placeholder="e.g. California" />
              </FormField>
              <FormField label="City" htmlFor="city">
                <input id="city" name="city" className="capply-input" style={errorField === 'city' ? { borderColor: '#e53e3e', boxShadow: '0 0 0 2px rgba(229, 62, 62, 0.25)' } : undefined} value={kycForm.city} onChange={(e) => handleAddressChange('city', e.target.value)} placeholder="e.g. Los Angeles" />
              </FormField>
            </div>
            <div className="capply-form__row">
              <FormField label="Street Address" htmlFor="addressLine1">
                <input id="addressLine1" name="addressLine1" className="capply-input" style={errorField === 'addressLine1' ? { borderColor: '#e53e3e', boxShadow: '0 0 0 2px rgba(229, 62, 62, 0.25)' } : undefined} value={kycForm.addressLine1} onChange={(e) => handleAddressChange('addressLine1', e.target.value)} placeholder="e.g. 100 Main Street" />
              </FormField>
              <FormField label="Postal Code" htmlFor="postalCode">
                <input id="postalCode" name="postalCode" className="capply-input" style={errorField === 'postalCode' ? { borderColor: '#e53e3e', boxShadow: '0 0 0 2px rgba(229, 62, 62, 0.25)' } : undefined} value={kycForm.postalCode} onChange={(e) => setKyc('postalCode', e.target.value)} placeholder="e.g. 90210" />
              </FormField>
            </div>
            <FormField label="Annual Salary" htmlFor="annualSalary">
              <select id="annualSalary" name="annualSalary" className="capply-input" style={errorField === 'annualSalary' ? { borderColor: '#e53e3e', boxShadow: '0 0 0 2px rgba(229, 62, 62, 0.25)' } : undefined} value={kycForm.annualSalary} onChange={(e) => setKyc('annualSalary', e.target.value)}>
                <option value="10000 USD">Under 10,000 USD</option>
                <option value="30000 USD">10,000 - 30,000 USD</option>
                <option value="50000 USD">30,000 - 50,000 USD</option>
                <option value="100000 USD">50,000 - 100,000 USD</option>
                <option value="200000 USD">Over 100,000 USD</option>
              </select>
            </FormField>
            <div className="capply-form__row">
              <FormField label="Purpose of Account" htmlFor="accountPurpose">
                <select id="accountPurpose" name="accountPurpose" className="capply-input" style={errorField === 'accountPurpose' ? { borderColor: '#e53e3e', boxShadow: '0 0 0 2px rgba(229, 62, 62, 0.25)' } : undefined} value={kycForm.accountPurpose} onChange={(e) => setKyc('accountPurpose', e.target.value)}>
                  <option value="Living Expense">Living Expense</option>
                  <option value="Savings">Savings</option>
                  <option value="Investment">Investment</option>
                  <option value="Business">Business</option>
                </select>
              </FormField>
              <FormField label="Expected Monthly Volume" htmlFor="expectedMonthlyVolume">
                <select id="expectedMonthlyVolume" name="expectedMonthlyVolume" className="capply-input" style={errorField === 'expectedMonthlyVolume' ? { borderColor: '#e53e3e', boxShadow: '0 0 0 2px rgba(229, 62, 62, 0.25)' } : undefined} value={kycForm.expectedMonthlyVolume} onChange={(e) => setKyc('expectedMonthlyVolume', e.target.value)}>
                  <option value="1000 USD">Under 1,000 USD</option>
                  <option value="5000 USD">1,000 - 5,000 USD</option>
                  <option value="10000 USD">5,000 - 10,000 USD</option>
                  <option value="50000 USD">Over 10,000 USD</option>
                </select>
              </FormField>
            </div>
            <div className="capply-form__row">
              <FormField label="ID document type" htmlFor="idDocType">
                <select id="idDocType" name="idDocType" className="capply-input" style={errorField === 'idDocType' ? { borderColor: '#e53e3e', boxShadow: '0 0 0 2px rgba(229, 62, 62, 0.25)' } : undefined} value={kycForm.idDocType} onChange={(e) => setKyc('idDocType', e.target.value)}>
                  {C.ID_DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </FormField>
              <FormField label="ID document number" htmlFor="idDocNumber">
                <input id="idDocNumber" name="idDocNumber" className="capply-input" style={errorField === 'idDocNumber' ? { borderColor: '#e53e3e', boxShadow: '0 0 0 2px rgba(229, 62, 62, 0.25)' } : undefined} value={kycForm.idDocNumber} onChange={(e) => setKyc('idDocNumber', e.target.value)} placeholder="e.g. M12345678" />
              </FormField>
            </div>
            <div className="capply-form__row">
              <FormField label="ID document issue date" htmlFor="issueDate">
                <input
                  id="issueDate"
                  name="issueDate"
                  className="capply-input"
                  style={errorField === 'issueDate' ? { borderColor: '#e53e3e', boxShadow: '0 0 0 2px rgba(229, 62, 62, 0.25)' } : undefined}
                  type="text"
                  maxLength={8}
                  value={kycForm.issueDate}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^\d]/g, '');
                    setKyc('issueDate', val);
                  }}
                  placeholder="YYYYMMDD (e.g. 20220101)"
                />
              </FormField>
              <FormField label="ID document expiry date">
                <input
                  className="capply-input"
                  type="text"
                  maxLength={8}
                  value={kycForm.idNoExpiryDate || ''}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^\d]/g, '');
                    setKyc('idNoExpiryDate', val);
                  }}
                  placeholder="YYYYMMDD (e.g. 20301231)"
                />
              </FormField>
            </div>
            <div className="capply-form__row capply-form__row--phone">
              <FormField label="Country code" htmlFor="phoneCountryCode">
                <PhoneCountryCodeSelect
                  id="phoneCountryCode"
                  name="phoneCountryCode"
                  style={errorField === 'phoneCountryCode' ? { borderColor: '#e53e3e', boxShadow: '0 0 0 2px rgba(229, 62, 62, 0.25)' } : undefined}
                  value={kycForm.phoneCountryCode}
                  onChange={(code) => setKyc('phoneCountryCode', code)}
                />
              </FormField>
              <FormField label="Phone number" htmlFor="phoneNumber">
                <input id="phoneNumber" name="phoneNumber" className="capply-input" style={errorField === 'phoneNumber' ? { borderColor: '#e53e3e', boxShadow: '0 0 0 2px rgba(229, 62, 62, 0.25)' } : undefined} type="tel" value={kycForm.phoneNumber} onChange={(e) => setKyc('phoneNumber', e.target.value)} />
              </FormField>
            </div>
            <p className="capply-doc__lead">
              On mobile you can take a photo or upload a file. On desktop, upload an image file.
            </p>
            <KycDocField
              id="idFrontFile"
              style={errorField === 'idFrontFile' ? { border: '2px solid #e53e3e', borderRadius: '12px' } : undefined}
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
              id="selfieFile"
              style={errorField === 'selfieFile' ? { border: '2px solid #e53e3e', borderRadius: '12px' } : undefined}
              label="Selfie (required)"
              required
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
