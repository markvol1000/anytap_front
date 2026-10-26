import { useState, useEffect, useCallback } from 'react';
import { getWafReport } from '../services/adminService.js';
import { Icon } from '../../components/ui.jsx';

export function WafSecurityReport({ onQuickBan }) {
  const [hours, setHours] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  const fetchReport = useCallback(async (selectedHours) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getWafReport(selectedHours);
      setReport(data);
      setLastFetched(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('[WafSecurityReport] Fetch failed:', err);
      setError(err?.message || 'Failed to retrieve AWS WAF report.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(hours);
  }, [hours, fetchReport]);

  const summary = report?.summary || {};
  const rules = report?.rules || [];
  const countries = report?.countries || [];
  const topIps = report?.topIps || [];
  const topUris = report?.topUris || [];
  const isPrd = summary.environment === 'PRD' || summary.wafEnabled === true;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Controls Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '12px 18px',
          backgroundColor: '#ffffff',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 4,
              backgroundColor: isPrd ? '#dcfce7' : '#fef3c7',
              color: isPrd ? '#15803d' : '#b45309',
              border: `1px solid ${isPrd ? '#bbf7d0' : '#fde68a'}`,
              letterSpacing: '0.02em',
            }}
          >
            {summary.environment ? `${summary.environment} ${isPrd ? 'LIVE WAF' : 'STANDBY'}` : 'WAF'}
          </span>

          <span style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginLeft: 4 }}>
            Time Range:
          </span>
          {[3, 6, 24, 72].map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setHours(h)}
              disabled={loading}
              style={{
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                cursor: loading ? 'not-allowed' : 'pointer',
                border: hours === h ? '1px solid #2563eb' : '1px solid #cbd5e1',
                backgroundColor: hours === h ? '#eff6ff' : '#ffffff',
                color: hours === h ? '#1d4ed8' : '#64748b',
                transition: 'all 0.15s ease',
              }}
            >
              Last {h} Hours
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lastFetched && (
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              Updated at {lastFetched}
            </span>
          )}
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={() => fetchReport(hours)}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
          >
            <Icon name="refresh" size={14} className={loading ? 'admin-spin' : ''} />
            <span>{loading ? 'Refreshing...' : 'Refresh Report'}</span>
          </button>
        </div>
      </div>

      {/* Development Environment Standby Banner */}
      {!isPrd && summary.wafEnabled === false && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: 8,
            backgroundColor: '#f8fafc',
            border: '1px solid #cbd5e1',
            color: '#334155',
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>
            ℹ️ Development Environment Notice
          </div>
          <div>
            AWS WAF perimeter protection is actively attached exclusively to the <strong>Production ALB (AnyTap-ALB)</strong>.
            The Development server operates on a dedicated standalone instance without an attached WAF, so dev metrics remain in standby.
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: 8,
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => fetchReport(hours)}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 600,
              backgroundColor: '#b91c1c',
              color: '#ffffff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 16,
        }}
      >
        <div
          style={{
            padding: 18,
            backgroundColor: '#ffffff',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            borderLeft: `4px solid ${isPrd ? '#ef4444' : '#94a3b8'}`,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            Total Blocked Events
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', marginTop: 6 }}>
            {loading ? '...' : (summary.totalBlocked ?? 0).toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: isPrd ? '#ef4444' : '#94a3b8', marginTop: 4, fontWeight: 500 }}>
            {isPrd ? 'Active Perimeter Defense' : 'Dev Standby'}
          </div>
        </div>

        <div
          style={{
            padding: 18,
            backgroundColor: '#ffffff',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            borderLeft: `4px solid ${isPrd ? '#3b82f6' : '#94a3b8'}`,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            Unique Attacker IPs
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', marginTop: 6 }}>
            {loading ? '...' : (summary.uniqueAttackerIps ?? 0).toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            In past {summary.hours || hours} hours
          </div>
        </div>

        <div
          style={{
            padding: 18,
            backgroundColor: '#ffffff',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            borderLeft: `4px solid ${isPrd ? '#10b981' : '#94a3b8'}`,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            Top Terminating Rule
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#0f172a',
              marginTop: 6,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={summary.topRule || '—'}
          >
            {loading ? '...' : (summary.topRule || '—')}
          </div>
          <div style={{ fontSize: 12, color: isPrd ? '#10b981' : '#94a3b8', marginTop: 4, fontWeight: 500 }}>
            {isPrd ? 'Highest Match Rule' : 'No Dev WAF'}
          </div>
        </div>

        <div
          style={{
            padding: 18,
            backgroundColor: '#ffffff',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            borderLeft: `4px solid ${isPrd ? '#f59e0b' : '#94a3b8'}`,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            Top Origin Country
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', marginTop: 6 }}>
            {loading ? '...' : (summary.topCountry || '—')}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            {isPrd ? 'Most frequent scan origin' : 'Standalone instance'}
          </div>
        </div>
      </div>

      {/* Main Grid: Attacker IPs & Breakdowns */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
          gap: 20,
        }}
      >
        {/* Left: Top Attacker IPs Table */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                Top Attacking / Scanner IPs
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                Identified source addresses blocked by AWS WAF
              </div>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 4,
                backgroundColor: '#f1f5f9',
                color: '#475569',
              }}
            >
              {topIps.length} Targets
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 600, color: '#475569' }}>IP Address</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, color: '#475569' }}>Geo</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, color: '#475569' }}>Target URI</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, color: '#475569' }}>Terminating Rule</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Hits</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {topIps.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                      {loading ? 'Loading WAF records...' : (isPrd ? 'No attacker records found.' : 'Development server has no attached WAF.')}
                    </td>
                  </tr>
                ) : (
                  topIps.map((item, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s',
                      }}
                    >
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                        {item.clientIp}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 4,
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            border: '1px solid #bae6fd',
                          }}
                        >
                          {item.country || '—'}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '10px 14px',
                          fontFamily: 'monospace',
                          color: '#64748b',
                          maxWidth: 140,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={item.uri}
                      >
                        {item.uri}
                      </td>
                      <td
                        style={{
                          padding: '10px 14px',
                          maxWidth: 180,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          color: '#334155',
                        }}
                        title={item.rule}
                      >
                        {item.rule}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>
                        {item.count}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => onQuickBan && onQuickBan(item.clientIp, `AWS WAF Blocked: ${item.rule}`)}
                          style={{
                            padding: '4px 8px',
                            fontSize: 11,
                            fontWeight: 600,
                            borderRadius: 4,
                            border: '1px solid #fca5a5',
                            backgroundColor: '#fef2f2',
                            color: '#dc2626',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                          title="Add this IP to system blacklist"
                        >
                          + Ban IP
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Breakdowns */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Rule Breakdown Card */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              padding: '16px 18px',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>
              Terminating Rule Distribution
            </div>
            {rules.length === 0 ? (
              <div style={{ fontSize: 12, color: '#94a3b8', padding: '12px 0' }}>
                {loading ? 'Loading...' : (isPrd ? 'No rules data.' : 'No WAF rules active on Dev.')}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {rules.map((r, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: '#334155' }}>{r.rule}</span>
                      <span style={{ color: '#64748b' }}>
                        <strong>{r.count}</strong> ({r.percentage}%)
                      </span>
                    </div>
                    <div style={{ width: '100%', height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.min(100, r.percentage || 0)}%`,
                          height: '100%',
                          backgroundColor: i === 0 ? '#ef4444' : i === 1 ? '#f59e0b' : '#3b82f6',
                          borderRadius: 3,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Targeted URIs Card */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              padding: '16px 18px',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>
              Most Targeted URIs / Vulnerability Probes
            </div>
            {topUris.length === 0 ? (
              <div style={{ fontSize: 12, color: '#94a3b8', padding: '12px 0' }}>
                {loading ? 'Loading...' : (isPrd ? 'No URI probe data.' : 'No URI probe data on Dev.')}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {topUris.map((u, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      backgroundColor: '#f8fafc',
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  >
                    <span style={{ fontFamily: 'monospace', color: '#1e293b', fontWeight: 600 }}>
                      {u.uri}
                    </span>
                    <span style={{ fontWeight: 700, color: '#dc2626' }}>
                      {u.count} hits
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Source Countries Card */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              padding: '16px 18px',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>
              Top Attack Origin Countries
            </div>
            {countries.length === 0 ? (
              <div style={{ fontSize: 12, color: '#94a3b8', padding: '12px 0' }}>
                {loading ? 'Loading...' : (isPrd ? 'No country data.' : 'No country data on Dev.')}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {countries.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      backgroundColor: '#f8fafc',
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  >
                    <span style={{ fontWeight: 700, color: '#0369a1' }}>
                      {c.country}
                    </span>
                    <span style={{ color: '#475569' }}>
                      {c.count} ({c.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
