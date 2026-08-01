// ===== Dashboard =====
// AccountHome layout:
//   Greeting (card_active only)
//   Zero Balance prompt (card_active + balance 0)
//   Wallet Hero (card_active)
//   Card Section / Card Carousel
//   Wallet Balance
//   Quick Actions
//   Recent Activity
// TODO: resolveDashboardView() will derive view config from real API state

import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './ui.jsx';
import { PortalButton } from './portal/PortalButton';
import { KycInProgressModal } from './account/KycInProgressModal.jsx';
import { RecentActivitySection } from './account-activity.jsx';
import { TransactionDetailsDrawer } from './account-transactions.jsx';
import { DashboardWalletFirst } from './account-dashboard-wallet-first.jsx';
import {
  DebitCardFace,
  DashboardCardFoot,
  DashboardYourCardsHead,
} from './account-cards.jsx';
import { DashboardWalletHero } from './account-wallet-hero.jsx';
import * as A from '../lib/account-data.js';
import * as D from '../lib/dashboard-state.js';
import * as W from '../utils/wallet-data.js';
import { isKycInProgress, KYC_STEP1_PATH } from '../lib/kyc-actions.js';

const DASHBOARD_REWARDS_MOCK = 128.5;

function MicroProgress({ filled, total }) {
  return (
    <div className="portal-micro-progress" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`portal-micro-progress__dot${i < filled ? ' is-filled' : ''}`} />
      ))}
    </div>
  );
}

function parseJourneyLead(lead) {
  if (!lead) return null;
  if (typeof lead === 'object') {
    return { step: lead.step || null, title: lead.title || '' };
  }
  const parts = String(lead).split(/\s+[—–]\s+/);
  if (parts.length >= 2) {
    return { step: parts[0].trim(), title: parts.slice(1).join(' — ').trim() };
  }
  return { step: null, title: String(lead) };
}

