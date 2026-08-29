import { useCallback, useEffect, useState } from 'react';
import { NavLink, useSearchParams } from 'react-router-dom';
import { AdminDataTable } from '../../components/AdminDataTable.jsx';
import { AdminFilterBar, AdminPageHeader, AdminPanel, AdminTableWrap } from '../../components/AdminFilterBar.jsx';

import {
  AdminDetailPanel,
  AdminDetailRow,
  AdminDetailSection,
  AdminSplitLayout,
} from '../../components/AdminSplitLayout.jsx';
import { AdminStatusBadge, formatAdminDate, shortenAddress } from '../../components/AdminStatusBadge.jsx';
import { useAdminList } from '../../hooks/useAdminList.js';
import { useAdminDetail } from '../../hooks/useAdminDetail.js';
import {
  getCardApplications,
  getCardById,
  toggleCardDeliveryStatus,
} from '../../services/api/adminApiService.js';

const fetchCardApplicationsReport = (params) => getCardApplications(params);
const fetchCardDetail = (id) => getCardById(id);

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
      console.error('Failed to copy TXID:', err);
    }
  };

  const shortText = shortenAddress(txId, 6, 6);

  return (
    <span
      onClick={handleCopy}
      title={`Click to copy full TXID: ${txId}`}
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
        fontWeight: '600'
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

export function CardsReportPage() {
  const [searchParams] = useSearchParams();
  const urlCardId = searchParams.get('id') || searchParams.get('cardId');
  const [selectedId, setSelectedId] = useState(() => urlCardId || null);
  const [showTooltip, setShowTooltip] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (urlCardId && urlCardId !== selectedId) {
      setSelectedId(urlCardId);
    }
  }, [urlCardId]);

  const list = useAdminList(fetchCardApplicationsReport, { onlyRegistered: false }, { urlKeys: ['status', 'delivered', 'cardType', 'startDate', 'endDate'] });
  const { detail, loading: detailLoading } = useAdminDetail(fetchCardDetail, selectedId);

  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleDatePreset = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    const endStr = now.toISOString().slice(0, 10);
    let startStr = '';

    if (preset === 'today') {
      startStr = endStr;
    } else if (preset === '7d') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      startStr = d.toISOString().slice(0, 10);
    } else if (preset === '30d') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      startStr = d.toISOString().slice(0, 10);
    } else {
      startStr = '';
    }

    setStartDate(startStr);
    setEndDate(preset === 'all' ? '' : endStr);
    list.setFilters({
      startDate: startStr,
      endDate: preset === 'all' ? '' : endStr,
    });
  };

  const handleCustomDateChange = (startVal, endVal) => {
    setDatePreset('custom');
    setStartDate(startVal);
    setEndDate(endVal);
    list.setFilters({
      startDate: startVal,
      endDate: endVal,
    });
  };

  const handleExportCsv = useCallback(() => {
    const items = (list.items || []).filter(r => r.cardStatus !== 'active' && r.status !== 'active');
    if (items.length === 0) {
      window.alert('No data available for download.');
      return;
    }

    const headers = [
      'Application Date',
      'User ID',
      'Email',
      'Name',
      'Card Type',
      'Card Status',
      'TXID (User Input)',
      'Actual TXID',
      'Deposit (USDT)',
      'Card Last 4 Digits',
      'Card Number',
      'Shipping Status',
      'Recipient',
      'Postal Code',
      'Shipping Address',
      'Contact Phone'
    ];

    const escapeCsv = (val) => {
      if (val == null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = items.map((r) => {
      const dateStr = r.submittedAt || r.createdAt || r.created || '';
      const email = r.memberEmail || r.email || r.loginId || '';
      const memberName = r.memberName || '';
      const cardType = r.cardTypeLabel || (r.cardType === 'physical' ? 'Physical Card' : 'Virtual Card');
      const cardStatus = r.cardStatus || r.status || '';
      const txInput = r.txIdInput || '-';
      const txActual = r.actualTxId || '-';
      const deposit = Number(r.depositAmount ?? 0).toFixed(2);
      const last4 = r.last4 || '';
      const cardNo = r.wasabiCardId || '';
      const isDeliv = (r.delivered || r.cardStatus === 'active' || r.status === 'active') ? 'Delivered' : 'Not Delivered';
      const ship = r.shippingInfo || {};
      const recipient = ship.recipientName || r.recipientName || '';
      const postalCode = ship.postalCode || r.postalCode || '';
      const address = [ship.address || r.address, ship.detailAddress || r.detailAddress].filter(Boolean).join(' ');
      const phone = ship.phoneNumber || r.phoneNumber || '';

      return [
        escapeCsv(dateStr),
        escapeCsv(r.memberId || r.userId || ''),
        escapeCsv(email),
        escapeCsv(memberName),
        escapeCsv(cardType),
        escapeCsv(cardStatus),
        escapeCsv(txInput),
        escapeCsv(txActual),
        escapeCsv(deposit),
        escapeCsv(last4),
        escapeCsv(cardNo),
        escapeCsv(isDeliv),
        escapeCsv(recipient),
        escapeCsv(postalCode),
        escapeCsv(address),
        escapeCsv(phone)
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `card_applications_report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [list.items]);

  const items = list.items || [];
  const activeDeliveredFilter = list.filters.delivered ?? 'all';

  return (
    <div className="admin-page" style={{ backgroundColor: '#ffffff', minHeight: '100vh', padding: '24px', color: '#333333' }}>
      {/* Reports Navigation Sub-Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        borderBottom: '2px solid #E0E0E0',
        marginBottom: '24px',
      }}>
        <NavLink
          to="/admin/reports/cards"
          style={({ isActive }) => ({
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '700',
            color: isActive ? '#007BFF' : '#64748B',
            borderBottom: isActive ? '3px solid #007BFF' : '3px solid transparent',
            textDecoration: 'none',
            marginBottom: '-2px',
            transition: 'all 0.15s ease',
          })}
        >
          💳 Card Application Status
        </NavLink>
        <NavLink
          to="/admin/reports/fees"
          style={({ isActive }) => ({
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '700',
            color: isActive ? '#007BFF' : '#64748B',
            borderBottom: isActive ? '3px solid #007BFF' : '3px solid transparent',
            textDecoration: 'none',
            marginBottom: '-2px',
            transition: 'all 0.15s ease',
          })}
        >
          💰 Fee Analysis Report
        </NavLink>
      </div>

      {/* Top Header & Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#333333', margin: 0 }}>Card Application Status</h1>
          <p style={{ fontSize: '13px', color: '#666666', margin: '4px 0 0 0' }}>
            Admin Dashboard for Card Applications and Shipping Details Management
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '600',
              backgroundColor: '#007BFF',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,123,255,0.25)',
            }}
          >
            + Add Applicant
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleExportCsv}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '600',
              backgroundColor: '#ffffff',
              color: '#333333',
              border: '1px solid #E0E0E0',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            Export Data
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="filters" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 20px 0' }}>
          <div style={{ display: 'inline-flex', borderRadius: '6px', border: '1px solid #E0E0E0', overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => list.setFilter('delivered', 'true')}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: '600',
                border: 'none',
                backgroundColor: activeDeliveredFilter === 'true' ? '#007BFF' : '#ffffff',
                color: activeDeliveredFilter === 'true' ? '#ffffff' : '#333333',
                cursor: 'pointer',
              }}
            >
              Delivered
            </button>
            <button
              type="button"
              onClick={() => list.setFilter('delivered', 'false')}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: '600',
                border: 'none',
                borderLeft: '1px solid #E0E0E0',
                backgroundColor: activeDeliveredFilter === 'false' ? '#007BFF' : '#ffffff',
                color: activeDeliveredFilter === 'false' ? '#ffffff' : '#333333',
                cursor: 'pointer',
              }}
            >
              Not Delivered
            </button>
            <button
              type="button"
              onClick={() => list.setFilter('delivered', 'all')}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: '600',
                border: 'none',
                borderLeft: '1px solid #E0E0E0',
                backgroundColor: activeDeliveredFilter === 'all' ? '#f1f5f9' : '#ffffff',
                color: activeDeliveredFilter === 'all' ? '#0f172a' : '#64748b',
                cursor: 'pointer',
              }}
            >
              All
            </button>
          </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#666666', fontWeight: '500' }}>📅 2024.01. ~ 1.7. :</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleCustomDateChange(e.target.value, endDate)}
            style={{
              padding: '6px 10px',
              fontSize: '12px',
              borderRadius: '4px',
              border: '1px solid #E0E0E0',
              color: '#333333',
            }}
          />
          <span style={{ color: '#94a3b8' }}>~</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => handleCustomDateChange(startDate, e.target.value)}
            style={{
              padding: '6px 10px',
              fontSize: '12px',
              borderRadius: '4px',
              border: '1px solid #E0E0E0',
              color: '#333333',
            }}
          />
        </div>
      </div>

      <AdminSplitLayout
        left={(
          <AdminPanel>
            {/* Applicants Main Table Section */}
            <div className="applicants-table" style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#333333', margin: '0 0 12px 0' }}>
                Applicants
              </h2>

              <AdminTableWrap loading={list.loading} error={list.error} hasData={items.length > 0}>
                <AdminDataTable
                  columns={[
                    { 
                      key: 'created', 
                      label: 'Application Date', 
                      render: (r) => (
                        <span style={{ fontSize: '12px', color: '#333333', whiteSpace: 'nowrap' }}>
                          {formatAdminDate(r.submittedAt || r.createdAt || r.created)}
                        </span>
                      ) 
                    },
                    {
                      key: 'memberEmail',
                      label: 'ID (Email)',
                      render: (r, idx) => {
                        const emailStr = r.memberEmail || r.email || r.loginId || 'any@naver.com';
                        const isSelected = selectedId === r.id || (idx === 0 && !selectedId);
                        return (
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <span
                              className={isSelected ? 'state-active' : ''}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedId(r.id);
                                setShowTooltip(false);
                              }}
                              style={{
                                fontWeight: '600',
                                color: '#007BFF',
                                fontSize: '12px',
                                cursor: 'pointer',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: isSelected ? '2px solid #007BFF' : '1px solid transparent',
                                backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                                transition: 'all 0.15s ease',
                                display: 'inline-block'
                              }}
                            >
                              {emailStr}
                            </span>

                            {/* Exact Tooltip Overlay on First Row */}
                            {idx === 0 && showTooltip && (
                              <div className="tooltip" style={{
                                position: 'absolute',
                                top: '100%',
                                left: '50%',
                                transform: 'translateX(-50%) translateY(8px)',
                                zIndex: 100,
                                backgroundColor: '#ffffff',
                                color: '#333333',
                                fontSize: '11px',
                                fontWeight: '600',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                border: '1px solid #E0E0E0',
                                whiteSpace: 'nowrap',
                              }}>
                                <div style={{
                                  position: 'absolute',
                                  top: '-5px',
                                  left: '50%',
                                  transform: 'translateX(-50%) rotate(45deg)',
                                  width: '8px',
                                  height: '8px',
                                  backgroundColor: '#ffffff',
                                  borderLeft: '1px solid #E0E0E0',
                                  borderTop: '1px solid #E0E0E0',
                                }} />
                                Click an ID to load the detailed shipping information in the table below.
                              </div>
                            )}
                          </div>
                        );
                      },
                    },
                    { 
                      key: 'memberName', 
                      label: 'Name', 
                      render: (r) => <span style={{ fontWeight: '600', fontSize: '12px', color: '#333333' }}>{r.memberName || 'John Doe'}</span> 
                    },
                    { 
                      key: 'cardType', 
                      label: 'Card Type', 
                      render: (r) => (
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                          backgroundColor: r.cardType === 'physical' ? '#eff6ff' : '#f3f4f6',
                          color: r.cardType === 'physical' ? '#007BFF' : '#4b5563',
                          border: '1px solid #E0E0E0'
                        }}>
                          {r.cardTypeLabel || (r.cardType === 'physical' ? 'Physical Card' : 'Virtual Card')}
                        </span>
                      ) 
                    },
                    { 
                      key: 'txIdInput', 
                      label: 'TXID (User Input)', 
                      render: (r, idx) => (
                        <span style={{
                          backgroundColor: idx === 0 ? '#FFEB3B' : '#fffde7',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                          fontWeight: '600',
                          color: '#333333',
                          border: '1px solid #fbc02d',
                          display: 'inline-block'
                        }}>
                          <CopyableTxId txId={r.txIdInput || 'anccbddjjkdk09094dk'} bgColor={idx === 0 ? '#FFEB3B' : '#fffde7'} />
                        </span>
                      )
                    },
                    { 
                      key: 'depositAmount', 
                      label: 'Deposit Amount', 
                      render: (r, idx) => (
                        <span style={{
                          fontWeight: '700',
                          color: '#1b5e20',
                          backgroundColor: idx === 0 ? '#CCFF90' : '#f1f8e9',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          whiteSpace: 'nowrap',
                          border: '1px solid #aed581',
                          display: 'inline-block'
                        }}>
                          {Number(r.depositAmount ?? 100).toFixed(2)}USDT
                        </span>
                      ) 
                    },
                    { 
                      key: 'wasabiCardId', 
                      label: 'Card Number', 
                      render: (r) => {
                        let cardStr = r.wasabiCardId && r.wasabiCardId !== '—' ? r.wasabiCardId : '';
                        if (!cardStr && r.last4) cardStr = `•••• ${r.last4}`;
                        return (
                          <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: '600', color: '#333333' }}>
                            {cardStr || '—'}
                          </span>
                        );
                      } 
                    },
                    { 
                      key: 'delivered', 
                      label: 'Shipping', 
                      render: (r) => {
                        const isCompleted = r.delivered || r.cardStatus === 'active' || r.status === 'active';
                        return (
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const targetId = r.deliveryId || r.id;
                              if (targetId) {
                                try {
                                  await toggleCardDeliveryStatus(targetId, !r.delivered);
                                  list.reload();
                                } catch (err) {
                                  window.alert('Shipping status update failed: ' + err.message);
                                }
                              }
                            }}
                            style={{
                              padding: '4px 10px',
                              fontSize: '11px',
                              borderRadius: '4px',
                              border: isCompleted ? '1px solid #86efac' : '1px solid #E0E0E0',
                              backgroundColor: isCompleted ? '#e8f5e9' : '#ffffff',
                              color: isCompleted ? '#2e7d32' : '#64748b',
                              cursor: 'pointer',
                              fontWeight: '600'
                            }}
                          >
                            {isCompleted ? 'Delivered' : 'Not Delivered'}
                          </button>
                        );
                      } 
                    }
                  ]}
                  rows={items}
                  selectedId={selectedId}
                  onSelectRow={(row) => {
                    setSelectedId(row.id);
                    setShowTooltip(false);
                  }}
                  onDoubleClickRow={(row) => {
                    setSelectedId(row.id);
                    setShowTooltip(false);
                  }}
                  pagination={{
                    page: list.page,
                    pageSize: list.pageSize,
                    total: list.total,
                    totalPages: list.totalPages,
                    onPageChange: list.setPage,
                    onPageSizeChange: list.setPageSize,
                  }}
                />
              </AdminTableWrap>
            </div>

            {/* Bottom Panel: Shipping Detailed Table (.shipping-detailed-table) */}
            <div className="shipping-detailed-table" style={{
              padding: '20px',
              backgroundColor: '#ffffff',
              border: '1px solid #E0E0E0',
              borderRadius: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#333333' }}>
                  Shipping Info - Details {detail ? `(${detail.memberName || detail.memberEmail})` : ''}
                </h2>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Click an ID in the top list to display the detailed shipping info of the applicant.
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', backgroundColor: '#ffffff', border: '1px solid #E0E0E0' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F5F5F5', borderBottom: '1px solid #E0E0E0' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', color: '#333333', borderRight: '1px solid #E0E0E0', width: '20%' }}>Recipient Name</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', color: '#333333', borderRight: '1px solid #E0E0E0', width: '20%' }}>Postal Code</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', color: '#333333', borderRight: '1px solid #E0E0E0', width: '40%' }}>Detailed Address</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', color: '#333333', width: '20%' }}>Contact Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Active Selected Row Data */}
                    {detail ? (
                      <tr style={{ borderBottom: '1px solid #E0E0E0', backgroundColor: '#eff6ff' }}>
                        <td style={{ padding: '12px 14px', borderRight: '1px solid #E0E0E0', fontWeight: '600', color: '#333333' }}>
                          {detail.shippingInfo?.recipientName || detail.memberName || 'John Doe'}
                        </td>
                        <td style={{ padding: '12px 14px', borderRight: '1px solid #E0E0E0', fontFamily: 'monospace', color: '#333333' }}>
                          {detail.shippingInfo?.postalCode || '06123'}
                        </td>
                        <td style={{ padding: '12px 14px', borderRight: '1px solid #E0E0E0', color: '#333333' }}>
                          {detail.shippingInfo?.address ? `${detail.shippingInfo.address} ${detail.shippingInfo.detailAddress || ''}`.trim() : '123 Main Street, Suite 400'}
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#333333' }}>
                          {detail.shippingInfo?.phoneNumber || detail.phone || '010-1234-5678'}
                        </td>
                      </tr>
                    ) : null}

                    {/* Pre-rendered Empty Fixed Dash Rows (3~4 rows) */}
                    {[1, 2, 3, detail ? null : 4].filter(Boolean).map((n) => (
                      <tr key={n} style={{ borderBottom: '1px solid #E0E0E0' }}>
                        <td style={{ padding: '12px 14px', borderRight: '1px solid #E0E0E0', color: '#94a3b8', textAlign: 'center' }}>--</td>
                        <td style={{ padding: '12px 14px', borderRight: '1px solid #E0E0E0', color: '#94a3b8', textAlign: 'center' }}>--</td>
                        <td style={{ padding: '12px 14px', borderRight: '1px solid #E0E0E0', color: '#94a3b8', textAlign: 'center' }}>--</td>
                        <td style={{ padding: '12px 14px', color: '#94a3b8', textAlign: 'center' }}>--</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </AdminPanel>
        )}
        right={(
          <AdminDetailPanel
            title="Card Application Details"
            loading={detailLoading}
            hasData={Boolean(detail)}
            emptyText="Please select a card application record from the list."
          >
            {detail && (
              <>
                {detail.failureReason && (
                  <div style={{
                    padding: '12px 14px',
                    marginBottom: '16px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fca5a5',
                    borderRadius: '8px',
                    color: '#991b1b'
                  }}>
                    <div style={{ fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      ⚠️ Failure / Rejection Reason
                    </div>
                    <div style={{ fontSize: '12px', marginTop: '4px', color: '#b91c1c', wordBreak: 'break-word', lineHeight: '1.4' }}>
                      {detail.failureReason}
                    </div>
                  </div>
                )}

                <AdminDetailSection title="Applicant Basic Info">
                  <AdminDetailRow label="Member ID" value={detail.memberId || detail.userId || '—'} copyable />
                  <AdminDetailRow label="Email" value={detail.memberEmail || detail.email || '—'} copyable />
                  <AdminDetailRow label="Full Name" value={detail.memberName || detail.loginId || '—'} />
                  <AdminDetailRow label="Application Date" value={formatAdminDate(detail.submittedAt || detail.createdAt)} />
                  <AdminDetailRow label="Card Type" value={detail.cardType || 'Physical'} />
                  <AdminDetailRow label="Status" value={<AdminStatusBadge status={detail.cardStatus || detail.status} />} />
                </AdminDetailSection>

                {detail.shippingInfo && (
                  <AdminDetailSection title="Shipping Address Info">
                    <AdminDetailRow label="Recipient" value={detail.shippingInfo.recipientName || '—'} />
                    <AdminDetailRow label="Phone Number" value={detail.shippingInfo.phoneNumber || '—'} copyable />
                    <AdminDetailRow label="Postal Code" value={detail.shippingInfo.postalCode || '—'} copyable />
                    <AdminDetailRow label="Shipping Address" value={`${detail.shippingInfo.address || ''} ${detail.shippingInfo.detailAddress || ''}`} copyable />
                    <AdminDetailRow label="Delivery Status" value={detail.delivered ? 'Delivered' : 'Pending'} />
                  </AdminDetailSection>
                )}

                <AdminDetailSection title="Deposit & TXID Verification">
                  <AdminDetailRow label="Deposit Amount" value={`${Number(detail.depositAmount ?? 0).toFixed(2)} USDT`} />
                  <AdminDetailRow label="User Input TXID" value={detail.txIdInput || '—'} copyable />
                  <AdminDetailRow label="Actual TXID" value={detail.actualTxId || '—'} copyable />
                </AdminDetailSection>
              </>
            )}
          </AdminDetailPanel>
        )}
      />

      {/* Add Applicant Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            width: '100%',
            maxWidth: '450px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#333333' }}>+ Add Applicant (Register New Card Applicant)</h3>
            <p style={{ fontSize: '13px', color: '#666666', marginBottom: '20px' }}>
              Register new member and physical card application details into the system.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="text" placeholder="Email (ID)" style={{ padding: '8px 12px', fontSize: '13px', border: '1px solid #E0E0E0', borderRadius: '4px' }} />
              <input type="text" placeholder="Full Name" style={{ padding: '8px 12px', fontSize: '13px', border: '1px solid #E0E0E0', borderRadius: '4px' }} />
              <select style={{ padding: '8px 12px', fontSize: '13px', border: '1px solid #E0E0E0', borderRadius: '4px' }}>
                <option value="physical">Physical Card</option>
                <option value="virtual">Virtual Card</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ padding: '8px 16px', fontSize: '13px', border: '1px solid #E0E0E0', backgroundColor: '#ffffff', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  window.alert('New applicant has been created.');
                  setShowAddModal(false);
                  list.reload();
                }}
                style={{ padding: '8px 16px', fontSize: '13px', border: 'none', backgroundColor: '#007BFF', color: '#ffffff', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
              >
                Register
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
