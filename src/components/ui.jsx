import { Fragment } from 'react';
import logoUrl from '/assets/anytap-logo.png';
import { useHeroCardFloat } from '../hooks/useHeroCardFloat.js';
import { resolveFeatureIcon } from '../utils/feature-icons.js';

const HERO_CARDS = {
  light: '/assets/cards/white_card.png',
  dark: '/assets/cards/black_card.png',
};
function Logo({ inverse = false, height = 28 }) {
  const src = logoUrl;
  return (
    <img
      src={src}
      alt="Anytap"
      className={`brand-logo${inverse ? " brand-logo--inverse" : ""}`}
      style={{ height, width: "auto", display: "block" }} />
  );
}

// ─────────────── Tiny icons ───────────────
// Icon builders defined outside component — not recreated on every render
const ICON_BUILDERS = {
  arrowRight:  (p) => <svg {...p}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>,
  arrowUp:     (p) => <svg {...p}><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>,
  arrowUpRight:(p) => <svg {...p}><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>,
  plus:        (p) => <svg {...p}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  check:       (p) => <svg {...p}><polyline points="20 6 9 17 4 12" /></svg>,
  creditCard:  (p) => <svg {...p}><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>,
  globe:       (p) => <svg {...p}><circle cx="12" cy="12" r="9" /><line x1="3" y1="12" x2="21" y2="12" /><path d="M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>,
  zap:         (p) => <svg {...p}><path d="M13 2 4 14h7l-1 8 10-12h-7l0-8z" /></svg>,
  shield:      (p) => <svg {...p}><path d="M12 2 4.5 5.3V12c0 5.2 3.8 8.7 7.5 10 3.7-1.3 7.5-4.8 7.5-10V5.3L12 2z" /><path d="M9 12.2l2 2L15.5 9.7" /></svg>,
  store:       (p) => <svg {...p}><path d="M3 7l1.5-3h15L21 7" /><path d="M3 7v13h18V7" /><path d="M9 21v-6h6v6" /><path d="M3 7c0 2 1.5 3 3 3s3-1 3-3" /><path d="M9 7c0 2 1.5 3 3 3s3-1 3-3" /><path d="M15 7c0 2 1.5 3 3 3s3-1 3-3" /></svg>,
  swap:        (p) => <svg {...p}><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>,
  api:         (p) => <svg {...p}><path d="M6 9l-3 3 3 3" /><path d="M18 9l3 3-3 3" /><line x1="14" y1="4" x2="10" y2="20" /></svg>,
  lock:        (p) => <svg {...p}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>,
  lockOpen:    (p) => <svg {...p}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M16 11V7a4 4 0 0 0-7.2-2.4" /></svg>,
  wallet:      (p) => <svg {...p}><path d="M21 7H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16v-7" /><path d="M21 11h-4a2 2 0 0 0 0 4h4" /><path d="M16 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2" /></svg>,
  chart:       (p) => <svg {...p}><polyline points="3 17 9 11 13 15 21 7" /><polyline points="14 7 21 7 21 14" /></svg>,
  receipt:     (p) => <svg {...p}><path d="M5 3v18l3-2 3 2 3-2 3 2 3-2V3" /><line x1="9" y1="9" x2="15" y2="9" /><line x1="9" y1="13" x2="15" y2="13" /></svg>,
  chevron:     (p) => <svg {...p}><polyline points="9 6 15 12 9 18" /></svg>,
  chevronLeft: (p) => <svg {...p}><polyline points="15 6 9 12 15 18" /></svg>,
  chevronDown: (p) => <svg {...p}><path d="M7.5 10l4.5 4.5L16.5 10" /></svg>,
  copy:        (p) => <svg {...p}><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>,
  share:       (p) => <svg {...p}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>,
  download:    (p) => <svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
  flag:        (p) => <svg {...p}><path d="M4 21V4h12l-2 4 2 4H4" /></svg>,
  list:        (p) => <svg {...p}><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>,
  menu:        (p) => <svg {...p}><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>,
  close:       (p) => <svg {...p}><line x1="5" y1="5" x2="19" y2="19" /><line x1="19" y1="5" x2="5" y2="19" /></svg>,
  checkCircle: (p) => <svg {...p}><circle cx="12" cy="12" r="9" /><polyline points="8.5 12 11 14.5 15.5 9.5" /></svg>,
  xCircle:     (p) => <svg {...p}><circle cx="12" cy="12" r="9" /><line x1="9" y1="9" x2="15" y2="15" /><line x1="15" y1="9" x2="9" y2="15" /></svg>,
  mail:        (p) => <svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><polyline points="3 7 12 13 21 7" /></svg>,
  phone:       (p) => <svg {...p}><rect x="7" y="2.5" width="10" height="19" rx="2.6" /><path d="M10 5.5h4" /><path d="M11 18.5h2" /></svg>,
  nfc:         (p) => <svg {...p}><path d="M6 8a8 8 0 0 1 0 8" /><path d="M10 6a12 12 0 0 1 0 12" /><path d="M14 4a16 16 0 0 1 0 16" /></svg>,
  code:        (p) => <svg {...p}><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>,
  layers:      (p) => <svg {...p}><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>,
  eye:         (p) => <svg {...p}><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" /></svg>,
  search:      (p) => <svg {...p}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  eyeOff:      (p) => <svg {...p}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>,
  cpu:         (p) => <svg {...p}><rect x="5" y="5" width="14" height="14" rx="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="2" x2="9" y2="5" /><line x1="15" y1="2" x2="15" y2="5" /><line x1="9" y1="19" x2="9" y2="22" /><line x1="15" y1="19" x2="15" y2="22" /><line x1="2" y1="9" x2="5" y2="9" /><line x1="2" y1="15" x2="5" y2="15" /><line x1="19" y1="9" x2="22" y2="9" /><line x1="19" y1="15" x2="22" y2="15" /></svg>,
  server:      (p) => <svg {...p}><rect x="2" y="2" width="20" height="8" rx="2" ry="2" /><rect x="2" y="14" width="20" height="8" rx="2" ry="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></svg>,
  database:    (p) => <svg {...p}><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>,
  rocket:      (p) => <svg {...p}><path d="M5 13l-2 4 4-2c1.5 2 4 3 4 3s4-1.5 6.5-4S22 5 22 2c-3 0-6.5 1-9 3.5S6.5 11.5 5 13z" /><circle cx="14" cy="9" r="1.5" /></svg>,
  coins:       (p) => <svg {...p}><circle cx="9" cy="9" r="6" /><path d="M16.5 4.3a6 6 0 0 1 0 11.4" /></svg>,
  bell:        (p) => <svg {...p}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
  users:       (p) => <svg {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /></svg>,
  gift:        (p) => <svg {...p}><polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" /><line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg>,
  trophy:      (p) => <svg {...p}><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v2a5 5 0 0 1-10 0V4z" /><path d="M5 4H3v1a3 3 0 0 0 3 3" /><path d="M19 4h2v1a3 3 0 0 1-3 3" /></svg>,
  star:        (p) => <svg {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
  clock:       (p) => <svg {...p}><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 16 14" /></svg>,
  bank:        (p) => <svg {...p}><line x1="3" y1="21" x2="21" y2="21" /><path d="M3 10l9-6 9 6" /><line x1="5" y1="10" x2="5" y2="21" /><line x1="12" y1="10" x2="12" y2="21" /><line x1="19" y1="10" x2="19" y2="21" /></svg>,
  plane:       (p) => <svg {...p}><path d="M17.8 19.2 16 11l5-5c1-1 1-3-1-3l-5 5-8.2-1.8c-.5-.1-1 .1-1.3.5-.4.6-.2 1.4.4 1.7L11 11l-3 3-2-1-1 1 3 3 3 3 1-1-1-2 3-3 3.5 6.7c.3.6 1.1.8 1.7.4.4-.3.6-.8.5-1.3z" /></svg>,
  briefcase:   (p) => <svg {...p}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>,
  home:        (p) => <svg {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" /></svg>,
  user:        (p) => <svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 20v-1a6 6 0 0 1 12 0v1" /></svg>,
  logOut:      (p) => <svg {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
  trash:       (p) => <svg {...p}><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>,
  palette:     (p) => <svg {...p}><circle cx="13.5" cy="6.5" r=".5" fill="currentColor" stroke="none" /><circle cx="17.5" cy="10.5" r=".5" fill="currentColor" stroke="none" /><circle cx="8.5" cy="7.5" r=".5" fill="currentColor" stroke="none" /><circle cx="6.5" cy="12.5" r=".5" fill="currentColor" stroke="none" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.672 0-.437-.18-.835-.437-1.184-.197-.316-.4-.638-.4-.972 0-.78.632-1.412 1.412-1.412H16c3.038 0 5.5-2.462 5.5-5.5 0-5.523-4.477-10-10-10z" /></svg>,
  messageCircle: (p) => <svg {...p}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>,
  fileText:    (p) => <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg>,
  settings:    (p) => <svg {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>,
  moreHorizontal: (p) => <svg {...p}><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>,
  qr:          (p) => <svg {...p}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="3" height="3" rx=".5" /><rect x="18" y="14" width="3" height="3" rx=".5" /><rect x="14" y="18" width="3" height="3" rx=".5" /><rect x="18" y="18" width="3" height="3" rx=".5" /></svg>,
  scan:        (p) => <svg {...p}><path d="M4 7V5a2 2 0 0 1 2-2h2" /><path d="M16 7V5a2 2 0 0 0-2-2h-2" /><path d="M4 17v2a2 2 0 0 0 2 2h2" /><path d="M16 17v2a2 2 0 0 1-2 2h-2" /><line x1="7" y1="12" x2="17" y2="12" /></svg>,
  /** Tether (USDT) brand mark */
  usdt: (p) => (
    <svg {...p} fill="none">
      <circle cx="12" cy="12" r="10" fill="#26A17B" stroke="none" />
      <path
        fill="#fff"
        stroke="none"
        d="M13.05 6.75h-2.1v1.95H9.45v1.35h1.5v5.85c-.82.11-1.4.33-1.88.66v1.34h4.86v-1.34c-.48-.33-1.06-.55-1.88-.66V10.05h1.5V8.7h-1.5V6.75zm-1.05 8.55v-4.95h2.1v4.95c.68.07 1.22.22 1.64.44.42-.22.96-.37 1.64-.44z"
      />
    </svg>
  ),
  /** USDT → Wallet (Receive) */
  usdtToWallet: (p) => (
    <svg {...p} fill="none">
      <circle cx="12" cy="6.25" r="3.25" fill="#26A17B" stroke="none" />
      <path
        fill="#fff"
        stroke="none"
        d="M12.55 5.1h-.85v.72h-.55v.52h.55v1.85c-.34.05-.58.14-.78.27v.68h1.96v-.68c-.2-.13-.44-.22-.78-.27V6.34h.55V5.82h-.55V5.1zm-.43 2.82v-1.58h.85v1.58c.28.03.5.09.67.18.17-.09.39-.15.67-.18z"
      />
      <line x1="12" y1="10" x2="12" y2="12.25" stroke="currentColor" />
      <polyline points="10.5 11.25 12 12.75 13.5 11.25" stroke="currentColor" />
      <path d="M7.25 13.25h9.5a1.5 1.5 0 0 1 1.5 1.5v3.25a1.5 1.5 0 0 1-1.5 1.5H7.25a1.5 1.5 0 0 1-1.5-1.5v-3.25a1.5 1.5 0 0 1 1.5-1.5z" />
      <path d="M15.25 15.25h-2a.75.75 0 0 0 0 1.5h2" />
    </svg>
  ),
  /** External source → Wallet (Receive / Add funds) */
  flowExtToWallet: (p) => (
    <svg {...p}>
      <circle cx="5.5" cy="12" r="3.25" />
      <ellipse cx="5.5" cy="12" rx="3.25" ry="1.2" />
      <line x1="9.25" y1="12" x2="13" y2="12" />
      <polyline points="11.5 10.5 13 12 11.5 13.5" />
      <path d="M15.5 8.5h5.5a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5h-5.5a1.5 1.5 0 0 1-1.5-1.5v-4a1.5 1.5 0 0 1 1.5-1.5z" />
      <path d="M19.5 10.5h-2a.75.75 0 0 0 0 1.5h2" />
    </svg>
  ),
  /** Wallet → Card (Top up card) */
  flowWalletToCard: (p) => (
    <svg {...p}>
      <path d="M2.5 8.5h5a1.5 1.5 0 0 1 1.5 1.5v3.5a1.5 1.5 0 0 1-1.5 1.5h-5a1.5 1.5 0 0 1-1.5-1.5v-3.5a1.5 1.5 0 0 1 1.5-1.5z" />
      <path d="M6 10.25h-1.25a.65.65 0 0 0 0 1.3H6" />
      <line x1="10.25" y1="12" x2="13.25" y2="12" />
      <polyline points="11.75 10.5 13.25 12 11.75 13.5" />
      <rect x="15" y="9" width="7.5" height="5.5" rx="1.2" />
      <line x1="15" y1="11.25" x2="22.5" y2="11.25" />
    </svg>
  ),
  /** Wallet → External (Send USDT) */
  flowWalletToExt: (p) => (
    <svg {...p}>
      <path d="M2.5 8.5h5a1.5 1.5 0 0 1 1.5 1.5v3.5a1.5 1.5 0 0 1-1.5 1.5h-5a1.5 1.5 0 0 1-1.5-1.5v-3.5a1.5 1.5 0 0 1 1.5-1.5z" />
      <path d="M6 10.25h-1.25a.65.65 0 0 0 0 1.3H6" />
      <line x1="10.25" y1="12" x2="13.25" y2="12" />
      <polyline points="11.75 10.5 13.25 12 11.75 13.5" />
      <circle cx="19.5" cy="12" r="3.25" />
      <ellipse cx="19.5" cy="12" rx="3.25" ry="1.2" />
    </svg>
  ),
};

function Icon({ name, size = 20, stroke = 1.6 }) {
  const builder = ICON_BUILDERS[name];
  if (!builder) return null;
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round" };
  return builder(p);
}

// ─────────────── Coins / assets ───────────────
const COINS = {
  BTC: { name: "Bitcoin", color: "#f7931a", text: "₿" },
  ETH: { name: "Ethereum", color: "#627eea", text: "Ξ" },
  USDT: { name: "Tether", color: "#26a17b", text: "₮" },
  USDC: { name: "USD Coin", color: "#2775ca", text: "$" },
  BNB: { name: "BNB", color: "#f3ba2f", text: "B" },
  SOL: { name: "Solana", color: "#14f195", text: "◎" },
  XRP: { name: "XRP", color: "#23292f", text: "X" },
  TRX: { name: "Tron", color: "#ff060a", text: "T" },
  ADA: { name: "Cardano", color: "#0033ad", text: "₳" },
  MATIC: { name: "Polygon", color: "#8247e5", text: "M" },
  AVAX: { name: "Avalanche", color: "#e84142", text: "A" },
  LTC: { name: "Litecoin", color: "#345d9d", text: "Ł" },
  DOT: { name: "Polkadot", color: "#e6007a", text: "•" },
  TON: { name: "Toncoin", color: "#0098ea", text: "T" },
  DAI: { name: "Dai", color: "#f5ac37", text: "◈" },
  BUSD: { name: "BUSD", color: "#f0b90b", text: "B" },
};
const FIATS = {
  USD: { name: "US Dollar", color: "#1f8a5b", text: "$", flag: "🇺🇸" },
  EUR: { name: "Euro", color: "#003399", text: "€", flag: "🇪🇺" },
  GBP: { name: "Pound", color: "#cf142b", text: "£", flag: "🇬🇧" },
  JPY: { name: "Yen", color: "#bc002d", text: "¥", flag: "🇯🇵" },
  KRW: { name: "Won", color: "#0047a0", text: "₩", flag: "🇰🇷" },
  CNY: { name: "Yuan", color: "#de2910", text: "¥", flag: "🇨🇳" },
  SGD: { name: "S. Dollar", color: "#ed2939", text: "$", flag: "🇸🇬" },
  HKD: { name: "HK Dollar", color: "#003c71", text: "$", flag: "🇭🇰" },
  AED: { name: "Dirham", color: "#00732f", text: "د.إ", flag: "🇦🇪" },
  CHF: { name: "Franc", color: "#d52b1e", text: "F", flag: "🇨🇭" },
  AUD: { name: "A. Dollar", color: "#012169", text: "$", flag: "🇦🇺" },
  CAD: { name: "C. Dollar", color: "#d52b1e", text: "$", flag: "🇨🇦" },
  INR: { name: "Rupee", color: "#ff9933", text: "₹", flag: "🇮🇳" },
  THB: { name: "Baht", color: "#00247d", text: "฿", flag: "🇹🇭" },
  IDR: { name: "Rupiah", color: "#ce1126", text: "Rp", flag: "🇮🇩" },
  VND: { name: "Dong", color: "#da251d", text: "₫", flag: "🇻🇳" },
};

function CoinChip({ sym, size = 36 }) {
  const c = COINS[sym] || { color: "#888", text: sym[0] };
  return (
    <div className="asset__sym" style={{ background: c.color, width: size, height: size, fontSize: size * 0.4 }}>
      {c.text}
    </div>
  );
}
function FiatChip({ sym, size = 36 }) {
  const f = FIATS[sym] || { color: "#888", text: sym[0] };
  return (
    <div className="asset__sym" style={{ background: "#fff", color: f.color, border: "1px solid #ececef", width: size, height: size, fontSize: size * 0.4 }}>
      {f.text}
    </div>
  );
}

// ─────────────── Hero card (PNG + entrance + hover float) ───────────────
function HeroCard({ variant = 'light', alt }) {
  const ref = useHeroCardFloat(12);
  const src = HERO_CARDS[variant] || HERO_CARDS.light;
  return (
    <div className={`hero-card hero-card--${variant}`} ref={ref}>
      <div className="hero-card__float">
        <img
          className="hero-card__img"
          src={src}
          alt={alt}
          width={1450}
          height={860}
          loading="eager"
          fetchpriority="high"
          decoding="async"
          draggable={false}
        />
      </div>
    </div>
  );
}

/** WebP with original fallback. `display: contents` keeps img layout identical. */
function OptimizedImg({
  webp,
  src,
  alt,
  className,
  width,
  height,
  loading = 'lazy',
  fetchpriority,
}) {
  return (
    <picture className="opt-img">
      {webp ? <source type="image/webp" srcSet={webp} /> : null}
      <img
        src={src}
        alt={alt}
        className={className}
        width={width}
        height={height}
        loading={loading}
        decoding="async"
        fetchpriority={fetchpriority}
        draggable={false}
      />
    </picture>
  );
}

// ─────────────── Card mockup ───────────────
function PaymentCard({ variant = "primary", brand = "Anytap", number = "5421  88·· ····  3104", name = "JOHN DOE", network = "VISA" }) {
  const isDark = variant === "dark" || variant === "secondary";
  return (
    <div className={`cm-card cm-card--${variant}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div className="cm-card__brand">
          <Logo inverse={isDark} height={22} />
        </div>
      </div>
      <div className="cm-card__chip"></div>
      <div>
        <div className="cm-card__num">{number}</div>
        <div className="cm-card__row" style={{ marginTop: 8 }}>
          <span className="cm-card__name">{name}</span>
          <span className="cm-card__net">{network}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────── Pseudo QR code ───────────────
function QRCode({ size = 168, fg = "#0a0a0d" }) {
  const n = 25;
  const cell = size / n;
  const inBox = (r, c, r0, c0) => r >= r0 && r < r0 + 7 && c >= c0 && c < c0 + 7;
  const isFinderZone = (r, c) =>
    inBox(r, c, 0, 0) || inBox(r, c, 0, n - 7) || inBox(r, c, n - 7, 0) ||
    // quiet ring around finders
    (r < 8 && c < 8) || (r < 8 && c >= n - 8) || (r >= n - 8 && c < 8);
  const rects = [];
  // data modules (deterministic pseudo-random)
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (isFinderZone(r, c)) continue;
      const h = (r * 73856093) ^ (c * 19349663) ^ ((r + c) * 83492791);
      if ((h >>> 0) % 100 < 48) {
        rects.push(<rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill={fg} />);
      }
    }
  }
  const Finder = ({ r0, c0 }) => (
    <g>
      <rect x={c0 * cell} y={r0 * cell} width={cell * 7} height={cell * 7} fill={fg} />
      <rect x={(c0 + 1) * cell} y={(r0 + 1) * cell} width={cell * 5} height={cell * 5} fill="#fff" />
      <rect x={(c0 + 2) * cell} y={(r0 + 2) * cell} width={cell * 3} height={cell * 3} fill={fg} />
    </g>
  );
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", borderRadius: "var(--radius-xs)" }}>
      <rect x="0" y="0" width={size} height={size} fill="#fff" />
      {rects}
      <Finder r0={0} c0={0} />
      <Finder r0={0} c0={n - 7} />
      <Finder r0={n - 7} c0={0} />
    </svg>
  );
}

// ─────────────── Crypto-payment fintech illustration ───────────────
function CryptoPayArt() {
  return (
    <div className="paysol-art">
      <div className="paysol-art__glow"></div>
      <svg className="paysol-art__svg" viewBox="0 0 440 440" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="pa-card" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff7733" />
            <stop offset="1" stopColor="#ff5500" />
          </linearGradient>
          <linearGradient id="pa-phone" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1c1c24" />
            <stop offset="1" stopColor="#0a0a0d" />
          </linearGradient>
          <filter id="pa-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="18" stdDeviation="22" floodColor="#0a0a0d" floodOpacity="0.18" />
          </filter>
          <filter id="pa-shadow-o" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="16" stdDeviation="20" floodColor="#ff5500" floodOpacity="0.45" />
          </filter>
        </defs>

        {/* Card behind */}
        <g filter="url(#pa-shadow-o)" transform="translate(56 226) rotate(-12)">
          <rect width="208" height="132" rx="18" fill="url(#pa-card)" />
          <rect x="22" y="28" width="32" height="25" rx="5" fill="rgba(255,255,255,0.55)" />
          <path d="M146 24 q12 -10 24 0 M140 34 q18 -16 36 0" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" fill="none" opacity="0.85" />
          <rect x="22" y="82" width="112" height="10" rx="5" fill="rgba(255,255,255,0.85)" />
          <rect x="22" y="100" width="60" height="8" rx="4" fill="rgba(255,255,255,0.5)" />
          <text x="170" y="112" fontFamily="var(--font-sans)" fontWeight="800" fontSize="21" fill="#fff" textAnchor="end" letterSpacing="-0.5">VISA</text>
        </g>

        {/* Phone with Approved screen */}
        <g filter="url(#pa-shadow)" transform="translate(150 56) rotate(5)">
          <rect width="158" height="312" rx="32" fill="url(#pa-phone)" />
          <rect x="9" y="9" width="140" height="294" rx="24" fill="#ffffff" />
          <rect x="60" y="20" width="38" height="9" rx="4.5" fill="#0a0a0d" />
          {/* green check */}
          <circle cx="79" cy="120" r="42" fill="#e9f9ee" />
          <circle cx="79" cy="120" r="30" fill="#1f9d57" />
          <path d="M65 120 l10 10 l20 -22" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          {/* Approved text */}
          <text x="79" y="196" fontFamily="var(--font-sans)" fontWeight="800" fontSize="24" fill="#0a0a0d" textAnchor="middle" letterSpacing="-0.5">Approved</text>
          <text x="79" y="218" fontFamily="var(--font-sans)" fontWeight="500" fontSize="12" fill="#74747e" textAnchor="middle">Payment confirmed</text>
          {/* amount pill */}
          <rect x="34" y="240" width="90" height="34" rx="12" fill="#fff0eb" />
          <text x="79" y="262" fontFamily="var(--font-sans)" fontWeight="800" fontSize="15" fill="#ff5500" textAnchor="middle">$128.00</text>
        </g>

        {/* Bitcoin */}
        <g filter="url(#pa-shadow)">
          <circle cx="64" cy="104" r="32" fill="#f7931a" />
          <text x="64" y="117" fontFamily="var(--font-sans)" fontWeight="800" fontSize="32" fill="#fff" textAnchor="middle">₿</text>
        </g>
        {/* USDT */}
        <g filter="url(#pa-shadow)">
          <circle cx="384" cy="150" r="28" fill="#26a17b" />
          <text x="384" y="161" fontFamily="var(--font-sans)" fontWeight="800" fontSize="28" fill="#fff" textAnchor="middle">₮</text>
        </g>
        {/* Dollar (fiat) */}
        <g filter="url(#pa-shadow)">
          <circle cx="356" cy="368" r="32" fill="#1f8a5b" />
          <text x="356" y="381" fontFamily="var(--font-sans)" fontWeight="800" fontSize="32" fill="#fff" textAnchor="middle">$</text>
        </g>

        {/* arrows hinting conversion crypto → fiat */}
        <g stroke="#ff5500" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.5">
          <path d="M96 112 q34 6 54 22" strokeDasharray="2 9" />
          <path d="M360 176 q-26 28 -52 40" strokeDasharray="2 9" />
        </g>
      </svg>
    </div>
  );
}

// ─────────────── Crypto-payment fintech illustration (end) ───────────────

// ─────────────── BIN comparison (card suspension) ───────────────
function BinCompareArt() {
  return (
    <div className="bincmp">
      <div className="bincmp__side bincmp__side--bad">
        <div className="bincmp__head">
          <span className="bincmp__who">Another crypto card</span>
          <span className="bincmp__bins">1 BIN</span>
        </div>
        <div className="bincmp__card bincmp__card--dead">
          <div className="bincmp__card-top">
            <span className="bincmp__genericlogo">crypto card</span>
          </div>
          <div className="bincmp__chiprow"><span className="bincmp__chip"></span></div>
          <div className="bincmp__card-num">5421 •••• •••• 0000</div>
          <div className="bincmp__stamp bincmp__stamp--off"><Icon name="xCircle" size={16} /> SUSPENDED</div>
        </div>
        <p className="bincmp__cap">One issuer goes down — and <strong>every card freezes at once.</strong></p>
      </div>

      <div className="bincmp__side bincmp__side--good">
        <div className="bincmp__head">
          <span className="bincmp__who">Anytap</span>
          <span className="bincmp__bins bincmp__bins--on">60+ BINs</span>
        </div>
        <div className="bincmp__card bincmp__card--live">
          <div className="bincmp__card-top">
            <Logo height={16} />
          </div>
          <div className="bincmp__chiprow"><span className="bincmp__chip bincmp__chip--gold"></span></div>
          <div className="bincmp__card-num">5421 •••• •••• 3104</div>
          <div className="bincmp__stamp bincmp__stamp--on"><Icon name="checkCircle" size={16} /> ALWAYS ACTIVE</div>
        </div>
        <div className="bincmp__dots">
          {Array.from({ length: 12 }).map((_, i) => <span key={i} className="bincmp__dot"></span>)}
          <span className="bincmp__dot-more">+48</span>
        </div>
        <p className="bincmp__cap">If one BIN stops, traffic <strong>routes to another instantly.</strong></p>
      </div>
    </div>
  );
}

// ─────────────── Account-creation phone (static, for Who-can-apply) ───────────────
function AccountCreatePhone() {
  return (
    <div className="acctphone">
      <div className="acctphone__device">
        <span className="acctphone__btn acctphone__btn--l1"></span>
        <span className="acctphone__btn acctphone__btn--l2"></span>
        <span className="acctphone__btn acctphone__btn--r1"></span>
        <div className="acctphone__screen">
          <div className="acctphone__notch"></div>
          <div className="acctphone__bar"><span>9:41</span><span className="acctphone__sig"><i></i><i></i><i></i><i></i></span></div>
          <div className="acctphone__logo"><Logo height={16} /></div>
          <div className="acctphone__pad">
            <div className="acctphone__title">Create account</div>
            <div className="acctphone__sub">Spend crypto anywhere — start in minutes.</div>
            <label className="acctphone__lbl">Email</label>
            <div className="acctphone__inp">john.doe@email.com</div>
            <label className="acctphone__lbl">Full name</label>
            <div className="acctphone__inp acctphone__inp--muted">John Doe</div>
            <label className="acctphone__lbl">Country / Region</label>
            <div className="acctphone__inp acctphone__inp--sel">United States <Icon name="chevron" size={13} /></div>
            <button className="acctphone__cta">Continue <Icon name="arrowRight" size={15} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────── Checkout / API integration illustration ───────────────
function CheckoutApiArt() {
  const cats = [
    { icon: "gamepad", label: "Gaming" },
    { icon: "store", label: "E-commerce" },
    { icon: "code", label: "SaaS" },
    { icon: "plane", label: "Travel" },
    { icon: "chart", label: "Exchange" },
    { icon: "layers", label: "Content" },
  ];
  return (
    <div className="apihub">
      <div className="apihub__glow"></div>
      <div className="apihub__cats">
        {cats.map((c) => {
          const CatIcon = resolveFeatureIcon(c.icon);
          return (
          <div className="apihub__cat" key={c.label}>
            <span className="apihub__cat-ic">
              {CatIcon ? <CatIcon size={18} weight="duotone" aria-hidden="true" /> : <Icon name={c.icon} size={18} />}
            </span>
            <span className="apihub__cat-l">{c.label}</span>
          </div>
          );
        })}
      </div>
      <div className="apihub__core">
        <div className="apihub__chip"><Icon name="api" size={22} /></div>
        <div className="apihub__core-t">Anytap API</div>
        <div className="apihub__core-s">One integration</div>
      </div>
      <div className="apihub__pay">
        <div className="apihub__pay-row"><span className="apihub__coin" style={{ background: "#f7931a" }}>₿</span><span className="apihub__coin" style={{ background: "#26a17b" }}>₮</span><span className="apihub__coin" style={{ background: "#2775ca" }}>$</span></div>
        <div className="apihub__pay-arrow"><Icon name="arrowRight" size={16} stroke={2.4} /></div>
        <div className="apihub__settle"><Icon name="checkCircle" size={15} /> Settled</div>
      </div>
    </div>
  );
}

// ─────────────── Merchant onboarding process ───────────────
function MerchantProcessArt() {
  const steps = [
    { icon: "receipt", t: "Apply", s: "Submit merchant form" },
    { icon: "eye", t: "Review", s: "Within 10 business days" },
    { icon: "api", t: "Integrate", s: "API · link · plugin" },
    { icon: "rocket", t: "Go live", s: "Accept 350+ coins" },
  ];
  return (
    <div className="mproc">
      {steps.map((s, i) => (
        <Fragment key={s.t}>
          <div className="mproc__step">
            <span className="mproc__ic"><Icon name={s.icon} size={20} /></span>
            <span className="mproc__t">{s.t}</span>
            <span className="mproc__s">{s.s}</span>
          </div>
          {i < steps.length - 1 && <span className="mproc__arrow"><Icon name="arrowRight" size={18} stroke={2.4} /></span>}
        </Fragment>
      ))}
    </div>
  );
}

// ─────────────── Card-network marks (Visa) ───────────────
function NetMark({ name }) {
  if (name === "visa" || name === "mastercard") {
    return <span className="netmark netmark--visa">VISA</span>;
  }
  return null;
}

// ─────────────── Brand pay logos (Apple/Samsung/Google Pay) ───────────────
function PayBrand({ name }) {
  if (name === "apple") {
    return (
      <span className="paybrand">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="#0a0a0d" d="M17.56 12.78c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.81 0-2.06-.92-3.39-.89-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.79 1.3 10.34.86 1.25 1.88 2.65 3.22 2.6 1.29-.05 1.78-.83 3.34-.83 1.56 0 2 .83 3.37.81 1.39-.03 2.27-1.27 3.12-2.53.98-1.45 1.39-2.86 1.41-2.93-.03-.01-2.7-1.04-2.73-4.13zM15.0 5.18c.71-.86 1.19-2.06 1.06-3.25-1.02.04-2.26.68-2.99 1.54-.66.76-1.23 1.98-1.08 3.15 1.14.09 2.3-.58 3.01-1.44z"/></svg>
        <span className="paybrand__txt">Pay</span>
      </span>
    );
  }
  if (name === "google") {
    return (
      <span className="paybrand">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="#4285F4" d="M22.5 12.23c0-.74-.07-1.45-.19-2.13H12v4.03h5.89a5.04 5.04 0 0 1-2.18 3.31v2.75h3.53c2.07-1.9 3.26-4.71 3.26-7.96z"/><path fill="#34A853" d="M12 23c2.95 0 5.43-.98 7.24-2.65l-3.53-2.75c-.98.66-2.23 1.05-3.71 1.05-2.85 0-5.27-1.93-6.13-4.52H2.21v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.87 14.13a6.6 6.6 0 0 1 0-4.26V7.03H2.21a11 11 0 0 0 0 9.94l3.66-2.84z"/><path fill="#EA4335" d="M12 5.5c1.61 0 3.06.55 4.2 1.64l3.13-3.13C17.43 2.22 14.95 1.25 12 1.25A11 11 0 0 0 2.21 7.03l3.66 2.84C6.73 7.42 9.15 5.5 12 5.5z"/></svg>
        <span className="paybrand__txt">Pay</span>
      </span>
    );
  }
  // samsung
  return (
    <span className="paybrand paybrand--samsung">
      <span className="paybrand__samsung">SAMSUNG</span>
      <span className="paybrand__txt">Pay</span>
    </span>
  );
}

// ─────────────── Mini phone preview ───────────────
function MiniPhone() {
  return (
    <div className="phone">
      <div className="phone__screen">
        <div className="phone__notch"></div>
        <div className="phone__bal">Total balance</div>
        <div className="phone__amt">$12,480.32</div>
        <div className="phone__chips">
          <span className="chip">BTC 0.18</span>
          <span className="chip">USDT 4,210</span>
          <span className="chip">ETH 2.1</span>
        </div>
        <div className="phone__list">
          <div className="phone__row">
            <div>
              <strong>Starbucks</strong>
              <div style={{ color: "#74747e" }}>Today · 09:12</div>
            </div>
            <div className="neg">−$6.40</div>
          </div>
          <div className="phone__row">
            <div>
              <strong>Top up · USDC</strong>
              <div style={{ color: "#74747e" }}>Yesterday</div>
            </div>
            <div style={{ color: "#16a34a", fontWeight: 700 }}>+$500</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { Logo, Icon, CoinChip, FiatChip, HeroCard, OptimizedImg, PaymentCard, MiniPhone, QRCode, CryptoPayArt, BinCompareArt, AccountCreatePhone, CheckoutApiArt, MerchantProcessArt, PayBrand, NetMark, COINS, FIATS };
