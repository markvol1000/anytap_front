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
        description="View fee rates, Wasabi/Cregis API keys, master addresses, and all DB System_Config parameters (Read-only)."
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--admin-border-subtle, #334155)', paddingBottom: '12px' }}>
        {[
          { id: 'fees', label: '💰 Fees & Limits' },
          { id: 'api', label: '🔌 Wasabi & Cregis API' },
          { id: 'all', label: '🗄️ System_Config DB Ledger' },
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

      {/* TAB 1: FEES & LIMITS (READ ONLY TEXT) */}
      {activeTab === 'fees' && (
        <div className="admin-settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          <AdminPanel>
            <AdminDetailSection title="Transaction & Card Fee Rates (Read-only)">
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontWeight: '600', display: 'block', marginBottom: '4px', fontSize: '13px', color: '#94a3b8' }}>
                  Card Issuance Fee (USDT)
                </span>
                <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: '13px', fontFamily: 'monospace' }}>
                  {settings.cardFeeUsdt ?? settings.WASABI_CARD_FEE_USDT ?? 100} USDT
                </div>
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Default fee charged for physical/virtual card application (e.g. 100 USDT)
                </span>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontWeight: '600', display: 'block', marginBottom: '4px', fontSize: '13px', color: '#94a3b8' }}>
                  Card Top-up / Recharge Fee (%)
                </span>
                <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: '13px', fontFamily: 'monospace' }}>
                  {settings.topUpFeePercent ?? settings.WASABI_TOPUP_FEE_PERCENT ?? 2.5}%
                </div>
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Percentage fee deducted upon card recharge (e.g. 2.5%)
                </span>
              </div>
            </AdminDetailSection>
          </AdminPanel>

          <AdminPanel>
            <AdminDetailSection title="Withdrawals & Referrals (Read-only)">
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontWeight: '600', display: 'block', marginBottom: '4px', fontSize: '13px', color: '#94a3b8' }}>
                  Minimum Withdrawal Amount (USDT)
                </span>
                <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: '13px', fontFamily: 'monospace' }}>
                  {settings.minWithdrawalUsdt ?? settings.MIN_WITHDRAWAL_USDT ?? 10} USDT
                </div>
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Minimum threshold for user withdrawal requests (e.g. 10 USDT)
                </span>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontWeight: '600', display: 'block', marginBottom: '4px', fontSize: '13px', color: '#94a3b8' }}>
                  Referral Reward Allowance Rate (%)
                </span>
                <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: '13px', fontFamily: 'monospace' }}>
                  {settings.referralRatePercent ?? settings.REFERRAL_RATE_PERCENT ?? 5.0}%
                </div>
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Commission allowance percentage paid to referrer upon member recharge (e.g. 5.0%)
                </span>
              </div>
            </AdminDetailSection>
          </AdminPanel>
        </div>
      )}

      {/* TAB 2: WASABI & CREGIS API CONFIG (READ ONLY TEXT) */}
      {activeTab === 'api' && (
        <div className="admin-settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          <AdminPanel>
            <AdminDetailSection title="Wasabi Card Platform Credentials (Read-only)">
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontWeight: '600', display: 'block', marginBottom: '4px', fontSize: '13px', color: '#94a3b8' }}>
                  Wasabi API Base URL
                </span>
                <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: '13px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {settings.WASABI_DEFAULT_API_URL || '—'}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontWeight: '600', display: 'block', marginBottom: '4px', fontSize: '13px', color: '#94a3b8' }}>
                  Wasabi API Key
                </span>
                <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: '13px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {settings.WASABI_DEFAULT_API_KEY || '—'}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontWeight: '600', display: 'block', marginBottom: '4px', fontSize: '13px', color: '#94a3b8' }}>
                  Wasabi Private Key (RSA / SHA256)
                </span>
                <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#64748b', fontSize: '11px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  •••••••••••••••••••••••••••••••••••••••• (Encrypted & Masked)
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontWeight: '600', display: 'block', marginBottom: '4px', fontSize: '13px', color: '#94a3b8' }}>
                  Wasabi Default Physical Card Type ID
                </span>
                <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: '13px', fontFamily: 'monospace' }}>
                  {settings.WASABI_DEFAULT_CARD_TYPE_ID || '111059'}
                </div>
              </div>
            </AdminDetailSection>
          </AdminPanel>

          <AdminPanel>
            <AdminDetailSection title="Cregis & Master Deposit Addresses (Read-only)">
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontWeight: '600', display: 'block', marginBottom: '4px', fontSize: '13px', color: '#94a3b8' }}>
                  Cregis Fee Sweep Master Collect Address
                </span>
                <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: '13px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {settings.cregis_collect_address || '—'}
                </div>
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Master wallet address where accumulated unpaid fees are swept/transferred
                </span>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontWeight: '600', display: 'block', marginBottom: '4px', fontSize: '13px', color: '#94a3b8' }}>
                  Wasabi Merchant Card Recharge Deposit Address
                </span>
                <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontSize: '13px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {settings.wasabi_merchant_deposit_address || '—'}
                </div>
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Wasabi merchant pool wallet address for Funding Card deposits
                </span>
              </div>
            </AdminDetailSection>
          </AdminPanel>
        </div>
      )}

      {/* TAB 4: ALL CONFIG DB ENTRIES TABLE (READ ONLY & UNMODIFIABLE) */}
      {activeTab === 'all' && (
        <AdminPanel>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                🗄️ System_Config DB Ledger ({filteredKeys.length} Entries)
              </h3>
              <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                Read-only system ledger. Editing and deleting entries is disabled.
              </span>
            </div>
            <input
              type="text"
              placeholder="Search key or value…"
              value={searchKey}
              onChange={(e) => setSearchKey(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '13px', width: '240px' }}
            />
          </div>

          <div style={{ overflowX: 'auto', backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155', padding: '4px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155', textAlign: 'left', fontSize: '12px', color: '#94a3b8' }}>
                  <th style={{ padding: '12px', width: '32%', whiteSpace: 'nowrap' }}>Config Key</th>
                  <th style={{ padding: '12px', width: '50%' }}>Value</th>
                  <th style={{ padding: '12px', width: '18%', whiteSpace: 'nowrap' }}>Status</th>
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
                    <tr key={key} style={{ borderBottom: '1px solid #1e293b', backgroundColor: '#0f172a' }}>
                      <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: '600', color: '#38bdf8', fontSize: '13px', whiteSpace: 'nowrap' }}>
                        {key}
                      </td>
                      <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '12px', color: key.includes('KEY') || key.includes('SECRET') || key.includes('PRIVATE') ? '#64748b' : '#f8fafc', wordBreak: 'break-all' }}>
                        {key.includes('KEY') || key.includes('SECRET') || key.includes('PRIVATE') ? '•••••••••••••••••••••••• (Masked Security Value)' : String(settings[key] ?? '')}
                      </td>
                      <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', backgroundColor: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', fontWeight: '600', display: 'inline-block', whiteSpace: 'nowrap' }}>
                          Protected (Immutable)
                        </span>
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
