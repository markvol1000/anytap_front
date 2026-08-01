import { useState } from 'react';
import { Icon } from '../ui.jsx';
import { activatePhysicalCard } from '../../lib/services/accountService.js';

export function PhysicalCardActivateSheet({ s, open, onClose }) {
  const [pin, setPin] = useState('');
  const [activeCode, setActiveCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!open) return null;

  const card = s.activePhysicalTargetCard ?? s.currentCard;
  const cardNoDisplay = card?.last4 ? `Card ending in ${card.last4}` : 'Physical Card';
  const isAlreadyActive = card?.status === 'active';

  const handleActivate = async () => {
    if (isAlreadyActive) return;
    setErrorMsg('');
    if (pin.trim().length !== 6) {
      setErrorMsg('PIN must be exactly 6 digits.');
      return;
    }
    if (!activeCode.trim()) {
      setErrorMsg('Activation Code is required.');
      return;
    }

    setLoading(true);
    try {
      const cardNoRaw = card?.cardNo ?? '';
      const result = await activatePhysicalCard(cardNoRaw, pin.trim(), activeCode.trim());
      if (result.ok) {
        s.showToast?.('Physical card activated successfully!');
        if (s.reloadAccount) await s.reloadAccount();
        onClose();
      } else {
        setErrorMsg(result.message ?? 'Activation failed. Please check details and try again.');
      }
    } catch (err) {
      setErrorMsg(err.message ?? 'Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-sheet" role="dialog" aria-modal="true" aria-label="Activate Physical Card">
      <button type="button" className="portal-sheet__backdrop" onClick={onClose} aria-label="Close" />
      <div className="portal-sheet__panel" style={{ paddingBottom: '32px' }}>
        <div className="portal-sheet__head">
          <h3 className="portal-sheet__title">Activate Physical Card</h3>
          <button type="button" className="portal-sheet__close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>

        <p className="portal-card-onboard-sheet__sub" style={{ marginBottom: '20px' }}>
          Activate your {cardNoDisplay}. Set your 6-digit payment PIN and enter the active code.
        </p>

        {isAlreadyActive && (
          <div className="cregister-alert cregister-alert--info" style={{ marginBottom: '16px', padding: '10px', borderRadius: '6px', background: '#EBF8FF', color: '#2B6CB0', fontSize: '14px' }} role="status">
            This card is already active and ready for use.
          </div>
        )}

        {errorMsg && (
          <div className="cregister-alert cregister-alert--error" style={{ marginBottom: '16px', padding: '10px', borderRadius: '6px', background: '#FFF0F0', color: '#E53E3E', fontSize: '14px' }} role="alert">
            {errorMsg}
          </div>
        )}

        <div className="cregister-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label className="cregister-field">
            <span className="cregister-field__label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500' }}>
              Set Card PIN (6 digits)
            </span>
            <input
              className="cregister-input cregister-input--mono"
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••••"
              value={pin}
              disabled={isAlreadyActive}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #D2D6DC', fontSize: '16px', backgroundColor: isAlreadyActive ? '#F7FAFC' : '#FFFFFF', cursor: isAlreadyActive ? 'not-allowed' : 'auto' }}
              onChange={(e) => {
                setErrorMsg('');
                setPin(e.target.value.replace(/\D/g, '').slice(0, 6));
              }}
            />
          </label>

          <label className="cregister-field">
            <span className="cregister-field__label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500' }}>
              Active Code (Verification Code)
            </span>
            <input
              className="cregister-input cregister-input--mono"
              type="text"
              inputMode="numeric"
              placeholder="Enter active code"
              value={activeCode}
              disabled={isAlreadyActive}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #D2D6DC', fontSize: '16px', backgroundColor: isAlreadyActive ? '#F7FAFC' : '#FFFFFF', cursor: isAlreadyActive ? 'not-allowed' : 'auto' }}
              onChange={(e) => {
                setErrorMsg('');
                setActiveCode(e.target.value.replace(/\D/g, ''));
              }}
            />
            <span style={{ fontSize: '11px', color: '#718096', marginTop: '4px', display: 'block' }}>
              This code was sent to your email after card assignment.
            </span>
          </label>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
          <button
            type="button"
            className="portal-btn-secondary"
            style={{ flex: 1, padding: '12px', borderRadius: '6px', fontWeight: '500' }}
            onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="portal-btn-primary"
            style={{ flex: 1, padding: '12px', borderRadius: '6px', fontWeight: '500', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: isAlreadyActive ? '#CBD5E0' : undefined, cursor: isAlreadyActive ? 'not-allowed' : 'pointer' }}
            disabled={loading || isAlreadyActive}
            onClick={handleActivate}>
            {loading ? <span className="portal-spin" style={{ width: '16px', height: '16px' }} /> : (isAlreadyActive ? 'Card Active' : 'Activate Card')}
          </button>
        </div>
      </div>
    </div>
  );
}
