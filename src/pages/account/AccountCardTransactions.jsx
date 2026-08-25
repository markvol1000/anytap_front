// ===== Transactions =====
// Unified wallet + card activity
// TODO: Fetch from Cregis (wallet) + Wasabi (card) APIs

import { useSearchParams } from 'react-router-dom';
import { TransactionsPage } from '../../components/account-transactions.jsx';
import * as A from '../../lib/account-data.js';

export function AccountCardTransactions({ s }) {
  const [searchParams] = useSearchParams();
  const initialScope = A.resolveActivityFilterFromSearch(searchParams);
  const initialCardId = searchParams.get('cardId')
    || searchParams.get('cardLast4')
    || searchParams.get('last4')
    || (initialScope === 'card' && (s?.currentCard?.last4 || s?.currentCard?.id || s?.currentCard?.cardNo))
    || 'all';
  const items = A.resolvePortalActivityWithHistory(s?.activityItems || []);

  return (
    <TransactionsPage
      items={items}
      initialScope={initialScope}
      initialCardId={initialCardId}
      s={s}
    />
  );
}
