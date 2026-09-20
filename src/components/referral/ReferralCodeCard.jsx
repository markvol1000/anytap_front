import React, { useMemo } from 'react';
import QRCode from 'qrcode';
import { Icon } from '../ui.jsx';

function buildReferralQrSvg(text) {
  const str = String(text || '').trim();
  if (!str) {
    return '<svg viewBox="0 0 100 100" width="100%" height="100%"><rect width="100" height="100" fill="#f8fafc" rx="6"/><text x="50" y="53" fill="#94a3b8" font-size="10" text-anchor="middle" font-family="sans-serif">No Link</text></svg>';
  }
  try {
    const qr = QRCode.create(str, { errorCorrectionLevel: 'M' });
    const n = qr.modules.size;
    const margin = 1;
    const total = n + margin * 2;
    let path = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.modules.get(r, c)) {
          path += `M${c + margin},${r + margin}h1v1h-1z`;
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="100%" height="100%" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="#ffffff" rx="2"/><path d="${path}" fill="#0f172a"/></svg>`;
  } catch (err) {
    console.error('[ReferralCodeCard] Failed to generate QR code:', err);
    return '<svg viewBox="0 0 100 100" width="100%" height="100%"><rect width="100" height="100" fill="#f8fafc" rx="6"/><text x="50" y="53" fill="#ef4444" font-size="10" text-anchor="middle" font-family="sans-serif">Error</text></svg>';
  }
}

function ReferralQr({ value = '' }) {
  const svgContent = useMemo(() => buildReferralQrSvg(value), [value]);

  return (
    <div
      className="portal-ref-dash__qr"
      style={{
        width: '84px',
        height: '84px',
        padding: '6px',
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '10px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
      aria-label="Scan referral QR code"
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}

export function ReferralCodeCard({ code = '', inviteLink = '', onCopy, onShare }) {
  const safeCode = code || '—';
  const defaultOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://www.anytap.io';
  const safeLink = inviteLink || (code ? `${defaultOrigin}/sign-up?ref=${code}` : '');
  const qrTarget = safeLink || (code ? `https://www.anytap.io/sign-up?ref=${code}` : '');

  const handleShare = async () => {
    if (navigator.share && safeLink) {
      try {
        await navigator.share({ title: 'Join Anytap', text: 'Sign up with my referral link', url: safeLink });
        return;
      } catch { /* fall through */ }
    }
    onShare?.();
  };

  return (
    <section className="portal-ref-dash__code portal-dash-panel" aria-labelledby="referral-code-title">
      <h2 id="referral-code-title" className="portal-ref-dash__section-title">Your Referral Code</h2>

      <p className="portal-ref-dash__code-val">{safeCode}</p>

      <div className="portal-ref-dash__code-actions">
        <button
          type="button"
          className="portal-btn-primary portal-ref-dash__code-btn"
          disabled={!code}
          onClick={() => onCopy?.(code, 'Referral code copied')}>
          <Icon name="copy" size={16} stroke={1.75} />
          Copy
        </button>
        <button type="button" className="portal-btn-secondary portal-ref-dash__code-btn" disabled={!code} onClick={handleShare}>
          <Icon name="share" size={16} stroke={1.75} />
          Share
        </button>
      </div>

      <div className="portal-ref-dash__code-meta">
        <ReferralQr value={qrTarget} />
        <div className="portal-ref-dash__link-block">
          <span className="portal-ref-dash__link-label">Referral Link</span>
          <p className="portal-ref-dash__link-val">{safeLink || '—'}</p>
          <button
            type="button"
            className="portal-btn-secondary portal-ref-dash__link-copy"
            disabled={!safeLink}
            onClick={() => onCopy?.(safeLink, 'Referral link copied')}>
            <Icon name="copy" size={14} stroke={1.75} />
            Copy link
          </button>
        </div>
      </div>
    </section>
  );
}
