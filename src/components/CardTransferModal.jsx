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
    <div className="verify-otp" role="group" aria-label="Verification code" style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
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
            height: '38px',
            borderRadius: '6px',
            border: '1.5px solid var(--portal-border, rgba(0,0,0,0.12))',
            background: 'var(--paper, #fafafa)',
            fontSize: '17px',
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

  // Ensure selectedDestCard always matches an available card in targetUser.cards
  useEffect(() => {
    if (step === 2 && targetUser?.cards?.length > 0) {
      const exists = targetUser.cards.some((c) => c.cardNo === selectedDestCard);
      if (!exists) {
        const sourceCardId = sourceCard?.cardId || sourceCard?.id || sourceCard?.wasabiCardId || sourceCard?.cardNo;
        const otherCards = targetUser.cards.filter((c) => c.cardNo !== sourceCardId);
        const nextCard = otherCards.length > 0 ? otherCards[0] : targetUser.cards[0];
        if (nextCard) {
          setSelectedDestCard(nextCard.cardNo);
        }
      }
    }
  }, [step, targetUser, selectedDestCard, sourceCard]);

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
    setTargetUser(null);
    setSelectedDestCard('');

    try {
      if (isHttpApi) {
        // 1. Fetch recipient cards by target email or ID
        const checkRes = await fetch(`/api/v1/card/transfer/target-check?email=${encodeURIComponent(trimmedInput)}&identifier=${encodeURIComponent(trimmedInput)}`);
        const checkJson = await checkRes.json();
        if (checkJson?.result && checkJson?.data) {
          const userData = checkJson.data;
          setTargetUser(userData);
          if (userData.feeRate != null) {
            setFeeRate(Number(userData.feeRate));
          }
          // Set first available card or destination card
          const cards = userData.cards || [];
          const sourceCardId = sourceCard?.cardId || sourceCard?.id || sourceCard?.wasabiCardId || sourceCard?.cardNo;
          const otherCards = cards.filter((c) => c.cardNo !== sourceCardId);
          const defaultCard = otherCards.length > 0 ? otherCards[0] : cards[0];
          if (defaultCard) {
            setSelectedDestCard(defaultCard.cardNo);
          } else {
            s?.showToast?.('No destination cards available for this recipient.');
            return;
          }
        } else {
          s?.showToast?.(checkJson?.message || 'Recipient card lookup failed.');
          return;
        }

        // 2. Automatically send email verification code
        try {
          const codeRes = await fetch(`/api/v1/card/transfer/send-code/${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          const codeJson = await codeRes.json();
          if (codeJson?.result) {
            s?.showToast?.('Verification code sent to your registered email.');
            setCodeCountdown(60);
          } else {
            s?.showToast?.(codeJson?.message || 'Failed to send verification code.');
          }
        } catch (codeErr) {
          console.warn('Failed to send verification code:', codeErr);
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

  // Source card and live balance resolution
  const targetCardId = sourceCard?.cardId || sourceCard?.id || sourceCard?.wasabiCardId || sourceCard?.cardNo;
  const liveCard = s?.userCards?.find((c) => (
    (targetCardId && (c.id === targetCardId || c.cardNo === targetCardId || c.wasabiCardId === targetCardId)) ||
    (sourceCard?.last4 && c.last4 === sourceCard.last4)
  ));
  const cardObj = liveCard || sourceCard || s?.currentCard;
  const rawL4 = String(cardObj?.last4 || cardObj?.realLast4 || cardObj?.cardLast4 || '').trim();
  const validL4 = rawL4 && rawL4.length === 4 && /^\d{4}$/.test(rawL4) ? rawL4 : '';
  const last4Str = validL4 ? A.maskCardShort(validL4) : (cardObj?.cardMasked || '****');
  const rawBal = cardObj?.balanceUsdt ?? cardObj?.balance ?? cardObj?.availableUsd ?? s?.cardBalance ?? 0;
  const parsedBal = typeof rawBal === 'number' ? rawBal : parseFloat(String(rawBal).replace(/[^0-9.]/g, ''));
  const currentBalance = Number.isFinite(parsedBal) ? parsedBal : 0;
  const cardBalStr = currentBalance.toFixed(2);

  const minTransferGross = 30.00;
  const minFeeVal = Math.round(minTransferGross * feeRate * 100) / 100;
  const minTotalRequired = Math.round((minTransferGross + minFeeVal) * 100) / 100;

  const grossVal = parseFloat(grossAmount) || 0;
  const feeRatePercent = (feeRate * 100).toFixed(1);
  const feeVal = Math.round(grossVal * feeRate * 100) / 100;
  const totalVal = Math.round((grossVal + feeVal) * 100) / 100;

  const isBalanceTooLowForAnyTransfer = currentBalance < minTotalRequired;
  const isUnderMinError = grossAmount !== '' && (!grossVal || grossVal < minTransferGross);
  const isOverBalanceError = grossVal >= minTransferGross && totalVal > currentBalance;
  const isAmountError = isUnderMinError || isOverBalanceError;
  const isBalanceError = isBalanceTooLowForAnyTransfer || isOverBalanceError;
  const isAmountValid = grossVal >= minTransferGross && totalVal <= currentBalance && !isBalanceTooLowForAnyTransfer;

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
    if (!grossVal || grossVal < minTransferGross) {
      s?.showToast?.(`Minimum card-to-card transfer amount is $${minTransferGross.toFixed(2)} USD.`);
      return;
    }
    if (totalVal > currentBalance) {
      s?.showToast?.(`Insufficient card balance. Total required: $${totalVal.toFixed(2)} USD (Available: $${cardBalStr} USD)`);
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
  }, [grossVal, totalVal, currentBalance, cardBalStr, minTransferGross, selectedDestCard, targetEmail, sourceCard, password, verificationCode, agreedToNotice, targetUser, s]);

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

  return (
    <div className="portal-sheet" role="dialog" aria-modal="true" aria-label="Card-to-Card Transfer">
      <button type="button" className="portal-sheet__backdrop" onClick={loading ? undefined : handleResetClose} aria-label="Close" />
      <div className="portal-sheet__panel portal-wallet-sheet" style={{ maxWidth: '500px', maxHeight: 'min(92vh, 850px)', padding: '16px 20px calc(16px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="portal-sheet__head">
          <h3 className="portal-sheet__title">Card-to-Card Transfer</h3>
          <button type="button" className="portal-sheet__close" onClick={loading ? undefined : handleResetClose} disabled={loading} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>

        <p className="portal-wallet-sheet__sub" style={{ margin: '0 0 8px', fontSize: '13px' }}>Instant USD balance transfer between AnyTap cards.</p>

        {cardObj && (
          <div className="portal-wallet-quick-head" style={{ marginBottom: '10px' }}>
            <CardThumb variant={cardObj.variant} />
            <div>
              <p className="portal-wallet-quick-head__num">{last4Str}</p>
              <p className="portal-wallet-quick-head__bal">Balance: {cardBalStr} USD</p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={{ marginTop: '12px' }}>
            <label className="portal-wallet-field" style={{ marginBottom: '8px' }}>
              <span className="portal-wallet-field__label">Recipient Email or ID</span>
              <input
                type="text"
                className="portal-wallet-field__input"
                placeholder="Enter recipient email or ID (e.g. user@example.com or login ID)"
                value={targetEmail}
                onChange={(e) => {
                  setTargetEmail(e.target.value);
                  if (targetUser) {
                    setTargetUser(null);
                    setSelectedDestCard('');
                  }
                }}
                autoFocus
                style={{ height: '42px', fontSize: '14px' }}
              />
            </label>
            <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: 'var(--portal-muted, #64748b)', lineHeight: '1.4' }}>
              A 6-digit verification code will be sent to your email to verify this transfer.
            </p>

            <div className="portal-wallet-sheet__actions" style={{ marginTop: '16px' }}>
              <button
                type="button"
                className="portal-btn-secondary portal-wallet-sheet__btn"
                onClick={handleResetClose}
                disabled={loading}
                style={{ height: '42px', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}>
                Cancel
              </button>
              <button
                type="button"
                className="portal-btn-primary portal-wallet-sheet__btn"
                onClick={handleLookup}
                disabled={loading || !targetEmail}
                style={{ height: '42px', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}>
                {loading ? 'Sending Code...' : 'Next (Send Code)'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && targetUser && (
          <div style={{ marginTop: '8px' }}>
            <div style={{ padding: '6px 12px', backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                <span style={{ fontSize: '10.5px', color: '#059669', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.04em' }}>Recipient Verified</span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#047857', marginTop: '1px' }}>
                {targetUser.email || targetUser.emailMasked || targetEmail}
              </div>
            </div>

            {targetUser.cards && targetUser.cards.length > 0 && (
              <label className="portal-wallet-field" style={{ marginBottom: '8px' }}>
                <span className="portal-wallet-field__label">Destination Card</span>
                <select
                  className="portal-wallet-field__input"
                  value={selectedDestCard}
                  onChange={(e) => setSelectedDestCard(e.target.value)}
                  style={{ height: '40px', fontSize: '13.5px', cursor: 'pointer' }}>
                  {targetUser.cards.map((c) => (
                    <option key={c.cardNo} value={c.cardNo}>
                      {c.cardMasked} ({c.cardType})
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="portal-wallet-field" style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                <span className="portal-wallet-field__label" style={{ margin: 0 }}>Transfer Amount (USD)</span>
                <span style={{ fontSize: '11px', color: (isAmountError || isBalanceTooLowForAnyTransfer) ? 'var(--portal-danger, #E53E3E)' : '#64748b', fontWeight: (isAmountError || isBalanceTooLowForAnyTransfer) ? '700' : '500' }}>
                  Min. $30.00 USD · Bal: ${cardBalStr} USD
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
                  height: '42px',
                  fontSize: '15px',
                  fontWeight: '700',
                  borderColor: (isAmountError || isBalanceTooLowForAnyTransfer) ? 'var(--portal-danger, #E53E3E)' : undefined,
                  backgroundColor: (isAmountError || isBalanceTooLowForAnyTransfer) ? '#fff5f5' : undefined,
                  color: (isAmountError || isBalanceTooLowForAnyTransfer) ? 'var(--portal-danger, #E53E3E)' : undefined
                }}
              />
              {isUnderMinError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px', fontSize: '11.5px', color: 'var(--portal-danger, #E53E3E)', fontWeight: '600' }}>
                  <span>⚠️</span>
                  <span>Minimum transfer amount is $30.00 USD.</span>
                </div>
              )}
              {isOverBalanceError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px', fontSize: '11.5px', color: 'var(--portal-danger, #E53E3E)', fontWeight: '600' }}>
                  <span>⚠️</span>
                  <span>Insufficient balance: Total required is ${totalVal.toFixed(2)} USD (Available: ${cardBalStr} USD)</span>
                </div>
              )}
              {(!grossAmount || !isAmountError) && isBalanceTooLowForAnyTransfer && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px', fontSize: '11.5px', color: 'var(--portal-danger, #E53E3E)', fontWeight: '600' }}>
                  <span>⚠️</span>
                  <span>Insufficient balance to execute transfer. (Available: ${cardBalStr} USD, Minimum required: ${minTotalRequired.toFixed(2)} USD)</span>
                </div>
              )}
            </label>

            <div style={{
              padding: '8px 12px',
              backgroundColor: 'var(--bg-subtle, rgba(0,0,0,0.02))',
              border: isBalanceError ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--portal-border, rgba(0,0,0,0.08))',
              borderRadius: '8px',
              marginBottom: '8px',
              fontSize: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ color: 'var(--portal-muted)' }}>Available Balance:</span>
                <span style={{ fontWeight: '600', color: isBalanceError ? 'var(--portal-danger, #dc2626)' : 'var(--portal-ink, #1a1a1a)', fontFamily: 'var(--font-mono, ui-monospace, monospace)' }}>
                  ${cardBalStr} USD
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ color: 'var(--portal-muted)' }}>Transfer Amount:</span>
                <span style={{ fontWeight: '600', color: 'var(--portal-ink, #1a1a1a)', fontFamily: 'var(--font-mono, ui-monospace, monospace)' }}>${grossVal.toFixed(2)} USD</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ color: 'var(--portal-muted)' }}>Transfer Fee ({feeRatePercent}%):</span>
                <span style={{ fontWeight: '600', color: '#d97706', fontFamily: 'var(--font-mono, ui-monospace, monospace)' }}>+${feeVal.toFixed(2)} USD</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-default, rgba(26,26,26,0.06))', paddingTop: '4px', marginTop: '3px' }}>
                <span style={{ fontWeight: '700', color: isBalanceError ? '#dc2626' : '#059669' }}>Total Deducted:</span>
                <span style={{ fontWeight: '700', color: isBalanceError ? '#dc2626' : '#059669', fontFamily: 'var(--font-mono, ui-monospace, monospace)' }}>${totalVal.toFixed(2)} USD</span>
              </div>
              {isBalanceError && (
                <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px dashed rgba(239, 68, 68, 0.3)', color: '#dc2626', fontSize: '11px', fontWeight: '600' }}>
                  Shortfall of ${(totalVal > currentBalance ? (totalVal - currentBalance) : (minTotalRequired - currentBalance)).toFixed(2)} USD to complete this transfer.
                </div>
              )}
            </div>

            <label className="portal-wallet-field" style={{ marginBottom: '8px' }}>
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
                style={{ height: '40px', fontSize: '14px' }}
              />
            </label>

            <div className="portal-wallet-field" style={{ marginTop: '8px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                <span className="portal-wallet-field__label" style={{ margin: 0 }}>Email Verification Code</span>
                <button
                  type="button"
                  onClick={handleSendVerificationCode}
                  disabled={sendingCode || codeCountdown > 0}
                  style={{
                    border: 'none',
                    background: codeCountdown > 0 ? 'var(--bg-subtle, #e2e8f0)' : 'var(--brand-primary, #ff5500)',
                    color: codeCountdown > 0 ? 'var(--portal-muted, #64748b)' : '#fff',
                    padding: '4px 9px',
                    borderRadius: '5px',
                    fontSize: '11px',
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
              marginTop: '8px',
              padding: '7px 10px',
              backgroundColor: 'rgba(239, 68, 68, 0.04)',
              border: '1px solid rgba(239, 68, 68, 0.18)',
              borderRadius: '7px',
              fontSize: '11px',
              lineHeight: '1.35'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px', color: '#dc2626', fontWeight: '700', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span>Important Transfer Notice</span>
              </div>
              <p style={{ margin: 0, color: '#475569', fontSize: '11px' }}>
                Card transfers are executed instantaneously and <strong>cannot be cancelled, reversed, or refunded</strong> once submitted. Please double-check recipient and amount.
              </p>
            </div>

            {/* Confirmation Checkbox */}
            <label style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '7px',
              marginTop: '7px',
              marginBottom: '2px',
              cursor: 'pointer',
              userSelect: 'none'
            }}>
              <input
                type="checkbox"
                checked={agreedToNotice}
                onChange={(e) => setAgreedToNotice(e.target.checked)}
                style={{
                  marginTop: '1px',
                  width: '14px',
                  height: '14px',
                  accentColor: 'var(--brand-primary, #ff5500)',
                  cursor: 'pointer'
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--portal-ink, #1e293b)', lineHeight: '1.3', fontWeight: '500' }}>
                I have confirmed the recipient information and understand that this transfer cannot be cancelled.
              </span>
            </label>

            <div className="portal-wallet-sheet__actions" style={{ marginTop: '12px' }}>
              <button
                type="button"
                className="portal-btn-secondary portal-wallet-sheet__btn"
                onClick={() => {
                  setStep(1);
                  setTargetUser(null);
                  setSelectedDestCard('');
                  setGrossAmount('');
                  setPassword('');
                  setVerificationCode('');
                  setCodeCountdown(0);
                  setAgreedToNotice(false);
                }}
                style={{ height: '42px', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}>
                Back
              </button>
              <button
                type="button"
                className="portal-btn-primary portal-wallet-sheet__btn"
                onClick={handleExecuteTransfer}
                disabled={loading || !isAmountValid || !password || verificationCode?.length !== 6 || !selectedDestCard || !agreedToNotice || isBalanceError}
                style={{
                  height: '42px',
                  fontSize: '13px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  opacity: (!isAmountValid || isBalanceError) ? 0.5 : undefined,
                  cursor: (!isAmountValid || isBalanceError) ? 'not-allowed' : undefined
                }}>
                {loading ? 'Processing...' : isBalanceError ? 'Insufficient Balance' : 'Confirm Transfer'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && receipt && (
          <div style={{ textAlign: 'center', marginTop: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '2px solid #10b981', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px auto', fontSize: '20px', fontWeight: 'bold' }}>
              ✓
            </div>
            <h4 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--portal-ink, #1a1a1a)', margin: '0 0 3px 0' }}>Transfer Completed</h4>
            <p style={{ fontSize: '12.5px', color: 'var(--portal-muted)', margin: '0 0 12px 0' }}>Card-to-card balance transfer successful.</p>

            <div style={{ backgroundColor: 'var(--bg-subtle, rgba(0,0,0,0.02))', border: '1px solid var(--portal-border, rgba(0,0,0,0.08))', padding: '12px 14px', borderRadius: '8px', textAlign: 'left', fontSize: '12.5px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--portal-muted)' }}>Order Number:</span>
                <span style={{ color: 'var(--portal-ink, #1a1a1a)', fontWeight: '600', fontFamily: 'monospace', fontSize: '11px' }}>{receipt.merchantOrderNo}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--portal-muted)' }}>Recipient:</span>
                <span style={{ color: 'var(--portal-ink, #1a1a1a)', fontWeight: '600' }}>
                  {targetEmail || receipt.destinationEmail || receipt.destinationEmailMasked}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--portal-muted)' }}>Transfer Amount:</span>
                <span style={{ color: 'var(--portal-ink, #1a1a1a)', fontWeight: '600' }}>${Number(receipt.grossAmount).toFixed(2)} USD</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--portal-muted)' }}>Transfer fee ({receipt.feeRate ? (Number(receipt.feeRate) * 100).toFixed(1) : feeRatePercent}%):</span>
                <span style={{ color: '#d97706', fontWeight: '600' }}>+${Number(receipt.feeAmount).toFixed(2)} USD</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-default, rgba(26,26,26,0.06))', paddingTop: '6px', marginTop: '4px' }}>
                <span style={{ color: '#059669', fontWeight: '700' }}>Total Deposited:</span>
                <span style={{ color: '#059669', fontWeight: '700' }}>${(Number(receipt.grossAmount ?? grossVal) + Number(receipt.feeAmount ?? feeVal)).toFixed(2)} USD</span>
              </div>
            </div>

            <button
              type="button"
              className="portal-btn-primary portal-wallet-sheet__btn"
              onClick={handleResetClose}
              style={{ width: '100%', height: '42px', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
