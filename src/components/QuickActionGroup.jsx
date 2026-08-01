// ===== Quick Action Group =====
// Unified quick actions — Wallet flow (Dashboard / Wallet) vs Card flow (Card page)

import { useMemo } from 'react';
import { Icon } from './ui.jsx';

import { freezeCard, unfreezeCard } from '../lib/services/accountService.js';

/** Wallet flow: Top Up (Wallet → Card), Send, Receive (Wallet deposit) */
export const WALLET_FLOW_ACTIONS = [
  { id: 'topUp', label: 'Top Up', icon: 'flowWalletToCard', accent: true },
  { id: 'send', label: 'Send', icon: 'arrowUpRight' },
  { id: 'receive', label: 'Receive', icon: 'qr' },
];

/** Dashboard — used on legacy wallet hero only; dashboard wallet-first uses pill buttons */
export const DASHBOARD_WALLET_ACTIONS = [
  { id: 'receive', label: 'Receive', icon: 'qr' },
  { id: 'topUpCard', label: 'Top Up Card', icon: 'flowWalletToCard', accent: true },
  { id: 'sendExternal', label: 'External Wallet', icon: 'arrowUpRight' },
];

export function QuickActionGroup({
  actions,
  activeId = null,
  onAction,
  disabled = {},
  title = null,
  className = '',
  'aria-label': ariaLabel = 'Quick actions',
}) {
  return (
    <section
      className={`quick-action-group${className ? ` ${className}` : ''}`}
      aria-label={ariaLabel}>
      {title ? <h3 className="quick-action-group__title">{title}</h3> : null}
      <div
        className="quick-action-group__row"
        role="group"
        style={{ '--qa-count': actions.length }}>
        {actions.map(({ id, label, icon, accent }) => {
          const active = activeId === id;
          const isDisabled = Boolean(disabled[id]);
          return (
            <button
              key={id}
              type="button"
              className={[
                'quick-action-group__btn',
                active ? 'is-active' : '',
                accent ? 'quick-action-group__btn--accent' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => onAction?.(id)}
              disabled={isDisabled}
              aria-pressed={active}>
              <span className="quick-action-group__icon" aria-hidden="true">
                <Icon name={icon} size={21} stroke={1.75} />
              </span>
              <span className="quick-action-group__label">{label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** Dashboard wallet hero fallback */
export function DashboardWalletActionGroup({
  s,
  onTopUpCard,
  onSendExternal,
  canTopUpCard = true,
  className = '',
}) {
  const handleAction = (id) => {
    if (id === 'receive') s.openReceive?.();
    else if (id === 'topUpCard') onTopUpCard?.();
    else if (id === 'sendExternal') onSendExternal?.();
  };

  return (
    <QuickActionGroup
      actions={DASHBOARD_WALLET_ACTIONS}
      onAction={handleAction}
      disabled={{ topUpCard: !canTopUpCard }}
      className={className}
      aria-label="Wallet actions"
    />
  );
}

/** Dashboard + Wallet — same wallet-centric actions, no destination picker */
export function WalletFlowQuickActionGroup({
  s,
  activeId = null,
  onAction,
  title = null,
  className = '',
  actions = WALLET_FLOW_ACTIONS,
}) {
  const handleAction = onAction ?? ((id) => {
    if (id === 'topUp') {
      const card = s.userCards?.[s.selectedCardIndex ?? 0];
      if (card) s.openQuickTopUp?.(card);
      else s.goWallet?.('charge');
    } else if (id === 'send') s.goWallet?.('send');
    else if (id === 'receive') s.openReceive?.();
  });

  return (
    <QuickActionGroup
      actions={WALLET_FLOW_ACTIONS}
      activeId={activeId}
      onAction={handleAction}
      title={title}
      className={className}
    />
  );
}

/** @deprecated alias — use WalletFlowQuickActionGroup */
export const DashboardQuickActionGroup = WalletFlowQuickActionGroup;

/** Card page — Top Up (+ Card Info, Freeze in detail mode) */
export function CardQuickActionGroup({ s, card, activeId = null, className = '', mode = 'detail' }) {
  const isFrozen = card?.status === 'frozen';
  const canUse = card?.status === 'active' && s.cardIsActive;
  const isSummary = mode === 'summary';

  const actions = useMemo(() => {
    const base = [
      { id: 'topUp', label: 'Top Up', icon: 'creditCard', accent: true },
    ];
    if (isSummary) return base;
    return [
      ...base,
      { id: 'cardDetails', label: 'Card Info', icon: 'fileText' },
    ];
  }, [isSummary]);

  if (!card) return null;

  const disabled = {
    topUp: !canUse || isFrozen,
    cardDetails: false,
    freeze: !canUse && !isFrozen,
  };

  const handleAction = async (id) => {
    if (id === 'topUp') s.openQuickTopUp?.(card);
    else if (id === 'cardDetails') s.openCardDetails?.(card);
    else if (id === 'freeze') {
      try {
        if (isFrozen) {
          await unfreezeCard(card?.cardId || card?.id);
          s?.showToast?.('Card unfrozen successfully');
        } else {
          await freezeCard(card?.cardId || card?.id);
          s?.showToast?.('Card frozen successfully');
        }
        await s?.reloadAccount?.();
      } catch (err) {
        console.error('Failed to update card freeze status', err);
        s?.showToast?.(err?.message || 'Failed to update card status');
      }
    }
  };

  return (
    <QuickActionGroup
      actions={actions}
      activeId={activeId ?? (!isSummary && (s.showCardDetails ? 'cardDetails' : (isFrozen ? 'freeze' : null)))}
      disabled={disabled}
      onAction={handleAction}
      className={className}
    />
  );
}
