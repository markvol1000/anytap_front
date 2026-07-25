/** Portal navigation — platform-specific headers (desktop title vs mobile back bar). */

/** Mobile back targets — settings sub-pages return to My; tabs return to Home. */
export const PORTAL_CHILD_BACK = {
  kyc: 'home',
  card: 'home',
  cardApply: 'home',
  cardRegister: 'card',
  topup: 'home',
  transactions: 'home',
  settings: 'home',
  referral: 'home',
  profile: 'settings',
  security: 'settings',
  notifications: 'settings',
  support: 'settings',
};

const PORTAL_BREADCRUMB = {
  kyc: ['Home', 'Identity Verification'],
  card: ['Home', 'Cards'],
  cardApply: ['Home', 'Apply New Card'],
  cardRegister: ['Home', 'Cards', 'Register Existing Card'],
  topup: ['Home', 'Wallet'],
  transactions: ['Home', 'Activity'],
  settings: ['Home', 'My'],
  referral: ['Home', 'Referral'],
  profile: ['My', 'Profile'],
  security: ['My', 'Security'],
  notifications: ['My', 'Notifications'],
  support: ['My', 'Customer Support'],
};

export function isPortalDashboardScreen(screen) {
  return screen === 'home';
}

/**
 * Page meta for child screens (mobile back bar + desktop title/breadcrumb).
 * @param {string} screen
 * @param {{ pageTitle: string, showCardDetails?: boolean, resetCardDetails?: () => void, go?: (scr: string) => void }} ctx
 */
export function resolvePortalPageMeta(screen, ctx) {
  if (isPortalDashboardScreen(screen)) return null;

  const backTarget = PORTAL_CHILD_BACK[screen] ?? 'home';
  const breadcrumb = PORTAL_BREADCRUMB[screen] ?? ['Home', ctx.pageTitle];

  return {
    title: ctx.pageTitle || 'Back',
    breadcrumb,
    onBack: () => ctx.go?.(backTarget),
  };
}

/** @deprecated Use resolvePortalPageMeta */
export function resolvePortalPageHeader(screen, ctx) {
  return resolvePortalPageMeta(screen, ctx);
}
