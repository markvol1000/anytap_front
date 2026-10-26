import React, { useEffect, useState } from 'react';
import { Icon } from '../../components/ui.jsx';
import { apiPost } from '../../lib/api/httpClient.js';
import { useAdminRefresh } from '../context/AdminRefreshContext.jsx';

export function BatchSchedulersPage() {
  const [schedulers, setSchedulers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const { registerRefreshHandler } = useAdminRefresh();

  const fetchSchedulers = async () => {
    try {
      setLoading(true);
      const res = await apiPost('/admin/schedulers/list', {});
      const list = Array.isArray(res) ? res : (res?.data && Array.isArray(res.data) ? res.data : []);
      setSchedulers(list);
    } catch (err) {
      console.error('[BatchSchedulersPage] Failed to fetch schedulers:', err);
      setActionMessage({ type: 'error', text: 'Failed to load batch schedulers from server.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedulers();
    if (typeof registerRefreshHandler === 'function') {
      registerRefreshHandler(fetchSchedulers);
    }
  }, []);

  // 1. Run Now Action
  const handleRunNow = async (schedulerId, schedulerName) => {
    if (!schedulerId || actionLoadingId) return;
    try {
      setActionLoadingId(`run_${schedulerId}`);
      setActionMessage(null);
      const res = await apiPost('/admin/schedulers/run', { schedulerId });
      const msg = res?.message || res?.data?.message || `Successfully executed ${schedulerName}.`;
      setActionMessage({ type: 'success', text: msg });
      await fetchSchedulers();
    } catch (err) {
      console.error(`[BatchSchedulersPage] Failed to run scheduler ${schedulerId}:`, err);
      setActionMessage({ type: 'error', text: err?.message || 'Execution request failed. Check server logs.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // 2. Toggle Action (START / STOPPED segmented toggle switch)
  const handleToggleState = async (schedulerId, schedulerName, targetEnabled) => {
    if (!schedulerId || actionLoadingId) return;
    const currentScheduler = schedulers.find((s) => s.id === schedulerId);
    if (!currentScheduler || currentScheduler.enabled === targetEnabled) return;

    // Optimistically update local state immediately
    setSchedulers((prev) =>
      prev.map((s) => (s.id === schedulerId ? { ...s, enabled: targetEnabled } : s))
    );

    try {
      setActionLoadingId(`toggle_${schedulerId}`);
      setActionMessage(null);
      const res = await apiPost('/admin/schedulers/toggle', {
        schedulerId,
        enabled: targetEnabled,
      });

      const msg = res?.message || res?.data?.message || `${schedulerName} is now ${targetEnabled ? 'START' : 'STOPPED'}.`;
      setActionMessage({ type: 'success', text: msg });
      await fetchSchedulers();
    } catch (err) {
      console.error(`[BatchSchedulersPage] Failed to toggle scheduler ${schedulerId}:`, err);
      // Rollback on error
      setSchedulers((prev) =>
        prev.map((s) => (s.id === schedulerId ? { ...s, enabled: !targetEnabled } : s))
      );
      setActionMessage({ type: 'error', text: err?.message || 'Failed to toggle scheduler state.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="admin-page">
      <style>{`
        @keyframes pulseDot {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes spinIcon {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .pulse-active-dot {
          animation: pulseDot 1.4s ease-in-out infinite;
        }
        .spin-loading-icon {
          animation: spinIcon 1s linear infinite;
        }
        .segmented-toggle {
          display: inline-flex;
          align-items: center;
          background: #090d16;
          border: 1px solid #334155;
          border-radius: 8px;
          padding: 3px;
          gap: 2px;
        }
        .segmented-btn {
          padding: 6px 14px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.5px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          background: transparent;
          color: #64748b;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .segmented-btn:hover:not(:disabled) {
          color: #cbd5e1;
        }
        .segmented-btn.is-active-start {
          background: #10b981;
          color: #ffffff;
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.35);
        }
        .segmented-btn.is-active-stopped {
          background: #dc2626;
          color: #ffffff;
          box-shadow: 0 0 10px rgba(220, 38, 38, 0.35);
        }
      `}</style>

      <div className="admin-page__header">
        <div>
          <h1 className="admin-page__title">Batch & Background Schedulers</h1>
          <p className="admin-page__subtitle">
            Manage background cron operations: START / STOPPED toggle switch and manual NOW execution.
          </p>
        </div>
        <button
          type="button"
          className="admin-btn admin-btn--secondary"
          onClick={fetchSchedulers}
          disabled={loading || actionLoadingId !== null}
        >
          <Icon name="refresh" size={16} />
          <span>Refresh</span>
        </button>
      </div>

      {actionMessage && (
        <div
          style={{
            marginBottom: '20px',
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${actionMessage.type === 'success' ? '#10b981' : '#ef4444'}`,
            color: actionMessage.type === 'success' ? '#34d399' : '#f87171',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px',
          }}
        >
          <span>{actionMessage.text}</span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {loading && schedulers.length === 0 ? (
        <div className="admin-card" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
          <p>Loading registered schedulers...</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {schedulers.map((item) => {
            const isToggling = actionLoadingId === `toggle_${item.id}`;
            const isRunningNow = actionLoadingId === `run_${item.id}`;
            const isEnabled = Boolean(item.enabled);

            return (
              <div
                key={item.id}
                className="admin-card"
                style={{
                  padding: '24px',
                  borderRadius: '12px',
                  border: `1px solid ${isEnabled ? '#3b82f6' : '#334155'}`,
                  background: isEnabled ? '#1e293b' : '#0f172a',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  transition: 'all 0.25s ease',
                  boxShadow: isEnabled ? '0 4px 20px rgba(59, 130, 246, 0.08)' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ flex: 1, minWidth: '260px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#f8fafc', margin: 0 }}>
                        {item.name}
                      </h2>

                      {/* Status indicator: IN PROGRESS (pulsing dot) or '-' */}
                      {isEnabled ? (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: 'rgba(16, 185, 129, 0.2)',
                            color: '#34d399',
                            border: '1px solid #10b981',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            letterSpacing: '0.5px',
                          }}
                        >
                          <span
                            className="pulse-active-dot"
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              background: '#10b981',
                              boxShadow: '0 0 8px #10b981',
                            }}
                          />
                          IN PROGRESS
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: '700',
                            padding: '2px 8px',
                            color: '#64748b',
                            letterSpacing: '1px',
                          }}
                        >
                          —
                        </span>
                      )}
                    </div>

                    <p style={{ fontSize: '13px', color: '#94a3b8', margin: '6px 0 0 0' }}>
                      {item.description}
                    </p>
                  </div>

                  {/* Right side: Segmented Toggle Switch (STOPPED / START) + NOW Button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* START / STOPPED Segmented Toggle Switch */}
                    <div className="segmented-toggle">
                      <button
                        type="button"
                        className={`segmented-btn ${!isEnabled ? 'is-active-stopped' : ''}`}
                        onClick={() => handleToggleState(item.id, item.name, false)}
                        disabled={isToggling || isRunningNow}
                      >
                        STOPPED
                      </button>

                      <button
                        type="button"
                        className={`segmented-btn ${isEnabled ? 'is-active-start' : ''}`}
                        onClick={() => handleToggleState(item.id, item.name, true)}
                        disabled={isToggling || isRunningNow}
                      >
                        {isToggling && isEnabled ? (
                          <span className="spin-loading-icon"><Icon name="refresh" size={12} /></span>
                        ) : null}
                        START
                      </button>
                    </div>

                    {/* NOW (MANUAL RUN) BUTTON */}
                    <button
                      type="button"
                      className="admin-btn admin-btn--primary"
                      onClick={() => handleRunNow(item.id, item.name)}
                      disabled={isToggling || isRunningNow}
                      style={{ minWidth: '85px', fontWeight: '600' }}
                      title="Trigger 1-time immediate execution right now"
                    >
                      <Icon name={isRunningNow ? 'refresh' : 'play'} size={13} className={isRunningNow ? 'spin-loading-icon' : ''} />
                      <span>{isRunningNow ? 'Running...' : 'NOW'}</span>
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '12px',
                    padding: '16px',
                    borderRadius: '8px',
                    background: '#090d16',
                    border: '1px solid #1e293b',
                    fontSize: '13px',
                  }}
                >
                  <div>
                    <span style={{ color: '#64748b', display: 'block', marginBottom: '4px', fontSize: '11px', textTransform: 'uppercase' }}>
                      Interval / Schedule
                    </span>
                    <strong style={{ color: isEnabled ? '#38bdf8' : '#64748b' }}>{item.intervalDescription}</strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', display: 'block', marginBottom: '4px', fontSize: '11px', textTransform: 'uppercase' }}>
                      Cron Expression
                    </span>
                    <code style={{ background: '#1e293b', padding: '2px 6px', borderRadius: '4px', color: '#e2e8f0' }}>
                      {item.cronExpression}
                    </code>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', display: 'block', marginBottom: '4px', fontSize: '11px', textTransform: 'uppercase' }}>
                      Target / Channel
                    </span>
                    <span style={{ color: '#e2e8f0' }}>{item.targetInfo || 'System Internal'}</span>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', display: 'block', marginBottom: '4px', fontSize: '11px', textTransform: 'uppercase' }}>
                      Last Execution Status
                    </span>
                    <span style={{ color: item.lastExecutionResult?.includes('FAIL') ? '#f87171' : '#34d399', fontWeight: '500' }}>
                      {item.lastExecutionResult || 'Never'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
