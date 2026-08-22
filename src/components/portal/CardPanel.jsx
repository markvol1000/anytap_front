// ===== CardPanel — shared Card object (summary | detail) =====
// Same slider, balance on card face, and quick-action placement everywhere.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildDashboardCarouselSlots,
  CARD_SLIDE_RATIO_OVERVIEW,
  DashboardCardPager,
  DashboardCardWallet,
  DashboardIssueFirstCard,
  DashboardYourCardsHead,
} from '../account-cards.jsx';
import { CardsDesktopCarousel, DESK_CARD_OVERVIEW_MAX_W } from '../account-cards-desktop.jsx';
import * as A from '../../lib/account-data.js';

export function CardPanel({
  mode = 'summary',
  s,
  className = '',
  showSectionTitle = false,
  sectionTitle = 'My Cards',
  desktopCardMaxWidth = DESK_CARD_OVERVIEW_MAX_W,
  showSlideHead = false,
  slideHeadHint,
  children,
}) {
  const isDetail = mode === 'detail';
  const { userCards, selectedCardIndex, setSelectedCardIndex } = s;
  const cardCount = userCards.length;
  const canAdd = cardCount < A.MAX_CARDS_PER_USER && (s.cardLimit?.canAdd ?? true);
  const sliderSlots = useMemo(() => buildDashboardCarouselSlots(userCards), [userCards]);
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
  const showQuickActions = true;

  if (cardCount === 0) {
    return (
      <div className={`portal-card-panel portal-card-panel--${mode}${className ? ` ${className}` : ''}`}>
        {showSectionTitle ? <h3 className="portal-card-panel__title">{sectionTitle}</h3> : null}
        <div className="portal-dash-wf__slider portal-dash-wf__slider--empty">
          <DashboardIssueFirstCard onAdd={goApply} disabled={!(s.cardLimit?.canAdd ?? true)} />
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className={`portal-card-panel portal-card-panel--${mode}${className ? ` ${className}` : ''}`}>
      {showSectionTitle ? <h3 className="portal-card-panel__title">{sectionTitle}</h3> : null}

      <div className={`portal-dash-wf__slider portal-mycards--v10 portal-dash-wf__slider--overview${canAdd ? ' portal-dash-wf__slider--can-add' : ''}`}>
        <div className="portal-dash-wf__slider-mob portal-mycards-mob">
          <div className="portal-mycards-stage portal-card-slide--overview">
            {showSlideHead ? (
              <DashboardYourCardsHead
                s={s}
                hideTitle
                addIcon
                showNew={canAdd}
                hint={slideHeadHint}
              />
            ) : null}
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
                  showQuickActions={showQuickActions}
                  quickActionMode={mode}
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
            showQuickActions={showQuickActions}
            quickActionsVariant={mode}
            showPager={showPager}
            dashPlaceholder={canAdd}
            cardMaxWidth={desktopCardMaxWidth}
          />
        </div>

        {showMaxHint && (
          <p className="portal-dash-wf__cards-max">Maximum 3 cards issued</p>
        )}
      </div>

      {children}
    </div>
  );
}
