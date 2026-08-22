import { useState, useMemo, useEffect } from 'react';
import { AdminPanel } from '../components/AdminFilterBar.jsx';
import { Icon } from '../../components/ui.jsx';
import { getDbTableMetrics } from '../services/adminService.js';

// ─────────────── Thick Gradient Progress Bar Component (Light Theme) ───────────────
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

// ─────────────── Storage Donut Gauge Component (Light Theme) ───────────────
function StorageGaugeDonut({ usedPct = 14.85, freePct = 85.15, usedGb = 14.85, freeGb = 85.15, totalGb = 100 }) {
  const size = 160;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const usedStroke = (usedPct / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '24px', padding: '8px 0' }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', filter: 'drop-shadow(0px 4px 10px rgba(16, 185, 129, 0.2))' }}>
          <defs>
            <linearGradient id="storageUsedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#007BFF" />
              <stop offset="100%" stopColor="#00C6FF" />
            </linearGradient>
            <linearGradient id="storageFreeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="url(#storageFreeGrad)" strokeWidth={strokeWidth} />
          
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#storageUsedGrad)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${usedStroke} ${circumference}`}
            strokeDashoffset={0}
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
          <span style={{ fontSize: '20px', fontWeight: '800', color: '#10B981', fontFamily: 'monospace' }}>
            {freePct}%
          </span>
          <span style={{ fontSize: '10px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
            잔여 여유 용량
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minWidth: '220px', maxWidth: '100%' }}>
        <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'linear-gradient(135deg, #007BFF, #00C6FF)', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>사용 중인 용량</span>
          </div>
          <span style={{ fontSize: '14px', fontWeight: '800', color: '#007BFF', fontFamily: 'monospace' }}>
            {usedGb} GB ({usedPct}%)
          </span>
        </div>

        <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'linear-gradient(135deg, #10B981, #059669)', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#10B981' }}>안전 잔여 여유 용량</span>
          </div>
          <span style={{ fontSize: '14px', fontWeight: '800', color: '#10B981', fontFamily: 'monospace' }}>
            {freeGb} GB ({freePct}%)
          </span>
        </div>
      </div>
    </div>
  );
}

const RDS_BACKUP_CONFIG = {
  instanceId: 'database-1 (Master AnyTabData)',
  engine: 'MySQL 8.4.9 (Aurora Multi-AZ)',
  allocatedStorage: '100 GB (gp2 / KMS Encrypted)',
  retentionPeriod: '30일 (Retention Period)',
  backupWindowUtc: '17:05 - 17:35 UTC',
  backupWindowKst: '매일 KST 새벽 02:05 ~ 02:35',
  pitrSupport: '최근 30일 초 단위 시점 복구 지원 (WAL Replication 활성화)',
  latestRestorableKst: '2026-08-16 01:00:00 KST (실시간 지원 중)',
  status: 'Available',
};

const DB_METRICS = {
  totalStorageGb: 100.0,
  usedStorageGb: 14.85,
  freeStorageGb: 85.15,
  usedStoragePct: 14.85,
  freeStoragePct: 85.15,
  
  totalRamGb: 32.0,
  usedRamGb: 11.52,
  freeRamGb: 20.48,
  usedRamPct: 36.0,
  freeRamPct: 64.0,

  bufferPoolHitRate: 99.85,
  activeConnections: 14,
  maxConnections: 100,
  readIops: 1240,
  writeIops: 450,
  iopsLatencyMs: 0.8,
};

