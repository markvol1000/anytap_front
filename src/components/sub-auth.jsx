import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon } from '@phosphor-icons/react';
import { Icon } from './ui.jsx';
import { OutlineInput, OutlinePasswordInput } from './outline-field.jsx';
import { emailOk, attemptLogin, attemptSignUp, establishLoginSession, hasMemberSession, setMockSession, sendMockEmailVerification, verifyMockEmailCode, saveSignupPending, loadSignupPending, refreshSignupExpiry, clearSignupPending, formatExpiresRemaining, formatSignupCodeTtl, verifyEmailCode, sendVerificationEmail, ensureAvailableLoginId, saveEmailLoginId, sendForgotPasswordEmail, resetPassword } from '../lib/services/authService.js';

import { checkReferralCode } from '../lib/services/authService.js';
import { API_MODE, isHttpApi } from '../lib/api/config.js';
import { AUTH_ERRORS, SIGNUP_ERRORS, SIGNUP_VERIFY } from '../utils/auth-messages.js';
import { useAuthToast } from '../hooks/useAuthToast.js';
import { englishFormProps, englishFieldProps, handleEnglishSubmit } from '../utils/formValidation.js';
import { checkPasswordRules, passwordPolicyOk } from '../lib/password-policy.ts';

const AUTH_PW_ICON = 22;

