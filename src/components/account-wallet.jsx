// ===== Wallet / Top-Up =====
// AccountWallet   — charge tab: USDT deposit address + QR code
//                 — send tab: send USDT (coming soon)
// ReceiveSheet    — bottom sheet for receive address (used from dashboard)
// QuickTopUpSheet — quick top-up modal triggered from card actions
// TODO: USDT deposit address → Cregis API (wallet/address endpoint)
// TODO: USDT balance → Cregis API (wallet/balance endpoint)
// TODO: Send USDT → Cregis API (wallet/transfer endpoint)

import { useEffect, useId, useMemo, useState } from 'react';
import { Icon } from './ui.jsx';
import { WalletCard } from './portal/WalletCard.jsx';
import { RecentActivitySection } from './account-activity.jsx';
import { DebitCardFace } from './account-cards.jsx';
import * as A from '../lib/account-data.js';
import * as W from '../utils/wallet-data.js';
import { resolveWalletBalance, resolveWalletAddress } from '../lib/api/display-data.js';
import { chargeCard, fetchSystemAddress, withdrawToExternal } from '../lib/services/accountService.js';

function WalletMyCardsList({ cards, selectedId, onSelect, onManageCards }) {
  if (!cards.length) {
    return (
      <section className="portal-wallet-mycards" aria-label="My cards">
        <h3 className="portal-wallet-mycards__title">My Cards</h3>
        <p className="portal-wallet-mycards__empty">No active cards yet. Apply for a card to top up.</p>
        {onManageCards && (
          <button type="button" className="portal-wallet-mycards__manage" onClick={onManageCards}>
            <Icon name="creditCard" size={18} stroke={1.75} />
            <span>Manage Cards</span>
            <Icon name="chevron" size={18} stroke={2} />
          </button>
        )}
      </section>
    );
  }

  return (
    <section className="portal-wallet-mycards" aria-label="My cards">
      <h3 className="portal-wallet-mycards__title">My Cards</h3>
      <ul className="portal-wallet-mycards__list">
        {cards.map((card) => {
          const active = card.id === selectedId;
          const variant = card.variant === 'physical' ? 'physical' : 'virtual';
          const bal = W.parseCardBalanceUsdt(card.balance);
          const statusInfo = A.getCardStatusBadge(card);
          return (
            <li key={card.id}>
              <button
                type="button"
                className={`portal-wallet-mycards__item${active ? ' is-active' : ''}`}
                onClick={() => onSelect(card.id)}
                aria-pressed={active}>
                <CardThumb variant={variant} />
                <span className="portal-wallet-mycards__body">
                  <span className="portal-wallet-mycards__row">
                    <span className="portal-wallet-mycards__num">{A.maskCardShort(card.last4)}</span>
                    <span className={`portal-wallet-mycards__badge portal-wallet-mycards__badge--${variant}`}>
                      {A.cardVariantLabel(card)}
                    </span>
                    <span
                      className="portal-wallet-mycards__status-badge"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: '600',
                        backgroundColor: `${statusInfo.text}15`,
                        color: statusInfo.text,
                        border: `1px solid ${statusInfo.text}33`,
                      }}>
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: statusInfo.dot,
                        }}
                      />
                      {statusInfo.label}
                    </span>
                  </span>
                  <span className="portal-wallet-mycards__bal">{bal} USDT</span>
                </span>
                <span className={`portal-wallet-mycards__radio${active ? ' is-checked' : ''}`} aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
      {onManageCards && (
        <button type="button" className="portal-wallet-mycards__manage" onClick={onManageCards}>
          <Icon name="creditCard" size={18} stroke={1.75} />
          <span>Manage Cards</span>
          <Icon name="chevron" size={18} stroke={2} />
        </button>
      )}
    </section>
  );
}

function WalletLeftColumn({
  s,
  quickActive,
  onQuickAction,
  canTopUpCard,
  children,
}) {
  return (
    <div className="portal-wallet-left">
      <WalletCard
        mode="detail"
        s={s}
        activeId={quickActive}
        onQuickAction={onQuickAction}
        canTopUpCard={canTopUpCard}
        className="portal-wallet-page__card"
      >
        {children}
      </WalletCard>
    </div>
  );
}

function WalletDestAddress({ address, onChange, onScan }) {
  const inputId = useId();

  return (
    <div className="portal-wallet-dest">
      <div className="portal-wallet-dest__head">
        <span className="portal-wallet-dest__icon" aria-hidden="true">
          <Icon name="wallet" size={22} stroke={1.6} />
        </span>
        <div className="portal-wallet-dest__meta">
          <p className="portal-wallet-dest__label">External Wallet</p>
          <p className="portal-wallet-dest__net">{W.WALLET_NETWORK}</p>
        </div>
      </div>
      <label className="portal-wallet-dest__field" htmlFor={inputId}>
        <span className="portal-wallet-dest__field-label">Destination address</span>
        <textarea
          id={inputId}
          className="portal-wallet-dest__input"
          rows={2}
          placeholder="Paste or scan a TRC-20 address"
          value={address}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          autoComplete="off"
        />
      </label>
      <button type="button" className="portal-wallet-dest__scan" onClick={onScan}>
        <Icon name="qr" size={18} stroke={1.75} />
        Scan QR Code
      </button>
      {address.trim() && (
        <p className="portal-wallet-dest__preview">
          Sending to: <strong>{W.maskAddress(address.trim(), 10, 6)}</strong>
        </p>
      )}
    </div>
  );
}