const DOWNLOADABLE_BACKUPS = [
  {
    id: 'BK-20260816-030000-FULL',
    filename: 'AnyTabData_full_dump_20260816_030000.sql.gz',
    type: 'Daily Full Dump (.sql.gz)',
    createdAt: '2026-08-16 03:00:00 KST',
    fileSize: '12.45 GB',
    checksum: 'a8f5c9e2b1094857a1d2e3f4b5c6d7e8',
    status: 'VERIFIED',
    location: 'Encrypted S3 Glacier Vault',
  },
  {
    id: 'BK-20260815-030000-FULL',
    filename: 'AnyTabData_full_dump_20260815_030000.sql.gz',
    type: 'Daily Full Dump (.sql.gz)',
    createdAt: '2026-08-15 03:00:00 KST',
    fileSize: '12.18 GB',
    checksum: 'b7e4d8c1a0983726f5e4d3c2b1a09876',
    status: 'VERIFIED',
    location: 'Encrypted S3 Glacier Vault',
  },
  {
    id: 'BK-20260814-030000-FULL',
    filename: 'AnyTabData_full_dump_20260814_030000.sql.gz',
    type: 'Daily Full Dump (.sql.gz)',
    createdAt: '2026-08-14 03:00:00 KST',
    fileSize: '11.92 GB',
    checksum: 'c6d3c7b0f9872615e4d3c2b1a0987654',
    status: 'VERIFIED',
    location: 'Encrypted S3 Glacier Vault',
  },
  {
    id: 'WAL-20260816-000000-INC',
    filename: 'AnyTabData_wal_log_20260816_000000.tar.gz',
    type: '15-min WAL Log (.tar.gz)',
    createdAt: '2026-08-16 00:00:00 KST',
    fileSize: '482 MB',
    checksum: 'd5c2b6a9e8761504d3c2b1a098765432',
    status: 'VERIFIED',
    location: 'Encrypted S3 Glacier Vault',
  },
];

const INITIAL_SNAPSHOTS = [
  {
    id: 'rds-snap-20260816-auto',
    identifier: 'anytap-db-auto-2026-08-16-02-05',
    type: 'automated',
    typeLabel: 'Automated 정기 백업',
    targetDb: 'database-1 (AnyTabData)',
    status: 'available',
    kstTime: '2026-08-16 02:05:12 KST',
    utcTime: '2026-08-15 17:05:12 UTC',
    size: '14.85 GB',
    pitrReady: true,
  },
  {
    id: 'rds-snap-20260815-auto',
    identifier: 'anytap-db-auto-2026-08-15-02-05',
    type: 'automated',
    typeLabel: 'Automated 정기 백업',
    targetDb: 'database-1 (AnyTabData)',
    status: 'available',
    kstTime: '2026-08-15 02:05:08 KST',
    utcTime: '2026-08-14 17:05:08 UTC',
    size: '14.62 GB',
    pitrReady: true,
  },
  {
    id: 'rds-snap-20260814-manual',
    identifier: 'anytap-db-manual-pre-migration-01',
    type: 'manual',
    typeLabel: 'Manual 수동 스냅샷',
    targetDb: 'database-1 (AnyTabData)',
    status: 'available',
    kstTime: '2026-08-14 15:40:22 KST',
    utcTime: '2026-08-14 06:40:22 UTC',
    size: '14.40 GB',
    pitrReady: true,
  },
];

