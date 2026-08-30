import { Icon } from '../ui.jsx';

/** Dashboard wallet + wallet page — Top Up Card / Send External row */
export function WalletOutboundActions({
  onTopUpCard,
  onSendExternal,
  canTopUpCard = true,
  activeTopUp = false,
  activeSend = false,
  className = '',
}) {
  return (
    <div className={`portal-dash-wf__wallet-actions${className ? ` ${className}` : ''}`}>
      <div className="portal-dash-wf__outbound" role="group" aria-label="Wallet actions">
        <button
          type="button"
          className={[
            'portal-dash-wf__outbound-btn',
            'portal-dash-wf__outbound-btn--accent',
            activeTopUp ? 'is-active' : '',
          ].filter(Boolean).join(' ')}
          onClick={() => onTopUpCard?.()}
          aria-pressed={activeTopUp}>
          <Icon name="creditCard" size={18} stroke={1.75} />
          Top Up Card
        </button>
        <button
          type="button"
          className={[
            'portal-dash-wf__outbound-btn',
            activeSend ? 'is-active' : '',
          ].filter(Boolean).join(' ')}
          onClick={() => onSendExternal?.()}
          aria-pressed={activeSend}>
          <Icon name="arrowUpRight" size={18} stroke={1.75} />
          Send External
        </button>
      </div>
    </div>
  );
}
