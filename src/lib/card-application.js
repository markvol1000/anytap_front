/** Card application policy — Visa only, dummy data (no partner APIs). */

import { CARD_ISSUANCE_FEE, getCardIssuanceFee } from './account-data.js';

export { CARD_ISSUANCE_FEE, getCardIssuanceFee };

export const CARD_APPLY_STEPS = [
  'Choose Card',
  'Details',
  'Review',
  'Complete',
];

/** Show mobile wallet line on virtual card option when true */
export const MOBILE_WALLET_ENABLED = true;

export const CARD_TYPE_OPTIONS = {
  physical: {
    id: 'physical',
    title: 'Physical Card',
    subtitle: 'Visa · Delivered to your door',
    image: '/assets/cards/black_card_bg.png',
    benefits: [
      'Physical delivery',
      'In-store & ATM payments',
      'Delivery address required',
    ],
  },
  virtual: {
    id: 'virtual',
    title: 'Virtual Card',
    subtitle: 'Visa · Instant digital card',
    image: '/assets/cards/white_card_bg.png',
    benefits: [
      'Instant after approval',
      'Online payments worldwide',
      ...(MOBILE_WALLET_ENABLED ? ['Apple Pay & Google Pay'] : []),
    ],
  },
};

export const CARD_BINS = {
  virtual: '493875',
  physical: '493724',
};

/** Official card design per type — not user-selectable */
export const CARD_DESIGN_BY_TYPE = {
  virtual: 'white',
  physical: 'black',
};

export const CARD_TYPE_LABELS = {
  virtual: 'Virtual Visa Card',
  physical: 'Physical Visa Card',
};

export const CARD_DESIGN_LABELS = {
  virtual: 'Official White Visa',
  physical: 'Official Black Visa',
};

export const CARD_PREVIEW_IMAGES = {
  virtual: '/assets/cards/white_card_bg.png',
  physical: '/assets/cards/black_card_bg.png',
};

export function getCardDesign(cardType) {
  return CARD_DESIGN_BY_TYPE[cardType] ?? 'white';
}

export function getCardTypeLabel(cardType) {
  return CARD_TYPE_LABELS[cardType] ?? 'Visa Card';
}

export function getCardDesignLabel(cardType) {
  return CARD_DESIGN_LABELS[cardType] ?? 'Official Visa';
}

export const CARD_COLOR_IMAGES = {
  white: '/assets/cards/white_card_bg.png',
  black: '/assets/cards/black_card_bg.png',
};

export const ID_DOC_TYPES = ['Passport', "Driver's License"];

/** Map UI ID labels → Wasabi / backend idType (PASSPORT | DLN | ID_CARD). */
export function mapWasabiIdType(idDocType) {
  const t = String(idDocType || '').toLowerCase();
  if (t.includes('passport')) return 'PASSPORT';
  if (t.includes('driver')) return 'DLN';
  return 'ID_CARD';
}

/** Shown on KYC gate — passport or English DL only (director policy). */
export const KYC_IDENTITY_NOTICE = {
  title: 'KYC Identity Verification Notice',
  body:
    "We only accept applications submitted with a Passport or a Driver's License in English. (National ID cards are not accepted.)",
};

export const PAYMENT_STATUS = {
  waiting: 'Waiting for payment',
  received: 'Payment received',
  issuing: 'Card issuing',
  issued: 'Issued',
  active: 'Active',
};

export const KYC_APPLY_LABELS = {
  not_started: 'Not started',
  pending: 'Pending',
  under_review: 'Under review',
  approved: 'Approved',
  rejected: 'Rejected',
};

let appSeq = 1042;

export function generateApplicationNumber() {
  appSeq += 1;
  const y = new Date().getFullYear();
  return `AT-${y}-${String(appSeq).padStart(5, '0')}`;
}

export function mapKycApplyStatus(kycStatus) {
  const s = String(kycStatus || '').toLowerCase();
  const map = {
    pending: 'pending',
    under_review: 'under_review',
    approved: 'approved',
    rejected: 'rejected',
    pending_wallet: 'approved',
  };
  return map[s] ?? 'not_started';
}

