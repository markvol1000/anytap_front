import { Icon } from '../ui.jsx';

function formatUsdt(n) {
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function StatCard({ label, value, unit, accent }) {
  return (
    <article className={`portal-ref-dash__stat${accent ? ' portal-ref-dash__stat--accent' : ''}`}>
      <span className="portal-ref-dash__stat-label">{label}</span>
      <p className="portal-ref-dash__stat-val">
        {value}
        {unit ? <span className="portal-ref-dash__stat-unit">{unit}</span> : null}
      </p>
    </article>
  );
}

export function ReferralSummaryStats({ referral }) {
  const totalReferrals = referral.statistics?.totalInvites ?? referral.memberRows?.length ?? 0;

  return (
    <section className="portal-ref-dash__summary" aria-label="Referral summary">
      <StatCard
        label="Total Earnings"
        value={formatUsdt(referral.totalEarnings ?? 0)}
        unit=" USDT"
      />
      <StatCard
        label="Available Balance"
        value={formatUsdt(referral.availableBalance ?? 0)}
        unit=" USDT"
        accent
      />
      <StatCard
        label="Pending Rewards"
        value={formatUsdt(referral.pendingBalance ?? 0)}
        unit=" USDT"
      />
      <StatCard
        label="Total Referrals"
        value={String(totalReferrals)}
      />
    </section>
  );
}
