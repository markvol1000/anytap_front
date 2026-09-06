// ===== My Page — premium fintech hub (not a traditional settings list) =====

import { useState, useCallback } from 'react';
import { Icon } from '../../components/ui.jsx';
import { DeleteAccountModal } from '../../components/account/DeleteAccountModal.jsx';
import * as A from '../../lib/account-data.js';

const QUICK_ACCESS = [
  {
    label: 'Profile',
    desc: 'View and update your personal details',
    icon: 'user',
    screen: 'profile',
  },
  {
    label: 'KYC Verification',
    desc: 'Identity and compliance status',
    icon: 'shield',
    action: 'kyc',   // not a route — handled by handleQuickAccess
  },
];

// Security + Notifications + planned (Language, Appearance) — same on mobile and desktop
const SETTINGS_ITEMS = [
  { label: 'Security', icon: 'lock', screen: 'security' },
  { label: 'Notifications', icon: 'bell', screen: 'notifications' },
];

function initialsFromName(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function kycBadge(accountState, kycStatusDef) {
  const status = accountState?.kycStatus ?? 'pending';
  const map = {
    approved: { tone: 'success', label: 'Verified' },
    pending: { tone: 'warn', label: 'Not Verified' },
    under_review: { tone: 'warn', label: 'Under Review' },
    rejected: { tone: 'danger', label: 'Rejected' },
  };
  return map[status] ?? { tone: 'neutral', label: kycStatusDef?.label ?? 'Unknown' };
}

function referralBadge(referralContext) {
  if (referralContext?.isPartner) return { tone: 'brand', label: 'Partner' };
  if (referralContext?.isPending) return { tone: 'warn', label: 'Pending' };
  return { tone: 'neutral', label: 'Member' };
}

function profileMeta(s) {
  const memberSince = A.PROFILE_FIELDS.find((f) => f.label === 'Member since')?.value ?? '—';
  const userId = s.accountState?.loginId || s.accountState?.userId || '—';
  return { memberSince, userId };
}

function MyBadge({ tone, label }) {
  return (
    <span className={`portal-my__badge portal-my__badge--${tone}`}>
      {label}
    </span>
  );
}

function QuickAccessTileMob({ label, icon, onClick }) {
  return (
    <button type="button" className="portal-my__tile" onClick={onClick}>
      <span className="portal-my__tile-icon" aria-hidden="true">
        <Icon name={icon} size={22} stroke={1.75} />
      </span>
      <span className="portal-my__tile-label">{label}</span>
    </button>
  );
}

function QuickAccessCardDesk({ label, desc, icon, onClick }) {
  return (
    <button type="button" className="portal-my-desk__action" onClick={onClick}>
      <span className="portal-my-desk__action-icon" aria-hidden="true">
        <Icon name={icon} size={24} stroke={1.75} />
      </span>
      <span className="portal-my-desk__action-body">
        <span className="portal-my-desk__action-title">{label}</span>
        <span className="portal-my-desk__action-desc">{desc}</span>
      </span>
      <span className="portal-my-desk__action-arrow" aria-hidden="true">
        <Icon name="chevron" size={18} stroke={2} />
      </span>
    </button>
  );
}

function SettingsRowMob({ label, icon, onClick, danger = false }) {
  return (
    <button
      type="button"
      className={`portal-my__row${danger ? ' portal-my__row--danger' : ''}`}
      onClick={onClick}>
      <span className="portal-my__row-icon" aria-hidden="true">
        <Icon name={icon} size={18} stroke={1.75} />
      </span>
      <span className="portal-my__row-label">{label}</span>
      {!danger && <Icon name="chevron" size={16} stroke={2} />}
    </button>
  );
}

function SettingsRowDesk({ label, icon, onClick, danger = false, href }) {
  const className = `portal-my-desk__list-row${danger ? ' portal-my-desk__list-row--danger' : ''}`;

  if (href) {
    return (
      <a href={href} className={className}>
        <span className="portal-my-desk__list-icon" aria-hidden="true">
          <Icon name={icon} size={22} stroke={1.75} />
        </span>
        <span className="portal-my-desk__list-label">{label}</span>
        {!danger && <Icon name="chevron" size={16} stroke={2} />}
      </a>
    );
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      <span className="portal-my-desk__list-icon" aria-hidden="true">
        <Icon name={icon} size={22} stroke={1.75} />
      </span>
      <span className="portal-my-desk__list-label">{label}</span>
      {!danger && <Icon name="chevron" size={16} stroke={2} />}
    </button>
  );
}

function ProfileSummaryMob({ name, email, kyc, referral }) {
  return (
    <section className="portal-my__summary" aria-label="Account summary">
      <div className="portal-my__avatar" aria-hidden="true">
        {initialsFromName(name)}
      </div>
      <div className="portal-my__identity">
        <h1 className="portal-my__name">{name}</h1>
        <p className="portal-my__email">{email}</p>
        <div className="portal-my__badges">
          <MyBadge tone={kyc.tone} label={kyc.label} />
          <MyBadge tone={referral.tone} label={referral.label} />
        </div>
      </div>
    </section>
  );
}

function ProfileSummaryDesk({ name, email, kyc, referral, memberSince, userId, onEdit }) {
  return (
    <section className="portal-my-desk__profile" aria-label="Profile summary">
      <div className="portal-my-desk__profile-top">
        <div className="portal-my-desk__avatar" aria-hidden="true">
          {initialsFromName(name)}
        </div>
        <div className="portal-my-desk__profile-head">
          <h1 className="portal-my-desk__name">{name}</h1>
          <p className="portal-my-desk__email">{email}</p>
          <div className="portal-my__badges portal-my-desk__badges">
            <MyBadge tone={kyc.tone} label={kyc.label} />
            <MyBadge tone={referral.tone} label={referral.label} />
          </div>
        </div>
      </div>
      <dl className="portal-my-desk__meta">
        <div className="portal-my-desk__meta-row">
          <dt>Member since</dt>
          <dd>{memberSince}</dd>
        </div>
        <div className="portal-my-desk__meta-row">
          <dt>Login ID</dt>
          <dd className="portal-my-desk__meta-mono">{userId}</dd>
        </div>
      </dl>
    </section>
  );
}

export function AccountSettings({ s }) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const name = String(s.accountState?.name || '').trim() || 'User';
  const email = String(s.accountState?.email || '').trim() || 'Not set';
  const kyc = kycBadge(s.accountState, s.kycStatusDef);
  const referral = referralBadge(s.referralContext);
  const { memberSince, userId } = profileMeta(s);

  const handleQuickAccess = useCallback((item) => {
    if (item.action === 'kyc') {
      s.go(s.kycApproved ? 'profile' : 'kyc');
      return;
    }
    s.go(item.screen);
  }, [s.go, s.kycApproved]);

  const handleSettings = useCallback((item) => {
    if (item.screen === 'language' || item.screen === 'appearance') {
      s.showToast?.(`${item.label} settings coming soon`);
      return;
    }
    s.go(item.screen);
  }, [s.go, s.showToast]);

  const handleEditProfile = useCallback(() => {
    s.showToast?.('Edit profile coming soon');
  }, [s.showToast]);

  return (
    <div className="portal-my">
      {/* Mobile — unchanged layout */}
      <div className="portal-my-mob">
        <ProfileSummaryMob name={name} email={email} kyc={kyc} referral={referral} />

        <section className="portal-my__section" aria-labelledby="portal-my-quick">
          <h2 id="portal-my-quick" className="portal-my__section-title">Quick Access</h2>
          <div className="portal-my__grid">
            {QUICK_ACCESS.map((item) => (
              <QuickAccessTileMob
                key={item.label}
                label={item.label}
                icon={item.icon}
                onClick={() => handleQuickAccess(item)}
              />
            ))}
          </div>
        </section>

        <section className="portal-my__section" aria-labelledby="portal-my-settings">
          <h2 id="portal-my-settings" className="portal-my__section-title">Settings</h2>
          <div className="portal-my__list">
            {SETTINGS_ITEMS.map((item) => (
              <SettingsRowMob
                key={item.label}
                label={item.label}
                icon={item.icon}
                onClick={() => handleSettings(item)}
              />
            ))}
          </div>
        </section>

        <section className="portal-my__section portal-my__section--account" aria-labelledby="portal-my-account">
          <h2 id="portal-my-account" className="portal-my__section-title">Account</h2>
          <div className="portal-my__list portal-my__list--account">
            <SettingsRowMob label="Log Out" icon="logOut" onClick={s.logout} />
            <SettingsRowMob label="Delete Account" icon="trash" onClick={() => setDeleteModalOpen(true)} danger />
          </div>
        </section>
      </div>

      {/* Desktop — two-column premium layout */}
      <div className="portal-my-desk">
        <div className="portal-my-desk__layout">
          <ProfileSummaryDesk
            name={name}
            email={email}
            kyc={kyc}
            referral={referral}
            memberSince={memberSince}
            userId={userId}
          />

          <section className="portal-my-desk__panel portal-my-desk__quick" aria-labelledby="portal-my-desk-quick">
            <h2 id="portal-my-desk-quick" className="portal-my-desk__panel-title">Quick Access</h2>
            <div className="portal-my-desk__action-grid">
              {QUICK_ACCESS.map((item) => (
                <QuickAccessCardDesk
                  key={item.label}
                  label={item.label}
                  desc={item.desc}
                  icon={item.icon}
                  onClick={() => handleQuickAccess(item)}
                />
              ))}
            </div>
          </section>

          <section className="portal-my-desk__panel portal-my-desk__settings" aria-labelledby="portal-my-desk-settings">
            <h2 id="portal-my-desk-settings" className="portal-my-desk__panel-title">Settings</h2>
            <div className="portal-my-desk__list">
              {SETTINGS_ITEMS.map((item) => (
                <SettingsRowDesk
                  key={item.label}
                  label={item.label}
                  icon={item.icon}
                  onClick={() => handleSettings(item)}
                />
              ))}
            </div>
          </section>

          <section className="portal-my-desk__panel portal-my-desk__account" aria-labelledby="portal-my-desk-account">
            <h2 id="portal-my-desk-account" className="portal-my-desk__panel-title">Account</h2>
            <div className="portal-my-desk__list">
              <SettingsRowDesk label="Log Out" icon="logOut" onClick={s.logout} />
              <SettingsRowDesk label="Delete Account" icon="trash" onClick={() => setDeleteModalOpen(true)} danger />
            </div>
          </section>
        </div>
      </div>

      <DeleteAccountModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        s={s}
      />
    </div>
  );
}
