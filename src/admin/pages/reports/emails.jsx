import { useCallback, useMemo, useState } from 'react';
import { AdminDataTable } from '../../components/AdminDataTable.jsx';
import { AdminPanel } from '../../components/AdminFilterBar.jsx';
import {
  AdminDetailPanel,
  AdminDetailRow,
  AdminDetailSection,
  AdminSplitLayout,
} from '../../components/AdminSplitLayout.jsx';
import { AdminStatusBadge, formatAdminDate, shortenAddress } from '../../components/AdminStatusBadge.jsx';
import { useAdminList } from '../../hooks/useAdminList.js';
import { getEmailLogs } from '../../services/api/adminApiService.js';
import { ReportsTabs } from './ReportsTabs.jsx';

function CopyableText({ text, label = 'Copy' }) {
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

  return (
    <span
      onClick={handleCopy}
      title={`Click to copy: ${text}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        cursor: 'pointer',
        padding: '2px 6px',
        borderRadius: '4px',
        backgroundColor: copied ? '#E2FBE8' : '#F1F5F9',
        border: `1px solid ${copied ? '#86EFAC' : '#CBD5E1'}`,
        transition: 'all 0.15s ease',
        userSelect: 'none',
        fontSize: '12px',
        fontWeight: '500',
        color: copied ? '#15803D' : '#334155',
      }}
    >
      <span>{text}</span>
      <span style={{ fontSize: '10px' }}>{copied ? '✓' : '📋'}</span>
    </span>
  );
}

export function EmailLogsReportPage() {
  const [selectedLog, setSelectedLog] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [datePreset, setDatePreset] = useState('all');
  const [previewMode, setPreviewMode] = useState('preview'); // 'preview' | 'html'

  // Calculate start & end date strings based on preset
  const { startDate, endDate } = useMemo(() => {
    if (datePreset === 'all') return { startDate: '', endDate: '' };

    const now = new Date();
    const end = now.toISOString().slice(0, 10);
    let start = new Date();

    if (datePreset === 'today') {
      start = now;
    } else if (datePreset === '7d') {
      start.setDate(now.getDate() - 7);
    } else if (datePreset === '30d') {
      start.setDate(now.getDate() - 30);
    } else if (datePreset === 'thisMonth') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end,
    };
  }, [datePreset]);

  const listFetcher = useCallback(
    (params) =>
      getEmailLogs({
        ...params,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
    [statusFilter, startDate, endDate]
  );

  const list = useAdminList(listFetcher, {
    pageSize: 20,
  });

  const handleSelectRow = (row) => {
    setSelectedLog(row);
  };

  const handleExportCsv = () => {
    const query = new URLSearchParams();
    if (list.filters.search) query.set('recipient', list.filters.search.trim());
    if (statusFilter !== 'ALL') query.set('status', statusFilter);
    if (startDate) query.set('startDate', startDate);
    if (endDate) query.set('endDate', endDate);

    const exportUrl = `/api/v1/admin/email-logs/export?${query.toString()}`;
    window.open(exportUrl, '_blank');
  };

  const columns = useMemo(
    () => [
      {
        key: 'id',
        label: 'Log ID',
        render: (r) => <span style={{ fontFamily: 'monospace', fontWeight: '600', color: '#64748B' }}>#{r.id}</span>,
      },
      {
        key: 'createdAt',
        label: 'Date & Time',
        render: (r) => (
          <span style={{ fontSize: '13px', color: '#334155' }}>
            {formatAdminDate(r.createdAt || r.at)}
          </span>
        ),
      },
      {
        key: 'recipient',
        label: 'Recipient',
        render: (r) => (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <CopyableText text={r.recipient} />
          </div>
        ),
      },
      {
        key: 'subject',
        label: 'Subject',
        render: (r) => (
          <div
            title={r.subject}
            style={{
              maxWidth: '320px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontWeight: '500',
              color: '#1E293B',
            }}
          >
            {r.subject}
          </div>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        render: (r) => <AdminStatusBadge status={r.status} />,
      },
      {
        key: 'apiResponseCode',
        label: 'HTTP Code',
        render: (r) => {
          const code = r.apiResponseCode;
          if (!code || code === '-') return <span style={{ color: '#94A3B8' }}>—</span>;
          const isOk = Number(code) >= 200 && Number(code) < 300;
          return (
            <span
              style={{
                display: 'inline-block',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '600',
                backgroundColor: isOk ? '#ECFDF5' : '#FEF2F2',
                color: isOk ? '#059669' : '#DC2626',
                border: `1px solid ${isOk ? '#A7F3D0' : '#FECACA'}`,
              }}
            >
              {code}
            </span>
          );
        },
      },
      {
        key: 'ipAddress',
        label: 'Client IP',
        render: (r) => (
          <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#64748B' }}>
            {r.ipAddress && r.ipAddress !== '-' ? r.ipAddress : '—'}
          </span>
        ),
      },
      {
        key: 'actions',
        label: 'Action',
        render: (r) => (
          <button
            type="button"
            className="admin-btn admin-btn--secondary admin-btn--sm"
            onClick={(e) => {
              e.stopPropagation();
              handleSelectRow(r);
            }}
            style={{ padding: '3px 8px', fontSize: '12px' }}
          >
            🔍 Details
          </button>
        ),
      },
    ],
    []
  );

  return (
    <div className="admin-page admin-fees-report">
      {/* Reports Navigation Sub-Tabs */}
      <ReportsTabs />

      {/* Top Header & Buttons */}
      <div className="admin-cards-header" style={{ marginBottom: '16px' }}>
        <div>
          <h1 className="admin-cards-header__title">Email Dispatch History</h1>
          <p className="admin-cards-header__sub">
            Review automated and system email notification logs, delivery status, and error details.
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
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1, minWidth: '320px' }}>
            <input
              type="search"
              className="admin-input admin-input--search"
              placeholder="Search by recipient email or subject..."
              value={list.filters.search || ''}
              onChange={(e) => list.setFilter('search', e.target.value)}
              style={{ width: '100%', maxWidth: '380px' }}
            />
            <select
              className="admin-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ minWidth: '140px' }}
            >
              <option value="ALL">All Status</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'today', label: 'Today' },
              { id: '7d', label: 'Last 7 Days' },
              { id: '30d', label: 'Last 30 Days' },
              { id: 'thisMonth', label: 'This Month' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                className={`admin-btn admin-btn--sm ${
                  datePreset === p.id ? 'admin-btn--primary' : 'admin-btn--secondary'
                }`}
                onClick={() => setDatePreset(p.id)}
                style={{ padding: '5px 12px', fontSize: '12px' }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </AdminPanel>

      {/* Main Split Layout: Table Left, Detail Panel Right */}
      <div style={{ marginTop: '16px' }}>
        <AdminSplitLayout
          left={
            <AdminDataTable
              columns={columns}
              rows={list.items}
              selectedId={selectedLog?.id}
              onSelectRow={handleSelectRow}
              pagination={{
                page: list.page,
                totalPages: list.totalPages,
                total: list.total,
                pageSize: list.pageSize,
                onPageChange: list.setPage,
              }}
              emptyMessage={list.loading ? 'Loading email dispatch logs…' : 'No email dispatch records found.'}
            />
          }
          right={
            selectedLog ? (
              <AdminDetailPanel title={`Email Log #${selectedLog.id}`} onClose={() => setSelectedLog(null)}>
                <AdminDetailSection title="Delivery Overview">
                  <AdminDetailRow label="Recipient Email" value={<CopyableText text={selectedLog.recipient} />} />
                  <AdminDetailRow label="Status" value={<AdminStatusBadge status={selectedLog.status} />} />
                  <AdminDetailRow label="Date Dispatched" value={formatAdminDate(selectedLog.createdAt || selectedLog.at)} />
                  <AdminDetailRow
                    label="HTTP Response"
                    value={
                      selectedLog.apiResponseCode && selectedLog.apiResponseCode !== '-'
                        ? selectedLog.apiResponseCode
                        : '—'
                    }
                  />
                  <AdminDetailRow
                    label="Client IP"
                    value={selectedLog.ipAddress && selectedLog.ipAddress !== '-' ? selectedLog.ipAddress : '—'}
                  />
                </AdminDetailSection>

                {selectedLog.status === 'FAILED' && selectedLog.errorMessage && selectedLog.errorMessage !== '-' ? (
                  <AdminDetailSection title="Error Diagnostic">
                    <div
                      style={{
                        padding: '10px 12px',
                        backgroundColor: '#FEF2F2',
                        border: '1px solid #FECACA',
                        borderRadius: '6px',
                        color: '#991B1B',
                        fontSize: '13px',
                        lineHeight: '1.4',
                        wordBreak: 'break-all',
                      }}
                    >
                      <strong>Failure Reason:</strong>
                      <div style={{ marginTop: '4px' }}>{selectedLog.errorMessage}</div>
                    </div>
                  </AdminDetailSection>
                ) : null}

                <AdminDetailSection title="Email Content">
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', marginBottom: '2px' }}>
                      SUBJECT
                    </div>
                    <div
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '6px',
                        fontWeight: '600',
                        color: '#1E293B',
                        fontSize: '13px',
                      }}
                    >
                      {selectedLog.subject}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>
                      BODY MESSAGE
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        className={`admin-btn admin-btn--xs ${
                          previewMode === 'preview' ? 'admin-btn--primary' : 'admin-btn--secondary'
                        }`}
                        onClick={() => setPreviewMode('preview')}
                        style={{ fontSize: '11px', padding: '2px 6px' }}
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        className={`admin-btn admin-btn--xs ${
                          previewMode === 'html' ? 'admin-btn--primary' : 'admin-btn--secondary'
                        }`}
                        onClick={() => setPreviewMode('html')}
                        style={{ fontSize: '11px', padding: '2px 6px' }}
                      >
                        Source
                      </button>
                    </div>
                  </div>

                  {previewMode === 'preview' ? (
                    <div
                      style={{
                        minHeight: '260px',
                        maxHeight: '440px',
                        overflowY: 'auto',
                        padding: '12px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        fontSize: '13px',
                        lineHeight: '1.5',
                      }}
                    >
                      {selectedLog.body ? (
                        <iframe
                          title="Email Preview"
                          srcDoc={selectedLog.body}
                          sandbox="allow-same-origin"
                          style={{
                            width: '100%',
                            minHeight: '240px',
                            border: 'none',
                          }}
                        />
                      ) : (
                        <span style={{ color: '#94A3B8' }}>No email body recorded.</span>
                      )}
                    </div>
                  ) : (
                    <textarea
                      readOnly
                      value={selectedLog.body || 'No email body recorded.'}
                      style={{
                        width: '100%',
                        height: '240px',
                        padding: '10px',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        backgroundColor: '#1E293B',
                        color: '#F8FAFC',
                        borderRadius: '6px',
                        border: '1px solid #334155',
                        resize: 'vertical',
                      }}
                    />
                  )}
                </AdminDetailSection>
              </AdminDetailPanel>
            ) : null
          }
        />
      </div>
    </div>
  );
}