export function mapPaymentStatusFromCard(cardStatus) {
  const map = {
    not_issued: 'waiting',
    deposit_received: 'received',
    creating: 'issuing',
    issued: 'issued',
    active: 'active',
    shipping: 'active',
    frozen: 'active',
  };
  return map[cardStatus] ?? 'waiting';
}

export function canStartNewApplication(cardLimit) {
  return !cardLimit.atMax;
}

export function getPostSubmitScenario(scenarioKey, kycStatus) {
  if (kycStatus === 'pending' || scenarioKey === 'signupOnly') return 'signupOnly';
  if (kycStatus === 'approved' || scenarioKey === 'kycApproved') return 'cardApplied';
  return 'cardApplied';
}

export function createApplication({
  cardType,
  accountState,
  kycForm,
  shipping,
  reference,
}) {
  const bin = CARD_BINS[cardType];
  const cardColor = getCardDesign(cardType);
  const now = new Date().toISOString();
  return {
    id: `app-${Date.now()}`,
    applicationNumber: reference ?? generateApplicationNumber(),
    cardType,
    cardColor,
    cardNetwork: 'Visa',
    bin,
    kycStatus: mapKycApplyStatus(accountState.kycStatus === 'pending' ? 'under_review' : accountState.kycStatus),
    paymentStatus: 'waiting',
    cardStatus: 'not_issued',
    issuingFee: getCardIssuanceFee(cardType),
    createdAt: now,
    applicantName: accountState.name,
    applicantEmail: accountState.email,
    kycForm: { ...kycForm },
    shipping: cardType === 'physical' ? { ...shipping } : null,
  };
}

export function getScenarioApplication(scenarioKey, accountState) {
  const inProgress = [
    'cardApplied', 'cardShipping', 'cardRegistered', 'cardActiveWithTransactions', 'cardActiveThree',
    'depositReceived', 'cardCreating', 'issued',
  ].includes(scenarioKey)
    || ['application_review', 'deposit_received', 'creating', 'issued', 'shipping'].includes(accountState.cardStatus);

  if (!inProgress && scenarioKey !== 'signupOnly') return null;

  const cardType = accountState.pendingVariant ?? 'physical';
  const paymentStatus = accountState.cardStatus === 'application_review' ? 'paid' : mapPaymentStatusFromCard(accountState.cardStatus);
  const cardStatus = accountState.cardStatus === 'application_review' ? 'under_review' : (accountState.cardStatus === 'creating' ? 'creating' : accountState.cardStatus);

  return {
    id: `app-scenario-${scenarioKey}`,
    applicationNumber: 'AT-2026-01042',
    cardType,
    cardColor: getCardDesign(cardType),
    cardNetwork: 'Visa',
    bin: CARD_BINS[cardType],
    kycStatus: mapKycApplyStatus(accountState.kycStatus),
    paymentStatus,
    cardStatus,
    issuingFee: getCardIssuanceFee(cardType),
    createdAt: '2026-06-20T10:30:00.000Z',
    applicantName: accountState.name,
    applicantEmail: accountState.email,
    kycForm: null,
    shipping: null,
  };
}

