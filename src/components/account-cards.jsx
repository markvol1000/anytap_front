// ===== Card Components =====
// DebitCardFace       — official PNG artwork + dynamic overlay
// DashboardCardWallet — peek carousel with add-card slot
// AccountMyCards      — Cards tab: carousel, quick actions, limits
// DashboardCardPager  — dot pager for carousel
// DashboardCardFoot   — variant/status footer bar
// TODO: card freeze/unfreeze → Wasabi API (freeze/unfreeze endpoint)
// TODO: card number/CVV display → Wasabi API secure detail fetch

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './ui.jsx';
import { RecentActivitySection } from './account-activity.jsx';
import * as A from '../lib/account-data.js';
import { resolveWalletAddress } from '../lib/api/display-data.js';
import { AccountMyCardsDesktop } from './account-cards-desktop.jsx';
import { CardMobileManagementPanel } from './CardManagementPanels.jsx';
import { CardPanel } from './portal/CardPanel.jsx';
import { CardQuickActionGroup } from './QuickActionGroup.jsx';

/** Official Anytap card — PNG artwork + dynamic overlay only */
export function PortalCardMedia({
  variant = 'virtual',
  typeLabel,
  statusBadge,
  badgeDot = '#C4C9D1',
  maskedNumber,
  cardKind,
  networkLabel,
  dimmed = false,
  shimmer = false,
  compact = false,
  dashboard = false,
  showBalance = false,
  balance,
  balanceLabel = 'Available Balance',
  blur = false,
  hero = false,
  emphasizeBadge = false,
  minimalOverlay = false,
  activeOverlay = false,
  pageLayout = false,
  expiry,
  className = '',
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = A.CARD_IMAGES[variant] ?? A.CARD_IMAGES.virtual;

  useEffect(() => {
    setImgFailed(false);
  }, [src]);

  const cardTheme = A.CARD_THEME[variant] ?? A.CARD_THEME.virtual;

  return (
    <div
      className={[
        'portal-card-media',
        `portal-card-media--${variant}`,
        ' is-bg-art',
        dimmed ? ' is-dimmed' : '',
        blur ? ' is-blur' : '',
        shimmer ? ' is-shimmer' : '',
        compact ? ' is-compact' : '',
        dashboard ? ' is-dashboard' : '',
        hero ? ' is-hero' : '',
        emphasizeBadge ? ' is-badge-strong' : '',
        activeOverlay ? ' is-active-overlay' : '',
        pageLayout ? ' is-page-layout' : '',
        imgFailed ? ' is-fallback' : '',
        className,
      ].filter(Boolean).join(' ')}
      data-card-theme={cardTheme}>
      <div className="portal-card-media__visual">
        {!imgFailed ? (
          <img
            className="portal-card-media__img"
            src={src}
            alt=""
            width={1240}
            height={728}
            draggable={false}
            decoding="async"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="portal-card-media__fallback" aria-hidden="true" />
        )}
        <div className="portal-card-media__overlay">
          {pageLayout ? (
            <>
              <div className="portal-card-media__head">
                {cardKind && (
                  <span className="portal-card-media__prepaid-kind">{cardKind}</span>
                )}
                {statusBadge && (
                  <div className="portal-card-media__badge">
                    <span className="portal-card-media__dot" style={{ background: badgeDot }} />
                    <span className="portal-card-media__badge-text">{statusBadge}</span>
                  </div>
                )}
              </div>
              {showBalance && balance ? (
                <div className="portal-card-media__prepaid-balance">
                  <span className="portal-card-media__balance-label">{balanceLabel}</span>
                  <span className="portal-card-media__balance-val">{balance}</span>
                </div>
              ) : null}
              {(maskedNumber || expiry) && (
                <div className="portal-card-media__foot portal-card-media__foot--prepaid">
                  <span className="portal-card-media__pan-line">
                    {maskedNumber && <span className="portal-card-media__num">{maskedNumber}</span>}
                    {expiry && <span className="portal-card-media__expiry-val">{expiry}</span>}
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="portal-card-media__head">
                <div className="portal-card-media__head-start">
                  {statusBadge && !minimalOverlay && !activeOverlay && (
                    <div className="portal-card-media__badge">
                      <span className="portal-card-media__dot" style={{ background: badgeDot }} />
                      <span className="portal-card-media__badge-text">{statusBadge}</span>
                    </div>
                  )}
                  {!showBalance && !minimalOverlay && !activeOverlay && (typeLabel || networkLabel) && (
                    <div className="portal-card-media__meta">
                      {typeLabel && <span className="portal-card-media__type">{typeLabel}</span>}
                      {networkLabel && <span className="portal-card-media__network">{networkLabel}</span>}
                    </div>
                  )}
                </div>
                {showBalance && balance && (
                  <div className="portal-card-media__balance">
                    <span className="portal-card-media__balance-label">{balanceLabel}</span>
                    <span className="portal-card-media__balance-val">{A.formatCardBalance(balance)}</span>
                  </div>
                )}
              </div>
              {(cardKind || maskedNumber || (hero && networkLabel && !minimalOverlay && !activeOverlay)) && (
                <div className={`portal-card-media__foot${activeOverlay ? ' portal-card-media__foot--active' : ''}`}>
                  <div className="portal-card-media__details">
                    {cardKind && !minimalOverlay && (
                      <span className={`portal-card-media__kind${activeOverlay ? ' portal-card-media__kind--brand' : ''}`}>{cardKind}</span>
                    )}
                    {maskedNumber && <span className="portal-card-media__num">{maskedNumber}</span>}
                  </div>
                  {hero && networkLabel && !minimalOverlay && !activeOverlay && (
                    <span className="portal-card-media__network-mark">{networkLabel}</span>
                  )}
                </div>
              )}
            </>
          )}
          {shimmer && <div className="portal-card-media__pulse" aria-hidden="true" />}
        </div>
      </div>
    </div>
  );
}

/** Debit card face — official artwork + dynamic fields (Dashboard / Cards / Details) */
export function DebitCardFace({
  card,
  onClick,
  className = '',
  dimmed = false,
  shimmer = false,
  showBalance = true,
  showFooter = true,
  dashboard = false,
  hero = false,
}) {
  if (!card) return null;

  const variant = card.variant === 'physical' ? 'physical' : 'virtual';
  const badge = A.getCardStatusDisplay(card);
  const canShowBalance = showBalance && card.status === 'active'
    && (card.balanceUsdt != null || card.balance);
  const canShowFooter = showFooter && card.last4;

  const face = (
    <PortalCardMedia
      variant={variant}
      pageLayout
      dimmed={dimmed}
      shimmer={shimmer}
      hero={hero}
      dashboard={dashboard}
      className={className}
      cardKind={A.cardDebitTypeLabel(card)}
      statusBadge={badge.label}
      badgeDot={badge.dot}
      showBalance={canShowBalance}
      balance={canShowBalance ? A.formatCardSpendingBalance(card) : undefined}
      balanceLabel="Available Balance"
      maskedNumber={canShowFooter ? A.maskCardDashboard(card.last4) : undefined}
      expiry={canShowFooter && card.expiry ? card.expiry : undefined}
    />
  );

  if (onClick) {
    return (
      <button
        type="button"
        className="portal-card-media__tap"
        onClick={() => onClick(card)}
        aria-label={`Open ${A.cardVariantLabel(card)} details`}>
        {face}
      </button>
    );
  }

  return face;
}

export function buildDashboardCarouselSlots(userCards) {
  const count = userCards.length;
  if (count === 0) return [];
  if (count >= A.MAX_CARDS_PER_USER) return userCards;
  return [...userCards, null];
}

/** Dashboard — issue first card placeholder (0 cards) */
export function DashboardIssueFirstCard({ onAdd, disabled = false, className = '' }) {
  return (
    <button
      type="button"
      className={['debit-card debit-card--dash-placeholder debit-card--dash-first', className].filter(Boolean).join(' ')}
      onClick={onAdd}
      disabled={disabled}
      aria-label="Issue your first card">
      <span className="debit-card__empty-plus" aria-hidden="true">
        <Icon name="plus" size={36} stroke={2} />
      </span>
      <span className="debit-card__empty-label">Apply Card</span>
      <span className="debit-card__empty-sub">Virtual from 1 USDT · Physical from 100 USDT</span>
    </button>
  );
}

/** Card slide — add slot: centered plus button + label below */
export function DashboardAddCardPlaceholder({
  onAdd,
  disabled = false,
  className = '',
  label = 'Add Card',
}) {
  return (
    <button
      type="button"
      className={['debit-card debit-card--dash-placeholder debit-card--dash-add', className].filter(Boolean).join(' ')}
      onClick={onAdd}
      disabled={disabled}
      aria-label={label}>
      <span className="debit-card__empty-plus" aria-hidden="true">
        <Icon name="plus" size={28} stroke={2} />
      </span>
      <span className="debit-card__empty-label">{label}</span>
    </button>
  );
}

export function EmptyCardFirstSlot({ onAdd, disabled = false }) {
  return (
    <button
      type="button"
      className="debit-card debit-card--empty"
      onClick={onAdd}
      disabled={disabled}
      aria-label="Issue your first card">
      <div className="debit-card__glow" aria-hidden="true" />
      <span className="debit-card__empty-plus" aria-hidden="true">
        <Icon name="plus" size={36} stroke={2} />
      </span>
      <span className="debit-card__empty-label">Issue Your First Card</span>
    </button>
  );
}

export function buildWalletSlots(userCards, max = A.MAX_CARDS_PER_USER) {
  return Array.from({ length: max }, (_, i) => userCards[i] ?? null);
}

function AddCardSlot(props) {
  return <DashboardAddCardPlaceholder {...props} />;
}

function CardSlide({
  card,
  s,
  hideCaption = false,
  dashboard = false,
  wallet = false,
  cardMenu = false,
  showQuickActions = false,
  quickActionMode = 'detail',
  onCardClick,
  dimmed = false,
  shimmer = false,
}) {
  if (wallet) {
    const face = (
      <DebitCardFace
        card={card}
        onClick={onCardClick}
        dashboard={dashboard}
        dimmed={dimmed || ['creating', 'issued', 'shipping', 'frozen'].includes(card.status)}
        shimmer={shimmer || ['creating', 'issued'].includes(card.status)}
        showBalance={s.cardIsActive && card.status === 'active'}
        showFooter={s.cardHasNumber && card.status !== 'creating' && !!card.last4}
      />
    );

    if (cardMenu || showQuickActions) {
      return (
        <div className="card-strip__unit">
          <div className="card-strip__card">
            {face}
          </div>
          {showQuickActions && card ? (
            <CardQuickActionGroup
              s={s}
              card={card}
              mode={quickActionMode}
              className={`quick-action-group--in-carousel${quickActionMode === 'detail' ? ' quick-action-group--card-carousel' : ''}`}
            />
          ) : null}
        </div>
      );
    }

    return (
      <div className="card-strip__card">{face}</div>
    );
  }

  const showBalance = s.cardIsActive && card.status === 'active' && !!card.balance;
  const showDetails = s.cardHasNumber && (!dashboard || card.status !== 'creating');

  return (
    <div className="portal-card-carousel__slide">
      <div className="portal-card-carousel__slide-inner">
        <DebitCardFace
          card={card}
          showBalance={showBalance}
          showFooter={showDetails}
        />
      </div>
      {!hideCaption && (
        <p className="portal-card-carousel__caption">
          {A.cardTypeLine(card)}
          <span className="portal-card-carousel__caption-num">{A.maskCardShort(card.last4)}</span>
        </p>
      )}
    </div>
  );
}

export function CardOnboardingActions({ s, layout = 'inline' }) {
  const applyDisabled = !s.kycApproved && !s.cardApplicationPending;
  const applyLimited = !s.cardLimit?.canAdd;

  const goApply = () => s.go('cardApply');
  const goRegister = () => s.go('cardRegister');

  if (layout === 'header') {
    return (
      <div className="portal-card-onboard portal-card-onboard--header">
        <button
          type="button"
          className="btn btn--accent btn--sm portal-card-onboard__header-btn"
          onClick={goApply}
          disabled={applyDisabled || applyLimited}>
          + Apply New Card
        </button>
        <button
          type="button"
          className="btn btn--outline btn--sm portal-card-onboard__header-btn"
          onClick={goRegister}>
          Register Existing Card
        </button>
      </div>
    );
  }

  if (layout === 'cards') {
    return (
      <div className="portal-card-onboard portal-card-onboard--cards">
        <button
          type="button"
          className="portal-card-onboard__card"
          onClick={goApply}
          disabled={applyDisabled || applyLimited}>
          <span className="portal-card-onboard__icon" aria-hidden="true">
            <Icon name="plus" size={24} stroke={1.75} />
          </span>
          <span className="portal-card-onboard__body">
            <span className="portal-card-onboard__title">Apply New Card</span>
            <span className="portal-card-onboard__desc">Request a new Anytap card.</span>
          </span>
          <span className="portal-card-onboard__arrow" aria-hidden="true">
            <Icon name="chevron" size={18} stroke={2} />
          </span>
        </button>
        <button type="button" className="portal-card-onboard__card" onClick={goRegister}>
          <span className="portal-card-onboard__icon" aria-hidden="true">
            <Icon name="scan" size={24} stroke={1.75} />
          </span>
          <span className="portal-card-onboard__body">
            <span className="portal-card-onboard__title">Register Existing Card</span>
            <span className="portal-card-onboard__desc">Activate a pre-issued card you received.</span>
          </span>
          <span className="portal-card-onboard__arrow" aria-hidden="true">
            <Icon name="chevron" size={18} stroke={2} />
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="portal-card-onboard portal-card-onboard--inline">
      <button
        type="button"
        className="portal-card-onboard__link"
        onClick={goApply}
        disabled={applyDisabled || applyLimited}>
        + Apply New Card
      </button>
      <button type="button" className="portal-card-onboard__link" onClick={goRegister}>
        + Register Existing Card
      </button>
    </div>
  );
}

function CardOnboardingSheet({ s, open, onClose, hint }) {
  const applyDisabled = !s.kycApproved && !s.cardApplicationPending;
  const applyLimited = !s.cardLimit?.canAdd;

  if (!open) return null;

  return (
    <div className="portal-sheet" role="dialog" aria-modal="true" aria-label="Card actions">
      <button type="button" className="portal-sheet__backdrop" onClick={onClose} aria-label="Close" />
      <div className="portal-sheet__panel portal-card-onboard-sheet">
        <div className="portal-sheet__head">
          <h3 className="portal-sheet__title">Manage Cards</h3>
          <button type="button" className="portal-sheet__close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>
        <p className="portal-card-onboard-sheet__sub">
          Add a new Anytap card or register a pre-issued card you already received.
        </p>

        <div className="portal-card-onboard portal-card-onboard--cards portal-card-onboard--sheet">
          <button
            type="button"
            className="portal-card-onboard__card portal-card-onboard__card--sheet"
            onClick={() => {
              onClose();
              s.go('cardApply');
            }}
            disabled={applyDisabled || applyLimited}>
            <span className="portal-card-onboard__icon" aria-hidden="true">
              <Icon name="plus" size={24} stroke={1.75} />
            </span>
            <span className="portal-card-onboard__body">
              <span className="portal-card-onboard__title">Apply New Card</span>
              <span className="portal-card-onboard__desc">Request a new Anytap card.</span>
            </span>
            <span className="portal-card-onboard__arrow" aria-hidden="true">
              <Icon name="chevron" size={18} stroke={2} />
            </span>
          </button>

          <button
            type="button"
            className="portal-card-onboard__card portal-card-onboard__card--sheet"
            onClick={() => {
              onClose();
              s.go('cardRegister');
            }}>
            <span className="portal-card-onboard__icon" aria-hidden="true">
              <Icon name="scan" size={24} stroke={1.75} />
            </span>
            <span className="portal-card-onboard__body">
              <span className="portal-card-onboard__title">Register Existing Card</span>
              <span className="portal-card-onboard__desc">Activate a pre-issued card you received.</span>
            </span>
            <span className="portal-card-onboard__arrow" aria-hidden="true">
              <Icon name="chevron" size={18} stroke={2} />
            </span>
          </button>
        </div>

        {hint ? <p className="portal-card-onboard-sheet__hint">{hint}</p> : null}
      </div>
    </div>
  );
}

export function DashboardYourCardsHead({
  s,
  showNew = true,
  hint,
  hintWarn = false,
  title = 'Your cards',
  addIcon = false,
  hideTitle = false,
  manageLabel,
  onManage,
}) {
  const [showOnboardingSheet, setShowOnboardingSheet] = useState(false);

  return (
    <>
      <div className="portal-dash-cards-head">
        <div>
          {!hideTitle && (
            <h2 className="portal-dash-section__title portal-dash-cards-head__title">{title}</h2>
          )}
          {hint ? (
            <p className={`portal-mycards__hint${hintWarn ? ' portal-mycards__hint--warn' : ''}${hideTitle ? ' portal-mycards__hint--solo' : ''}`}>{hint}</p>
          ) : null}
        </div>
        {manageLabel && onManage ? (
          <button type="button" className="portal-dash-cards-head__link" onClick={onManage}>
            {manageLabel}
          </button>
        ) : showNew ? (
          addIcon ? (
            <div className="portal-dash-cards-head__icon-actions">
              <button
                type="button"
                className="portal-dash-cards-head__add"
                onClick={() => setShowOnboardingSheet(true)}
                aria-label="Manage cards">
                <Icon name="plus" size={18} stroke={2.5} />
              </button>
            </div>
          ) : (
            <CardOnboardingActions s={s} layout="inline" />
          )
        ) : null}
      </div>
      <CardOnboardingSheet
        s={s}
        open={showOnboardingSheet}
        onClose={() => setShowOnboardingSheet(false)}
        hint={hint}
      />
    </>
  );
}

export function DashboardCardPager({
  slideIndex,
  maxSlots,
  onSelect,
  showPositionLabel = false,
}) {
  return (
    <div className={`portal-dash-card-pager${showPositionLabel ? ' portal-dash-card-pager--labeled' : ''}`}>
      <div className="portal-dash-card-pager__dots" role="tablist" aria-label="Card slots">
        {Array.from({ length: maxSlots }, (_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === slideIndex}
            className={`portal-dash-card-pager__dot${i === slideIndex ? ' is-active' : ''}`}
            onClick={() => onSelect?.(i)}
            aria-label={`Card slot ${i + 1}`}
          />
        ))}
      </div>
      {showPositionLabel && maxSlots > 1 && (
        <span className="portal-dash-card-pager__count">
          {slideIndex + 1} / {maxSlots}
        </span>
      )}
    </div>
  );
}

const CARD_SLIDE_RATIO = 0.9;
const CARD_SLIDE_RATIO_CENTERED = 0.76;
export const CARD_SLIDE_RATIO_OVERVIEW = 0.87;
const CARD_SLIDE_GAP = 16;

export function DashboardCardWallet({
  slots,
  slideIndex,
  onSlideChange,
  s,
  allFull = false,
  wide = false,
  cardMenu = false,
  centered = false,
  adaptivePeekCenter = false,
  onAddCard,
  onCardClick,
  dashboard = false,
  dashPlaceholder = false,
  slideRatio: slideRatioProp,
  showQuickActions = false,
  quickActionMode = 'detail',
}) {
  const viewportRef = useRef(null);
  const dragStartX = useRef(null);
  const dragStartY = useRef(null);
  const dragPointerId = useRef(null);
  const isCentered = centered || cardMenu;
  const slideRatio = slideRatioProp ?? (isCentered ? CARD_SLIDE_RATIO_CENTERED : CARD_SLIDE_RATIO);
  const baseGap = CARD_SLIDE_GAP;
  const [slideWidth, setSlideWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [slideGap, setSlideGap] = useState(baseGap);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    const measure = () => {
      const cw = viewport.getBoundingClientRect().width;
      setContainerWidth(cw);
      setSlideWidth(cw > 0 ? cw * slideRatio : 0);
      const strip = viewport.closest('.card-strip');
      const raw = strip ? getComputedStyle(strip).getPropertyValue('--card-slide-gap').trim() : '';
      const parsed = raw ? parseFloat(raw) : baseGap;
      setSlideGap(Number.isFinite(parsed) ? parsed : baseGap);
    };

    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(viewport);
    window.addEventListener('resize', measure);

    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [slots.length, slideRatio, isCentered, baseGap]);

  const goTo = useCallback((index) => {
    const next = Math.max(0, Math.min(slots.length - 1, index));
    if (next !== slideIndex) onSlideChange(next);
  }, [onSlideChange, slideIndex, slots.length]);

  const onDragStart = useCallback((clientX, clientY, pointerId = null) => {
    dragStartX.current = clientX;
    dragStartY.current = clientY;
    dragPointerId.current = pointerId;
  }, []);

  const onDragEnd = useCallback((clientX, clientY, pointerId = null) => {
    if (dragStartX.current == null || dragStartY.current == null) return;
    if (pointerId != null && dragPointerId.current != null && pointerId !== dragPointerId.current) return;
    const dx = clientX - dragStartX.current;
    const dy = clientY - dragStartY.current;
    dragStartX.current = null;
    dragStartY.current = null;
    dragPointerId.current = null;
    if (Math.abs(dx) < 48) return;
    if (Math.abs(dx) <= Math.abs(dy)) return;
    goTo(dx < 0 ? slideIndex + 1 : slideIndex - 1);
  }, [goTo, slideIndex]);

  const onTouchStart = useCallback((e) => {
    const touch = e.touches?.[0];
    if (!touch) return;
    onDragStart(touch.clientX, touch.clientY);
  }, [onDragStart]);

  const onTouchEnd = useCallback((e) => {
    const touch = e.changedTouches?.[0];
    if (!touch) return;
    onDragEnd(touch.clientX, touch.clientY);
  }, [onDragEnd]);

  const onPointerDown = useCallback((e) => {
    if (e.pointerType === 'touch' || e.button !== 0) return;
    onDragStart(e.clientX, e.clientY, e.pointerId);
  }, [onDragStart]);

  const onPointerUp = useCallback((e) => {
    if (e.pointerType === 'touch') return;
    onDragEnd(e.clientX, e.clientY, e.pointerId);
  }, [onDragEnd]);

  if (!slots.length) return null;

  const stripClass = [
    'card-strip',
    'card-strip--peek',
    isCentered ? 'card-strip--centered' : '',
    adaptivePeekCenter ? 'card-strip--peek-adaptive' : '',
    wide ? 'card-strip--wide' : '',
    allFull ? ' card-strip--full' : '',
  ].filter(Boolean).join(' ');

  const shouldCenterActive = isCentered
    || (adaptivePeekCenter && (slideIndex > 0 || slots.length === 1));
  const centerOffset = shouldCenterActive && containerWidth > 0 && slideWidth > 0
    ? (containerWidth - slideWidth) / 2
    : 0;
  const trackOffset = slideWidth > 0
    ? slideIndex * (slideWidth + slideGap) - centerOffset
    : 0;
  const slideStyle = slideWidth > 0
    ? { width: slideWidth, flexBasis: slideWidth, flexShrink: 0 }
    : undefined;

  return (
    <div className={stripClass}>
      <div
        ref={viewportRef}
        className="card-strip__viewport"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="tablist"
        aria-label="Your cards">
        <div
          className="card-strip__track"
          style={{ transform: `translate3d(${-trackOffset}px, 0, 0)` }}>
          {slots.map((card, i) => (
            <div
              key={card?.id ?? `add-${i}`}
              className={`card-strip__slide${i === slideIndex ? ' is-active' : ''}`}
              style={slideStyle}
              role="tab"
              aria-selected={i === slideIndex}
              aria-hidden={i !== slideIndex}>
              {card ? (
                <CardSlide
                  wallet
                  cardMenu={cardMenu}
                  showQuickActions={showQuickActions}
                  quickActionMode={quickActionMode}
                  card={card}
                  s={s}
                  hideCaption
                  dashboard={dashboard}
                  onCardClick={onCardClick}
                />
              ) : (
                <DashboardAddCardPlaceholder onAdd={onAddCard} disabled={!s.cardLimit.canAdd} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CardCarousel({
  cards,
  index,
  onChange,
  s,
  className = '',
  hideCaption = false,
  dashboard = false,
}) {
  const trackRef = useRef(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track?.children[index]) return;
    track.children[index].scrollIntoView({ behavior: 'instant', inline: 'center', block: 'nearest' });
  }, [index]);

  const onScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track || !track.children.length) return;
    const { scrollLeft, offsetWidth } = track;
    const i = Math.round(scrollLeft / offsetWidth);
    if (i !== index && i >= 0 && i < cards.length) onChange(i);
  }, [cards.length, index, onChange]);

  if (!cards.length) return null;

  return (
    <div className={`portal-card-carousel${className ? ` ${className}` : ''}`}>
      <div
        className="portal-card-carousel__track"
        ref={trackRef}
        onScroll={onScroll}
        role="tablist"
        aria-label="Your cards">
        {cards.map((card, i) => (
          <div key={card.id} role="tab" aria-selected={i === index} className="portal-card-carousel__item">
            <CardSlide
              card={card}
              s={s}
              hideCaption={hideCaption}
              dashboard={dashboard}
            />
          </div>
        ))}
      </div>
      {cards.length > 1 && (
        <div className="portal-card-carousel__dots" aria-hidden="true">
          {cards.map((card, i) => (
            <button
              key={card.id}
              type="button"
              className={`portal-card-carousel__dot${i === index ? ' is-active' : ''}`}
              onClick={() => onChange(i)}
              aria-label={`Card ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function DashboardCardVariantTabs({ cards, index, onChange }) {
  const variants = ['virtual', 'physical'].filter((v) => cards.some((c) => c.variant === v));
  if (variants.length <= 1) return null;

  const currentVariant = cards[index]?.variant ?? 'virtual';

  const pickVariant = (variant) => {
    const i = cards.findIndex((c) => c.variant === variant);
    if (i >= 0) onChange(i);
  };

  return (
    <div className="portal-dash-variant-tabs" role="tablist" aria-label="Card type">
      {variants.map((variant) => (
        <button
          key={variant}
          type="button"
          role="tab"
          aria-selected={currentVariant === variant}
          className={`portal-dash-variant-tabs__btn${currentVariant === variant ? ' is-active' : ''}`}
          onClick={() => pickVariant(variant)}>
          {variant === 'virtual' ? 'Virtual Visa' : 'Physical Visa'}
        </button>
      ))}
    </div>
  );
}

export function CardsPickerSheet({ open, onClose, cards, selectedIndex, onSelect, maxCards = A.MAX_CARDS_PER_USER }) {
  if (!open) return null;

  return (
    <div className="portal-sheet" role="dialog" aria-modal="true" aria-label="Your cards">
      <button type="button" className="portal-sheet__backdrop" onClick={onClose} aria-label="Close" />
      <div className="portal-sheet__panel">
        <div className="portal-sheet__head">
          <h3 className="portal-sheet__title">Your cards</h3>
          <button type="button" className="portal-sheet__close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>
        <ul className="portal-sheet__list">
          {Array.from({ length: maxCards }, (_, i) => {
            const card = cards[i];
            const active = i === selectedIndex;
            return (
              <li key={card?.id ?? `slot-${i}`}>
                <button
                  type="button"
                  className={`portal-sheet__item${active ? ' is-active' : ''}${!card ? ' is-empty' : ''}`}
                  disabled={!card}
                  onClick={() => {
                    if (card) {
                      onSelect(i);
                      onClose();
                    }
                  }}>
                  <span className="portal-sheet__item-body">
                    <span className="portal-sheet__item-num">Card {i + 1}</span>
                    <span className="portal-sheet__item-meta">
                      {card
                        ? `${A.cardVariantLabel(card)} · ${A.maskCardEnding(card)}`
                        : 'Empty slot'}
                    </span>
                  </span>
                  {active && card && <Icon name="check" size={16} stroke={2.5} />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function DashboardCardFoot({ s, carousel = false, compact = false, hideVariant = false }) {
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!s.userCards.length || s.cardDimmed) return null;

  const card = s.userCards[s.selectedCardIndex] ?? s.primaryCard;
  if (!card) return null;

  const openSheet = () => setSheetOpen(true);

  if (compact) {
    return (
      <>
        <div className={`portal-dash-card-foot portal-dash-card-foot--compact${carousel ? ' portal-dash-card-foot--carousel' : ''}${hideVariant ? ' portal-dash-card-foot--count-only' : ''}`}>
          {!hideVariant && <span className="portal-dash-card-foot__type">{A.cardVariantLabel(card)}</span>}
          <button type="button" className="portal-dash-card-foot__count" onClick={openSheet}>
            Cards {s.cardLimit.shortLabel}
          </button>
        </div>
        <CardsPickerSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          cards={s.userCards}
          selectedIndex={s.selectedCardIndex}
          onSelect={s.setSelectedCardIndex}
          maxCards={s.cardLimit.max}
        />
      </>
    );
  }

  return (
    <>
      <div className="portal-dash-card-foot">
        <div className="portal-dash-card-foot__current">
          <span className="portal-dash-card-foot__label">Current Card</span>
          <span className="portal-dash-card-foot__line">
            {A.cardTypeLine(card)}
            <strong>{A.maskCardEnding(card)}</strong>
          </span>
        </div>
        <button type="button" className="portal-dash-card-foot__count" onClick={openSheet}>
          Cards {s.cardLimit.shortLabel}
        </button>
      </div>
      <CardsPickerSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        cards={s.userCards}
        selectedIndex={s.selectedCardIndex}
        onSelect={s.setSelectedCardIndex}
        maxCards={s.cardLimit.max}
      />
    </>
  );
}

export function CardInformationPanel({ card, s, className = '' }) {
  if (!card) return null;

  const [verifyCode, setVerifyCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const walletAddress = resolveWalletAddress(
    card.linkedWallet
    ?? s?.mockContext?.wallet?.address
    ?? s?.accountState?.walletAddress,
  );
  const fullNumber = card?.fullNumber ?? '';
  const revealOpen = Boolean(s?.showCardDetails);
  const isVerified = Boolean(s?.isCardDetailVerified);

  useEffect(() => {
    setVerifyCode('');
    setVerifyLoading(false);
  }, [card?.id, revealOpen]);

  const handleCopyWallet = () => {
    if (s?.copy) {
      s.copy(walletAddress, 'Wallet address copied');
      return;
    }
    try { navigator.clipboard?.writeText(walletAddress); } catch { /* noop */ }
    s?.showToast?.('Wallet address copied');
  };

  const resetSensitiveView = () => {
    s?.setShowCardDetails?.(false);
    s?.setIsCardDetailVerified?.(false);
    s?.setShowCvv?.(false);
    s?.setVerifyCodeSent?.(false);
    setVerifyCode('');
  };

  const handleUnlockClick = () => {
    if (isVerified) {
      resetSensitiveView();
      return;
    }
    s?.setShowCardDetails?.(true);
    s?.setVerifyCodeSent?.(false);
    s?.setShowCvv?.(false);
    setVerifyCode('');
  };

  const sendVerifyCode = () => {
    s?.setShowCardDetails?.(true);
    s?.setVerifyCodeSent?.(true);
    s?.showToast?.(`Verification code sent to ${s.accountState.email}`);
  };

  const confirmVerifyCode = () => {
    if (verifyCode.trim().length < 6) {
      s?.showToast?.('Enter the 6-digit code from your email');
      return;
    }
    setVerifyLoading(true);
    window.setTimeout(() => {
      setVerifyLoading(false);
      s?.setIsCardDetailVerified?.(true);
      s?.showToast?.('Identity verified');
    }, 700);
  };

  return (
    <section
      className={`portal-card-info${className ? ` ${className}` : ''}`}
      aria-label="Card information">
      <h2 className="portal-mycards-section__title">Card Info</h2>
      <div className="portal-card-info__card">
        <dl className="portal-card-info__grid">
          {card.last4 && (
            <div className="portal-card-info__item">
              <dt className="portal-card-info__label">Card Number</dt>
              <dd className="portal-card-info__value portal-card-info__value--mono">
                <span className="portal-card-info__secure-row">
                  <span>{isVerified ? fullNumber : A.formatCardNumberMasked(card.last4)}</span>
                  <button
                    type="button"
                    className={`portal-card-info__secure-toggle${isVerified ? ' is-unlocked' : ''}`}
                    onClick={handleUnlockClick}
                    aria-label={isVerified ? 'Hide full card number' : 'Unlock full card number'}>
                    <Icon name={isVerified ? 'lockOpen' : 'lock'} size={15} stroke={1.85} />
                  </button>
                </span>
              </dd>
            </div>
          )}
          {card.expiry && (
            <div className="portal-card-info__item">
              <dt className="portal-card-info__label">Expiry Date</dt>
              <dd className="portal-card-info__value portal-card-info__value--mono">
                {A.formatExpiryDisplay(card.expiry)}
              </dd>
            </div>
          )}
          {card.status === 'active' && (
            <div className="portal-card-info__item">
              <dt className="portal-card-info__label">Available Balance</dt>
              <dd className="portal-card-info__value">{A.formatAvailableLimit(card)}</dd>
            </div>
          )}
          {walletAddress ? (
            <div className="portal-card-info__item">
              <dt className="portal-card-info__label">Linked Wallet</dt>
              <dd className="portal-card-info__value">
                <span className="portal-card-info__wallet-row">
                  <span className="portal-card-info__value--mono">{A.shortenWalletAddress(walletAddress)}</span>
                  <button
                    type="button"
                    className="portal-card-info__copy"
                    aria-label="Copy wallet address"
                    onClick={handleCopyWallet}>
                    <Icon name="copy" size={16} stroke={1.75} />
                  </button>
                </span>
              </dd>
            </div>
          ) : null}
          <div className="portal-card-info__item">
            <dt className="portal-card-info__label">Issued Date</dt>
            <dd className="portal-card-info__value">{A.formatIssuedDate(card)}</dd>
          </div>
          {isVerified && (
            <div className="portal-card-info__item">
              <dt className="portal-card-info__label">CVV</dt>
              <dd className="portal-card-info__value portal-card-info__value--mono">
                {s?.showCvv ? card.cvv : '***'}
              </dd>
            </div>
          )}
        </dl>

        {revealOpen && !isVerified && (
          <div className="portal-card-info__verify">
            <div className="portal-card-info__verify-head">
              <strong className="portal-card-info__verify-title">Unlock full card number</strong>
              <button type="button" className="portal-btn-link" onClick={resetSensitiveView}>Cancel</button>
            </div>
            <p className="portal-card-info__verify-msg">
              For your security, verify your email before revealing the full card number.
            </p>
            {!s?.verifyCodeSent ? (
              <button type="button" className="portal-btn-primary portal-card-info__verify-btn" onClick={sendVerifyCode}>
                Send code to email
              </button>
            ) : (
              <div className="portal-card-info__verify-form">
                <label className="portal-label" htmlFor="card-info-verify-code">
                  Enter the 6-digit code sent to {s?.accountState?.email}
                </label>
                <input
                  id="card-info-verify-code"
                  className="portal-input portal-card-info__verify-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                />
                <button
                  type="button"
                  className="portal-btn-primary portal-card-info__verify-btn"
                  disabled={verifyLoading}
                  onClick={confirmVerifyCode}>
                  {verifyLoading ? <span className="portal-spin" /> : 'Verify code'}
                </button>
                <button type="button" className="portal-btn-link portal-card-info__verify-resend" onClick={sendVerifyCode}>
                  Resend code
                </button>
              </div>
            )}
          </div>
        )}

        {isVerified && (
          <>
            {!s?.showCvv ? (
              <button
                type="button"
                className="portal-btn-secondary portal-card-info__cvv-btn"
                onClick={() => s?.setShowCvv?.(true)}>
                Show CVV
              </button>
            ) : (
              <p className="portal-card-info__cvv-hint">CVV will hide automatically in 30 seconds</p>
            )}
            <p className="portal-card-info__note">
              Sensitive card info is fetched on demand and is never stored in our database.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

export function CardMobileWalletActions({ s }) {
  return (
    <div className="portal-card-actions portal-mycards-wallet">
      <div className="portal-card-actions__row">
        <button type="button" className="portal-btn-dark" onClick={() => s.showToast?.('Feature in preview')}>
          Apple Pay
        </button>
        <button type="button" className="portal-btn-secondary" onClick={() => s.showToast?.('Feature in preview')}>
          Google Pay
        </button>
      </div>
      <p className="portal-card-actions__hint">
        Mobile wallet registration is in preview and may require the native app.
      </p>
    </div>
  );
}

export function MyCardsEmptyState({ s }) {
  return (
    <div className="portal-page portal-page--unified portal-mycards portal-mycards--v10 portal-mycards--empty">
      <div className="portal-mycards-empty">
        <div className="portal-mycards-empty__art" aria-hidden="true">
          <div className="debit-card debit-card--empty debit-card--placeholder">
            <Icon name="creditCard" size={36} stroke={1.5} />
          </div>
        </div>
        <h2 className="portal-mycards-empty__title">No cards yet</h2>
        <p className="portal-mycards-empty__msg">
          Apply for a new card or activate a pre-issued card to get started.
        </p>
        <CardOnboardingActions s={s} layout="cards" />
        {!s.kycApproved && (
          <p className="portal-mycards-empty__hint">Complete identity verification before applying for a new card.</p>
        )}
      </div>
    </div>
  );
}

export function AccountMyCards({ s }) {
  const { userCards, selectedCardIndex } = s;
  const carouselSlots = useMemo(() => buildDashboardCarouselSlots(userCards), [userCards]);
  const walletAllFull = userCards.length >= A.MAX_CARDS_PER_USER;

  if (!userCards.length) {
    return <MyCardsEmptyState s={s} />;
  }

  const selectedCard = userCards[selectedCardIndex] ?? s.currentCard;
  const showWalletActions = selectedCard?.status === 'active' && s.cardIsActive;

  return (
    <div className="portal-page portal-page--unified portal-mycards portal-mycards--v10">
      <div className="portal-mycards-mob">
        <CardPanel
          mode="detail"
          s={s}
          className="portal-mycards-mob__panel"
          showSlideHead
          slideHeadHint={walletAllFull ? `Maximum ${A.MAX_CARDS_PER_USER} cards issued` : undefined}
        />

        {!s.cardIsActive && s.accountState.cardStatus !== 'active' && s.accountState.cardStatus !== 'issued' && (
          <AccountDashStatusInline s={s} />
        )}

        {selectedCard && (
          <div className="portal-mycards-info">
            {selectedCard.status === 'issued' ? (
              <div style={{ padding: '0 16px', marginTop: '16px' }}>
                <button
                  type="button"
                  className="portal-btn-primary"
                  style={{ width: '100%', height: '48px', borderRadius: '12px', fontSize: '15px', fontWeight: '600' }}
                  onClick={() => s.openActivePhysical(selectedCard)}
                >
                  Activate Card
                </button>
              </div>
            ) : (
              <>
                <CardInformationPanel card={selectedCard} s={s} />
                <CardMobileManagementPanel card={selectedCard} s={s} />
                {showWalletActions && <CardMobileWalletActions s={s} />}
              </>
            )}
          </div>
        )}

        <RecentActivitySection
          title="Recent Card Activity"
          items={A.resolvePortalActivityWithHistory(s.activityItems)}
          pageFilter="card"
          card={selectedCard}
          cardLast4={selectedCard?.last4}
          limit={5}
          className="portal-mycards-recent"
          onItemClick={() => s.go('transactions', { search: { source: 'card' } })}
          onViewAll={() => s.go('transactions', { search: { source: 'card' } })}
          emptyTitle="No card activity yet"
          emptyMsg="Purchases, refunds, and reversals for this card will appear here."
          emptyIcon="creditCard"
        />
      </div>

      <AccountMyCardsDesktop s={s} />
    </div>
  );
}

function AccountDashStatusInline({ s }) {
  const def = s.cardStatusDef;
  return (
    <div className="portal-mycards__status">
      <h3>{def.dashboardTitle ?? def.label}</h3>
      <p>{def.message}</p>
      {def.cta && (
        <button type="button" className="portal-btn-primary portal-mycards__status-cta" onClick={() => s.handleStatusCta(def)}>
          {def.cta}
        </button>
      )}
    </div>
  );
}
