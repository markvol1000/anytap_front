import { Icon } from '../ui.jsx';

function ReferralQrPlaceholder({ value }) {
  const cells = [];
  const seed = value.replace(/\W/g, '').slice(0, 16);
  for (let i = 0; i < 49; i += 1) {
    const on = (seed.charCodeAt(i % seed.length) + i) % 3 !== 0;
    cells.push(on);
  }

  return (
    <div className="portal-ref-dash__qr" aria-hidden="true">
      <div className="portal-ref-dash__qr-grid">
        {cells.map((on, i) => (
          <span key={i} className={on ? 'is-on' : ''} />
        ))}
      </div>
    </div>
  );
}

export function ReferralCodeCard({ code, inviteLink, onCopy, onShare }) {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Join Anytap', text: 'Sign up with my referral link', url: inviteLink });
        return;
      } catch { /* fall through */ }
    }
    onShare?.();
  };

  return (
    <section className="portal-ref-dash__code portal-dash-panel" aria-labelledby="referral-code-title">
      <h2 id="referral-code-title" className="portal-ref-dash__section-title">Your Referral Code</h2>

      <p className="portal-ref-dash__code-val">{code}</p>

      <div className="portal-ref-dash__code-actions">
        <button
          type="button"
          className="portal-btn-primary portal-ref-dash__code-btn"
          onClick={() => onCopy(code, 'Referral code copied')}>
          <Icon name="copy" size={16} stroke={1.75} />
          Copy
        </button>
        <button type="button" className="portal-btn-secondary portal-ref-dash__code-btn" onClick={handleShare}>
          <Icon name="share" size={16} stroke={1.75} />
          Share
        </button>
      </div>

      <div className="portal-ref-dash__code-meta">
        <ReferralQrPlaceholder value={code} />
        <div className="portal-ref-dash__link-block">
          <span className="portal-ref-dash__link-label">Referral Link</span>
          <p className="portal-ref-dash__link-val">{inviteLink}</p>
          <button
            type="button"
            className="portal-btn-secondary portal-ref-dash__link-copy"
            onClick={() => onCopy(inviteLink, 'Referral link copied')}>
            <Icon name="copy" size={14} stroke={1.75} />
            Copy link
          </button>
        </div>
      </div>
    </section>
  );
}
