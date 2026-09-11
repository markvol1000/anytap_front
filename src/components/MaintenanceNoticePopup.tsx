import { useCallback, useEffect, useId, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ClockIcon } from '@phosphor-icons/react';
import { Icon } from './ui.jsx';
import {
  MAINTENANCE_NOTICE,
  shouldShowMaintenanceNotice,
} from '../lib/maintenance-notice.ts';
import '../styles/maintenance-notice.css';

function isTargetNoticePage(pathname: string): boolean {
  return pathname === '/' || pathname === '/login';
}

export function MaintenanceNoticePopup() {
  const location = useLocation();
  const titleId = useId();
  const [open, setOpen] = useState(
    () => isTargetNoticePage(location.pathname) && shouldShowMaintenanceNotice(),
  );

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  // 기존에 브라우저 localStorage에 남아있던 영구 닫힘 키 정리
  useEffect(() => {
    try {
      localStorage.removeItem('anytap_maintenance_dismissed:2026-09-12');
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    if (isTargetNoticePage(location.pathname) && shouldShowMaintenanceNotice()) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  if (!open || !isTargetNoticePage(location.pathname)) return null;

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
          <Icon name="close" size={16} stroke={2} />
        </button>

        <div className="maint-notice__icon" aria-hidden="true">
          <ClockIcon size={28} weight="duotone" />
        </div>
        <h2 className="maint-notice__title" id={titleId}>
          {notice.title}
        </h2>
        <p className="maint-notice__subtitle">{notice.subtitle}</p>

        <div className="maint-notice__schedule">
          <div className="maint-notice__schedule-label">{notice.scheduleLabel}</div>
          {notice.regions.map((row) => (
            <div className="maint-notice__schedule-row" key={row.region}>
              <span className="maint-notice__region">{row.region}</span>
              <span className="maint-notice__time">{row.time}</span>
            </div>
          ))}
          <p className="maint-notice__ref">{notice.utcReference}</p>
        </div>

        <ul className="maint-notice__notes">
          {notice.notes.map((note) => (
            <li key={note.text} className={note.tone === 'ok' ? 'is-ok' : 'is-warn'}>
              <span className="maint-notice__mark" aria-hidden="true">
                {note.tone === 'ok' ? '✓' : '!'}
              </span>
              <span>{note.text}</span>
            </li>
          ))}
        </ul>

        <p className="maint-notice__apology">{notice.apology}</p>

        <button type="button" className="btn btn--accent maint-notice__cta" onClick={close}>
          {notice.cta}
        </button>
      </div>
    </div>
  );
}
