/** Admin portal mock seed data — replace via adminService when Supabase/API is wired. */

export const MAX_CARDS_PER_MEMBER = 3;

export const ADMIN_USER = {
  id: 'admin-001',
  name: 'Sarah Kim',
  email: 'test@test.co.kr',
  role: 'super_admin',
};

const now = new Date('2026-06-24T10:00:00Z');

export function seedMembers() {
  return [
    {
      id: 'M-10001',
      name: 'Alex Chen',
      email: 'alex.chen@mail.com',
      country: 'Singapore',
      joinDate: '2026-06-20',
      kycStatus: 'approved',
      cardStatus: 'active',
      walletBalance: 2840.5,
      referralStatus: 'partner',
      accountStatus: 'active',
      phone: '+65 9123 4567',
      memo: '',
    },
    {
      id: 'M-10002',
      name: 'Maria Santos',
      email: 'maria.s@mail.com',
      country: 'Philippines',
      joinDate: '2026-06-22',
      kycStatus: 'pending',
      cardStatus: 'none',
      walletBalance: 0,
      referralStatus: 'none',
      accountStatus: 'active',
      phone: '+63 917 000 1111',
      memo: '',
    },
    {
      id: 'M-10003',
      name: 'James Park',
      email: 'j.park@mail.com',
      country: 'South Korea',
      joinDate: '2026-06-23',
      kycStatus: 'approved',
      cardStatus: 'applied',
      walletBalance: 520.0,
      referralStatus: 'applicant',
      accountStatus: 'active',
      phone: '+82 10 2345 6789',
      memo: 'VIP onboarding',
    },
    {
      id: 'M-10004',
      name: 'Emily Wong',
      email: 'emily.w@mail.com',
      country: 'Hong Kong',
      joinDate: '2026-06-18',
      kycStatus: 'rejected',
      cardStatus: 'none',
      walletBalance: 0,
      referralStatus: 'none',
      accountStatus: 'suspended',
      phone: '+852 9000 1234',
      memo: 'KYC resubmit requested',
    },
    {
      id: 'M-10005',
      name: 'David Miller',
      email: 'david.m@mail.com',
      country: 'United States',
      joinDate: '2026-06-24',
      kycStatus: 'pending',
      cardStatus: 'none',
      walletBalance: 150.0,
      referralStatus: 'none',
      accountStatus: 'active',
      phone: '+1 415 555 0199',
      memo: '',
    },
    {
      id: 'M-10006',
      name: 'Yuki Tanaka',
      email: 'yuki.t@mail.com',
      country: 'Japan',
      joinDate: '2026-06-15',
      kycStatus: 'approved',
      cardStatus: 'active',
      walletBalance: 9120.75,
      referralStatus: 'partner',
      accountStatus: 'active',
      phone: '+81 90 1234 5678',
      memo: '',
    },
    {
      id: 'M-10007',
      name: 'Priya Sharma',
      email: 'priya.s@mail.com',
      country: 'India',
      joinDate: '2026-06-21',
      kycStatus: 'approved',
      cardStatus: 'frozen',
      walletBalance: 340.2,
      referralStatus: 'none',
      accountStatus: 'active',
      phone: '+91 98 7654 3210',
      memo: 'Card frozen — fraud review',
    },
    {
      id: 'M-10008',
      name: 'Lucas Ferreira',
      email: 'lucas.f@mail.com',
      country: 'Brazil',
      joinDate: '2026-06-19',
      kycStatus: 'approved',
      cardStatus: 'active',
      walletBalance: 1890.0,
      referralStatus: 'member',
      accountStatus: 'active',
      phone: '+55 11 98765 4321',
      memo: '',
    },
  ];
}

export function seedKycApplications(members) {
  return members
    .filter((m) => m.kycStatus !== 'approved' || m.id === 'M-10001')
    .map((m, i) => ({
      id: `KYC-${1000 + i}`,
      memberId: m.id,
      memberName: m.name,
      memberEmail: m.email,
      country: m.country,
      status: m.kycStatus === 'none' ? 'pending' : m.kycStatus,
      submittedAt: m.joinDate,
      documentType: 'Passport',
      idDocumentUrl: '/assets/admin/mock-id.svg',
      selfieUrl: '/assets/admin/mock-selfie.svg',
      rejectReason: m.kycStatus === 'rejected' ? 'Document expired' : '',
    }));
}

