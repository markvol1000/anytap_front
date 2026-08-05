import { useState } from 'react';
import { Icon } from '../ui.jsx';
import { activatePhysicalCard } from '../../lib/services/accountService.js';

export function PhysicalCardActivateSheet({ s, open, onClose }) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!open) return null;

  const card = s.activePhysicalTargetCard ?? s.currentCard;
  const cardNoDisplay = card?.last4 ? `Card ending in ${card.last4}` : 'Physical Card';
  const isAlreadyActive = card?.status === 'active';

  const handleActivate = async () => {
    if (isAlreadyActive) return;
    setErrorMsg('');

    if (pin.trim().length !== 6 || !/^\d{6}$/.test(pin)) {
      setErrorMsg('PIN must be exactly 6 digits.');
      return;
    }

    if (pin !== confirmPin) {
      setErrorMsg('PINs do not match.');
      return;
    }

    // Rule 2: Cannot be 3 or more consecutive repeated digits (e.g. 111)
    for (let i = 0; i <= 3; i++) {
      if (pin[i] === pin[i+1] && pin[i] === pin[i+2]) {
        setErrorMsg('PIN cannot contain 3 or more consecutive repeated digits (e.g., 111).');
        return;
      }
    }

    // Rule 3: Cannot be ascending or descending order (e.g. 123456, 654321)
    const asc = '0123456789';
    const desc = '9876543210';
    if (asc.includes(pin) || desc.includes(pin)) {
      setErrorMsg('PIN cannot be in consecutive ascending or descending order (e.g., 123456).');
      return;
    }

    // Rule 4: Cannot contain repeated 2- or 3-digit segments (e.g., 121212, 123123)
    if (pin.slice(0, 2) === pin.slice(2, 4) && pin.slice(0, 2) === pin.slice(4, 6)) {
      setErrorMsg('PIN cannot contain repeated 2-digit segments (e.g., 909090).');
      return;
    }
    if (pin.slice(0, 3) === pin.slice(3, 6)) {
      setErrorMsg('PIN cannot contain repeated 3-digit segments (e.g., 123123).');
      return;
    }

    setLoading(true);
    try {
      const cardNoRaw = card?.cardNo ?? card?.id ?? '';
      const result = await activatePhysicalCard(cardNoRaw, pin.trim(), ''); // activeCode is resolved by backend
      if (result.ok) {
        s.showToast?.('Physical card activated successfully!');
        if (s.reloadAccount) await s.reloadAccount();
        onClose();
      } else {
        setErrorMsg(result.message ?? 'Activation failed.');
      }
    } catch (err) {
      setErrorMsg(err.message ?? 'Activation failed.');
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
          Activate your {cardNoDisplay}. Set your 6-digit payment PIN to activate your card.
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
            <span style={{ color: '#6B7280', fontSize: '12px', marginTop: '4px', display: 'block', fontWeight: '500' }}>
              ATM withdrawals use only the first 4 digits of your PIN.
            </span>
          </label>

          <label className="cregister-field">
            <span className="cregister-field__label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500' }}>
              Confirm Card PIN
            </span>
            <input
              className="cregister-input cregister-input--mono"
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••••"
              value={confirmPin}
              disabled={isAlreadyActive}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #D2D6DC', fontSize: '16px', backgroundColor: isAlreadyActive ? '#F7FAFC' : '#FFFFFF', cursor: isAlreadyActive ? 'not-allowed' : 'auto' }}
              onChange={(e) => {
                setErrorMsg('');
                setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6));
              }}
            />
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
            style={{ 
              flex: 1, 
              padding: '12px', 
              borderRadius: '6px', 
              fontWeight: '500', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              backgroundColor: (loading || isAlreadyActive) ? '#CBD5E0' : undefined, 
              cursor: (loading || isAlreadyActive) ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
            disabled={loading || isAlreadyActive}
            onClick={handleActivate}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="portal-spin" style={{ width: '16px', height: '16px' }} />
                <span>Activating...</span>
              </span>
            ) : (isAlreadyActive ? 'Card Active' : 'Activate Card')}
          </button>
        </div>
      </div>
    </div>
  );
}
