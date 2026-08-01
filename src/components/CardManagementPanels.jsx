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
      if (prev.freeze) return prev;
      return { ...prev, [id]: value };
    });

    if (id === 'freeze') {
      try {
        if (value) {
          await freezeCard(card?.cardId || card?.id);
          s?.showToast?.('Card frozen successfully');
        } else {
          await unfreezeCard(card?.cardId || card?.id);
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
          <button
            type="button"
            className="portal-card-mgmt__action-row portal-card-mgmt__action-row--danger"
            onClick={() => s?.showToast?.('Report lost or stolen — contact support')}>
            <span className="portal-card-mgmt__action-icon portal-card-mgmt__action-icon--danger" aria-hidden="true">
              <Icon name="flag" size={18} stroke={1.75} />
            </span>
            <span className="portal-card-mgmt__action-label">Report lost or stolen</span>
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
  const limits = A.getCardLimitsSummary ? A.getCardLimitsSummary(card) : null;
  if (!limits || !limits.dailySpend || !limits.atmWithdrawal) return null;

  const dailyPct = limits.dailySpend.limit > 0
    ? Math.min(100, (limits.dailySpend.used / limits.dailySpend.limit) * 100)
    : 0;
  const atmPct = limits.atmWithdrawal.limit > 0
    ? Math.min(100, (limits.atmWithdrawal.used / limits.atmWithdrawal.limit) * 100)
    : 0;
  const dailyLeft = Math.max(0, limits.dailySpend.limit - limits.dailySpend.used);
  const atmLeft = Math.max(0, limits.atmWithdrawal.limit - limits.atmWithdrawal.used);

  return (
    <section
      className={`portal-card-mgmt__limits${className ? ` ${className}` : ''}`}
      aria-label="Spending limits">
      <h2 className="portal-card-mgmt__section-title">Spending Limits</h2>
      <div className="portal-card-mgmt__panel portal-card-mgmt__panel--limits">
        <div className="portal-mycards-desk-info__limit">
          <div className="portal-mycards-desk-info__limit-head">
            <span className="portal-mycards-desk-info__limit-name">Daily Spend Limit</span>
            <span className="portal-mycards-desk-info__limit-total">
              {A.formatLimitUsd(limits.dailySpend.limit)}
            </span>
          </div>
          <div className="portal-mycards-desk-info__track" aria-hidden="true">
            <div className="portal-mycards-desk-info__fill" style={{ width: `${dailyPct}%` }} />
          </div>
          <div className="portal-mycards-desk-info__limit-foot">
            <span>{A.formatLimitUsd(limits.dailySpend.used)} used</span>
            <span>{A.formatLimitUsd(dailyLeft)} left</span>
          </div>
        </div>

        <div className="portal-mycards-desk-info__limit">
          <div className="portal-mycards-desk-info__limit-head">
            <span className="portal-mycards-desk-info__limit-name">ATM Withdrawal Limit</span>
            <span className="portal-mycards-desk-info__limit-total">
              {A.formatLimitUsd(limits.atmWithdrawal.limit)} / day
            </span>
          </div>
          <div className="portal-mycards-desk-info__track" aria-hidden="true">
            <div className="portal-mycards-desk-info__fill" style={{ width: `${atmPct}%` }} />
          </div>
          <div className="portal-mycards-desk-info__limit-foot">
            <span>{A.formatLimitUsd(limits.atmWithdrawal.used)} used</span>
            <span>{A.formatLimitUsd(atmLeft)} available</span>
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
