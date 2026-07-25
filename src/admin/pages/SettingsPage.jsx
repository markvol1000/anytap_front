import { useEffect, useState } from 'react';
import { AdminPageHeader, AdminPanel } from '../components/AdminFilterBar.jsx';
import { AdminDetailSection } from '../components/AdminSplitLayout.jsx';
import { runConfirm, useAdminConfirm } from '../components/AdminConfirmModal.jsx';
import { getSettings, updateSettings } from '../services/adminService.js';

export function SettingsPage() {
  const confirm = useAdminConfirm();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings().then(setSettings).finally(() => setLoading(false));
  }, []);

  const patch = (key, value) => {
    setSettings((s) => ({ ...s, [key]: value }));
  };

  const handleSave = async () => {
    const ok = await runConfirm(confirm, {
      title: 'Save system config',
      message: 'Apply these configuration changes?',
      confirmLabel: 'Save',
    });
    if (!ok) return;
    setSaving(true);
    try {
      const updated = await updateSettings(settings);
      setSettings(updated);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="admin-page admin-page--settings">
        <AdminPageHeader title="Settings" />
        <p className="admin-loading">Loading…</p>
      </div>
    );
  }

  return (
    <div className="admin-page admin-page--settings">
      <AdminPageHeader
        title="Settings"
        description="Fees, limits, referral rates, networks, and maintenance mode."
        actions={(
          <button type="button" className="admin-btn admin-btn--primary" disabled={saving} onClick={handleSave}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        )}
      />

      <div className="admin-settings-grid">
        <AdminPanel>
          <AdminDetailSection title="Fees & limits">
            <label className="admin-field">
              <span className="admin-field__label">Card fee (USDT)</span>
              <input
                type="number"
                className="admin-input"
                value={settings.cardFeeUsdt}
                onChange={(e) => patch('cardFeeUsdt', Number(e.target.value))}
              />
            </label>
            <label className="admin-field">
              <span className="admin-field__label">Top-up fee (%)</span>
              <input
                type="number"
                step="0.1"
                className="admin-input"
                value={settings.topUpFeePercent}
                onChange={(e) => patch('topUpFeePercent', Number(e.target.value))}
              />
            </label>
            <label className="admin-field">
              <span className="admin-field__label">Minimum withdrawal (USDT)</span>
              <input
                type="number"
                className="admin-input"
                value={settings.minWithdrawalUsdt}
                onChange={(e) => patch('minWithdrawalUsdt', Number(e.target.value))}
              />
            </label>
            <label className="admin-field">
              <span className="admin-field__label">Referral rate (%)</span>
              <input
                type="number"
                step="0.1"
                className="admin-input"
                value={settings.referralRatePercent}
                onChange={(e) => patch('referralRatePercent', Number(e.target.value))}
              />
            </label>
          </AdminDetailSection>
        </AdminPanel>

        <AdminPanel>
          <AdminDetailSection title="Networks & maintenance">
            <label className="admin-field">
              <span className="admin-field__label">Supported networks</span>
              <input
                className="admin-input"
                value={(settings.supportedNetworks || []).join(', ')}
                onChange={(e) => patch('supportedNetworks', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
              />
            </label>
            <label className="admin-field admin-field--checkbox">
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) => patch('maintenanceMode', e.target.checked)}
              />
              <span>Maintenance mode</span>
            </label>
            <p className="admin-muted">
              When enabled, member portal shows maintenance banner and blocks new transactions.
            </p>
          </AdminDetailSection>
        </AdminPanel>
      </div>
    </div>
  );
}
