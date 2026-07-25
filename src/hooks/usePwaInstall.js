import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PWA_ACCOUNT_DELAY_MS,
  PWA_DWELL_MS,
  canShowPwaInstallUi,
  dismissPwaPrompt,
  getPwaVisitCount,
  isAndroidDevice,
  isIosDevice,
  isMobileInstallCandidate,
  isPwaForcePreview,
  markPwaInstalled,
  recordPwaInstallRejected,
  recordPwaSiteVisit,
} from '../lib/pwa-install.js';

/**
 * @param {'marketing' | 'account'} placement
 *   marketing — 2nd visit or 30s dwell
 *   account   — logged-in dashboard, shorter delay
 */
export function usePwaInstall(placement = 'marketing', { enabled = true } = {}) {
  const [showBanner, setShowBanner] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);
  const [installing, setInstalling] = useState(false);
  const deferredRef = useRef(null);
  const eligibleRef = useRef(false);
  const dwellTimerRef = useRef(null);
  const accountTimerRef = useRef(null);

  const canPrompt = useCallback(() => {
    if (!enabled || !canShowPwaInstallUi()) return false;
    if (isPwaForcePreview()) return true;
    return Boolean(deferredRef.current || isMobileInstallCandidate());
  }, [enabled]);

  const openBannerIfEligible = useCallback(() => {
    if (!eligibleRef.current || !canPrompt()) return;
    setShowBanner(true);
  }, [canPrompt]);

  useEffect(() => {
    if (!enabled) return undefined;

    recordPwaSiteVisit();

    const onBeforeInstall = (e) => {
      e.preventDefault();
      deferredRef.current = e;
      if (eligibleRef.current) openBannerIfEligible();
    };

    const onInstalled = () => {
      markPwaInstalled();
      deferredRef.current = null;
      setShowBanner(false);
      setShowIosGuide(false);
      setShowAndroidGuide(false);
      setInstalling(false);
      setShowSuccess(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [enabled, openBannerIfEligible]);

  useEffect(() => {
    if (!enabled || !canShowPwaInstallUi()) return undefined;

    if (placement === 'account') {
      const delay = isPwaForcePreview() ? 0 : PWA_ACCOUNT_DELAY_MS;
      accountTimerRef.current = window.setTimeout(() => {
        eligibleRef.current = true;
        openBannerIfEligible();
      }, delay);
      return () => {
        if (accountTimerRef.current) clearTimeout(accountTimerRef.current);
      };
    }

    const visits = getPwaVisitCount();
    if (visits >= 2) {
      eligibleRef.current = true;
      openBannerIfEligible();
    } else {
      dwellTimerRef.current = window.setTimeout(() => {
        eligibleRef.current = true;
        openBannerIfEligible();
      }, PWA_DWELL_MS);
    }

    return () => {
      if (dwellTimerRef.current) clearTimeout(dwellTimerRef.current);
    };
  }, [enabled, placement, openBannerIfEligible]);

  const handleDismiss = useCallback(() => {
    dismissPwaPrompt();
    setShowBanner(false);
  }, []);

  const handleInstall = useCallback(async () => {
    if (isIosDevice()) {
      setShowIosGuide(true);
      return;
    }

    const deferred = deferredRef.current;
    if (!deferred) {
      if (isAndroidDevice() || isMobileInstallCandidate()) {
        setShowAndroidGuide(true);
      }
      return;
    }

    setInstalling(true);
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferredRef.current = null;
      if (outcome === 'accepted') {
        markPwaInstalled();
        setShowBanner(false);
        setShowSuccess(true);
      } else {
        recordPwaInstallRejected();
        setShowBanner(false);
      }
    } catch {
      recordPwaInstallRejected();
      setShowBanner(false);
    } finally {
      setInstalling(false);
    }
  }, []);

  const closeSuccess = useCallback(() => setShowSuccess(false), []);
  const closeIosGuide = useCallback(() => setShowIosGuide(false), []);
  const closeAndroidGuide = useCallback(() => setShowAndroidGuide(false), []);

  return {
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
  };
}
