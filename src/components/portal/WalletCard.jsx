// ===== WalletCard — shared Wallet object (summary | detail) =====
// Same layout, buttons, and styling everywhere; mode controls information density only.

import { useCallback, useMemo, useState } from 'react';
import { Icon } from '../ui.jsx';
import { WalletOutboundActions } from './WalletOutboundActions.jsx';
import { DashboardActivityRow } from '../account-activity.jsx';
import { TransactionDetailsDrawer } from '../account-transactions.jsx';
import * as A from '../../lib/account-data.js';
import * as W from '../../utils/wallet-data.js';
import { resolveWalletBalance, resolveWalletAddress } from '../../lib/api/display-data.js';

function WalletCardTransactions({ s, limit, className = '' }) {
  const [selectedTx, setSelectedTx] = useState(null);
  const [copiedTxId, setCopiedTxId] = useState('');

  const items = useMemo(() => {
    const raw = A.resolvePortalActivityWithHistory(s.activityItems);
    return A.sortActivityChronological(
      A.filterActivityForWalletPage(A.normalizeActivityItems(raw)),
    ).slice(0, limit);
  }, [s.activityItems, limit]);

  const handleCopyTxId = useCallback((txId) => {
    try { navigator.clipboard?.writeText(txId); } catch { /* noop */ }
    setCopiedTxId(txId);
    window.setTimeout(() => setCopiedTxId(''), 2000);
  }, []);

  return (
    <>
      <div className={`portal-wallet-card__tx${className ? ` ${className}` : ''}`}>
        <div className="portal-wallet-card__tx-head">
          <h3 className="portal-wallet-card__tx-title">Recent Transactions</h3>
          {limit <= 3 ? (
            <button type="button" className="portal-wallet-card__tx-link" onClick={() => s.go?.('transactions', { search: { source: 'wallet' } })}>
              View all
            </button>
          ) : null}
        </div>
        <div className="portal-wallet-card__tx-list">
          {items.length ? items.map((tx) => (
            <DashboardActivityRow key={tx.id} tx={tx} onClick={() => setSelectedTx(tx)} />
          )) : (
            <p className="portal-wallet-card__tx-empty">No wallet transactions yet.</p>
          )}
        </div>
      </div>

      <TransactionDetailsDrawer
        tx={selectedTx}
        onClose={() => setSelectedTx(null)}
        onCopyTxId={handleCopyTxId}
        copyState={copiedTxId}
      />
    </>
  );
}

export function WalletCard({
  mode = 'summary',
  s,
  activeId = null,
  onQuickAction,
  canTopUpCard = true,
  className = '',
  children,
}) {
  const isDetail = mode === 'detail';
  const [hidden, setHidden] = useState(false);
  const balance = resolveWalletBalance(s.walletBalance);
  const address = resolveWalletAddress(s.mockContext?.wallet?.address);

  const copyAddress = () => {
    if (!address) return;
    try { navigator.clipboard?.writeText(address); } catch { /* noop */ }
    s.showToast?.('Address copied');
  };

  const handleReceive = () => {
    s.openReceive?.();
  };

  const handleTopUpCard = () => {
    if (onQuickAction) onQuickAction('topUp');
    else s.goWallet?.('charge');
  };

  const handleSendExternal = () => {
    if (onQuickAction) onQuickAction('send');
    else s.goWallet?.('send');
  };

  return (
    <div className={`portal-wallet-card portal-wallet-card--${mode}${className ? ` ${className}` : ''}`}>
      <section
        className="portal-wallet-hero portal-wallet-balance-card portal-wallet-card__shell"
        aria-label="Wallet balance">
        <div className="portal-wallet-balance-card__top">
          <p className="portal-wallet-hero__label">Wallet Balance</p>
          <button
            type="button"
            className="portal-wallet-hero__eye portal-wallet-balance-card__eye"
            onClick={() => setHidden((v) => !v)}
            aria-label={hidden ? 'Show balance' : 'Hide balance'}
            aria-pressed={hidden}>
            <Icon name={hidden ? 'eyeOff' : 'eye'} size={18} stroke={1.75} />
          </button>
        </div>
        <p className="portal-wallet-hero__amount">
          {W.formatUsdtAmount(balance, { hidden })}
          <span className="portal-wallet-hero__unit"> USDT</span>
        </p>
        <p className="portal-wallet-hero__hint">{W.formatUsdApprox(balance, { hidden })}</p>
        <p className="portal-wallet-hero__hint portal-wallet-card__hint-sub">
          Available for card top-up &amp; transfers
        </p>

        {address ? (
          <div className="portal-wallet-balance-card__addr">
              <div className="portal-wallet-balance-card__addr-body">
                <span className="portal-wallet-balance-card__addr-label">Wallet Address</span>
                <span className="portal-wallet-balance-card__addr-value" title={address}>
                  {W.maskAddress(address)}
                </span>
              </div>
              <button
                type="button"
                className="portal-wallet-balance-card__copy-btn portal-wallet-balance-card__copy-btn--icon"
                onClick={copyAddress}
                aria-label="Copy wallet address">
                <Icon name="copy" size={18} stroke={1.75} />
              </button>
              <button
                type="button"
                className="portal-wallet-balance-card__qr-btn"
                onClick={handleReceive}
                aria-label="Show wallet QR code">
                <Icon name="qr" size={18} stroke={1.75} />
              </button>
            </div>
        ) : null}

        <WalletOutboundActions
          onTopUpCard={handleTopUpCard}
          onSendExternal={handleSendExternal}
          canTopUpCard={canTopUpCard}
          activeTopUp={activeId === 'topUp'}
          activeSend={activeId === 'send'}
        />
      </section>

      {children}

      {isDetail ? (
        <WalletCardTransactions
          s={s}
          limit={10}
          className="portal-wallet-card__tx--detail"
        />
      ) : null}
    </div>
  );
}
