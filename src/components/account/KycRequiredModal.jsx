import { PortalButton } from '../portal/PortalButton';

/**
 * Modal when a locked nav/page is opened before KYC is complete.
 */
export function KycRequiredModal({ open, pending = false, onClose, onVerify }) {
  if (!open) return null;

  const title = pending ? 'Verification in progress' : 'Verify your identity';
  const body = pending
    ? 'Your identity documents are under review. Profile, cards, and wallet unlock after KYC is approved.'
    : 'Complete identity verification to open this page. It only takes a few minutes.';

  return (
    <div className="portal-sheet" role="dialog" aria-modal="true" aria-labelledby="kyc-required-title">
      <button type="button" className="portal-sheet__backdrop" onClick={onClose} aria-label="Close" />
      <div className="portal-sheet__panel portal-wallet-sheet" style={{ maxWidth: 400 }}>
        <div className="portal-sheet__head">
          <h3 id="kyc-required-title" className="portal-sheet__title">
            {title}
          </h3>
          <button type="button" className="portal-sheet__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className="portal-wallet-sheet__lede" style={{ margin: '0 0 20px', fontSize: 14, lineHeight: 1.5, color: 'var(--fg-muted)' }}>
          {body}
        </p>
        {pending ? (
          <PortalButton variant="primary" className="portal-wallet-sheet__submit" onClick={onClose} style={{ width: '100%' }}>
            Got it
          </PortalButton>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <PortalButton variant="primary" className="portal-wallet-sheet__submit" onClick={onVerify} style={{ width: '100%' }}>
              Verify Identity
            </PortalButton>
            <PortalButton variant="secondary" onClick={onClose} style={{ width: '100%' }}>
              Not now
            </PortalButton>
          </div>
        )}
      </div>
    </div>
  );
}
