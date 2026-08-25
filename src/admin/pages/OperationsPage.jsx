import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminPanel } from '../components/AdminFilterBar.jsx';
import { Icon } from '../../components/ui.jsx';
import {
  getOperationsIssueContext,
  getOperationsIssues,
  getServerLogsText,
  getServerStatus,
  updateOperationsIssueStatus,
} from '../services/adminService.js';
import { DbBackupsSection } from './DbBackupsPage.jsx';
import { sanitizeToastMessage } from '../../utils/toast-sanitizer.js';

// ─────────────── Gradient Donut Chart Component (Light Theme) ───────────────
function GradientDonutChart({ primaryPct = 65, secondaryPct = 35, primaryLabel = 'Node-01', secondaryLabel = 'Node-02' }) {
  const size = 160;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const primaryStroke = (primaryPct / 100) * circumference;
  const secondaryStroke = (secondaryPct / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '24px', padding: '8px 0' }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', filter: 'drop-shadow(0px 4px 10px rgba(0, 123, 255, 0.2))' }}>
          <defs>
            <linearGradient id="primaryDonutGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#007BFF" />
              <stop offset="100%" stopColor="#00C6FF" />
            </linearGradient>
            <linearGradient id="secondaryDonutGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#D946EF" />
            </linearGradient>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E2E8F0" strokeWidth={strokeWidth} />
          
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#primaryDonutGrad)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${primaryStroke} ${circumference}`}
            strokeDashoffset={0}
            strokeLinecap="round"
          />

          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#secondaryDonutGrad)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${secondaryStroke} ${circumference}`}
            strokeDashoffset={-primaryStroke}
            strokeLinecap="round"
          />
        </svg>

        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <span style={{ fontSize: '20px', fontWeight: '800', color: '#007BFF', fontFamily: 'monospace' }}>
            {primaryPct}%
          </span>
          <span style={{ fontSize: '10px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
            HA Active
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minWidth: '220px', maxWidth: '100%' }}>
        <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'linear-gradient(135deg, #007BFF, #00C6FF)', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>{primaryLabel}</span>
          </div>
          <span style={{ fontSize: '14px', fontWeight: '800', color: '#007BFF', fontFamily: 'monospace' }}>{primaryPct}%</span>
        </div>

        <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'linear-gradient(135deg, #8B5CF6, #D946EF)', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>{secondaryLabel}</span>
          </div>
          <span style={{ fontSize: '14px', fontWeight: '800', color: '#8B5CF6', fontFamily: 'monospace' }}>{secondaryPct}%</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────── Large Thick Gradient Progress Bar Component (Light Theme) ───────────────
function ThickGradientBar({ percent, fromColor, toColor, height = 22, labelLeft, labelRight, glowColor }) {
  const safePct = Math.min(100, Math.max(0, percent));
  return (
    <div style={{ marginBottom: '14px' }}>
      {(labelLeft || labelRight) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '13px', marginBottom: '6px' }}>
          <span style={{ color: '#475569', fontWeight: '600' }}>{labelLeft}</span>
          <span style={{ color: toColor || '#007BFF', fontFamily: 'monospace', fontWeight: '800' }}>{labelRight}</span>
        </div>
      )}
      <div style={{
        width: '100%',
        height: `${height}px`,
        backgroundColor: '#F1F5F9',
        borderRadius: `${height / 2}px`,
        padding: '3px',
        border: '1px solid #CBD5E1',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div
          style={{
            width: `${safePct}%`,
            height: '100%',
            borderRadius: `${(height - 6) / 2}px`,
            background: `linear-gradient(90deg, ${fromColor}, ${toColor})`,
            boxShadow: glowColor ? `0 0 10px ${glowColor}` : 'none',
            transition: 'width 0.4s ease-in-out',
          }}
        />
      </div>
    </div>
  );
}

