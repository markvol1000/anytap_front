import { lazy } from 'react';
import { HomePage } from './pages/HomePage.jsx';

const lazyNamed = (loader, name) =>
  lazy(() => loader().then((mod) => ({ default: mod[name] })));

export const appRoutes = [
  { path: '/', page: HomePage },
  { path: '/about', page: lazyNamed(() => import('./components/sub-apply.jsx'), 'AboutPage') },
  { path: '/login', page: lazyNamed(() => import('./components/sub-auth.jsx'), 'LoginPage') },
  { path: '/sign-up/verify', page: lazyNamed(() => import('./components/sub-auth.jsx'), 'SignUpVerifyPage') },
  { path: '/sign-up', page: lazyNamed(() => import('./components/sub-auth.jsx'), 'SignUpPage') },
  { path: '/forgot-password', page: lazyNamed(() => import('./components/sub-auth.jsx'), 'ForgotPasswordPage') },
  { path: '/apply-card', page: lazyNamed(() => import('./components/sub-apply.jsx'), 'ApplyCardPage') },
  { path: '/card-application', page: lazyNamed(() => import('./components/sub-apply.jsx'), 'ApplyCardPage') },
  { path: '/merchant-apply', page: lazyNamed(() => import('./components/sub-apply.jsx'), 'MerchantApplyPage') },
  { path: '/merchant-apply/form', page: lazyNamed(() => import('./components/sub-apply.jsx'), 'MerchantApplyFormPage') },
  { path: '/contact', page: lazyNamed(() => import('./components/sub-apply.jsx'), 'ContactPage') },
  { path: '/card-how-to-use', page: lazyNamed(() => import('./components/sub-card.jsx'), 'CardHowToUse') },
  { path: '/card-who-can-apply', page: lazyNamed(() => import('./components/sub-card.jsx'), 'CardWhoCanApply') },
  { path: '/card-benefits', page: lazyNamed(() => import('./components/sub-card.jsx'), 'CardBenefits') },
  { path: '/payment-why', page: lazyNamed(() => import('./components/sub-payment.jsx'), 'PaymentWhy') },
  { path: '/payment-how', page: lazyNamed(() => import('./components/sub-payment.jsx'), 'PaymentHow') },
  { path: '/payment-business', page: lazyNamed(() => import('./components/sub-payment.jsx'), 'PaymentBusiness') },
  { path: '/innovation-tech', page: lazyNamed(() => import('./components/sub-innovation.jsx'), 'InnovationTech') },
  { path: '/innovation-vision', page: lazyNamed(() => import('./components/sub-innovation.jsx'), 'InnovationVision') },
  { path: '/innovation-market', page: lazyNamed(() => import('./components/sub-innovation.jsx'), 'InnovationMarket') },
  { path: '/referral-why', page: lazyNamed(() => import('./components/sub-referral.jsx'), 'ReferralWhy') },
  { path: '/referral-earn', page: lazyNamed(() => import('./components/sub-referral.jsx'), 'ReferralEarn') },
  { path: '/referral-apply', page: lazyNamed(() => import('./components/sub-referral.jsx'), 'ReferralApply') },
  { path: '/security', page: lazyNamed(() => import('./components/sub-security.jsx'), 'SecurityPage') },
  { path: '/privacy', page: lazyNamed(() => import('./components/sub-legal.jsx'), 'PrivacyPage') },
  { path: '/terms', page: lazyNamed(() => import('./components/sub-legal.jsx'), 'TermsPage') },
  { path: '/cookies', page: lazyNamed(() => import('./components/sub-legal.jsx'), 'CookiesPage') },
  { path: '/disclosure', page: lazyNamed(() => import('./components/sub-legal.jsx'), 'DisclosurePage') },
];
