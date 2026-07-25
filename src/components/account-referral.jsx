import { resolveStepIcon } from '../utils/step-icon.js';
import { REFERRAL_BENEFITS } from '../lib/referral-mock.ts';
import { resolveFeatureIcon } from '../utils/feature-icons.js';
import { ReferralHeroIntro } from './referral/ReferralHero.jsx';
import { ReferralPartnerDashboard } from './referral/ReferralPartnerDashboard.jsx';
import '../styles/referral-dashboard.css';

function FeatureIcon({ name, size = 22 }) {
  const IconComponent = resolveFeatureIcon(name);
  if (!IconComponent) return null;
  return <IconComponent size={size} weight="duotone" aria-hidden="true" />;
}

function ReferralIntro({ onApply }) {
  return (
    <div className="portal-ref-dash portal-ref-dash--intro">
      <ReferralHeroIntro onApply={onApply} />

      <section className="portal-ref-dash__benefits portal-dash-panel">
        <h2 className="portal-ref-dash__section-title">Why become a partner</h2>
        <ul className="portal-ref-benefits">
          {REFERRAL_BENEFITS.map((b) => (
            <li className="portal-ref-benefits__item" key={b.title}>
              <span className="portal-ref-benefits__ic" aria-hidden="true">
                <FeatureIcon name={b.icon} />
              </span>
              <div>
                <strong className="portal-ref-benefits__title">{b.title}</strong>
                <p className="portal-ref-benefits__desc">{b.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ReferralPending({ submittedAt }) {
  const submittedLabel = submittedAt
    ? new Date(submittedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;
  const PendingIcon = resolveStepIcon({ title: 'Under Review' });

  return (
    <div className="portal-ref-dash portal-ref-dash--pending">
      <section className="portal-ref-pending portal-dash-panel">
        <div className="portal-ref-pending__badge" aria-hidden="true">
          <PendingIcon size={28} weight="duotone" aria-hidden="true" />
        </div>
        <h2 className="portal-ref-pending__title">Application submitted</h2>
        <p className="portal-ref-pending__status">Status: Under Review</p>
        {submittedLabel && (
          <p className="portal-ref-pending__date">Submitted {submittedLabel}</p>
        )}
        <p className="portal-page-section__lead">
          Thank you for applying to the Anytap Referral Partner Program. Our team is reviewing your
          application and will notify you by email once a decision is made.
        </p>
        <p className="portal-ref-pending__eta">Typical review time: 1–3 business days</p>
      </section>
    </div>
  );
}

export function AccountReferral({ s }) {
  const referral = s.referralContext;

  return (
    <div className="portal-page portal-page--unified portal-ref-page">
      {referral.isNormalMember && (
        <ReferralIntro onApply={() => s.applyReferralPartner?.()} />
      )}
      {referral.isPending && (
        <ReferralPending submittedAt={referral.applicationSubmittedAt} />
      )}
      {referral.isPartner && (
        <ReferralPartnerDashboard s={s} referral={referral} />
      )}
    </div>
  );
}
