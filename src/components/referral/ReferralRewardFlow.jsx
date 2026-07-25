import { Icon } from '../ui.jsx';

const STEPS = [
  { id: 'invite', label: 'Invite Friend', icon: 'users' },
  { id: 'signup', label: 'Sign Up', icon: 'user' },
  { id: 'topup', label: 'Top Up', icon: 'wallet' },
  { id: 'reward', label: 'Reward Generated', icon: 'gift' },
  { id: 'withdraw', label: 'Withdraw', icon: 'download' },
];

export function ReferralRewardFlow() {
  return (
    <section className="portal-ref-dash__flow portal-dash-panel" aria-labelledby="referral-flow-title">
      <h2 id="referral-flow-title" className="portal-ref-dash__section-title">Reward Flow</h2>
      <div className="portal-ref-dash__flow-track">
        {STEPS.map((step, i) => (
          <div className="portal-ref-dash__flow-step-wrap" key={step.id}>
            <div className="portal-ref-dash__flow-step">
              <span className="portal-ref-dash__flow-ic" aria-hidden="true">
                <Icon name={step.icon} size={20} stroke={1.75} />
              </span>
              <span className="portal-ref-dash__flow-label">{step.label}</span>
            </div>
            {i < STEPS.length - 1 ? (
              <span className="portal-ref-dash__flow-arrow" aria-hidden="true">
                <Icon name="chevron" size={14} stroke={2} />
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
