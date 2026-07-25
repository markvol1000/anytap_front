import { PortalButton } from '../portal/PortalButton';

/**
 * Modal when the user tries to start KYC while review is already in progress.
 */
export function KycInProgressModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="portal-sheet" role="dialog" aria-modal="true" aria-labelledby="kyc-in-progress-title">
      <button type="button" className="portal-sheet__backdrop" onClick={onClose} aria-label="Close" />
      <div className="portal-sheet__panel portal-wallet-sheet" style={{ maxWidth: 400 }}>
        <div className="portal-sheet__head">
          <h3 id="kyc-in-progress-title" className="portal-sheet__title">
            Verification in progress
          </h3>
          <button type="button" className="portal-sheet__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className="portal-wallet-sheet__lede" style={{ margin: '0 0 20px', fontSize: 14, lineHeight: 1.5, color: 'var(--fg-muted)' }}>
          Your identity documents are already under review. Please wait for the result — you will be notified when KYC is complete.
        </p>
        <PortalButton variant="primary" className="portal-wallet-sheet__submit" onClick={onClose} style={{ width: '100%' }}>
          Got it
        </PortalButton>
      </div>
    </div>
  );
}
