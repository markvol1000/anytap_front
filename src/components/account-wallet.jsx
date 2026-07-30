// ===== Wallet / Top-Up =====
// AccountWallet   — charge tab: USDT deposit address + QR code
//                 — send tab: send USDT (coming soon)
// ReceiveSheet    — bottom sheet for receive address (used from dashboard)
// QuickTopUpSheet — quick top-up modal triggered from card actions
// TODO: USDT deposit address → Cregis API (wallet/address endpoint)
// TODO: USDT balance → Cregis API (wallet/balance endpoint)
// TODO: Send USDT → Cregis API (wallet/transfer endpoint)

import { useEffect, useId, useState } from 'react';
import { Icon } from './ui.jsx';
import { WalletCard } from './portal/WalletCard.jsx';
import { RecentActivitySection } from './account-activity.jsx';
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
}) {
  const inputId = useId();

  return (
    <div className="portal-wallet-amt">
      <p className="portal-wallet-amt__label">{label}</p>
      <div className="portal-wallet-amt__row">
        <input
          id={inputId}
          className="portal-wallet-amt__input"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          placeholder="0"
          value={amount}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
        />
        <span className="portal-wallet-amt__unit">USDT</span>
      </div>
      {hint && <p className="portal-wallet-amt__hint">{hint}</p>}
      {onQuickAdd && (
        <div className="portal-wallet-quick-amt">
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

function TransactionSummary({ selectedCard, topUpAmount, gasFee }) {
  if (!selectedCard) return null;

  const cardBal = parseFloat(W.parseCardBalanceUsdt(selectedCard.balance)) || 0;
  const topUpVal = parseFloat(topUpAmount) || 0;
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
          <dd>{W.parseCardBalanceUsdt(selectedCard.balance)} USDT</dd>
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
          <dt>Estimated Network Fee</dt>
          <dd>{gasFee.toFixed(2)} USDT</dd>
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
  const canSubmit = W.isValidTopUp(topUpAmount) && (topUpVal + W.GAS_FEE_CHARGE <= walletBal);

  return (
    <>
      <AmountBlock
        label="Top Up Amount"
        amount={topUpAmount}
        onChange={setTopUpAmount}
        hint={`Min. ${W.MIN_TOPUP} USDT · Gas fee shown on confirmation`}
        onQuickAdd={addTopUpQuick}
      />
      <TransactionSummary
        selectedCard={selectedCard}
        topUpAmount={topUpAmount}
        gasFee={W.GAS_FEE_CHARGE}
      />
      <WalletNotice>Funds topped up to a card cannot be reversed.</WalletNotice>
      <button
        type="button"
        className={`portal-btn-primary portal-wallet-charge__cta${canSubmit ? ' is-ready' : ''}`}
        disabled={!canSubmit}
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

function ConfirmSheet({ title, rows, password, onPassword, notice, onCancel, onConfirm, confirmLabel, danger }) {
  return (
    <div className="portal-sheet" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="portal-sheet__backdrop" onClick={onCancel} aria-label="Close" />
      <div className="portal-sheet__panel portal-wallet-sheet">
        <div className="portal-sheet__head">
          <h3 className="portal-sheet__title">{title}</h3>
          <button type="button" className="portal-sheet__close" onClick={onCancel} aria-label="Close">
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
          <span className="portal-wallet-field__label">Confirm Password</span>
          <input
            className="portal-wallet-field__input"
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => onPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {notice && <WalletNotice>{notice}</WalletNotice>}
        <div className="portal-wallet-sheet__actions">
          <button type="button" className="portal-btn-secondary portal-wallet-sheet__btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={`portal-btn-primary portal-wallet-sheet__btn${danger ? ' portal-wallet-sheet__btn--danger' : ''}`}
            onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function IssuanceDepositPanel({ s, className = '' }) {
  const [systemAddress, setSystemAddress] = useState('');
  const amount = W.resolveIssuanceDepositAmount(s.accountState);

  useEffect(() => {
    fetchSystemAddress().then((addr) => {
      setSystemAddress(addr);
    });
  }, []);

  const address = s.accountState?.issuanceDepositAddress || systemAddress || W.resolveIssuanceDepositAddress(s.accountState);
  const status = s.accountState?.cardStatus;
  if (!W.showsIssuanceDepositWallet(status) || amount == null) return null;


  const paid = status === 'deposit_received' || status === 'creating';

  return (
    <section
      className={[
        'portal-issuance-deposit',
        paid ? 'portal-issuance-deposit--paid' : '',
        className,
      ].filter(Boolean).join(' ')}
      aria-label="Card issuance deposit">
      <div className="portal-issuance-deposit__head">
        <p className="portal-issuance-deposit__eyebrow">Card issuance fee</p>
        {paid ? (
          <p className="portal-issuance-deposit__badge" role="status">Payment received</p>
        ) : null}
        <h2 className="portal-issuance-deposit__title">
          {paid
            ? `Deposit confirmed · ${amount} ${W.ISSUANCE_DEPOSIT_CURRENCY}`
            : `Deposit ${amount} ${W.ISSUANCE_DEPOSIT_CURRENCY}`}
        </h2>
        <p className="portal-issuance-deposit__body">
          {paid
            ? 'Your 100 USDT issuance fee is confirmed. Card preparation is in progress — do not send again.'
            : 'Send exactly this amount via TRC-20. This deposit wallet stays visible until your card ships.'}
        </p>
      </div>

      {!paid ? (
        <div className="portal-qrbox portal-issuance-deposit__qrbox">
          <div className="portal-qr" dangerouslySetInnerHTML={{ __html: A.buildQR() }} />
          <p className="portal-issuance-deposit__qr-label">Issuance deposit address</p>
          <div className="portal-addr">{address || 'Loading system wallet...'}</div>
          <button
            type="button"
            className="portal-btn-primary portal-issuance-deposit__copy"
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

      <div className="portal-meta-row portal-issuance-deposit__meta">
        <div className="portal-meta">
          <span className="portal-meta__k">Network</span>
          <span className="portal-meta__v">
            <span className="portal-wallet-net-dot" aria-hidden="true" />
            {W.WALLET_NETWORK}
          </span>
        </div>
        <div className="portal-meta">
          <span className="portal-meta__k">Amount</span>
          <span className="portal-meta__v">{amount} {W.ISSUANCE_DEPOSIT_CURRENCY}</span>
        </div>
        <div className="portal-meta">
          <span className="portal-meta__k">Status</span>
          <span className="portal-meta__v">{paid ? 'Received' : 'Awaiting deposit'}</span>
        </div>
      </div>

      {!paid ? (
        <p className="portal-issuance-deposit__note" role="note">
          Only send USDT on TRC-20. Other networks or assets may be lost. Personal spending wallet opens after you register your card.
        </p>
      ) : null}
    </section>
  );
}

export function ReceiveSheet({ s, open, onClose }) {
  if (!open) return null;

  const address = resolveWalletAddress(s.mockContext?.wallet?.address);

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
        {s.addrLoading ? (
          <div className="portal-sk" style={{ height: 280, borderRadius: 'var(--radius-info)' }} />
        ) : (
          <>
            <div className="portal-qrbox portal-wallet-receive-qr">
              <div className="portal-qr" dangerouslySetInnerHTML={{ __html: A.buildQR() }} />
              <p className="portal-wallet-receive-qr__label">Your Deposit Address</p>
              <div className="portal-addr">{address}</div>
              <button type="button" className="portal-btn-primary portal-wallet-receive-qr__copy" onClick={() => s.copy(address, 'Address copied')}>
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

  useEffect(() => {
    if (open) setAmount('');
  }, [open, card?.id]);

  if (!open || !card) return null;

  const bal = W.parseCardBalanceUsdt(card.balance);
  const addQuick = (n) => {
    const cur = parseFloat(amount) || 0;
    setAmount(String(cur + n));
  };

  const handleConfirm = async () => {
    try {
      const topUpVal = parseFloat(amount) || 0;
      await chargeCard(topUpVal, card?.cardId || card?.id);
      s.deductWalletBalance?.(topUpVal + W.GAS_FEE_CHARGE);
      onClose();
      s.showToast('Top up complete!');
      s.refresh?.();
    } catch (err) {
      console.error('Failed to top up card', err);
      s.showToast(err?.message || 'Failed to top up card');
    }
  };

  return (
    <div className="portal-sheet" role="dialog" aria-modal="true" aria-label="Card top up">
      <button type="button" className="portal-sheet__backdrop" onClick={onClose} aria-label="Close" />
      <div className="portal-sheet__panel portal-wallet-sheet">
        <div className="portal-sheet__head">
          <h3 className="portal-sheet__title">Card Top Up</h3>
          <button type="button" className="portal-sheet__close" onClick={onClose} aria-label="Close">
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
        <AmountBlock
          label="Amount to top up"
          amount={amount}
          onChange={setAmount}
          hint={`Min. ${W.MIN_TOPUP} USDT · Gas fee shown on confirmation`}
          onQuickAdd={addQuick}
        />
        <p className="portal-wallet-quick-wallet">
          Wallet balance: <strong>{W.formatUsdtAmount(resolveWalletBalance(s.walletBalance))} USDT</strong>
        </p>
        <div className="portal-wallet-sheet__actions">
          <button type="button" className="portal-btn-secondary portal-wallet-sheet__btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="portal-btn-primary portal-wallet-sheet__btn"
            disabled={!W.isValidTopUp(amount) || (parseFloat(amount) || 0) + W.GAS_FEE_CHARGE > resolveWalletBalance(s.walletBalance)}
            onClick={handleConfirm}>
            {W.topUpCtaLabel(amount)}
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

  useEffect(() => {
    if (s.walletTab) {
      setTab(s.walletTab);
      if (s.walletTab === 'send') setQuickActive('send');
      else if (s.walletTab === 'charge') setQuickActive('topUp');
    }
  }, [s.walletTab]);

  useEffect(() => {
    if (!selectedCardId && activeCards[0]) setSelectedCardId(activeCards[0].id);
  }, [activeCards, selectedCardId]);

  const selectedCard = activeCards.find((c) => c.id === selectedCardId) ?? null;
  const topUpVal = parseFloat(topUpAmount) || 0;
  const sendVal = parseFloat(sendAmount) || 0;
  const chargeTotal = (topUpVal + W.GAS_FEE_CHARGE).toFixed(2);

  const addTopUpQuick = (n) => {
    const cur = parseFloat(topUpAmount) || 0;
    setTopUpAmount(String(cur + n));
  };

  const closeConfirm = () => {
    setConfirmCharge(false);
    setConfirmSend(false);
    setPassword('');
  };

  const finishCharge = async () => {
    try {
      await chargeCard(topUpVal, selectedCard?.cardId || selectedCard?.id);
      s.deductWalletBalance?.(topUpVal + W.GAS_FEE_CHARGE);
      closeConfirm();
      setTopUpAmount('');
      s.showToast('Card charged successfully!');
      s.refresh?.();
    } catch (err) {
      console.error('Failed to charge card', err);
      s.showToast(err?.message || 'Failed to charge card');
    }
  };

  const finishSend = async () => {
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
      s.showToast(err?.message || 'Failed to submit transfer');
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

  const walletBal = resolveWalletBalance(s.walletBalance);
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
                hint={`Min. ${W.MIN_SEND} USDT · Available: ${W.formatUsdtAmount(walletBal)} USDT`}
              />
              <WalletNotice>
                Anytap is not responsible for transfers to incorrect addresses. Always verify before sending.
              </WalletNotice>
              <button
                type="button"
                className="portal-btn-primary portal-wallet-send__cta"
                disabled={!W.isValidTronAddress(sendAddress) || !W.isValidSend(sendAmount, walletBal)}
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
                  hint={`Min. ${W.MIN_SEND} USDT · Available: ${W.formatUsdtAmount(walletBal)} USDT`}
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
                  disabled={!W.isValidTronAddress(sendAddress) || !W.isValidSend(sendAmount, walletBal)}
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
            { label: 'Gas Fee', value: `${W.GAS_FEE_CHARGE.toFixed(2)} USDT` },
            { label: 'Total from Wallet', value: `${chargeTotal} USDT`, emphasis: true },
          ]}
          password={password}
          onPassword={setPassword}
          notice="Funds charged to a card cannot be reversed."
          onCancel={closeConfirm}
          onConfirm={finishCharge}
          confirmLabel="Confirm"
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
          danger
        />
      )}

    </div>
  );
}
