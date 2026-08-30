import { useState } from 'react';
import {
  triggerMockDepositWebhook,
  triggerMockCardSpendWebhook,
  triggerMockKycWebhook,
} from '../services/adminService.js';
import { AdminPanel } from './AdminFilterBar.jsx';

export function MockWebhookSimulator() {
  const [activeTab, setActiveTab] = useState('deposit');
  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Form states
  const [depUserId, setDepUserId] = useState('US019885');
  const [depAmount, setDepAmount] = useState('100.00');

  const [spendUserId, setSpendUserId] = useState('US019885');
  const [spendCardNo, setSpendCardNo] = useState('');
  const [spendAmount, setSpendAmount] = useState('15.00');
  const [spendMerchant, setSpendMerchant] = useState('Starbucks Coffee');
  const [spendStatus, setSpendStatus] = useState('SUCCESS');

  const [kycUserId, setKycUserId] = useState('US019885');
  const [kycStatus, setKycStatus] = useState('ACTIVE');

  const handleTriggerDeposit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResultMessage(null);
    setErrorMessage(null);
    try {
      const res = await triggerMockDepositWebhook({
        userId: depUserId,
        amount: parseFloat(depAmount),
      });
      setResultMessage(`✅ Deposit webhook success! (TxID: ${res.txId || res.data?.txId}) - Member ${depUserId} wallet balance updated`);
    } catch (err) {
      setErrorMessage(`❌ Webhook trigger failed: ${err.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerSpend = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResultMessage(null);
    setErrorMessage(null);
    try {
      const res = await triggerMockCardSpendWebhook({
        userId: spendUserId,
        cardNo: spendCardNo,
        amount: parseFloat(spendAmount),
        merchantName: spendMerchant,
        status: spendStatus,
      });
      setResultMessage(`✅ Card payment webhook success! (${spendMerchant} ${spendAmount} USD, Status: ${spendStatus})`);
    } catch (err) {
      setErrorMessage(`❌ Card payment webhook failed: ${err.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerKyc = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResultMessage(null);
    setErrorMessage(null);
    try {
      const res = await triggerMockKycWebhook({
        userId: kycUserId,
        status: kycStatus,
      });
      setResultMessage(`✅ KYC review webhook success! (Member ${kycUserId} status: ${kycStatus})`);
    } catch (err) {
      setErrorMessage(`❌ KYC webhook failed: ${err.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminPanel title="⚡ Mock Webhook Simulator" subtitle="Development & testing tool for Cregis deposit, Wasabi card payment, and KYC mock webhooks">
      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('deposit')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '700',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'deposit' ? '#007BFF' : '#F1F5F9',
            color: activeTab === 'deposit' ? '#ffffff' : '#475569',
          }}
        >
          💰 Cregis Deposit Webhook
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('spend')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '700',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'spend' ? '#8B5CF6' : '#F1F5F9',
            color: activeTab === 'spend' ? '#ffffff' : '#475569',
          }}
        >
          💳 Wasabi Card Payment Webhook
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('kyc')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '700',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'kyc' ? '#10B981' : '#F1F5F9',
            color: activeTab === 'kyc' ? '#ffffff' : '#475569',
          }}
        >
          🛡️ Wasabi KYC Webhook
        </button>
      </div>

      {/* Alert Result Banners */}
      {resultMessage && (
        <div style={{ padding: '12px 16px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '8px', color: '#047857', fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>
          {resultMessage}
        </div>
      )}
      {errorMessage && (
        <div style={{ padding: '12px 16px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#B91C1C', fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>
          {errorMessage}
        </div>
      )}

      {/* Tab 1: Mock Deposit */}
      {activeTab === 'deposit' && (
        <form onSubmit={handleTriggerDeposit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
              User ID
            </label>
            <input
              type="text"
              value={depUserId}
              onChange={(e) => setDepUserId(e.target.value)}
              placeholder="e.g. US019885"
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
              Deposit Amount (USDT)
            </label>
            <input
              type="number"
              step="0.01"
              value={depAmount}
              onChange={(e) => setDepAmount(e.target.value)}
              placeholder="100.00"
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '9px 18px',
              backgroundColor: '#007BFF',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Processing...' : '⚡ Send Mock Cregis Deposit Webhook'}
          </button>
        </form>
      )}

      {/* Tab 2: Mock Card Spend */}
      {activeTab === 'spend' && (
        <form onSubmit={handleTriggerSpend} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
              User ID
            </label>
            <input
              type="text"
              value={spendUserId}
              onChange={(e) => setSpendUserId(e.target.value)}
              placeholder="e.g. US019885"
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
              Card Last4 or Wasabi Card ID
            </label>
            <input
              type="text"
              value={spendCardNo || ''}
              onChange={(e) => setSpendCardNo(e.target.value)}
              placeholder="e.g. 5048 or WD..."
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
              Amount (USD)
            </label>
            <input
              type="number"
              step="0.01"
              value={spendAmount}
              onChange={(e) => setSpendAmount(e.target.value)}
              placeholder="15.00"
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
              Merchant
            </label>
            <input
              type="text"
              value={spendMerchant}
              onChange={(e) => setSpendMerchant(e.target.value)}
              placeholder="e.g. Starbucks Coffee"
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
              Payment Status
            </label>
            <select
              value={spendStatus}
              onChange={(e) => setSpendStatus(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
            >
              <option value="SUCCESS">SUCCESS (Approved)</option>
              <option value="FAILED">FAILED (Declined)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '9px 18px',
              backgroundColor: '#8B5CF6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Processing...' : '⚡ Send Mock Wasabi Payment Webhook'}
          </button>
        </form>
      )}

      {/* Tab 3: Mock KYC */}
      {activeTab === 'kyc' && (
        <form onSubmit={handleTriggerKyc} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
              User ID
            </label>
            <input
              type="text"
              value={kycUserId}
              onChange={(e) => setKycUserId(e.target.value)}
              placeholder="e.g. US019885"
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
              KYC Status
            </label>
            <select
              value={kycStatus}
              onChange={(e) => setKycStatus(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
            >
              <option value="ACTIVE">ACTIVE (Approved & Wallet Created)</option>
              <option value="REJECTED">REJECTED (Declined)</option>
              <option value="UNDER_REVIEW">UNDER_REVIEW (Pending Review)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '9px 18px',
              backgroundColor: '#10B981',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Processing...' : '⚡ Send Mock Wasabi KYC Webhook'}
          </button>
        </form>
      )}
    </AdminPanel>
  );
}