export function PasswordRequirementsChecklist({ password = '' }) {
  const rules = checkPasswordRules(password);
  const items = [
    { label: '8–64 characters', valid: rules.minMaxLen },
    { label: 'Uppercase letter (A–Z)', valid: rules.hasUppercase },
    { label: 'Lowercase letter (a–z)', valid: rules.hasLowercase },
    { label: 'Number (0–9)', valid: rules.hasNumber },
    { label: 'Special character (!@#$%^&*)', valid: rules.hasSpecial },
  ];

  return (
    <div
      className="pw-checklist"
      style={{
        marginTop: '8px',
        marginBottom: '8px',
        padding: '10px 12px',
        backgroundColor: 'rgba(248, 250, 252, 0.8)',
        borderRadius: '8px',
        border: '1px solid rgba(226, 232, 240, 0.8)',
        fontSize: '12px',
        textAlign: 'left',
      }}
    >
      <div style={{ fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
        Password Requirements:
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 10px' }}>
        {items.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '13px', color: item.valid ? '#16A34A' : '#94A3B8' }}>
              {item.valid ? '✓' : '○'}
            </span>
            <span style={{ color: item.valid ? '#1E293B' : '#64748B', fontWeight: item.valid ? 500 : 400 }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuthPasswordToggleIcon({ visible }) {
  const props = { size: AUTH_PW_ICON, weight: 'light', 'aria-hidden': true };
  return visible ? <EyeIcon {...props} /> : <EyeSlashIcon {...props} />;
}

function OutlinePasswordInputAuth(props) {
  return (
    <OutlinePasswordInput
      {...props}
      ToggleIcon={({ visible }) => <AuthPasswordToggleIcon visible={visible} />}
    />
  );
}

function AuthToast({ msg }) {
  if (!msg) return null;
  return (
    <div className="auth-toast" role="alert" aria-live="assertive">
      {msg}
    </div>
  );
}

function AuthDevModeBadge() {
  if (!import.meta.env.DEV) return null;
  const label = isHttpApi ? 'HTTP API' : 'Mock (local only)';
  return (
    <p className="auth-dev-mode" aria-label={`API mode: ${label}`}>
      Dev · {label}
    </p>
  );
}

function applyAuthError(code, { showToast, setFieldHint, setErrorFields }) {
  const err = AUTH_ERRORS[code];
  if (!err) return;
  if (err.toast) showToast(err.toast);
  setFieldHint(err.hint || '');
  setErrorFields({
    email: err.fields.includes('email'),
    password: err.fields.includes('password'),
  });
}

function applySignupError(code, { showToast, setHints, setErrors }) {
  const err = AUTH_ERRORS[code];
  if (!err) {
    showToast('Sign up failed. Please try again.');
    return;
  }
  if (err.toast) showToast(err.toast);
  const nextHints = { email: '', password: '', passwordConfirm: '', agree: '' };
  const nextErrors = { email: false, password: false, passwordConfirm: false, agree: false };
  if (err.fields.includes('email')) {
    nextHints.email = err.hint || '';
    nextErrors.email = true;
  }
  if (err.fields.includes('password')) {
    nextHints.password = err.hint || '';
    nextErrors.password = true;
  }
  setHints(nextHints);
  setErrors(nextErrors);
}

// ─────────────── Login ───────────────
function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [fieldHint, setFieldHint] = useState('');
  const [errorFields, setErrorFields] = useState({ email: false, password: false });
  const { toast, showToast, clearToast } = useAuthToast();

  const showEmailHint = errorFields.email && fieldHint;
  const showPasswordHint = errorFields.password && fieldHint && !errorFields.email;

  const clearErrors = () => {
    setFieldHint('');
    setErrorFields({ email: false, password: false });
    clearToast();
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const prefill = String(params.get('email') || '').trim();
    if (prefill) setEmail(prefill);
  }, [location.search]);

  useEffect(() => {
    if (hasMemberSession()) {
      navigate('/account', { replace: true });
    }
  }, [navigate]);

  const onLogin = async () => {
    const result = await Promise.resolve(attemptLogin(email, password));
    if (result.ok) {
      clearErrors();
      establishLoginSession(email);
      if (!hasMemberSession()) {
        showToast('Could not save your session. Check browser privacy settings and try again.');
        return;
      }
      const from = location.state?.from;
      navigate(typeof from === 'string' && from.startsWith('/account') ? from : '/account', { replace: true });
      return;
    }
    applyAuthError(result.code, { showToast, setFieldHint, setErrorFields });
  };

  return (
    <section className="login-screen">
      <AuthToast msg={toast} />
      <AuthDevModeBadge />
      <div className="shell login-screen__inner">
        <h1 className="login-screen__title">Sign In</h1>
        <p className="login-screen__lede">
          Sign in with your email and password.
        </p>
        <form
          className="login-screen__form"
          {...englishFormProps}
          onSubmit={(e) => {
            e.preventDefault();
            onLogin();
          }}>
          <div className="login-screen__field">
            <OutlineInput
              label="Email"
              name="email"
              type="email"
              inputMode="email"
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
              value={email}
              filled={email.length > 0}
              error={errorFields.email}
              onChange={(e) => { setEmail(e.target.value); clearErrors(); }}
              autoComplete="email"
              required
              maxLength={255}
            />
            {showEmailHint && (
              <p className="login-screen__hint">{fieldHint}</p>
            )}
          </div>
          <div className="login-screen__field">
            <OutlinePasswordInputAuth
              label="Password"
              value={password}
              visible={showPw}
              error={errorFields.password}
              onToggle={() => setShowPw((v) => !v)}
              onChange={(e) => { setPassword(e.target.value); clearErrors(); }}
              autoComplete="current-password"
              required
            />
            {showPasswordHint && (
              <p className="login-screen__hint">{fieldHint}</p>
            )}
          </div>
          <Link to="/forgot-password" className="login-screen__forgot">Forgot password?</Link>
          <button type="submit" className="btn btn--primary btn--lg login-screen__submit">
            Log in <Icon name="arrowRight" size={16} />
          </button>
        </form>
        <p className="login-screen__alt">
          Not a member yet? <Link to="/sign-up">Sign up</Link>
        </p>
      </div>
    </section>
  );
}

function OtpInput({ value, onChange, length = 6 }) {
  const refs = useRef([]);

  const setDigit = (index, digit) => {
    const chars = value.split('');
    while (chars.length < length) chars.push('');
    chars[index] = digit;
    const next = chars.join('').slice(0, length);
    onChange(next);
    if (digit && index < length - 1) refs.current[index + 1]?.focus();
  };

  return (
    <div className="verify-otp" role="group" aria-label="Verification code">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          className="verify-otp__box"
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={value[i] || ''}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => setDigit(i, e.target.value.replace(/\D/g, '').slice(-1))}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !value[i] && i > 0) refs.current[i - 1]?.focus();
          }}
          onPaste={(e) => {
            e.preventDefault();
            const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
            if (!pasted) return;
            onChange(pasted);
            refs.current[Math.min(pasted.length, length - 1)]?.focus();
          }}
        />
      ))}
    </div>
  );
}

function SignUpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const signupDraft = location.state?.signupDraft;
  const [email, setEmail] = useState(signupDraft?.email ?? '');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [referral, setReferral] = useState(signupDraft?.referral ?? '');
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [agree, setAgree] = useState(false);
  const [hints, setHints] = useState({ email: '', password: '', passwordConfirm: '', agree: '' });
  const [errors, setErrors] = useState({ email: false, password: false, passwordConfirm: false, agree: false });
  const { toast, showToast, clearToast } = useAuthToast();

  const emailLiveInvalid = email.length > 0 && !emailOk(email);
  const pwLiveMismatch = password2.length > 0 && password !== password2;

  const clearSignupErrors = () => {
    setHints({ email: '', password: '', passwordConfirm: '', agree: '' });
    setErrors({ email: false, password: false, passwordConfirm: false, agree: false });
    clearToast();
  };

  const validateSignup = (fd) => {
    const emailVal = String(fd.get('email') ?? '').trim();
    const passwordVal = String(fd.get('password') ?? '');
    const password2Val = String(fd.get('passwordConfirm') ?? '');
    const agreeChecked = fd.get('agree') === 'on';
    const nextHints = { email: '', password: '', passwordConfirm: '', agree: '' };
    const nextErrors = { email: false, password: false, passwordConfirm: false, agree: false };
    let valid = true;

    if (!emailVal) {
      nextHints.email = SIGNUP_ERRORS.EMAIL_REQUIRED.hint;
      nextErrors.email = true;
      valid = false;
    } else if (!emailOk(emailVal)) {
      nextHints.email = AUTH_ERRORS.INVALID_EMAIL.hint;
      nextErrors.email = true;
      valid = false;
    }

    if (!passwordVal) {
      nextHints.password = SIGNUP_ERRORS.PASSWORD_REQUIRED.hint;
      nextErrors.password = true;
      valid = false;
    } else if (!passwordPolicyOk(passwordVal)) {
      nextHints.password = SIGNUP_ERRORS.PASSWORD_SHORT.hint;
      nextErrors.password = true;
      valid = false;
    }

    if (!password2Val) {
      nextHints.passwordConfirm = SIGNUP_ERRORS.PASSWORD_CONFIRM_REQUIRED.hint;
      nextErrors.passwordConfirm = true;
      valid = false;
    } else if (passwordVal !== password2Val) {
      nextHints.passwordConfirm = SIGNUP_ERRORS.PASSWORD_MISMATCH.hint;
      nextErrors.passwordConfirm = true;
      valid = false;
    }

    if (!agreeChecked) {
      nextHints.agree = SIGNUP_ERRORS.AGREE_REQUIRED.hint;
      nextErrors.agree = true;
      valid = false;
    }

    return {
      valid,
      emailVal,
      passwordVal,
      password2Val,
      referralVal: String(fd.get('referral') ?? '').trim().toUpperCase(),
      nextHints,
      nextErrors,
    };
  };

  const showEmailHint = emailLiveInvalid || (errors.email && hints.email);
  const showPasswordHint = errors.password && hints.password;
  const showPasswordConfirmHint = pwLiveMismatch || (errors.passwordConfirm && hints.passwordConfirm);
  const passwordConfirmHint = pwLiveMismatch
    ? SIGNUP_ERRORS.PASSWORD_MISMATCH.hint
    : hints.passwordConfirm;

  const [referralPromptOpen, setReferralPromptOpen] = useState(false);
  const [pendingFormResult, setPendingFormResult] = useState(null);

  const proceedSubmit = async (result, ignoreReferral = false) => {
    clearSignupErrors();
    const finalReferral = ignoreReferral ? '' : result.referralVal;

    if (isHttpApi) {
      const loginIdVal = result.emailVal;
      saveEmailLoginId(result.emailVal, loginIdVal);
      const sent = await sendVerificationEmail({
        email: result.emailVal,
        password: result.passwordVal,
        loginId: loginIdVal,
        referral: finalReferral,
      });
      if (!sent.ok) {
        applySignupError(sent.code, { showToast, setHints, setErrors });
        return;
      }
      const payload = saveSignupPending({
        email: result.emailVal,
        password: result.passwordVal,
        loginId: loginIdVal,
        referral: finalReferral,
      });
      showToast(SIGNUP_VERIFY.CODE_SENT);
      navigate('/sign-up/verify', { state: { signupPending: payload } });
      return;
    }

    sendMockEmailVerification(result.emailVal);
    const payload = saveSignupPending({ email: result.emailVal, referral: finalReferral });
    navigate('/sign-up/verify', { state: { signupPending: payload } });
  };

  return (
    <section className="login-screen login-screen--signup">
      <AuthToast msg={toast} />
      <AuthDevModeBadge />
      <div className="shell login-screen__inner">
        <h1 className="login-screen__title">Create Your Account</h1>
        <p className="login-screen__lede">Create your account and get your crypto card.</p>
        <form
          className="login-screen__form"
          noValidate
          lang="en"
          onSubmit={async (e) => {
            e.preventDefault();
            const result = validateSignup(new FormData(e.currentTarget));
            if (!result.valid) {
              setHints(result.nextHints);
              setErrors(result.nextErrors);
              showToast(SIGNUP_ERRORS.INCOMPLETE.toast);
              return;
            }
            const referralCode = String(referral || result.referralVal || '').trim().toUpperCase();
            if (referralCode) {
              const exists = await checkReferralCode(referralCode);
              if (exists) {
                proceedSubmit({ ...result, referralVal: referralCode }, false);
                return;
              }
            }
            setPendingFormResult({ ...result, referralVal: '' });
            setReferralPromptOpen(true);
          }}>
          <div className="login-screen__field">
            <OutlineInput
              label="Email Address"
              name="email"
              type="email"
              value={email}
              filled={email.length > 0}
              error={errors.email || emailLiveInvalid}
              onChange={(e) => { setEmail(e.target.value); clearSignupErrors(); }}
              autoComplete="email"
              required
              maxLength={255}
            />
            {showEmailHint && (
              <p className="login-screen__hint">
                {emailLiveInvalid ? AUTH_ERRORS.INVALID_EMAIL.hint : hints.email}
              </p>
            )}
          </div>
          <div className="login-screen__field">
            <OutlinePasswordInputAuth
              label="Password"
              name="password"
              value={password}
              visible={showPw}
              error={errors.password}
              onToggle={() => setShowPw((v) => !v)}
              onChange={(e) => { setPassword(e.target.value); clearSignupErrors(); }}
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={64}
            />
            <PasswordRequirementsChecklist password={password} />
            {showPasswordHint && (
              <p className="login-screen__hint">{hints.password}</p>
            )}
          </div>
          <div className="login-screen__field">
            <OutlinePasswordInputAuth
              label="Confirm Password"
              name="passwordConfirm"
              value={password2}
              visible={showPw2}
              error={errors.passwordConfirm || pwLiveMismatch}
              onToggle={() => setShowPw2((v) => !v)}
              onChange={(e) => { setPassword2(e.target.value); clearSignupErrors(); }}
              autoComplete="new-password"
              required
            />
            {showPasswordConfirmHint && (
              <p className="login-screen__hint">{passwordConfirmHint}</p>
            )}
          </div>
          <OutlineInput
            label="Referral Code (Optional)"
            name="referral"
            value={referral}
            filled={referral.length > 0}
            onChange={(e) => setReferral(e.target.value.toUpperCase())}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
          />
          <div className="login-screen__field">
            <label className={`login-screen__agree${errors.agree ? ' login-screen__agree--error' : ''}`}>
              <input
                type="checkbox"
                name="agree"
                {...englishFieldProps}
                checked={agree}
                onChange={(e) => { setAgree(e.target.checked); clearSignupErrors(); }}
                required
              />
              <span>
                I agree to the <Link to="/terms">Terms of Service</Link>
                {' '}&amp;{' '}
                <Link to="/privacy">Privacy Policy</Link>
              </span>
            </label>
            {errors.agree && hints.agree && (
              <p className="login-screen__hint">{hints.agree}</p>
            )}
          </div>
          <button type="submit" className="btn btn--accent btn--lg login-screen__submit">
            Create Account
          </button>
        </form>
        <p className="login-screen__alt">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>

      {referralPromptOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', padding: '16px' }}>
          <div style={{ background: '#ffffff', maxWidth: '420px', width: '100%', padding: '24px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                {referral ? 'Invalid Referral Code' : 'No Referral Code'}
              </h3>
              <button type="button" onClick={() => setReferralPromptOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#64748b' }} aria-label="Close">
                <Icon name="close" size={18} />
              </button>
            </div>
            <p style={{ fontSize: '14px', color: '#475569', marginTop: 0, marginBottom: '24px', lineHeight: 1.5 }}>
              {referral
                ? `The referral code "${referral}" could not be found. Would you like to proceed with account creation without saving this code?`
                : "You haven't entered a referral code. Do you want to proceed with account creation without a referral code?"}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="portal-btn-secondary"
                style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', cursor: 'pointer' }}
                onClick={() => setReferralPromptOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="portal-btn-primary"
                style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, background: '#FF5500', color: '#ffffff', border: 'none', cursor: 'pointer' }}
                onClick={() => {
                  setReferralPromptOpen(false);
                  if (pendingFormResult) {
                    proceedSubmit(pendingFormResult, true);
                  }
                }}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function resolveSignupPending(locationState) {
  let pending = loadSignupPending() || locationState?.signupPending || null;
  if (pending && pending.expiresAt <= Date.now()) {
    pending = refreshSignupExpiry() || pending;
  }
  return pending;
}

function SignUpVerifyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [pending, setPending] = useState(() => resolveSignupPending(location.state));
  const [code, setCode] = useState('');
  const [hint, setHint] = useState('');
  const [verifying, setVerifying] = useState(false);
  const verifyLock = useRef(false);
  const [expiresLabel, setExpiresLabel] = useState(() => {
    const initial = resolveSignupPending(location.state);
    return initial ? formatExpiresRemaining(initial.expiresAt) : formatSignupCodeTtl();
  });
  const [resendSec, setResendSec] = useState(0);
  const { toast, showToast } = useAuthToast();

  useEffect(() => {
    if (pending) return;
    const stored = loadSignupPending();
    if (stored) {
      setPending(stored);
      return;
    }
    if (location.state?.signupPending) {
      setPending(location.state.signupPending);
      return;
    }
    navigate('/sign-up', { replace: true });
  }, [pending, navigate, location.state]);

  useEffect(() => {
    if (!pending) return undefined;
    const tick = () => setExpiresLabel(formatExpiresRemaining(pending.expiresAt));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [pending]);

  useEffect(() => {
    if (resendSec <= 0) return undefined;
    const timer = setTimeout(() => setResendSec((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendSec]);

  const canVerify = /^\d{6}$/.test(code);

  const handleResend = async () => {
    if (resendSec > 0 || verifying) return;
    const sent = await Promise.resolve(sendMockEmailVerification(pending.email));
    if (isHttpApi && sent?.ok === false) {
      showToast('Could not resend verification email.');
      return;
    }
    const next = refreshSignupExpiry();
    if (next) setPending(next);
    setCode('');
    setHint('');
    setResendSec(60);
    showToast(SIGNUP_VERIFY.CODE_SENT);
  };

  const handleVerify = async () => {
    if (!canVerify || !pending || verifying || verifyLock.current) return;
    verifyLock.current = true;
    setVerifying(true);
    setHint('');

    try {
      if (isHttpApi) {
        if (!pending.password || !pending.loginId) {
          showToast('Sign-up session expired. Please start again.');
          navigate('/sign-up', { replace: true });
          return;
        }
        const verified = await verifyEmailCode(pending.email, code);
        if (!verified.ok) {
          setHint(SIGNUP_VERIFY.INVALID_CODE);
          return;
        }
        const signed = await attemptSignUp(pending.email, pending.password, {
          loginId: pending.loginId,
          referral: pending.referral || '',
        });
        if (!signed.ok) {
          const msg = signed.code === 'EMAIL_EXISTS'
            ? 'This email is already registered. Try signing in.'
            : signed.code === 'MISSING'
              ? 'Sign-up session expired. Please start again.'
              : 'Sign up failed. Please try again.';
          showToast(msg);
          if (signed.code === 'EMAIL_EXISTS') {
            navigate(`/login?email=${encodeURIComponent(pending.email)}`, { replace: true });
          }
          return;
        }
        clearSignupPending();
        saveEmailLoginId(pending.email, pending.loginId);
        if (signed.needsLogin || !hasMemberSession()) {
          showToast('Account created. Sign in with the same email and password.');
          navigate(`/login?email=${encodeURIComponent(pending.email)}`, { replace: true });
          return;
        }
        showToast('Welcome! Your account is ready.');
        navigate('/account', { replace: true });
        return;
      }

      if (!verifyMockEmailCode(code)) {
        setHint(SIGNUP_VERIFY.INVALID_CODE);
        return;
      }
      clearSignupPending();
      setMockSession(pending.email);
      navigate('/account');
    } finally {
      verifyLock.current = false;
      setVerifying(false);
    }
  };

  // Auto-continue when all 6 digits are entered.
  useEffect(() => {
    if (!canVerify || verifying || !pending) return undefined;
    const t = window.setTimeout(() => {
      handleVerify();
    }, 120);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per completed code
  }, [canVerify, code]);

  const handleChangeEmail = () => {
    const draft = {
      email: pending.email,
      referral: pending.referral || '',
    };
    clearSignupPending();
    navigate('/sign-up', { state: { signupDraft: draft } });
  };

  if (!pending) return null;

  return (
    <section className="login-screen login-screen--verify">
      <AuthToast msg={toast} />
      <AuthDevModeBadge />
      {import.meta.env.DEV && isHttpApi && (
        <p className="auth-dev-mode" style={{ marginTop: '-8px' }}>
          ALB test code: <strong>123456</strong>
        </p>
      )}
      <div className="shell login-screen__inner">
        <p className="verify-inbox__eyebrow">Email verification</p>
        <h1 className="login-screen__title">Check your inbox</h1>
        <div className="verify-inbox__sent">
          <p className="verify-inbox__sent-msg">We sent a 6-digit code to</p>
          <div className="verify-inbox__email-row">
            <span className="verify-inbox__sent-email">{pending.email}</span>
          </div>
        </div>
        <div className="verify-inbox-card">
          <div className="verify-inbox">
            <div className="verify-inbox__code-head">
              <p className="verify-inbox__label">Enter code</p>
              <p className="verify-inbox__expires" role="timer" aria-live="polite">
                <Icon name="clock" size={15} stroke={2} aria-hidden="true" />
                <span>
                  Expires in <strong className="verify-inbox__expires-time">{expiresLabel}</strong>
                </span>
              </p>
            </div>
            <OtpInput value={code} onChange={(v) => { setCode(v); setHint(''); }} />
            {hint && <p className="login-screen__hint">{hint}</p>}
            <button
              type="button"
              className="btn btn--primary btn--lg login-screen__submit"
              disabled={!canVerify || verifying}
              onClick={handleVerify}>
              {verifying ? 'Verifying…' : 'Verify'}
            </button>
            <p className="verify-inbox__resend">
              Didn&apos;t receive it?{' '}
              <button
                type="button"
                className="verify-inbox__resend-btn"
                onClick={handleResend}
                disabled={resendSec > 0 || verifying}>
                {resendSec > 0 ? `Resend code in ${resendSec}s` : 'Resend code'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ForgotPasswordPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { toast, showToast } = useAuthToast();

  const handleSendEmail = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email || !emailOk(email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await sendForgotPasswordEmail({ email });
      if (!res.ok) {
        throw new Error(res.message || 'Failed to send verification code.');
      }
      showToast(res.message || 'Verification code sent to your email.');
      setStep(2);
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!code || code.trim().length !== 6) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters long.');
      return;
    }
    if (!passwordPolicyOk(newPassword)) {
      setErrorMsg('Password does not meet the security requirements.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword({ email, code, newPassword });
      if (!res.ok) {
        throw new Error(res.message || 'Failed to reset password.');
      }
      showToast(res.message || 'Password reset successfully!');
      setStep(3);
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="login-screen">
      <AuthToast msg={toast} />
      <div className="shell login-screen__inner">
        {step === 3 ? (
          <div className="aform-done">
            <div className="aform-done__check"><Icon name="checkCircle" size={42} /></div>
            <h3>Password Reset Complete</h3>
            <p>Your password has been successfully updated. You can now log in with your new password.</p>
            <Link to="/login" className="btn btn--primary btn--lg login-screen__submit">
              Go to Login <Icon name="arrowRight" size={16} />
            </Link>
          </div>
        ) : step === 2 ? (
          <>
            <h1 className="login-screen__headline">
              Reset<br />
              <span className="login-screen__accent">password</span>
            </h1>
            <p className="login-screen__lede">
              Enter the 6-digit code sent to <strong>{email}</strong> and your new password.
            </p>
            {errorMsg && (
              <p className="auth-field-hint auth-field-hint--visible auth-field-hint--global" role="alert" style={{ marginBottom: '12px', color: '#ef4444' }}>
                {errorMsg}
              </p>
            )}
            <form className="login-screen__form" onSubmit={handleResetPassword}>
              <OutlineInput
                label="6-Digit Verification Code"
                type="text"
                value={code}
                filled={code.length > 0}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                required
              />
              <OutlinePasswordInputAuth
                label="New Password"
                value={newPassword}
                filled={newPassword.length > 0}
                showPw={showPw}
                onTogglePw={() => setShowPw((v) => !v)}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <PasswordRequirementsChecklist password={newPassword} />
              <OutlinePasswordInputAuth
                label="Confirm New Password"
                value={confirmPassword}
                filled={confirmPassword.length > 0}
                showPw={showPw}
                onTogglePw={() => setShowPw((v) => !v)}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button type="submit" className="btn btn--primary btn--lg login-screen__submit" disabled={loading}>
                {loading ? 'Resetting...' : 'Set New Password'} <Icon name="arrowRight" size={16} />
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                style={{ marginTop: '8px', width: '100%' }}
                onClick={() => { setStep(1); setErrorMsg(''); }}>
                Back to Change Email
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="login-screen__headline">
              Find<br />
              <span className="login-screen__accent">password</span>
            </h1>
            <p className="login-screen__lede">
              Enter the email address associated with your Anytap account. We&apos;ll send a 6-digit verification code to reset your password.
            </p>
            {errorMsg && (
              <p className="auth-field-hint auth-field-hint--visible auth-field-hint--global" role="alert" style={{ marginBottom: '12px', color: '#ef4444' }}>
                {errorMsg}
              </p>
            )}
            <form className="login-screen__form" onSubmit={handleSendEmail}>
              <OutlineInput
                label="Registered Email"
                type="email"
                value={email}
                filled={email.length > 0}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              <button type="submit" className="btn btn--primary btn--lg login-screen__submit" disabled={loading}>
                {loading ? 'Sending Code...' : 'Send Verification Code'} <Icon name="arrowRight" size={16} />
              </button>
            </form>
            <p className="login-screen__alt">
              Remembered it? <Link to="/login">Back to log in</Link>
            </p>
          </>
        )}
      </div>
    </section>
  );
}

export { LoginPage, SignUpPage, SignUpVerifyPage, ForgotPasswordPage };

