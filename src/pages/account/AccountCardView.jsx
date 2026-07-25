// ===== Card View =====
// Main card screen — renders different states based on card lifecycle:
//   application_review → deposit_received/creating → shipping → issued → active
// TODO: Replace all mock data with Wasabi API card status/detail endpoints

import { AccountDashStatus } from '../../components/account/AccountDashStatus.jsx';
import { DebitCardFace, DashboardYourCardsHead } from '../../components/account-cards.jsx';
import { AccountMyCards } from '../../components/account-cards.jsx';
import { IssuanceDepositPanel } from '../../components/account-wallet.jsx';
import * as A from '../../lib/account-data.js';
import * as W from '../../utils/wallet-data.js';

export function AccountCardView({ s }) {
  if (!s || !s.accountState) {
    return (
      <div className="portal-sk-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="portal-spin" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  // ── State: await $100 issuance deposit / creating (until shipping) ────────
  if (W.showsIssuanceDepositWallet(s.accountState?.cardStatus) || s.cardApplicationPending) {
    const app = s.cardApplications?.[0];
    const status = s.accountState?.cardStatus;
    return (
      <div className="portal-page portal-page--unified portal-card-application">
        <AccountDashStatus s={s} />
        <IssuanceDepositPanel s={s} />
        {app && (
          <div className="portal-info">
            <div className="portal-info__row">
              <span className="portal-info__k">Application</span>
              <span className="portal-info__v">{app.reference ?? app.id}</span>
            </div>
            <div className="portal-info__row">
              <span className="portal-info__k">Card type</span>
              <span className="portal-info__v">{app.cardVariant === 'physical' ? 'Physical Visa' : 'Virtual Visa'}</span>
            </div>
            <div className="portal-info__row">
              <span className="portal-info__k">Status</span>
              <span className="portal-info__v">
                {status === 'creating'
                  ? 'Creating card'
                  : status === 'deposit_received'
                    ? 'Deposit received'
                    : 'Awaiting issuance deposit'}
              </span>
            </div>
            {app.submittedAt && (
              <div className="portal-info__row">
                <span className="portal-info__k">Submitted</span>
                <span className="portal-info__v">{new Date(app.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── State: pre-issue edge cases without deposit wallet ────────────────────
  if (s.preIssue) {
    const isIssuing = ['deposit_received', 'creating'].includes(s.accountState.cardStatus);
    const issuanceFee = A.getCardIssuanceFee(s.accountState.pendingVariant ?? 'virtual');
    return (
      <div className="portal-page portal-page--unified portal-card-issue">
        <AccountDashStatus s={s} />
        {isIssuing && (
          <>
            <div className="portal-dash-card__cards portal-dash-card__cards--processing">
              <DebitCardFace
                card={{
                  variant: s.accountState.pendingVariant ?? 'virtual',
                  status: 'creating',
                  label: (s.accountState.pendingVariant ?? 'virtual') === 'physical' ? 'Physical Visa Card' : 'Virtual Visa Card',
                  network: 'Visa',
                }}
                shimmer
                dimmed
                showBalance={false}
                showFooter={false}
              />
            </div>
            <div className="portal-card-issue__note">
              <p>Deposit {issuanceFee.amount} {issuanceFee.currency} to cover the card issuance fee. Your card number will be available once issuance is complete.</p>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── State: card shipping ──────────────────────────────────────────────────
  if (s.accountState.cardStatus === 'shipping' && s.userCards.length) {
    const card = s.userCards[0];
    return (
      <div className="portal-page portal-page--unified portal-mycards portal-mycards--v10">
        <AccountDashStatus s={s} />
        <DashboardYourCardsHead s={s} showNew={false} title="Your Card" />
        <div className="portal-dash-card__cards portal-mycards__wallet portal-dash-card__cards--single portal-dash-card__cards--shipping">
          <DebitCardFace
            card={card}
            dimmed
            showBalance={false}
            showFooter={!!card.last4}
          />
        </div>
        {/* Tracking info — TODO: fetch from shipping carrier API */}
        {card.trackingNumber && (
          <div className="portal-info">
            <div className="portal-info__row">
              <span className="portal-info__k">Tracking</span>
              <span className="portal-info__v portal-info__v--mono">{card.trackingNumber}</span>
            </div>
            {card.carrier && (
              <div className="portal-info__row">
                <span className="portal-info__k">Carrier</span>
                <span className="portal-info__v">{card.carrier}</span>
              </div>
            )}
            {card.estimatedDelivery && (
              <div className="portal-info__row">
                <span className="portal-info__k">Est. delivery</span>
                <span className="portal-info__v">{card.estimatedDelivery}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── State: card issued / active ───────────────────────────────────────────
  // TODO: Wasabi API — card freeze/unfreeze, spend limits, transaction history
  return <AccountMyCards s={s} />;
}
