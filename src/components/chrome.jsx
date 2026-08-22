import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo, Icon } from './ui.jsx';
import { NAV, FOOTER_COMPANY } from '../utils/nav.js';
import { useTweaks, TweaksPanel, TweakSection, TweakColor } from './tweaks-panel.jsx';
import { showAdminPortalLink, hasMemberSession, refreshAdminPortalLink } from '../lib/services/authService.js';
import { PwaInstallPrompt } from './PwaInstallPrompt.jsx';
import { ScrollToTop } from './ScrollToTop.jsx';
import { IssuanceDepositPanel } from './account-wallet.jsx';
import * as W from '../utils/wallet-data.js';

const BRAND_ACCENT = '#ff5500';
const LEGACY_AMBER_ACCENTS = new Set(['#e88828', '#d6741a', '#e04d00']);

const SHELL_TWEAK_DEFAULTS = { accent: BRAND_ACCENT };

/** Mobile bottom bar — marketing pages only (not auth/forms). */
const MOBILE_CTA_PATHS = new Set([
  '/',
  '/card-how-to-use',
  '/card-benefits',
  '/card-who-can-apply',
]);

const AUTH_PATHS = new Set([
  '/login',
  '/sign-up',
  '/sign-up/verify',
  '/forgot-password',
  '/apply-card',
]);

function normalizePath(pathname) {
  const path = pathname.replace(/\/$/, '');
  return path || '/';
}