function DashboardJourney({ activeIndex, lead }) {
  const parsed = parseJourneyLead(lead);

  return (
    <div className="portal-journey-wrap">
      {parsed ? (
        <h2 className="portal-journey__lead">
          {parsed.step ? <span className="portal-journey__lead-step">{parsed.step}</span> : null}
          {parsed.title ? <span className="portal-journey__lead-title">{parsed.title}</span> : null}
        </h2>
      ) : null}
      <nav className="portal-journey" aria-label="Account progress">
        <ol className="portal-journey__list">
          {D.DASHBOARD_JOURNEY.map((label, i) => (
            <li
              key={label}
              className={[
                'portal-journey__item',
                i < activeIndex ? 'is-done' : '',
                i === activeIndex ? 'is-active' : '',
              ].filter(Boolean).join(' ')}
              aria-current={i === activeIndex ? 'step' : undefined}>
              <span className="portal-journey__marker" aria-hidden="true">
                {i < activeIndex ? (
                  <Icon name="check" size={10} stroke={2.5} />
                ) : i === activeIndex ? (
                  <span className="portal-journey__marker-pulse" />
                ) : null}
              </span>
              <span className="portal-journey__label">{label}</span>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}

function DashboardActiveStatus({ displayCard, hero }) {
  const statusLabel = hero.statusLabel ?? 'Active';
  const variantLabel = displayCard ? A.cardVariantLabel(displayCard) : 'Virtual Visa';

  return (
    <div className="portal-dash-active-status portal-dash-active-status--minimal">
      <p className="portal-dash-active-status__title">
        <span className="portal-dash-active-status__dot" aria-hidden="true" />
        {statusLabel}
      </p>
      <p className="portal-dash-active-status__sub">{variantLabel}</p>
    </div>
  );
}

function HeroCtaRow({ hero, s, after = false }) {
  if (!hero.primaryCta && !hero.secondaryCta) return null;
  const singlePrimary = !!hero.primaryCta && !hero.secondaryCta;
  return (
    <div className={`portal-dash-card__actions${after ? ' portal-dash-card__actions--after' : ''}${singlePrimary ? ' portal-dash-card__actions--block' : ''}`}>
      {hero.secondaryCta && (
        <PortalButton
          variant="secondary"
          className="portal-dash-card__btn"
          onClick={() => D.runDashboardCta(s, hero.secondaryCta)}>
          {hero.secondaryCta.label}
        </PortalButton>
      )}
      {hero.primaryCta && (
        <PortalButton
          variant="primary"
          className={`portal-dash-card__btn${singlePrimary ? ' portal-dash-card__btn--block' : ''}`}
          style={singlePrimary ? { width: '100%', maxWidth: 'none', display: 'flex' } : undefined}
          onClick={() => D.runDashboardCta(s, hero.primaryCta)}>
          {hero.primaryCta.label}
        </PortalButton>
      )}
    </div>
  );
}

function HeroOnboarding({ hero }) {
  return (
    <div className="portal-hero-onboard">
      <h2 className="portal-hero-onboard__title">
        {hero.title}
        {hero.verified && (
          <Icon name="checkCircle" size={22} stroke={2} className="portal-hero-onboard__check" />
        )}
      </h2>
      {hero.body && <p className="portal-hero-onboard__body">{hero.body}</p>}
      {hero.sub && <p className="portal-hero-onboard__sub">{hero.sub}</p>}
    </div>
  );
}

function HeroWelcome({ hero }) {
  return (
    <div className="portal-hero-welcome">
      {hero.title ? <h2 className="portal-hero-welcome__title">{hero.title}</h2> : null}
      {hero.body && <p className="portal-hero-welcome__body">{hero.body}</p>}
      {hero.sub && <p className="portal-hero-welcome__sub">{hero.sub}</p>}
    </div>
  );
}

function HeroIdentity({ hero }) {
  return (
    <div className="portal-hero-identity">
      {hero.eyebrow && <span className="portal-dash-card__eyebrow">{hero.eyebrow}</span>}
      <div className="portal-hero-identity__status-row">
        <span className="portal-hero-identity__status-k">Status</span>
        <strong className="portal-hero-identity__status-v">{hero.statusLabel}</strong>
      </div>
      {hero.microProgress && <MicroProgress {...hero.microProgress} />}
      {hero.body && <p className="portal-hero-identity__body">{hero.body}</p>}
      {hero.sub && <p className="portal-hero-identity__sub">{hero.sub}</p>}
    </div>
  );
}

function HeroVerified({ hero }) {
  return (
    <div className="portal-hero-verified">
      <h2 className="portal-hero-verified__title">
        {hero.title}
        {hero.verified && (
          <Icon name="checkCircle" size={22} stroke={2} className="portal-hero-verified__check" />
        )}
      </h2>
      {hero.body && <p className="portal-hero-verified__body">{hero.body}</p>}
    </div>
  );
}

function HeroStatusCard({ hero }) {
  return (
    <div className="portal-hero-status">
      <h2 className="portal-hero-status__title">{hero.statusTitle}</h2>
      <p className="portal-hero-status__label">{hero.statusLabel}</p>
      {hero.microProgress && <MicroProgress {...hero.microProgress} />}
      {hero.sub && <p className="portal-hero-status__eta">{hero.sub}</p>}
    </div>
  );
}

function HeroMemberBanner({ hero, s }) {
  const variant = hero.bannerVariant === 'activate' ? 'activate' : 'review';
  return (
    <div className={`portal-member-banner portal-member-banner--${variant}`}>
      <p className="portal-member-banner__title">{hero.title}</p>
      {hero.body && <p className="portal-member-banner__body">{hero.body}</p>}
      {hero.eta && <p className="portal-member-banner__eta">Estimated: {hero.eta}</p>}
      {hero.primaryCta && (
        <PortalButton
          variant="primary"
          className="portal-member-banner__cta"
          onClick={() => D.runDashboardCta(s, hero.primaryCta)}>
          {hero.primaryCta.label}
        </PortalButton>
      )}
    </div>
  );
}

function HeroShipping({ hero, s }) {
  const pct = Math.round((hero.deliveryProgress ?? 0.4) * 100);
  return (
    <div className="portal-member-shipping">
      <div className="portal-member-shipping__head">
        <span className="portal-member-shipping__label">{hero.statusLabel}</span>
        {hero.tracking && (
          <span className="portal-member-shipping__track">Tracking · {hero.tracking}</span>
        )}
      </div>
      <div className="portal-member-shipping__bar" aria-hidden="true">
        <span className="portal-member-shipping__fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="portal-member-shipping__eta">Estimated delivery · {hero.eta ?? '7–14 days'}</p>
      {hero.secondaryCta && (
        <PortalButton
          variant="secondary"
          className="portal-member-shipping__btn"
          onClick={() => D.runDashboardCta(s, hero.secondaryCta)}>
          {hero.secondaryCta.label}
        </PortalButton>
      )}
    </div>
  );
}

function DashboardZeroBalance({ s, cta }) {
  return (
    <section className="portal-zero-balance" aria-label="Zero balance">
      <p className="portal-zero-balance__label">Balance</p>
      <p className="portal-zero-balance__amount">$0.00</p>
      {cta && (
        <PortalButton
          variant="primary"
          className="portal-zero-balance__cta"
          onClick={() => D.runDashboardCta(s, cta)}>
          {cta.label}
        </PortalButton>
      )}
    </section>
  );
}

function DashboardCardSection({ s }) {
  const view = D.resolveDashboardView(s.accountState, s.userCards);
  const { hero, cardDisplay } = view;
  const selectedCard = s.userCards[s.selectedCardIndex] ?? s.primaryCard;
  const isPreCardApply = [
    'kyc_required',
    'kyc_pending',
    'pending_wallet',
    'card_apply_ready',
  ].includes(view.memberState);
  const displayCard = selectedCard ?? (isPreCardApply ? null : A.previewCardTemplate(s.accountState.kycStatus));

  if (cardDisplay === 'carousel') return null;

  const ctaBeforeCard = hero.mode !== 'card';
  const ctaAfterCard = hero.mode === 'card';

  const isShippingCardView = hero.mode === 'shipping' && !!displayCard;

  const renderShippingCard = () => {
    if (!displayCard) return null;
    return (
      <DebitCardFace
        card={displayCard}
        onClick={(card) => s.openCardDetails?.(card)}
        dashboard
        dimmed
        showBalance={false}
        showFooter={!!displayCard.last4}
      />
    );
  };

  const renderSingleCard = () => {
    if (!displayCard) return null;
    return (
      <DebitCardFace
        card={displayCard}
        onClick={(card) => s.openCardDetails?.(card)}
        dashboard
        dimmed={displayCard.status === 'shipping'}
        showBalance={s.cardIsActive && displayCard.status === 'active'}
        showFooter={s.cardHasNumber}
      />
    );
  };

  const renderProcessingCard = () => {
    if (!displayCard) return null;
    return (
      <DebitCardFace
        card={{ ...displayCard, status: 'creating' }}
        dashboard
        shimmer={view.greyCardShimmer}
        dimmed
        showBalance={false}
        showFooter={false}
      />
    );
  };

  return (
    <section className={`portal-dash-section portal-dash-card${hero.mode === 'onboarding' ? ' portal-dash-card--onboard' : ''}${cardDisplay === 'single' ? ' portal-dash-card--single' : ''}`}>
      {view.showJourney && (
        <DashboardJourney activeIndex={view.journeyIndex} lead={view.journeyLead} />
      )}
      {view.showActiveStatus && (
        <DashboardActiveStatus displayCard={displayCard} hero={hero} />
      )}

      {hero.mode === 'onboarding' && <HeroOnboarding hero={hero} />}
      {hero.mode === 'welcome' && <HeroWelcome hero={hero} />}
      {hero.mode === 'identity' && <HeroIdentity hero={hero} />}
      {hero.mode === 'verified' && <HeroVerified hero={hero} />}
      {hero.mode === 'status' && <HeroStatusCard hero={hero} />}
      {hero.mode === 'banner' && <HeroMemberBanner hero={hero} s={s} />}

      {isShippingCardView && (
        <>
          <DashboardYourCardsHead s={s} showNew={false} title="Your Card" />
          <div className="portal-dash-card__cards portal-dash-card__cards--single portal-dash-card__cards--shipping">
            {renderShippingCard()}
          </div>
          <HeroShipping hero={hero} s={s} />
        </>
      )}

      {ctaBeforeCard && hero.mode !== 'banner' && hero.mode !== 'shipping' && <HeroCtaRow hero={hero} s={s} />}

      {!isShippingCardView && cardDisplay === 'single' && (
        <>
          <DashboardYourCardsHead s={s} showNew={view.memberState === 'card_active'} />
          <div className="portal-dash-card__cards portal-dash-card__cards--single">
            {renderSingleCard()}
          </div>
        </>
      )}

      {cardDisplay === 'processing' && (
        <div className="portal-dash-card__cards portal-dash-card__cards--processing">
          {renderProcessingCard()}
        </div>
      )}

      {ctaAfterCard && <HeroCtaRow hero={hero} s={s} after />}

      {!isShippingCardView && !isPreCardApply && (
        <DashboardCardFoot
          s={s}
          carousel={false}
          compact={!view.showJourney}
          hideVariant={view.showActiveStatus}
        />
      )}
    </section>
  );
}

function DashboardGreeting({ s }) {
  const first = String(s.accountState.name || '').trim().split(/\s+/)[0];
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="portal-dash-greet">
      <div>
        <p className="portal-dash-greet__title">
          {first && s.profileReady ? `${greet}, ${first}` : greet}
        </p>
        <p className="portal-dash-greet__sub">Welcome to Anytap</p>
      </div>
    </div>
  );
}

function DashboardWalletBalance({ s }) {
  const view = D.resolveDashboardView(s.accountState, s.userCards);
  if (!view.showWalletBalance) return null;

  const wallet = view.wallet;

  if (wallet.mode === 'empty') {
    return (
      <section className="portal-dash-section portal-wallet-balance portal-wallet-balance--empty">
        <h2 className="portal-dash-section__title">Balance</h2>
        <p className="portal-wallet-balance__empty-title">{wallet.title}</p>
        {wallet.hint && <p className="portal-wallet-balance__hint">{wallet.hint}</p>}
      </section>
    );
  }

  const amount = s.userCards.length > 1
    ? (() => {
      const card = s.userCards[s.selectedCardIndex];
      if (card?.balance) {
        const match = String(card.balance).match(/[\d,.]+/);
        return match ? match[0].replace(/,/g, '') : wallet.amount;
      }
      return wallet.amount;
    })()
    : wallet.amount;

  return (
    <section className="portal-dash-section portal-wallet-balance">
      <h2 className="portal-dash-section__title">Balance</h2>
      <p className="portal-wallet-balance__amount">
        <span className="portal-wallet-balance__value">{amount}</span>
        <span className="portal-wallet-balance__unit">{wallet.currency}</span>
      </p>
      {wallet.hint && <p className="portal-wallet-balance__hint">{wallet.hint}</p>}
    </section>
  );
}

function DashboardQuickActions({ s }) {
  const view = D.resolveDashboardView(s.accountState, s.userCards);
  if (view.showWalletHero || !view.quickActions?.length) return null;
  const tiles = view.quickActions;
  const layout = view.quickActionsLayout;
  const layoutClass = layout === 'single'
    ? ' portal-dash-tiles--single'
    : layout === 'duo'
      ? ' portal-dash-tiles--duo'
      : '';

  return (
    <section className="portal-dash-section portal-dash-quick" aria-label="Quick actions">
      <h2 className="portal-dash-section__title">Quick Actions</h2>
      <nav className={`portal-dash-tiles${layoutClass}`}>
        {tiles.map((tile) => (
          <button
            key={tile.label}
            type="button"
            disabled={tile.disabled}
            className={[
              'portal-dash-tiles__btn',
              tile.accent ? 'portal-dash-tiles__btn--accent' : '',
              tile.disabled ? 'portal-dash-tiles__btn--disabled' : '',
              layout === 'single' ? 'portal-dash-tiles__btn--full' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => D.runDashboardCta(s, tile)}>
            <span className="portal-dash-tiles__ic" aria-hidden="true">
              <Icon name={tile.icon} size={layout === 'single' ? 22 : 28} stroke={1.25} />
            </span>
            <span className="portal-dash-tiles__label">{tile.label}</span>
          </button>
        ))}
      </nav>
    </section>
  );
}

function DashboardRewards({ s }) {
  const referral = s.referralContext;
  const balance = referral?.availableBalance ?? referral?.totalEarnings ?? DASHBOARD_REWARDS_MOCK;

  return (
    <aside className="portal-dash-rewards portal-dash-rewards--compact" aria-label="Rewards">
      <div className="portal-dash-rewards__compact-head">
        <span className="portal-dash-rewards__icon portal-dash-rewards__icon--sm" aria-hidden="true">
          <Icon name="trophy" size={16} stroke={1.75} />
        </span>
        <div className="portal-dash-rewards__head-text">
          <h2 className="portal-dash-rewards__title portal-dash-rewards__title--sm">Rewards</h2>
          <p className="portal-dash-rewards__sub portal-dash-rewards__sub--sm">Earned balance</p>
        </div>
      </div>

      <p className="portal-dash-rewards__balance-val portal-dash-rewards__balance-val--sm">
        {W.formatUsdtAmount(balance)}
        <span className="portal-dash-rewards__balance-unit"> USDT</span>
      </p>

      <button
        type="button"
        className="portal-dash-rewards__cta portal-dash-rewards__cta--sm"
        onClick={() => s.go?.('referral')}>
        View Rewards
      </button>
    </aside>
  );
}

function DashboardRecentAndRewards({ s }) {
  return (
    <div className="portal-dash-activity-row">
      <div className="portal-dash-activity-row__activity">
        <DashboardRecentActivity s={s} />
      </div>
      <div className="portal-dash-activity-row__rewards">
        <DashboardRewards s={s} />
      </div>
    </div>
  );
}

function DashboardRecentActivity({ s }) {
  const [selectedTx, setSelectedTx] = useState(null);
  const [copiedTxId, setCopiedTxId] = useState('');
  const view = D.resolveDashboardView(s.accountState, s.userCards);
  const activityItems = view.showActivity
    ? A.resolvePortalActivityItems(s.activityItems, s.userCards)
    : [];
  const empty = view.transactionsEmpty ?? {
    title: 'No activity yet.',
    msg: 'Your transactions will appear here after your card is activated.',
    icon: 'creditCard',
  };

  const handleCopyTxId = useCallback((txId) => {
    try { navigator.clipboard?.writeText(txId); } catch { /* noop */ }
    setCopiedTxId(txId);
    window.setTimeout(() => setCopiedTxId(''), 2000);
  }, []);

  return (
    <>
      <RecentActivitySection
        title="Recent Activity"
        items={activityItems}
        pageFilter="dashboard"
        limit={8}
        onItemClick={setSelectedTx}
        onViewAll={() => s.go('transactions')}
        emptyTitle={empty.title}
        emptyMsg={empty.msg}
        emptyIcon={empty.icon}
        className="portal-recent-tx--unified"
      />
      <TransactionDetailsDrawer
        tx={selectedTx}
        onClose={() => setSelectedTx(null)}
        onCopyTxId={handleCopyTxId}
        copyState={copiedTxId}
      />
    </>
  );
}

export function AccountHome({ s }) {
  const navigate = useNavigate();
  const view = D.resolveDashboardView(s.accountState, s.userCards);
  const layout = view.dashboardLayout || 'onboarding';
  const [kycInProgressOpen, setKycInProgressOpen] = useState(false);

  const handleVerifyIdentity = useCallback(() => {
    if (isKycInProgress(s.accountState)) {
      setKycInProgressOpen(true);
      return;
    }
    navigate(KYC_STEP1_PATH);
  }, [navigate, s.accountState]);

  const dashboardActions = {
    ...s,
    handleVerifyIdentity,
  };

  return (
    <div className={`portal-dash portal-dash--unified${layout === 'wallet' || layout === 'issuing' ? ' portal-dash--wallet-first' : ''}${layout === 'onboarding' ? ' portal-dash--onboarding' : ''}`}>
      {s.homeLoading ? (
        <div className="portal-pop">
          <div className="portal-sk portal-sk-block portal-sk-block--hero" />
          <div className="portal-sk portal-sk-block portal-sk-block--row" />
          <div className="portal-sk portal-sk-block portal-sk-block--row" />
        </div>
      ) : layout === 'onboarding' ? (
        <>
          <DashboardCardSection s={dashboardActions} />
          {view.showQuickActions ? <DashboardQuickActions s={dashboardActions} /> : null}
        </>
      ) : (
        <>
          {view.showZeroBalancePrompt && layout !== 'wallet' && layout !== 'issuing' && (
            <DashboardZeroBalance s={dashboardActions} cta={view.zeroBalanceCta} />
          )}
          {view.showWalletHero && <DashboardGreeting s={dashboardActions} />}
          <DashboardWalletFirst s={dashboardActions} view={view} />
        </>
      )}
      <KycInProgressModal open={kycInProgressOpen} onClose={() => setKycInProgressOpen(false)} />
    </div>
  );
}
