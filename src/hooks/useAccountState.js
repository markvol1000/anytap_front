// ===== useAccountState =====
// Central state hook for the account portal.
// Manages card lifecycle, navigation, wallet, modals, toasts.
// TODO: Replace all mock context with real API calls (Supabase + Wasabi + Cregis)

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { isHttpApi } from '../lib/api/config.js';
import { loadAccountContext, loadReferralContext, submitKycApplication as submitKycApplicationApi, submitCardApplication as submitCardApplicationApi } from '../lib/services/accountService.js';
import { fetchCardTransactions, cacheCardBalance } from '../lib/services/account/accountApi.js';
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
  const navigatingTargetCardRef = useRef(null);
  const userCardsRef = useRef([]);
  const selectedCardIndexRef = useRef(0);

  // ?? UI state ??????????????????????????????????????????????????????????????
  const [homeLoading, setHomeLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [tempDeduct, setTempDeduct] = useState(0);

  // ?? Card state ????????????????????????????????????????????????????????????
  const [cardTab, setCardTab] = useState('virtual');
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);
  selectedCardIndexRef.current = selectedCardIndex;
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [isCardDetailVerified, setIsCardDetailVerified] = useState(false);
  const [showCvv, setShowCvv] = useState(false);
  const [verifyCodeSent, setVerifyCodeSent] = useState(false);

  // ?? Wallet / top-up state ?????????????????????????????????????????????????
  const [addrLoading, setAddrLoading] = useState(true);
  const [walletTab, setWalletTab] = useState('charge');
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [quickTopUpCard, setQuickTopUpCard] = useState(null);
  const [cardTransferCard, setCardTransferCard] = useState(null);
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

  // ?? Dev/mock scenario ?????????????????????????????????????????????????????
  // TODO: Remove scenarioKey entirely when real auth/API is wired
  const [scenarioKey, setScenarioKey] = useState(() => A.scenarioForMockSession());
  const [referralStateKey, setReferralStateKey] = useState('normalMember');
  const [remoteContext, setRemoteContext] = useState(null);
  const [remoteReferral, setRemoteReferral] = useState(null);
  const [remoteLoading, setRemoteLoading] = useState(() => isHttpApi && hasHttpSession());

  const [cardDeductions, setCardDeductions] = useState({});
  const [cardTxTick, setCardTxTick] = useState(0);
  const [cardBalancesLoading, setCardBalancesLoading] = useState(() => isHttpApi && hasHttpSession());

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
          setTempDeduct(0);
          setRemoteContext(accountCtx);
          setRemoteReferral(referralCtx);
          setCardBalancesLoading(false);
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

  const accountContext = useMemo(() => {
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
    const session = getHttpSession();
    return A.getEmptyAccountContext({
      userId: session?.userId || '',
      name: session?.name || session?.fullName || '',
      email: session?.email || '',
    });
  }, [remoteContext, profileTick]);
  const referralContext = isHttpApi
    ? (remoteReferral || A.getEmptyReferralContext())
    : A.getReferralContext(referralStateKey);
  const accountState = accountContext.accountState;
  const userCards = useMemo(() => {
    const rawCards = accountContext.userCards || [];
    userCardsRef.current = rawCards;
    if (!cardDeductions || Object.keys(cardDeductions).length === 0) {
      return rawCards;
    }

    return rawCards.map((card) => {
      const cardKey = card.id || card.wasabiCardId || card.cardNo || card.last4;
      const deduction = cardDeductions[cardKey] || (card.last4 && cardDeductions[card.last4]) || 0;

      let currentBal = 0;
      if (typeof card.balanceUsdt === 'number') {
        currentBal = card.balanceUsdt;
      } else if (card.balance) {
        currentBal = parseFloat(String(card.balance).replace(/[^\d.]/g, '')) || 0;
      }

      if (!deduction) {
        return card;
      }

      const newBal = Math.max(0, currentBal - deduction);
      return {
        ...card,
        balanceUsdt: newBal,
        balance: `$${newBal.toFixed(2)} USD`,
      };
    });
  }, [accountContext.userCards, cardDeductions]);

  const hasActiveCard = userCards.some((c) => c && c.status === 'active');
  const rawWalletAddress = resolveWalletAddress(accountContext.wallet?.address);
  const walletAddress = hasActiveCard ? rawWalletAddress : '';
  const kycStatusDef = A.KYC_STATUS_DEFS[accountState.kycStatus] ?? A.KYC_STATUS_DEFS.pending;
  const cardStatusDef = A.resolveCardStatusDef(accountState.cardStatus, accountState);
  const { kycApproved, cardHasNumber, cardIsActive, preIssue, cardApplicationPending, cardDimmed } = A.deriveAccountFlags(accountState);
  const profileReady = hasCompletedKycProfile(accountState);
  const cardLimit = A.getCardLimitInfo(userCards, accountState?.maxCardsAllowed);
  const primaryCard = userCards.find((c) => c.isPrimary) ?? userCards[0] ?? null;
  const currentCard = userCards[selectedCardIndex] ?? primaryCard;

  const refreshCardBalances = useCallback(async (targetCardId = null, fetchLiveAll = false) => {
    if (!isHttpApi || !hasHttpSession()) return;
    const session = getHttpSession();
    if (!session?.userId) return;
    setCardBalancesLoading(true);
    try {
      const { apiPost } = await import('../lib/api/httpClient.js');
      const payload = {};
      if (fetchLiveAll) {
        payload.fetchLiveAll = true;
      } else if (targetCardId) {
        payload.targetCardId = targetCardId;
      }
      const cardInfoList = await apiPost(`/cards/${encodeURIComponent(session.userId)}/list-info`, payload);
      if (Array.isArray(cardInfoList)) {
        setCardDeductions({});
        setRemoteContext((prev) => {
          if (!prev) return prev;
          const updatedCards = (prev.userCards || []).map((card) => {
            const match = cardInfoList.find((info) => {
              const no = String(info?.cardNo || info?.wasabiCardId || info?.balanceInfo?.cardNo || '');
              const l4 = String(info?.last4 || '').trim();
              return (no && (no === card.id || no === card.cardNo || no === card.wasabiCardId)) ||
                     (l4 && l4.length === 4 && l4 === card.last4);
            });
            if (!match) return card;
            const rawBal = match?.balanceInfo?.amount ?? match?.balance ?? match?.cardBalance ?? match?.availableBalance;
            const nBal = rawBal != null && rawBal !== '' ? Number(rawBal) : null;
            if (nBal == null || !Number.isFinite(nBal)) return card;
            const cur = match?.balanceInfo?.currency;
            const balLabel = (cur === 'USD' || !cur) ? `$${nBal.toFixed(2)} USD` : `${nBal.toFixed(2)} ${cur}`;
            cacheCardBalance(card.id, nBal, balLabel);
            cacheCardBalance(card.cardNo, nBal, balLabel);
            if (card.last4) cacheCardBalance(card.last4, nBal, balLabel);
            return {
              ...card,
              wasabiCardId: card.wasabiCardId || card.cardNo || card.id,
              balanceUsdt: nBal,
              balance: balLabel,
            };
          });
          return {
            ...prev,
            userCards: updatedCards,
          };
        });
      }
    } catch (err) {
      console.warn('[account] failed to refresh card balances', err);
    } finally {
      setCardBalancesLoading(false);
    }
  }, []);

  const isReloadingRef = useRef(false);
  const reloadAccount = useCallback(async (targetCardId = null) => {
    if (!isHttpApi || !hasHttpSession()) return null;
    if (isReloadingRef.current) return null;
    isReloadingRef.current = true;
    try {
      const cards = userCardsRef.current || [];
      const idx = selectedCardIndexRef.current || 0;
      const curCard = cards[idx] || cards[0];
      const activeTarget = targetCardId
        || navigatingTargetCardRef.current
        || curCard?.wasabiCardId
        || curCard?.cardNo
        || curCard?.id
        || null;
      navigatingTargetCardRef.current = null;
      const [accountCtx, referralCtx] = await Promise.all([
        loadAccountContext(null, activeTarget),
        loadReferralContext(),
      ]);
      if (accountCtx) {
        setCardDeductions({});
        setTempDeduct(0);
        setRemoteContext((prev) => {
          if (!prev) return accountCtx;
          // Merge userCards so known live balances are not lost when non-targeted queries omit balanceInfo
          const prevMap = new Map((prev.userCards || []).map((c) => [c.id || c.cardNo || c.last4, c]));
          const mergedCards = (accountCtx.userCards || []).map((newCard) => {
            const key = newCard.id || newCard.cardNo || newCard.last4;
            const existing = prevMap.get(key);
            if (existing) {
              const hasNewLive = newCard.balance && newCard.balance !== '—' && typeof newCard.balanceUsdt === 'number' && newCard.balanceUsdt !== 0;
              if (!hasNewLive && existing.balance && existing.balance !== '—') {
                return {
                  ...newCard,
                  balance: existing.balance,
                  balanceUsdt: existing.balanceUsdt,
                };
              }
            }
            return newCard;
          });
          return {
            ...accountCtx,
            userCards: mergedCards,
          };
        });
      }
      if (referralCtx) {
        setRemoteReferral(referralCtx);
      }
      return accountCtx;
    } catch (err) {
      if (err?.message !== 'Not authenticated') {
        console.error('[account] remote context reload failed', err);
      }
      return null;
    } finally {
      isReloadingRef.current = false;
    }
  }, []);

  // Sync wallet & account state on page navigation (screen change)
  const isFirstRender = useRef(true);
  const prevScreenRef = useRef(screen);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (prevScreenRef.current === screen) {
      return;
    }
    prevScreenRef.current = screen;
    if (isHttpApi && hasHttpSession()) {
      reloadAccount();
    }
  }, [screen, reloadAccount]);

  // Sync wallet & account state when user returns to this browser tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isHttpApi && hasHttpSession()) {
        reloadAccount();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [reloadAccount]);

  const [selectedCardTxs, setSelectedCardTxs] = useState(null);
  const [txsLoading, setTxsLoading] = useState(false);

  useEffect(() => {
    if (!isHttpApi || !hasHttpSession()) return undefined;
    const session = getHttpSession();
    if (!session?.userId) return undefined;

    const cNo = String(currentCard?.wasabiCardId || currentCard?.cardId || currentCard?.id || currentCard?.cardNo || currentCard?.balanceInfo?.cardNo || '');
    const l4 = currentCard?.last4 || (cNo.replace(/\D/g, '').length >= 4 ? cNo.replace(/\D/g, '').slice(-4) : '') || '';
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
  }, [currentCard?.cardNo, currentCard?.wasabiCardId, currentCard?.id, cardTxTick]);

  const activeActivityItems = useMemo(() => {
    if (selectedCardTxs != null) {
      const localTxs = (accountContext.activityItems || []).filter((item) => item.kind !== 'card_spend' && item.kind !== 'refund');
      const combined = [...localTxs, ...selectedCardTxs];
      const dedupMap = new Map();
      for (const item of combined) {
        const rawId = String(item.id || item.txId || item.reference || '');
        const cleanKey = rawId.replace(/^FEE_/, '').replace(/^RETRY_/, '').replace(/^RETRY_DEPOSIT_/, '').trim() || rawId;
        const isCompleted = item.status === 'completed' || item.status === 'approved' || item.status === 'success';

        if (!dedupMap.has(cleanKey)) {
          dedupMap.set(cleanKey, item);
        } else {
          const existing = dedupMap.get(cleanKey);
          const existingIsCompleted = existing.status === 'completed' || existing.status === 'approved' || existing.status === 'success';
          if (isCompleted && !existingIsCompleted) {
            dedupMap.set(cleanKey, item);
          }
        }
      }
      return Array.from(dedupMap.values());
    }
    return accountContext.activityItems;
  }, [accountContext.activityItems, selectedCardTxs]);

  // ?? Helpers ???????????????????????????????????????????????????????????????
  const clearToast = useCallback(() => {
    clearTimeout(timers.current.toast);
    setToast('');
  }, []);

  const showToast = useCallback((m, duration = 3000) => {
    const cleanMsg = sanitizeToastMessage(m);
    setToast(cleanMsg);
    clearTimeout(timers.current.toast);
    const ms = typeof duration === 'number' ? duration : 3000;
    timers.current.toast = setTimeout(() => setToast(''), ms);
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
  const [cardPickOpen, setCardPickOpen] = useState(false);
  const openCardPickModal = useCallback(() => setCardPickOpen(true), []);
  const closeCardPickModal = useCallback(() => setCardPickOpen(false), []);
  const openQuickTopUp = useCallback((card) => setQuickTopUpCard(card), []);
  const closeQuickTopUp = useCallback(() => setQuickTopUpCard(null), []);
  const openCardTransfer = useCallback((card) => setCardTransferCard(card), []);
  const closeCardTransfer = useCallback(() => setCardTransferCard(null), []);

  const openCardDetails = useCallback((card) => {
    let targetId = null;
    if (card) {
      const idx = userCards.findIndex((c) => c.id === card.id || (card.last4 && c.last4 === card.last4));
      if (idx >= 0) {
        if (idx !== selectedCardIndex) skipDetailsResetRef.current = true;
        setSelectedCardIndex(idx);
        const targetCard = userCards[idx];
        targetId = targetCard?.wasabiCardId || targetCard?.cardNo || targetCard?.id || null;
      } else {
        targetId = card?.wasabiCardId || card?.cardNo || card?.id || null;
      }
      if (card.balanceUsdt != null && card.balance && card.balance !== '—') {
        cacheCardBalance(targetId, card.balanceUsdt, card.balance);
        if (card.last4) cacheCardBalance(card.last4, card.balanceUsdt, card.balance);
      }
    }
    navigatingTargetCardRef.current = targetId;
    if (isHttpApi && hasHttpSession() && targetId) {
      refreshCardBalances(targetId);
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
  }, [navigate, selectedCardIndex, userCards, refreshCardBalances]);

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
    const targetPendingCard = userCards.find((c) => c?.status === 'issued' || c?.status === 'pending_activation') || currentCard;
    if (def.nextScreen) go(def.nextScreen);
    else if (def.cta === 'Start KYC') go('kyc');
    else if (def.cta === 'Contact Support') go('support');
    else if (def.cta === 'Activate Card') openActivePhysical(targetPendingCard);
    else if (def.cta === 'Track Delivery') showToast('Tracking link coming soon');
  }, [copy, go, showToast, walletAddress, openActivePhysical, currentCard, userCards]);

  const handleSecondaryCta = useCallback((def) => {
    const targetPendingCard = userCards.find((c) => c?.status === 'issued' || c?.status === 'pending_activation') || currentCard;
    if (def.secondaryAction === 'copyAddress') {
      if (!walletAddress) {
        showToast('No wallet address yet');
        return;
      }
      copy(walletAddress, 'Address copied');
    } else if (def.secondaryAction === 'activate') openActivePhysical(targetPendingCard);
    else if (def.secondaryAction === 'viewCard') go('card');
  }, [copy, go, showToast, walletAddress, openActivePhysical, currentCard, userCards]);

  // ?? Referral ??????????????????????????????????????????????????????????????
  const applyReferralPartner = useCallback(async () => {
    setReferralStateKey('referralPending');
    showToast('Referral partner application submitted');
  }, [showToast]);

  const requestReferralWithdrawal = useCallback(() => {
    showToast('Withdrawal request submitted');
  }, [showToast]);

  // ?? Page title / sub ??????????????????????????????????????????????????????
  const myActive = ['settings', 'profile', 'security', 'notifications', 'support'].includes(screen);
  const referralTitles = screen === 'referral' ? A.referralPageTitles(referralContext) : null;
  const pageTitle = referralTitles?.[0] ?? (A.PAGE_TITLES[screen] || ['', ''])[0];
  const firstName = String(accountState.name || '').trim().split(/\s+/)[0];
  const pageSub = screen === 'home'
    ? (profileReady && firstName ? `Welcome back, ${firstName}` : 'Welcome back')
    : referralTitles?.[1] ?? (A.PAGE_TITLES[screen] || ['', ''])[1];

  // ?? Nav helpers ???????????????????????????????????????????????????????????
  const navActive = (id) => {
    if (id === 'home') return screen === 'home';
    if (id === 'card') return screen === 'card' || screen === 'cardApply' || screen === 'cardRegister';
    if (id === 'topup') return screen === 'topup';
    if (id === 'transactions') return screen === 'transactions';
    if (id === 'referral') return screen === 'referral';
    if (id === 'my') return myActive;
    return false;
  };

  const kycGatePending = (accountState.kycStatus === 'review' || accountState.kycStatus === 'under_review') || (accountState.status === 'REVIEW' || accountState.status === 'UNDER_REVIEW');
  const kycGateRejected = ['rejected', 'failed', 'register_failed', 'fail'].includes(
    String(accountState.kycStatus || accountState.status || '').toLowerCase()
  );

  const openKycGate = useCallback(() => setKycGateOpen(true), []);
  const closeKycGate = useCallback(() => setKycGateOpen(false), []);

  const onMemberNav = useCallback((id) => {
    if (id === 'home') {
      go('home');
      return;
    }

    // My is always open ??profile / KYC status live there.
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

  // ?? Side effects ??????????????????????????????????????????????????????????
  useEffect(() => {
    resetCardDetails();
    setSelectedCardIndex(0);
  }, [scenarioKey, resetCardDetails]);

  const prevCardIndexRef = useRef(selectedCardIndex);
  useEffect(() => {
    if (prevCardIndexRef.current === selectedCardIndex) {
      return;
    }
    prevCardIndexRef.current = selectedCardIndex;
    if (skipDetailsResetRef.current) {
      skipDetailsResetRef.current = false;
    } else {
      resetCardDetails();
    }
    if (isHttpApi && hasHttpSession()) {
      const cards = userCardsRef.current || [];
      const cur = cards[selectedCardIndex] || cards[0];
      const targetId = cur?.wasabiCardId || cur?.cardNo || cur?.id || null;
      if (targetId) {
        refreshCardBalances(targetId);
      }
    }
  }, [selectedCardIndex, resetCardDetails, refreshCardBalances]);

  const prevTopupScreenRef = useRef(null);
  useEffect(() => {
    if (screen !== 'card') resetCardDetails();
    if (screen === 'topup' && isHttpApi && hasHttpSession()) {
      if (prevTopupScreenRef.current !== 'topup') {
        prevTopupScreenRef.current = 'topup';
        refreshCardBalances(null, true);
      }
    } else if (screen !== 'topup') {
      prevTopupScreenRef.current = screen;
    }
  }, [screen, resetCardDetails, refreshCardBalances]);

  useEffect(() => {
    resetCardDetails();
  }, [cardTab, resetCardDetails]);

  // CVV auto-hide after 30 seconds
  useEffect(() => {
    if (!showCvv) { clearTimeout(timers.current.cvv); return undefined; }
    timers.current.cvv = setTimeout(() => setShowCvv(false), 30000);
    return () => clearTimeout(timers.current.cvv);
  }, [showCvv]);

  // Home loading skeleton ??http: wait for API; mock: short UI shimmer
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

  // Wallet address loading ??http: use API state only
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

  // ?? Derived card display values ???????????????????????????????????????????
  const isV = (currentCard?.variant ?? cardTab) === 'virtual';
  const cardVariant = currentCard?.variant ?? (isV ? 'virtual' : 'physical');
  const cardVariantInfo = A.CARD_VARIANTS[cardVariant];
  const cardMaskedOnCard = cardHasNumber && currentCard
    ? A.cardMaskFor(currentCard, accountState.cardStatus)
    : null;
  const cardTabBadge = currentCard && currentCard.status === 'active'
    ? { label: 'Active', dot: '#7DE0AC', text: '#38A169' }
    : (currentCard && currentCard.status === 'frozen')
      ? { label: 'Frozen', dot: '#EB5757', text: '#EB5757' }
      : { label: cardStatusDef.cardSubline || cardStatusDef.label, dot: '#F6C77A', text: '#C2860E' };

  return {
    // Navigation
    screen, go, logout, navActive, myActive, onMemberNav,
    openKycGate, closeKycGate, kycGateOpen, kycGatePending, kycGateRejected,
    // Page meta
    pageTitle, pageSub,
    // Toast
    toast, showToast, clearToast, copy,
    // Dev/mock
    scenarioKey, setScenarioKey,
    referralStateKey, setReferralStateKey,
    // Account data ??TODO: replace with Supabase + Wasabi + Cregis
    accountState, mockContext: accountContext, accountContext, kycStatusDef, cardStatusDef,
    referralContext, applyReferralPartner, requestReferralWithdrawal,
    reloadAccount, refresh: reloadAccount, deductWalletBalance: (amount) => setTempDeduct((v) => v + amount),
    deductCardBalance: (cardIdOrLast4, amount) => {
      if (!cardIdOrLast4 || !amount) return;
      setCardDeductions((prev) => ({
        ...prev,
        [cardIdOrLast4]: (prev[cardIdOrLast4] || 0) + Number(amount)
      }));
    },
    triggerCardTxRefresh: () => setCardTxTick((t) => t + 1),
    refreshCardBalances,
    submitKycApplication: submitKycApplicationApi, submitCardApplication: submitCardApplicationApi,
    // Derived flags
    kycApproved, cardHasNumber, cardIsActive, preIssue, cardApplicationPending, cardDimmed,
    profileReady,
    // CTA handlers
    handleStatusCta, handleSecondaryCta,
    // Activity data
    activityItems: activeActivityItems,
    topUpHistory: accountContext.topUpHistory,
    walletBalance: Math.max(0, accountContext.wallet.balanceUsdt - tempDeduct),
    walletExists: accountContext.wallet.exists,
    cardApplications: accountContext.cardApplications,
    flowState: accountContext.flowState,
    referralCode: isHttpApi
      ? (accountContext.referralCode ?? null)
      : (referralContext?.code ?? null),
    // Loading
    homeLoading: showHomeLoading,
    txsLoading,
    cardBalancesLoading,
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
    cardTransferCard, openCardTransfer, closeCardTransfer,
    cardPickOpen, openCardPickModal, closeCardPickModal,
    openCardDetails,
    activePhysicalCardOpen, activePhysicalTargetCard, openActivePhysical, closeActivePhysical,
    feePolicy: {
      cardChargeFeeRate: 0.02,
      cardChargeGasFee: 3.00,
      withdrawGasFee: 3.00,
      minTopUp: 50.00,
      minSend: 50.00,
    },
  };
}
