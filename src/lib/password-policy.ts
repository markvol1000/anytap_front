/**
 * Signup password policy:
 * 8–64 characters, including uppercase, lowercase, number, and special character.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;

/** Allowed special characters for the proposed policy. */
export const PASSWORD_SPECIAL_CHARS = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~\\';

const UPPERCASE_RE = /[A-Z]/;
const LOWERCASE_RE = /[a-z]/;
const DIGIT_RE = /\d/;
const SPECIAL_RE = /[^A-Za-z0-9]/;

export const PASSWORD_POLICY_HINT =
  '8–64 characters with uppercase, lowercase, number, and a special character.';

export interface PasswordRulesCheck {
  minMaxLen: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  allValid: boolean;
}

export function checkPasswordRules(password: string): PasswordRulesCheck {
  const value = String(password ?? '');
  const minMaxLen = value.length >= PASSWORD_MIN_LENGTH && value.length <= PASSWORD_MAX_LENGTH;
  const hasUppercase = UPPERCASE_RE.test(value);
  const hasLowercase = LOWERCASE_RE.test(value);
  const hasNumber = DIGIT_RE.test(value);
  const hasSpecial = SPECIAL_RE.test(value);

  return {
    minMaxLen,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecial,
    allValid: minMaxLen && hasUppercase && hasLowercase && hasNumber && hasSpecial,
  };
}

export type PasswordPolicyResult =
  | { ok: true }
  | { ok: false; code: 'PASSWORD_REQUIRED' | 'PASSWORD_POLICY' };

export function passwordPolicyOk(password: string): boolean {
  return checkPasswordRules(password).allValid;
}

export function validatePasswordPolicy(password: string): PasswordPolicyResult {
  const value = String(password ?? '');
  if (!value) return { ok: false, code: 'PASSWORD_REQUIRED' };
  if (!passwordPolicyOk(value)) return { ok: false, code: 'PASSWORD_POLICY' };
  return { ok: true };
}
