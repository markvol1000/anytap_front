// ===== Card management — details, security toggles, actions (Cards tab) =====

import { useEffect, useState } from 'react';
import { Icon } from './ui.jsx';
import { AccountToggle } from './account/AccountToggle.jsx';
import { freezeCard, unfreezeCard, updatePhysicalCardPin } from '../lib/services/accountService.js';
import { PhysicalCardChangePinSheet } from './account/PhysicalCardChangePinSheet.jsx';
import * as A from '../lib/account-data.js';

const SECURITY_ROWS = [
  { id: 'freeze', label: 'Freeze card', desc: 'Instantly pause all payments', icon: 'lock' },
  { id: 'online', label: 'Online payments', desc: 'E-commerce & subscriptions', icon: 'globe' },
  { id: 'atm', label: 'ATM withdrawals', desc: 'Cash at supported ATMs', icon: 'bank' },
  { id: 'contactless', label: 'Contactless (tap)', desc: 'NFC payments', icon: 'nfc' },
];

function defaultSecurityState(card) {
  const frozen = card?.status === 'frozen';
  return {
    freeze: frozen,
    online: !frozen,
    atm: !frozen,
    contactless: !frozen,
  };
}

export function CardSecurityControls({ card, s, className = '' }) {
  const [controls, setControls] = useState(() => defaultSecurityState(card));

  useEffect(() => {
    setControls(defaultSecurityState(card));
  }, [card?.id, card?.status]);

  if (!card) return null;

  const setControl = async (id, value) => {
    setControls((prev) => {
      if (id === 'freeze') {
        const frozen = value;
        return {
          freeze: frozen,
          online: frozen ? false : prev.online || true,
          atm: frozen ? false : prev.atm || true,
          contactless: frozen ? false : prev.contactless || true,
        };
      }
      return { ...prev, [id]: value };
    });

    if (id === 'freeze') {
      try {
        const cardId = card?.id || card?.wasabiCardId || card?.cardId;
        if (value) {
          await freezeCard(cardId);
          s?.showToast?.('Card frozen successfully');
        } else {
          await unfreezeCard(cardId);
          s?.showToast?.('Card unfrozen successfully');
        }
        await s?.reloadAccount?.();
      } catch (err) {
        console.error('Failed to change card freeze status', err);
        s?.showToast?.(err?.message || 'Failed to update card status');
      }
    } else {
      const row = SECURITY_ROWS.find((r) => r.id === id);
      s?.showToast?.(`${row?.label ?? 'Setting'} ${value ? 'enabled' : 'disabled'}`);
    }
  };

  return (
    <section
      className={`portal-card-mgmt__security${className ? ` ${className}` : ''}`}
      aria-label="Security controls">
      <h2 className="portal-card-mgmt__section-title">Security Controls</h2>
      <div className="portal-card-mgmt__panel">
        <ul className="portal-card-mgmt__toggle-list">
          {SECURITY_ROWS.map((row) => {
            const on = controls[row.id];
            const disabled = row.id !== 'freeze' && controls.freeze;
            const label = row.id === 'freeze' ? (controls.freeze ? 'Unfreeze card' : 'Freeze card') : row.label;
            const desc = row.id === 'freeze' ? (controls.freeze ? 'Resume payments & unfreeze card' : 'Instantly pause all payments') : row.desc;

            return (
              <li key={row.id} className="portal-card-mgmt__toggle-row">
                <span className="portal-card-mgmt__toggle-icon" aria-hidden="true">
                  <Icon name={row.id === 'freeze' && controls.freeze ? 'lockOpen' : row.icon} size={20} stroke={1.75} />
                </span>
                <div className="portal-card-mgmt__toggle-copy">
                  <span className="portal-card-mgmt__toggle-label">{label}</span>
                  <span className="portal-card-mgmt__toggle-desc">{desc}</span>
                </div>
                <AccountToggle
                  on={on}
                  disabled={disabled}
                  onToggle={() => setControl(row.id, !on)}
                  ariaLabel={label}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export function CardManagementActions({ card, s, className = '' }) {
  const [showChangePin, setShowChangePin] = useState(false);

  const isPhysical = card?.cardType === 'physical' || card?.variant === 'physical';

  const onPinChangeClick = () => {
    if (!isPhysical) {
      s?.showToast?.('PIN change is only available for physical cards.');
      return;
    }
    setShowChangePin(true);
  };

  return (
    <>
      <section
        className={`portal-card-mgmt__actions${className ? ` ${className}` : ''}`}
        aria-label="Card actions">
        <div className="portal-card-mgmt__panel">
          <button
            type="button"
            className="portal-card-mgmt__action-row"
            onClick={onPinChangeClick}>
            <span className="portal-card-mgmt__action-icon" aria-hidden="true">
              <Icon name="lock" size={18} stroke={1.75} />
            </span>
            <span className="portal-card-mgmt__action-label">Change PIN</span>
            <Icon name="chevron" size={18} stroke={2} className="portal-card-mgmt__action-chevron" />
          </button>
        </div>
      </section>

      {showChangePin && (
        <PhysicalCardChangePinSheet
          s={s}
          card={card}
          open={showChangePin}
          onClose={() => setShowChangePin(false)}
        />
      )}
    </>
  );
}

export function CardSpendingLimits({ card, className = '' }) {
  if (!card) return null;

  return (
    <section
      className={`portal-card-mgmt__limits${className ? ` ${className}` : ''}`}
      aria-label="Spending limits">
      <h2 className="portal-card-mgmt__section-title">Spending Limits</h2>
      <div className="portal-card-mgmt__panel" style={{ padding: '18px 20px' }}>
        <div className="portal-card-limit-group">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-default, rgba(26,26,26,0.06))', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--portal-ink, #1a1a1a)' }}>Card Spending</span>
            <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--fg-muted, #6b6057)', background: 'var(--bg-subtle, rgba(0,0,0,0.04))', padding: '2px 8px', borderRadius: '4px' }}>Standard tier</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px 14px' }}>
            <div>
              <span style={{ color: 'var(--fg-muted, #6b6057)', fontSize: '11px', fontWeight: '500', display: 'block', marginBottom: '2px' }}>Single Tx</span>
              <strong style={{ fontSize: '14px', fontWeight: '700', color: 'var(--portal-ink, #1a1a1a)', fontFamily: 'var(--font-mono, ui-monospace, monospace)' }}>$20,000.00</strong>
            </div>
            <div>
              <span style={{ color: 'var(--fg-muted, #6b6057)', fontSize: '11px', fontWeight: '500', display: 'block', marginBottom: '2px' }}>Daily Limit</span>
              <strong style={{ fontSize: '14px', fontWeight: '700', color: 'var(--portal-ink, #1a1a1a)', fontFamily: 'var(--font-mono, ui-monospace, monospace)' }}>$250,000.00</strong>
            </div>
            <div>
              <span style={{ color: 'var(--fg-muted, #6b6057)', fontSize: '11px', fontWeight: '500', display: 'block', marginBottom: '2px' }}>Monthly Limit</span>
              <strong style={{ fontSize: '14px', fontWeight: '700', color: 'var(--portal-ink, #1a1a1a)', fontFamily: 'var(--font-mono, ui-monospace, monospace)' }}>$1,000,000.00</strong>
            </div>
            <div>
              <span style={{ color: 'var(--fg-muted, #6b6057)', fontSize: '11px', fontWeight: '500', display: 'block', marginBottom: '2px' }}>Daily Tx Count</span>
              <strong style={{ fontSize: '14px', fontWeight: '700', color: 'var(--portal-ink, #1a1a1a)' }}>100 tx/day</strong>
            </div>
          </div>
        </div>

        <div className="portal-card-limit-group" style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-default, rgba(26,26,26,0.06))' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-default, rgba(26,26,26,0.06))', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--portal-ink, #1a1a1a)' }}>ATM Withdrawal</span>
            <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--fg-muted, #6b6057)', background: 'var(--bg-subtle, rgba(0,0,0,0.04))', padding: '2px 8px', borderRadius: '4px' }}>2% fee (min $1)</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px 14px' }}>
            <div>
              <span style={{ color: 'var(--fg-muted, #6b6057)', fontSize: '11px', fontWeight: '500', display: 'block', marginBottom: '2px' }}>Single / Daily</span>
              <strong style={{ fontSize: '14px', fontWeight: '700', color: 'var(--portal-ink, #1a1a1a)', fontFamily: 'var(--font-mono, ui-monospace, monospace)' }}>$1,500.00</strong>
            </div>
            <div>
              <span style={{ color: 'var(--fg-muted, #6b6057)', fontSize: '11px', fontWeight: '500', display: 'block', marginBottom: '2px' }}>Monthly Limit</span>
              <strong style={{ fontSize: '14px', fontWeight: '700', color: 'var(--portal-ink, #1a1a1a)', fontFamily: 'var(--font-mono, ui-monospace, monospace)' }}>$15,000.00</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CardMobileManagementPanel({ card, s }) {
  if (!card) return null;

  return (
    <div className="portal-card-mgmt portal-card-mgmt--mob">
      <CardSecurityControls card={card} s={s} />
      <CardSpendingLimits card={card} />
      <CardManagementActions card={card} s={s} />
    </div>
  );
}

export function CardDesktopManagementPanel({ card, s }) {
  if (!card) return null;

  return (
    <aside className="portal-card-mgmt portal-mycards-desk-info" aria-label="Card management">
      <CardSecurityControls card={card} s={s} />
      <CardSpendingLimits card={card} />
      <CardManagementActions card={card} s={s} />
    </aside>
  );
}
