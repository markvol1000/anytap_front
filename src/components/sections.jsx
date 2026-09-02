import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useHeroCardArc } from '../hooks/useHeroCardArc.js';
import { useCountUp } from '../hooks/useCountUp.js';
import mainPayImg from '/assets/main_pay_img.png';
import { Icon, HeroCard, OptimizedImg, PayBrand } from './ui.jsx';

// ─────────────── Hero ───────────────
function Hero() {
  const heroRef = useRef(null);
  useHeroCardArc(heroRef);

  return (
    <section id="top" className="hero hero--arc" ref={heroRef}>
      <div className="shell hero__grid">
        <div className="hero__copy">
          <h1 className="hero__title">
            Spend Crypto<br />
            <span className="accent">Anywhere.</span>
          </h1>
          <p className="hero__h2">
            The world's most reliable crypto debit card — powered by 60+ global BINs.
          </p>
          <div className="hero__cta">
            <Link to="/card-benefits" className="btn btn--glass btn--lg">
              Learn More <Icon name="arrowRight" size={16} />
            </Link>
          </div>
        </div>

        <div className="hero__visual">
          <div className="card-stage">
            <HeroCard variant="light" alt="Anytap white debit card" />
            <HeroCard variant="dark" alt="Anytap black debit card" />
          </div>
        </div>
      </div>
    </section>);
}

// ─────────────── Trust bar (numbers, count-up) ───────────────
function TrustBar() {
  const [bins, r1] = useCountUp(60, 1200);
  const [coins, r2] = useCountUp(350, 1300);
  const [mkt, r3] = useCountUp(27.6, 1400, 1);
  const [rules, r4] = useCountUp(200, 1200);
  return (
    <section className="trustbar">
      <div className="shell trustbar__grid">
        <div className="trustbar__item">
          <div className="trustbar__v" ref={r1}>{bins}<em>+</em></div>
          <div className="trustbar__l">Global BINs</div>
        </div>
        <div className="trustbar__item">
          <div className="trustbar__v" ref={r2}>{coins}<em>+</em></div>
          <div className="trustbar__l">Supported Coins</div>
        </div>
        <div className="trustbar__item">
          <div className="trustbar__v" ref={r3}><em>$</em>{mkt}<em>T</em></div>
          <div className="trustbar__l">Stablecoin Market</div>
        </div>
        <div className="trustbar__item">
          <div className="trustbar__v" ref={r4}>{rules}<em>+</em></div>
          <div className="trustbar__l">Risk Rules</div>
        </div>
      </div>
    </section>);
}

// ─────────────── Card features (3) ───────────────
const CARD_FEATS = [
  { icon: "shield", title: "Never stops working", body: "60+ BINs run in redundancy. When a competitor's single issuer goes down, Anytap simply routes to another — no service interruption." },
  { icon: "phone", title: "Tap to pay anywhere", body: "Officially supported on Apple Pay, Samsung Pay and Google Pay. Add your card once and tap at any NFC terminal worldwide." },
  { icon: "zap", title: "Instant top-up", body: "Send USDT or USDC and your balance is ready within minutes — TRC-20 settles fastest and cheapest." },
];

function CardFeatures() {
  const feats = CARD_FEATS;

  const wrapRef = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { root: null, threshold: 0.22 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="section">
      <div className="shell">
        <div className="section-header">
          <span className="eyebrow"><span className="dot"></span> Card features</span>
          <h2 className="section-title">Why Anytap Card?</h2>
        </div>
        <div className={`cardfeats ${inView ? "is-in" : ""}`} ref={wrapRef}>
          {feats.map((f) =>
          <div className="cardfeat" key={f.title}>
              <div className="cardfeat__icon"><Icon name={f.icon} size={24} /></div>
              <div className="cardfeat__title">{f.title}</div>
              <p className="cardfeat__body">{f.body}</p>
              <Link to="/card-benefits" className="cardfeat__link">View card details <Icon name="arrowRight" size={14} /></Link>
            </div>
          )}
        </div>
      </div>
    </section>);

}

// ─────────────── Mobile pay ───────────────
function MobilePay() {
  return (
    <section className="section section--subtle mobilepay-section">
      <div className="shell mobilepay">
        <div className="mobilepay__copy">
          <div className="section-header">
            <span className="eyebrow"><span className="dot"></span> Mobile pay</span>
            <h2 className="section-title">Pay with your phone.<br />No card needed.</h2>
            <p className="section-lede">
              Add your Anytap card to your phone wallet and tap to pay at any NFC
              terminal worldwide — officially supported on all three:
            </p>
          </div>
          <div className="paylogos">
            <span className="paylogo"><PayBrand name="apple" /></span>
            <span className="paylogo"><PayBrand name="samsung" /></span>
            <span className="paylogo"><PayBrand name="google" /></span>
          </div>
        </div>
      </div>
      <div className="mobilepay__visual">
        <div className="mobilepay__halo"></div>
        <div className="mobilepay__stack">
          <OptimizedImg
            src={mainPayImg}
            alt="Anytap app on phone — wallet and recent activity"
            className="mobilepay__phone"
            width={1700}
            height={1756}
            loading="lazy"
          />
        </div>
      </div>
    </section>);

}

export { Hero, TrustBar, CardFeatures, MobilePay };