export function seedCardApplications(members) {
  const types = ['virtual', 'physical'];
  return members.flatMap((m, mi) => {
    if (m.cardStatus === 'none') return [];
    const count = m.id === 'M-10006' ? 2 : 1;
    return Array.from({ length: count }, (_, ci) => ({
      id: `CAP-${mi}${ci}`,
      memberId: m.id,
      memberName: m.name,
      cardType: types[ci % 2],
      status: m.cardStatus === 'applied' ? 'pending' : m.cardStatus === 'frozen' ? 'frozen' : 'active',
      wallet: `0x${m.id.slice(-4)}…a3f2`,
      created: m.joinDate,
      last4: m.cardStatus === 'active' || m.cardStatus === 'frozen' ? `${4920 + mi}` : null,
    }));
  });
}

export function seedWallets(members) {
  return members.map((m, i) => ({
    id: `W-${2000 + i}`,
    memberId: m.id,
    memberName: m.name,
    address: `0x742d35Cc6634C0532925a3b844Bc454e4438f44${i}`,
    balance: m.walletBalance,
    status: m.accountStatus === 'suspended' ? 'locked' : 'active',
    network: 'TRC20',
    created: m.joinDate,
  }));
}

export function seedTransactions(members) {
  const kinds = ['wallet_topup', 'card_topup', 'card_spend', 'wallet_withdraw', 'refund', 'wallet_receive'];
  const rows = [];
  members.forEach((m, mi) => {
    for (let i = 0; i < 4; i++) {
      const kind = kinds[(mi + i) % kinds.length];
      const isPendingDeposit = kind === 'wallet_receive' && mi < 4;
      rows.push({
        id: `TX-${3000 + mi * 10 + i}`,
        memberId: m.id,
        memberName: m.name,
        kind,
        category: kind.includes('card') ? 'card' : 'wallet',
        amount: 50 + mi * 20 + i * 15,
        currency: 'USDT',
        status: isPendingDeposit ? 'pending' : (i === 0 && mi === 1 ? 'pending' : 'completed'),
        at: new Date(now.getTime() - (mi * 4 + i) * 3600000).toISOString(),
        reference: `AT-ADM-${3000 + mi * 10 + i}`,
      });
    }
  });
  return rows.sort((a, b) => new Date(b.at) - new Date(a.at));
}

export function seedReferrals(members) {
  return members
    .filter((m) => m.referralStatus !== 'none')
    .map((m, i) => ({
      id: `REF-${4000 + i}`,
      memberId: m.id,
      memberName: m.name,
      referralCode: `ANY${m.name.split(' ')[0].toUpperCase()}${100 + i}`,
      rewardBalance: m.referralStatus === 'partner' ? 128.5 + i * 40 : 0,
      available: m.referralStatus === 'partner' ? 98.5 + i * 30 : 0,
      pending: m.referralStatus === 'applicant' ? 25 : 0,
      members: m.referralStatus === 'partner' ? 12 + i * 3 : 0,
      status: m.referralStatus,
    }));
}

export function seedWithdrawals(members) {
  return [
    {
      id: 'WD-5001',
      memberId: 'M-10001',
      memberName: 'Alex Chen',
      amount: 500,
      wallet: '0x742d35Cc…f44e',
      status: 'pending',
      date: '2026-06-24',
      txHash: '',
      memo: '',
    },
    {
      id: 'WD-5002',
      memberId: 'M-10006',
      memberName: 'Yuki Tanaka',
      amount: 1200,
      wallet: '0x742d35Cc…f446',
      status: 'approved',
      date: '2026-06-23',
      txHash: '0xabc123def456',
      memo: 'Processed via TRC20',
    },
    {
      id: 'WD-5003',
      memberId: 'M-10008',
      memberName: 'Lucas Ferreira',
      amount: 250,
      wallet: '0x742d35Cc…f447',
      status: 'rejected',
      date: '2026-06-22',
      txHash: '',
      memo: 'Insufficient verification',
    },
  ];
}