function ScanAddressSheet({ open, onClose, onScanComplete, onPaste, showToast }) {
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!open) setScanning(false);
  }, [open]);

  if (!open) return null;

  const runMockScan = () => {
    setScanning(true);
    window.setTimeout(() => {
      onScanComplete(W.MOCK_SCAN_ADDRESS);
      setScanning(false);
      onClose();
      showToast?.('Address scanned');
    }, 1400);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard?.readText();
      if (text?.trim()) {
        onScanComplete(text.trim());
        onClose();
        showToast?.('Address pasted');
        return;
      }
    } catch { /* noop */ }
    showToast?.('Could not read clipboard');
  };

  return (
    <div className="portal-sheet" role="dialog" aria-modal="true" aria-label="Scan address QR code">
      <button type="button" className="portal-sheet__backdrop" onClick={onClose} aria-label="Close" />
      <div className="portal-sheet__panel portal-wallet-sheet portal-wallet-sheet--scan">
        <div className="portal-sheet__head">
          <h3 className="portal-sheet__title">Scan Address</h3>
          <button type="button" className="portal-sheet__close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>
        <p className="portal-wallet-sheet__sub">
          Point your camera at a TRC-20 wallet QR code to fill the destination address.
        </p>
        <div className={`portal-wallet-scan${scanning ? ' is-scanning' : ''}`}>
          <div className="portal-wallet-scan__frame" aria-hidden="true">
            <span className="portal-wallet-scan__corner portal-wallet-scan__corner--tl" />
            <span className="portal-wallet-scan__corner portal-wallet-scan__corner--tr" />
            <span className="portal-wallet-scan__corner portal-wallet-scan__corner--bl" />
            <span className="portal-wallet-scan__corner portal-wallet-scan__corner--br" />
            <span className="portal-wallet-scan__line" />
            <span className="portal-wallet-scan__glyph" aria-hidden="true">
              <Icon name="qr" size={48} stroke={1.25} />
            </span>
          </div>
          <p className="portal-wallet-scan__hint">
            {scanning ? 'Reading QR code…' : 'Align the QR code within the frame'}
          </p>
        </div>
        <div className="portal-wallet-sheet__actions portal-wallet-sheet__actions--stack">
          <button
            type="button"
            className="portal-btn-primary portal-wallet-sheet__btn"
            disabled={scanning}
            onClick={runMockScan}>
            {scanning ? 'Scanning…' : 'Start Scan'}
          </button>
          <button type="button" className="portal-btn-secondary portal-wallet-sheet__btn" onClick={handlePaste}>
            Paste from Clipboard
          </button>
        </div>
      </div>
    </div>
  );
}

function WalletArrowDivider({ className = '', hint }) {
  return (
    <div
      className={`portal-wallet-flow-divider${className ? ` ${className}` : ''}`}
      aria-hidden={hint ? undefined : true}
      role={hint ? 'presentation' : undefined}>
      <div className="portal-wallet-flow-divider__track">
        <span className="portal-wallet-flow-divider__line" />
        <span className="portal-wallet-flow-divider__icon">
          <Icon name="chevronDown" size={16} stroke={2.5} />
        </span>
        <span className="portal-wallet-flow-divider__line" />
      </div>
      {hint ? <p className="portal-wallet-flow-divider__hint">{hint}</p> : null}
    </div>
  );
}

function CardThumb({ variant }) {
  const kind = variant === 'physical' ? 'physical' : 'virtual';
  return (
    <span
      className={`portal-wallet-card-pick__thumb portal-wallet-card-pick__thumb--${kind}`}
      aria-hidden="true"
    />
  );
}

