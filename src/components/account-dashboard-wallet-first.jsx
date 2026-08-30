// ===== Dashboard — wallet-first layout (summary-only overview) =====

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from './ui.jsx';
import {
  buildDashboardCarouselSlots,
  CARD_SLIDE_RATIO_OVERVIEW,
  DashboardCardPager,
  DashboardCardWallet,
  DashboardIssueFirstCard,
} from './account-cards.jsx';
import { CardsDesktopCarousel, DESK_CARD_OVERVIEW_MAX_W } from './account-cards-desktop.jsx';
import { DashboardActivityRow } from './account-activity.jsx';
import { TransactionDetailsDrawer } from './account-transactions.jsx';
import { CardTopUpSelectSheet, IssuanceDepositPanel } from './account-wallet.jsx';
import { WalletOutboundActions } from './portal/WalletOutboundActions.jsx';
import { ReferralApplySheet } from './referral/ReferralApplySheet.jsx';
import { REFERRAL_BENEFITS } from '../lib/referral-mock.ts';
import * as A from '../lib/account-data.js';
import * as W from '../utils/wallet-data.js';
import * as D from '../lib/dashboard-state.js';
import { resolveWalletBalance, resolveWalletAddress } from '../lib/api/display-data.js';

function DashboardCardSlider({ s }) {
  const { userCards, selectedCardIndex, setSelectedCardIndex } = s;
  const cardCount = userCards.length;
  const canAdd = cardCount < A.MAX_CARDS_PER_USER && (s.cardLimit?.canAdd ?? true);
  const sliderSlots = useMemo(
    () => buildDashboardCarouselSlots(userCards),
    [userCards],
  );
  const [slideIndex, setSlideIndex] = useState(0);
  const openCard = useCallback((card) => s.openCardDetails?.(card), [s]);
  const goApply = useCallback(() => s.go?.('cardApply'), [s]);

  useEffect(() => {
    if (!cardCount) return;
    const card = userCards[selectedCardIndex];
    if (!card) return;
    const idx = sliderSlots.findIndex((c) => c?.id === card.id);
    if (idx >= 0) setSlideIndex(idx);
  }, [selectedCardIndex, userCards, sliderSlots, cardCount]);

  const handleSlideChange = useCallback((index) => {
    setSlideIndex(index);
    const card = sliderSlots[index];
    if (card) {
      const idx = userCards.findIndex((c) => c.id === card.id);
      if (idx >= 0) setSelectedCardIndex(idx);
    }
  }, [setSelectedCardIndex, sliderSlots, userCards]);

  const showPager = sliderSlots.length > 1;
  const showMaxHint = cardCount >= A.MAX_CARDS_PER_USER;


  if (cardCount === 0) {
    return (
      <div className="portal-dash-wf__slider portal-dash-wf__slider--empty">
        <DashboardIssueFirstCard onAdd={goApply} disabled={!(s.cardLimit?.canAdd ?? true)} />
      </div>
    );
  }

  return (
    <div className={`portal-dash-wf__slider portal-mycards--v10 portal-dash-wf__slider--overview${canAdd ? ' portal-dash-wf__slider--can-add' : ''}`}>
      <div className="portal-dash-wf__slider-mob portal-mycards-mob">
        <div className="portal-mycards-stage portal-card-slide--overview">
          <div className="portal-mycards-stage__card-block">
            <div className="portal-dash-card__cards portal-mycards__wallet">
              <DashboardCardWallet
                slots={sliderSlots}
                slideIndex={slideIndex}
                onSlideChange={handleSlideChange}
                s={s}
                allFull={!canAdd}
                wide
                adaptivePeekCenter
                dashPlaceholder={canAdd}
                slideRatio={CARD_SLIDE_RATIO_OVERVIEW}
                onAddCard={goApply}
                onCardClick={openCard}
              />
            </div>
          </div>
          {showPager && (
            <DashboardCardPager
              slideIndex={slideIndex}
              maxSlots={sliderSlots.length}
              onSelect={handleSlideChange}
            />
          )}
        </div>
      </div>

      <div className="portal-dash-wf__slider-desk portal-mycards-desk">
        <CardsDesktopCarousel
          cards={userCards}
          carouselSlots={sliderSlots}
          slideIndex={slideIndex}
          onSlideChange={handleSlideChange}
          selectedIndex={Math.max(0, selectedCardIndex)}
          onSelect={setSelectedCardIndex}
          onCardOpen={openCard}
          onAddCard={goApply}
          s={s}
          showQuickActions={false}
          showPager={showPager}
          dashPlaceholder={canAdd}
          cardMaxWidth={DESK_CARD_OVERVIEW_MAX_W}
        />
      </div>

      {showMaxHint && (
        <p className="portal-dash-wf__cards-max">Cards issued</p>
      )}
    </div>
  );
}

