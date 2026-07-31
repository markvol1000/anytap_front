// ===== Account Portal Shell =====
// Top-level portal layout: header, sidebar, dock nav, screen router.
// All screen logic lives in pages/account/ and hooks/useAccountState.js.
// TODO: Guard redirect should use Supabase session check instead of mock session

import { useEffect, useLayoutEffect, useState } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { SiteHeader } from '../components/chrome.jsx';
import { useAccountState } from '../hooks/useAccountState.js';
import { usePortalDesktop } from '../hooks/usePortalDesktop.js';
import { AccountToast } from '../components/account/AccountToast.jsx';
import { PortalPageHeader } from '../components/account/PortalPageHeader.jsx';
import { PortalDesktopPageHead } from '../components/account/PortalDesktopPageHead.jsx';
import { CardOnboardingActions } from '../components/account-cards.jsx';
import { resolveFeatureIcon } from '../utils/feature-icons.js';
import { isPortalDashboardScreen, resolvePortalPageMeta } from '../lib/portal-navigation.js';
import { resolveUnreadNotifications } from '../lib/api/display-data.js';
import { hasMemberSession } from '../lib/services/authService.js';
import { ensureDemoPreviewSession, getActiveDemoSlug } from '../lib/demo-session.js';

// Screen components
import { AccountHome } from '../components/account-dashboard.jsx';
import { AccountCardApply } from '../components/account-card-apply.jsx';
import { AccountCardRegister } from '../components/account-card-register.jsx';
import { AccountWallet, ReceiveSheet, QuickTopUpSheet } from '../components/account-wallet.jsx';
import { AccountReferral } from '../components/account-referral.jsx';
import { AccountCardView } from './account/AccountCardView.jsx';
import { AccountCardTransactions } from './account/AccountCardTransactions.jsx';
import { AccountSettings } from './account/AccountSettings.jsx';
import { AccountKyc } from './account/AccountKyc.jsx';
import { AccountProfile } from './account/AccountProfile.jsx';
import { AccountSecurity } from './account/AccountSecurity.jsx';
import { AccountNotifications } from './account/AccountNotifications.jsx';
import { AccountSupport } from './account/AccountSupport.jsx';
import { PwaInstallPrompt } from '../components/PwaInstallPrompt.jsx';
import { PortalStateGuide } from '../components/account/PortalStateGuide.jsx';
import { KycRequiredModal } from '../components/account/KycRequiredModal.jsx';
import { resolvePortalScreenGate } from '../lib/portal-screen-gate.js';
import { PhysicalCardActivateSheet } from '../components/account/PhysicalCardActivateSheet.jsx';

import * as A from '../lib/account-data.js';
import '../styles/account.css';

// ─── Nav icon (Phosphor) ──────────────────────────────────────────────────────
function PortalNavIcon({ name, size }) {
  const NavIcon = resolveFeatureIcon(name);
  if (!NavIcon) return null;
  return <NavIcon size={size} weight="duotone" aria-hidden="true" />;
}

// ─── Sidebar / dock navigation ────────────────────────────────────────────────
function AccountNav({ s, variant }) {
  const items = variant === 'dock' ? A.NAV_DOCK : A.NAV_MAIN;
  const cls = variant === 'dock' ? 'portal-dock__btn' : 'portal-nav__btn';
  const wrap = variant === 'dock' ? 'portal-dock' : 'portal-nav';

  return (
    <nav className={wrap} aria-label="Account navigation">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          className={`${cls}${s.navActive(it.id) ? ' is-active' : ''}`}
          onClick={() => s.onMemberNav(it.id)}>
          {it.icon && <PortalNavIcon name={it.icon} size={variant === 'dock' ? 22 : 18} />}
          {it.label}
        </button>
      ))}
    </nav>
  );
}

// ─── Screen router ────────────────────────────────────────────────────────────
function AccountMain({ s }) {
  if (s.screen === 'home') return <AccountHome s={s} />;

  const gate = resolvePortalScreenGate(s.screen, s.accountState);
  if (gate.mode === 'guide') {
    return (
      <PortalStateGuide
        s={s}
        title={gate.title}
        body={gate.body}
        cta={gate.cta}
      />
    );
  }

  if (s.screen === 'card') return <AccountCardView s={s} />;
  if (s.screen === 'cardApply') return <AccountCardApply s={s} />;
  if (s.screen === 'kyc') return <AccountKyc s={s} />;
  if (s.screen === 'cardRegister') return <AccountCardRegister s={s} />;
  if (s.screen === 'topup') return <AccountWallet s={s} />;
  if (s.screen === 'transactions') return <AccountCardTransactions s={s} />;
  if (s.screen === 'referral') return <AccountReferral s={s} />;
  if (s.screen === 'settings') return <AccountSettings s={s} />;
  if (s.screen === 'profile') return <AccountProfile s={s} />;
  if (s.screen === 'security') return <AccountSecurity s={s} />;
  if (s.screen === 'notifications') return <AccountNotifications s={s} />;
  if (s.screen === 'support') return <AccountSupport s={s} />;
  return <AccountHome s={s} />;
}

