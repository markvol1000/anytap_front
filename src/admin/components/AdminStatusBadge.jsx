const STATUS_MAP = {
  active: { label: 'Active', tone: 'success' },
  approved: { label: 'Approved', tone: 'success' },
  operational: { label: 'Operational', tone: 'success' },
  sent: { label: 'Sent', tone: 'success' },
  published: { label: 'Published', tone: 'success' },
  pending: { label: 'Pending', tone: 'warning' },
  applied: { label: 'Applied', tone: 'warning' },
  draft: { label: 'Draft', tone: 'neutral' },
  scheduled: { label: 'Scheduled', tone: 'info' },
  rejected: { label: 'Rejected', tone: 'danger' },
  suspended: { label: 'Suspended', tone: 'danger' },
  frozen: { label: 'Frozen', tone: 'info' },
  locked: { label: 'Locked', tone: 'danger' },
  terminated: { label: 'Terminated', tone: 'neutral' },
  none: { label: 'None', tone: 'neutral' },
  partner: { label: 'Partner', tone: 'success' },
  applicant: { label: 'Applicant', tone: 'warning' },
  member: { label: 'Member', tone: 'info' },
  maintenance: { label: 'Maintenance', tone: 'danger' },
  issued: { label: 'Issued', tone: 'info' },
  pending_wallet: { label: 'Pending Wallet', tone: 'warning' },
  shipping: { label: 'Shipping', tone: 'info' },
  creating: { label: 'Creating', tone: 'warning' },
  deposit_received: { label: 'Deposit Received', tone: 'warning' },
  application_review: { label: 'Under Review', tone: 'warning' },
  blocked: { label: 'Blocked', tone: 'danger' },
  freeze: { label: 'Frozen', tone: 'info' },
  not_issued: { label: 'Not Issued', tone: 'neutral' },
  success: { label: 'Success', tone: 'success' },
  completed: { label: 'Completed', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
  error: { label: 'Error', tone: 'danger' },
};

export function AdminStatusBadge({ status, label }) {
  const key = String(status ?? 'none').toLowerCase();
  const meta = STATUS_MAP[key] ?? { label: label ?? status ?? '—', tone: 'neutral' };
  return (
    <span className={`admin-badge admin-badge--${meta.tone}`}>
      {label ?? meta.label}
    </span>
  );
}

export function formatAdminDate(value) {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

export function normalizeDisplayCurrency(currency = '') {
  if (!currency) return '';
  const trimmed = String(currency).trim();
  const upper = trimmed.toUpperCase();

  // Cregis TRON (195) TRC-20 USDT contract addresses or truncated forms (e.g. 195@TR7NHQJEKQXGTCI8...)
  if (upper.includes('TR7NH') || upper.includes('TG3XX')) {
    return 'USDT';
  }
  // Cregis Ethereum (60) ERC-20 USDT
  if (upper.includes('0XDAC17F')) {
    return 'USDT';
  }
  // Cregis Ethereum (60) ERC-20 USDC
  if (upper.includes('0XA0B869')) {
    return 'USDC';
  }
  // Native Cregis coin tokens (195@195 -> TRX, 60@60 -> ETH, 0@0 -> BTC)
  if (upper === '195@195' || upper === '195') {
    return 'TRX';
  }
  if (upper === '60@60' || upper === '60') {
    return 'ETH';
  }
  if (upper === '0@0' || upper === '0') {
    return 'BTC';
  }

  return trimmed;
}

export function cleanTransactionDescription(desc = '') {
  if (!desc) return '';
  return String(desc)
    .replace(/195@TR7NH[a-zA-Z0-9]*/gi, 'USDT')
    .replace(/195@TG3XX[a-zA-Z0-9]*/gi, 'USDT')
    .replace(/60@0xdac17f[a-zA-Z0-9]*/gi, 'USDT')
    .replace(/60@0xa0b869[a-zA-Z0-9]*/gi, 'USDC');
}

export function formatAmountWithCurrency(amount, currency = '') {
  if (amount == null || amount === '') return '—';
  const num = Number(amount);
  if (Number.isNaN(num)) return '—';

  const rawCode = normalizeDisplayCurrency(currency);
  const code = rawCode.toUpperCase();

  if (code === 'IDR' || code === 'RP') {
    return `${num.toLocaleString('id-ID', { maximumFractionDigits: 0 })} IDR`;
  }
  if (code === 'KRW' || code === '₩') {
    return `${num.toLocaleString('ko-KR', { maximumFractionDigits: 0 })} KRW`;
  }
  if (code === 'JPY' || code === '¥') {
    return `${num.toLocaleString('ja-JP', { maximumFractionDigits: 0 })} JPY`;
  }
  if (code === 'USD' || code === '$') {
    return `${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
  }
  if (code === 'EUR' || code === '€') {
    return `${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`;
  }
  if (code === 'SGD' || code === 'S$') {
    return `${num.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SGD`;
  }
  if (code === 'HKD' || code === 'HK$') {
    return `${num.toLocaleString('en-HK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} HKD`;
  }
  if (code === 'CNY' || code === 'RMB') {
    return `${num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CNY`;
  }
  if (code === 'PHP' || code === '₱') {
    return `${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PHP`;
  }

  if (!code) {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  return `${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${code}`;
}

export function formatUsdt(amount, currency = '') {
  return formatAmountWithCurrency(amount, currency);
}

export function shortenAddress(addr, head = 6, tail = 4) {
  if (!addr || addr.length <= head + tail + 2) return addr ?? '—';
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}
