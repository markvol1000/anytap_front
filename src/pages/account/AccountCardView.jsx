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

  // Fall through to the standard cards list and management carousel
  return <AccountMyCards s={s} />;
}
