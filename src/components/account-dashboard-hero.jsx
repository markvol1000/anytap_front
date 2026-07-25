// ===== Dashboard Wallet Hub =====
// Wallet is the parent container; cards live inside it.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from './ui.jsx';
import { DashboardQuickActionGroup } from './QuickActionGroup.jsx';
import { CardsDesktopCarousel } from './account-cards-desktop.jsx';
import {
  buildWalletSlots,
  DashboardCardPager,
  DashboardCardWallet,
} from './account-cards.jsx';
import * as A from '../lib/account-data.js';
import * as W from '../utils/wallet-data.js';
import { resolveWalletBalance } from '../lib/api/display-data.js';

function DashboardWalletBalance({ s }) {
  const [hidden, setHidden] = useState(false);
  const balance = resolveWalletBalance(s.walletBalance);

  return (
    <div className="portal-dash-wallet-hub__balance" aria-label="Wallet balance">
      <p className="portal-dash-wallet-hub__eyebrow">Wallet</p>
      <p className="portal-dash-wallet-hub__balance-label">Wallet Balance</p>
      <div className="portal-dash-wallet-hub__balance-row">
        <p className="portal-dash-wallet-hub__amount">
          {W.formatUsdtAmount(balance, { hidden })}
          <span className="portal-dash-wallet-hub__unit"> USDT</span>
        </p>
        <button
          type="button"
          className="portal-dash-wallet-hub__eye"
          onClick={() => setHidden((v) => !v)}
          aria-label={hidden ? 'Show balance' : 'Hide balance'}
          aria-pressed={hidden}>
          <Icon name={hidden ? 'eyeOff' : 'eye'} size={18} stroke={1.75} />
        </button>
      </div>
      <p className="portal-dash-wallet-hub__balance-hint">Available for card top-up</p>
    </div>
  );
}

function DashboardWalletActions({ s }) {
  return <DashboardQuickActionGroup s={s} className="quick-action-group--in-hub" />;
}

function DashboardWalletBridge() {
  return (
    <div className="portal-dash-wallet-hub__bridge" aria-hidden="true">
      <span className="portal-dash-wallet-hub__bridge-line" />
      <span className="portal-dash-wallet-hub__bridge-pill">
        <Icon name="chevronDown" size={14} stroke={2} />
        <span>Wallet funds your cards</span>
      </span>
      <span className="portal-dash-wallet-hub__bridge-line" />
    </div>
  );
}

function DashboardEmptyCardSlot({ s }) {
  return (
    <button
      type="button"
      className="portal-dash-wallet-hub__empty-card"
      onClick={() => s.go('cardApply')}
      disabled={!s.cardLimit?.canAdd && !s.kycApproved}
      aria-label="Issue your first card">
      <span className="portal-dash-wallet-hub__empty-card-inner">
        <span className="portal-dash-wallet-hub__empty-plus" aria-hidden="true">
          <Icon name="plus" size={28} stroke={2} />
        </span>
        <span className="portal-dash-wallet-hub__empty-label">Issue your first card</span>
      </span>
    </button>
  );
}

function DashboardMyCards({ s }) {
  const { userCards, selectedCardIndex, setSelectedCardIndex } = s;
  const walletSlots = useMemo(() => buildWalletSlots(userCards), [userCards]);
  const walletAllFull = userCards.length >= A.MAX_CARDS_PER_USER;
  const [walletSlide, setWalletSlide] = useState(selectedCardIndex);
  const selectedIndex = Math.min(selectedCardIndex, Math.max(0, userCards.length - 1));

  useEffect(() => {
    const card = userCards[selectedCardIndex];
    if (!card) return;
    const slotIdx = walletSlots.findIndex((c) => c?.id === card.id);
    if (slotIdx >= 0) setWalletSlide(slotIdx);
  }, [selectedCardIndex, userCards, walletSlots]);

  const handleSelect = useCallback((index) => {
    setSelectedCardIndex(index);
  }, [setSelectedCardIndex]);

  const handleWalletSlideChange = useCallback((slideIndex) => {
    setWalletSlide(slideIndex);
    const card = walletSlots[slideIndex];
    if (card) {
      const idx = userCards.findIndex((c) => c.id === card.id);
      if (idx >= 0) setSelectedCardIndex(idx);
    }
  }, [setSelectedCardIndex, userCards, walletSlots]);

  const handlePagerSelect = useCallback((cardIndex) => {
    const card = userCards[cardIndex];
    if (!card) return;
    const slotIdx = walletSlots.findIndex((c) => c?.id === card.id);
    if (slotIdx >= 0) handleWalletSlideChange(slotIdx);
  }, [handleWalletSlideChange, userCards, walletSlots]);

  const selectedCard = userCards[selectedIndex] ?? userCards[0];
  const pagerIndex = selectedCard
    ? userCards.findIndex((c) => c.id === selectedCard.id)
    : 0;

  return (
    <div className="portal-dash-wallet-hub__cards portal-mycards--v10">
      <div className="portal-dash-wallet-hub__cards-head">
        <div>
          <h3 className="portal-dash-wallet-hub__cards-title">My Cards</h3>
          <p className="portal-dash-wallet-hub__cards-sub">Spend with Visa using your prepaid balance</p>
        </div>
        {s.cardLimit?.canAdd && userCards.length > 0 && (
          <button
            type="button"
            className="portal-dash-wallet-hub__cards-add"
            onClick={() => s.go('cardApply')}
            aria-label="Add card">
            <Icon name="plus" size={18} stroke={2.5} />
          </button>
        )}
      </div>

      {!userCards.length ? (
        <DashboardEmptyCardSlot s={s} />
      ) : (
        <>
          <div className="portal-dash-wallet-hub__carousel-mob portal-mycards-mob">
            <div className="portal-mycards-stage">
              <div className="portal-dash-card__cards portal-mycards__wallet">
                <DashboardCardWallet
                  slots={walletSlots}
                  slideIndex={walletSlide}
                  onSlideChange={handleWalletSlideChange}
                  s={s}
                  allFull={walletAllFull}
                  wide
                  cardMenu
                  dashboard
                  onAddCard={() => s.go('cardApply')}
                  onCardClick={(card) => s.openCardDetails?.(card)}
                />
              </div>
              {userCards.length > 1 && (
                <DashboardCardPager
                  slideIndex={Math.max(0, pagerIndex)}
                  maxSlots={userCards.length}
                  onSelect={handlePagerSelect}
                />
              )}
            </div>
          </div>

          <div className="portal-dash-wallet-hub__carousel-desk portal-mycards-desk">
            <CardsDesktopCarousel
              cards={userCards}
              selectedIndex={selectedIndex}
              onSelect={handleSelect}
              s={s}
              showQuickActions={false}
              showBalanceOnCard
            />
            {userCards.length > 1 && (
              <DashboardCardPager
                slideIndex={Math.max(0, pagerIndex)}
                maxSlots={userCards.length}
                onSelect={handlePagerSelect}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function DashboardActiveHero({ s }) {
  return (
    <section className="portal-dash-wallet-hub" aria-label="Wallet and cards">
      <div className="portal-dash-wallet-hub__shell">
        <div className="portal-dash-wallet-hub__primary">
          <DashboardWalletBalance s={s} />
          <DashboardWalletActions s={s} />
          <DashboardWalletBridge />
        </div>
        <DashboardMyCards s={s} />
      </div>
    </section>
  );
}
