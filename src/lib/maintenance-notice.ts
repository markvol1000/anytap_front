/** Scheduled system maintenance notice (2026-09-12). */

export const MAINTENANCE_NOTICE_ID = '2026-09-12';

/** UTC window from the published notice. */
export const MAINTENANCE_START_UTC = Date.parse('2026-09-11T23:00:00.000Z');
export const MAINTENANCE_END_UTC = Date.parse('2026-09-12T03:00:00.000Z');

export const MAINTENANCE_STORAGE_KEY = `anytap_maintenance_dismissed:${MAINTENANCE_NOTICE_ID}`;

export const MAINTENANCE_NOTICE = {
  id: MAINTENANCE_NOTICE_ID,
  title: 'Scheduled System Maintenance',
  subtitle: 'Anytap will undergo scheduled maintenance to improve service stability.',
  scheduleLabel: 'Maintenance Schedule',
  regions: [
    {
      region: '🇰🇷🇯🇵 Korea / Japan',
      time: 'Sept 12, 08:00–12:00 (KST/JST)',
    },
    {
      region: '🇸🇬🇭🇰 Singapore / Hong Kong',
      time: 'Sept 12, 07:00–11:00 (SGT/HKT)',
    },
    {
      region: '🇻🇳🇮🇩 Vietnam / Indonesia',
      time: 'Sept 12, 06:00–10:00 (ICT/WIB)',
    },
  ],
  utcReference: 'Reference: 2026/09/11 23:00 – 2026/09/12 03:00 (UTC)',
  notes: [
    { tone: 'ok' as const, text: 'Your card will remain usable for payments during this time.' },
    { tone: 'warn' as const, text: 'You will not be able to log in to the Anytap app during the maintenance window.' },
    { tone: 'warn' as const, text: 'Top-up, transfers, and balance updates may be temporarily unavailable.' },
  ],
  apology: 'We apologize for any inconvenience and appreciate your understanding.',
  cta: 'Got it',
};

/** 공지 팝업 비활성화 (종료) */
export function isMaintenanceNoticeActive(_now = Date.now()): boolean {
  return false;
}

export function shouldShowMaintenanceNotice(now = Date.now()): boolean {
  if (typeof window === 'undefined') return false;
  return isMaintenanceNoticeActive(now);
}
