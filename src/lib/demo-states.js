/**
 * Preview / handoff demo links — seed accounts from member-state-handoff.md
 * Password for all: test1234
 *
 * Groups:
 * - dashboard: memberState ①~⑥ on /account
 * - pages: sub-routes the backend needs to wire (fields listed in apiNeeds)
 * - admin: /admin/* screens (mock admin test@test.co.kr)
 *
 * sessionOverride: applied after login so preview matches intended UI even when
 * the API still returns APPROVED / wrong cardStatus (common for ①② today).
 */

export const DEMO_SEED_PASSWORD = 'test1234';

/**
 * @typedef {{
 *   slug: string,
 *   group: 'dashboard' | 'pages' | 'admin',
 *   label: string,
 *   email: string,
 *   loginId: string,
 *   note: string,
 *   path?: string,
 *   apiNeeds?: string[],
 *   sessionOverride?: Record<string, unknown>,
 * }} DemoMemberState
 */

/** Force UI state for demo preview (ignores wrong backend seed fields). */
function lock(fields) {
  return { demoLockState: true, ...fields };
}

const PRE_WALLET = {
  walletExists: false,
  cregisWalletAddress: '',
  needsActivation: false,
};

/** @type {DemoMemberState[]} */
export const DEMO_MEMBER_STATES = [
  // ── Dashboard ①~⑥ ───────────────────────────────────────────
  {
    slug: 'kyc-required',
    group: 'dashboard',
    label: '① KYC Required',
    email: 'kyc-required@anytap.io',
    loginId: 'kycreq001',
    note: 'KYC 미시작 · 데모에서 PENDING 강제 (백엔드 seed 대기)',
    path: '/account',
    apiNeeds: ['kycStatus=PENDING', 'cardStatus=not_issued'],
    sessionOverride: lock({
      kycStatus: 'PENDING',
      cardStatus: 'not_issued',
      ...PRE_WALLET,
    }),
  },
  {
    slug: 'kyc-pending',
    group: 'dashboard',
    label: '② KYC Pending',
    email: 'kyc-pending@anytap.io',
    loginId: 'kycpend001',
    note: 'KYC 심사중 · 데모에서 UNDER_REVIEW 강제 (백엔드 seed 대기)',
    path: '/account',
    apiNeeds: ['kycStatus=UNDER_REVIEW|REJECTED', 'cardStatus=not_issued'],
    sessionOverride: lock({
      kycStatus: 'UNDER_REVIEW',
      cardStatus: 'not_issued',
      ...PRE_WALLET,
    }),
  },
  {
    slug: 'card-ready',
    group: 'dashboard',
    label: '③ Card Apply Ready',
    email: 'card-ready@anytap.io',
    loginId: 'cardready001',
    note: 'Identity verified · Apply Card',
    path: '/account',
    apiNeeds: ['kycStatus=APPROVED', 'cardStatus=not_issued'],
    sessionOverride: lock({
      kycStatus: 'APPROVED',
      cardStatus: 'not_issued',
      ...PRE_WALLET,
    }),
  },
  {
    slug: 'card-deposit',
    group: 'dashboard',
    label: '④ Issuing · $100 deposit',
    email: 'card-deposit@anytap.io',
    loginId: 'deposit001',
    note: '발급비 입금 지갑 + QR 노출',
    path: '/account',
    apiNeeds: [
      'cardStatus=application_review',
      'issuanceDepositAddress',
      'issuanceDepositAmount=100',
    ],
    sessionOverride: lock({
      kycStatus: 'APPROVED',
      cardStatus: 'application_review',
      ...PRE_WALLET,
    }),
  },
  {
    slug: 'card-shipping',
    group: 'dashboard',
    label: '④ Issuing · Shipping',
    email: 'card-shipping@anytap.io',
    loginId: 'shipping001',
    note: '배송중 · 입금 지갑 숨김',
    path: '/account',
    apiNeeds: [
      'cardStatus=shipping',
      'trackingNumber',
      'carrier',
      'estimatedDelivery?',
    ],
    sessionOverride: lock({
      kycStatus: 'APPROVED',
      cardStatus: 'shipping',
      trackingNumber: '1Z999AA10123456784',
      carrier: 'DHL',
      ...PRE_WALLET,
    }),
  },
  {
    slug: 'activate-card',
    group: 'dashboard',
    label: '⑤ Activate Card',
    email: 'activate-card@anytap.io',
    loginId: 'activate001',
    note: '수령 후 카드 등록',
    path: '/account',
    apiNeeds: [
      'cardStatus=issued',
      'needsActivation=true',
      'walletExists=false',
      'cregisWalletAddress=null',
    ],
    sessionOverride: lock({
      kycStatus: 'APPROVED',
      cardStatus: 'issued',
      needsActivation: true,
      walletExists: false,
      cregisWalletAddress: '',
    }),
  },
  {
    slug: 'active-card',
    group: 'dashboard',
    label: '⑥ Card Active',
    email: 'active-card@anytap.io',
    loginId: 'active001',
    note: '개인 지갑 + 카드 사용',
    path: '/account',
    apiNeeds: [
      'cardStatus=active',
      'walletExists=true',
      'cregisWalletAddress',
      'walletBalance',
      'cards[]',
    ],
    sessionOverride: lock({
      kycStatus: 'APPROVED',
      cardStatus: 'active',
      needsActivation: false,
      walletExists: true,
      cregisWalletAddress: '',
      walletBalance: 128.5,
      zeroBalance: false,
    }),
  },
  {
    slug: 'zero-balance',
    group: 'dashboard',
    label: '⑥ Zero Balance',
    email: 'zero-balance@anytap.io',
    loginId: 'zerobal001',
    note: '잔액 0 · Top Up 유도',
    path: '/account',
    apiNeeds: [
      'cardStatus=active',
      'walletExists=true',
      'walletBalance=0',
      'cregisWalletAddress',
    ],
    sessionOverride: lock({
      kycStatus: 'APPROVED',
      cardStatus: 'active',
      needsActivation: false,
      walletExists: true,
      cregisWalletAddress: '',
      walletBalance: 0,
      zeroBalance: true,
    }),
  },

  // ── Pages (백엔드 필드 확인용) ────────────────────────────────
  {
    slug: 'page-card-apply',
    group: 'pages',
    label: 'Card Apply · 신청 플로우',
    email: 'card-ready@anytap.io',
    loginId: 'cardready001',
    note: '③에서 카드 신청 다단계. 제출 후 cardStatus → application_review',
    path: '/account/card-apply',
    apiNeeds: [
      'kycStatus=APPROVED',
      'cardStatus=not_issued',
      'POST card application → application_review',
      '응답에 issuanceDepositAddress 준비',
    ],
    sessionOverride: lock({
      kycStatus: 'APPROVED',
      cardStatus: 'not_issued',
      ...PRE_WALLET,
    }),
  },
  {
    slug: 'page-kyc-entry',
    group: 'pages',
    label: 'KYC entry · 본인인증 + 신분증 촬영',
    email: 'kyc-required@anytap.io',
    loginId: 'kycreq001',
    note: '로그인 없이 KYC 폼·카메라/업로드 UI 미리보기 (kycStatus=PENDING 강제)',
    path: '/account/kyc',
    apiNeeds: [
      'kycStatus=PENDING',
      'KYC submit API',
      '제출 후 kycStatus → UNDER_REVIEW',
    ],
    sessionOverride: lock({
      kycStatus: 'PENDING',
      cardStatus: 'not_issued',
      ...PRE_WALLET,
    }),
  },
  {
    slug: 'page-issuance-deposit',
    group: 'pages',
    label: 'Issuance deposit · 발급비 $100',
    email: 'card-deposit@anytap.io',
    loginId: 'deposit001',
    note: '대시보드의 발급비 주소·QR. 개인 Top Up 페이지와 별개',
    path: '/account',
    apiNeeds: [
      'cardStatus=application_review|deposit_received|creating',
      'issuanceDepositAddress (TRC20)',
      'issuanceDepositAmount',
      '입금 확인 후 cardStatus → deposit_received',
    ],
    sessionOverride: lock({
      kycStatus: 'APPROVED',
      cardStatus: 'application_review',
      ...PRE_WALLET,
    }),
  },
  {
    slug: 'page-shipping',
    group: 'pages',
    label: 'Shipping · 배송 추적',
    email: 'card-shipping@anytap.io',
    loginId: 'shipping001',
    note: '발급비 지갑 숨김 + Track CTA',
    path: '/account',
    apiNeeds: [
      'cardStatus=shipping',
      'trackingNumber',
      'carrier',
      'estimatedDelivery?',
      'issuanceDepositAddress 내려오지 않음(또는 무시)',
    ],
    sessionOverride: lock({
      kycStatus: 'APPROVED',
      cardStatus: 'shipping',
      trackingNumber: '1Z999AA10123456784',
      carrier: 'DHL',
      ...PRE_WALLET,
    }),
  },
  {
    slug: 'page-card-register',
    group: 'pages',
    label: 'Card Register · 수령 후 등록',
    email: 'activate-card@anytap.io',
    loginId: 'activate001',
    note: '⑤ 카드번호·만료·CVV 등록 (B2B·B2C 공통)',
    path: '/account/card-register',
    apiNeeds: [
      'cardStatus=issued',
      'needsActivation=true',
      'POST register → cardStatus=active',
      '등록 후 cregisWalletAddress + walletExists=true',
    ],
    sessionOverride: lock({
      kycStatus: 'APPROVED',
      cardStatus: 'issued',
      needsActivation: true,
      walletExists: false,
      cregisWalletAddress: '',
    }),
  },
  {
    slug: 'page-my-card',
    group: 'pages',
    label: 'My Card · 카드 상세',
    email: 'active-card@anytap.io',
    loginId: 'active001',
    note: '⑥ 보유 카드·마스킹·동결 등',
    path: '/account/card',
    apiNeeds: [
      'cards[] (type, bin, last4, status, balance?)',
      'cardStatus=active|frozen',
      'cardCount ≤ 3',
      'PAN/CVV 조회 API (필요 시)',
    ],
    sessionOverride: lock({
      kycStatus: 'APPROVED',
      cardStatus: 'active',
      needsActivation: false,
      walletExists: true,
      cregisWalletAddress: '',
      walletBalance: 128.5,
    }),
  },
  {
    slug: 'page-wallet-topup',
    group: 'pages',
    label: 'Wallet Top Up · 개인 지갑',
    email: 'active-card@anytap.io',
    loginId: 'active001',
    note: '⑥ 개인 Cregis 지갑 충전 (발급비 주소와 다름)',
    path: '/account/topup',
    apiNeeds: [
      'cregisWalletAddress',
      'walletExists=true',
      'walletBalance',
      '입금 감지 / top-up history',
    ],
    sessionOverride: lock({
      kycStatus: 'APPROVED',
      cardStatus: 'active',
      needsActivation: false,
      walletExists: true,
      cregisWalletAddress: '',
      walletBalance: 128.5,
    }),
  },
  {
    slug: 'page-zero-topup',
    group: 'pages',
    label: 'Wallet Top Up · 잔액 0',
    email: 'zero-balance@anytap.io',
    loginId: 'zerobal001',
    note: '잔액 0일 때 충전 유도',
    path: '/account/topup',
    apiNeeds: [
      'walletBalance=0',
      'cregisWalletAddress',
      'walletExists=true',
    ],
    sessionOverride: lock({
      kycStatus: 'APPROVED',
      cardStatus: 'active',
      needsActivation: false,
      walletExists: true,
      cregisWalletAddress: '',
      walletBalance: 0,
      zeroBalance: true,
    }),
  },
  {
    slug: 'page-transactions',
    group: 'pages',
    label: 'Transactions · 카드 사용 내역',
    email: 'active-card@anytap.io',
    loginId: 'active001',
    note: '⑥ 결제·충전 이력 목록',
    path: '/account/transactions',
    apiNeeds: [
      'transactions[] (type, amount, merchant, date, status)',
      'card_spend / card_topup 구분',
    ],
    sessionOverride: lock({
      kycStatus: 'APPROVED',
      cardStatus: 'active',
      needsActivation: false,
      walletExists: true,
      cregisWalletAddress: '',
      walletBalance: 128.5,
    }),
  },
  {
    slug: 'page-history',
    group: 'pages',
    label: 'Top-up History · 입금 이력',
    email: 'active-card@anytap.io',
    loginId: 'active001',
    note: '⑥ 지갑 입금(receive) 이력',
    path: '/account/history',
    apiNeeds: [
      'wallet receives / deposits[]',
      'amount, txHash?, confirmedAt, status',
    ],
    sessionOverride: lock({
      kycStatus: 'APPROVED',
      cardStatus: 'active',
      needsActivation: false,
      walletExists: true,
      cregisWalletAddress: '',
      walletBalance: 128.5,
    }),
  },
  {
    slug: 'page-referral',
    group: 'pages',
    label: 'Referral · 레퍼럴',
    email: 'active-card@anytap.io',
    loginId: 'active001',
    note: '⑥ 활성 이후 레퍼럴 코드·실적',
    path: '/account/referral',
    apiNeeds: [
      'referralCode',
      'referral stats / earnings?',
      'cardStatus=active 이후에만 의미 있음',
    ],
    sessionOverride: lock({
      kycStatus: 'APPROVED',
      cardStatus: 'active',
      needsActivation: false,
      walletExists: true,
      cregisWalletAddress: '',
      walletBalance: 128.5,
    }),
  },
  {
    slug: 'page-settings',
    group: 'pages',
    label: 'Settings · 설정',
    email: 'active-card@anytap.io',
    loginId: 'active001',
    note: '전 상태에서 열림 · 프로필·보안',
    path: '/account/settings',
    apiNeeds: [
      'user profile (name, email, country)',
      'security / notification prefs',
    ],
    sessionOverride: lock({
      kycStatus: 'APPROVED',
      cardStatus: 'active',
      needsActivation: false,
      walletExists: true,
      cregisWalletAddress: '',
      walletBalance: 128.5,
    }),
  },

  // ── Admin pages ─────────────────────────────────────────────
  {
    slug: 'admin-dashboard',
    group: 'admin',
    label: 'Admin · Dashboard',
    email: 'test@test.co.kr',
    loginId: 'admin',
    note: '운영 KPI · 대기 큐 요약',
    path: '/admin',
    apiNeeds: [
      'GET /admin/me',
      'GET /admin/dashboard (또는 /kpis + /pending-tasks + /summary)',
      'GET /admin/members/recent',
      'GET /admin/transactions/recent',
      'GET /admin/logs/recent',
    ],
  },
  {
    slug: 'admin-members',
    group: 'admin',
    label: 'Admin · Members',
    email: 'test@test.co.kr',
    loginId: 'admin',
    note: '회원 목록·상세',
    path: '/admin/members',
    apiNeeds: [
      'GET /admin/members?status&kyc&q',
      'GET /admin/members/{id}',
      'PATCH /admin/members/{id}',
      'POST /admin/members/{id}/suspend|activate',
      'PATCH /admin/members/{id}/memo',
    ],
  },
  {
    slug: 'admin-kyc',
    group: 'admin',
    label: 'Admin · KYC',
    email: 'test@test.co.kr',
    loginId: 'admin',
    note: '본인인증 심사 큐',
    path: '/admin/kyc',
    apiNeeds: [
      'GET /admin/kyc?status=pending|approved|rejected',
      'GET /admin/kyc/{id}',
      'POST /admin/kyc/{id}/approve',
      'POST /admin/kyc/{id}/reject { reason }',
    ],
  },
  {
    slug: 'admin-cards',
    group: 'admin',
    label: 'Admin · Cards',
    email: 'test@test.co.kr',
    loginId: 'admin',
    note: '카드 발급·상태 관리',
    path: '/admin/cards',
    apiNeeds: [
      'GET /admin/cards/applications?status',
      'GET /admin/cards/{id}',
      'GET /admin/members/{id}/cards/count',
      'POST /admin/cards/{id}/approve|reject|issue|activate|freeze|terminate',
    ],
  },
  {
    slug: 'admin-wallets',
    group: 'admin',
    label: 'Admin · Wallets',
    email: 'test@test.co.kr',
    loginId: 'admin',
    note: '지갑·잔액',
    path: '/admin/wallets',
    apiNeeds: [
      'GET /admin/wallets?status&q',
      'GET /admin/wallets/{id}',
      'POST /admin/wallets/{id}/lock|unlock',
    ],
  },
  {
    slug: 'admin-transactions',
    group: 'admin',
    label: 'Admin · Transactions',
    email: 'test@test.co.kr',
    loginId: 'admin',
    note: '입출금·결제 내역',
    path: '/admin/transactions',
    apiNeeds: [
      'GET /admin/transactions?kind&status&from&to',
      'GET /admin/transactions/export (CSV, optional)',
    ],
  },
  {
    slug: 'admin-referral',
    group: 'admin',
    label: 'Admin · Referral',
    email: 'test@test.co.kr',
    loginId: 'admin',
    note: '레퍼럴 파트너·리워드',
    path: '/admin/referral',
    apiNeeds: [
      'GET /admin/referrals?status',
      'GET /admin/referrals/{id}',
      'POST /admin/referrals/{id}/adjust { amount, note }',
    ],
  },
  {
    slug: 'admin-withdrawals',
    group: 'admin',
    label: 'Admin · Withdrawals',
    email: 'test@test.co.kr',
    loginId: 'admin',
    note: '출금 요청 처리',
    path: '/admin/withdrawals',
    apiNeeds: [
      'GET /admin/withdrawals?status=pending',
      'GET /admin/withdrawals/{id}',
      'POST /admin/withdrawals/{id}/approve { txHash }',
      'POST /admin/withdrawals/{id}/reject { memo }',
    ],
  },
  {
    slug: 'admin-notifications',
    group: 'admin',
    label: 'Admin · Notifications',
    email: 'test@test.co.kr',
    loginId: 'admin',
    note: '알림 발송·이력',
    path: '/admin/notifications',
    apiNeeds: [
      'GET /admin/notifications',
    ],
  },
  {
    slug: 'admin-content',
    group: 'admin',
    label: 'Admin · Content',
    email: 'test@test.co.kr',
    loginId: 'admin',
    note: '콘텐츠 관리',
    path: '/admin/content',
    apiNeeds: [
      'GET /admin/content',
    ],
  },
  {
    slug: 'admin-settings',
    group: 'admin',
    label: 'Admin · Settings',
    email: 'test@test.co.kr',
    loginId: 'admin',
    note: '운영 설정',
    path: '/admin/settings',
    apiNeeds: [
      'GET /admin/settings',
      'PATCH /admin/settings',
    ],
  },
  {
    slug: 'admin-logs',
    group: 'admin',
    label: 'Admin · Logs',
    email: 'test@test.co.kr',
    loginId: 'admin',
    note: '관리자 감사 로그',
    path: '/admin/logs',
    apiNeeds: [
      'GET /admin/logs?from&to&adminId',
    ],
  },
];

export const DEMO_GROUPS = [
  {
    id: 'dashboard',
    title: '대시보드 상태 (①~⑥)',
    lede: '같은 /account 가 상태마다 히어로·CTA만 바뀝니다. ①②는 백엔드 seed 전이라도 데모 링크에서 UI 미리보기 가능.',
  },
  {
    id: 'pages',
    title: '페이지별 (백엔드 필드 확인)',
    lede: '시드 로그인 후 해당 화면으로 이동합니다. apiNeeds = 그 화면에 필요한 정보.',
  },
  {
    id: 'admin',
    title: '관리자 페이지',
    lede: 'Open = 로그인 없이 UI 미리보기(mock). apiNeeds = 실연동 시 필요한 Admin API. 공통: GET /admin/me + admin seed.',
  },
];

export function getDemoStateBySlug(slug) {
  return DEMO_MEMBER_STATES.find((s) => s.slug === String(slug || '').trim()) || null;
}

export function demoStatesByGroup(groupId) {
  return DEMO_MEMBER_STATES.filter((s) => s.group === groupId);
}

export function demoEnterPath(slug) {
  return `/demo/state/${slug}`;
}

export function demoLoginPrefillPath(email) {
  return `/login?email=${encodeURIComponent(email)}`;
}
