import { useCallback, useState } from 'react';
import { AdminDataTable } from '../components/AdminDataTable.jsx';
import { AdminFilterBar, AdminPageHeader, AdminPanel, AdminTableWrap } from '../components/AdminFilterBar.jsx';
import { AdminDetailPanel, AdminDetailRow, AdminSplitLayout } from '../components/AdminSplitLayout.jsx';
import { AdminStatusBadge, formatAdminDate, formatAmountWithCurrency } from '../components/AdminStatusBadge.jsx';
import { useAdminList } from '../hooks/useAdminList.js';
import { exportTransactionsCsv, getTransactions, retryTransaction } from '../services/adminService.js';

const fetchTx = (params) => getTransactions(params);

function CurrencyBadge({ currency }) {
  const code = String(currency || 'USDT').toUpperCase().trim();
  if (code === 'USDT') {
    return (
      <img
        src="https://cryptologos.cc/logos/tether-usdt-logo.png?v=032"
        alt="USDT"
        style={{ width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0 }}
      />
    );
  }
  if (code === 'KRW' || code === '₩') {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        backgroundColor: '#2563eb',
        color: '#fff',
        fontSize: '9px',
        fontWeight: 'bold',
        flexShrink: 0
      }}>₩</span>
    );
  }
  if (code === 'USD' || code === '$') {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        backgroundColor: '#16a34a',
        color: '#fff',
        fontSize: '10px',
        fontWeight: 'bold',
        flexShrink: 0
      }}>$</span>
    );
  }
  if (code === 'EUR' || code === '€') {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        backgroundColor: '#4f46e5',
        color: '#fff',
        fontSize: '10px',
        fontWeight: 'bold',
        flexShrink: 0
      }}>€</span>
    );
  }
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1px 5px',
      borderRadius: '4px',
      backgroundColor: '#f1f5f9',
      color: '#334155',
      fontSize: '10px',
      fontWeight: '700',
      border: '1px solid #cbd5e1',
      flexShrink: 0
    }}>{code}</span>
  );
}

const KIND_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'card', label: 'Card' },
  { value: 'wallet_topup', label: 'Top Up' },
  { value: 'card_spend', label: 'Payment' },
  { value: 'refund', label: 'Refund' },
  { value: 'wallet_withdraw', label: 'Withdrawal' },
];

const shortenTxId = (txId) => {
  if (!txId) return '—';
  const str = String(txId);
  if (str.length > 14) {
    return `${str.substring(0, 8)}...${str.substring(str.length - 6)}`;
  }
  return str;
};

