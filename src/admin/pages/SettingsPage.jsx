import { useEffect, useState } from 'react';
import { AdminPageHeader, AdminPanel } from '../components/AdminFilterBar.jsx';
import { AdminDetailSection } from '../components/AdminSplitLayout.jsx';
import { runConfirm, useAdminConfirm } from '../components/AdminConfirmModal.jsx';
import { deleteSettingKey, getFeeMaster, getSettings, updateSettings } from '../services/adminService.js';

export function SettingsPage() {
  const confirm = useAdminConfirm();
  const [settings, setSettings] = useState({});
  const [feeMaster, setFeeMaster] = useState([]);
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
      const [data, fees] = await Promise.all([
        getSettings().catch(() => ({})),
        getFeeMaster().catch(() => []),
      ]);
      setSettings(data || {});
      setFeeMaster(fees || []);
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
        WASABI_TOPUP_FEE_USDT: String(settings.topUpFeeUsdt ?? settings.WASABI_TOPUP_FEE_USDT ?? 3),
        WITHDRAWAL_FEE_USDT: String(settings.withdrawalFeeUsdt ?? settings.WITHDRAWAL_FEE_USDT ?? 3),
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
          { id: 'referrals', label: '🤝 Referral Management' },
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

      {/* TAB 1: FEES & LIMITS (FEE_MASTER DB TABLE + SUMMARY) */}
      {activeTab === 'fees' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="admin-settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            <AdminPanel>
              <AdminDetailSection title="Transaction & Card Fee Rates (Fee_Master Derived)">
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontWeight: '600', display: 'block', marginBottom: '4px', fontSize: '13px', color: '#94a3b8' }}>
                    Wasabi Card Top-up Fixed Fee (CARD_CHARGE_FIXED)
                  </span>
                  <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#38bdf8', fontSize: '13px', fontFamily: 'monospace', fontWeight: '700' }}>
                    {feeMaster.find(f => f.feeCode === 'CARD_CHARGE_FIXED')?.fixedAmount ?? 3.0} USDT
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    Wasabi 카드 충전 고정 수수료 (3.00 USDT)
                  </span>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontWeight: '600', display: 'block', marginBottom: '4px', fontSize: '13px', color: '#94a3b8' }}>
                    USDT Wallet Deposit Fee Rate (A1)
                  </span>
                  <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#38bdf8', fontSize: '13px', fontFamily: 'monospace', fontWeight: '700' }}>
                    {((feeMaster.find(f => f.feeCode === 'A1')?.rateValue ?? 0.03) * 100).toFixed(1)}%
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    USDT 입금(지갑입금처리) 수수료율 (3.0%)
                  </span>
                </div>
              </AdminDetailSection>
            </AdminPanel>

            <AdminPanel>
              <AdminDetailSection title="Withdrawals & Referrals (Fee_Master Derived)">
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontWeight: '600', display: 'block', marginBottom: '4px', fontSize: '13px', color: '#94a3b8' }}>
                    Referral Commission Rate (A4)
                  </span>
                  <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#38bdf8', fontSize: '13px', fontFamily: 'monospace', fontWeight: '700' }}>
                    {((feeMaster.find(f => f.feeCode === 'A4')?.rateValue ?? 0.003) * 100).toFixed(1)}%
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    추천인 수당 요율 (0.3%)
                  </span>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontWeight: '600', display: 'block', marginBottom: '4px', fontSize: '13px', color: '#94a3b8' }}>
                    Recharge Subsidy Rate (ANYTAP_SUB / SUBSIDY)
                  </span>
                  <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#38bdf8', fontSize: '13px', fontFamily: 'monospace', fontWeight: '700' }}>
                    {((feeMaster.find(f => f.feeCode === 'ANYTAP_SUB' || f.feeCode === 'SUBSIDY')?.rateValue ?? 0.0085) * 100).toFixed(2)}%
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    Wasabi 충전 시 보충 수수료율 (0.85%)
                  </span>
                </div>
              </AdminDetailSection>
            </AdminPanel>
          </div>

          {/* Fee_Master DB Ledger Table */}
          <AdminPanel>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#f8fafc' }}>
                📊 Fee_Master DB Ledger ({feeMaster.length} Rules)
              </h3>
              <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                Real-time fee structure extracted directly from AnyTabData.Fee_Master database table.
              </span>
            </div>

            <div style={{ overflowX: 'auto', backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155', padding: '4px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155', textAlign: 'left', fontSize: '12px', color: '#94a3b8' }}>
                    <th style={{ padding: '12px', width: '20%', whiteSpace: 'nowrap' }}>Fee Code</th>
                    <th style={{ padding: '12px', width: '15%', whiteSpace: 'nowrap' }}>Calc Type</th>
                    <th style={{ padding: '12px', width: '15%', whiteSpace: 'nowrap' }}>Fixed Amt</th>
                    <th style={{ padding: '12px', width: '15%', whiteSpace: 'nowrap' }}>Rate Value</th>
                    <th style={{ padding: '12px', width: '35%' }}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {feeMaster.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                        No Fee_Master entries found.
                      </td>
                    </tr>
                  ) : (
                    feeMaster.map((row) => (
                      <tr key={row.feeCode} style={{ borderBottom: '1px solid #1e293b', backgroundColor: '#0f172a' }}>
                        <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: '700', color: '#38bdf8', fontSize: '13px' }}>
                          {row.feeCode}
                        </td>
                        <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '12px', color: '#e2e8f0' }}>
                          {row.calculationType}
                        </td>
                        <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '12px', color: row.fixedAmount > 0 ? '#4ade80' : '#64748b' }}>
                          {row.fixedAmount > 0 ? `${row.fixedAmount} USDT` : '0.00'}
                        </td>
                        <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '12px', color: row.rateValue > 0 ? '#fbbf24' : '#64748b' }}>
                          {row.rateValue > 0 ? `${(row.rateValue * 100).toFixed(2)}%` : '0.00%'}
                        </td>
                        <td style={{ padding: '12px', fontSize: '12px', color: '#cbd5e1' }}>
                          {row.description}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </AdminPanel>
        </div>
      )}

      {/* TAB: REFERRAL MANAGEMENT & TABLE CONFIGURATION */}
      {activeTab === 'referrals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="admin-settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            <AdminPanel>
              <AdminDetailSection title="Referral System Configuration & Parameters">
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontWeight: '600', display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                    Default Referral Commission Rate (%) (referralRatePercent)
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      className="admin-input"
                      value={settings.referralRatePercent ?? settings.REFERRAL_RATE_PERCENT ?? '0.00'}
                      onChange={(e) => patch('referralRatePercent', e.target.value)}
                      style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '14px', width: '160px' }}
                    />
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#38bdf8' }}>%</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    신규 추천인 코드 생성 시 기본 적용되는 수수료 적립 요율 (기본: 0.00%)
                  </span>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontWeight: '600', display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                    Referral System Global Status (REFERRAL_SYSTEM_STATUS)
                  </label>
                  <select
                    className="admin-select"
                    value={settings.REFERRAL_SYSTEM_STATUS ?? 'ACTIVE'}
                    onChange={(e) => patch('REFERRAL_SYSTEM_STATUS', e.target.value)}
                    style={{ width: '100%', maxWidth: '240px', fontWeight: '600' }}
                  >
                    <option value="ACTIVE">ACTIVE (시스템 전체 추천인 적립 활성)</option>
                    <option value="INACTIVE">INACTIVE (추천인 적립 일시 중지)</option>
                    <option value="MAINTENANCE">MAINTENANCE (시스템 점검중)</option>
                  </select>
                  <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    추천인 커미션 적립 및 가입 시스템의 전체 활성화 상태
                  </span>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontWeight: '600', display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                    Minimum Commission Withdrawal Limit (USDT)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    className="admin-input"
                    value={settings.REFERRAL_MIN_WITHDRAWAL_USDT ?? '10'}
                    onChange={(e) => patch('REFERRAL_MIN_WITHDRAWAL_USDT', e.target.value)}
                    style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '14px', width: '160px' }}
                  />
                  <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    파트너 회원 커미션 정산 출금 최소 신청 단위 (기본: 10 USDT)
                  </span>
                </div>

                <div style={{ marginTop: '20px' }}>
                  <button
                    type="button"
                    className="admin-btn admin-btn--primary"
                    disabled={saving}
                    onClick={handleSave}
                  >
                    {saving ? 'Saving...' : '💾 Save Referral Settings'}
                  </button>
                </div>
              </AdminDetailSection>
            </AdminPanel>

            <AdminPanel>
              <AdminDetailSection title="Referral_Codes DB Table Information">
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontWeight: '600', display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                    Database Table Structure (`AnyTabData.Referral_Codes`)
                  </span>
                  <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', fontSize: '12px', color: '#e2e8f0' }}>
                    <div style={{ fontFamily: 'monospace', color: '#38bdf8', marginBottom: '6px', fontWeight: '700' }}>
                      Table: AnyTabData.Referral_Codes (7 Columns)
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px', color: '#cbd5e1' }}>
                      <li><code>code</code> VARCHAR(20) PRIMARY KEY — 추천인 코드</li>
                      <li><code>user_id</code> VARCHAR(50) — 파트너 회원 ID</li>
                      <li><code>name</code> VARCHAR(100) — 파트너/회원 이름</li>
                      <li><code>description</code> VARCHAR(255) — 파트너 설명/라벨</li>
                      <li><code>status</code> VARCHAR(20) DEFAULT 'ACTIVE' — 활성 상태</li>
                      <li><code>referral_rate_percent</code> DECIMAL(5,2) DEFAULT 0.00 — 요율</li>
                      <li><code>created_at</code> / <code>updated_at</code> DATETIME(6) — 생성/수정 일시</li>
                    </ul>
                  </div>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <a
                    href="/admin/referral"
                    className="admin-btn admin-btn--secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                  >
                    <span>📋 View Referral List</span>
                  </a>
                </div>
              </AdminDetailSection>
            </AdminPanel>
          </div>
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