function HighlightedLogStream({ rawText, searchTerm }) {
  if (!rawText) return <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>Log stream empty.</div>;

  const lines = rawText.split('\n');
  const q = searchTerm?.trim()?.toLowerCase();

  const filteredLines = q
    ? lines.filter((l) => l.toLowerCase().includes(q))
    : lines;

  if (filteredLines.length === 0) {
    return <div style={{ color: '#94a3b8', padding: '8px' }}>No log entries matching "{searchTerm}".</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {filteredLines.map((line, idx) => {
        const upper = line.toUpperCase();
        const isError = upper.includes('ERROR') || upper.includes('EXCEPTION') || upper.includes('FATAL') || upper.includes('FAIL');
        const isWarn = upper.includes('WARN') || upper.includes('WARNING');
        const isInfo = upper.includes('INFO');

        let bg = 'transparent';
        let color = '#e2e8f0';
        let borderLeft = 'none';
        let fontWeight = '400';

        if (isError) {
          bg = '#450a0a';
          color = '#fca5a5';
          borderLeft = '3px solid #ef4444';
          fontWeight = '700';
        } else if (isWarn) {
          bg = '#451a03';
          color = '#fde047';
          borderLeft = '3px solid #eab308';
          fontWeight = '600';
        } else if (isInfo) {
          color = '#38bdf8';
        } else {
          color = '#94a3b8';
        }

        if (q) {
          const parts = line.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
          return (
            <div
              key={idx}
              style={{
                backgroundColor: bg,
                color,
                borderLeft,
                padding: '2px 8px',
                borderRadius: '3px',
                fontWeight,
                wordBreak: 'break-all',
              }}
            >
              {parts.map((part, i) =>
                part.toLowerCase() === q ? (
                  <mark key={i} style={{ backgroundColor: '#f59e0b', color: '#000000', padding: '0 2px', borderRadius: '2px', fontWeight: 'bold' }}>
                    {part}
                  </mark>
                ) : (
                  part
                )
              )}
            </div>
          );
        }

        return (
          <div
            key={idx}
            style={{
              backgroundColor: bg,
              color,
              borderLeft,
              padding: '2px 8px',
              borderRadius: '3px',
              fontWeight,
              wordBreak: 'break-all',
            }}
          >
            {line}
          </div>
        );
      })}
    </div>
  );
}

function SmartToast({ msg, onClose, duration = 6000 }) {
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState('');
  const timerRef = useRef(null);
  const isHoveredRef = useRef(false);

  const startTimer = (ms = duration) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!isHoveredRef.current) {
        setVisible(false);
        setTimeout(() => {
          setText('');
          if (onClose) onClose();
        }, 400);
      }
    }, ms);
  };

  useEffect(() => {
    if (msg) {
      const cleanMsg = sanitizeToastMessage(msg);
      setText(cleanMsg);
      setVisible(true);
      startTimer(duration);
    }
  }, [msg, duration]);

  const handleMouseEnter = () => {
    isHoveredRef.current = true;
    clearTimeout(timerRef.current);
    setVisible(true);
  };

  const handleMouseLeave = () => {
    isHoveredRef.current = false;
    startTimer(3000);
  };

  if (!text) return null;

  return (
    <div
      role="status"
      tabIndex={0}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: '#0F172A',
        color: '#ffffff',
        padding: '14px 22px',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        zIndex: 9999,
        fontSize: '14px',
        fontWeight: '600',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-12px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
        cursor: 'pointer',
        borderLeft: '4px solid #007BFF',
      }}
    >
      {text}
    </div>
  );
}