export const KYC_COUNTRIES = [
  { code: 'AD', label: 'Andorra' },
  { code: 'AE', label: 'United Arab Emirates' },
  { code: 'AL', label: 'Albania' },
  { code: 'AM', label: 'Armenia' },
  { code: 'AO', label: 'Angola' },
  { code: 'AR', label: 'Argentina' },
  { code: 'AT', label: 'Austria' },
  { code: 'AU', label: 'Australia' },
  { code: 'AZ', label: 'Azerbaijan' },
  { code: 'BA', label: 'Bosnia and Herzegovina' },
  { code: 'BD', label: 'Bangladesh' },
  { code: 'BE', label: 'Belgium' },
  { code: 'BF', label: 'Burkina Faso' },
  { code: 'BG', label: 'Bulgaria' },
  { code: 'BH', label: 'Bahrain' },
  { code: 'BN', label: 'Brunei' },
  { code: 'BO', label: 'Bolivia' },
  { code: 'BR', label: 'Brazil' },
  { code: 'BW', label: 'Botswana' },
  { code: 'CA', label: 'Canada' },
  { code: 'CH', label: 'Switzerland' },
  { code: 'CL', label: 'Chile' },
  { code: 'CN', label: 'China' },
  { code: 'CO', label: 'Colombia' },
  { code: 'CR', label: 'Costa Rica' },
  { code: 'CY', label: 'Cyprus' },
  { code: 'CZ', label: 'Czech Republic' },
  { code: 'DE', label: 'Germany' },
  { code: 'DK', label: 'Denmark' },
  { code: 'DO', label: 'Dominican Republic' },
  { code: 'DZ', label: 'Algeria' },
  { code: 'EC', label: 'Ecuador' },
  { code: 'EE', label: 'Estonia' },
  { code: 'EG', label: 'Egypt' },
  { code: 'ES', label: 'Spain' },
  { code: 'FI', label: 'Finland' },
  { code: 'FJ', label: 'Fiji' },
  { code: 'FR', label: 'France' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'GE', label: 'Georgia' },
  { code: 'GH', label: 'Ghana' },
  { code: 'GR', label: 'Greece' },
  { code: 'GT', label: 'Guatemala' },
  { code: 'HK', label: 'Hong Kong' },
  { code: 'HN', label: 'Honduras' },
  { code: 'HR', label: 'Croatia' },
  { code: 'HU', label: 'Hungary' },
  { code: 'ID', label: 'Indonesia' },
  { code: 'IE', label: 'Ireland' },
  { code: 'IL', label: 'Israel' },
  { code: 'IN', label: 'India' },
  { code: 'IS', label: 'Iceland' },
  { code: 'IT', label: 'Italy' },
  { code: 'JM', label: 'Jamaica' },
  { code: 'JO', label: 'Jordan' },
  { code: 'JP', label: 'Japan' },
  { code: 'KE', label: 'Kenya' },
  { code: 'KG', label: 'Kyrgyzstan' },
  { code: 'KH', label: 'Cambodia' },
  { code: 'KR', label: 'South Korea' },
  { code: 'KW', label: 'Kuwait' },
  { code: 'KZ', label: 'Kazakhstan' },
  { code: 'LA', label: 'Laos' },
  { code: 'LI', label: 'Liechtenstein' },
  { code: 'LK', label: 'Sri Lanka' },
  { code: 'LT', label: 'Lithuania' },
  { code: 'LU', label: 'Luxembourg' },
  { code: 'LV', label: 'Latvia' },
  { code: 'MA', label: 'Morocco' },
  { code: 'MC', label: 'Monaco' },
  { code: 'MD', label: 'Moldova' },
  { code: 'ME', label: 'Montenegro' },
  { code: 'MG', label: 'Madagascar' },
  { code: 'MK', label: 'North Macedonia' },
  { code: 'MN', label: 'Mongolia' },
  { code: 'MO', label: 'Macau' },
  { code: 'MT', label: 'Malta' },
  { code: 'MU', label: 'Mauritius' },
  { code: 'MV', label: 'Maldives' },
  { code: 'MX', label: 'Mexico' },
  { code: 'MY', label: 'Malaysia' },
  { code: 'MZ', label: 'Mozambique' },
  { code: 'NA', label: 'Namibia' },
  { code: 'NG', label: 'Nigeria' },
  { code: 'NL', label: 'Netherlands' },
  { code: 'NO', label: 'Norway' },
  { code: 'NP', label: 'Nepal' },
  { code: 'NZ', label: 'New Zealand' },
  { code: 'OM', label: 'Oman' },
  { code: 'PA', label: 'Panama' },
  { code: 'PE', label: 'Peru' },
  { code: 'PH', label: 'Philippines' },
  { code: 'PK', label: 'Pakistan' },
  { code: 'PL', label: 'Poland' },
  { code: 'PT', label: 'Portugal' },
  { code: 'PY', label: 'Paraguay' },
  { code: 'QA', label: 'Qatar' },
  { code: 'RO', label: 'Romania' },
  { code: 'RS', label: 'Serbia' },
  { code: 'SA', label: 'Saudi Arabia' },
  { code: 'SE', label: 'Sweden' },
  { code: 'SG', label: 'Singapore' },
  { code: 'SI', label: 'Slovenia' },
  { code: 'SK', label: 'Slovakia' },
  { code: 'SM', label: 'San Marino' },
  { code: 'SN', label: 'Senegal' },
  { code: 'SV', label: 'El Salvador' },
  { code: 'TH', label: 'Thailand' },
  { code: 'TN', label: 'Tunisia' },
  { code: 'TR', label: 'Turkey' },
  { code: 'TW', label: 'Taiwan' },
  { code: 'TZ', label: 'Tanzania' },
  { code: 'UA', label: 'Ukraine' },
  { code: 'UG', label: 'Uganda' },
  { code: 'US', label: 'United States' },
  { code: 'UY', label: 'Uruguay' },
  { code: 'UZ', label: 'Uzbekistan' },
  { code: 'VA', label: 'Vatican City' },
  { code: 'VN', label: 'Vietnam' },
  { code: 'ZA', label: 'South Africa' },
  { code: 'ZM', label: 'Zambia' },
].sort((a, b) => a.label.localeCompare(b.label));