function SiteHeader({
  member = false,
  memberName = '',
  loginId = '',
  unreadNotifications = 0,
  onNotifications,
  onProfile,
  memberNavItems = [],
  memberNavActive,
  onMemberNav,
  s = null,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const herePath = location.pathname.replace(/\/$/, '') || '/';
  const [scrolled, setScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileAcc, setMobileAcc] = useState(null);
  const [showAdminPortal, setShowAdminPortal] = useState(showAdminPortalLink);
  const [isLoggedIn, setIsLoggedIn] = useState(hasMemberSession);
  const [showDeposit, setShowDeposit] = useState(false);
  const closeTimer = useRef(null);

  const closeNav = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpenMenu(null);
    setMobileOpen(false);
    setMobileAcc(null);
  };

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    document.body.classList.toggle("mobnav-open", mobileOpen);
    return () => {
      document.body.style.overflow = "";
      document.body.classList.remove("mobnav-open");
    };
  }, [mobileOpen]);

  useEffect(() => {
    closeNav();
  }, [location.pathname]);

  useEffect(() => {
    const syncAuthUi = async () => {
      await refreshAdminPortalLink();
      setShowAdminPortal(showAdminPortalLink());
      setIsLoggedIn(hasMemberSession());
    };
    syncAuthUi();
    window.addEventListener('anytap-admin-session', syncAuthUi);
    window.addEventListener('anytap-member-session', syncAuthUi);
    return () => {
      window.removeEventListener('anytap-admin-session', syncAuthUi);
      window.removeEventListener('anytap-member-session', syncAuthUi);
    };
  }, [location.pathname]);

  const openNow = (menu) => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    setOpenMenu(menu.items.length ? menu.label : null);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenMenu(null), 220);
  };

  const goHome = (e) => {
    e.preventDefault();
    closeNav();
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isActive = (menu) =>
    menu.href === herePath || menu.items.some((it) => it.href === herePath);

  const toggleMobileAcc = (label) => {
    setMobileAcc((prev) => (prev === label ? null : label));
  };

  const getInitials = () => {
    const val = (memberName && memberName !== 'User' && memberName !== 'Not set' && memberName.trim() !== '') 
      ? memberName.trim() 
      : (loginId || 'User').trim();
    
    if (val.includes(' ')) {
      return val.split(' ')
        .map((w) => w[0])
        .filter(Boolean)
        .join('')
        .slice(0, 2)
        .toUpperCase();
    }
    return val.slice(0, 2).toUpperCase();
  };
  const initials = getInitials() || 'AT';

  return (
    <>
      <header className={`topbar${member ? ' topbar--member' : ''} ${scrolled ? 'scrolled' : ''}`}>
        <div className="shell topbar__row">
          <Link to="/" className="topbar__brand" aria-label="Anytap home" onClick={goHome}><Logo /></Link>

          <nav className="topbar__nav" aria-label="Main navigation">
            {!member && NAV.map((menu) => (
              <div
                key={menu.label}
                className={`navitem ${openMenu === menu.label ? "is-open" : ""}`}
                onMouseEnter={() => openNow(menu)}
                onMouseLeave={scheduleClose}>
                <Link
                  to={menu.href}
                  className={`navitem__link ${isActive(menu) ? "is-active" : ""}`}
                  onClick={closeNav}>
                  {menu.label}
                  {menu.items.length > 0 && (
                    <span className="navitem__caret" aria-hidden="true">
                      <Icon name="chevronDown" size={12} stroke={2} />
                    </span>
                  )}
                </Link>
                {menu.items.length > 0 && openMenu === menu.label && (
                  <div className="navmenu" onMouseEnter={() => openNow(menu)} onMouseLeave={scheduleClose}>
                    <div className="navmenu__inner">
                      {menu.items.map((it) => (
                        <Link
                          key={it.href}
                          to={it.href}
                          className={`navmenu__item ${it.href === herePath ? "is-active" : ""}`}
                          onClick={closeNav}>
                          <span className="navmenu__item-title">{it.label}</span>
                          <span className="navmenu__item-desc">{it.desc}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="topbar__cta">
            {showAdminPortal && (
              <Link to="/admin" className="btn btn--ghost btn--sm topbar__admin" onClick={closeNav}>
                Admin
              </Link>
            )}
            {member ? (
              <>
                <button
                  type="button"
                  className="topbar__bell"
                  onClick={onNotifications}
                  aria-label={`Notifications${unreadNotifications ? `, ${unreadNotifications} unread` : ''}`}>
                  <Icon name="bell" size={18} />
                  {unreadNotifications > 0 && (
                    <span className="topbar__bell-badge">{unreadNotifications}</span>
                  )}
                </button>
                <button
                  type="button"
                  className="topbar__avatar"
                  onClick={onProfile}
                  aria-label="Account menu">
                  {initials || 'AT'}
                </button>
              </>
            ) : isLoggedIn ? (
              <Link to="/account" className="btn btn--ghost btn--sm topbar__account" onClick={closeNav}>
                My account
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn btn--ghost btn--sm topbar__login" onClick={closeNav}>Log in</Link>
                <Link to="/sign-up" className="btn btn--accent btn--sm topbar__apply" onClick={closeNav}>
                  Get your card <Icon name="arrowRight" size={14} />
                </Link>
              </>
            )}
            <button className="topbar__burger" aria-label="Menu" onClick={() => setMobileOpen(true)}>
              <Icon name="menu" size={24} />
            </button>
          </div>
        </div>
      </header>

      <div
        className={`mobnav ${mobileOpen ? "is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        aria-hidden={!mobileOpen}>
        <button type="button" className="mobnav__backdrop" aria-label="Close menu" onClick={closeNav} />
        <div className="mobnav__panel">
          <div className="mobnav__head">
            <Link to="/" className="topbar__brand" aria-label="Anytap home" onClick={goHome}>
              <Logo height={26} />
            </Link>
            <button type="button" className="mobnav__close" aria-label="Close menu" onClick={closeNav}>
              <Icon name="close" size={18} />
            </button>
          </div>

          <nav className="mobnav__scroll" aria-label="Main menu">
            {member && memberNavItems.length > 0 && (
              <div className="mobnav__account">
                <p className="mobnav__account-label">Your account</p>
                <div className="mobnav__account-list">
                  {memberNavItems.map((it) => (
                    <button
                      key={it.id}
                      type="button"
                      className={`mobnav__account-link${memberNavActive?.(it.id) ? ' is-active' : ''}`}
                      onClick={() => {
                        closeNav();
                        onMemberNav?.(it.id);
                      }}>
                      {it.label}
                    </button>
                  ))}
                </div>
                <div className="mobnav__divider" aria-hidden="true" />
              </div>
            )}
            {!member && (
            <div className="mobnav__list">
              {NAV.map((menu) => (
                menu.items.length ? (
                  <div className={`mobnav__group ${mobileAcc === menu.label ? "is-open" : ""}`} key={menu.label}>
                    <button
                      type="button"
                      className={`mobnav__row mobnav__acc ${mobileAcc === menu.label ? "is-open" : ""} ${isActive(menu) ? "is-active" : ""}`}
                      aria-expanded={mobileAcc === menu.label}
                      onClick={() => toggleMobileAcc(menu.label)}>
                      <span>{menu.label}</span>
                      <Icon name="chevronDown" size={16} stroke={2} />
                    </button>
                    <div className={`mobnav__subwrap ${mobileAcc === menu.label ? "is-open" : ""}`}>
                      <div className="mobnav__subwrap-inner">
                        <div className="mobnav__cards">
                          {menu.items.map((it) => (
                            <Link
                              key={it.href}
                              to={it.href}
                              className={`mobnav__card ${it.href === herePath ? "is-active" : ""}`}
                              onClick={closeNav}>
                              <span className="mobnav__card-title">{it.label}</span>
                              <span className="mobnav__card-desc">{it.desc}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Link
                    key={menu.label}
                    to={menu.href}
                    className={`mobnav__row ${herePath === menu.href ? "is-active" : ""}`}
                    onClick={closeNav}>
                    <span>{menu.label}</span>
                  </Link>
                )
              ))}
            </div>
            )}
          </nav>

          <div className="mobnav__foot">
            {!member && !isLoggedIn && showAdminPortal && (
              <Link to="/admin" className="btn btn--outline mobnav__admin" onClick={closeNav}>
                Admin portal
              </Link>
            )}
            {member ? (
              <button
                type="button"
                className="btn btn--outline mobnav__login"
                onClick={() => {
                  closeNav();
                  onProfile?.();
                }}>
                Account settings
              </button>
            ) : isLoggedIn ? (
              <>
                <Link to="/account" className="btn btn--accent btn--lg mobnav__cta" onClick={closeNav}>
                  My account <Icon name="arrowRight" size={16} />
                </Link>
                {showAdminPortal && (
                  <Link to="/admin" className="btn btn--outline mobnav__admin" onClick={closeNav}>
                    Admin portal
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link to="/sign-up" className="btn btn--accent btn--lg mobnav__cta" onClick={closeNav}>
                  Get your card <Icon name="arrowRight" size={16} />
                </Link>
                <div className="mobnav__divider" aria-hidden="true" />
                <div className="mobnav__auth">
                  <Link to="/login" className="btn btn--outline mobnav__login" onClick={closeNav}>Log in</Link>
                  <Link to="/sign-up" className="btn btn--outline mobnav__signup" onClick={closeNav}>Sign up</Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────── Unified footer ───────────────
function SiteFooter() {
  return (
    <footer className="footer">
      <div className="shell">
        <div className="footer__top footer__top--site">
          <div className="footer__brand">
            <Link to="/" aria-label="Anytap home"><Logo inverse /></Link>
            <p className="footer__tagline">
              The world's most reliable crypto debit card — powered by 60+ global
              BINs. Spend USDT &amp; USDC anywhere Visa is accepted.
            </p>
          </div>

          {NAV.map((menu) => (
            <div className="footer__col" key={menu.label}>
              <h5>
                {menu.href ? <Link to={menu.href}>{menu.label}</Link> : menu.label}
              </h5>
              {menu.items.length > 0 && (
                <ul>
                  {menu.items.map((it) => (
                    <li key={it.href}><Link to={it.href}>{it.label}</Link></li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          <div className="footer__col">
            <h5>Company</h5>
            <ul>
              {FOOTER_COMPANY.map((it) => (
                <li key={it.href}><Link to={it.href}>{it.label}</Link></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <div>Copyright © 2026 Anytap. All Rights Reserved.</div>
          <div className="footer__social">
            <a href="https://x.com/anytapglobal" target="_blank" rel="noopener noreferrer" aria-label="X">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.65l-5.21-6.82-5.96 6.82H1.69l7.73-8.84L1.25 2.25h6.82l4.71 6.23 5.46-6.23zm-1.16 17.52h1.83L7.01 4.13H5.05L17.08 19.77z"/></svg>
            </a>
            <a href="#" aria-label="TikTok">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M16.6 5.82a4.28 4.28 0 0 1-1.06-2.82h-3.1v12.3a2.42 2.42 0 0 1-2.42 2.42 2.42 2.42 0 1 1 .67-4.75v-3.15a5.57 5.57 0 0 0-.67-.04A5.55 5.55 0 1 0 15.5 15.4V9.4a7.3 7.3 0 0 0 4.27 1.37V7.66a4.28 4.28 0 0 1-3.17-1.84z"/></svg>
            </a>
            <a href="#" aria-label="Facebook">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z"/></svg>
            </a>
            <a href="#" aria-label="YouTube">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── PageShell: header + content + footer + accent tweaks ──
function PageShell({ children }) {
  const location = useLocation();
  const [t, setTweak] = useTweaks(SHELL_TWEAK_DEFAULTS);

  useEffect(() => {
    const path = normalizePath(location.pathname);
    document.body.classList.toggle('auth-page', AUTH_PATHS.has(path));
    document.body.classList.toggle('has-mobile-cta', MOBILE_CTA_PATHS.has(path));
    return () => {
      document.body.classList.remove('auth-page');
      document.body.classList.remove('has-mobile-cta');
    };
  }, [location.pathname]);

  useEffect(() => {
    const root = document.documentElement;
    const raw = (t.accent || BRAND_ACCENT).toLowerCase();
    const accent = LEGACY_AMBER_ACCENTS.has(raw) ? BRAND_ACCENT : raw;
    root.style.setProperty('--brand-primary', accent);
    root.style.setProperty('--brand-primary-strong', accent);
    root.style.setProperty('--anytap-orange', accent);
    root.style.setProperty('--anytap-orange-strong', accent);
  }, [t.accent]);

  const path = normalizePath(location.pathname);
  const showMobileCta = MOBILE_CTA_PATHS.has(path);
  const hideFooter = AUTH_PATHS.has(path);
  const showPwaInstall = !AUTH_PATHS.has(path);

  return (
    <>
      <ScrollToTop />
      <SiteHeader />
      <main>{children}</main>
      {!hideFooter && <SiteFooter />}
      {showPwaInstall && (
        <PwaInstallPrompt placement="marketing" variant="floating" enabled={showPwaInstall} />
      )}
      {showMobileCta && (
        <Link to="/sign-up" className="mobile-cta-bar">
          Get your card <Icon name="arrowRight" size={16} />
        </Link>
      )}
      {import.meta.env.DEV && (
        <TweaksPanel title="Tweaks">
          <TweakSection label="Brand">
            <TweakColor
              label="Accent color"
              value={t.accent}
              onChange={(v) => setTweak('accent', v)}
              options={['#ff5500', '#3b1b5e', '#16a34a', '#1a1a1a', '#e5484d']} />
          </TweakSection>
        </TweaksPanel>
      )}
    </>
  );
}

export { SiteHeader, SiteFooter, PageShell };
