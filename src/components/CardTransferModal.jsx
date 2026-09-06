import { useState, useCallback, useEffect, useRef } from 'react';
import { Icon } from './ui.jsx';
import { CardThumb } from './account-wallet.jsx';
import { isHttpApi } from '../lib/api/config.js';
import * as A from '../lib/account-data.js';

function TransferOtpInput({ value, onChange, length = 6 }) {
  const refs = useRef([]);

  const setDigit = (index, digit) => {
    const chars = (value || '').split('');
    while (chars.length < length) chars.push('');
    chars[index] = digit;
    const next = chars.join('').slice(0, length);
    onChange(next);
    if (digit && index < length - 1) refs.current[index + 1]?.focus();
  };

  return (
    <div className="verify-otp" role="group" aria-label="Verification code" style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
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
          style={{
            flex: 1,
            height: '52px',
            borderRadius: '10px',
            border: '1.5px solid var(--portal-border, rgba(0,0,0,0.12))',
            background: 'var(--paper, #fafafa)',
            fontSize: '22px',
            fontWeight: '700',
            textAlign: 'center',
            color: 'var(--portal-ink, #1a1a1a)',
            outline: 'none',
            transition: 'border-color 0.15s, background 0.15s'
          }}
        />
      ))}
    </div>
  );
}

