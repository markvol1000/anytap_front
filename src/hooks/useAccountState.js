// ===== useAccountState =====
// Central state hook for the account portal.
// Manages card lifecycle, navigation, wallet, modals, toasts.
// TODO: Replace all mock context with real API calls (Supabase + Wasabi + Cregis)

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { isHttpApi } from '../lib/api/config.js';
import { loadAccountContext, loadReferralContext, submitKycApplication as submitKycApplicationApi, submitCardApplication as submitCardApplicationApi } from '../lib/services/accountService.js';
import { fetchCardTransactions } from '../lib/services/account/accountApi.js';
import { getHttpSession, hasHttpSession } from '../lib/api/httpSession.js';
import { resolveWalletAddress } from '../lib/api/display-data.js';
import * as A from '../lib/account-data.js';
import { clearMockSession, clearAdminSession, attemptLogout } from '../lib/services/authService.js';
import { hasCompletedKycProfile } from '../lib/member-profile.js';
import { sanitizeToastMessage } from '../utils/toast-sanitizer.js';

export function useAccountState() {
  const navigate = useNavigate();
  const location = useLocation();
  const screen = A.pathToScreen(location.pathname);
  const timers = useRef({});
  const skipDetailsResetRef = useRef(false);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [homeLoading, setHomeLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [tempDeduct, setTempDeduct] = useState(0);

  // ── Card state ────────────────────────────────────────────────────────────
  const [cardTab, setCardTab] = useState('virtual');
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [isCardDetailVerified, setIsCardDetailVerified] = useState(false);
  const [showCvv, setShowCvv] = useState(false);
  const [verifyCodeSent, setVerifyCodeSent] = useState(false);

  // ── Wallet / top-up state ─────────────────────────────────────────────────
  const [addrLoading, setAddrLoading] = useState(true);
  const [walletTab, setWalletTab] = useState('charge');
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [quickTopUpCard, setQuickTopUpCard] = useState(null);
  const [activePhysicalCardOpen, setActivePhysicalCardOpen] = useState(false);
  const [activePhysicalTargetCard, setActivePhysicalTargetCard] = useState(null);

  const openActivePhysical = useCallback((card) => {
    setActivePhysicalTargetCard(card);
    setActivePhysicalCardOpen(true);
  }, []);
  const closeActivePhysical = useCallback(() => {
    setActivePhysicalCardOpen(false);
    setActivePhysicalTargetCard(null);
  }, []);

  // ── Dev/mock scenario ─────────────────────────────────────────────────────
  // TODO: Remove scenarioKey entirely when real auth/API is wired
  const [scenarioKey, setScenarioKey] = useState(() => A.scenarioForMockSession());
  const [referralStateKey, setReferralStateKey] = useState('normalMember');
  const [remoteContext, setRemoteContext] = useState(null);
  const [remoteReferral, setRemoteReferral] = useState(null);
  const [remoteLoading, setRemoteLoading] = useState(() => isHttpApi && hasHttpSession());

  useEffect(() => {
    setTempDeduct(0);
  }, [remoteContext]);

  const [profileTick, setProfileTick] = useState(0);
  const [kycGateOpen, setKycGateOpen] = useState(false);

  useEffect(() => {
    const bumpProfile = () => setProfileTick((t) => t + 1);
    window.addEventListener('anytap-member-profile', bumpProfile);
    return () => window.removeEventListener('anytap-member-profile', bumpProfile);
  }, []);

  useEffect(() => {
    if (!isHttpApi) return undefined;
    let cancelled = false;
    let loadGeneration = 0;
    let inFlight = false;
    let queued = false;

    const load = async () => {
      if (inFlight) {
        queued = true;
        return;
      }
      inFlight = true;
      queued = false;
      const generation = ++loadGeneration;
      if (!hasHttpSession()) {
        if (!cancelled && generation === loadGeneration) {
          setRemoteContext(null);
          setRemoteReferral(null);
          setRemoteLoading(false);
        }
        inFlight = false;
        if (queued && !cancelled) load();
        return;
      }
      if (!cancelled) setRemoteLoading(true);
      try {
        const [accountCtx, referralCtx] = await Promise.all([
          loadAccountContext(),
          loadReferralContext(),
        ]);
        if (!cancelled && generation === loadGeneration) {
          setRemoteContext(accountCtx);
          setRemoteReferral(referralCtx);
        }
      } catch (err) {
        if (err?.message === 'Not authenticated') {
          /* session cleared mid-load */
        } else {
          console.error('[account] remote context load failed', err);
        }
      } finally {
        if (!cancelled && generation === loadGeneration) setRemoteLoading(false);
        inFlight = false;
        if (queued && !cancelled) load();
      }
    };

    load();
    const onSession = () => { load(); };
    window.addEventListener('anytap-member-session', onSession);
    return () => {
      cancelled = true;
      window.removeEventListener('anytap-member-session', onSession);
    };
  }, []);

  const reloadAccount = useCallback(async () => {
    if (!isHttpApi || !hasHttpSession()) return;
    setRemoteLoading(true);
    try {
      const [accountCtx, referralCtx] = await Promise.all([
        loadAccountContext(),
        loadReferralContext(),
      ]);
      setRemoteContext(accountCtx);
      setRemoteReferral(referralCtx);
    } catch (err) {
      if (err?.message !== 'Not authenticated') {
        console.error('[account] remote context reload failed', err);
      }
    } finally {
      setRemoteLoading(false);
    }
  }, []);

  const mockContext = useMemo(() => {
    if (isHttpApi) {
      if (remoteContext) return remoteContext;
      const session = getHttpSession();
      return A.getEmptyAccountContext({
        userId: session?.userId || '',
        name: session?.name || session?.fullName || '',
        email: session?.email || '',
        country: session?.country || session?.nationality || '',
        phoneCountryCode: session?.phoneCountryCode || '',
        phoneNumber: session?.phoneNumber || '',
        kycStatus: session?.kycStatus || session?.status,
        cardStatus: session?.cardStatus,
        cregisWalletAddress: session?.cregisWalletAddress,
        cardId: session?.cardId,
      });
    }
    return A.getMockContext(scenarioKey);
  }, [isHttpApi, remoteContext, scenarioKey, profileTick]);
  const referralContext = isHttpApi
    ? (remoteReferral || A.getEmptyReferralContext())
    : A.getReferralContext(referralStateKey);
  const accountState = mockContext.accountState;
  const userCards = mockContext.userCards;
  const hasActiveCard = userCards.some((c) => c && c.status === 'active');
  const rawWalletAddress = resolveWalletAddress(mockContext.wallet?.address);
  const walletAddress = hasActiveCard ? rawWalletAddress : '';
  const kycStatusDef = A.KYC_STATUS_DEFS[accountState.kycStatus] ?? A.KYC_STATUS_DEFS.pending;
  const cardStatusDef = A.resolveCardStatusDef(accountState.cardStatus, accountState);
  const { kycApproved, cardHasNumber, cardIsActive, preIssue, cardApplicationPending, cardDimmed } = A.deriveAccountFlags(accountState);
  const profileReady = hasCompletedKycProfile(accountState);
  const cardLimit = A.getCardLimitInfo(userCards);
  const primaryCard = userCards.find((c) => c.isPrimary) ?? userCards[0] ?? null;
  const currentCard = userCards[selectedCardIndex] ?? primaryCard;

  const [selectedCardTxs, setSelectedCardTxs] = useState(null);
  const [txsLoading, setTxsLoading] = useState(false);

  useEffect(() => {
    if (!isHttpApi || !hasHttpSession()) return undefined;
    const session = getHttpSession();
    if (!session?.userId) return undefined;

    const cNo = String(currentCard?.cardNo || currentCard?.wasabiCardId || currentCard?.balanceInfo?.cardNo || '');
    const l4 = currentCard?.last4 || cNo.replace(/\D/g, '').slice(-4) || cNo.slice(-4) || '';
    if (!cNo) {
      setSelectedCardTxs(null);
      setTxsLoading(false);
      return undefined;
    }

    let cancelled = false;
    setTxsLoading(true);
    fetchCardTransactions(session.userId, { cardId: cNo, last4: l4 })
      .then((res) => {
        if (!cancelled && res?.items) {
          setSelectedCardTxs(res.items);
        }
      })
      .catch(() => {
        if (!cancelled) setSelectedCardTxs(null);
      })
      .finally(() => {
        if (!cancelled) setTxsLoading(false);
      });

    return () => { cancelled = true; };
  }, [currentCard?.cardNo, currentCard?.wasabiCardId, currentCard?.id]);

  const activeActivityItems = useMemo(() => {
    if (selectedCardTxs != null) {
      const localTxs = (mockContext.activityItems || []).filter((item) => item.kind !== 'card_spend' && item.kind !== 'refund');
      return [...localTxs, ...selectedCardTxs];
    }
    return mockContext.activityItems;
  }, [mockContext.activityItems, selectedCardTxs]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const showToast = useCallback((m) => {
    const cleanMsg = sanitizeToastMessage(m);
    setToast(cleanMsg);
    clearTimeout(timers.current.toast);
    timers.current.toast = setTimeout(() => setToast(''), 6000);
  }, []);

  const copy = useCallback((text, msg) => {
    try { navigator.clipboard?.writeText(text); } catch { /* noop */ }
    showToast(msg);
  }, [showToast]);

  const go = useCallback((scr, opts) => {
    let path = A.SCREEN_ROUTES[scr];
    if (!path) return;
    if (opts?.search) {
      const params = new URLSearchParams();
      Object.entries(opts.search).forEach(([key, value]) => {
        if (value != null && value !== '') params.set(key, String(value));
      });
      const qs = params.toString();
      if (qs) path = `${path}?${qs}`;
    }
    navigate(path);
    setToast('');
    window.scrollTo(0, 0);
  }, [navigate]);

  const goWallet = useCallback((tab = 'charge') => {
    setWalletTab(tab);
    go('topup');
  }, [go]);

  const openReceive = useCallback(() => {
    setReceiveOpen(true);
    if (screen !== 'topup') {
      setAddrLoading(true);
      clearTimeout(timers.current.addr);
      timers.current.addr = setTimeout(() => setAddrLoading(false), 800);
    }
  }, [screen]);

  const closeReceive = useCallback(() => setReceiveOpen(false), []);
  const openQuickTopUp = useCallback((card) => setQuickTopUpCard(card), []);
  const closeQuickTopUp = useCallback(() => setQuickTopUpCard(null), []);

  const openCardDetails = useCallback((card) => {
    if (card) {
      const idx = userCards.findIndex((c) => c.id === card.id);
      if (idx >= 0) {
        if (idx !== selectedCardIndex) skipDetailsResetRef.current = true;
        setSelectedCardIndex(idx);
      }
    }
    navigate(A.SCREEN_ROUTES.card);
    setShowCardDetails(false);
    setIsCardDetailVerified(false);
    setShowCvv(false);
    setVerifyCodeSent(false);
    window.setTimeout(() => {
      document.querySelector('.portal-card-info')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 60);
  }, [navigate, selectedCardIndex, userCards]);

  const logout = useCallback(async () => {
    await attemptLogout();
    navigate('/login');
  }, [navigate]);

  const resetCardDetails = useCallback(() => {
    setShowCardDetails(false);
    setIsCardDetailVerified(false);
    setShowCvv(false);
    setVerifyCodeSent(false);
    clearTimeout(timers.current.cvv);
  }, []);

  const handleStatusCta = useCallback((def) => {
    if (def.secondaryAction === 'copyAddress') {
      if (!walletAddress) {
        showToast('No wallet address yet');
        return;
      }
      copy(walletAddress, 'Address copied');
      return;
    }
    if (def.nextScreen === 'card' && def.detailOnArrival) {
      setShowCardDetails(true);
      setIsCardDetailVerified(false);
      setShowCvv(false);
      setVerifyCodeSent(false);
    }
    if (def.nextScreen) go(def.nextScreen);
    else if (def.cta === 'Start KYC') go('kyc');
    else if (def.cta === 'Contact Support') go('support');
    else if (def.cta === 'Activate Card') openActivePhysical(currentCard);
    else if (def.cta === 'Track Delivery') showToast('Tracking link coming soon');
  }, [copy, go, showToast, walletAddress, openActivePhysical, currentCard]);

  const handleSecondaryCta = useCallback((def) => {
    if (def.secondaryAction === 'copyAddress') {
      if (!walletAddress) {
        showToast('No wallet address yet');
        return;
      }
      copy(walletAddress, 'Address copied');
    } else if (def.secondaryAction === 'activate') openActivePhysical(currentCard);
    else if (def.secondaryAction === 'viewCard') go('card');
  }, [copy, go, showToast, walletAddress, openActivePhysical, currentCard]);

  // ── Referral ──────────────────────────────────────────────────────────────
  const applyReferralPartner = useCallback(async () => {
    setReferralStateKey('referralPending');
    showToast('Referral partner application submitted');
  }, [showToast]);

  const requestReferralWithdrawal = useCallback(() => {
    showToast('Withdrawal request submitted');
  }, [showToast]);

  // ── Page title / sub ──────────────────────────────────────────────────────
  const myActive = ['settings', 'profile', 'security', 'notifications', 'support'].includes(screen);
  const referralTitles = screen === 'referral' ? A.referralPageTitles(referralContext) : null;
  const pageTitle = referralTitles?.[0] ?? (A.PAGE_TITLES[screen] || ['', ''])[0];
  const firstName = String(accountState.name || '').trim().split(/\s+/)[0];
  const pageSub = screen === 'home'
    ? (profileReady && firstName ? `Welcome back, ${firstName}` : 'Welcome back')
    : referralTitles?.[1] ?? (A.PAGE_TITLES[screen] || ['', ''])[1];

  // ── Nav helpers ───────────────────────────────────────────────────────────
  const navActive = (id) => {
    if (id === 'home') return screen === 'home';
    if (id === 'card') return screen === 'card' || screen === 'cardApply' || screen === 'cardRegister';
    if (id === 'topup') return screen === 'topup';
    if (id === 'transactions') return screen === 'transactions';
    if (id === 'referral') return screen === 'referral';
    if (id === 'my') return myActive;
    return false;
  };

  const kycGatePending = accountState.kycStatus === 'under_review';

  const openKycGate = useCallback(() => setKycGateOpen(true), []);
  const closeKycGate = useCallback(() => setKycGateOpen(false), []);

  const onMemberNav = useCallback((id) => {
    if (id === 'home') {
      go('home');
      return;
    }

    // My is always open — profile / KYC status live there.
    if (id === 'my') {
      go('settings');
      return;
    }

    if (!profileReady) {
      openKycGate();
      return;
    }

    if (id === 'transactions') go('transactions');
    else go(id);
  }, [go, openKycGate, profileReady]);

  // ── Side effects ──────────────────────────────────────────────────────────
  useEffect(() => {
    resetCardDetails();
    setSelectedCardIndex(0);
  }, [scenarioKey, resetCardDetails]);

  useEffect(() => {
    if (skipDetailsResetRef.current) {
      skipDetailsResetRef.current = false;
      return;
    }
    resetCardDetails();
  }, [selectedCardIndex, resetCardDetails]);

  useEffect(() => {
    if (screen !== 'card') resetCardDetails();
  }, [screen, resetCardDetails]);

  useEffect(() => {
    resetCardDetails();
  }, [cardTab, resetCardDetails]);

  // CVV auto-hide after 30 seconds
  useEffect(() => {
    if (!showCvv) { clearTimeout(timers.current.cvv); return undefined; }
    timers.current.cvv = setTimeout(() => setShowCvv(false), 30000);
    return () => clearTimeout(timers.current.cvv);
  }, [showCvv]);

  // Home loading skeleton — http: wait for API; mock: short UI shimmer
  useEffect(() => {
    if (isHttpApi) return;
    if (screen === 'home') {
      setHomeLoading(true);
      clearTimeout(timers.current.home);
      timers.current.home = setTimeout(() => setHomeLoading(false), 950);
    }
  }, [screen]);

  const apiHomeLoading = isHttpApi && hasHttpSession() && remoteLoading;
  const showHomeLoading = apiHomeLoading || (!isHttpApi && homeLoading);

  // Wallet address loading — http: use API state only
  useEffect(() => {
    if (isHttpApi) {
      setAddrLoading(remoteLoading);
      return;
    }
    if (screen === 'topup' || receiveOpen) {
      setAddrLoading(true);
      clearTimeout(timers.current.addr);
      timers.current.addr = setTimeout(() => setAddrLoading(false), 800);
    }
  }, [screen, receiveOpen, isHttpApi, remoteLoading]);

  useEffect(() => () => {
    Object.values(timers.current).forEach((id) => clearTimeout(id));
  }, []);

  // ── Derived card display values ───────────────────────────────────────────
  const isV = (currentCard?.variant ?? cardTab) === 'virtual';
  const cardVariant = currentCard?.variant ?? (isV ? 'virtual' : 'physical');
  const cardVariantInfo = A.CARD_VARIANTS[cardVariant];
  const cardMaskedOnCard = cardHasNumber && currentCard
    ? A.cardMaskFor(currentCard, accountState.cardStatus)
    : null;
  const cardTabBadge = currentCard && cardIsActive && currentCard.status === 'active'
    ? { label: 'Active', dot: '#7DE0AC', text: '#38A169' }
    : { label: cardStatusDef.cardSubline || cardStatusDef.label, dot: '#F6C77A', text: '#C2860E' };

  return {
    // Navigation
    screen, go, logout, navActive, myActive, onMemberNav,
    openKycGate, closeKycGate, kycGateOpen, kycGatePending,
    // Page meta
    pageTitle, pageSub,
    // Toast
    toast, showToast, copy,
    // Dev/mock
    scenarioKey, setScenarioKey,
    referralStateKey, setReferralStateKey,
    // Account data — TODO: replace with Supabase + Wasabi + Cregis
    accountState, mockContext, kycStatusDef, cardStatusDef,
    referralContext, applyReferralPartner, requestReferralWithdrawal,
    reloadAccount, refresh: reloadAccount, deductWalletBalance: (amount) => setTempDeduct((v) => v + amount),
    submitKycApplication: submitKycApplicationApi, submitCardApplication: submitCardApplicationApi,
    // Derived flags
    kycApproved, cardHasNumber, cardIsActive, preIssue, cardApplicationPending, cardDimmed,
    profileReady,
    // CTA handlers
    handleStatusCta, handleSecondaryCta,
    // Activity data
    activityItems: activeActivityItems,
    topUpHistory: mockContext.topUpHistory,
    walletBalance: Math.max(0, mockContext.wallet.balanceUsdt - tempDeduct),
    walletExists: mockContext.wallet.exists,
    cardApplications: mockContext.cardApplications,
    flowState: mockContext.flowState,
    referralCode: isHttpApi
      ? (mockContext.referralCode ?? null)
      : (referralContext?.code ?? null),
    // Loading
    homeLoading: showHomeLoading,
    txsLoading,
    // Card detail
    cardTab, setCardTab,
    showCardDetails, setShowCardDetails,
    isCardDetailVerified, setIsCardDetailVerified,
    showCvv, setShowCvv,
    verifyCodeSent, setVerifyCodeSent,
    resetCardDetails,
    // Card display
    isV, cardVariant, cardVariantInfo, cardMaskedOnCard, cardTabBadge,
    // Card list
    userCards, cardLimit, primaryCard, currentCard, selectedCardTxs,
    selectedCardIndex, setSelectedCardIndex,
    // Wallet
    addrLoading, walletTab, goWallet,
    receiveOpen, openReceive, closeReceive,
    quickTopUpCard, openQuickTopUp, closeQuickTopUp,
    openCardDetails,
    activePhysicalCardOpen, activePhysicalTargetCard, openActivePhysical, closeActivePhysical,
  };
}
