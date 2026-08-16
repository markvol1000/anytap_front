import { getReferralContext } from '../lib/referral-context.js';
import { ReferralPartnerDashboard } from './referral/ReferralPartnerDashboard.jsx';
import '../styles/referral-dashboard.css';

export function AccountReferral({ s = {} }) {
  // Use real backend DB referral context when available
  const referral = s?.remoteReferral || s?.referralContext || getReferralContext('referralApproved');

  return (
    <div className="portal-page portal-page--unified portal-ref-page">
      <ReferralPartnerDashboard s={s} referral={referral} />
    </div>
  );
}