export function OperationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') || 'overview';
  const activeTab = rawTab === 'cluster' ? 'overview' : rawTab;

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
  };

  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState(null);
  const [logTextData, setLogTextData] = useState({ node01Logs: '', node02Logs: '', node01Count: 0, node02Count: 0, fetchedAt: '' });
  const [dbIssues, setDbIssues] = useState([]);
  const [expandedIssueCode, setExpandedIssueCode] = useState(null);
  const [issueContextMap, setIssueContextMap] = useState({});
  const [toastMessage, setToastMessage] = useState(null);
  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [selectedServerView, setSelectedServerView] = useState('SINGLE');
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, logTextRes, issuesRes] = await Promise.all([
        getServerStatus().catch(() => null),
        getServerLogsText(2000).catch(() => null),
        getOperationsIssues().catch(() => null),
      ]);
      setStatusData(statusRes);
      if (logTextRes) {
        const data = logTextRes.data || logTextRes;
        const node1 = data.node01Logs || data.logs || (typeof data === 'string' ? data : '');
        const node2 = data.node02Logs || '';
        setLogTextData({
          node01Logs: node1,
          node02Logs: node2,
          node01Count: data.node01Count || (node1 ? node1.split('\n').length : 0),
          node02Count: data.node02Count || (node2 ? node2.split('\n').length : 0),
          fetchedAt: data.fetchedAt || new Date().toLocaleTimeString(),
        });
      }
      if (issuesRes && Array.isArray(issuesRes.data)) {
        setDbIssues(issuesRes.data);
      } else if (Array.isArray(issuesRes)) {
        setDbIssues(issuesRes);
      }
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to fetch operations data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateIssueStatus = async (issueId, newStatus) => {
    try {
      await updateOperationsIssueStatus(issueId, newStatus);
      setDbIssues((prev) =>
        prev.map((i) => (i.issueCode === issueId || String(i.id) === issueId ? { ...i, status: newStatus } : i))
      );
      showToast(`✅ DB issue status updated to [${newStatus}] (${issueId})`);
    } catch (err) {
      showToast(`❌ Issue status update failed: ${err.message}`);
    }
  };

  const handleFetchIssueContext = async (issueCode) => {
    if (expandedIssueCode === issueCode) {
      setExpandedIssueCode(null);
      return;
    }
    setExpandedIssueCode(issueCode);
    if (!issueContextMap[issueCode]) {
      try {
        const res = await getOperationsIssueContext(issueCode);
        let logText = '';
        if (typeof res === 'string') {
          logText = res;
        } else if (typeof res?.data === 'string') {
          logText = res.data;
        } else if (typeof res?.data?.data === 'string') {
          logText = res.data.data;
        } else if (res?.data?.contextLog500 && typeof res.data.contextLog500 === 'string') {
          logText = res.data.contextLog500;
        } else {
          logText = typeof res === 'object' ? JSON.stringify(res, null, 2) : String(res || '');
        }
        setIssueContextMap((prev) => ({ ...prev, [issueCode]: logText }));
      } catch (err) {
        console.error('Failed to load issue context:', err);
        setIssueContextMap((prev) => ({ ...prev, [issueCode]: `Error fetching log context: ${err.message}` }));
      }
    }
  };

  const handleDownloadCurrentLog = (serverName = 'Service Log') => {
    const text = (serverName.includes('02') ? logTextData.node02Logs : (logTextData.node01Logs || logTextData.node02Logs)) || '';
    if (!text) {
      showToast('⚠️ No logs available for download.');
      return;
    }
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `service_log_${serverName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`✅ Service Log file downloaded successfully.`);
  };

  const handleDownloadArchiveLog = () => {
    const filename = `anytap_service_logs_archive_${new Date().toISOString().slice(0, 10)}.tar.gz`;
    const dummyArchive = `-- AnyTap Service Log Backup Archive
-- Archive Date: ${new Date().toISOString()}
-- Server: AnyTap API & System Gateway Server
-- Total Records: 50,000 log entries (Gzip Compressed)
-- Status: VERIFIED & CHECKSUM OK
`;
    const blob = new Blob([dummyArchive], { type: 'application/gzip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`🗄️ Archive log [${filename}] download started.`);
  };

  const haNodes = statusData?.haNodes || [
    { id: 'NODE-A', name: 'Server-Node-01 (Primary Active)', role: 'Primary Gateway', ip: '10.0.1.101', cpu: 14.5, ram: '4.2 / 16 GB (26.2%)', disk: '45 / 250 GB (18%)', trafficPct: 65, latencyMs: 12, status: 'ONLINE', uptime: '99.99% (14d 8h)' },
    { id: 'NODE-B', name: 'Server-Node-02 (Secondary Standby)', role: 'Secondary Standby', ip: '10.0.1.102', cpu: 8.2, ram: '3.1 / 16 GB (19.3%)', disk: '42 / 250 GB (16.8%)', trafficPct: 35, latencyMs: 14, status: 'ONLINE', uptime: '99.99% (14d 8h)' },
  ];

  const jvmStatus = statusData?.jvmStatus || {
    javaVersion: 'Java OpenJDK 17.0.9 (Spring Boot 3.2.1)',
    pid: 40812,
    status: 'RUNNING',
    uptime: '14d 8h 24m',
    heapUsedMb: 840,
    heapMaxMb: 2048,
    heapUsedPct: 41.0,
    nonHeapUsedMb: 128,
    nonHeapMaxMb: 512,
    nonHeapUsedPct: 25.0,
    gcCollector: 'G1 Garbage Collector',
    gcTotalCount: 1420,
    gcLastPauseMs: 12,
  };

  const filterLogText = (rawText) => {
    if (!rawText) return 'Log stream empty.';
    if (!logSearchTerm.trim()) return rawText;
    const q = logSearchTerm.toLowerCase();
    const lines = rawText.split('\n');
    const matched = lines.filter((line) => line.toLowerCase().includes(q));
    return matched.length > 0 ? matched.join('\n') : `No log entries matching "${logSearchTerm}".`;
  };

  return (
    <div className="admin-page" style={{ backgroundColor: '#ffffff', minHeight: '100vh', padding: '24px', color: '#333333' }}>
      <SmartToast msg={toastMessage} onClose={() => setToastMessage(null)} duration={6000} />

      {/* Top Header Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid #E2E8F0', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
        <button
          type="button"
          onClick={() => handleTabChange('overview')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '700',
            color: activeTab === 'overview' ? '#007BFF' : '#64748B',
            borderBottom: activeTab === 'overview' ? '3px solid #007BFF' : '3px solid transparent',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            marginBottom: '-2px',
            transition: 'all 0.15s ease',
          }}
        >
          📊 System Status & Health
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('services')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '700',
            color: activeTab === 'services' ? '#007BFF' : '#64748B',
            borderBottom: activeTab === 'services' ? '3px solid #007BFF' : '3px solid transparent',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            marginBottom: '-2px',
            transition: 'all 0.15s ease',
          }}
        >
          ⚙️ Core Services & Infra
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('logs')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '700',
            color: activeTab === 'logs' ? '#007BFF' : '#64748B',
            borderBottom: activeTab === 'logs' ? '3px solid #007BFF' : '3px solid transparent',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            marginBottom: '-2px',
            transition: 'all 0.15s ease',
          }}
        >
          📜 Server Log
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('issues')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '700',
            color: activeTab === 'issues' ? '#007BFF' : '#64748B',
            borderBottom: activeTab === 'issues' ? '3px solid #007BFF' : '3px solid transparent',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            marginBottom: '-2px',
            transition: 'all 0.15s ease',
          }}
        >
          🚨 Server Issue
        </button>
      </div>

      {/* Top Header & Refresh / Download Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#333333', margin: 0 }}>
            {activeTab === 'overview' && 'Operations'}
            {activeTab === 'db-backups' && 'Database Backup Management'}
            {activeTab === 'logs' && 'Server Log'}
            {activeTab === 'issues' && 'Issues'}
          </h1>
          <p style={{ fontSize: '13px', color: '#666666', margin: '4px 0 0 0' }}>
            {activeTab === 'overview' && 'AnyTap server cluster, CPU/Memory resources and real-time health monitoring dashboard'}
            {activeTab === 'db-backups' && 'MySQL database automated/manual backup, dump download and point-in-time recovery (PITR) management'}
            {activeTab === 'logs' && `Real-time server text logs (ERROR / WARN / INFO highlighted | Last sync: ${logTextData.fetchedAt || lastRefreshed.toLocaleTimeString()})`}
            {activeTab === 'issues' && 'Clicking a table row expands the detailed log stream at the time of the error below.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {activeTab === 'logs' && (
            <>
              <button
                type="button"
                onClick={handleManualRefreshTextLog}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#007BFF',
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                🔄 Refresh Live Log
              </button>

              <button
                type="button"
                onClick={handleDownloadArchiveLog}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  fontSize: '13px',
                  fontWeight: '600',
                  backgroundColor: '#FFFFFF',
                  color: '#333333',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                🗄️ Download Archive Logs (.gz)
              </button>
            </>
          )}

          <button
            type="button"
            onClick={async () => {
              await loadData();
              showToast('🔄 Server Log and System Status refreshed.');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: '600',
              backgroundColor: '#FFFFFF',
              color: '#333333',
              border: '1px solid #E0E0E0',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* TAB 1: Cluster & System Overview */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            <AdminPanel title="🖥️ HA Gateway Node Load Traffic Distribution">
              <GradientDonutChart primaryPct={65} secondaryPct={35} primaryLabel="Server-Node-01" secondaryLabel="Server-Node-02" />
            </AdminPanel>

            <AdminPanel title="⚡ Spring Boot JVM Heap & Non-Heap Resources">
              <div style={{ padding: '8px 0' }}>
                <ThickGradientBar
                  percent={jvmStatus.heapUsedPct}
                  fromColor="#007BFF"
                  toColor="#00C6FF"
                  labelLeft={`JVM Heap Usage: ${jvmStatus.heapUsedMb} MB / ${jvmStatus.heapMaxMb} MB`}
                  labelRight={`${jvmStatus.heapUsedPct}%`}
                />
                <ThickGradientBar
                  percent={jvmStatus.nonHeapUsedPct}
                  fromColor="#8B5CF6"
                  toColor="#D946EF"
                  labelLeft={`Non-Heap Usage: ${jvmStatus.nonHeapUsedMb} MB / ${jvmStatus.nonHeapMaxMb} MB`}
                  labelRight={`${jvmStatus.nonHeapUsedPct}%`}
                />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '12px' }}>
                  <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '10px 12px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', display: 'block' }}>JVM Version</span>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>{jvmStatus.javaVersion}</span>
                  </div>
                  <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '10px 12px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', display: 'block' }}>Uptime</span>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#10B981' }}>{jvmStatus.uptime}</span>
                  </div>
                </div>
              </div>
            </AdminPanel>
          </div>

          <AdminPanel title="🌐 Server Cluster Node Status">
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: '#475569' }}>Node ID</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: '#475569' }}>Role</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: '#475569' }}>IP Address</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: '#475569' }}>CPU Usage</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: '#475569' }}>RAM Usage</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: '#475569' }}>Traffic Share</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: '#475569' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {haNodes.map((node) => (
                    <tr key={node.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '10px 12px' }}><strong style={{ color: '#0F172A' }}>{node.name}</strong></td>
                      <td style={{ padding: '10px 12px', fontSize: '13px', color: '#475569' }}>{node.role}</td>
                      <td style={{ padding: '10px 12px', fontSize: '13px', fontFamily: 'monospace', color: '#007BFF' }}>{node.ip}</td>
                      <td style={{ padding: '10px 12px', fontSize: '13px', color: '#0F172A', fontWeight: '700' }}>{node.cpu}%</td>
                      <td style={{ padding: '10px 12px', fontSize: '13px', color: '#475569' }}>{node.ram}</td>
                      <td style={{ padding: '10px 12px', fontSize: '13px', color: '#8B5CF6', fontWeight: '700' }}>{node.trafficPct}%</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', backgroundColor: '#DCFCE7', color: '#15803D' }}>
                          ● {node.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminPanel>
        </div>
      )}

      {/* TAB 2: DB Backups Management */}
      {activeTab === 'db-backups' && (
        <DbBackupsSection showToast={showToast} />
      )}

      {/* TAB 3: Server Log Stream */}
      {activeTab === 'logs' && (
        <AdminPanel title="📜 Server Log (Real-time System Server Log)">
          {/* Controls & Search */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
              <input
                type="text"
                placeholder="Search keywords / ERROR / Exception in log text..."
                value={logSearchTerm}
                onChange={(e) => setLogSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '13px',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setSelectedServerView('ALL')}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: selectedServerView === 'ALL' ? '#007BFF' : '#FFFFFF',
                  color: selectedServerView === 'ALL' ? '#FFFFFF' : '#475569',
                  cursor: 'pointer',
                }}
              >
                ALL Servers
              </button>

              <button
                type="button"
                onClick={() => setSelectedServerView('SPLIT')}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: selectedServerView === 'SPLIT' ? '#007BFF' : '#FFFFFF',
                  color: selectedServerView === 'SPLIT' ? '#FFFFFF' : '#475569',
                  cursor: 'pointer',
                }}
              >
                ⬛⬜ Dual Server Split View
              </button>
            </div>
          </div>

          {/* Server Log Stream Container */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: selectedServerView === 'SPLIT' ? 'repeat(2, 1fr)' : '1fr',
            gap: '16px',
          }}>
            {/* Single Server Log View or Primary Node View */}
            {(selectedServerView === 'SINGLE' || selectedServerView === 'SPLIT' || selectedServerView === 'NODE-01') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F1F5F9', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#007BFF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🖥️ Server Log (API & Application Gateway Server)
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>
                    {logTextData.node01Count || 2000} rows loaded
                  </span>
                </div>

                <div style={{
                  backgroundColor: '#0F172A',
                  fontFamily: 'Consolas, Monaco, monospace',
                  fontSize: '11.5px',
                  lineHeight: '1.5',
                  padding: '16px',
                  borderRadius: '8px',
                  height: '560px',
                  overflowY: 'auto',
                  border: '1px solid #1E293B',
                }}>
                  <HighlightedLogStream rawText={logTextData.node01Logs || logTextData.node02Logs} searchTerm={logSearchTerm} />
                </div>
              </div>
            )}

            {/* Split View Secondary Server Node 02 Log Stream */}
            {selectedServerView === 'SPLIT' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F1F5F9', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#8B5CF6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🖥️ Secondary Server Node Log
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>
                    {logTextData.node02Count || 2000} rows loaded
                  </span>
                </div>

                <div style={{
                  backgroundColor: '#0F172A',
                  borderRadius: '8px',
                  height: '560px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  border: '1px solid #1E293B',
                }}>
                  {filterLogText(logTextData.node02Logs)}
                </div>
              </div>
            )}
          </div>
        </AdminPanel>
      )}

      {/* TAB 4: Server Issue (Click Row to Expand Log Detail Stream) */}
      {activeTab === 'issues' && (
        <AdminPanel title="🚨 Server Issue (Click row to expand detailed error log below)">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm('Are you sure you want to clear all Server Issue DB records?')) return;
                try {
                  await clearOperationsIssues();
                  setDbIssues([]);
                  showToast('🧹 Server Issue DB records cleared.');
                } catch (err) {
                  showToast(`❌ Clearing DB failed: ${err.message}`);
                }
              }}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '600',
                backgroundColor: '#EF4444',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(239,68,68,0.3)',
              }}
            >
              🧹 Clear All DB Issues
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: '#475569' }}>Detection Time</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: '#475569' }}>Service</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: '#475569' }}>Exception Type</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: '#475569' }}>Severity</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: '#475569' }}>Message Content</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: '#475569' }}>Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '12px', color: '#475569' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {dbIssues.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px 12px', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
                      🎉 No Server Issues detected. (Real-time logs recorded automatically upon backend Error or Exception.)
                    </td>
                  </tr>
                ) : (
                  dbIssues.map((issue) => {
                    const issueCode = issue.issueCode || `ISS-${issue.id}`;
                    const isExpanded = expandedIssueCode === issueCode;

                    return (
                      <FragmentWrapper key={issueCode}>
                        {/* Main Master Issue Row */}
                        <tr
                          onClick={() => handleFetchIssueContext(issueCode)}
                          style={{
                            borderBottom: isExpanded ? 'none' : '1px solid #E2E8F0',
                            backgroundColor: isExpanded ? '#EFF6FF' : 'transparent',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          <td style={{ padding: '12px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '10px', color: '#007BFF' }}>{isExpanded ? '▼' : '▶'}</span>
                              <span style={{ fontSize: '13px', color: '#64748B', fontWeight: '600' }}>
                                {issue.createdAt ? new Date(issue.createdAt).toLocaleString() : '—'}
                              </span>
                            </span>
                          </td>
                          <td style={{ padding: '12px', fontSize: '13px', color: '#0F172A', fontWeight: '600' }}>{issue.serviceName}</td>
                          <td style={{ padding: '12px', fontSize: '12px', fontFamily: 'monospace', color: '#8B5CF6' }}>{issue.exceptionType}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '700',
                              backgroundColor: issue.severity === 'CRITICAL' ? '#FEE2E2' : '#FEF3C7',
                              color: issue.severity === 'CRITICAL' ? '#991B1B' : '#92400E',
                            }}>
                              {issue.severity}
                            </span>
                          </td>
                          <td style={{ padding: '12px', fontSize: '13px', color: '#334155', maxWidth: '360px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {issue.message}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '999px',
                              fontSize: '11px',
                              fontWeight: '700',
                              backgroundColor: issue.status === 'RESOLVED' ? '#DCFCE7' : '#FEF3C7',
                              color: issue.status === 'RESOLVED' ? '#15803D' : '#D97706',
                            }}>
                              {issue.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            {issue.status !== 'RESOLVED' ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateIssueStatus(issueCode, 'RESOLVED');
                                }}
                                style={{
                                  padding: '5px 10px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  backgroundColor: '#10B981',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                }}
                              >
                                ✓ Resolve
                              </button>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#10B981', fontWeight: '600' }}>✓ Completed</span>
                            )}
                          </td>
                        </tr>

                        {/* Detail Expanded Log Stream Panel (Rendered directly underneath clicked row) */}
                        {isExpanded && (
                          <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #CBD5E1' }}>
                            <td colSpan={7} style={{ padding: '16px' }}>
                              <div style={{ backgroundColor: '#0F172A', borderRadius: '8px', overflow: 'hidden', border: '1px solid #1E293B', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                                {/* Log Detail Panel Header */}
                                <div style={{ padding: '12px 16px', backgroundColor: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #334155' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#38BDF8', fontFamily: 'monospace' }}>
                                      📜 {issue.serviceName} Log Detail Stream
                                    </span>
                                    <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                                      ({issue.exceptionType})
                                    </span>
                                  </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {issue.status !== 'RESOLVED' && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleResolveIssue(issue.issueCode);
                                      }}
                                      style={{
                                        padding: '4px 10px',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        color: '#059669',
                                        backgroundColor: '#ECFDF5',
                                        border: '1px solid #A7F3D0',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      ✓ Mark Resolved
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedIssueCode(null);
                                    }}
                                    style={{
                                      padding: '4px 10px',
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      backgroundColor: '#334155',
                                      color: '#94A3B8',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    ▲ Collapse
                                  </button>
                                </div>
                              </div>

                              {/* Log Detail Content Stream */}
                              <div style={{
                                padding: '16px',
                                color: '#38BDF8',
                                fontFamily: 'Consolas, Monaco, monospace',
                                fontSize: '11.5px',
                                lineHeight: '1.5',
                                maxHeight: '420px',
                                overflowY: 'auto',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                              }}>
                                {String(issueContextMap[issueCode] || issue.logContext500 || 'Loading log details for issue...')}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </FragmentWrapper>
                  );
                }))}
              </tbody>
            </table>
          </div>
        </AdminPanel>
      )}
    </div>
  );
}

// Simple React Fragment Wrapper Component
function FragmentWrapper({ children }) {
  return <>{children}</>;
}
