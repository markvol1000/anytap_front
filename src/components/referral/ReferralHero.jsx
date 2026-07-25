import { Icon } from '../ui.jsx';

function NetworkIllustration() {
  return (
    <svg
      className="portal-ref-dash__hero-art"
      viewBox="0 0 320 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true">
      <circle cx="160" cy="120" r="88" stroke="rgba(255,85,0,0.12)" strokeWidth="1.5" />
      <circle cx="160" cy="120" r="56" stroke="rgba(255,85,0,0.18)" strokeWidth="1.5" />
      <circle cx="160" cy="48" r="18" fill="#fff" stroke="rgba(255,85,0,0.35)" strokeWidth="1.5" />
      <circle cx="88" cy="152" r="14" fill="#fff" stroke="rgba(26,26,26,0.12)" strokeWidth="1.5" />
      <circle cx="232" cy="152" r="14" fill="#fff" stroke="rgba(26,26,26,0.12)" strokeWidth="1.5" />
      <circle cx="112" cy="72" r="10" fill="#fff" stroke="rgba(26,26,26,0.1)" strokeWidth="1.5" />
      <circle cx="208" cy="72" r="10" fill="#fff" stroke="rgba(26,26,26,0.1)" strokeWidth="1.5" />
      <circle cx="160" cy="188" r="12" fill="rgba(255,85,0,0.12)" stroke="rgba(255,85,0,0.4)" strokeWidth="1.5" />
      <line x1="160" y1="66" x2="160" y2="176" stroke="rgba(255,85,0,0.2)" strokeWidth="1" />
      <line x1="160" y1="66" x2="112" y2="78" stroke="rgba(26,26,26,0.08)" strokeWidth="1" />
      <line x1="160" y1="66" x2="208" y2="78" stroke="rgba(26,26,26,0.08)" strokeWidth="1" />
      <line x1="160" y1="120" x2="96" y2="148" stroke="rgba(26,26,26,0.08)" strokeWidth="1" />
      <line x1="160" y1="120" x2="224" y2="148" stroke="rgba(26,26,26,0.08)" strokeWidth="1" />
      <polyline
        points="24,200 56,168 96,184 136,140 176,160 216,120 256,132 296,96"
        stroke="var(--brand-primary, #ff5500)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      />
      <circle cx="296" cy="96" r="4" fill="var(--brand-primary, #ff5500)" />
    </svg>
  );
}

export function ReferralHero() {
  return (
    <section className="portal-ref-dash__hero portal-dash-panel" aria-labelledby="referral-hero-title">
      <div className="portal-ref-dash__hero-copy">
        <p className="portal-ref-dash__eyebrow">Referral Partner</p>
        <h1 id="referral-hero-title" className="portal-ref-dash__hero-title">Refer &amp; Earn</h1>
        <p className="portal-ref-dash__hero-lead">
          Invite members.
          <br />
          Earn rewards every time they top up.
        </p>
      </div>
      <div className="portal-ref-dash__hero-visual">
        <NetworkIllustration />
      </div>
    </section>
  );
}

export function ReferralHeroIntro({ onApply }) {
  return (
    <section className="portal-ref-dash__hero portal-ref-dash__hero--intro portal-dash-panel">
      <div className="portal-ref-dash__hero-copy">
        <p className="portal-ref-dash__eyebrow">Referral Partner Program</p>
        <h1 className="portal-ref-dash__hero-title">Refer &amp; Earn</h1>
        <p className="portal-ref-dash__hero-lead">
          Invite members.
          <br />
          Earn rewards every time they top up.
        </p>
        <button type="button" className="portal-btn-primary portal-ref-dash__hero-cta" onClick={onApply}>
          Apply for Partner Access
          <Icon name="arrowRight" size={16} stroke={2} />
        </button>
      </div>
      <div className="portal-ref-dash__hero-visual">
        <NetworkIllustration />
      </div>
    </section>
  );
}