function AccountPortal() {
  const s = useAccountState();
  const isDesktop = usePortalDesktop();
  const isDashboard = isPortalDashboardScreen(s.screen);
  const pageMeta = resolvePortalPageMeta(s.screen, {
    pageTitle: s.pageTitle,
    showCardDetails: s.showCardDetails,
    resetCardDetails: s.resetCardDetails,
    go: s.go,
  });
  const showMobilePageBar = !isDashboard && !isDesktop && pageMeta;
  const showDesktopPageHead = !isDashboard && isDesktop && pageMeta;
  const showGlobalHeader = isDashboard || isDesktop;

  useEffect(() => {
    document.body.classList.add('portal-body', 'portal-member');
    document.body.classList.toggle('portal-member--child', showMobilePageBar);
    return () => {
      document.body.classList.remove('portal-body', 'portal-member', 'portal-member--child');
    };
  }, [showMobilePageBar]);

  return (
    <div className={`portal${isDashboard ? '' : ' portal--child'}`}>
      {showGlobalHeader && (
        <div className="portal-topbar-wrap">
          <SiteHeader
            member
            memberName={s.profileReady ? (s.accountState?.name || '') : ''}
            unreadNotifications={resolveUnreadNotifications(A.MOCK_UNREAD_NOTIFICATIONS)}
            onNotifications={() => {
              s.go('notifications');
            }}
            onProfile={() => {
              s.go('settings');
            }}
            memberNavItems={A.NAV_MAIN}
            memberNavActive={s.navActive}
            onMemberNav={s.onMemberNav}
          />
        </div>
      )}

      <div className="portal-app">
        <aside className="portal-sidebar" aria-label="Account sidebar">
          <AccountNav s={s} variant="sidebar" />
          <div className="portal-sidebar__foot">
            <button type="button" className="portal-nav__btn portal-nav__btn--logout" onClick={s.logout}>
              Log Out
            </button>
          </div>
        </aside>

        <div className="portal-main">
          {showMobilePageBar && (
            <PortalPageHeader
              title={pageMeta.title}
              onBack={pageMeta.onBack}
            />
          )}
          <div className="portal-shell">
            {showDesktopPageHead && (
              <PortalDesktopPageHead
                title={pageMeta.title}
                breadcrumb={pageMeta.breadcrumb}
                actions={
                  s.screen === 'card' ? (
                    <CardOnboardingActions s={s} layout="header" />
                  ) : null
                }
              />
            )}
            <div className={`portal-content${A.isUnifiedPortalScreen(s.screen) ? ' portal-content--unified' : ''}`}>
              {!isDesktop && (
                <PwaInstallPrompt placement="account" variant="inline" enabled />
              )}
              <AccountMain s={s} />
            </div>
          </div>
        </div>

        <AccountNav s={s} variant="dock" />
      </div>

      <KycRequiredModal
        open={!!s.kycGateOpen}
        pending={!!s.kycGatePending}
        onClose={s.closeKycGate}
        onVerify={() => {
          s.closeKycGate?.();
          s.go('kyc');
        }}
      />

      <AccountToast msg={s.toast} />
      <ReceiveSheet s={s} open={s.receiveOpen} onClose={s.closeReceive} />
      <QuickTopUpSheet s={s} card={s.quickTopUpCard} open={!!s.quickTopUpCard} onClose={s.closeQuickTopUp} />
      <PhysicalCardActivateSheet s={s} open={s.activePhysicalCardOpen} onClose={s.closeActivePhysical} />
    </div>
  );
}

// ─── Portal root ──────────────────────────────────────────────────────────────
export function AccountApp() {
  const location = useLocation();
  const normalizedPath = location.pathname.replace(/\/$/, '') || '/account';
  const demoSlug = new URLSearchParams(location.search).get('demo') || getActiveDemoSlug() || '';
  const [gate, setGate] = useState(() => {
    if (hasMemberSession()) return 'in';
    return demoSlug ? 'check' : 'out';
  });

  useLayoutEffect(() => {
    if (hasMemberSession()) {
      setGate('in');
      return;
    }
    if (demoSlug) {
      ensureDemoPreviewSession(demoSlug);
    }
    setGate(hasMemberSession() ? 'in' : 'out');
  }, [demoSlug, location.key]);

  if (normalizedPath === '/account/history') {
    return <Navigate to="/account/transactions?type=topup" replace />;
  }

  if (gate === 'check') {
    return (
      <div className="portal-sk-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <div className="portal-spin" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  if (gate === 'out') {
    return <Navigate to="/login" replace state={{ from: normalizedPath }} />;
  }

  return <AccountPortal />;
}
