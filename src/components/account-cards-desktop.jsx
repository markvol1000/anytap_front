// ===== Cards tab — desktop layout (≥900px) =====
// Two-column: carousel + quick actions | card information
// Mobile layout lives in AccountMyCards (unchanged).

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './ui.jsx';
import { CardDesktopManagementPanel } from './CardManagementPanels.jsx';
import { CardPanel } from './portal/CardPanel.jsx';
import { CardQuickActionGroup } from './QuickActionGroup.jsx';
import { ActivityAmount } from './account-activity.jsx';
import {
  buildDashboardCarouselSlots,
  CardInformationPanel,
  CardOnboardingActions,
  DashboardAddCardPlaceholder,
  DashboardCardPager,
  DebitCardFace,
  MyCardsEmptyState,
} from './account-cards.jsx';
import * as A from '../lib/account-data.js';

const DESK_CARD_MAX_W = 480;
const DESK_CARD_OVERVIEW_MAX_W = 540;
const DESK_CARD_ASPECT = 728 / 1240;
const DESK_ARROW_W = 42;
const DESK_ARROW_GAP = 12;
const TX_PREVIEW_SIZE = 5;

function formatTxType(tx) {
  if (A.getActivityStatus(tx) === 'failed') return 'Failed';
  return tx.typeLabel ?? A.getActivityTypeLabel(tx.kind);
}

function formatTxStatus(tx) {
  return A.formatActivityStatusLabel(A.getActivityStatus(tx));
}

