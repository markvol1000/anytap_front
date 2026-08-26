// ===== Transactions =====
// Unified wallet + card activity
// TODO: Fetch from Cregis (wallet) + Wasabi (card) APIs

import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TransactionsPage } from '../../components/account-transactions.jsx';
import * as A from '../../lib/account-data.js';

export function AccountCardTransactions({ s }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialScope = A.resolveActivityFilterFromSearch(searchParams);
  const initialCardId = searchParams.get('cardId')
    || searchParams.get('cardLast4')
    || searchParams.get('last4')
    || (initialScope === 'card' && (s?.currentCard?.wasabiCardId || s?.currentCard?.id || s?.currentCard?.cardNo || s?.currentCard?.last4))
    || 'all';
  const items = A.resolvePortalActivityWithHistory(s?.activityItems || []);

  // Remove cardId & last4 from URL bar so sensitive params are not visible to user
  useEffect(() => {
    if (searchParams.has('cardId') || searchParams.has('last4') || searchParams.has('cardLast4')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('cardId');
      nextParams.delete('last4');
      nextParams.delete('cardLast4');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <TransactionsPage
      items={items}
      initialScope={initialScope}
      initialCardId={initialCardId}
      s={s}
    />
  );
}
