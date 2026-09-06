import { useCallback, useState } from 'react';
import { AdminDataTable } from '../components/AdminDataTable.jsx';
import { AdminFilterBar, AdminPageHeader, AdminPanel, AdminTableWrap } from '../components/AdminFilterBar.jsx';
import { AdminDetailPanel, AdminDetailRow, AdminSplitLayout } from '../components/AdminSplitLayout.jsx';
import { AdminStatusBadge, formatAdminDate, formatAmountWithCurrency } from '../components/AdminStatusBadge.jsx';
import { useAdminList } from '../hooks/useAdminList.js';
import { exportTransactionsCsv, getTransactions, retryTransaction } from '../services/adminService.js';

const fetchTx = (params) => getTransactions(params);

function CurrencyBadge({ currency }) {
  if (!currency || !String(currency).trim() || String(currency).trim().toLowerCase() === 'null') {
    return null;
  }
  const code = String(currency).toUpperCase().trim();
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

function CopyableId({ text, color = '#2563eb' }) {
  const [copied, setCopied] = useState(false);

  if (!text || text === '—' || text === '-') return <span>—</span>;

  const handleCopy = (e) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const displayText = text.length > 18 ? `${text.substring(0, 8)}...${text.substring(text.length - 6)}` : text;

  return (
    <span
      onClick={handleCopy}
      title={copied ? 'Copied!' : `Click to copy: ${text}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        cursor: 'pointer',
        fontFamily: 'monospace',
        color: copied ? '#16a34a' : color,
        fontWeight: '500',
        backgroundColor: copied ? '#f0fdf4' : 'rgba(37, 99, 235, 0.06)',
        padding: '1px 6px',
        borderRadius: '4px',
        border: `1px solid ${copied ? '#bbf7d0' : 'rgba(37, 99, 235, 0.2)'}`,
        transition: 'all 0.15s ease',
        userSelect: 'none'
      }}
    >
      <span>{displayText}</span>
      <span style={{ fontSize: '10px', opacity: 0.8 }}>{copied ? '✓' : '📋'}</span>
    </span>
  );
}

function AddressWithLast4({ address, last4, color = '#2563eb' }) {
  if (!address || address === '—' || address === '-') {
    if (last4) {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '1px 7px',
          borderRadius: '4px',
          backgroundColor: '#eff6ff',
          color: '#1d4ed8',
          border: '1px solid #bfdbfe',
          fontSize: '11px',
          fontWeight: '700',
          fontFamily: 'monospace'
        }}>
          💳 •••• {last4}
        </span>
      );
    }
    return <span>—</span>;
  }

  // Extract last 4 if not provided but address clearly looks like a card number or card ID ending with digits
  let resolvedL4 = last4;
  if (!resolvedL4) {
    const cleanAddr = String(address).trim();
    if (cleanAddr.startsWith('WD') || cleanAddr.length >= 10) {
      const match = cleanAddr.match(/\d{4}$/);
      if (match) {
        resolvedL4 = match[0];
      }
    }
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
      <CopyableId text={address} color={color} />
      {resolvedL4 && (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          padding: '1px 6px',
          borderRadius: '4px',
          backgroundColor: '#eff6ff',
          color: '#1d4ed8',
          border: '1px solid #bfdbfe',
          fontSize: '11px',
          fontWeight: '700',
          fontFamily: 'monospace'
        }}>
          💳 •••• {resolvedL4}
        </span>
      )}
    </span>
  );
}

function ChannelBadge({ channel }) {
  const ch = String(channel || 'wallet').toLowerCase();
  if (ch === 'card') {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '12px',
        backgroundColor: '#eef2ff',
        color: '#4338ca',
        border: '1px solid #c7d2fe',
        fontSize: '11px',
        fontWeight: '700',
        letterSpacing: '0.02em',
      }}>
        💳 CARD
      </span>
    );
  }
  if (ch === 'wallet') {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '12px',
        backgroundColor: '#ecfdf5',
        color: '#065f46',
        border: '1px solid #a7f3d0',
        fontSize: '11px',
        fontWeight: '700',
        letterSpacing: '0.02em',
      }}>
        🪙 WALLET
      </span>
    );
  }
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 8px',
      borderRadius: '12px',
      backgroundColor: '#f1f5f9',
      color: '#475569',
      border: '1px solid #cbd5e1',
      fontSize: '11px',
      fontWeight: '700',
      letterSpacing: '0.02em',
    }}>
      ⚙️ SYSTEM
    </span>
  );
}

function ActionBadge({ action, label }) {
  const act = String(action || '').toLowerCase();
  const text = label || (act ? act.charAt(0).toUpperCase() + act.slice(1) : 'Other');

  let bg = '#f1f5f9';
  let color = '#334155';
  let border = '#cbd5e1';

  if (act === 'payment') {
    bg = '#fffbeb';
    color = '#b45309';
    border = '#fde68a';
  } else if (act === 'topup') {
    bg = '#f0fdf4';
    color = '#15803d';
    border = '#bbf7d0';
  } else if (act === 'deposit') {
    bg = '#eff6ff';
    color = '#1d4ed8';
    border = '#bfdbfe';
  } else if (act === 'withdraw') {
    bg = '#fef2f2';
    color = '#b91c1c';
    border = '#fecaca';
  } else if (act === 'refund') {
    bg = '#faf5ff';
    color = '#7e22ce';
    border = '#e9d5ff';
  } else if (act === 'transfer_in' || act === 'transfer_out') {
    bg = '#f0fdfa';
    color = '#0f766e';
    border = '#99f6e4';
  } else if (act === 'fee_sweep') {
    bg = '#f8fafc';
    color = '#475569';
    border = '#cbd5e1';
  }

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 7px',
      borderRadius: '4px',
      backgroundColor: bg,
      color: color,
      border: `1px solid ${border}`,
      fontSize: '11px',
      fontWeight: '600',
      whiteSpace: 'nowrap'
    }}>
      {text}
    </span>
  );
}

const CHANNEL_OPTIONS = [
  { value: 'all', label: 'All Channels' },
  { value: 'card', label: '💳 Card' },
  { value: 'wallet', label: '🪙 Wallet' },
];

const ACTION_OPTIONS = [
  { value: 'all', label: 'All Actions' },
  { value: 'payment', label: 'Payment' },
  { value: 'topup', label: 'Top-Up' },
  { value: 'deposit', label: 'Deposit' },
  { value: 'withdraw', label: 'Withdrawal' },
  { value: 'refund', label: 'Refund' },
  { value: 'transfer_in', label: 'Transfer In' },
  { value: 'transfer_out', label: 'Transfer Out' },
  { value: 'fee_sweep', label: 'Fee Sweep' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'success', label: 'Success' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
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
  const list = useAdminList(fetchTx, {}, { urlKeys: ['channel', 'action', 'status', 'kind'] });

  const handleExport = useCallback(async () => {
    const csv = await exportTransactionsCsv({
      search: list.search,
      channel: list.filters.channel,
      action: list.filters.action,
      status: list.filters.status,
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'anytap-transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [list.filters.channel, list.filters.action, list.filters.status, list.search]);

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
        onRefresh={list.reload}
        refreshing={list.loading}
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
              searchPlaceholder="Search member, merchant, ID, address…"
              filters={[
                {
                  key: 'channel',
                  label: 'Channel',
                  value: list.filters.channel ?? 'all',
                  onChange: (v) => list.setFilter('channel', v),
                  options: CHANNEL_OPTIONS,
                },
                {
                  key: 'action',
                  label: 'Action',
                  value: list.filters.action ?? 'all',
                  onChange: (v) => list.setFilter('action', v),
                  options: ACTION_OPTIONS,
                },
                {
                  key: 'status',
                  label: 'Status',
                  value: list.filters.status ?? 'all',
                  onChange: (v) => list.setFilter('status', v),
                  options: STATUS_OPTIONS,
                },
              ]}
            />
            <AdminTableWrap loading={list.loading} error={list.error} hasData={(list.items || []).length > 0}>
              <AdminDataTable
                columns={[
                  { 
                    key: 'id', 
                    label: 'ID', 
                    render: (r) => <CopyableId text={r.id} />
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
                  { 
                    key: 'channel', 
                    label: 'Channel',
                    render: (r) => <ChannelBadge channel={r.channel} />
                  },
                  { 
                    key: 'action', 
                    label: 'Action',
                    render: (r) => <ActionBadge action={r.action} label={r.actionLabel} />
                  },
                  { 
                    key: 'description', 
                    label: 'Description',
                    render: (r) => {
                      const desc = r.description || r.reference || '—';
                      const isPayment = r.action === 'payment';
                      return (
                        <div
                          title={desc}
                          style={{
                            maxWidth: '220px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: '12px',
                            color: isPayment ? '#0f172a' : '#475569',
                            fontWeight: isPayment ? '600' : '500',
                          }}
                        >
                          {isPayment && <span style={{ marginRight: '4px', opacity: 0.7 }}>🏪</span>}
                          {desc}
                        </div>
                      );
                    }
                  },
                  { 
                    key: 'amount', 
                    label: 'Amount (+ / -)', 
                    render: (r) => {
                      const isInflow = r.isInflow ?? (
                        r.action === 'deposit' ||
                        r.action === 'topup' ||
                        r.action === 'refund' ||
                        r.action === 'transfer_in'
                      );
                      const sign = isInflow ? '+' : '-';
                      const color = isInflow ? '#16a34a' : '#dc2626';
                      const bg = isInflow ? '#f0fdf4' : '#fef2f2';
                      const border = isInflow ? '#bbf7d0' : '#fecaca';

                      return (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '2px 8px',
                          borderRadius: '5px',
                          backgroundColor: bg,
                          border: `1px solid ${border}`,
                          fontWeight: '800',
                          fontSize: '12px',
                          color: color,
                          fontFamily: 'monospace',
                        }}>
                          <CurrencyBadge currency={r.currency || r.originalCurrency || r.transCurrency} />
                          <span>{sign}{formatAmountWithCurrency(Math.abs(Number(r.transAmount ?? r.amount) || 0), r.currency || r.originalCurrency || r.transCurrency || '')}</span>
                        </div>
                      );
                    }
                  },
                  { key: 'status', label: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
                  { key: 'at', label: 'Date', render: (r) => formatAdminDate(r.at) },
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
          <AdminDetailPanel 
            title={`Transaction Detail — ${selected.actionLabel || selected.action || 'Detail'}`}
            onClose={() => { setSelectedId(null); setRetryMsg(null); }}
          >
            <AdminDetailRow 
              label="Transaction ID" 
              value={<CopyableId text={selected.id} />} 
            />
            <AdminDetailRow 
              label="Member" 
              value={
                (() => {
                  const memberId = selected.memberId || selected.userId;
                  const memberEmail = selected.memberEmail || selected.email;
                  if (memberId && memberEmail && memberEmail !== '—') {
                    return (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <CopyableId text={memberId} />
                        <span style={{ color: '#64748b' }}>/ {memberEmail}</span>
                      </span>
                    );
                  }
                  return <CopyableId text={memberId || memberEmail} />;
                })()
              } 
            />
            <AdminDetailRow 
              label="Channel" 
              value={<ChannelBadge channel={selected.channel} />} 
            />
            <AdminDetailRow 
              label="Action" 
              value={<ActionBadge action={selected.action} label={selected.actionLabel} />} 
            />
            <AdminDetailRow 
              label="Description / Merchant" 
              value={
                <span style={{ fontWeight: '600', color: '#0f172a' }}>
                  {selected.description || '—'}
                </span>
              } 
            />
            <AdminDetailRow 
              label="Amount" 
              value={
                (() => {
                  const isInflow = selected.isInflow ?? (
                    selected.action === 'deposit' ||
                    selected.action === 'topup' ||
                    selected.action === 'refund' ||
                    selected.action === 'transfer_in'
                  );
                  const sign = isInflow ? '+' : '-';
                  const color = isInflow ? '#16a34a' : '#dc2626';
                  const bg = isInflow ? '#f0fdf4' : '#fef2f2';
                  const border = isInflow ? '#bbf7d0' : '#fecaca';

                  return (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '3px 8px',
                      borderRadius: '5px',
                      backgroundColor: bg,
                      border: `1px solid ${border}`,
                      fontWeight: '800',
                      fontSize: '13px',
                      color: color,
                      fontFamily: 'monospace',
                    }}>
                      <CurrencyBadge currency={selected.currency || selected.originalCurrency || selected.transCurrency} />
                      <span>{sign}{formatAmountWithCurrency(Math.abs(Number(selected.transAmount ?? selected.amount) || 0), selected.currency || selected.originalCurrency || selected.transCurrency || '')}</span>
                    </div>
                  );
                })()
              } 
            />
            <AdminDetailRow 
              label="From Address" 
              value={<AddressWithLast4 address={selected.fromAddress} last4={selected.fromCardLast4} />} 
            />
            <AdminDetailRow 
              label="To Address" 
              value={<AddressWithLast4 address={selected.toAddress} last4={selected.toCardLast4} />} 
            />
            <AdminDetailRow label="Status" value={<AdminStatusBadge status={selected.status} />} />
            <AdminDetailRow label="Date" value={formatAdminDate(selected.at)} />
            <AdminDetailRow 
              label="Reference" 
              value={<span style={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '12px' }}>{selected.reference}</span>} 
            />

            {isSelectedPending && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  className="admin-btn admin-btn--primary"
                  onClick={() => handleRetry(selected.id)}
                  disabled={retrying}
                  style={{ width: '100%' }}
                >
                  {retrying ? 'Retrying...' : '🔄 Retry Transaction'}
                </button>
                {retryMsg && (
                  <p style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    color: retryMsg.type === 'success' ? '#16a34a' : '#dc2626',
                    fontWeight: '500'
                  }}>
                    {retryMsg.text}
                  </p>
                )}
              </div>
            )}
          </AdminDetailPanel>
        ) : null}
      />
    </div>
  );
}
