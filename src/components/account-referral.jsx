import { useState, useEffect } from 'react';
import { getReferralContext } from '../lib/referral-context.js';
import { fetchAllReferralPartners, fetchReferralContextByCode } from '../lib/services/account/accountApi.js';
import { hasAdminSession, getAdminSessionEmail, isAdminEmail } from '../lib/services/authService.js';
import { getHttpSession } from '../lib/api/httpSession.js';
import { ReferralPartnerDashboard } from './referral/ReferralPartnerDashboard.jsx';
import '../styles/referral-dashboard.css';

function checkIsAdmin(s) {
  if (hasAdminSession()) return true;
  if (getAdminSessionEmail()) return true;
  const session = getHttpSession();
  if (session?.role === 'admin' || session?.isAdmin || session?.role === 'ADMIN') return true;
  if (session?.email && (isAdminEmail(session.email) || session.email.toLowerCase().includes('admin'))) return true;
  if (s?.accountState?.role === 'admin' || s?.accountState?.isAdmin) return true;
  return false;
}

export function AccountReferral({ s = {} }) {
  const isAdmin = checkIsAdmin(s);

  const defaultReferral = s?.remoteReferral || s?.referralContext || getReferralContext('referralApproved');

  // Admin state
  const [partnerList, setPartnerList] = useState([]);
  const [selectedCode, setSelectedCode] = useState(defaultReferral?.code || '');
  const [adminReferralData, setAdminReferralData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load all referral partners for admin selector
  useEffect(() => {
    if (isAdmin) {
      fetchAllReferralPartners()
        .then((list) => {
          const safeList = list || [];
          setPartnerList(safeList);
          if (safeList.length > 0) {
            const exists = safeList.some((p) => p.code === selectedCode);
            if (!exists || !selectedCode || selectedCode === 'AT001' || selectedCode === 'ALL') {
              setSelectedCode(safeList[0].code);
            }
          }
        })
        .catch(() => setPartnerList([]));
    }
  }, [isAdmin]);

  // Fetch referral dashboard data whenever selectedCode changes for Admin
  useEffect(() => {
    if (isAdmin && selectedCode) {
      setLoading(true);
      fetchReferralContextByCode(selectedCode)
        .then((data) => {
          setAdminReferralData(data || defaultReferral);
        })
        .catch(() => setAdminReferralData(defaultReferral))
        .finally(() => setLoading(false));
    }
  }, [isAdmin, selectedCode]);

  const activeReferral = isAdmin ? (adminReferralData || defaultReferral) : defaultReferral;

  return (
    <div className="portal-page portal-page--unified portal-ref-page">
      {/* Admin Referral Partner Selector Card — Solid White Panel */}
      {isAdmin && (
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '18px 22px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                fontSize: '11px',
                padding: '3px 10px',
                borderRadius: '6px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                fontWeight: '800',
                letterSpacing: '0.5px'
              }}>
                ADMIN
              </span>
              Referral Partner View Mode
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
              Select a registered referral partner code to inspect their network dashboard and member deposits.
            </p>
          </div>

          {/* Selector Dropdown */}
          <div style={{ minWidth: '280px', flex: '0 1 400px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#334155', fontWeight: '700', marginBottom: '6px' }}>
              Select Partner Code
            </label>
            <select
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '13.5px',
                fontWeight: '700',
                backgroundColor: '#f8fafc',
                color: '#0f172a',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                outline: 'none',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
              value={selectedCode}
              onChange={(e) => setSelectedCode(e.target.value)}
            >
              {partnerList.map((p) => {
                const codeStr = p.code || '';
                const nameStr = (p.memberName && p.memberName !== codeStr) ? p.memberName : '';
                const emailStr = (p.userEmail && p.userEmail !== '—' && p.userEmail !== codeStr) ? p.userEmail : '';
                
                let detailStr = '';
                if (nameStr && emailStr && nameStr !== emailStr) {
                  detailStr = `${nameStr} (${emailStr})`;
                } else if (emailStr) {
                  detailStr = emailStr;
                } else if (nameStr) {
                  detailStr = nameStr;
                }

                const optionText = detailStr ? `${codeStr} — ${detailStr}` : codeStr;

                return (
                  <option key={codeStr} value={codeStr} style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>
                    {optionText}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#94a3b8', fontWeight: '600', fontSize: '14px' }}>
          Loading Referral Partner [{selectedCode}] Dashboard Data...
        </div>
      ) : (
        <ReferralPartnerDashboard s={s} referral={activeReferral} />
      )}
    </div>
  );
}