export function TransactionsPage() {
  const [selectedId, setSelectedId] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const [retryMsg, setRetryMsg] = useState(null);
  const list = useAdminList(fetchTx, {}, { urlKeys: ['kind', 'status'] });

  const handleExport = useCallback(async () => {
    const csv = await exportTransactionsCsv({
      search: list.search,
      kind: list.filters.kind,
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'anytap-transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [list.filters.kind, list.search]);

  const handleRetry = async (txId) => {
    if (retrying || !txId) return;
    setRetrying(true);
    setRetryMsg(null);
    try {
      await retryTransaction(txId);
      setRetryMsg({ type: 'success', text: 'Transaction retry successful!' });
      list.refresh?.();
    } catch (err) {
      setRetryMsg({ type: 'error', text: err?.message || 'Retry failed. Please check Wasabi Merchant balance.' });
    } finally {
      setRetrying(false);
    }
  };

  const selected = (list.items || []).find((r) => r.id === selectedId);
  const isSelectedPending = selected && (
    String(selected.status || '').toLowerCase().includes('pending') ||
    String(selected.status || '').toLowerCase().includes('processing')
  );

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Transactions"
        description="Unified ledger — wallet, card, top-up, payment, refund, withdrawal."
        actions={(
          <button type="button" className="admin-btn admin-btn--primary" onClick={handleExport}>
            CSV Export
          </button>
        )}
      />

      <AdminSplitLayout
        left={(
          <AdminPanel>
            <AdminFilterBar
              search={list.search}
              onSearchChange={list.setSearch}
              searchPlaceholder="Search member or reference…"
              filters={[
                {
                  key: 'kind',
                  label: 'Type',
                  value: list.filters.kind ?? 'all',
                  onChange: (v) => list.setFilter('kind', v),
                  options: KIND_OPTIONS,
                },
              ]}
            />
            <AdminTableWrap loading={list.loading} error={list.error} hasData={(list.items || []).length > 0}>
              <AdminDataTable
                columns={[
                  { 
                    key: 'id', 
                    label: 'ID', 
                    render: (r) => (
                      <span style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                        {shortenTxId(r.id)}
                      </span>
                    )
                  },
                  { 
                    key: 'memberName', 
                    label: 'Member',
                    render: (r) => {
                      const memberId = r.memberId || r.userId;
                      const memberEmail = r.memberEmail || r.email;
                      let displayText = '—';
                      if (memberId && memberEmail && memberEmail !== '—') {
                        displayText = `${memberId} / ${memberEmail}`;
                      } else if (memberId) {
                        displayText = memberId;
                      } else if (memberEmail && memberEmail !== '—') {
                        displayText = memberEmail;
                      }
                      return (
                        <span style={{ fontWeight: '500' }}>{displayText}</span>
                      );
                    }
                  },
                  { key: 'kind', label: 'Kind' },
                  { 
                    key: 'amount', 
                    label: 'Amount', 
                    render: (r) => (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CurrencyBadge currency={r.currency} />
                        <span>{formatAmountWithCurrency(r.amount, r.currency || 'USDT')}</span>
                      </div>
                    )
                  },
                  { key: 'status', label: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
                  { key: 'at', label: 'Date', render: (r) => formatAdminDate(r.at) },
                  { 
                    key: 'actions', 
                    label: 'Action', 
                    render: (r) => {
                      const isRowPending = String(r.status || '').toLowerCase().includes('pending') || String(r.status || '').toLowerCase().includes('processing');
                      if (!isRowPending) return '—';
                      return (
                        <button
                          type="button"
                          className="admin-btn admin-btn--sm admin-btn--primary"
                          disabled={retrying}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(r.id);
                            handleRetry(r.id);
                          }}>
                          Retry
                        </button>
                      );
                    }
                  },
                ]}
                rows={list.items || []}
                selectedId={selectedId}
                onSelectRow={(r) => { setSelectedId(r.id); setRetryMsg(null); }}
                sortKey={list.sortKey}
                sortDir={list.sortDir}
                onSort={list.toggleSort}
                page={list.page}
                totalPages={list.totalPages}
                total={list.total}
                onPageChange={list.setPage}
              />
            </AdminTableWrap>
          </AdminPanel>
        )}
        right={selected ? (
          <AdminDetailPanel title="Transaction detail">
            <AdminDetailRow label="ID" value={<span style={{ fontFamily: 'monospace' }}>{selected.id}</span>} />
            <AdminDetailRow 
              label="Member" 
              value={
                (() => {
                  const memberId = selected.memberId || selected.userId;
                  const memberEmail = selected.memberEmail || selected.email;
                  if (memberId && memberEmail && memberEmail !== '—') {
                    return `${memberId} / ${memberEmail}`;
                  }
                  return memberId || memberEmail || '—';
                })()
              } 
            />
            <AdminDetailRow label="Kind" value={selected.kind} />
            <AdminDetailRow 
              label="Amount" 
              value={
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CurrencyBadge currency={selected.currency} />
                  <span style={{ fontWeight: '600' }}>{formatAmountWithCurrency(selected.amount, selected.currency || 'USDT')}</span>
                </div>
              } 
            />
            <AdminDetailRow label="Status" value={<AdminStatusBadge status={selected.status} />} />
            <AdminDetailRow label="Date" value={formatAdminDate(selected.at)} />
            <AdminDetailRow label="Reference" value={selected.reference} />

            {retryMsg && (
              <div style={{
                marginTop: '12px',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                backgroundColor: retryMsg.type === 'success' ? '#dcfce7' : '#fee2e2',
                color: retryMsg.type === 'success' ? '#15803d' : '#b91c1c',
                border: `1px solid ${retryMsg.type === 'success' ? '#86efac' : '#fca5a5'}`
              }}>
                {retryMsg.text}
              </div>
            )}

            {isSelectedPending && (
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  disabled={retrying}
                  className="admin-btn admin-btn--sm admin-btn--primary"
                  style={{ padding: '6px 14px', fontSize: '13px', fontWeight: '500' }}
                  onClick={() => handleRetry(selected.id)}>
                  {retrying ? 'Retrying...' : 'Retry'}
                </button>
              </div>
            )}
          </AdminDetailPanel>
        ) : null}
      />
    </div>
  );
}
