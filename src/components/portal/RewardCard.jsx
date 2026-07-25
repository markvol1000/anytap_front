// ===== RewardCard — shared Referral / Rewards object (summary | detail) =====

import { Icon } from '../ui.jsx';
import { RecentActivitySection } from '../account-activity.jsx';
import * as A from '../../lib/account-data.js';
import * as W from '../../utils/wallet-data.js';

function formatUsd(amount) {
  return `$${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function networkInitial(name) {
  const trimmed = (name ?? '').trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
}

function RewardCardShell({ earnings, isPartner, isPending, onDetails, children }) {
  const sub = isPartner
    ? 'Available rewards'
    : isPending
      ? 'Application under review'
      : 'Become a referral partner';

  const ctaLabel = isPartner ? 'View Rewards' : isPending ? 'View application' : 'Referral Program';

  return (
    <section className="portal-reward-card__shell" aria-label="Rewards">
      <div className="portal-reward-card__head">
        <div className="portal-reward-card__head-main">
          <span className="portal-reward-card__icon" aria-hidden="true">
            <Icon name="trophy" size={18} stroke={1.75} />
          </span>
          <div>
            <h2 className="portal-reward-card__title">Rewards</h2>
            <p className="portal-reward-card__sub">{sub}</p>
          </div>
        </div>
        <button type="button" className="portal-reward-card__details" onClick={onDetails}>
          Details
        </button>
      </div>

      <div className="portal-reward-card__metrics" role="group" aria-label="Reward summary">
        <div className="portal-reward-card__metric portal-reward-card__metric--primary">
          <span className="portal-reward-card__metric-label">Available Rewards</span>
          <span className="portal-reward-card__metric-val">
            {W.formatUsdtAmount(earnings.balance)}
            <span className="portal-reward-card__metric-unit"> USDT</span>
          </span>
        </div>
        <div className="portal-reward-card__metric">
          <span className="portal-reward-card__metric-label">Today&apos;s Reward</span>
          <span className="portal-reward-card__metric-val portal-reward-card__metric-val--today">
            {formatUsd(earnings.today)}
          </span>
        </div>
      </div>

      {children}

      <button type="button" className="portal-reward-card__cta" onClick={onDetails}>
        {ctaLabel}
        <Icon name="arrowRight" size={16} stroke={2} />
      </button>
    </section>
  );
}

function RewardCardNetwork({ referral, isPartner, onDetails }) {
  const networkItems = A.getReferralNetworkPreview(referral);
  const isPending = referral?.isPending;
  const networkEmpty = isPending
    ? 'Earnings appear after your partner application is approved.'
    : 'Apply to become a referral partner and start earning.';

  return (
    <>
      <div className="portal-reward-card__network-head">
        <span className="portal-reward-card__network-label">Network</span>
        {isPartner ? (
          <button type="button" className="portal-reward-card__network-all" onClick={onDetails}>
            View all
          </button>
        ) : null}
      </div>

      {networkItems.length ? (
        <ul className="portal-reward-card__network-list">
          {networkItems.map((item) => (
            <li key={item.id} className="portal-reward-card__network-item">
              <span className="portal-reward-card__avatar" aria-hidden="true">
                {networkInitial(item.memberName)}
              </span>
              <div className="portal-reward-card__network-main">
                <span className="portal-reward-card__network-name">{item.memberName}</span>
                <span className="portal-reward-card__network-topup">
                  <Icon name="arrowUp" size={12} stroke={2.5} />
                  {item.topUpUsdt.toLocaleString('en-US')} USDT
                </span>
              </div>
              <div className="portal-reward-card__network-reward">
                <span className="portal-reward-card__network-amt">+${item.reward.toFixed(2)}</span>
                <span className="portal-reward-card__network-date">{item.date}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="portal-reward-card__network-empty">{networkEmpty}</p>
      )}
    </>
  );
}

function RewardCardDetailSections({ s, referral }) {
  const stats = referral.statistics;

  return (
    <div className="portal-reward-card__detail-sections">
      <section className="portal-page-section">
        <h2 className="portal-dash-section__title">Your referral code</h2>
        <div className="portal-refcode">
          <span className="portal-refcode__val">{referral.code}</span>
          <button
            type="button"
            className="portal-btn-primary portal-refcode__copy"
            onClick={() => s.copy(referral.code, 'Referral code copied')}>
            Copy
          </button>
        </div>
      </section>

      <section className="portal-page-section">
        <h2 className="portal-dash-section__title">Invite link</h2>
        <div className="portal-ref-link">
          <span className="portal-ref-link__val">{referral.inviteLink}</span>
          <button
            type="button"
            className="portal-btn-secondary portal-ref-link__copy"
            onClick={() => s.copy(referral.inviteLink, 'Invite link copied')}>
            Copy link
          </button>
        </div>
      </section>

      <section className="portal-page-section">
        <h2 className="portal-dash-section__title">Withdraw</h2>
        <div className="portal-ref-earnings">
          <div className="portal-ref-earnings__row portal-ref-earnings__row--highlight">
            <span className="portal-ref-earnings__label">Available balance</span>
            <span className="portal-ref-earnings__val">{formatUsd(referral.availableBalance)}</span>
          </div>
        </div>
        <button
          type="button"
          className="portal-btn-primary portal-ref-withdraw__btn"
          onClick={() => s.requestReferralWithdrawal?.()}>
          Withdraw
        </button>
        <p className="portal-ref-withdraw__hint">Minimum withdrawal $50 USDT · Reviewed within 2 business days</p>
      </section>

      {stats && (
        <section className="portal-page-section">
          <h2 className="portal-dash-section__title">Statistics</h2>
          <dl className="portal-ref-stats">
            <div className="portal-ref-stats__row">
              <dt>Invited members</dt>
              <dd>{stats.totalInvites}</dd>
            </div>
            <div className="portal-ref-stats__row">
              <dt>Active members</dt>
              <dd>{stats.activeMembers}</dd>
            </div>
            <div className="portal-ref-stats__row">
              <dt>Conversion rate</dt>
              <dd>{stats.conversionRate}</dd>
            </div>
            <div className="portal-ref-stats__row">
              <dt>This month</dt>
              <dd>{formatUsd(stats.monthlyEarnings)}</dd>
            </div>
          </dl>
        </section>
      )}

      {referral.invitedMembers.length > 0 && (
        <section className="portal-page-section">
          <h2 className="portal-dash-section__title">Referral list</h2>
          <ul className="portal-ref-members">
            {referral.invitedMembers.map((m) => (
              <li className="portal-ref-members__item" key={m.id}>
                <div className="portal-ref-members__main">
                  <span className="portal-ref-members__name">{m.name}</span>
                  <span className="portal-ref-members__date">Joined {m.joinedAt}</span>
                </div>
                <div className="portal-ref-members__meta">
                  <span className={`portal-ref-members__status portal-ref-members__status--${m.status}`}>
                    {m.status === 'active' ? 'Active' : 'Pending'}
                  </span>
                  <span className="portal-ref-members__earned">{formatUsd(m.earned)}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <RecentActivitySection
        title="Reward history"
        items={A.resolvePortalActivityWithHistory(s.activityItems)}
        pageFilter="rewards"
        limit={10}
        className="portal-ref-reward-activity"
        onItemClick={() => s.go('transactions', { search: { source: 'rewards' } })}
        onViewAll={() => s.go('transactions', { search: { source: 'rewards' } })}
        viewAllLabel="View all rewards →"
        emptyTitle="No reward activity yet"
        emptyMsg="Referral commissions and withdrawals will appear here."
        emptyIcon="gift"
      />
    </div>
  );
}

export function RewardCard({ mode = 'summary', s, className = '' }) {
  const referral = s.referralContext;
  const earnings = A.getReferralDashboardEarnings(referral);
  const isPartner = referral?.isPartner;
  const isPending = referral?.isPending;
  const goReferral = () => s.go?.('referral');

  if (mode === 'detail' && isPartner) {
    return (
      <div className={`portal-reward-card portal-reward-card--detail${className ? ` ${className}` : ''}`}>
        <RewardCardShell
          earnings={earnings}
          isPartner={isPartner}
          isPending={isPending}
          onDetails={goReferral}>
          <RewardCardNetwork referral={referral} isPartner={isPartner} onDetails={goReferral} />
        </RewardCardShell>
        <RewardCardDetailSections s={s} referral={referral} />
      </div>
    );
  }

  return (
    <div className={`portal-reward-card portal-reward-card--${mode}${className ? ` ${className}` : ''}`}>
      <RewardCardShell
        earnings={earnings}
        isPartner={isPartner}
        isPending={isPending}
        onDetails={goReferral}>
        {mode === 'summary' ? (
          <RewardCardNetwork referral={referral} isPartner={isPartner} onDetails={goReferral} />
        ) : null}
      </RewardCardShell>
    </div>
  );
}
