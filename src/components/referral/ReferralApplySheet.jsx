import { Icon } from '../ui.jsx';
import { REFERRAL_BENEFITS } from '../../lib/referral-mock.ts';
import { resolveFeatureIcon } from '../../utils/feature-icons.js';

function BenefitIcon({ name, size = 20 }) {
  const IconComponent = resolveFeatureIcon(name);
  if (!IconComponent) return null;
  return <IconComponent size={size} weight="duotone" aria-hidden="true" />;
}

export function ReferralApplySheet({ open, onClose, onApply, applying = false }) {
  if (!open) return null;

  return (
    <div className="portal-sheet" role="dialog" aria-modal="true" aria-label="Referral partner application">
      <button type="button" className="portal-sheet__backdrop" onClick={onClose} aria-label="Close" />
      <div className="portal-sheet__panel portal-wallet-sheet portal-ref-apply-sheet">
        <div className="portal-sheet__head">
          <h3 className="portal-sheet__title">Referral Partner Program</h3>
          <button type="button" className="portal-sheet__close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>

        <p className="portal-wallet-sheet__sub">
          Apply to become a referral partner and earn commissions when your network tops up their cards.
        </p>

        <ul className="portal-ref-benefits portal-ref-apply-sheet__benefits">
          {REFERRAL_BENEFITS.map((benefit) => (
            <li className="portal-ref-benefits__item" key={benefit.title}>
              <span className="portal-ref-benefits__ic" aria-hidden="true">
                <BenefitIcon name={benefit.icon} />
              </span>
              <div>
                <strong className="portal-ref-benefits__title">{benefit.title}</strong>
                <p className="portal-ref-benefits__desc">{benefit.description}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="portal-wallet-sheet__actions portal-wallet-sheet__actions--stack">
          <button
            type="button"
            className="portal-btn-primary portal-wallet-sheet__btn"
            disabled={applying}
            onClick={onApply}>
            {applying ? 'Submitting…' : 'Apply Now'}
            {!applying ? <Icon name="arrowRight" size={16} stroke={2} /> : null}
          </button>
          <button
            type="button"
            className="portal-btn-secondary portal-wallet-sheet__btn"
            onClick={onClose}
            disabled={applying}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
