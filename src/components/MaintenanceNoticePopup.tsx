import { useCallback, useEffect, useId, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ShieldCheck, WarningCircle, CheckCircle, X } from '@phosphor-icons/react';
import {
  MAINTENANCE_NOTICE,
  FORCE_MAINTENANCE_NOTICE,
} from '../lib/maintenance-notice.ts';
import { API_BASE_URL } from '../lib/api/config.js';
import { forceLogoutAndRedirect } from '../lib/api/httpClient.js';
import { setServerDownState } from '../lib/server-health.ts';
import '../styles/maintenance-notice.css';

function isTargetNoticePage(pathname: string): boolean {
  return pathname === '/';
}

export function MaintenanceNoticePopup() {
  const location = useLocation();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Check server health to auto-detect shutdown
  const checkServerStatus = useCallback(async () => {
    if (FORCE_MAINTENANCE_NOTICE) {
      setOpen(true);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      // Light probe: POST to check auth/session or health endpoint
      const targetUrl = API_BASE_URL ? `${API_BASE_URL}/auth/session` : '/api/v1/auth/session';
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // Check server response:
      // - 200 OK or 401 Unauthorized (session check normal response) -> Server is UP & ALIVE!
      // - 500 (Vite proxy fail), 502/503/504 (Gateway / ALB down) -> Server is DOWN!
      const isAlive = res.ok || res.status === 401;

      if (!isAlive) {
        console.warn(`[MaintenanceNotice] Backend probe returned HTTP ${res.status}. Server is down.`);
        setServerDownState(true);
        forceLogoutAndRedirect('server_unreachable');
        if (location.pathname === '/') {
          setOpen(true);
        }
      } else {
        // Server is ALIVE!
        setServerDownState(false);
        setOpen(false);
      }
    } catch (err) {
      // Network failure / connection refused / timeout -> Backend EC2 is completely down
      console.warn('[MaintenanceNotice] Backend unreachable (network/timeout). Triggering maintenance popup.', err);
      setServerDownState(true);
      forceLogoutAndRedirect('server_unreachable');
      if (location.pathname === '/') {
        setOpen(true);
      }
    }
  }, [location.pathname]);

  useEffect(() => {
    checkServerStatus();

    // Re-check periodically every 15 seconds
    const interval = setInterval(checkServerStatus, 15000);
    return () => clearInterval(interval);
  }, [location.pathname, isDismissed, checkServerStatus]);

  const close = useCallback(() => {
    setOpen(false);
    setIsDismissed(true);
    document.body.style.removeProperty('overflow');
    document.documentElement.style.removeProperty('overflow');
  }, []);

  useEffect(() => {
    if (!open) {
      document.body.style.removeProperty('overflow');
      document.documentElement.style.removeProperty('overflow');
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.removeProperty('overflow');
      document.documentElement.style.removeProperty('overflow');
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  if (!open || isDismissed || !isTargetNoticePage(location.pathname)) return null;

  const notice = MAINTENANCE_NOTICE;

  return (
    <div className="maint-notice-backdrop" role="presentation">
      <div
        className="maint-notice"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button
          type="button"
          className="maint-notice__close"
          aria-label="Close"
          onClick={close}
        >
          <X size={18} weight="bold" />
        </button>

        <div className="maint-notice__badge">
          <ShieldCheck size={16} weight="fill" className="maint-notice__badge-icon" />
          <span>{notice.badge}</span>
        </div>

        <h2 className="maint-notice__title" id={titleId}>
          {notice.title}
        </h2>

        <p className="maint-notice__greeting">{notice.greeting}</p>
        <p className="maint-notice__lead">{notice.lead}</p>

        <div className="maint-notice__content-card">
          {notice.sections.map((sec, idx) => (
            <div key={idx} className={`maint-notice__section is-${sec.tone}`}>
              <div className="maint-notice__section-header">
                {sec.tone === 'ok' ? (
                  <CheckCircle size={18} weight="fill" className="maint-notice__sec-icon text-success" />
                ) : (
                  <WarningCircle size={18} weight="fill" className="maint-notice__sec-icon text-warning" />
                )}
                <h3 className="maint-notice__section-title">{sec.title}</h3>
              </div>

              {sec.description && (
                <p className="maint-notice__section-desc">{sec.description}</p>
              )}

              {sec.points && (
                <ul className="maint-notice__points">
                  {sec.points.map((pt, pIdx) => (
                    <li key={pIdx}>
                      <span className="maint-notice__bullet">•</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <p className="maint-notice__closing">{notice.closing}</p>
        <p className="maint-notice__support">{notice.support}</p>
        <p className="maint-notice__team">
          Thank you.<br />
          <strong>{notice.team}</strong>
        </p>

        <button
          type="button"
          className="btn btn--accent maint-notice__cta"
          onClick={close}
        >
          {notice.cta}
        </button>
      </div>
    </div>
  );
}