export const EMPTY_KYC_FORM = {
  firstName: '',
  lastName: '',
  fullName: '',
  dateOfBirth: '',
  nationality: '',
  idDocType: 'Passport',
  idDocNumber: '',
  phoneCountryCode: '',
  phoneNumber: '',
  idFrontFile: null,
  idBackFile: null,
  selfieFile: null,
  gender: 'M',
  country: '',
  state: '',
  city: '',
  addressLine1: '',
  postalCode: '',
  annualSalary: '50000 USD',
  accountPurpose: 'Living Expense',
  expectedMonthlyVolume: '5000 USD',
};

export const EMPTY_SHIPPING = {
  recipientName: '',
  country: '',
  state: '',
  city: '',
  addressLine1: '',
  addressLine2: '',
  postalCode: '',
  phoneCountryCode: '+1',
  phoneNumber: '',
};

export function isKycFormValid(form, { requireFiles = false } = {}) {
  const hasValues = Boolean(
    form.firstName?.trim()
    && form.lastName?.trim()
    && form.dateOfBirth
    && form.nationality?.trim()
    && form.idDocType
    && form.idDocNumber?.trim()
    && form.phoneCountryCode?.trim()
    && form.phoneNumber?.trim()
    && form.gender
    && form.country?.trim()
    && form.state?.trim()
    && form.city?.trim()
    && form.addressLine1?.trim()
    && form.postalCode?.trim()
    && form.annualSalary
    && form.accountPurpose
    && form.expectedMonthlyVolume,
  );
  if (!hasValues) return false;

  const firstNameOk = /^[a-zA-Z\s.-]+$/.test(form.firstName.trim());
  const lastNameOk = /^[a-zA-Z\s.-]+$/.test(form.lastName.trim());
  if (!firstNameOk || !lastNameOk) return false;

  const phoneDigits = form.phoneNumber.replace(/[^\d]/g, '');
  if (phoneDigits.length < 7 || phoneDigits.length > 15) return false;

  const idNumberOk = /^[a-zA-Z0-9-]+$/.test(form.idDocNumber.trim()) && form.idDocNumber.trim().length >= 5;
  if (!idNumberOk) return false;

  if (!requireFiles) return true;
  return Boolean(form.idFrontFile || form.idFrontId);
}

export function isShippingValid(form) {
  return Boolean(
    form.recipientName?.trim()
    && form.country?.trim()
    && form.city?.trim()
    && form.addressLine1?.trim()
    && form.postalCode?.trim()
    && form.phoneCountryCode?.trim()
    && form.phoneNumber?.trim(),
  );
}

export function canCancelApplication(application) {
  return application?.paymentStatus === 'waiting';
}