export function CardsDesktopInfoPanel({ card, s }) {
  if (card && card.status === 'issued') {
    return (
      <div style={{ padding: '24px', background: 'var(--portal-paper)', borderRadius: 'var(--radius-card)', border: '1px solid var(--portal-border)' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>Card Issued</h3>
        <p style={{ fontSize: '14px', color: 'var(--portal-muted)', lineHeight: '1.5', marginBottom: '20px' }}>
          Your card has been issued. Click the button below to set your PIN and activate it.
        </p>
        <button
          type="button"
          className="portal-btn-primary"
          style={{ width: '100%', height: '48px', borderRadius: '12px', fontSize: '15px', fontWeight: '600' }}
          onClick={() => s.openActivePhysical(card)}
        >
          Activate Card
        </button>
      </div>
    );
  }
  return (
    <div style={{ marginTop: '-4px' }}>
      <CardInformationPanel card={card} s={s} className="portal-card-info--desk" />
      <CardDesktopManagementPanel card={card} s={s} />
    </div>
  );
}

function CardsDesktopNav({ slideIndex, maxSlots, onSelect, onPrev, onNext }) {
  if (maxSlots <= 1) return null;

  return (
    <div className="portal-mycards-desk-nav">
      <button
        type="button"
        className="portal-mycards-desk-nav__arrow"
        onClick={onPrev}
        disabled={slideIndex <= 0}
        aria-label="Previous card">
        <Icon name="chevronLeft" size={18} stroke={2} />
      </button>
      <DashboardCardPager
        slideIndex={slideIndex}
        maxSlots={maxSlots}
        onSelect={onSelect}
      />
      <button
        type="button"
        className="portal-mycards-desk-nav__arrow"
        onClick={onNext}
        disabled={slideIndex >= maxSlots - 1}
        aria-label="Next card">
        <Icon name="chevron" size={18} stroke={2} />
      </button>
    </div>
  );
}

function CardsDesktopCarousel({
  cards,
  selectedIndex,
  onSelect,
  s,
  showQuickActions = true,
  showBalanceOnCard = true,
  showPager = true,
  showIssueButton = false,
  onIssueCard,
  showOnboardingActions = false,
  quickActionsVariant = 'full',
  showSideArrows = true,
  showBottomNav = false,
  onCardOpen,
  cardMaxWidth = DESK_CARD_MAX_W,
  carouselSlots,
  slideIndex: slideIndexProp,
  onSlideChange,
  onAddCard,
  dashPlaceholder = false,
}) {
  const viewportRef = useRef(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [cardWidth, setCardWidth] = useState(0);

  const slots = carouselSlots ?? cards;
  const slideIndex = slideIndexProp ?? selectedIndex;
  const setSlideIndex = onSlideChange ?? onSelect;

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    const measure = () => {
      const controls = viewport.closest('.portal-mycards-desk-carousel__controls');
      const arrowInset = DESK_ARROW_W + DESK_ARROW_GAP;
      const available = controls?.getBoundingClientRect().width ?? viewport.getBoundingClientRect().width;
      const cardW = available > 0
        ? Math.min(Math.max(0, available - arrowInset * 2), cardMaxWidth)
        : 0;
      setViewportWidth(cardW);
      setCardWidth(cardW);
    };

    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(viewport.closest('.portal-mycards-desk-carousel__controls') ?? viewport);
    window.addEventListener('resize', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [slots.length, cardMaxWidth]);

  const goPrev = useCallback(() => {
    setSlideIndex(Math.max(0, slideIndex - 1));
  }, [setSlideIndex, slideIndex]);

  const goNext = useCallback(() => {
    setSlideIndex(Math.min(slots.length - 1, slideIndex + 1));
  }, [setSlideIndex, slideIndex, slots.length]);

  const slideWidth = viewportWidth;
  const trackOffset = slideWidth > 0 ? slideIndex * slideWidth : 0;
  const slideStyle = slideWidth > 0
    ? { width: slideWidth, flexBasis: slideWidth, flexShrink: 0 }
    : undefined;
  const deskStyle = cardWidth > 0
    ? {
        '--desk-card-w': `${cardWidth}px`,
        '--desk-card-h': `${cardWidth * DESK_CARD_ASPECT}px`,
        '--desk-arrow-inset': `${DESK_ARROW_W + DESK_ARROW_GAP}px`,
      }
    : undefined;

  return (
    <div className="portal-mycards-desk-carousel" style={deskStyle}>
      {(showIssueButton && onIssueCard) || showOnboardingActions ? (
        <div className="portal-mycards-desk-carousel__head">
          {showOnboardingActions ? (
            <CardOnboardingActions s={s} layout="inline" />
          ) : (
            <button type="button" className="portal-mycards-desk__issue" onClick={onIssueCard}>
              + Apply New Card
            </button>
          )}
        </div>
      ) : null}
      <div className="portal-mycards-desk-carousel__controls">
        <div className={`portal-mycards-desk-carousel__frame${showSideArrows ? '' : ' portal-mycards-desk-carousel__frame--plain'}`}>
          {showSideArrows ? (
            <button
              type="button"
              className="portal-mycards-desk-carousel__arrow portal-mycards-desk-carousel__arrow--prev"
              onClick={goPrev}
              disabled={slideIndex <= 0}
              aria-label="Previous card">
              <Icon name="chevronLeft" size={20} stroke={2} />
            </button>
          ) : null}

          <div ref={viewportRef} className="portal-mycards-desk-carousel__viewport">
            <div
              className="portal-mycards-desk-carousel__track"
              style={{ transform: `translate3d(${-trackOffset}px, 0, 0)` }}>
              {slots.map((card, i) => (
                <div
                  key={card?.id ?? `add-${i}`}
                  className={`portal-mycards-desk-carousel__slide${i === slideIndex ? ' is-active' : ''}${!card ? ' is-add-slot' : ''}`}
                  style={slideStyle}>
                  <div className="portal-mycards-desk-carousel__unit">
                  <div className="portal-mycards-desk-carousel__card-wrap">
                    {card ? (
                      <button
                        type="button"
                        className="portal-mycards-desk-carousel__card-btn"
                        onClick={() => (onCardOpen ? onCardOpen(card) : setSlideIndex(i))}
                        aria-label={`${onCardOpen ? 'Open' : 'Select'} ${A.cardVariantLabel(card)} ending ${card.last4}`}
                        aria-current={i === slideIndex ? 'true' : undefined}>
                        <DebitCardFace
                          card={card}
                          hero
                          dashboard={quickActionsVariant === 'hub' || quickActionsVariant === 'dashboard'}
                          showBalance={showBalanceOnCard && card.status === 'active'}
                          showFooter={!!card.last4}
                        />
                      </button>
                    ) : (
                      <DashboardAddCardPlaceholder
                        onAdd={onAddCard ?? (() => s.go?.('cardApply'))}
                        disabled={!s.cardLimit?.canAdd}
                      />
                    )}
                  </div>
                  {showQuickActions && card ? (
                    <CardQuickActionGroup
                      s={s}
                      card={card}
                      mode={quickActionsVariant === 'summary' ? 'summary' : 'detail'}
                      className={`quick-action-group--in-carousel${quickActionsVariant === 'summary' ? '' : ' quick-action-group--card-carousel'}`}
                    />
                  ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {showSideArrows ? (
            <button
              type="button"
              className="portal-mycards-desk-carousel__arrow portal-mycards-desk-carousel__arrow--next"
              onClick={goNext}
              disabled={slideIndex >= slots.length - 1}
              aria-label="Next card">
              <Icon name="chevron" size={20} stroke={2} />
            </button>
          ) : null}
        </div>
      </div>

      {showBottomNav && showPager && slots.length > 1 && (
        <CardsDesktopNav
          slideIndex={slideIndex}
          maxSlots={slots.length}
          onSelect={setSlideIndex}
          onPrev={goPrev}
          onNext={goNext}
        />
      )}

      {!showBottomNav && showPager && slots.length > 1 && (
        <DashboardCardPager
          slideIndex={slideIndex}
          maxSlots={slots.length}
          onSelect={setSlideIndex}
        />
      )}
    </div>
  );
}

function CardsDesktopTransactions({ items, card, cardLast4, onViewAll }) {
  const filtered = useMemo(
    () => A.sortActivityChronological(
      A.filterActivityForCardPage(A.normalizeActivityItems(items), card || cardLast4),
    ).slice(0, TX_PREVIEW_SIZE),
    [items, card, cardLast4],
  );

  return (
    <section className="portal-mycards-desk-tx" aria-label="Recent transactions">
      <div className="portal-mycards-desk-tx__head">
        <h2 className="portal-mycards-section__title">Recent Transactions</h2>
        {onViewAll && filtered.length > 0 ? (
          <button type="button" className="portal-mycards-desk-tx__view-all" onClick={onViewAll}>
            See all transactions →
          </button>
        ) : null}
      </div>

      {!filtered.length ? (
        <p className="portal-mycards-desk-tx__empty">No transactions for this card yet.</p>
      ) : (
        <div className="portal-mycards-desk-tx__table-wrap">
          <table className="portal-mycards-desk-tx__table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Merchant</th>
                <th scope="col">Type</th>
                <th scope="col">Amount</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => {
                const status = formatTxStatus(tx);
                const amountVariant = tx.failed ? 'fail' : tx.incoming ? 'in' : 'out';
                return (
                  <tr key={tx.id} className={tx.failed ? ' is-failed' : ''}>
                    <td data-label="Date">{A.formatActivityWhen(tx.at, { style: 'standard' })}</td>
                    <td data-label="Merchant">{tx.title}</td>
                    <td data-label="Type">{formatTxType(tx)}</td>
                    <td data-label="Amount" className={`portal-mycards-desk-tx__amt is-${amountVariant}`}>
                      <ActivityAmount
                        amount={tx.amount}
                        incoming={tx.incoming}
                        failed={tx.failed}
                        kind={tx.kind}
                      />
                    </td>
                    <td data-label="Status">
                      <span className={`portal-mycards-desk-tx__status portal-mycards-desk-tx__status--${status.toLowerCase()}`}>
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export { CardsDesktopCarousel, DESK_CARD_OVERVIEW_MAX_W };

export function AccountMyCardsDesktop({ s }) {
  const { userCards, selectedCardIndex, setSelectedCardIndex } = s;
  const canAdd = s.cardLimit?.canAdd ?? false;
  const carouselSlots = useMemo(
    () => buildDashboardCarouselSlots(userCards),
    [userCards],
  );
  const [deskSlide, setDeskSlide] = useState(() =>
    Math.min(selectedCardIndex, Math.max(0, carouselSlots.length - 1)),
  );

  useEffect(() => {
    const card = userCards[selectedCardIndex];
    if (!card) return;
    const idx = carouselSlots.findIndex((c) => c?.id === card.id);
    if (idx >= 0) setDeskSlide(idx);
  }, [selectedCardIndex, userCards, carouselSlots]);

  const handleDeskSlideChange = useCallback((index) => {
    setDeskSlide(index);
    const card = carouselSlots[index];
    if (card) {
      const idx = userCards.findIndex((c) => c.id === card.id);
      if (idx >= 0) setSelectedCardIndex(idx);
    }
  }, [carouselSlots, setSelectedCardIndex, userCards]);

  if (!userCards.length) {
    return <MyCardsEmptyState s={s} />;
  }

  const selectedCard = carouselSlots[deskSlide] ?? userCards[selectedCardIndex] ?? userCards[0];
  const showPager = carouselSlots.length > 1;

  return (
    <div className="portal-mycards-desk">
      <header className="portal-mycards-desk__intro">
        <h1 className="portal-mycards-desk__intro-title">My Card</h1>
        <p className="portal-mycards-desk__intro-sub">
          Manage your Anytap Visa card and its security controls.
        </p>
      </header>

      <div className="portal-mycards-desk__main">
        <div className="portal-mycards-desk__col portal-mycards-desk__col--cards">
          <CardPanel mode="detail" s={s} desktopCardMaxWidth={DESK_CARD_OVERVIEW_MAX_W} />
          <CardsDesktopTransactions
            items={A.resolvePortalActivityWithHistory(s.activityItems)}
            card={selectedCard}
            cardLast4={selectedCard?.last4}
            onViewAll={() => s.go('transactions', { search: { source: 'card' } })}
          />
        </div>

        <div className="portal-mycards-desk__col portal-mycards-desk__col--info">
          {selectedCard && (
            <CardsDesktopInfoPanel key={selectedCard.id} card={selectedCard} s={s} />
          )}
        </div>
      </div>
    </div>
  );
}
