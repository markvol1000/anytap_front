// ===== Wallet Hero =====
// Shared balance card + dashboard wallet module
// TODO: Balance → Cregis API wallet/balance

import { useState } from 'react';
import { Icon } from './ui.jsx';
import { DashboardWalletActionGroup } from './QuickActionGroup.jsx';
import * as A from '../lib/account-data.js';
import * as W from '../utils/wallet-data.js';
import { resolveWalletBalance, resolveWalletAddress } from '../lib/api/display-data.js';

export function WalletBalanceCard({
  balance,
  address,
  label = 'Total Balance',
  onCopyAddress,
  onReceive,
  showAddressLabel = true,
  copyIconOnly = false,
  children,
  className = '',
  ariaLabel = 'Total balance',
}) {
  const [hidden, setHidden] = useState(false);

  const copyAddress = () => {
    if (!address) return;
    try { navigator.clipboard?.writeText(address); } catch { /* noop */ }
    onCopyAddress?.();
  };

  return (
    <section
      className={`portal-wallet-hero portal-wallet-balance-card${className ? ` ${className}` : ''}`}
      aria-label={ariaLabel}>
      <div className="portal-wallet-balance-card__top">
        <p className="portal-wallet-hero__label">{label}</p>
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
      <p className="portal-wallet-hero__hint">Available for card top-up & transfers</p>

      {address ? (
        <div className="portal-wallet-balance-card__addr">
            <div className="portal-wallet-balance-card__addr-body">
              {showAddressLabel ? (
                <span className="portal-wallet-balance-card__addr-label">Your USDT Address</span>
              ) : null}
              <span className="portal-wallet-balance-card__addr-value" title={address}>
                {W.maskAddress(address)}
              </span>
            </div>
            <button
              type="button"
              className={[
                'portal-wallet-balance-card__copy-btn',
                copyIconOnly ? 'portal-wallet-balance-card__copy-btn--icon' : '',
              ].filter(Boolean).join(' ')}
              onClick={copyAddress}
              aria-label="Copy wallet address">
              <Icon name="copy" size={copyIconOnly ? 18 : 14} stroke={1.75} />
              {!copyIconOnly ? 'Copy' : null}
            </button>
            {onReceive ? (
              <button
                type="button"
                className="portal-wallet-balance-card__qr-btn"
                onClick={onReceive}
                aria-label="Show wallet QR code">
                <Icon name="qr" size={18} stroke={1.75} />
              </button>
            ) : null}
        </div>
      ) : null}

      {children}
    </section>
  );
}

export function DashboardWalletHero({ s }) {
  const balance = resolveWalletBalance(s.walletBalance);
  const address = resolveWalletAddress(s.mockContext?.wallet?.address);

  return (
    <WalletBalanceCard
      balance={balance}
      address={address}
      onCopyAddress={() => s.showToast?.('Address copied')}
      onReceive={() => s.openReceive?.()}
      className="portal-dash-module portal-dash-module--wallet"
      ariaLabel="Wallet balance">
      <DashboardWalletActionGroup
        s={s}
        onTopUpCard={() => {
          const card = s.userCards?.find((c) => c.status === 'active');
          if (card) s.openQuickTopUp?.(card);
          else s.showToast?.('Apply for a card first.');
        }}
        onSendExternal={() => s.goWallet?.('send')}
        canTopUpCard={s.userCards?.some((c) => c.status === 'active')}
        className="quick-action-group--in-hero"
      />
    </WalletBalanceCard>
  );
}
