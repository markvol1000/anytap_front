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

export function formatUsdt(amount) {
  if (amount == null) return '—';
  return `${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;
}

export function shortenAddress(addr, head = 6, tail = 4) {
  if (!addr || addr.length <= head + tail + 2) return addr ?? '—';
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}
