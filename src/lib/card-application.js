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

export const ID_DOC_TYPES = ['Passport', 'National ID', "Driver's License"];

/** Map UI ID labels → Wasabi / backend idType (PASSPORT | ID_CARD). */
export function mapWasabiIdType(idDocType) {
  const t = String(idDocType || '').toLowerCase();
  if (t.includes('passport')) return 'PASSPORT';
  return 'ID_CARD';
}

/** Shown on KYC gate — passport or English DL only (director policy). */
export const KYC_IDENTITY_NOTICE = {
  title: 'KYC Identity Verification Notice',
  body:
    "We will only accept applications submitted with a passport or a driver's license in English. "
    + '(National ID cards will not be accepted if issued in a local language — e.g., Chinese, Korean, Japanese, Thai, etc.)',
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
  const map = {
    pending: 'pending',
    under_review: 'under_review',
    approved: 'approved',
    rejected: 'rejected',
  };
  return map[kycStatus] ?? 'not_started';
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

export const EMPTY_KYC_FORM = {
  fullName: '',
  dateOfBirth: '',
  nationality: '',
  idDocType: 'Passport',
  idDocNumber: '',
  phoneCountryCode: '+1',
  phoneNumber: '',
  idFrontFile: null,
  idBackFile: null,
  selfieFile: null,
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
    form.fullName?.trim()
    && form.dateOfBirth
    && form.nationality?.trim()
    && form.idDocType
    && form.idDocNumber?.trim()
    && form.phoneCountryCode?.trim()
    && form.phoneNumber?.trim(),
  );
  if (!hasValues) return false;

  const nameOk = /^[a-zA-Z0-9\s.-]+$/.test(form.fullName.trim());
  if (!nameOk) return false;

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
