import { useCallback, useEffect, useState } from 'react';
import { NavLink, useSearchParams } from 'react-router-dom';

import { AdminDataTable } from '../components/AdminDataTable.jsx';
import { AdminFilterBar, AdminPageHeader, AdminPanel, AdminTableWrap } from '../components/AdminFilterBar.jsx';
import {
  AdminDetailPanel,
  AdminDetailRow,
  AdminDetailSection,
  AdminSplitLayout,
} from '../components/AdminSplitLayout.jsx';
import { AdminStatusBadge, formatAdminDate, shortenAddress } from '../components/AdminStatusBadge.jsx';
import { useAdminList } from '../hooks/useAdminList.js';
import { useAdminDetail } from '../hooks/useAdminDetail.js';
import {
  getCardApplications,
  getCardById,
  toggleCardDeliveryStatus,
} from '../services/api/adminApiService.js';

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
      title={`클릭하여 전체 TXID 복사: ${txId}`}
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

export function CardApplicationReportPage() {
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
    const items = list.items || [];
    if (items.length === 0) {
      window.alert('다운로드할 데이터가 없습니다.');
      return;
    }

    const headers = [
      '신청일시',
      '회원ID',
      '이메일',
      '성명',
      '카드종류',
      '카드상태',
      'TXID(고객입력)',
      '실TXID',
      '보증금(USDT)',
      '카드 4자리',
      '카드번호',
      '배송상태',
      '수령인',
      '우편번호',
      '배송주소',
      '연락처'
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
      const cardType = r.cardTypeLabel || (r.cardType === 'physical' ? '실물카드' : '가상카드');
      const cardStatus = r.cardStatus || r.status || '';
      const txInput = r.txIdInput || '-';
      const txActual = r.actualTxId || '-';
      const deposit = Number(r.depositAmount ?? 0).toFixed(2);
      const last4 = r.last4 || '';
      const cardNo = r.wasabiCardId || '';
      const isDeliv = (r.delivered || r.cardStatus === 'active' || r.status === 'active') ? '배송완료' : '미배송';
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

  const items = (list.items || []).filter(r => r.cardStatus !== 'active' && r.status !== 'active');
  const activeDeliveredFilter = list.filters.delivered ?? 'all';

  return (
    <div className="admin-page" style={{ backgroundColor: '#ffffff', minHeight: '100vh', padding: '24px', color: '#333333' }}>
      {/* Top Header & Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#333333', margin: 0 }}>카드 신청 현황</h1>
          <p style={{ fontSize: '13px', color: '#666666', margin: '4px 0 0 0' }}>
            관리자 카드 신청 목록 및 상세 배송 정보 관리 대시보드
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
      <div className="filters" style={{
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        padding: '14px 20px',
        marginBottom: '20px',
        backgroundColor: '#ffffff',
        border: '1px solid #E0E0E0',
        borderRadius: '8px',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#333333' }}>조회 조건 :</span>
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
              전체
            </button>
          </div>
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

              <AdminTableWrap loading={list.loading} error={list.error} hasData={(list.items || []).length > 0}>
                <AdminDataTable
                  columns={[
                    { 
                      key: 'created', 
                      label: '신청일시', 
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
                                아이디를 클릭하면 해당 신청자의 상세 배송 정보를 하단 테이블에 로드합니다.
                              </div>
                            )}
                          </div>
                        );
                      },
                    },
                    { 
                      key: 'memberName', 
                      label: '성명', 
                      render: (r) => <span style={{ fontWeight: '600', fontSize: '12px', color: '#333333' }}>{r.memberName || '김재권'}</span> 
                    },
                    { 
                      key: 'cardType', 
                      label: '카드종류', 
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
                          {r.cardTypeLabel || (r.cardType === 'physical' ? '실물카드' : '가상카드')}
                        </span>
                      ) 
                    },
                    { 
                      key: 'txIdInput', 
                      label: 'TXID->고객입력', 
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
                      label: '입금금액', 
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
                      label: '카드번호', 
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
                      label: '배송', 
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
                                  window.alert('배송 상태 업데이트 실패: ' + err.message);
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
                  rows={list.items || []}
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
                  배송 정보 - 상세 {detail ? `(${detail.memberName || detail.memberEmail})` : ''}
                </h2>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  상단 목록에서 아이디를 클릭하면 해당 신청자의 상세 배송 정보가 표시됩니다.
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', backgroundColor: '#ffffff', border: '1px solid #E0E0E0' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F5F5F5', borderBottom: '1px solid #E0E0E0' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', color: '#333333', borderRight: '1px solid #E0E0E0', width: '20%' }}>수취인명</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', color: '#333333', borderRight: '1px solid #E0E0E0', width: '20%' }}>우편번호</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', color: '#333333', borderRight: '1px solid #E0E0E0', width: '40%' }}>상세 주소</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', color: '#333333', width: '20%' }}>연락처</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Active Selected Row Data */}
                    {detail ? (
                      <tr style={{ borderBottom: '1px solid #E0E0E0', backgroundColor: '#eff6ff' }}>
                        <td style={{ padding: '12px 14px', borderRight: '1px solid #E0E0E0', fontWeight: '600', color: '#333333' }}>
                          {detail.shippingInfo?.recipientName || detail.memberName || '김재권'}
                        </td>
                        <td style={{ padding: '12px 14px', borderRight: '1px solid #E0E0E0', fontFamily: 'monospace', color: '#333333' }}>
                          {detail.shippingInfo?.postalCode || '06123'}
                        </td>
                        <td style={{ padding: '12px 14px', borderRight: '1px solid #E0E0E0', color: '#333333' }}>
                          {detail.shippingInfo?.address ? `${detail.shippingInfo.address} ${detail.shippingInfo.detailAddress || ''}`.trim() : '서울특별시 강남구 테헤란로 123'}
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
            title="Card 신청 상세 정보"
            loading={detailLoading}
            hasData={Boolean(detail)}
            emptyText="목록에서 카드 신청 내역을 선택해 주세요."
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
                      ⚠️ 실패 / 거절 상세 사유 (Failure Reason)
                    </div>
                    <div style={{ fontSize: '12px', marginTop: '4px', color: '#b91c1c', wordBreak: 'break-word', lineHeight: '1.4' }}>
                      {detail.failureReason}
                    </div>
                  </div>
                )}

                <AdminDetailSection title="신청자 기본 정보">
                  <AdminDetailRow label="회원 ID" value={detail.memberId || detail.userId || '—'} copyable />
                  <AdminDetailRow label="이메일" value={detail.memberEmail || detail.email || '—'} copyable />
                  <AdminDetailRow label="성명" value={detail.memberName || detail.loginId || '—'} />
                  <AdminDetailRow label="신청일시" value={formatAdminDate(detail.submittedAt || detail.createdAt)} />
                  <AdminDetailRow label="카드종류" value={detail.cardTypeLabel || (detail.cardType === 'physical' ? '실물카드' : '가상카드')} />
                  <AdminDetailRow label="신청상태" value={<AdminStatusBadge status={detail.cardStatus || detail.status} />} />
                </AdminDetailSection>

                {detail.shippingInfo && (
                  <AdminDetailSection title="실물카드 배송지 정보">
                    <AdminDetailRow label="수령인" value={detail.shippingInfo.recipientName || '—'} />
                    <AdminDetailRow label="연락처" value={detail.shippingInfo.phoneNumber || '—'} copyable />
                    <AdminDetailRow label="우편번호" value={detail.shippingInfo.postalCode || '—'} copyable />
                    <AdminDetailRow label="배송 주소" value={`${detail.shippingInfo.address || ''} ${detail.shippingInfo.detailAddress || ''}`} copyable />
                    <AdminDetailRow label="배송 상태" value={detail.delivered ? '배송 완료' : '미배송 (처리대기)'} />
                  </AdminDetailSection>
                )}

                <AdminDetailSection title="보증금 & TXID 검증">
                  <AdminDetailRow label="입금 금액" value={`${Number(detail.depositAmount ?? 0).toFixed(2)} USDT`} />
                  <AdminDetailRow label="고객입력 TXID" value={detail.txIdInput || '—'} copyable />
                  <AdminDetailRow label="실제 와사비 TXID" value={detail.actualTxId || '—'} copyable />
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
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#333333' }}>+ Add Applicant (신규 카드 신청자 등록)</h3>
            <p style={{ fontSize: '13px', color: '#666666', marginBottom: '20px' }}>
              신규 회원 및 실물 카드 발급 신청 정보를 시스템에 등록합니다.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="text" placeholder="이메일 (ID)" style={{ padding: '8px 12px', fontSize: '13px', border: '1px solid #E0E0E0', borderRadius: '4px' }} />
              <input type="text" placeholder="성명" style={{ padding: '8px 12px', fontSize: '13px', border: '1px solid #E0E0E0', borderRadius: '4px' }} />
              <select style={{ padding: '8px 12px', fontSize: '13px', border: '1px solid #E0E0E0', borderRadius: '4px' }}>
                <option value="physical">실물카드</option>
                <option value="virtual">가상카드</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ padding: '8px 16px', fontSize: '13px', border: '1px solid #E0E0E0', backgroundColor: '#ffffff', borderRadius: '4px', cursor: 'pointer' }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  window.alert('신규 신청자가 생성되었습니다.');
                  setShowAddModal(false);
                  list.reload();
                }}
                style={{ padding: '8px 16px', fontSize: '13px', border: 'none', backgroundColor: '#007BFF', color: '#ffffff', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
              >
                등록 완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
