export function ReferralWithdrawal({ availableBalance, minWithdrawalUsdt, onWithdraw, onViewHistory }) {
  return (
    <section className="portal-ref-dash__withdraw portal-dash-panel" aria-labelledby="referral-withdraw-title">
      <h2 id="referral-withdraw-title" className="portal-ref-dash__section-title">Withdrawal</h2>

      <dl className="portal-ref-dash__withdraw-stats">
        <div className="portal-ref-dash__withdraw-row">
          <dt>Available</dt>
          <dd>{Number(availableBalance).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} USDT</dd>
        </div>
        <div className="portal-ref-dash__withdraw-row">
          <dt>Minimum Withdrawal</dt>
          <dd>{minWithdrawalUsdt} USDT</dd>
        </div>
      </dl>

      <div className="portal-ref-dash__withdraw-actions">
        <button
          type="button"
          className="portal-btn-primary"
          disabled={Number(availableBalance) < Number(minWithdrawalUsdt)}
          onClick={onWithdraw}>
          Withdraw Rewards
        </button>
        <button type="button" className="portal-btn-secondary" onClick={onViewHistory}>
          View History
        </button>
      </div>
    </section>
  );
}
