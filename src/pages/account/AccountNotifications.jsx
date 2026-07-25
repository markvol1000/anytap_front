// ===== Account Notifications =====
// Push notification preference toggles
// TODO: Persist notification preferences to Supabase (user_settings table)

import { useState } from 'react';
import { AccountToggle } from '../../components/account/AccountToggle.jsx';
import * as A from '../../lib/account-data.js';

export function AccountNotifications() {
  const [notif, setNotif] = useState({ tx: true, security: true, promo: false, product: false });

  const toggle = (key) => setNotif((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="portal-page portal-page--unified portal-detail">
      {/* Notification toggles — TODO: save to Supabase (user_settings table) */}
      {A.NOTIF_DEFS.map((d) => (
        <div className="portal-notif-row" key={d.key}>
          <div>
            <div className="portal-notif-row__label">{d.label}</div>
            <div className="portal-notif-row__sub">{d.sub}</div>
          </div>
          <AccountToggle on={notif[d.key]} onToggle={() => toggle(d.key)} />
        </div>
      ))}
    </div>
  );
}