export function CardTransferModal({ open, onClose, s, sourceCard }) {
  const [step, setStep] = useState(1); // 1: Target Lookup, 2: Amount & 2FA, 3: Success Receipt
  const [targetEmail, setTargetEmail] = useState('');
  const [targetUser, setTargetUser] = useState(null);
  const [selectedDestCard, setSelectedDestCard] = useState('');
  const [grossAmount, setGrossAmount] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeCountdown, setCodeCountdown] = useState(0);
  const [feeRate, setFeeRate] = useState(0.0050);
  const [agreedToNotice, setAgreedToNotice] = useState(false);
  const [receipt, setReceipt] = useState(null);

  // Unconditionally reset all form fields whenever modal opens
  useEffect(() => {
    if (open) {
      setStep(1);
      setTargetEmail('');
      setTargetUser(null);
      setSelectedDestCard('');
      setGrossAmount('');
      setPassword('');
      setVerificationCode('');
      setFeeRate(0.0050);
      setAgreedToNotice(false);
      setLoading(false);
      setSendingCode(false);
      setCodeCountdown(0);
      setReceipt(null);
    }
  }, [open]);

  // Countdown timer for resending email verification code
  useEffect(() => {
    let timer;
    if (codeCountdown > 0) {
      timer = setInterval(() => {
        setCodeCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [codeCountdown]);

  const handleLookup = useCallback(async () => {
    const trimmedInput = (targetEmail || '').trim();
    if (!trimmedInput || trimmedInput.length < 2) {
      s?.showToast?.('Please enter recipient email or ID.');
      return;
    }
    const userId = s?.accountState?.userId;
    if (!userId) {
      s?.showToast?.('User ID not found. Please log in again.');
      return;
    }
    setLoading(true);
    try {
      if (isHttpApi) {
        // 1. Fetch recipient cards by target email or ID
        const checkRes = await fetch(`/api/v1/card/transfer/target-check?email=${encodeURIComponent(trimmedInput)}&identifier=${encodeURIComponent(trimmedInput)}`);
        const checkJson = await checkRes.json();
        if (checkJson?.data) {
          setTargetUser(checkJson.data);
          if (checkJson.data.feeRate != null) {
            setFeeRate(Number(checkJson.data.feeRate));
          }
          // Set first available card or destination card
          const cards = checkJson.data.cards || [];
          const sourceCardId = sourceCard?.cardId || sourceCard?.id || sourceCard?.wasabiCardId;
          const otherCards = cards.filter((c) => c.cardNo !== sourceCardId);
          const defaultCard = otherCards.length > 0 ? otherCards[0] : cards[0];
          if (defaultCard) {
            setSelectedDestCard(defaultCard.cardNo);
          }
        } else {
          s?.showToast?.(checkJson?.message || 'Recipient card lookup failed.');
          return;
        }

        // 2. Automatically send email verification code
        const codeRes = await fetch(`/api/v1/card/transfer/send-code/${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const codeJson = await codeRes.json();
        if (codeJson?.status === 'SUCCESS' || codeJson?.code === 200 || !codeJson?.error) {
          s?.showToast?.('Verification code sent to your registered email.');
          setCodeCountdown(60);
        } else {
          s?.showToast?.(codeJson?.message || 'Failed to send verification code.');
        }

        setStep(2);
      } else {
        // Mock fallback
        setTargetUser({
          userId: userId || 'US523674',
          emailMasked: targetEmail ? (targetEmail.substring(0, 3) + '***@' + targetEmail.split('@')[1]) : 'test***@example.com',
          feeRate: 0.0050,
          cards: [
            { cardNo: 'WC20260806208534530555222222', cardMasked: 'VISA **** 2222', cardType: 'virtual', status: 'active' }
          ]
        });
        setFeeRate(0.0050);
        setSelectedDestCard('WC20260806208534530555222222');
        setCodeCountdown(60);
        s?.showToast?.('Verification code sent to your registered email.');
        setStep(2);
      }
    } catch (err) {
      s?.showToast?.('Failed to proceed: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  }, [targetEmail, sourceCard, s]);

  const grossVal = parseFloat(grossAmount) || 0;
  const feeRatePercent = (feeRate * 100).toFixed(1);
  const feeVal = Math.round(grossVal * feeRate * 100) / 100;
  const totalVal = Math.round((grossVal + feeVal) * 100) / 100;
  const isAmountValid = grossVal >= 30.00;
  const isAmountError = grossAmount !== '' && (!grossVal || grossVal < 30.00);

  const handleSendVerificationCode = useCallback(async () => {
    const userId = s?.accountState?.userId;
    if (!userId) {
      s?.showToast?.('User ID not found. Please log in again.');
      return;
    }
    setSendingCode(true);
    try {
      if (isHttpApi) {
        const res = await fetch(`/api/v1/card/transfer/send-code/${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const json = await res.json();
        if (json?.status === 'SUCCESS' || json?.code === 200 || !json?.error) {
          s?.showToast?.('Verification code sent to your registered email.');
          setCodeCountdown(60);
        } else {
          s?.showToast?.(json?.message || 'Failed to send verification code.');
        }
      } else {
        s?.showToast?.('Mock: Verification code sent to your email.');
        setCodeCountdown(60);
      }
    } catch (err) {
      s?.showToast?.('Failed to send code: ' + (err.message || 'Error'));
    } finally {
      setSendingCode(false);
    }
  }, [s]);

  const handleExecuteTransfer = useCallback(async () => {
    if (!grossVal || grossVal < 30.00) {
      s?.showToast?.('Minimum card-to-card transfer amount is $30.00 USD.');
      return;
    }
    if (!selectedDestCard) {
      s?.showToast?.('Please select a destination card.');
      return;
    }
    if (!verificationCode || verificationCode.trim().length !== 6) {
      s?.showToast?.('Please enter the 6-digit email verification code.');
      return;
    }
    if (!agreedToNotice) {
      s?.showToast?.('Please confirm that you understand this transfer cannot be cancelled.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        sourceCardNo: sourceCard?.cardId || sourceCard?.id || sourceCard?.wasabiCardId || 'WC20260806208534530555111111',
        destinationCardNo: selectedDestCard,
        destinationEmail: targetEmail,
        grossAmount: grossVal,
        password,
        verificationCode: verificationCode.trim()
      };

      if (isHttpApi) {
        const userId = s?.accountState?.userId || 'US523674';
        const res = await fetch(`/api/v1/card/transfer/${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json?.data) {
          setReceipt(json.data);
          setStep(3);
          const primaryKey = sourceCard?.id || sourceCard?.wasabiCardId || sourceCard?.cardNo || sourceCard?.last4;
          if (primaryKey) {
            s?.deductCardBalance?.(primaryKey, totalVal);
          }
          s?.triggerCardTxRefresh?.();
          s?.refresh?.();
          s?.showToast?.('Card transfer completed successfully!');
        } else {
          const rawMsg = json?.message || '';
          const isTechError = !rawMsg || rawMsg.includes('failed: Card') || rawMsg.includes('abnormal') || rawMsg.includes('500') || rawMsg.includes('Error');
          const friendlyMsg = isTechError
            ? 'Your transfer could not be processed. Please contact AnyTap support.'
            : rawMsg;
          s?.showToast?.(friendlyMsg);
        }
      } else {
        // Mock fallback
        setReceipt({
          merchantOrderNo: 'TRANSFER_' + Date.now(),
          sourceCardNo: 'VISA **** ' + (sourceCard?.last4 || '1111'),
          destinationEmail: targetEmail,
          destinationEmailMasked: targetEmail,
          destinationCardNo: 'VISA **** 2222',
          grossAmount: grossVal,
          feeRate: 0.0050,
          feeAmount: feeVal,
          netAmount: totalVal,
          currency: 'USD',
          status: 'SUCCESS',
          completedAt: new Date().toISOString()
        });
        setStep(3);
        const primaryKey = sourceCard?.id || sourceCard?.wasabiCardId || sourceCard?.cardNo || sourceCard?.last4;
        if (primaryKey) {
          s?.deductCardBalance?.(primaryKey, totalVal);
        }
        s?.triggerCardTxRefresh?.();
        s?.refresh?.();
        s?.showToast?.('Card transfer completed successfully!');
      }
    } catch (err) {
      s?.showToast?.('Your transfer could not be processed. Please contact AnyTap support.');
    } finally {
      setLoading(false);
    }
  }, [grossVal, totalVal, selectedDestCard, targetEmail, sourceCard, password, verificationCode, agreedToNotice, targetUser, s]);

  const handleResetClose = useCallback(() => {
    setStep(1);
    setTargetEmail('');
    setTargetUser(null);
    setSelectedDestCard('');
    setGrossAmount('');
    setPassword('');
    setVerificationCode('');
    setCodeCountdown(0);
    setReceipt(null);
    setAgreedToNotice(false);
    setLoading(false);
    onClose?.();
  }, [onClose]);

  if (!open) return null;

  const targetCardId = sourceCard?.cardId || sourceCard?.id || sourceCard?.wasabiCardId || sourceCard?.cardNo;
  const liveCard = s?.userCards?.find((c) => (
    (targetCardId && (c.id === targetCardId || c.cardNo === targetCardId || c.wasabiCardId === targetCardId)) ||
    (sourceCard?.last4 && c.last4 === sourceCard.last4)
  ));
  const cardObj = liveCard || sourceCard || s?.currentCard;
  const rawL4 = String(cardObj?.last4 || cardObj?.realLast4 || cardObj?.cardLast4 || '').trim();
  const validL4 = rawL4 && rawL4.length === 4 && /^\d{4}$/.test(rawL4) ? rawL4 : '5022';
  const last4Str = A.maskCardShort(validL4);
  const rawBal = cardObj?.balance ?? cardObj?.availableUsd ?? s?.cardBalance ?? 390.05;
  const parsedBal = typeof rawBal === 'number' ? rawBal : parseFloat(String(rawBal).replace(/[^0-9.]/g, ''));
  const cardBalStr = Number.isFinite(parsedBal) ? parsedBal.toFixed(2) : '390.05';

  return (
    <div className="portal-sheet" role="dialog" aria-modal="true" aria-label="Card-to-Card Transfer">
      <button type="button" className="portal-sheet__backdrop" onClick={loading ? undefined : handleResetClose} aria-label="Close" />
      <div className="portal-sheet__panel portal-wallet-sheet" style={{ maxWidth: '520px', minHeight: '620px', maxHeight: 'min(98vh, 1050px)', padding: '20px 24px calc(24px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="portal-sheet__head">
          <h3 className="portal-sheet__title">Card-to-Card Transfer</h3>
          <button type="button" className="portal-sheet__close" onClick={loading ? undefined : handleResetClose} disabled={loading} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>

        <p className="portal-wallet-sheet__sub">Instant USD balance transfer between AnyTap cards.</p>

        {cardObj && (
          <div className="portal-wallet-quick-head">
            <CardThumb variant={cardObj.variant} />
            <div>
              <p className="portal-wallet-quick-head__num">{last4Str}</p>
              <p className="portal-wallet-quick-head__bal">Balance: {cardBalStr} USD</p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={{ marginTop: '16px' }}>
            <label className="portal-wallet-field">
              <span className="portal-wallet-field__label">Recipient Email or ID</span>
              <input
                type="text"
                className="portal-wallet-field__input"
                placeholder="Enter recipient email or ID (e.g. user@example.com or login ID)"
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
                autoFocus
              />
            </label>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--portal-muted, #64748b)', lineHeight: '1.4' }}>
              A 6-digit verification code will be sent to your email to verify this transfer.
            </p>

            <div className="portal-wallet-sheet__actions" style={{ marginTop: '24px' }}>
              <button
                type="button"
                className="portal-btn-secondary portal-wallet-sheet__btn"
                onClick={handleResetClose}
                disabled={loading}
                style={{ height: '48px', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}>
                Cancel
              </button>
              <button
                type="button"
                className="portal-btn-primary portal-wallet-sheet__btn"
                onClick={handleLookup}
                disabled={loading || !targetEmail}
                style={{ height: '48px', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}>
                {loading ? 'Sending Code...' : 'Next (Send Code)'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && targetUser && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ padding: '10px 14px', backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                <span style={{ fontSize: '11px', color: '#059669', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.04em' }}>Recipient Verified</span>
              </div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#047857', marginTop: '2px' }}>
                {targetEmail || targetUser.email || targetUser.emailMasked}
              </div>
            </div>

            {targetUser.cards && targetUser.cards.length > 0 && (
              <label className="portal-wallet-field" style={{ marginBottom: '10px' }}>
                <span className="portal-wallet-field__label">Destination Card</span>
                <select
                  className="portal-wallet-field__input"
                  value={selectedDestCard}
                  onChange={(e) => setSelectedDestCard(e.target.value)}
                  style={{ cursor: 'pointer' }}>
                  {targetUser.cards.map((c) => (
                    <option key={c.cardNo} value={c.cardNo}>
                      {c.cardMasked} ({c.cardType})
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="portal-wallet-field" style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span className="portal-wallet-field__label" style={{ margin: 0 }}>Transfer Amount (USD)</span>
                <span style={{ fontSize: '11px', color: isAmountError ? 'var(--portal-danger, #E53E3E)' : '#64748b', fontWeight: isAmountError ? '700' : '500' }}>
                  Min. $30.00 USD
                </span>
              </div>
              <input
                type="number"
                min="30.00"
                step="0.01"
                className="portal-wallet-field__input"
                placeholder="30.00 (Min $30.00)"
                value={grossAmount}
                onChange={(e) => setGrossAmount(e.target.value)}
                style={{
                  fontSize: '17px',
                  fontWeight: '700',
                  borderColor: isAmountError ? 'var(--portal-danger, #E53E3E)' : undefined,
                  backgroundColor: isAmountError ? '#fff5f5' : undefined,
                  color: isAmountError ? 'var(--portal-danger, #E53E3E)' : undefined
                }}
              />
              {isAmountError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px', fontSize: '12px', color: 'var(--portal-danger, #E53E3E)', fontWeight: '600' }}>
                  <span>⚠️</span>
                  <span>Minimum transfer amount is $30.00 USD.</span>
                </div>
              )}
            </label>

            <div style={{ padding: '10px 14px', backgroundColor: 'var(--bg-subtle, rgba(0,0,0,0.02))', border: '1px solid var(--portal-border, rgba(0,0,0,0.08))', borderRadius: '8px', marginBottom: '12px', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--portal-muted)' }}>Transfer Amount:</span>
                <span style={{ fontWeight: '600', color: 'var(--portal-ink, #1a1a1a)', fontFamily: 'var(--font-mono, ui-monospace, monospace)' }}>${grossVal.toFixed(2)} USD</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--portal-muted)' }}>Transfer fee ({feeRatePercent}%):</span>
                <span style={{ fontWeight: '600', color: '#d97706', fontFamily: 'var(--font-mono, ui-monospace, monospace)' }}>+${feeVal.toFixed(2)} USD</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-default, rgba(26,26,26,0.06))', paddingTop: '6px', marginTop: '4px' }}>
                <span style={{ fontWeight: '700', color: '#059669' }}>Total Deposited:</span>
                <span style={{ fontWeight: '700', color: '#059669', fontFamily: 'var(--font-mono, ui-monospace, monospace)' }}>${totalVal.toFixed(2)} USD</span>
              </div>
            </div>

            <label className="portal-wallet-field">
              <span className="portal-wallet-field__label">AnyTap Password</span>
              <input
                type="password"
                name="transfer_secure_token"
                className="portal-wallet-field__input"
                placeholder="Enter account password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-lpignore="true"
                data-1p-ignore="true"
              />
            </label>

            <div className="portal-wallet-field" style={{ marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span className="portal-wallet-field__label" style={{ margin: 0 }}>Email Verification Code</span>
                <button
                  type="button"
                  onClick={handleSendVerificationCode}
                  disabled={sendingCode || codeCountdown > 0}
                  style={{
                    border: 'none',
                    background: codeCountdown > 0 ? 'var(--bg-subtle, #e2e8f0)' : 'var(--brand-primary, #ff5500)',
                    color: codeCountdown > 0 ? 'var(--portal-muted, #64748b)' : '#fff',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: '600',
                    cursor: (sendingCode || codeCountdown > 0) ? 'not-allowed' : 'pointer'
                  }}>
                  {sendingCode ? 'Sending...' : codeCountdown > 0 ? `Resend (${codeCountdown}s)` : 'Send Code'}
                </button>
              </div>
              <TransferOtpInput
                value={verificationCode}
                onChange={(code) => setVerificationCode(code)}
                length={6}
              />
            </div>

            {/* Disclaimer & Notice Box */}
            <div style={{
              marginTop: '12px',
              padding: '10px 12px',
              backgroundColor: 'rgba(239, 68, 68, 0.04)',
              border: '1px solid rgba(239, 68, 68, 0.18)',
              borderRadius: '8px',
              fontSize: '11.5px',
              lineHeight: '1.4'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', color: '#dc2626', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span>Important Transfer Notice</span>
              </div>
              <p style={{ margin: 0, color: '#475569', fontSize: '11.5px' }}>
                Card transfers are executed instantaneously and <strong>cannot be cancelled, reversed, or refunded</strong> once submitted. Please double-check the recipient and transfer amount carefully before confirming.
              </p>
            </div>

            {/* Confirmation Checkbox */}
            <label style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              marginTop: '10px',
              marginBottom: '4px',
              cursor: 'pointer',
              userSelect: 'none'
            }}>
              <input
                type="checkbox"
                checked={agreedToNotice}
                onChange={(e) => setAgreedToNotice(e.target.checked)}
                style={{
                  marginTop: '1px',
                  width: '15px',
                  height: '15px',
                  accentColor: 'var(--brand-primary, #ff5500)',
                  cursor: 'pointer'
                }}
              />
              <span style={{ fontSize: '11.5px', color: 'var(--portal-ink, #1e293b)', lineHeight: '1.35', fontWeight: '500' }}>
                I have confirmed the recipient information and understand that this transfer cannot be cancelled.
              </span>
            </label>

            <div className="portal-wallet-sheet__actions" style={{ marginTop: '16px' }}>
              <button
                type="button"
                className="portal-btn-secondary portal-wallet-sheet__btn"
                onClick={() => {
                  setStep(1);
                  setGrossAmount('');
                  setPassword('');
                  setVerificationCode('');
                  setCodeCountdown(0);
                  setAgreedToNotice(false);
                }}
                style={{ height: '48px', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}>
                Back
              </button>
              <button
                type="button"
                className="portal-btn-primary portal-wallet-sheet__btn"
                onClick={handleExecuteTransfer}
                disabled={loading || !isAmountValid || !password || verificationCode?.length !== 6 || !selectedDestCard || !agreedToNotice}
                style={{ height: '48px', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}>
                {loading ? 'Processing...' : 'Confirm Transfer'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && receipt && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '2px solid #10b981', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto', fontSize: '22px', fontWeight: 'bold' }}>
              ✓
            </div>
            <h4 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--portal-ink, #1a1a1a)', margin: '0 0 4px 0' }}>Transfer Completed</h4>
            <p style={{ fontSize: '13px', color: 'var(--portal-muted)', margin: '0 0 16px 0' }}>Card-to-card balance transfer successful.</p>

            <div style={{ backgroundColor: 'var(--bg-subtle, rgba(0,0,0,0.02))', border: '1px solid var(--portal-border, rgba(0,0,0,0.08))', padding: '16px', borderRadius: '10px', textAlign: 'left', fontSize: '13px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--portal-muted)' }}>Order Number:</span>
                <span style={{ color: 'var(--portal-ink, #1a1a1a)', fontWeight: '600', fontFamily: 'monospace', fontSize: '11px' }}>{receipt.merchantOrderNo}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--portal-muted)' }}>Recipient:</span>
                <span style={{ color: 'var(--portal-ink, #1a1a1a)', fontWeight: '600' }}>
                  {targetEmail || receipt.destinationEmail || receipt.destinationEmailMasked}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--portal-muted)' }}>Transfer Amount:</span>
                <span style={{ color: 'var(--portal-ink, #1a1a1a)', fontWeight: '600' }}>${Number(receipt.grossAmount).toFixed(2)} USD</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--portal-muted)' }}>Transfer fee ({receipt.feeRate ? (Number(receipt.feeRate) * 100).toFixed(1) : feeRatePercent}%):</span>
                <span style={{ color: '#d97706', fontWeight: '600' }}>+${Number(receipt.feeAmount).toFixed(2)} USD</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-default, rgba(26,26,26,0.06))', paddingTop: '8px', marginTop: '4px' }}>
                <span style={{ color: '#059669', fontWeight: '700' }}>Total Deposited:</span>
                <span style={{ color: '#059669', fontWeight: '700' }}>${(Number(receipt.grossAmount ?? grossVal) + Number(receipt.feeAmount ?? feeVal)).toFixed(2)} USD</span>
              </div>
            </div>

            <button
              type="button"
              className="portal-btn-primary portal-wallet-sheet__btn"
              onClick={handleResetClose}
              style={{ width: '100%', height: '48px', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
