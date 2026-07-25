import { REFERRAL_FAQ } from '../../lib/referral-mock.ts';
import { ReferralHero } from './ReferralHero.jsx';
import { ReferralCodeCard } from './ReferralCodeCard.jsx';
import { ReferralSummaryStats } from './ReferralSummaryStats.jsx';
import { ReferralRewardFlow } from './ReferralRewardFlow.jsx';
import { ReferralMembersTable } from './ReferralMembersTable.jsx';
import { ReferralEarningsChart } from './ReferralEarningsChart.jsx';
import { ReferralWithdrawal } from './ReferralWithdrawal.jsx';
import { ReferralFaq } from './ReferralFaq.jsx';

export function ReferralPartnerDashboard({ s, referral }) {
  const copy = (text, msg) => s.copy?.(text, msg);

  return (
    <div className="portal-ref-dash">
      <ReferralHero />

      <ReferralCodeCard
        code={referral.code}
        inviteLink={referral.inviteLink}
        onCopy={copy}
        onShare={() => copy(referral.inviteLink, 'Referral link copied')}
      />

      <ReferralSummaryStats referral={referral} />

      <ReferralRewardFlow />

      <ReferralEarningsChart data={referral.monthlyEarnings} />

      <ReferralMembersTable
        members={referral.memberRows}
        onShowToast={s.showToast}
      />

      <ReferralWithdrawal
        availableBalance={referral.availableBalance}
        minWithdrawalUsdt={referral.minWithdrawalUsdt}
        onWithdraw={() => s.requestReferralWithdrawal?.()}
        onViewHistory={() => s.go?.('transactions', { search: { source: 'rewards' } })}
      />

      <ReferralFaq items={REFERRAL_FAQ} />
    </div>
  );
}