function AmountBlock({
  label,
  amount,
  onChange,
  hint,
  quickAmounts = W.QUICK_AMOUNTS,
  onQuickAdd,
  isExceeded = false,
  isUnderMin = false,
}) {
  const inputId = useId();

  const handleInputChange = (val) => {
    if (!val) {
      onChange('');
      return;
    }
    // Clean input
    let clean = val.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 2) {
      clean = `${parts[0]}.${parts.slice(1).join('')}`;
    }
    const [integerPart, decimalPart] = clean.split('.');
    
    // Restrict decimal digits to max 2
    let newDec = decimalPart != null ? decimalPart.slice(0, 2) : null;
    
    // Total digit length (integer digits + decimal digits <= 6)
    const maxIntLen = 6 - (newDec != null ? newDec.length : 0);
    let newInt = integerPart.slice(0, Math.max(0, maxIntLen));

    let finalVal = newDec != null ? `${newInt}.${newDec}` : newInt;
    onChange(finalVal);
  };

  const hasError = isExceeded || isUnderMin;

  return (
    <div className="portal-wallet-amt" style={{
      background: isUnderMin ? '#fff1f2' : '#F8FAFC',
      border: hasError ? '2px solid #ef4444' : '2px solid #64748B',
      borderRadius: '12px',
      padding: '14px 16px',
      boxShadow: hasError ? '0 0 10px rgba(239, 68, 68, 0.25)' : '0 1px 3px rgba(0,0,0,0.05)',
      transition: 'all 0.2s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <p className="portal-wallet-amt__label" style={{ fontWeight: 600, color: hasError ? '#b91c1c' : '#475569', margin: 0 }}>
          {label}
        </p>
        <span style={{
          backgroundColor: isUnderMin ? '#ef4444' : '#0284c7',
          color: '#ffffff',
          fontWeight: '700',
          fontSize: '11.5px',
          padding: '3px 9px',
          borderRadius: '999px',
          letterSpacing: '0.3px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        }}>
          Min. 50 USDT
        </span>
      </div>

      <div className="portal-wallet-amt__row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <input
          id={inputId}
          className={`portal-wallet-amt__input${hasError ? ' is-exceeded' : ''}`}
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          placeholder="0"
          value={amount}
          onChange={(e) => handleInputChange(e.target.value)}
          aria-label={label}
          style={{
            fontSize: '30px',
            fontWeight: 700,
            color: hasError ? '#ef4444' : '#0f172a',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            width: '100%',
          }}
        />
        <span className="portal-wallet-amt__unit" style={{ fontWeight: 700, color: hasError ? '#b91c1c' : '#334155', fontSize: '16px' }}>USDT</span>
      </div>

      {/* Always displayed hint text — color transitions to red when under 50 USDT */}
      <p style={{
        marginTop: '10px',
        marginBottom: '0px',
        fontSize: '12.5px',
        fontWeight: isUnderMin ? 700 : 500,
        color: isUnderMin ? '#ef4444' : '#64748b',
        transition: 'color 0.2s ease',
      }}>
        {hint || `Min. 50 USDT · Gas fee 3.00 USDT`}
      </p>

      {onQuickAdd && (
        <div className="portal-wallet-quick-amt" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '12px' }}>
          {quickAmounts.map((n) => (
            <button key={n} type="button" className="portal-wallet-quick-amt__btn" onClick={() => onQuickAdd(n)}>
              +{n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TransactionSummary({ selectedCard, topUpAmount, gasFee, isUnderMin = false }) {
  if (!selectedCard) return null;

  const cardBal = parseFloat(W.parseCardBalanceUsdt(selectedCard.balance)) || 0;
  const topUpVal = parseFloat(topUpAmount) || 0;
  const cardFee = topUpVal * (W.CARD_CHARGE_FEE_RATE || 0.02);
  const totalDeduction = topUpVal + cardFee + gasFee;
  const balanceAfter = (cardBal + topUpVal).toFixed(2);
  const hasAmount = topUpVal > 0;

  return (
    <section className="portal-wallet-desk__summary portal-wallet-summary" aria-label="Transaction summary">
      <h3 className="portal-wallet-desk__panel-title">Transaction Summary</h3>
      <dl className="portal-wallet-desk__summary-list">
        <div className="portal-wallet-desk__summary-row">
          <dt>Selected Card</dt>
          <dd>{A.maskCardShort(selectedCard.last4)}</dd>
        </div>
        <div className="portal-wallet-desk__summary-row">
          <dt>Current Card Balance</dt>
          <dd>{selectedCard.balance?.includes('USDT') || selectedCard.balance?.includes('$') ? selectedCard.balance : `${W.parseCardBalanceUsdt(selectedCard.balance)} USDT`}</dd>
        </div>
        <div className="portal-wallet-desk__summary-row">
          <dt>Top Up Amount</dt>
          <dd>{hasAmount ? `${topUpVal.toFixed(2)} USDT` : '—'}</dd>
        </div>
        <div className="portal-wallet-desk__summary-row portal-wallet-desk__summary-row--highlight">
          <dt>Balance After Top Up</dt>
          <dd className={hasAmount ? 'is-highlight' : ''}>
            {hasAmount ? `${balanceAfter} USDT` : '—'}
          </dd>
        </div>
        <div className="portal-wallet-desk__summary-row">
          <dt>Card Fee (2%)</dt>
          <dd>{hasAmount ? `${cardFee.toFixed(2)} USDT` : '0.00 USDT'}</dd>
        </div>
        <div className="portal-wallet-desk__summary-row">
          <dt>Network Gas Fee</dt>
          <dd>{gasFee.toFixed(2)} USDT</dd>
        </div>
        <div className="portal-wallet-desk__summary-row">
          <dt>Total Deduction from Wallet</dt>
          <dd className={hasAmount ? 'is-emphasis' : ''}>
            {hasAmount ? `${totalDeduction.toFixed(2)} USDT` : '—'}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function WalletTopUpFlow({
  s,
  quickActive,
  onQuickAction,
  canTopUpCard,
  activeCards,
  selectedCardId,
  setSelectedCardId,
  onManageCards,
}) {
  return (
    <WalletLeftColumn
      s={s}
      quickActive={quickActive}
      onQuickAction={onQuickAction}
      canTopUpCard={canTopUpCard}>
      <WalletMyCardsList
        cards={activeCards}
        selectedId={selectedCardId}
        onSelect={setSelectedCardId}
        onManageCards={onManageCards}
      />
    </WalletLeftColumn>
  );
}

function WalletSendFlow({
  s,
  quickActive,
  onQuickAction,
  canTopUpCard,
  sendAddress,
  setSendAddress,
  onScan,
}) {
  return (
    <WalletLeftColumn
      s={s}
      quickActive={quickActive}
      onQuickAction={onQuickAction}
      canTopUpCard={canTopUpCard}>
      <div className="portal-wallet-send-dest">
        <h3 className="portal-wallet-send-dest__title">Destination</h3>
        <WalletDestAddress
          address={sendAddress}
          onChange={setSendAddress}
          onScan={onScan}
        />
      </div>
    </WalletLeftColumn>
  );
}

function WalletTopUpSide({
  s,
  selectedCard,
  topUpAmount,
  setTopUpAmount,
  addTopUpQuick,
  onConfirm,
}) {
  if (!selectedCard) return null;

  const walletBal = resolveWalletBalance(s.walletBalance);
  const topUpVal = parseFloat(topUpAmount) || 0;
  const isUnderMin = topUpVal > 0 && topUpVal < W.MIN_TOPUP;
  const isExceeded = topUpVal > 0 && (topUpVal + W.GAS_FEE_CHARGE > walletBal);
  const canSubmit = W.isValidTopUp(topUpAmount) && !isExceeded;

  return (
    <>
      <AmountBlock
        label="Top Up Amount"
        amount={topUpAmount}
        onChange={setTopUpAmount}
        onQuickAdd={addTopUpQuick}
        isExceeded={isExceeded}
        isUnderMin={isUnderMin}
      />
      <TransactionSummary
        selectedCard={selectedCard}
        topUpAmount={topUpAmount}
        gasFee={W.GAS_FEE_CHARGE}
        isUnderMin={isUnderMin}
      />
      <WalletNotice>Funds topped up to a card cannot be reversed.</WalletNotice>

      <button
        type="button"
        className={`portal-btn-primary portal-wallet-charge__cta${canSubmit ? ' is-ready' : ''}`}
        disabled={!canSubmit}
        style={isUnderMin ? { backgroundColor: '#94a3b8', cursor: 'not-allowed', borderColor: '#cbd5e1' } : undefined}
        onClick={onConfirm}>
        {W.topUpCtaLabel(topUpAmount)}
      </button>
    </>
  );
}

function WalletTopUpPanel({
  s,
  quickActive,
  onQuickAction,
  canTopUpCard,
  activeCards,
  selectedCardId,
  setSelectedCardId,
  selectedCard,
  topUpAmount,
  setTopUpAmount,
  addTopUpQuick,
  onConfirm,
  onManageCards,
  layout = 'stack',
}) {
  const flow = (
    <WalletTopUpFlow
      s={s}
      quickActive={quickActive}
      onQuickAction={onQuickAction}
      canTopUpCard={canTopUpCard}
      activeCards={activeCards}
      selectedCardId={selectedCardId}
      setSelectedCardId={setSelectedCardId}
      onManageCards={onManageCards}
    />
  );

  const side = (
    <WalletTopUpSide
      s={s}
      selectedCard={selectedCard}
      topUpAmount={topUpAmount}
      setTopUpAmount={setTopUpAmount}
      addTopUpQuick={addTopUpQuick}
      onConfirm={onConfirm}
    />
  );

  if (layout === 'grid') {
    return (
      <div className="portal-wallet-desk__charge-grid">
        <div className="portal-wallet-desk__charge-flow" role="group" aria-label="Top up transfer">
          {flow}
        </div>
        {selectedCard && (
          <div className="portal-wallet-desk__charge-side">
            {side}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="portal-wallet-topup">
      {flow}
      {selectedCard && <WalletArrowDivider className="portal-wallet-flow-divider--amt" />}
      {side}
    </div>
  );
}

function SendSummaryDesk({ address, sendAmount, gasFee }) {
  const sendVal = parseFloat(sendAmount) || 0;
  const hasAmount = sendVal > 0;
  const trimmed = address.trim();

  return (
    <section className="portal-wallet-desk__summary" aria-label="Transfer summary">
      <h3 className="portal-wallet-desk__panel-title">Transfer Summary</h3>
      <dl className="portal-wallet-desk__summary-list">
        <div className="portal-wallet-desk__summary-row">
          <dt>Destination</dt>
          <dd className="portal-wallet-desk__summary-mono">
            {trimmed ? W.maskAddress(trimmed, 8, 4) : '—'}
          </dd>
        </div>
        <div className="portal-wallet-desk__summary-row">
          <dt>Amount</dt>
          <dd className={hasAmount ? 'is-emphasis' : ''}>
            {hasAmount ? `${sendVal.toFixed(2)} USDT` : '—'}
          </dd>
        </div>
        <div className="portal-wallet-desk__summary-row">
          <dt>Estimated Network Fee</dt>
          <dd>{gasFee.toFixed(2)} USDT</dd>
        </div>
        <div className="portal-wallet-desk__summary-row">
          <dt>Total from Wallet</dt>
          <dd className={hasAmount ? 'is-emphasis' : ''}>
            {hasAmount ? `${(sendVal + gasFee).toFixed(2)} USDT` : '—'}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function WalletNotice({ children }) {
  return (
    <div className="portal-wallet-notice" role="note">
      <span className="portal-wallet-notice__ic" aria-hidden="true">!</span>
      <span>{children}</span>
    </div>
  );
}

function ConfirmSheet({ title, rows, password, onPassword, notice, onCancel, onConfirm, confirmLabel, danger, loading = false }) {
  const [isUnderstood, setIsUnderstood] = useState(false);

  useEffect(() => {
    setIsUnderstood(false);
  }, [title]);

  const headerTitle = title || 'Before You Top Up';
  const noticeTitle = (headerTitle.includes('Transfer') || headerTitle.includes('Withdrawal'))
    ? 'Before You Send / Withdraw'
    : 'Before You Top Up';

  return (
    <div className="portal-sheet" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="portal-sheet__backdrop" onClick={loading ? undefined : onCancel} aria-label="Close" />
      <div className="portal-sheet__panel portal-wallet-sheet" style={{ minHeight: '520px', maxHeight: 'min(92vh, 760px)', padding: '24px 24px calc(28px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="portal-sheet__head">
          <h3 className="portal-sheet__title">{title}</h3>
          <button type="button" className="portal-sheet__close" onClick={loading ? undefined : onCancel} disabled={loading} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>
        <dl className="portal-wallet-confirm">
          {rows.map((row) => (
            <div key={row.label} className="portal-wallet-confirm__row">
              <dt>{row.label}</dt>
              <dd className={row.emphasis ? 'is-emphasis' : row.danger ? 'is-danger' : ''}>{row.value}</dd>
            </div>
          ))}
        </dl>
        <label className="portal-wallet-field">
          <span className="portal-wallet-field__label">Confirm Password (AnyTap Password)</span>
          <input
            className="portal-wallet-field__input"
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => onPassword(e.target.value)}
            disabled={loading}
            autoComplete="current-password"
            style={{ width: '100%', height: '48px', padding: '12px 14px', fontSize: '15px', borderRadius: '8px' }}
          />
        </label>

        {/* Mandatory Terms & I understand Checkbox (Orange Title + Slate Gray Body Theme) */}
        <div style={{
          marginTop: '14px',
          marginBottom: '14px',
          padding: '14px 16px',
          backgroundColor: '#ffffff',
          border: '1.5px solid #f97316',
          borderRadius: '10px',
          lineHeight: '1.6',
          boxShadow: '0 4px 12px rgba(249, 115, 22, 0.08)',
        }}>
          <strong style={{ color: '#ea580c', display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '900', letterSpacing: '0.3px' }}>
            ⚠️ {noticeTitle}
          </strong>
          <ol style={{ margin: '0 0 12px 20px', padding: 0, color: '#334155', fontWeight: '600', fontSize: '13px' }}>
            <li style={{ color: '#334155', marginBottom: '4px' }}>Processing may take up to 60 minutes</li>
            <li style={{ color: '#334155', marginBottom: '4px' }}>Top-up amount is non-refundable</li>
            <li style={{ color: '#334155' }}>Exchange rate is not 1:1 (may vary)</li>
          </ol>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#1e293b', fontWeight: '800', fontSize: '14px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
            <input
              type="checkbox"
              checked={isUnderstood}
              onChange={(e) => setIsUnderstood(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: '#f97316', cursor: 'pointer' }}
            />
            <span style={{ color: '#1e293b', fontSize: '14px', fontWeight: '800' }}>I understand</span>
          </label>
        </div>

        {notice && <WalletNotice>{notice}</WalletNotice>}
        <div className="portal-wallet-sheet__actions">
          <button type="button" className="portal-btn-secondary portal-wallet-sheet__btn" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className={`portal-btn-primary portal-wallet-sheet__btn${danger ? ' portal-wallet-sheet__btn--danger' : ''}`}
            disabled={loading || !password || !password.trim() || !isUnderstood}
            onClick={onConfirm}>
            {loading ? <><span className="btn-spinner"></span>Processing...</> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}


export function IssuanceDepositPanel({ s, className = '', isModal = false }) {
  const [systemAddress, setSystemAddress] = useState('');
  const status = s.accountState?.cardStatus;
  const isIssuance = W.showsIssuanceDepositWallet(status);
  const amount = isIssuance ? W.resolveIssuanceDepositAmount(s.accountState) : null;

  useEffect(() => {
    fetchSystemAddress().then((addr) => {
      setSystemAddress(addr);
    });
  }, []);

  const address = s.accountState?.issuanceDepositAddress || systemAddress || W.resolveIssuanceDepositAddress(s.accountState);
  const paid = isIssuance && (status === 'deposit_received' || status === 'creating');

  return (
    <section
      className={[
        'portal-issuance-deposit',
        paid ? 'portal-issuance-deposit--paid' : '',
        className,
      ].filter(Boolean).join(' ')}
      aria-label="Card deposit">
      <p className="portal-issuance-deposit__body" style={{ fontSize: '13px', margin: 0, marginBottom: '12px', color: '#94a3b8' }}>
        {paid
          ? 'Your 100 USDT issuance fee is confirmed. Card preparation is in progress — do not send again.'
          : isIssuance
            ? 'Send exactly this amount via TRC-20. This deposit wallet stays visible until your card ships.'
            : 'Send USDT (TRC-20) to fund your wallet balance.'}
      </p>

      {!paid ? (
        <div className="portal-qrbox portal-issuance-deposit__qrbox" style={isModal ? { padding: '16px', gap: '10px' } : undefined}>
          <div className="portal-qr" dangerouslySetInnerHTML={{ __html: A.buildQR() }} />
          <p className="portal-issuance-deposit__qr-label" style={{ fontSize: '12px', margin: 0 }}>USDT Deposit Address (TRC-20)</p>
          <div className="portal-addr" style={{ fontSize: '13px', padding: '8px 12px' }}>{address || 'Loading system wallet...'}</div>
          {isIssuance && (
            <div className="capply-alert capply-alert--info" style={{ marginTop: '8px', marginBottom: '8px', fontSize: '12px', lineHeight: '1.4', padding: '8px 12px', borderRadius: '6px', backgroundColor: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', textAlign: 'left' }}>
              Once you deposit 100 USDT to the address below, your card will be shipped, and delivery may take up to 2 weeks.
            </div>
          )}
          <button
            type="button"
            className="portal-btn-primary portal-issuance-deposit__copy"
            style={{ padding: '8px 16px', fontSize: '13px' }}
            disabled={!address}
            onClick={() => (address && s.copy ? s.copy(address, 'Deposit address copied') : undefined)}>
            Copy Address
          </button>
        </div>
      ) : (
        <div className="portal-issuance-deposit__paid-box">
          <p className="portal-issuance-deposit__paid-title">Next: card creating</p>
          <p className="portal-issuance-deposit__paid-msg">
            Usually a few minutes. We will update this page when your card is ready to register.
          </p>
          <p className="portal-issuance-deposit__paid-addr">
            <span>Deposit address (do not reuse)</span>
            <code>{address || 'Loading...'}</code>
          </p>
        </div>
      )}

      <div className="portal-meta-row portal-issuance-deposit__meta" style={isModal ? { marginTop: '12px', marginBottom: '8px' } : undefined}>
        <div className="portal-meta">
          <span className="portal-meta__k">Network</span>
          <span className="portal-meta__v">
            <span className="portal-wallet-net-dot" aria-hidden="true" />
            {W.WALLET_NETWORK}
          </span>
        </div>
        {isIssuance && (
          <>
            <div className="portal-meta">
              <span className="portal-meta__k">Amount</span>
              <span className="portal-meta__v">{amount} {W.ISSUANCE_DEPOSIT_CURRENCY}</span>
            </div>
            <div className="portal-meta">
              <span className="portal-meta__k">Status</span>
              <span className="portal-meta__v">{paid ? 'Received' : 'Awaiting deposit'}</span>
            </div>
          </>
        )}
      </div>

      {!paid ? (
        <p className="portal-issuance-deposit__note" role="note" style={isModal ? { fontSize: '11px', margin: 0 } : undefined}>
          Only send USDT on TRC-20. Other networks or assets may be lost. {isIssuance ? 'Personal spending wallet opens after you register your card.' : ''}
        </p>
      ) : null}
    </section>
  );
}

export function ReceiveSheet({ s, open, onClose }) {
  const [fetchedAddress, setFetchedAddress] = useState('');

  const userAddress = s.walletAddress 
    || s.accountState?.cregisWalletAddress 
    || s.mockContext?.wallet?.address 
    || s.accountState?.walletAddress 
    || fetchedAddress;

  useEffect(() => {
    if (open && !userAddress) {
      const userId = s.accountState?.userId || s.user?.id;
      if (userId) {
        import('../lib/api/httpClient.js').then(({ apiGet }) => {
          apiGet(`/cregis/user/address/${encodeURIComponent(userId)}`)
            .then((res) => {
              const addr = res?.data?.address || res?.address || '';
              if (addr) setFetchedAddress(addr);
            })
            .catch(() => {});
        });
      }
    }
  }, [open, userAddress, s.accountState?.userId, s.user?.id]);

  if (!open) return null;

  const address = userAddress;

  return (
    <div className="portal-sheet" role="dialog" aria-modal="true" aria-label="Receive USDT">
      <button type="button" className="portal-sheet__backdrop" onClick={onClose} aria-label="Close" />
      <div className="portal-sheet__panel portal-wallet-sheet portal-wallet-sheet--receive">
        <div className="portal-sheet__head">
          <h3 className="portal-sheet__title">Receive USDT</h3>
          <button type="button" className="portal-sheet__close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>
        <p className="portal-wallet-sheet__sub">
          Send USDT (TRC-20) to your wallet address below.
        </p>
        {s.addrLoading && !address ? (
          <div className="portal-sk" style={{ height: 280, borderRadius: 'var(--radius-info)' }} />
        ) : (
          <>
            <div className="portal-qrbox portal-wallet-receive-qr">
              <div className="portal-qr" dangerouslySetInnerHTML={{ __html: A.buildQR(address) }} />
              <p className="portal-wallet-receive-qr__label">Deposit Address</p>
              <div className="portal-addr">{address || 'Loading wallet address...'}</div>
              <button type="button" className="portal-btn-primary portal-wallet-receive-qr__copy" disabled={!address} onClick={() => address && s.copy(address, 'Address copied')}>
                Copy Address
              </button>
            </div>
            <div className="portal-meta-row">
              <div className="portal-meta">
                <span className="portal-meta__k">Network</span>
                <span className="portal-meta__v">
                  <span className="portal-wallet-net-dot" aria-hidden="true" />
                  {W.WALLET_NETWORK}
                </span>
              </div>
              <div className="portal-meta">
                <span className="portal-meta__k">Min. Deposit</span>
                <span className="portal-meta__v">{W.MIN_DEPOSIT_LABEL}</span>
              </div>
            </div>
            <WalletNotice>
              Only send USDT via TRC-20. Other networks or assets may be permanently lost.
            </WalletNotice>
          </>
        )}
      </div>
    </div>
  );
}

/** Card top-up — select destination card when user has multiple active cards */
export function CardTopUpSelectSheet({ s, cards, open, onClose, onSelect }) {
  if (!open) return null;

  return (
    <div className="portal-sheet" role="dialog" aria-modal="true" aria-label="Select card">
      <button type="button" className="portal-sheet__backdrop" onClick={onClose} aria-label="Close" />
      <div className="portal-sheet__panel portal-wallet-sheet portal-wallet-sheet--card-pick">
        <div className="portal-sheet__head">
          <h3 className="portal-sheet__title">Select Card</h3>
          <button type="button" className="portal-sheet__close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>
        <p className="portal-wallet-sheet__sub">Choose which card to top up from your wallet.</p>
        <ul className="portal-send-card-pick">
          {cards.map((card) => {
            const variant = card.variant === 'physical' ? 'physical' : 'virtual';
            const bal = W.parseCardBalanceUsdt(card.balance);
            const frozen = card.status === 'frozen';
            return (
              <li key={card.id}>
                <button
                  type="button"
                  className={`portal-send-card-pick__item${frozen ? ' is-disabled' : ''}`}
                  disabled={frozen}
                  onClick={() => !frozen && onSelect(card)}>
                  <span className="portal-send-card-pick__media">
                    <CardThumb variant={variant} />
                  </span>
                  <span className="portal-send-card-pick__body">
                    <span className="portal-send-card-pick__row">
                      <strong>{A.cardVariantLabel(card)}</strong>
                      <span className="portal-send-card-pick__last4">{A.maskCardShort(card.last4)}</span>
                    </span>
                    <span className="portal-send-card-pick__bal">
                      {frozen ? 'Frozen — transfers disabled' : `${bal} USDT available`}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function QuickTopUpSheet({ s, card, open, onClose }) {
  const [amount, setAmount] = useState('');
  const [password, setPassword] = useState('');
  const [isUnderstood, setIsUnderstood] = useState(false);
  const [showPasswordStep, setShowPasswordStep] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount('');
      setPassword('');
      setIsUnderstood(false);
      setShowPasswordStep(false);
      setLoading(false);
    }
  }, [open, card?.id]);

  if (!open || !card) return null;

  const bal = W.parseCardBalanceUsdt(card.balance);
  const topUpVal = parseFloat(amount) || 0;
  const isUnderMin = topUpVal > 0 && topUpVal < W.MIN_TOPUP;
  const walletBal = resolveWalletBalance(s.walletBalance);
  const isExceeded = topUpVal > 0 && (topUpVal + W.GAS_FEE_CHARGE > walletBal);

  const addQuick = (n) => {
    const cur = parseFloat(amount) || 0;
    setAmount(String(cur + n));
  };

  const handleNextOrConfirm = async () => {
    if (isUnderMin) {
      s.showToast?.('Minimum card top-up amount must be 50 USDT or higher.');
      return;
    }
    if (!showPasswordStep) {
      setShowPasswordStep(true);
      return;
    }

    if (loading || !password || !password.trim() || !isUnderstood) return;
    setLoading(true);
    try {
      await chargeCard(topUpVal, card?.cardId || card?.id, password);
      s.deductWalletBalance?.(topUpVal + W.GAS_FEE_CHARGE);
      onClose();
      s.showToast('Top up complete!');
      s.refresh?.();
    } catch (err) {
      console.error('Failed to top up card', err);
      s.showToast(err?.message || 'Failed to top up card');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-sheet" role="dialog" aria-modal="true" aria-label="Card top up">
      <button type="button" className="portal-sheet__backdrop" onClick={loading ? undefined : onClose} aria-label="Close" />
      <div className="portal-sheet__panel portal-wallet-sheet" style={{ minHeight: '520px', maxHeight: 'min(92vh, 760px)', padding: '24px 24px calc(28px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="portal-sheet__head">
          <h3 className="portal-sheet__title">Card Top Up {showPasswordStep ? '— Confirm Password' : ''}</h3>
          <button type="button" className="portal-sheet__close" onClick={loading ? undefined : onClose} disabled={loading} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>

        <p className="portal-wallet-sheet__sub">Move USDT from your wallet to your card.</p>

        <div className="portal-wallet-quick-head">
          <CardThumb variant={card.variant} />
          <div>
            <p className="portal-wallet-quick-head__num">{A.maskCardShort(card.last4)}</p>
            <p className="portal-wallet-quick-head__bal">Balance: {bal} USDT</p>
          </div>
        </div>

        {!showPasswordStep ? (
          <>
            <AmountBlock
              label="Amount to top up (Min 50 USDT)"
              amount={amount}
              onChange={setAmount}
              hint={`Min. 50 USDT · Gas fee 3.00 USDT`}
              onQuickAdd={addQuick}
              isExceeded={isExceeded || isUnderMin}
            />
            <p className="portal-wallet-quick-wallet">
              Wallet balance: <strong>{W.formatUsdtAmount(walletBal)} USDT</strong>
            </p>
          </>
        ) : (
          <div style={{ margin: '16px 0' }}>
            <div style={{ padding: '12px 14px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '14px', fontSize: '13px' }}>
              <div>Top-up Amount: <strong>{topUpVal.toFixed(2)} USDT</strong></div>
              <div>Card Charge Fee (2%): <strong>{(topUpVal * 0.02).toFixed(2)} USDT</strong></div>
              <div>Gas Fee: <strong>3.00 USDT</strong></div>
              <div>Total Deduction: <strong>{(topUpVal + topUpVal * 0.02 + 3).toFixed(2)} USDT</strong></div>
            </div>
            <label className="portal-wallet-field">
              <span className="portal-wallet-field__label">Confirm Password (AnyTap Password)</span>
              <input
                className="portal-wallet-field__input"
                type="password"
                placeholder="Enter account password to authorize top-up"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoFocus
                autoComplete="current-password"
                style={{ width: '100%', height: '48px', padding: '12px 14px', fontSize: '15px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }}
              />
            </label>

            {/* Mandatory Terms & I understand Checkbox (Orange Title + Slate Gray Body Theme) */}
            <div style={{
              marginTop: '14px',
              marginBottom: '14px',
              padding: '14px 16px',
              backgroundColor: '#ffffff',
              border: '1.5px solid #f97316',
              borderRadius: '10px',
              lineHeight: '1.6',
              boxShadow: '0 4px 12px rgba(249, 115, 22, 0.08)',
            }}>
              <strong style={{ color: '#ea580c', display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '900', letterSpacing: '0.3px' }}>
                ⚠️ Before You Top Up
              </strong>
              <ol style={{ margin: '0 0 12px 20px', padding: 0, color: '#334155', fontWeight: '600', fontSize: '13px' }}>
                <li style={{ color: '#334155', marginBottom: '4px' }}>Processing may take up to 60 minutes</li>
                <li style={{ color: '#334155', marginBottom: '4px' }}>Top-up amount is non-refundable</li>
                <li style={{ color: '#334155' }}>Exchange rate is not 1:1 (may vary)</li>
              </ol>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#1e293b', fontWeight: '800', fontSize: '14px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                <input
                  type="checkbox"
                  checked={isUnderstood}
                  onChange={(e) => setIsUnderstood(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#f97316', cursor: 'pointer' }}
                />
                <span style={{ color: '#1e293b', fontSize: '14px', fontWeight: '800' }}>I understand</span>
              </label>
            </div>
          </div>
        )}

        <div className="portal-wallet-sheet__actions" style={{ marginTop: '16px' }}>
          <button
            type="button"
            className="portal-btn-secondary portal-wallet-sheet__btn"
            onClick={showPasswordStep ? () => setShowPasswordStep(false) : onClose}
            disabled={loading}
          >
            {showPasswordStep ? 'Back' : 'Cancel'}
          </button>
          <button
            type="button"
            className="portal-btn-primary portal-wallet-sheet__btn"
            disabled={loading || isUnderMin || !W.isValidTopUp(amount) || isExceeded || (showPasswordStep && (!password.trim() || !isUnderstood))}
            onClick={handleNextOrConfirm}
          >
            {loading ? <><span className="btn-spinner"></span>Processing...</> : showPasswordStep ? 'Confirm & Top Up' : 'Next (Password Confirm)'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AccountWallet({ s }) {
  const activeCards = s.userCards.filter((c) => ['active', 'frozen', 'shipping'].includes(c.status));
  const [tab, setTab] = useState(s.walletTab ?? 'charge');
  const [quickActive, setQuickActive] = useState(() => (
    s.walletTab === 'send' ? 'send' : null
  ));
  const [selectedCardId, setSelectedCardId] = useState(activeCards[0]?.id ?? null);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [sendAddress, setSendAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [confirmCharge, setConfirmCharge] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (s.walletTab) {
      setTab(s.walletTab);
      if (s.walletTab === 'send') setQuickActive('send');
      else if (s.walletTab === 'charge') setQuickActive('topUp');
    }
  }, [s.walletTab]);

  useEffect(() => {
    if (activeCards.length > 0) {
      const exists = activeCards.some((c) => c.id === selectedCardId);
      if (!exists || !selectedCardId) {
        const preferred = activeCards.find((c) => c.status === 'active') || activeCards[0];
        setSelectedCardId(preferred.id);
      }
    }
  }, [activeCards, selectedCardId]);

  const selectedCard = activeCards.find((c) => c.id === selectedCardId) ?? null;
  const topUpVal = parseFloat(topUpAmount) || 0;
  const cardFeeVal = topUpVal * (W.CARD_CHARGE_FEE_RATE || 0.02);
  const gasFeeVal = W.GAS_FEE_CHARGE || 3.00;
  const totalChargeFee = cardFeeVal + gasFeeVal;
  const sendVal = parseFloat(sendAmount) || 0;
  const walletBal = resolveWalletBalance(s.walletBalance);
  const sendExceeded = sendVal > 0 && (sendVal + W.GAS_FEE_SEND > walletBal);
  const chargeTotal = (topUpVal + totalChargeFee).toFixed(2);

  const addTopUpQuick = (n) => {
    const cur = parseFloat(topUpAmount) || 0;
    setTopUpAmount(String(cur + n));
  };

  const closeConfirm = () => {
    setConfirmCharge(false);
    setConfirmSend(false);
    setPassword('');
    setLoading(false);
  };

  const finishCharge = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await chargeCard(topUpVal, selectedCard?.cardId || selectedCard?.id, password);
      s.deductWalletBalance?.(topUpVal + totalChargeFee);
      closeConfirm();
      setTopUpAmount('');
      s.showToast('Card charged successfully!');
      s.refresh?.();
    } catch (err) {
      console.error('Failed to charge card', err);
      const errMsg = err?.message || err?.data?.message || 'Invalid confirmation password. Please check your password.';
      s.showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const finishSend = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await withdrawToExternal(sendVal, sendAddress, password);
      s.deductWalletBalance?.(sendVal + W.GAS_FEE_SEND);
      closeConfirm();
      setSendAddress('');
      setSendAmount('');
      s.showToast('Transfer submitted successfully!');
      s.refresh?.();
    } catch (err) {
      console.error('Failed to send USDT', err);
      const errMsg = err?.message || err?.data?.message || 'Invalid confirmation password. Please check your password.';
      s.showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };


  if (!s.walletExists) {
    return (
      <div className="portal-wallet-page portal-pop">
        <div className="portal-wallet-empty">
          <p className="portal-wallet-empty__title">Wallet not available yet</p>
          <p className="portal-wallet-empty__msg">Complete identity verification to activate your Anytap wallet.</p>
          {!s.kycApproved && (
            <button type="button" className="portal-btn-primary" onClick={() => s.go('cardApply')}>
              Verify Identity
            </button>
          )}
        </div>
      </div>
    );
  }

  const canTopUpCard = activeCards.length > 0;
  const onQuickAction = (id) => {
    if (id === 'topUp') {
      setQuickActive('topUp');
      setTab('charge');
    } else if (id === 'send') {
      setQuickActive('send');
      setTab('send');
    }
  };

  if (s.addrLoading && tab === 'charge' && !activeCards.length) {
    return (
      <div className="portal-wallet-page">
        <div className="portal-sk" style={{ height: 420, borderRadius: 'var(--radius-card)' }} />
      </div>
    );
  }

  return (
    <div className="portal-wallet-page portal-pop">
      {/* Mobile — unchanged layout */}
      <div className="portal-wallet-mob">
        {tab === 'charge' && (
          <WalletTopUpPanel
            s={s}
            quickActive={quickActive}
            onQuickAction={onQuickAction}
            canTopUpCard={canTopUpCard}
            activeCards={activeCards}
            selectedCardId={selectedCardId}
            setSelectedCardId={setSelectedCardId}
            selectedCard={selectedCard}
            topUpAmount={topUpAmount}
            setTopUpAmount={setTopUpAmount}
            addTopUpQuick={addTopUpQuick}
            onConfirm={() => setConfirmCharge(true)}
            onManageCards={() => s.go('card')}
          />
        )}

        {tab === 'send' && (
          <div className="portal-wallet-send">
            <WalletSendFlow
              s={s}
              quickActive={quickActive}
              onQuickAction={onQuickAction}
              canTopUpCard={canTopUpCard}
              sendAddress={sendAddress}
              setSendAddress={setSendAddress}
              onScan={() => setScanOpen(true)}
            />

            <div className="portal-wallet-step portal-wallet-step--amt">
              <AmountBlock
                label="Amount to send"
                amount={sendAmount}
                onChange={setSendAmount}
                hint={sendExceeded ? `Exceeds available balance (${W.formatUsdtAmount(walletBal)} USDT)` : `Min. ${W.MIN_SEND} USDT · Available: ${W.formatUsdtAmount(walletBal)} USDT`}
                isExceeded={sendExceeded}
              />
              <WalletNotice>
                Anytap is not responsible for transfers to incorrect addresses. Always verify before sending.
              </WalletNotice>
              <button
                type="button"
                className="portal-btn-primary portal-wallet-send__cta"
                disabled={!W.isValidTronAddress(sendAddress) || !W.isValidSend(sendAmount, walletBal) || sendExceeded}
                onClick={() => setConfirmSend(true)}>
                Confirm Send
              </button>
            </div>

            <ScanAddressSheet
              open={scanOpen}
              onClose={() => setScanOpen(false)}
              onScanComplete={setSendAddress}
              showToast={s.showToast}
            />
          </div>
        )}
      </div>

      {/* Desktop — transfer-first top up layout */}
      <div className="portal-wallet-desk">
        {tab === 'charge' && (
          <div className="portal-wallet-desk__charge">
            <WalletTopUpPanel
              s={s}
              quickActive={quickActive}
              onQuickAction={onQuickAction}
              canTopUpCard={canTopUpCard}
              activeCards={activeCards}
              selectedCardId={selectedCardId}
              setSelectedCardId={setSelectedCardId}
              selectedCard={selectedCard}
              topUpAmount={topUpAmount}
              setTopUpAmount={setTopUpAmount}
              addTopUpQuick={addTopUpQuick}
              onConfirm={() => setConfirmCharge(true)}
              onManageCards={() => s.go('card')}
              layout="grid"
            />
          </div>
        )}

        {tab === 'send' && (
          <div className="portal-wallet-desk__send">
            <div className="portal-wallet-desk__charge-grid">
              <div className="portal-wallet-desk__charge-flow" role="group" aria-label="Send transfer">
                <WalletSendFlow
                  s={s}
                  quickActive={quickActive}
                  onQuickAction={onQuickAction}
                  canTopUpCard={canTopUpCard}
                  sendAddress={sendAddress}
                  setSendAddress={setSendAddress}
                  onScan={() => setScanOpen(true)}
                />
              </div>

              <div className="portal-wallet-desk__charge-side">
                <AmountBlock
                  label="Amount to send"
                  amount={sendAmount}
                  onChange={setSendAmount}
                  hint={sendExceeded ? `Exceeds available balance (${W.formatUsdtAmount(walletBal)} USDT)` : `Min. ${W.MIN_SEND} USDT · Available: ${W.formatUsdtAmount(walletBal)} USDT`}
                  isExceeded={sendExceeded}
                />
                <SendSummaryDesk
                  address={sendAddress}
                  sendAmount={sendAmount}
                  gasFee={W.GAS_FEE_SEND}
                />
                <WalletNotice>
                  Anytap is not responsible for transfers to incorrect addresses. Always verify before sending.
                </WalletNotice>
                <button
                  type="button"
                  className="portal-btn-primary portal-wallet-send__cta"
                  disabled={!W.isValidTronAddress(sendAddress) || !W.isValidSend(sendAmount, walletBal) || sendExceeded}
                  onClick={() => setConfirmSend(true)}>
                  Confirm Send
                </button>
              </div>
            </div>

            <ScanAddressSheet
              open={scanOpen}
              onClose={() => setScanOpen(false)}
              onScanComplete={setSendAddress}
              showToast={s.showToast}
            />
          </div>
        )}
      </div>

      {confirmCharge && selectedCard && (
        <ConfirmSheet
          title="Confirm Card Charge"
          rows={[
            { label: 'Card', value: A.maskCardShort(selectedCard.last4) },
            { label: 'Charge Amount', value: `${topUpVal.toFixed(2)} USDT`, emphasis: true },
            { label: 'Card Fee (2%)', value: `${cardFeeVal.toFixed(2)} USDT` },
            { label: 'Gas Fee', value: `${gasFeeVal.toFixed(2)} USDT` },
            { label: 'Total from Wallet', value: `${chargeTotal} USDT`, emphasis: true },
          ]}
          password={password}
          onPassword={setPassword}
          notice="Funds charged to a card cannot be reversed."
          onCancel={closeConfirm}
          onConfirm={finishCharge}
          confirmLabel="Confirm"
          loading={loading}
        />
      )}

      {confirmSend && (
        <ConfirmSheet
          title="Confirm Transfer"
          rows={[
            { label: 'To Address', value: W.maskAddress(sendAddress, 8, 4) },
            { label: 'Amount', value: `${sendVal.toFixed(2)} USDT`, danger: true },
            { label: 'Gas Fee', value: `${W.GAS_FEE_SEND.toFixed(2)} USDT` },
            { label: 'Total', value: `${(sendVal + W.GAS_FEE_SEND).toFixed(2)} USDT`, emphasis: true },
          ]}
          password={password}
          onPassword={setPassword}
          notice="Anytap is not responsible for transfers to incorrect addresses."
          onCancel={closeConfirm}
          onConfirm={finishSend}
          confirmLabel="Confirm"
          loading={loading}
          danger
        />
      )}


    </div>
  );
}
