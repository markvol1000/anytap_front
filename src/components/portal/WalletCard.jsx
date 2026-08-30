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

import { CardsDesktopTransactions } from '../account-cards-desktop.jsx';

function WalletCardTransactions({ s, limit = 5, className = '' }) {
  const items = useMemo(() => {
    const raw = A.resolvePortalActivityWithHistory(s.activityItems);
    return A.sortActivityChronological(
      A.filterActivityForWalletPage(A.normalizeActivityItems(raw)),
    );
  }, [s.activityItems]);

  const handleViewAll = useCallback(() => {
    s.go?.('transactions', { search: { source: 'wallet' } });
  }, [s]);

  return (
    <div className={`portal-wallet-card__tx${className ? ` ${className}` : ''}`}>
      <CardsDesktopTransactions
        items={s.activityItems}
        pageFilter="wallet"
        onViewAll={handleViewAll}
        title="Recent Transactions"
        limit={limit}
      />
    </div>
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
    const activeCards = (s.userCards ?? []).filter((c) => ['active', 'frozen', 'shipping'].includes(c.status));
    if (activeCards.length === 0) {
      s.showToast?.('Please apply for and activate a card first.', 'error');
      s.go?.('cardApply');
      return;
    }
    if (s.openCardPickModal) {
      s.openCardPickModal();
      return;
    }
    if (activeCards[0] && s.openQuickTopUp) {
      s.openQuickTopUp(activeCards[0]);
      return;
    }
    if (onQuickAction) onQuickAction('topUp');
    else s.goWallet?.('charge');
  };

  const handleSendExternal = () => {
    if (onQuickAction) onQuickAction('send');
    else s.goWallet?.('send');

    setTimeout(() => {
      const destInput = document.querySelector('.portal-wallet-dest__input') || document.querySelector('textarea');
      if (destInput) {
        destInput.focus();
        destInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 80);
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