function DashboardWalletBridge() {
  return (
    <div className="portal-dash-wf__bridge" aria-hidden="true">
      <span className="portal-dash-wf__bridge-line" />
      <span className="portal-dash-wf__bridge-pill">
        <Icon name="chevronDown" size={14} stroke={2} />
        <span>Wallet funds your cards</span>
      </span>
      <span className="portal-dash-wf__bridge-line" />
    </div>
  );
}

function DashboardWalletBalance({ s }) {
  const [hidden, setHidden] = useState(false);
  const balance = resolveWalletBalance(s.walletBalance);
  const address = resolveWalletAddress(s.mockContext?.wallet?.address);

  const copyAddress = () => {
    if (!address) return;
    try { navigator.clipboard?.writeText(address); } catch { /* noop */ }
    s.showToast?.('Address copied');
  };

  return (
    <div className="portal-dash-wf__balance">
      <div className="portal-dash-wf__balance-head">
        <h2 className="portal-dash-wf__balance-title">Wallet Balance</h2>
        <button
          type="button"
          className="portal-dash-wf__balance-visibility"
          onClick={() => setHidden((v) => !v)}
          aria-label={hidden ? 'Show balance' : 'Hide balance'}
          aria-pressed={hidden}>
          <Icon name={hidden ? 'eyeOff' : 'eye'} size={18} stroke={1.75} />
        </button>
      </div>
      <div className="portal-dash-wf__balance-row">
        <span className="portal-dash-wf__amount">{W.formatUsdtAmount(balance, { hidden })}</span>
        <span className="portal-dash-wf__unit">USDT</span>
      </div>
      <p className="portal-dash-wf__balance-fiat">{W.formatUsdApprox(balance, { hidden })}</p>

      {address ? (
        <div className="portal-dash-wf__addr">
            <div className="portal-dash-wf__addr-body">
              <span className="portal-dash-wf__addr-label">Wallet Address · TRC-20</span>
              <span className="portal-dash-wf__addr-value" title={address}>
                {W.maskAddress(address)}
              </span>
            </div>
            <div className="portal-dash-wf__addr-actions">
              <button
                type="button"
                className="portal-dash-wf__addr-copy"
                onClick={copyAddress}
                aria-label="Copy wallet address">
                <Icon name="copy" size={18} stroke={1.75} />
              </button>
              <button
                type="button"
                className="portal-dash-wf__addr-qr"
                onClick={() => s.openReceive?.()}
                aria-label="Show wallet QR code">
                <Icon name="qr" size={18} stroke={1.75} />
              </button>
            </div>
        </div>
      ) : null}
    </div>
  );
}

function DashboardWalletOutbound({ onTopUpCard, onSendExternal, canTopUpCard }) {
  return (
    <WalletOutboundActions
      onTopUpCard={onTopUpCard}
      onSendExternal={onSendExternal}
      canTopUpCard={canTopUpCard}
    />
  );
}

function DashboardWalletQuickActions({ onTopUpCard, onSendExternal, canTopUpCard }) {
  return (
    <DashboardWalletOutbound
      onTopUpCard={onTopUpCard}
      onSendExternal={onSendExternal}
      canTopUpCard={canTopUpCard}
    />
  );
}

