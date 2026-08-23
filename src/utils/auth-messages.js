/** Auth copy — toast (global) + field hint (inline). */

export const AUTH_ERRORS = {
  MISSING: {
    toast: 'Please enter your email and password.',
    hint: 'Please enter your email and password.',
    fields: ['email', 'password'],
  },
  INVALID_EMAIL: {
    hint: 'Please enter a valid email address.',
    fields: ['email'],
  },
  INVALID_CREDENTIALS: {
    toast: 'Email or password is incorrect.',
    hint: 'Please check your email and password, then try again.',
    fields: ['email', 'password'],
  },
  INVALID_LOGIN_ID: {
    hint: 'Please enter a valid email address.',
    fields: ['email'],
  },
  NEED_LOGIN_ID: {
    toast: 'Could not sign in with this email. Please try again later.',
    hint: 'Could not sign in with this email. Please try again later.',
    fields: ['email'],
  },
  EMAIL_NOT_VERIFIED: {
    toast: 'Please verify your email before signing in.',
    hint: 'Please verify your email before signing in.',
    fields: ['email'],
  },
  ACCOUNT_LOCKED: {
    toast: 'Account is locked due to failed login attempts. Please reset your password.',
    hint: 'Account is locked. Please reset your password to unlock.',
    fields: ['email', 'password'],
  },
  LOCKED: {
    toast: 'Account is locked. Please reset your password to unlock.',
    hint: 'Account is locked. Please reset your password to unlock.',
    fields: ['email', 'password'],
  },
  SERVER_ERROR: {
    toast: 'Something went wrong. Please try again.',
    hint: 'Something went wrong. Please try again.',
    fields: ['email', 'password'],
  },
  EMAIL_EXISTS: {
    toast: 'This email is already registered. Try signing in instead.',
    hint: 'This email is already registered.',
    fields: ['email'],
  },
  WEAK_PASSWORD: {
    toast: 'Password must be 8–64 characters and contain uppercase, lowercase, number, and special character.',
    hint: 'Must be 8–64 characters with uppercase, lowercase, number, and special character.',
    fields: ['password'],
  },
  RATE_LIMIT: {
    toast: 'Too many attempts. Please wait a moment and try again.',
    hint: 'Too many attempts. Please wait and try again.',
    fields: ['email'],
  },
};

export const SIGNUP_ERRORS = {
  INCOMPLETE: {
    toast: 'Please complete all required fields.',
  },
  EMAIL_REQUIRED: {
    hint: 'Please enter your email address.',
  },
  PASSWORD_REQUIRED: {
    hint: 'Please enter your password.',
  },
  PASSWORD_SHORT: {
    hint: 'Must be 8–64 characters with uppercase, lowercase, number, and special character.',
  },
  PASSWORD_CONFIRM_REQUIRED: {
    hint: 'Please confirm your password.',
  },
  PASSWORD_MISMATCH: {
    hint: 'Passwords do not match.',
  },
  AGREE_REQUIRED: {
    hint: 'Please agree to the Terms of Service and Privacy Policy.',
  },
};

export const SIGNUP_VERIFY = {
  CODE_SENT: 'Verification code sent to your email.',
  INVALID_CODE: 'Invalid verification code.',
  VERIFIED: 'Email verified.',
  SEND_FIRST: 'Please send a verification code first.',
  EXPIRED: 'This code has expired. Please resend a new code.',
};
