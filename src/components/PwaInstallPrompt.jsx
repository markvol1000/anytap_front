import { useEffect } from 'react';
import { Icon } from './ui.jsx';
import { usePwaInstall } from '../hooks/usePwaInstall.js';
import '../styles/pwa-install.css';

function PwaInstallBanner({ variant, onInstall, onDismiss, installing }) {
  const isInline = variant === 'inline';

  return (
    <div
      className={`pwa-install${isInline ? ' pwa-install--inline' : ' pwa-install--floating'}`}
      role="region"
      aria-label="Install Anytap">
      <div className="pwa-install__icon" aria-hidden="true">
        <img
          src="/assets/anytap-logo.png"
          alt=""
          className="pwa-install__logo"
          style={{ height: 22, width: 'auto', maxWidth: 'none' }}
        />
      </div>

      <div className="pwa-install__body">
        <div className="pwa-install__head">
          <p className="pwa-install__title">Install Anytap</p>
          <button
            type="button"
            className="pwa-install__close"
            onClick={onDismiss}
            aria-label="Dismiss">
            <Icon name="close" size={16} stroke={2} />
          </button>
        </div>
        <p className="pwa-install__desc">
          Launch faster from your Home Screen.
        </p>
        <button
          type="button"
          className="btn btn--accent btn--sm pwa-install__cta"
          onClick={onInstall}
          disabled={installing}>
          {installing ? 'Installing…' : (
            <>
              Install
              <Icon name="arrowRight" size={14} stroke={2.2} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function PwaInstallSuccessModal({ onClose }) {
  return (
    <div className="pwa-install-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="pwa-install-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-install-success-title"
        onClick={(e) => e.stopPropagation()}>
        <div className="pwa-install-modal__icon" aria-hidden="true">
          <Icon name="checkCircle" size={32} />
        </div>
        <h2 id="pwa-install-success-title" className="pwa-install-modal__title">
          Ready on your Home Screen
        </h2>
        <p className="pwa-install-modal__desc">
          Launch Anytap anytime with one tap.
        </p>
        <button type="button" className="btn btn--accent btn--lg pwa-install-modal__ok" onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
}

function PwaIosGuideModal({ onClose }) {
  return (
    <div className="pwa-install-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="pwa-install-modal pwa-install-modal--ios"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-install-ios-title"
        onClick={(e) => e.stopPropagation()}>
        <h2 id="pwa-install-ios-title" className="pwa-install-modal__title">
          Add to Home Screen
        </h2>
        <ol className="pwa-install-modal__steps">
          <li>Tap the <strong>Share</strong> button</li>
          <li>Choose <strong>Add to Home Screen</strong></li>
          <li>Tap <strong>Add</strong> to finish</li>
        </ol>
        <button type="button" className="btn btn--accent btn--lg pwa-install-modal__ok" onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
}

function PwaAndroidGuideModal({ onClose }) {
  return (
    <div className="pwa-install-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="pwa-install-modal pwa-install-modal--android"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-install-android-title"
        onClick={(e) => e.stopPropagation()}>
        <h2 id="pwa-install-android-title" className="pwa-install-modal__title">
          Install Anytap
        </h2>
        <ol className="pwa-install-modal__steps">
          <li>Tap the <strong>Install</strong> icon in the address bar</li>
          <li>Or open the browser menu → <strong>Install app</strong> / <strong>Add to Home screen</strong></li>
          <li>Confirm <strong>Install</strong></li>
        </ol>
        <button type="button" className="btn btn--accent btn--lg pwa-install-modal__ok" onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
}

/**
 * @param {'marketing' | 'account'} placement
 * @param {'floating' | 'inline'} variant
 */
export function PwaInstallPrompt({
  placement = 'marketing',
  variant = 'floating',
  enabled = true,
}) {
  const {
    showBanner,
    showSuccess,
    showIosGuide,
    showAndroidGuide,
    installing,
    handleDismiss,
    handleInstall,
    closeSuccess,
    closeIosGuide,
    closeAndroidGuide,
  } = usePwaInstall(placement, { enabled });

  useEffect(() => {
    document.body.classList.toggle('has-pwa-install-banner', showBanner && variant === 'floating');
    return () => document.body.classList.remove('has-pwa-install-banner');
  }, [showBanner, variant]);

  if (!showBanner && !showSuccess && !showIosGuide && !showAndroidGuide) return null;

  return (
    <>
      {showBanner && (
        <PwaInstallBanner
          variant={variant}
          onInstall={handleInstall}
          onDismiss={handleDismiss}
          installing={installing}
        />
      )}
      {showSuccess && <PwaInstallSuccessModal onClose={closeSuccess} />}
      {showIosGuide && <PwaIosGuideModal onClose={closeIosGuide} />}
      {showAndroidGuide && <PwaAndroidGuideModal onClose={closeAndroidGuide} />}
    </>
  );
}