function DashboardWalletPanel({ s, onTopUpCard, onSendExternal, canTopUpCard }) {

  if (!s.walletExists) {
    return (
      <section className="portal-dash-wf__wallet portal-dash-wf__wallet--pending" aria-label="Wallet">
        <p className="portal-dash-wf__wallet-pending-title">Wallet activating</p>
        <p className="portal-dash-wf__wallet-pending-msg">Your personal wallet opens after you register your card.</p>
      </section>
    );
  }

  return (
    <section className="portal-dash-wf__wallet" aria-label="Wallet">
      <DashboardWalletBalance s={s} />
      <DashboardWalletQuickActions
        onTopUpCard={onTopUpCard}
        onSendExternal={onSendExternal}
        canTopUpCard={canTopUpCard}
      />
    </section>
  );
}

export function DashboardRecentTransactions({ s, limit = 8, className = '' }) {
  const [selectedTx, setSelectedTx] = useState(null);
  const [copiedTxId, setCopiedTxId] = useState('');

  const items = useMemo(() => {
    if (s.selectedCardTxs != null) {
      return A.sortActivityChronological(A.normalizeActivityItems(s.selectedCardTxs)).slice(0, limit);
    }
    const raw = A.resolvePortalActivityItems(s.activityItems, s.userCards);
    return A.sortActivityChronological(
      A.filterActivityForCardPage(A.normalizeActivityItems(raw), s.currentCard),
    ).slice(0, limit);
  }, [s.selectedCardTxs, s.activityItems, s.userCards, s.currentCard, limit]);

  const handleCopyTxId = useCallback((txId) => {
    try { navigator.clipboard?.writeText(txId); } catch { /* noop */ }
    setCopiedTxId(txId);
    window.setTimeout(() => setCopiedTxId(''), 2000);
  }, []);

  return (
    <>
      <aside
        className={[
          'portal-dash-wf__tx-panel',
          'portal-dash-panel',
          'portal-dash-wf__tx-panel--bottom',
          className,
        ].filter(Boolean).join(' ')}
        aria-label="Recent activity">
        <div className="portal-dash-wf__tx-panel-head">
          <h2 className="portal-dash-wf__tx-panel-title">Recent Activity</h2>
        </div>
        <div className="portal-dash-wf__tx-list">
          {items.length ? items.map((tx, idx) => (
            <DashboardActivityRow key={`${tx.id}-${idx}`} tx={tx} onClick={() => setSelectedTx(tx)} />
          )) : (
            <p className="portal-dash-wf__tx-empty">No transactions yet.</p>
          )}
        </div>
        <button
          type="button"
          className="portal-dash-wf__tx-view-all"
          onClick={() => {
            const targetCardId = s?.currentCard?.wasabiCardId || s?.currentCard?.cardNo || s?.currentCard?.last4 || s?.currentCard?.id;
            s.go('transactions', { search: { source: 'card', cardId: targetCardId, last4: s?.currentCard?.last4 } });
          }}>
          View All
        </button>
      </aside>

      <TransactionDetailsDrawer
        tx={selectedTx}
        onClose={() => setSelectedTx(null)}
        onCopyTxId={handleCopyTxId}
        copyState={copiedTxId}
      />
    </>
  );
}

const REFERRAL_AVATAR_MODS = ['portal-dash-wf__earnings-avatar--a', 'portal-dash-wf__earnings-avatar--b', 'portal-dash-wf__earnings-avatar--c'];