export function seedNotifications() {
  return [
    { id: 'N-1', type: 'announcement', title: 'System maintenance Jun 28', status: 'scheduled', scheduledAt: '2026-06-28T02:00:00Z' },
    { id: 'N-2', type: 'push', title: 'New card features available', status: 'sent', scheduledAt: '2026-06-20T09:00:00Z' },
    { id: 'N-3', type: 'email', title: 'KYC reminder campaign', status: 'draft', scheduledAt: null },
    { id: 'N-4', type: 'banner', title: 'Summer referral bonus', status: 'active', scheduledAt: '2026-06-15T00:00:00Z' },
  ];
}

export function seedContentItems() {
  return [
    { id: 'C-1', slug: 'homepage-banner', label: 'Homepage Banner', updatedAt: '2026-06-20', status: 'published' },
    { id: 'C-2', slug: 'faq', label: 'FAQ', updatedAt: '2026-06-18', status: 'published' },
    { id: 'C-3', slug: 'about', label: 'About', updatedAt: '2026-06-10', status: 'published' },
    { id: 'C-4', slug: 'terms', label: 'Terms', updatedAt: '2026-06-01', status: 'published' },
    { id: 'C-5', slug: 'privacy', label: 'Privacy', updatedAt: '2026-06-01', status: 'published' },
    { id: 'C-6', slug: 'support', label: 'Support', updatedAt: '2026-06-22', status: 'draft' },
  ];
}

export function seedSettings() {
  return {
    cardFeeUsdt: 15,
    topUpFeePercent: 0.5,
    minWithdrawalUsdt: 50,
    referralRatePercent: 2.5,
    supportedNetworks: ['TRC20', 'ERC20'],
    maintenanceMode: false,
  };
}

export function seedAdminLogs() {
  return [
    { id: 'LOG-1', adminId: 'admin-001', adminName: 'Sarah Kim', action: 'Approved KYC', target: 'M-10001', at: '2026-06-24T09:12:00Z' },
    { id: 'LOG-2', adminId: 'admin-001', adminName: 'Sarah Kim', action: 'Froze card', target: 'CAP-62', at: '2026-06-24T08:45:00Z' },
    { id: 'LOG-3', adminId: 'admin-002', adminName: 'Mike Lee', action: 'Rejected withdrawal', target: 'WD-5003', at: '2026-06-23T16:30:00Z' },
    { id: 'LOG-4', adminId: 'admin-001', adminName: 'Sarah Kim', action: 'Updated system config', target: 'Settings', at: '2026-06-23T11:00:00Z' },
    { id: 'LOG-5', adminId: 'admin-002', adminName: 'Mike Lee', action: 'Suspended member', target: 'M-10004', at: '2026-06-22T14:20:00Z' },
  ];
}

export function computePendingTasks(store) {
  return {
    pendingKyc: store.kycApplications.filter((k) => k.status === 'pending').length,
    cardApplications: store.cardApplications.filter((c) => c.status === 'pending').length,
    withdrawalRequests: store.withdrawals.filter((w) => w.status === 'pending').length,
    depositVerification: store.transactions.filter(
      (t) => t.kind === 'wallet_receive' && t.status === 'pending',
    ).length,
  };
}

export function computeSystemSummary(store) {
  const members = store.members;
  const today = '2026-06-24';
  return {
    members: members.length,
    wallets: store.wallets.length,
    cards: store.cardApplications.filter((c) => c.status === 'active').length,
    todayTopUp: store.transactions
      .filter((t) => (t.kind === 'wallet_topup' || t.kind === 'card_topup') && t.at.startsWith(today))
      .reduce((s, t) => s + t.amount, 0),
    todayPayments: store.transactions
      .filter((t) => t.kind === 'card_spend' && t.at.startsWith(today))
      .reduce((s, t) => s + t.amount, 0),
    referralRewards: store.referrals.reduce((s, r) => s + r.rewardBalance, 0),
    walletAssets: store.wallets.reduce((s, w) => s + w.balance, 0),
    systemStatus: store.settings.maintenanceMode ? 'maintenance' : 'operational',
  };
}

export function computeDashboardKpis(store) {
  const pending = computePendingTasks(store);
  const summary = computeSystemSummary(store);
  return {
    ...summary,
    ...pending,
    totalMembers: summary.members,
    newMembersToday: store.members.filter((m) => m.joinDate === '2026-06-24').length,
    pendingCardApplications: pending.cardApplications,
    activeCards: summary.cards,
    walletBalanceTotal: summary.walletAssets,
    pendingWithdrawals: pending.withdrawalRequests,
  };
}
