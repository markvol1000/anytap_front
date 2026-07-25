// ===== Account Support =====
// Live chat, email contact, and FAQ accordion
// TODO: Wire live chat to actual support platform (e.g. Intercom / Zendesk)
// TODO: FAQ content should come from CMS or Supabase

import { useState } from 'react';
import * as A from '../../lib/account-data.js';
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '../../lib/site.ts';

export function AccountSupport({ s }) {
  const [faqOpen, setFaqOpen] = useState(null);

  return (
    <div className="portal-page portal-page--unified portal-detail">
      {/* Live chat — TODO: open Intercom/Zendesk widget */}
      <button
        type="button"
        className="portal-btn-primary"
        style={{ marginBottom: 16 }}
        onClick={() => s.showToast('Opening live chat…')}>
        Live chat
      </button>

      {/* Email support — opens mail client */}
      <a
        href={SUPPORT_MAILTO}
        className="portal-btn-secondary"
        style={{ width: '100%', marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
        Email us · {SUPPORT_EMAIL}
      </a>

      {/* FAQ accordion — TODO: fetch from CMS */}
      {A.FAQ_DEFS.map((d, i) => (
        <div className="portal-faq" key={d.q}>
          <button
            type="button"
            className="portal-faq__q"
            onClick={() => setFaqOpen(faqOpen === i ? null : i)}>
            {d.q}
            <span style={{
              transform: faqOpen === i ? 'rotate(-135deg)' : 'rotate(45deg)',
              width: 8, height: 8,
              borderRight: '2px solid var(--border-strong)',
              borderBottom: '2px solid var(--border-strong)',
              display: 'inline-block', transition: 'transform .2s',
            }} />
          </button>
          {faqOpen === i && <p className="portal-faq__a">{d.a}</p>}
        </div>
      ))}
    </div>
  );
}