function formatUsd(amount) {
  return `$${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function networkInitial(name) {
  const trimmed = (name ?? '').trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
}

function DashboardEarningsApplyPrompt({ s }) {
  const [applyOpen, setApplyOpen] = useState(false);
  const [applying, setApplying] = useState(false);

  const handleApply = async () => {
    setApplying(true);
    try {
      await s.applyReferralPartner?.();
      setApplyOpen(false);
    } finally {
      setApplying(false);
    }
  };

  return (
    <>
      <section className="portal-dash-wf__earnings portal-dash-wf__earnings--apply" aria-label="Earnings">
        <div className="portal-dash-wf__earnings-head">
          <h2 className="portal-dash-wf__earnings-title">Earnings</h2>
        </div>

        <div className="portal-dash-wf__earnings-pitch">
          <p className="portal-dash-wf__earnings-pitch-lead">
            Apply for the Referral Partner Program and earn rewards every time your network tops up their cards.
          </p>
          <ul className="portal-dash-wf__earnings-pitch-list">
            {REFERRAL_BENEFITS.slice(0, 3).map((benefit) => (
              <li key={benefit.title}>{benefit.title}</li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          className="portal-dash-wf__earnings-apply-btn"
          onClick={() => setApplyOpen(true)}>
          Apply for Referral Program
          <Icon name="arrowRight" size={16} stroke={2} />
        </button>
      </section>

      <ReferralApplySheet
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        onApply={handleApply}
        applying={applying}
      />
    </>
  );
}

function DashboardEarningsPending({ s }) {
  return (
    <section className="portal-dash-wf__earnings portal-dash-wf__earnings--pending" aria-label="Earnings">
      <div className="portal-dash-wf__earnings-head">
        <h2 className="portal-dash-wf__earnings-title">Earnings</h2>
      </div>

      <div className="portal-dash-wf__earnings-pending">
        <p className="portal-dash-wf__earnings-pending-title">Application under review</p>
        <p className="portal-dash-wf__earnings-pending-msg">
          Your referral partner application is being reviewed. You&apos;ll be notified once approved.
        </p>
        <button type="button" className="portal-dash-wf__earnings-details" onClick={() => s.go?.('referral')}>
          View status
        </button>
      </div>
    </section>
  );
}

function DashboardEarningsPartner({ s }) {
  const referral = s.referralContext;
  const earnings = A.getReferralDashboardEarnings(referral);
  const networkItems = A.getReferralNetworkPreview(referral, 3);
  const referralCode = (s.referralCode ?? referral?.code)?.trim() || null;

  const copyCode = () => {
    if (!referralCode) return;
    if (s.copy) s.copy(referralCode, 'Referral code copied');
    else {
      try { navigator.clipboard?.writeText(referralCode); } catch { /* noop */ }
      s.showToast?.('Referral code copied');
    }
  };

  return (
    <section className="portal-dash-wf__earnings" aria-label="Earnings">
      <div className="portal-dash-wf__earnings-head">
        <h2 className="portal-dash-wf__earnings-title">Earnings</h2>
        <button type="button" className="portal-dash-wf__earnings-details" onClick={() => s.go?.('referral')}>
          <span>Details</span>
          <span className="portal-dash-wf__earnings-details-plus" aria-hidden="true">
            <Icon name="plus" size={14} stroke={2.25} />
          </span>
        </button>
      </div>

      {referralCode ? (
        <div className="portal-dash-wf__earnings-code">
          <span className="portal-dash-wf__earnings-code-label">Referral code</span>
          <div className="portal-dash-wf__earnings-code-row">
            <span className="portal-dash-wf__earnings-code-val">{referralCode}</span>
            <button
              type="button"
              className="portal-dash-wf__earnings-code-copy"
              onClick={copyCode}
              aria-label="Copy referral code">
              <Icon name="copy" size={16} stroke={1.75} />
            </button>
          </div>
        </div>
      ) : null}

      <div className="portal-dash-wf__earnings-stats" role="group" aria-label="Earnings summary">
        <div className="portal-dash-wf__earnings-stat portal-dash-wf__earnings-stat--today">
          <span className="portal-dash-wf__earnings-stat-label">Today</span>
          <span className="portal-dash-wf__earnings-stat-val">{formatUsd(earnings.today)}</span>
        </div>
        <div className="portal-dash-wf__earnings-stat">
          <span className="portal-dash-wf__earnings-stat-label">Month</span>
          <span className="portal-dash-wf__earnings-stat-val">{formatUsd(earnings.month)}</span>
        </div>
        <div className="portal-dash-wf__earnings-stat">
          <span className="portal-dash-wf__earnings-stat-label">Total</span>
          <span className="portal-dash-wf__earnings-stat-val">{formatUsd(earnings.total)}</span>
        </div>
      </div>

      <div className="portal-dash-wf__earnings-network-head">
        <span className="portal-dash-wf__earnings-network-label">Network</span>
        <button type="button" className="portal-dash-wf__earnings-network-all" onClick={() => s.go?.('referral')}>
          View all
        </button>
      </div>

      {networkItems.length ? (
        <ul className="portal-dash-wf__earnings-network-list">
          {networkItems.map((item, index) => (
            <li key={item.id} className="portal-dash-wf__earnings-network-item">
              <span
                className={[
                  'portal-dash-wf__earnings-avatar',
                  REFERRAL_AVATAR_MODS[index % REFERRAL_AVATAR_MODS.length],
                ].join(' ')}
                aria-hidden="true">
                {networkInitial(item.memberName)}
              </span>
              <div className="portal-dash-wf__earnings-network-main">
                <span className="portal-dash-wf__earnings-network-name">{item.memberName}</span>
                <span className="portal-dash-wf__earnings-network-topup">
                  <Icon name="arrowUp" size={12} stroke={2.5} />
                  {item.topUpUsdt.toLocaleString('en-US')} USDT
                </span>
              </div>
              <div className="portal-dash-wf__earnings-network-reward">
                <span className="portal-dash-wf__earnings-network-amt">+{formatUsd(item.reward)}</span>
                <span className="portal-dash-wf__earnings-network-date">{item.date}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="portal-dash-wf__earnings-network-empty">No network activity yet.</p>
      )}

      <button type="button" className="portal-dash-wf__earnings-invite" onClick={() => s.go?.('referral')}>
        Invite &amp; earn
        <Icon name="arrowRight" size={16} stroke={2} />
      </button>
    </section>
  );
}

export function DashboardReferralRewards({ s }) {
  const referral = s.referralContext;

  if (referral?.isNormalMember) {
    return <DashboardEarningsApplyPrompt s={s} />;
  }

  if (referral?.isPending) {
    return <DashboardEarningsPending s={s} />;
  }

  return <DashboardEarningsPartner s={s} />;
}

export function DashboardWalletFirst({ s, view: viewProp }) {
  const [cardPickOpen, setCardPickOpen] = useState(false);
  const view = viewProp ?? D.resolveDashboardView(s.accountState, s.userCards);

  const activeCards = useMemo(
    () => (s.userCards ?? []).filter((c) => c.status === 'active'),
    [s.userCards],
  );
  const canTopUpCard = activeCards.length > 0;

  const handleTopUpCard = useCallback(() => {
    if (!canTopUpCard) {
      s.showToast?.('Apply for a card first.');
      return;
    }
    if (activeCards.length === 1) {
      s.openQuickTopUp?.(activeCards[0]);
    } else {
      setCardPickOpen(true);
    }
  }, [activeCards, canTopUpCard, s]);

  const handleSendExternal = useCallback(() => {
    s.goWallet?.('send');
  }, [s]);

  const handleCardPick = useCallback((card) => {
    setCardPickOpen(false);
    s.openQuickTopUp?.(card);
  }, [s]);

  const showEarnings = view.showEarnings !== false && view.dashboardLayout === 'wallet';
  const showCards = view.showCardsSection !== false;
  const showBridge = view.showWalletBridge === true;
  const showActivity = view.showActivity === true;

  return (
    <div className="portal-dash-wf">
      <div className="portal-dash-wf__main">
        <DashboardWalletPanel
          s={s}
          onTopUpCard={handleTopUpCard}
          onSendExternal={handleSendExternal}
          canTopUpCard={canTopUpCard}
        />

        {showEarnings ? (
          <aside className="portal-dash-wf__aside" aria-label="Earnings">
            <DashboardReferralRewards s={s} />
          </aside>
        ) : null}

        {showCards ? (
          <div className="portal-dash-wf__stack">
            {showBridge ? <DashboardWalletBridge /> : null}
            <section className="portal-dash-wf__cards-section" aria-label="My cards">
              <h3 className="portal-dash-wf__cards-title">My Cards</h3>
              <p className="portal-dash-wf__cards-sub">
                {view.dashboardLayout === 'issuing'
                  ? 'Card status for this step'
                  : 'Tap a card to view details and spending'}
              </p>
              <DashboardCardSlider s={s} />
            </section>
          </div>
        ) : null}

        {showActivity ? <DashboardRecentTransactions s={s} /> : null}
      </div>

      <CardTopUpSelectSheet
        s={s}
        cards={activeCards}
        open={cardPickOpen}
        onClose={() => setCardPickOpen(false)}
        onSelect={handleCardPick}
      />
    </div>
  );
}
