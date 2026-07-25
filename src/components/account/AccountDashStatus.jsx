// Dashboard status banner — shows KYC or card status with CTA buttons
// Used in AccountCardView pre-issue states

export function AccountDashStatus({ s }) {
  const def = s.kycApproved ? s.cardStatusDef : s.kycStatusDef;
  const eyebrow = s.kycApproved ? 'Card Status' : 'Identity Verification';

  return (
    <div className="portal-dash-status">
      <span className="portal-dash-status__eyebrow">{eyebrow}</span>
      <h2 className="portal-dash-status__title">{def.label}</h2>
      <p className="portal-dash-status__msg">{def.message}</p>
      {def.submessage && <p className="portal-dash-status__sub">{def.submessage}</p>}
      {def.estimate && <p className="portal-dash-status__eta">{def.estimate}</p>}
      {(def.cta || def.secondaryCta) && (
        <div className="portal-dash-status__actions">
          {def.secondaryCta && (
            <button
              type="button"
              className="portal-btn-secondary portal-dash-status__btn"
              onClick={() => s.handleSecondaryCta(def)}>
              {def.secondaryCta}
            </button>
          )}
          {def.cta && (
            <button
              type="button"
              className="portal-btn-primary portal-dash-status__btn"
              onClick={() => s.handleStatusCta(def)}>
              {def.cta}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
