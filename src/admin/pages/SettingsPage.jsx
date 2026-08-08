import { useEffect, useState } from 'react';
import { AdminPageHeader, AdminPanel } from '../components/AdminFilterBar.jsx';
import { AdminDetailSection } from '../components/AdminSplitLayout.jsx';
import { runConfirm, useAdminConfirm } from '../components/AdminConfirmModal.jsx';
import { deleteSettingKey, getSettings, updateSettings } from '../services/adminService.js';

export function SettingsPage() {
  const confirm = useAdminConfirm();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('fees'); // 'fees' | 'api' | 'system' | 'all'
  const [searchKey, setSearchKey] = useState('');

  // New Key Modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newConfigKey, setNewConfigKey] = useState('');
  const [newConfigVal, setNewConfigVal] = useState('');

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await getSettings();
      setSettings(data || {});
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const patch = (key, value) => {
    setSettings((s) => ({ ...s, [key]: value }));
  };

  const handleSave = async () => {
    const ok = await runConfirm(confirm, {
      title: 'Save System Configuration & Fees',
      message: 'Are you sure you want to apply these configuration updates to DB?',
      confirmLabel: 'Save Changes',
    });
    if (!ok) return;

    setSaving(true);
    try {
      // Also map friendly form fields to standard Wasabi/SystemConfig keys
      const updatedPatch = {
        ...settings,
        WASABI_CARD_FEE_USDT: String(settings.cardFeeUsdt ?? settings.WASABI_CARD_FEE_USDT ?? 100),
        WASABI_TOPUP_FEE_PERCENT: String(settings.topUpFeePercent ?? settings.WASABI_TOPUP_FEE_PERCENT ?? 2.5),
        MIN_WITHDRAWAL_USDT: String(settings.minWithdrawalUsdt ?? settings.MIN_WITHDRAWAL_USDT ?? 10),
        REFERRAL_RATE_PERCENT: String(settings.referralRatePercent ?? settings.REFERRAL_RATE_PERCENT ?? 5.0),
      };

      const updated = await updateSettings(updatedPatch);
      setSettings(updated);
      window.alert('System configurations and fee rates updated successfully!');
    } catch (err) {
      window.alert(`Failed to save settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddKey = async () => {
    const key = newConfigKey.trim();
    if (!key) {
      window.alert('Please enter a valid configuration key name.');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateSettings({ [key]: newConfigVal });
      setSettings(updated);
      setNewConfigKey('');
      setNewConfigVal('');
      setAddModalOpen(false);
      window.alert(`Configuration key "${key}" added successfully!`);
    } catch (err) {
      window.alert(`Failed to add key: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKey = async (key) => {
    const ok = await runConfirm(confirm, {
      title: `Delete Config Key`,
      message: `Are you sure you want to permanently delete config key "${key}"?`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;

    setSaving(true);
    try {
      const updated = await deleteSettingKey(key);
      setSettings(updated || {});
      window.alert(`Config key "${key}" deleted.`);
    } catch (err) {
      window.alert(`Failed to delete config key: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page admin-page--settings">
        <AdminPageHeader title="Settings & Config Management" />
        <p className="admin-loading">Loading system configurations…</p>
      </div>
    );
  }

  // Filter keys for ALL tab
  const allKeys = Object.keys(settings).sort();
  const filteredKeys = allKeys.filter((k) =>
    k.toLowerCase().includes(searchKey.toLowerCase()) ||
    String(settings[k]).toLowerCase().includes(searchKey.toLowerCase())
  );

  return (
    <div className="admin-page admin-page--settings">
      <AdminPageHeader
        title="Settings & System Configurations"
        description="Manage fee rates, Wasabi/Cregis API keys, master addresses, and all DB System_Config parameters."
        actions={(
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              onClick={() => setAddModalOpen(true)}
            >
              + Add Config Key
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--admin-border-subtle, #334155)', paddingBottom: '12px' }}>
        {[
          { id: 'fees', label: '💰 Fees & Limits' },
          { id: 'api', label: '🔌 Wasabi & Cregis API' },
          { id: 'system', label: '⚙️ System & Networks' },
          { id: 'all', label: '🗄️ All Config DB Entries' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            className={`admin-btn ${activeTab === t.id ? 'admin-btn--primary' : 'admin-btn--ghost'}`}
            style={{ fontSize: '13px', padding: '6px 14px' }}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: FEES & LIMITS */}
      {activeTab === 'fees' && (
        <div className="admin-settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          <AdminPanel>
            <AdminDetailSection title="Transaction & Card Fee Rates">
              <label className="admin-field" style={{ marginBottom: '16px' }}>
                <span className="admin-field__label" style={{ fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                  Card Issuance Fee (USDT)
                </span>
                <input
                  type="number"
                  step="0.01"
                  className="admin-input"
                  value={settings.cardFeeUsdt ?? settings.WASABI_CARD_FEE_USDT ?? 100}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    patch('cardFeeUsdt', val);
                    patch('WASABI_CARD_FEE_USDT', val);
                  }}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff' }}
                />
                <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                  Default fee charged for physical/virtual card application (e.g. 100 USDT)
                </span>
              </label>

              <label className="admin-field" style={{ marginBottom: '16px' }}>
                <span className="admin-field__label" style={{ fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                  Card Top-up / Recharge Fee (%)
                </span>
                <input
                  type="number"
                  step="0.1"
                  className="admin-input"
                  value={settings.topUpFeePercent ?? settings.WASABI_TOPUP_FEE_PERCENT ?? 2.5}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    patch('topUpFeePercent', val);
                    patch('WASABI_TOPUP_FEE_PERCENT', val);
                  }}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff' }}
                />
                <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                  Percentage fee deducted upon card recharge (e.g. 2.5%)
                </span>
              </label>
            </AdminDetailSection>
          </AdminPanel>

          <AdminPanel>
            <AdminDetailSection title="Withdrawals & Referrals">
              <label className="admin-field" style={{ marginBottom: '16px' }}>
                <span className="admin-field__label" style={{ fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                  Minimum Withdrawal Amount (USDT)
                </span>
                <input
                  type="number"
                  step="1"
                  className="admin-input"
                  value={settings.minWithdrawalUsdt ?? settings.MIN_WITHDRAWAL_USDT ?? 10}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    patch('minWithdrawalUsdt', val);
                    patch('MIN_WITHDRAWAL_USDT', val);
                  }}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff' }}
                />
                <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                  Minimum threshold for user withdrawal requests (e.g. 10 USDT)
                </span>
              </label>

              <label className="admin-field" style={{ marginBottom: '16px' }}>
                <span className="admin-field__label" style={{ fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                  Referral Reward Allowance Rate (%)
                </span>
                <input
                  type="number"
                  step="0.1"
                  className="admin-input"
                  value={settings.referralRatePercent ?? settings.REFERRAL_RATE_PERCENT ?? 5.0}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    patch('referralRatePercent', val);
                    patch('REFERRAL_RATE_PERCENT', val);
                  }}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff' }}
                />
                <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                  Commission allowance percentage paid to referrer upon member recharge (e.g. 5.0%)
                </span>
              </label>
            </AdminDetailSection>
          </AdminPanel>
        </div>
      )}

      {/* TAB 2: WASABI & CREGIS API CONFIG */}
      {activeTab === 'api' && (
        <div className="admin-settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          <AdminPanel>
            <AdminDetailSection title="Wasabi Card Platform Credentials">
              <label className="admin-field" style={{ marginBottom: '16px' }}>
                <span className="admin-field__label" style={{ fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                  Wasabi API Base URL
                </span>
                <input
                  type="text"
                  className="admin-input"
                  value={settings.WASABI_DEFAULT_API_URL || ''}
                  onChange={(e) => patch('WASABI_DEFAULT_API_URL', e.target.value)}
                  placeholder="https://api.wasabicard.com"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff' }}
                />
              </label>

              <label className="admin-field" style={{ marginBottom: '16px' }}>
                <span className="admin-field__label" style={{ fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                  Wasabi API Key
                </span>
                <input
                  type="text"
                  className="admin-input"
                  value={settings.WASABI_DEFAULT_API_KEY || ''}
                  onChange={(e) => patch('WASABI_DEFAULT_API_KEY', e.target.value)}
                  placeholder="WSB_KEY_..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontFamily: 'monospace' }}
                />
              </label>

              <label className="admin-field" style={{ marginBottom: '16px' }}>
                <span className="admin-field__label" style={{ fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                  Wasabi Private Key (RSA / SHA256)
                </span>
                <textarea
                  rows={3}
                  className="admin-input"
                  value={settings.WASABI_DEFAULT_PRIVATE_KEY || ''}
                  onChange={(e) => patch('WASABI_DEFAULT_PRIVATE_KEY', e.target.value)}
                  placeholder="MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBA..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontFamily: 'monospace', fontSize: '11px' }}
                />
              </label>

              <label className="admin-field" style={{ marginBottom: '16px' }}>
                <span className="admin-field__label" style={{ fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                  Wasabi Default Physical Card Type ID
                </span>
                <input
                  type="text"
                  className="admin-input"
                  value={settings.WASABI_DEFAULT_CARD_TYPE_ID || '111059'}
                  onChange={(e) => patch('WASABI_DEFAULT_CARD_TYPE_ID', e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontFamily: 'monospace' }}
                />
              </label>
            </AdminDetailSection>
          </AdminPanel>

          <AdminPanel>
            <AdminDetailSection title="Cregis & Master Deposit Addresses">
              <label className="admin-field" style={{ marginBottom: '16px' }}>
                <span className="admin-field__label" style={{ fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                  Cregis Fee Sweep Master Collect Address
                </span>
                <input
                  type="text"
                  className="admin-input"
                  value={settings.cregis_collect_address || ''}
                  onChange={(e) => patch('cregis_collect_address', e.target.value)}
                  placeholder="T..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontFamily: 'monospace' }}
                />
                <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                  Master wallet address where accumulated unpaid fees are swept/transferred
                </span>
              </label>

              <label className="admin-field" style={{ marginBottom: '16px' }}>
                <span className="admin-field__label" style={{ fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                  Wasabi Merchant Card Recharge Deposit Address
                </span>
                <input
                  type="text"
                  className="admin-input"
                  value={settings.wasabi_merchant_deposit_address || ''}
                  onChange={(e) => patch('wasabi_merchant_deposit_address', e.target.value)}
                  placeholder="T..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontFamily: 'monospace' }}
                />
                <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                  Wasabi merchant pool wallet address for Funding Card deposits
                </span>
              </label>
            </AdminDetailSection>
          </AdminPanel>
        </div>
      )}

      {/* TAB 3: SYSTEM & NETWORKS */}
      {activeTab === 'system' && (
        <div className="admin-settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          <AdminPanel>
            <AdminDetailSection title="Networks & Portal Controls">
              <label className="admin-field" style={{ marginBottom: '16px' }}>
                <span className="admin-field__label" style={{ fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                  Supported Blockchain Networks (Comma Separated)
                </span>
                <input
                  className="admin-input"
                  value={Array.isArray(settings.supportedNetworks) ? settings.supportedNetworks.join(', ') : (settings.supportedNetworks || 'TRC-20, ERC-20')}
                  onChange={(e) => patch('supportedNetworks', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff' }}
                />
              </label>

              <div style={{ marginTop: '20px', padding: '16px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155' }}>
                <label className="admin-field admin-field--checkbox" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(settings.maintenanceMode)}
                    onChange={(e) => patch('maintenanceMode', e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: '600', color: '#f87171', fontSize: '15px' }}>Enable System Maintenance Mode</span>
                </label>
                <p className="admin-muted" style={{ margin: 0, marginTop: '8px', fontSize: '12px', color: '#94a3b8' }}>
                  When enabled, member portal displays maintenance alert banner and restricts new transactions/card applications.
                </p>
              </div>
            </AdminDetailSection>
          </AdminPanel>
        </div>
      )}

      {/* TAB 4: ALL CONFIG DB ENTRIES TABLE */}
      {activeTab === 'all' && (
        <AdminPanel>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
              🗄️ System_Config DB Ledger ({filteredKeys.length} Entries)
            </h3>
            <input
              type="text"
              placeholder="Search key or value…"
              value={searchKey}
              onChange={(e) => setSearchKey(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '13px', width: '240px' }}
            />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid #334155', textAlign: 'left', fontSize: '12px', color: '#94a3b8' }}>
                  <th style={{ padding: '12px' }}>Config Key</th>
                  <th style={{ padding: '12px' }}>Value</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredKeys.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                      No configuration entries found.
                    </td>
                  </tr>
                ) : (
                  filteredKeys.map((key) => (
                    <tr key={key} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: '600', color: '#38bdf8', fontSize: '13px' }}>
                        {key}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <input
                          type="text"
                          className="admin-input"
                          value={settings[key] ?? ''}
                          onChange={(e) => patch(key, e.target.value)}
                          style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '12px', fontFamily: 'monospace' }}
                        />
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <button
                          type="button"
                          className="admin-btn admin-btn--danger"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          onClick={() => handleDeleteKey(key)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AdminPanel>
      )}

      {/* Add Config Key Modal */}
      {addModalOpen && (
        <div
          className="admin-modal-backdrop"
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={() => setAddModalOpen(false)}
        >
          <div
            className="admin-modal"
            style={{ backgroundColor: 'var(--admin-bg-surface, #1e293b)', borderRadius: '12px', padding: '24px', maxWidth: '440px', width: '100%', border: '1px solid #334155', color: '#fff' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0, marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>
              ➕ Add New System Config Key
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                  Config Key Name (e.g. WASABI_FEE_RATE)
                </label>
                <input
                  type="text"
                  value={newConfigKey}
                  onChange={(e) => setNewConfigKey(e.target.value)}
                  placeholder="NEW_CONFIG_KEY"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                  Config Value
                </label>
                <input
                  type="text"
                  value={newConfigVal}
                  onChange={(e) => setNewConfigVal(e.target.value)}
                  placeholder="value..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontFamily: 'monospace' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => setAddModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                onClick={handleAddKey}
                disabled={!newConfigKey.trim()}
              >
                Add Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
