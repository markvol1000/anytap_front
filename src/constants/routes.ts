// ===== Route Constants =====
// Portal screen ID → URL path mapping.
// Used by go() in useAccountState and pathToScreen() in account-data.

export const SCREEN_ROUTES: Record<string, string> = {
  home: '/account',
  kyc: '/account/kyc',
  card: '/account/card',
  cardApply: '/account/card-apply',
  cardRegister: '/account/card-register',
  topup: '/account/topup',
  history: '/account/history',
  transactions: '/account/transactions',
  activity: '/account/activity',
  referral: '/account/referral',
  settings: '/account/settings',
  profile: '/account/settings/profile',
  security: '/account/settings/security',
  notifications: '/account/settings/notifications',
  support: '/account/settings/support',
};
