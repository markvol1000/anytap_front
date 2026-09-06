// ===== Cards tab — desktop layout (≥900px) =====
// Two-column: carousel + quick actions | card information
// Mobile layout lives in AccountMyCards (unchanged).

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './ui.jsx';
import { CardDesktopManagementPanel } from './CardManagementPanels.jsx';
import { CardPanel } from './portal/CardPanel.jsx';
import { CardQuickActionGroup } from './QuickActionGroup.jsx';
import { ActivityAmount, DashboardActivityRow } from './account-activity.jsx';
import { TransactionDetailsDrawer } from './account-transactions.jsx';
import { DashboardRecentTransactions } from './account-dashboard-wallet-first.jsx';
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
import { isHttpApi } from '../lib/api/config.js';
import { getHttpSession, hasHttpSession } from '../lib/api/httpSession.js';
import { fetchCardTransactions } from '../lib/services/account/accountApi.js';

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
  if (!card) {
    return (
      <div style={{ padding: '24px', background: 'var(--portal-paper)', borderRadius: 'var(--radius-card)', border: '1px solid var(--portal-border)' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>Apply New Card</h3>
        <p style={{ fontSize: '14px', color: 'var(--portal-muted)', lineHeight: '1.5', marginBottom: '20px' }}>
          Expand your spending options. Issue a new Virtual or Physical Visa card instantly.
        </p>
        <button
          type="button" 
          className="portal-btn-primary"
          style={{ width: '100%', height: '48px', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}
          onClick={() => s.go?.('cardApply')}
        >
          + Apply New Card
        </button>
      </div>
    );
  }
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
          style={{ width: '100%', height: '48px', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}
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

export function CardsDesktopTransactions({ items, card, cardLast4, onViewAll, title = 'Recent Transactions', limit = 5, pageFilter = 'card' }) {
  const [liveItems, setLiveItems] = useState(null);
  const [selectedTx, setSelectedTx] = useState(null);
  const [copiedTxId, setCopiedTxId] = useState('');

  const handleCopyTxId = useCallback((txId) => {
    try { navigator.clipboard?.writeText(txId); } catch { /* noop */ }
    setCopiedTxId(txId);
    window.setTimeout(() => setCopiedTxId(''), 2000);
  }, []);

  useEffect(() => {
    if (pageFilter !== 'card' || !isHttpApi || !hasHttpSession()) return undefined;
    const session = getHttpSession();
    if (!session?.userId) return undefined;

    let cancelled = false;
    const cNo = String(card?.wasabiCardId || card?.cardId || card?.id || card?.cardNo || cardLast4 || '');
    const l4 = String(card?.last4 || cardLast4 || (cNo.replace(/\D/g, '').length >= 4 ? cNo.replace(/\D/g, '').slice(-4) : ''));

    if (!cNo && !l4) return undefined;

    fetchCardTransactions(session.userId, { cardId: cNo, last4: l4 })
      .then((res) => {
        if (!cancelled && res?.items) {
          setLiveItems(res.items);
        }
      })
      .catch(() => {
        if (!cancelled) setLiveItems(null);
      });

    return () => { cancelled = true; };
  }, [card, cardLast4, pageFilter]);

  const filtered = useMemo(() => {
    const baseItems = liveItems != null ? liveItems : A.resolvePortalActivityWithHistory(items);
    let list = A.normalizeActivityItems(baseItems);
    if (pageFilter === 'wallet') {
      list = A.filterActivityForWalletPage(list);
    } else if (pageFilter === 'dashboard') {
      list = A.filterActivityForDashboard(list);
    } else {
      list = A.filterActivityForCardPage(list, card || cardLast4);
    }
    return A.sortActivityChronological(list).slice(0, limit);
  }, [liveItems, items, card, cardLast4, limit, pageFilter]);

  return (
    <>
      <section className="portal-mycards-desk-tx" aria-label="Recent transactions">
        <div className="portal-mycards-desk-tx__head">
          <h2 className="portal-mycards-section__title">{title}</h2>
          {onViewAll && filtered.length > 0 ? (
            <button type="button" className="portal-mycards-desk-tx__view-all" onClick={onViewAll}>
              See all transactions →
            </button>
          ) : null}
        </div>

        {!filtered.length ? (
          <p className="portal-mycards-desk-tx__empty">No transactions yet.</p>
        ) : (
          <div className="portal-mycards-desk-tx__list-panel">
            <div className="portal-dash-wf__tx-list">
              {filtered.map((tx, idx) => (
                <DashboardActivityRow
                  key={tx.id ? `${tx.id}_${tx.kind || ''}_${tx.at || ''}_${idx}` : `tx_${idx}`}
                  tx={tx}
                  onClick={() => setSelectedTx(tx)}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      <TransactionDetailsDrawer
        tx={selectedTx}
        onClose={() => setSelectedTx(null)}
        onCopyTxId={handleCopyTxId}
        copyState={copiedTxId}
      />
    </>
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
    s.resetCardDetails?.();
  }, [carouselSlots, setSelectedCardIndex, userCards, s]);

  if (!userCards.length) {
    return <MyCardsEmptyState s={s} />;
  }

  const isAddSlot = deskSlide >= 0 && deskSlide < carouselSlots.length && carouselSlots[deskSlide] === null;
  const selectedCard = isAddSlot ? null : (carouselSlots[deskSlide] ?? userCards[selectedCardIndex] ?? userCards[0]);
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
            items={s.activityItems}
            card={selectedCard}
            cardLast4={selectedCard?.last4}
            pageFilter="card"
            title="Recent Transactions"
            limit={5}
            onViewAll={() => {
              const targetCardId = selectedCard?.wasabiCardId || selectedCard?.cardNo || selectedCard?.id || selectedCard?.last4 || s?.currentCard?.last4;
              s.go('transactions', { search: { source: 'card', cardId: targetCardId, last4: targetCardId } });
            }}
          />
        </div>

        <div className="portal-mycards-desk__col portal-mycards-desk__col--info">
          <CardsDesktopInfoPanel key={selectedCard?.id ?? deskSlide} card={selectedCard} s={s} />
        </div>
      </div>
    </div>
  );
}
