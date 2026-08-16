// ===== Transactions =====
// Unified wallet + card activity
// TODO: Fetch from Cregis (wallet) + Wasabi (card) APIs

import { useSearchParams } from 'react-router-dom';
import { TransactionsPage } from '../../components/account-transactions.jsx';
import * as A from '../../lib/account-data.js';

export function AccountCardTransactions({ s }) {
  const [searchParams] = useSearchParams();
  const rawScope = searchParams.get('scope') || searchParams.get('type');
  const initialScope = (rawScope === 'referral' || rawScope === 'rewards') ? 'referral' : A.resolveActivityFilterFromSearch(searchParams);
  const items = A.resolvePortalActivityWithHistory(s.activityItems);

  return <TransactionsPage items={items} initialScope={initialScope} s={s} />;
}
