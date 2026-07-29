/**
 * Proposed signup password policy:
 * 8–16 characters, including a lowercase letter, a number, and a special character.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 16;

/** Allowed special characters for the proposed policy. */
export const PASSWORD_SPECIAL_CHARS = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~\\';

const LOWERCASE_RE = /[a-z]/;
const DIGIT_RE = /\d/;
const SPECIAL_RE = /[^A-Za-z0-9]/

export const PASSWORD_POLICY_HINT =
  '8–16 characters with a lowercase letter, a number, and a special character.';

export type PasswordPolicyResult =
  | { ok: true }
  | { ok: false; code: 'PASSWORD_REQUIRED' | 'PASSWORD_POLICY' };

export function passwordPolicyOk(password: string): boolean {
  const value = String(password ?? '');
  if (value.length < PASSWORD_MIN_LENGTH || value.length > PASSWORD_MAX_LENGTH) {
    return false;
  }
  return LOWERCASE_RE.test(value) && DIGIT_RE.test(value) && SPECIAL_RE.test(value);
}

export function validatePasswordPolicy(password: string): PasswordPolicyResult {
  const value = String(password ?? '');
  if (!value) return { ok: false, code: 'PASSWORD_REQUIRED' };
  if (!passwordPolicyOk(value)) return { ok: false, code: 'PASSWORD_POLICY' };
  return { ok: true };
}
