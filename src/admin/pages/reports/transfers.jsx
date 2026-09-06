import { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { AdminDataTable } from '../../components/AdminDataTable.jsx';
import { AdminPageHeader, AdminPanel, AdminTableWrap } from '../../components/AdminFilterBar.jsx';
import {
  AdminDetailPanel,
  AdminDetailRow,
  AdminDetailSection,
  AdminSplitLayout,
} from '../../components/AdminSplitLayout.jsx';
import { AdminStatusBadge, formatAdminDate, shortenAddress } from '../../components/AdminStatusBadge.jsx';
import { useAdminList } from '../../hooks/useAdminList.js';
import { getCardTransfersReport } from '../../services/api/adminApiService.js';

function CopyableTxId({ txId, color = '#333333', bgColor = '#FFEB3B' }) {
  const [copied, setCopied] = useState(false);

  if (!txId || txId === '—' || txId === '-') return <span>—</span>;

  const handleCopy = (e) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txId);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = txId;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy ID:', err);
    }
  };

  const shortText = shortenAddress(txId, 6, 6);

  return (
    <span
      onClick={handleCopy}
      title={`Click to copy: ${txId}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        cursor: 'pointer',
        padding: '3px 8px',
        borderRadius: '4px',
        backgroundColor: copied ? '#CCFF90' : bgColor,
        border: `1px solid ${copied ? '#aed581' : '#fbc02d'}`,
        transition: 'all 0.15s ease',
        userSelect: 'none',
        fontWeight: '600',
      }}
    >
      <span style={{ fontFamily: 'monospace', fontSize: '11px', color: copied ? '#1b5e20' : color }}>
        {shortText}
      </span>
      <span style={{ fontSize: '10px', color: copied ? '#1b5e20' : '#666666' }}>
        {copied ? '✓' : '📋'}
      </span>
    </span>
  );
}

function extractLast4(last4, cardNo) {
  if (last4 && String(last4).trim().length > 0) {
    const s = String(last4).trim();
    return s.length > 4 ? s.slice(-4) : s;
  }
  if (cardNo) {
    const cleaned = String(cardNo).replace(/\D/g, '');
    if (cleaned.length >= 4) return cleaned.slice(-4);
    const str = String(cardNo).trim();
    if (str.length >= 4) return str.slice(-4);
  }
  return '—';
}

export function CardTransfersReportPage() {
  const [selectedItem, setSelectedItem] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const list = useAdminList(getCardTransfersReport, {}, {
    urlKeys: ['search', 'page'],
  });

  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7d') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === '30d') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Filter items by status and date range
  const filteredItems = useMemo(() => {
    let items = list.items || [];

    if (statusFilter !== 'ALL') {
      items = items.filter((item) => {
        const cw = String(item.cwStatus || '').toUpperCase();
        const cd = String(item.cdStatus || '').toUpperCase();
        const st = String(item.status || '').toUpperCase();
        if (statusFilter === 'SUCCESS') {
          return cw === 'SUCCESS' && cd === 'SUCCESS';
        }
        if (statusFilter === 'FAILED') {
          return cw === 'FAILED' || cd === 'FAILED' || st === 'FAILED';
        }
        if (statusFilter === 'PENDING') {
          return cw === 'PENDING' || cd === 'PENDING' || st === 'PENDING';
        }
        return true;
      });
    }

    if (startDate || endDate) {
      items = items.filter((item) => {
        const dStr = item.createdAt ? String(item.createdAt).slice(0, 10) : '';
        if (!dStr) return true;
        if (startDate && dStr < startDate) return false;
        if (endDate && dStr > endDate) return false;
        return true;
      });
    }

    return items;
  }, [list.items, statusFilter, startDate, endDate]);

  const handleExportCsv = () => {
    const headers = [
      'Date/Time',
      'From Card Last4',
      'From Holder',
      'Withdraw Amount (USD)',
      'Wasabi Order No',
      'Merchant Order No',
      'CW Status',
      'To Card Last4',
      'To Holder',
      'Deposit Amount (USD)',
      'CD Status',
    ];

    const escapeCsv = (val) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = filteredItems.map((r) => {
      const fromL4 = extractLast4(r.sourceCardLast4 || r.fromCardLast4, r.sourceCardNo);
      const toL4 = extractLast4(r.destinationCardLast4 || r.toCardLast4, r.destinationCardNo);
      const gross = Number(r.grossAmount ?? r.amount ?? 0).toFixed(2);
      const net = Number(r.netAmount ?? (r.grossAmount ? Number(r.grossAmount) + Number(r.feeAmount || 0) : 0)).toFixed(2);

      return [
        escapeCsv(r.createdAt || ''),
        escapeCsv(fromL4),
        escapeCsv(r.fromLoginId || r.fromHolder || ''),
        escapeCsv(`-${gross}`),
        escapeCsv(r.wasabiOrderNo || ''),
        escapeCsv(r.merchantOrderNo || ''),
        escapeCsv(r.cwStatus || r.status || ''),
        escapeCsv(toL4),
        escapeCsv(r.toLoginId || r.toHolder || ''),
        escapeCsv(`+${net}`),
        escapeCsv(r.cdStatus || r.status || ''),
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `card_transfer_ledger_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const columns = [
    {
      key: 'createdAt',
      label: '일시',
      render: (r) => (
        <span style={{ fontSize: '12px', color: '#475569', whiteSpace: 'nowrap' }}>
          {formatAdminDate(r.createdAt)}
        </span>
      ),
    },
    {
      key: 'sourceCardLast4',
      label: 'from 카드',
      render: (r) => {
        const last4 = extractLast4(r.sourceCardLast4 || r.fromCardLast4, r.sourceCardNo);
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontFamily: 'monospace',
              fontWeight: '600',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#0f172a',
              fontSize: '12px',
            }}
            title={r.sourceCardNo || ''}
          >
            💳 •••• {last4}
          </span>
        );
      },
    },
    {
      key: 'fromLoginId',
      label: 'from_login_id',
      render: (r) => (
        <span style={{ fontSize: '12px', fontWeight: '500', color: '#334155' }}>
          {r.fromLoginId || r.fromHolder || '—'}
        </span>
      ),
    },
    {
      key: 'grossAmount',
      label: '출금금액',
      render: (r) => {
        const val = Number(r.grossAmount ?? r.amount ?? 0);
        return (
          <span style={{ fontWeight: '600', color: '#dc2626', fontSize: '12px' }}>
            -{val.toFixed(2)} USD
          </span>
        );
      },
    },
    {
      key: 'wasabiOrderNo',
      label: 'order no',
      render: (r) => <CopyableTxId txId={r.wasabiOrderNo} color="#b45309" bgColor="#fef3c7" />,
    },
    {
      key: 'merchantOrderNo',
      label: 'merchant no',
      render: (r) => <CopyableTxId txId={r.merchantOrderNo} color="#1d4ed8" bgColor="#dbeafe" />,
    },
    {
      key: 'cwStatus',
      label: 'CW status',
      render: (r) => <AdminStatusBadge status={r.cwStatus || r.status || 'SUCCESS'} />,
    },
    {
      key: 'destinationCardLast4',
      label: 'to 카드',
      render: (r) => {
        const last4 = extractLast4(r.destinationCardLast4 || r.toCardLast4, r.destinationCardNo);
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontFamily: 'monospace',
              fontWeight: '600',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#166534',
              fontSize: '12px',
            }}
            title={r.destinationCardNo || ''}
          >
            💳 •••• {last4}
          </span>
        );
      },
    },
    {
      key: 'toLoginId',
      label: 'to_login_id',
      render: (r) => (
        <span style={{ fontSize: '12px', fontWeight: '500', color: '#334155' }}>
          {r.toLoginId || r.toHolder || '—'}
        </span>
      ),
    },
    {
      key: 'netAmount',
      label: '입금금액',
      render: (r) => {
        const gross = Number(r.grossAmount ?? r.amount ?? 0);
        const fee = Number(r.feeAmount ?? 0);
        const val = Number(r.netAmount ?? (gross > 0 ? gross + fee : 0));
        return (
          <span style={{ fontWeight: '600', color: '#16a34a', fontSize: '12px' }}>
            +{val.toFixed(2)} USD
          </span>
        );
      },
    },
    {
      key: 'cdStatus',
      label: 'CD status',
      render: (r) => <AdminStatusBadge status={r.cdStatus || r.status || 'SUCCESS'} />,
    },
  ];

  return (
    <div className="admin-page admin-fees-report">
      {/* Reports Navigation Sub-Tabs */}
      <div className="admin-fees-tabs">
        <NavLink
          to="/admin/reports/cards"
          className={({ isActive }) => `admin-fees-tab-link${isActive ? ' is-active' : ''}`}
        >
          💳 Card Application Status
        </NavLink>
        <NavLink
          to="/admin/reports/transfers"
          className={({ isActive }) => `admin-fees-tab-link${isActive ? ' is-active' : ''}`}
        >
          🔁 Card Transfer Ledger
        </NavLink>
        <NavLink
          to="/admin/reports/fees"
          className={({ isActive }) => `admin-fees-tab-link${isActive ? ' is-active' : ''}`}
        >
          💰 Fee Analysis Report
        </NavLink>
      </div>

      {/* Page Header */}
      <div className="admin-cards-header" style={{ marginBottom: '16px' }}>
        <div>
          <h1 className="admin-cards-header__title">Card-to-Card Transfer Ledger</h1>
          <p className="admin-cards-header__sub">
            카드간 이체 원장 내역 조회 및 상태 관리 (출금 CW / 입금 CD 단계별 모니터링)
          </p>
        </div>
        <div className="admin-cards-header__actions" style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={handleExportCsv}
            className="admin-btn admin-btn--secondary"
            style={{
              padding: '8px 16px',
              backgroundColor: '#10B981',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            📥 Export CSV
          </button>
          <button
            type="button"
            onClick={() => list.reload()}
            className="admin-btn admin-btn--primary"
            disabled={list.loading}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: '500',
            }}
          >
            {list.loading ? 'Refreshing…' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <AdminPanel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between', padding: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1, minWidth: '280px' }}>
            <input
              type="search"
              className="admin-input admin-input--search"
              placeholder="Search by card last4, holder, order no..."
              value={list.filters.search || ''}
              onChange={(e) => list.setFilter('search', e.target.value)}
              style={{ width: '100%', maxWidth: '360px' }}
            />
            <select
              className="admin-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ minWidth: '140px' }}
            >
              <option value="ALL">All Status</option>
              <option value="SUCCESS">Success</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {['all', 'today', '7d', '30d', 'thisMonth'].map((p) => (
              <button
                key={p}
                type="button"
                className={`admin-btn admin-btn--sm ${datePreset === p ? 'admin-btn--primary' : 'admin-btn--secondary'}`}
                onClick={() => handlePresetChange(p)}
                style={{ textTransform: 'capitalize', padding: '4px 10px', fontSize: '12px' }}
              >
                {p === 'thisMonth' ? 'This Month' : p}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Pickers */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '0 12px 12px', fontSize: '12px' }}>
          <span style={{ color: '#64748b' }}>Date Range:</span>
          <input
            type="date"
            className="admin-input"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setDatePreset('custom');
            }}
            style={{ padding: '4px 8px', fontSize: '12px' }}
          />
          <span style={{ color: '#94a3b8' }}>~</span>
          <input
            type="date"
            className="admin-input"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setDatePreset('custom');
            }}
            style={{ padding: '4px 8px', fontSize: '12px' }}
          />
          {(startDate || endDate || statusFilter !== 'ALL' || list.filters.search) && (
            <button
              type="button"
              className="admin-btn admin-btn--ghost admin-btn--sm"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setStatusFilter('ALL');
                setDatePreset('all');
                list.setFilter('search', '');
              }}
              style={{ fontSize: '11px', color: '#ef4444' }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </AdminPanel>

      {/* Main Table + Detail Panel Split Layout */}
      <AdminSplitLayout
        left={
          <AdminTableWrap>
            <AdminDataTable
              columns={columns}
              rows={filteredItems}
              rowKey="id"
              selectedId={selectedItem?.id}
              onSelectRow={(row) => setSelectedItem(row)}
              emptyMessage={list.loading ? 'Loading card transfer records…' : 'No card transfer records found.'}
              pagination={list.pagination}
            />
          </AdminTableWrap>
        }
        right={
          selectedItem ? (
            <AdminDetailPanel
              title="Transfer Ledger Detail"
              onClose={() => setSelectedItem(null)}
            >
              <AdminDetailSection title="Transaction Overview">
                <AdminDetailRow label="일시 (Created At)" value={formatAdminDate(selectedItem.createdAt)} />
                <AdminDetailRow
                  label="CW Status (출금)"
                  value={<AdminStatusBadge status={selectedItem.cwStatus || selectedItem.status || 'SUCCESS'} />}
                />
                <AdminDetailRow
                  label="CD Status (입금)"
                  value={<AdminStatusBadge status={selectedItem.cdStatus || selectedItem.status || 'SUCCESS'} />}
                />
                <AdminDetailRow
                  label="Gross Amount (출금액)"
                  value={
                    <span style={{ fontWeight: '700', color: '#dc2626' }}>
                      -{Number(selectedItem.grossAmount ?? selectedItem.amount ?? 0).toFixed(2)} USD
                    </span>
                  }
                />
                <AdminDetailRow
                  label="Fee Amount (수수료)"
                  value={`${Number(selectedItem.feeAmount ?? 0).toFixed(2)} USD`}
                />
                <AdminDetailRow
                  label="Net Amount (입금액)"
                  value={
                    <span style={{ fontWeight: '700', color: '#16a34a' }}>
                      +{Number(selectedItem.netAmount ?? (Number(selectedItem.grossAmount ?? 0) + Number(selectedItem.feeAmount ?? 0))).toFixed(2)} USD
                    </span>
                  }
                />
              </AdminDetailSection>

              <AdminDetailSection title="Source (From) Card">
                <AdminDetailRow
                  label="From Card Last4"
                  value={
                    <span style={{ fontWeight: '700', fontFamily: 'monospace', color: '#0f172a' }}>
                      •••• {extractLast4(selectedItem.sourceCardLast4 || selectedItem.fromCardLast4, selectedItem.sourceCardNo)}
                    </span>
                  }
                />
                <AdminDetailRow label="From Login ID" value={selectedItem.fromLoginId || selectedItem.fromHolder || '—'} />
                <AdminDetailRow
                  label="Wasabi Card ID"
                  value={
                    selectedItem.sourceCardNo ? (
                      <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#475569' }}>
                        {selectedItem.sourceCardNo}
                      </span>
                    ) : '—'
                  }
                />
              </AdminDetailSection>

              <AdminDetailSection title="Destination (To) Card">
                <AdminDetailRow
                  label="To Card Last4"
                  value={
                    <span style={{ fontWeight: '700', fontFamily: 'monospace', color: '#166534' }}>
                      •••• {extractLast4(selectedItem.destinationCardLast4 || selectedItem.toCardLast4, selectedItem.destinationCardNo)}
                    </span>
                  }
                />
                <AdminDetailRow label="To Login ID" value={selectedItem.toLoginId || selectedItem.toHolder || '—'} />
                <AdminDetailRow
                  label="Wasabi Card ID"
                  value={
                    selectedItem.destinationCardNo ? (
                      <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#475569' }}>
                        {selectedItem.destinationCardNo}
                      </span>
                    ) : '—'
                  }
                />
              </AdminDetailSection>

              <AdminDetailSection title="Reference Identifiers">
                <AdminDetailRow
                  label="Wasabi Order No"
                  value={<CopyableTxId txId={selectedItem.wasabiOrderNo} color="#b45309" bgColor="#fef3c7" />}
                />
                <AdminDetailRow
                  label="Merchant Order No"
                  value={<CopyableTxId txId={selectedItem.merchantOrderNo} color="#1d4ed8" bgColor="#dbeafe" />}
                />
                {selectedItem.id && (
                  <AdminDetailRow
                    label="Ledger ID"
                    value={<span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>{selectedItem.id}</span>}
                  />
                )}
              </AdminDetailSection>
            </AdminDetailPanel>
          ) : null
        }
      />
    </div>
  );
}