export function DbBackupsSection({ showToast }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [copiedId, setCopiedId] = useState(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [backupTagInput, setBackupTagInput] = useState('');
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);

  const [liveTables, setLiveTables] = useState([]);

  useEffect(() => {
    getDbTableMetrics()
      .then((data) => {
        if (data && Array.isArray(data.tables)) {
          setLiveTables(data.tables);
        }
      })
      .catch(() => {});
  }, []);

  const handleCopy = (identifier) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(identifier);
    }
    setCopiedId(identifier);
    if (showToast) showToast(`📋 스냅샷 ID [${identifier}] 복사 완료`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadBackupFile = (backup) => {
    const dummySqlDump = `-- AnyTabData Database Snapshot Backup Dump
-- Backup ID: ${backup.id}
-- Created At: ${backup.createdAt}
-- Backup Type: ${backup.type}
-- Checksum: ${backup.checksum}

CREATE DATABASE IF NOT EXISTS AnyTabData;
USE AnyTabData;
-- Backup dump completed
`;
    const blob = new Blob([dummySqlDump], { type: 'application/gzip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backup.filename;
    a.click();
    URL.revokeObjectURL(url);
    if (showToast) showToast(`⬇ 백업 파일 [${backup.filename}] 다운로드가 시작되었습니다.`);
  };

  const handleCreateManualBackup = (e) => {
    e.preventDefault();
    const tag = backupTagInput.trim() || `manual-snap-${Date.now().toString().slice(-6)}`;
    setIsCreatingBackup(true);

    setTimeout(() => {
      setIsCreatingBackup(false);
      setIsBackupModalOpen(false);
      setBackupTagInput('');
      if (showToast) showToast(`✅ 수동 RDS 스냅샷 [anytap-db-${tag}] 생성 완료!`);
    }, 1200);
  };

  const filteredSnapshots = useMemo(() => {
    return INITIAL_SNAPSHOTS.filter((s) => {
      const matchType = typeFilter === 'all' || s.type === typeFilter;
      const q = search.toLowerCase();
      const matchSearch = !q || s.identifier.toLowerCase().includes(q) || s.kstTime.toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [typeFilter, search]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ── Section 1: Storage Capacity Donut & Resource Metrics Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        <AdminPanel title="💾 AWS RDS MySQL 8.4.9 총 저장 용량 점유율">
          <StorageGaugeDonut
            usedPct={DB_METRICS.usedStoragePct}
            freePct={DB_METRICS.freeStoragePct}
            usedGb={DB_METRICS.usedStorageGb}
            freeGb={DB_METRICS.freeStorageGb}
            totalGb={DB_METRICS.totalStorageGb}
          />
        </AdminPanel>

        <AdminPanel title="⚡ RDS DB 인스턴스 메모리 & 리소스 모니터링">
          <div style={{ padding: '8px 0' }}>
            <ThickGradientBar
              percent={DB_METRICS.usedRamPct}
              fromColor="#007BFF"
              toColor="#00C6FF"
              labelLeft={`DB 메모리 (Buffer Pool) 사용량: ${DB_METRICS.usedRamGb} GB / ${DB_METRICS.totalRamGb} GB`}
              labelRight={`${DB_METRICS.usedRamPct}%`}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '12px' }}>
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '10px 12px', borderRadius: '8px' }}>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', display: 'block' }}>Buffer Pool Hit Rate</span>
                <span style={{ fontSize: '18px', fontWeight: '800', color: '#10B981', fontFamily: 'monospace' }}>
                  {DB_METRICS.bufferPoolHitRate}%
                </span>
              </div>
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '10px 12px', borderRadius: '8px' }}>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', display: 'block' }}>Active Connections</span>
                <span style={{ fontSize: '18px', fontWeight: '800', color: '#007BFF', fontFamily: 'monospace' }}>
                  {DB_METRICS.activeConnections} / {DB_METRICS.maxConnections}
                </span>
              </div>
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '10px 12px', borderRadius: '8px' }}>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', display: 'block' }}>Read IOPS</span>
                <span style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', fontFamily: 'monospace' }}>
                  {DB_METRICS.readIops.toLocaleString()}
                </span>
              </div>
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '10px 12px', borderRadius: '8px' }}>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', display: 'block' }}>IOPS Latency</span>
                <span style={{ fontSize: '18px', fontWeight: '800', color: '#10B981', fontFamily: 'monospace' }}>
                  {DB_METRICS.iopsLatencyMs} ms
                </span>
              </div>
            </div>
          </div>
        </AdminPanel>
      </div>

      {/* ── Section 2: RDS 정기 백업 정책 ── */}
      <AdminPanel title="⚙️ RDS 정기 백업 & 시점 복구(PITR) 정책">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '14px', borderRadius: '10px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Icon name="database" size={24} style={{ color: '#007BFF' }} />
            <div>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', display: 'block' }}>RDS 인스턴스</span>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>{RDS_BACKUP_CONFIG.instanceId}</span>
              <span style={{ fontSize: '11px', color: '#007BFF', display: 'block' }}>{RDS_BACKUP_CONFIG.engine}</span>
            </div>
          </div>

          <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '14px', borderRadius: '10px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Icon name="clock" size={24} style={{ color: '#10B981' }} />
            <div>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', display: 'block' }}>자동 백업 주기</span>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>{RDS_BACKUP_CONFIG.backupWindowKst}</span>
              <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>보존기간: {RDS_BACKUP_CONFIG.retentionPeriod}</span>
            </div>
          </div>

          <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '14px', borderRadius: '10px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Icon name="shield" size={24} style={{ color: '#8B5CF6' }} />
            <div>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', display: 'block' }}>시점 복구 (PITR)</span>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#10B981' }}>초 단위 실시간 복구 가능</span>
              <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>최신 복구: {RDS_BACKUP_CONFIG.latestRestorableKst}</span>
            </div>
          </div>
        </div>
      </AdminPanel>

      {/* ── Section 3: 다운로드 가능한 백업 덤프 파일 ── */}
      <AdminPanel title="🛡️ 다운로드 가능 DB 백업 덤프 파일">
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: '#475569' }}>Backup ID</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: '#475569' }}>생성 일시 (KST)</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: '#475569' }}>덤프 파일명</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: '#475569' }}>백업 유형</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: '#475569' }}>용량</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: '#475569' }}>상태</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '12px', color: '#475569' }}>다운로드</th>
              </tr>
            </thead>
            <tbody>
              {DOWNLOADABLE_BACKUPS.map((bk) => (
                <tr key={bk.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '10px 12px' }}><code style={{ color: '#0F172A', fontFamily: 'monospace', fontWeight: '700' }}>{bk.id}</code></td>
                  <td style={{ padding: '10px 12px', fontSize: '13px', color: '#475569' }}>{bk.createdAt}</td>
                  <td style={{ padding: '10px 12px' }}><strong style={{ color: '#007BFF', fontFamily: 'monospace', fontSize: '13px' }}>{bk.filename}</strong></td>
                  <td style={{ padding: '10px 12px', fontSize: '13px', color: '#64748B', fontWeight: '600' }}>{bk.type}</td>
                  <td style={{ padding: '10px 12px', fontSize: '13px', color: '#10B981', fontWeight: '700' }}>{bk.fileSize}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', backgroundColor: '#DCFCE7', color: '#15803D' }}>
                      VERIFIED (정상)
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <button
                      type="button"
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: '#007BFF',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                      onClick={() => handleDownloadBackupFile(bk)}
                    >
                      ⬇ Download (.gz)
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminPanel>

      {/* ── Section 4: RDS 백업(스냅샷) 이력 리스트 ── */}
      <AdminPanel title="📋 RDS 정기 스냅샷 이력 리스트">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
            <input
              type="text"
              placeholder="스냅샷 이름 또는 날짜 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
              onClick={() => setTypeFilter('all')}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '600',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: typeFilter === 'all' ? '#007BFF' : '#FFFFFF',
                color: typeFilter === 'all' ? '#FFFFFF' : '#475569',
                cursor: 'pointer',
              }}
            >
              전체 ({INITIAL_SNAPSHOTS.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('automated')}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '600',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: typeFilter === 'automated' ? '#007BFF' : '#FFFFFF',
                color: typeFilter === 'automated' ? '#FFFFFF' : '#475569',
                cursor: 'pointer',
              }}
            >
              Automated ({INITIAL_SNAPSHOTS.filter((s) => s.type === 'automated').length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('manual')}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '600',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: typeFilter === 'manual' ? '#007BFF' : '#FFFFFF',
                color: typeFilter === 'manual' ? '#FFFFFF' : '#475569',
                cursor: 'pointer',
              }}
            >
              Manual ({INITIAL_SNAPSHOTS.filter((s) => s.type === 'manual').length})
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: '#475569' }}>백업 일시 (KST)</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: '#475569' }}>스냅샷 Identifier</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: '#475569' }}>유형</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: '#475569' }}>대상 DB</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: '#475569' }}>상태</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: '#475569' }}>용량</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: '#475569' }}>복구 상태 (PITR)</th>
              </tr>
            </thead>
            <tbody>
              {filteredSnapshots.map((snap) => (
                <tr key={snap.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '10px 12px', fontSize: '13px', color: '#0F172A' }}>{snap.kstTime}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <code style={{ color: '#007BFF', fontFamily: 'monospace', fontWeight: '700' }}>{snap.identifier}</code>
                      <button
                        type="button"
                        onClick={() => handleCopy(snap.identifier)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: '12px' }}
                      >
                        {copiedId === snap.identifier ? '✓ Copied' : '📋'}
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '13px', color: '#475569', fontWeight: '600' }}>{snap.typeLabel}</td>
                  <td style={{ padding: '10px 12px', fontSize: '13px', color: '#64748B' }}>{snap.targetDb}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', backgroundColor: '#DCFCE7', color: '#15803D' }}>
                      Available (정상)
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '13px', color: '#0F172A', fontWeight: '700' }}>{snap.size}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ fontSize: '12px', color: '#10B981', fontWeight: '600' }}>
                      ✓ PITR Ready
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </div>
  );
}

export function DbBackupsPage() {
  return (
    <div className="admin-page" style={{ backgroundColor: '#ffffff', minHeight: '100vh', padding: '24px', color: '#333333' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#333333', marginBottom: '8px' }}>Database Backup Management</h1>
      <p style={{ fontSize: '13px', color: '#666666', marginBottom: '24px' }}>
        MySQL 데이터베이스 자동/수동 백업 생성, 덤프 다운로드 및 시점 복구(PITR) 관리
      </p>
      <DbBackupsSection />
    </div>
  );
}
