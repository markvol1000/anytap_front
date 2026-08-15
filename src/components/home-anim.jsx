import { useState, useEffect, useRef } from 'react';
import lifeNewYork from '/assets/life-newyork.jpg';
import lifeVietnam from '/assets/life-vietnam.jpg';
import lifeJapan from '/assets/life-japan.jpg';
import { useScrollProgress } from '../hooks/useScrollProgress.js';
import { Icon, Logo } from './ui.jsx';

const lifestyleSlides = [
  { id: 'life-1', src: lifeNewYork, alt: 'New York — paying with Anytap on 42nd Street' },
  { id: 'life-2', src: lifeVietnam, alt: 'Thailand — family traveling with Anytap Visa card' },
  { id: 'life-3', src: lifeJapan, alt: 'Japan — paying with Anytap at a convenience store' },
];

function LifestyleScatter() {
  const ref = useRef(null);
  useScrollProgress(ref);

  const items = [
    // clustered state: small offsets, bigger scale; scattered state: spread out + rotations
    {
      id: 'life-1',
      src: lifeNewYork,
      alt: lifestyleSlides[0].alt,
      tag: 'At a coffee shop',
      tagSoft: 'var(--brand-primary-pale)',
      tagStrong: 'var(--brand-primary)',
      w: '520px',
      ar: '16 / 10',
      c: { x: -8, y: 6, r: -6, s: 1.02 },
      o: { x: -220, y: -90, r: -10, s: 1.0 },
      z: 3,
    },
    {
      id: 'life-2',
      src: lifeVietnam,
      alt: lifestyleSlides[1].alt,
      w: '440px',
      ar: '4 / 3',
      c: { x: 6, y: -4, r: 4, s: 1.03 },
      o: { x: 0, y: 158, r: 6, s: 1.03 },
      z: 2,
    },
    {
      id: 'life-3',
      src: lifeJapan,
      alt: lifestyleSlides[2].alt,
      w: '480px',
      ar: '3 / 2',
      c: { x: 10, y: 8, r: 8, s: 1.01 },
      o: { x: 161, y: -64, r: 10, s: 1.0 },
      z: 1,
    },
  ];

  // We let CSS read --p for subtle opacity/blur; transforms are computed once via CSS calc
  // by writing per-item CSS variables.
  return (
    <div className="lifescatter" ref={ref}>
      <div className="lifescatter__stage" aria-label="Lifestyle photos">
        {items.map((it) => (
          <figure
            key={it.id}
            className="lifescatter__card"
            style={{
              '--z': it.z,
              '--w': it.w,
              '--ar': it.ar,
              '--cx': `${it.c.x}px`,
              '--cy': `${it.c.y}px`,
              '--cr': `${it.c.r}deg`,
              '--cs': String(it.c.s),
              '--ox': `${it.o.x}px`,
              '--oy': `${it.o.y}px`,
              '--or': `${it.o.r}deg`,
              '--os': String(it.o.s),
            }}
          >
            <img className="lifescatter__img" src={it.src} alt={it.alt} loading="lazy" />
          </figure>
        ))}
      </div>
    </div>
  );
}

function Features() {
  return (
    <section className="section lifestyle-section">
      <div className="shell">
        <div className="section-header">
          <span className="eyebrow"><span className="dot"></span> What Anytap does</span>
          <h2 className="section-title">Crypto that spends like everyday money.</h2>
          <p className="section-lede">
            From the morning coffee to a flight across the world — people everywhere
            use Anytap to turn crypto into spendable money the moment they need it.
          </p>
        </div>
        <div className="lifestyle">
          <LifestyleScatter />
        </div>
      </div>
    </section>);
}

// ─────────────── How-it-works phone screens ───────────────
function ScreenLogo() {
  return <div className="hwscr__logo"><Logo height={15} /></div>;
}

function ScreenCreate() {
  return (
    <div className="hwscr">
      <div className="hwscr__bar"><span>9:41</span><span className="hwscr__sig"><i></i><i></i><i></i><i></i></span></div>
      <ScreenLogo />
      <div className="hwscr__pad">
        <div className="hwscr__title">Create account</div>
        <div className="hwscr__sub">Spend crypto anywhere — start in minutes.</div>
        <label className="hwscr__lbl">Email</label>
        <div className="hwscr__inp"><span className="hwscr__type">john.doe@email.com</span><span className="hwscr__caret"></span></div>
        <label className="hwscr__lbl">Full name</label>
        <div className="hwscr__inp">John Doe</div>
        <label className="hwscr__lbl">Country / Region</label>
        <div className="hwscr__inp hwscr__inp--sel">United States <Icon name="chevron" size={13} /></div>
        <label className="hwscr__lbl">Residential address</label>
        <div className="hwscr__inp hwscr__inp--muted">123 Broadway, New York</div>
        <button className="hwscr__btn">Continue <Icon name="arrowRight" size={15} /></button>
      </div>
    </div>
  );
}

function ScreenKyc() {
  return (
    <div className="hwscr">
      <div className="hwscr__bar"><span>9:41</span><span className="hwscr__sig"><i></i><i></i><i></i><i></i></span></div>
      <ScreenLogo />
      <div className="hwscr__pad">
        <div className="hwscr__title">Verify identity</div>
        <div className="hwscr__sub">Scan your passport to complete KYC.</div>
        <div className="passport">
          <div className="passport__type">P&lt;USA</div>
          <div className="passport__head">
            <div className="passport__photo"><Icon name="users" size={30} /></div>
            <div className="passport__fields">
              <div className="passport__country"><span className="passport__flag"></span> UNITED STATES OF AMERICA</div>
              <div className="passport__doc">PASSPORT</div>
              <div className="passport__kv"><span>Surname</span><strong>DOE</strong></div>
              <div className="passport__kv"><span>Given names</span><strong>JOHN</strong></div>
              <div className="passport__kv"><span>Passport No.</span><strong>5xxxxxx04</strong></div>
            </div>
          </div>
          <div className="passport__mrz">P&lt;USADOE&lt;&lt;JOHN&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</div>
          <div className="passport__mrz">5XXXXXX04USA8001019M3001012&lt;&lt;&lt;&lt;&lt;&lt;&lt;06</div>
          <div className="passport__scan"></div>
          <div className="passport__corner passport__corner--tl"></div>
          <div className="passport__corner passport__corner--tr"></div>
          <div className="passport__corner passport__corner--bl"></div>
          <div className="passport__corner passport__corner--br"></div>
        </div>
        <div className="kycstat"><span className="kycstat__dot"></span> Scanning passport…</div>
        <div className="hwscr__rowchk"><span className="hwscr__tick"><Icon name="check" size={11} stroke={3} /></span> Passport</div>
        <div className="hwscr__rowchk hwscr__rowchk--pending"><span className="hwscr__tick hwscr__tick--p"></span> Liveness selfie</div>
      </div>
    </div>
  );
}

function ScreenApply() {
  return (
    <div className="hwscr">
      <div className="hwscr__bar"><span>9:41</span><span className="hwscr__sig"><i></i><i></i><i></i><i></i></span></div>
      <ScreenLogo />
      <div className="hwscr__pad">
        <div className="hwscr__title">Choose your card</div>
        <div className="hwscr__sub">Virtual for instant use, or physical for ATM &amp; chip.</div>
        <div className="hwpick">
          <div className="hwpick__opt hwpick__opt--on">
            <span className="hwpick__badge">Popular</span>
            <div className="hwpick__card hwpick__card--dark">
              <span className="hwpick__brand">Anytap</span>
              <span className="hwpick__net">VISA</span>
            </div>
            <div className="hwpick__name">Virtual Card</div>
            <div className="hwpick__desc">Apple Pay · Google Pay · Online</div>
          </div>
          <div className="hwpick__opt">
            <div className="hwpick__card hwpick__card--light">
              <span className="hwpick__brand">Anytap</span>
              <span className="hwpick__net">VISA</span>
            </div>
            <div className="hwpick__name">Physical Card</div>
            <div className="hwpick__desc">Chip · ATM · Worldwide</div>
          </div>
        </div>
        <button className="hwscr__btn hwscr__btn--press">
          Apply now <Icon name="arrowRight" size={15} />
          <span className="hwscr__click"><svg viewBox="0 0 24 24" width="34" height="34" fill="#0a0a0d"><path d="M4 2l16 9-7 1.5L9 20 4 2z"/></svg></span>
        </button>
      </div>
    </div>
  );
}

function ScreenIssuing() {
  return (
    <div className="hwscr">
      <div className="hwscr__bar"><span>9:41</span><span className="hwscr__sig"><i></i><i></i><i></i><i></i></span></div>
      <ScreenLogo />
      <div className="hwscr__pad">
        <div className="hwscr__title">Card issuing</div>
        <div className="hwscr__sub">Pay the fee once — we create and prepare your card.</div>
        <div className="hwissue">
          <div className="hwissue__fee">
            <span className="hwissue__fee-l">Issuance fee</span>
            <strong className="hwissue__fee-v">$100</strong>
          </div>
          <div className="hwissue__steps">
            <div className="hwissue__row hwissue__row--done">
              <span className="hwscr__tick"><Icon name="check" size={11} stroke={3} /></span>
              Application submitted
            </div>
            <div className="hwissue__row hwissue__row--on">
              <span className="hwissue__pulse"></span>
              Creating your Visa card…
            </div>
            <div className="hwissue__row hwissue__row--pending">
              <span className="hwscr__tick hwscr__tick--p"></span>
              Ready to activate
            </div>
          </div>
        </div>
        <div className="hwissue__note">Virtual cards are ready within minutes after payment.</div>
      </div>
    </div>
  );
}

function ScreenActivate() {
  return (
    <div className="hwscr">
      <div className="hwscr__bar"><span>9:41</span><span className="hwscr__sig"><i></i><i></i><i></i><i></i></span></div>
      <ScreenLogo />
      <div className="hwscr__pad">
        <div className="hwscr__title">Activate card</div>
        <div className="hwscr__sub">Enter the last 4 digits to unlock your wallet.</div>
        <div className="hwact__card">
          <div className="hwact__card-top">
            <Logo height={14} />
            <span className="hwact__chip" aria-hidden="true"></span>
          </div>
          <div className="hwact__num">•••• •••• •••• 4921</div>
          <div className="hwact__net">VISA</div>
        </div>
        <label className="hwscr__lbl">Last 4 digits</label>
        <div className="hwact__pin">
          <span>4</span><span>9</span><span>2</span><span className="hwact__pin-on">1<span className="hwscr__caret"></span></span>
        </div>
        <button className="hwscr__btn hwscr__btn--press">
          Activate <Icon name="arrowRight" size={15} />
          <span className="hwscr__click"><svg viewBox="0 0 24 24" width="34" height="34" fill="#0a0a0d"><path d="M4 2l16 9-7 1.5L9 20 4 2z"/></svg></span>
        </button>
      </div>
    </div>
  );
}

function ScreenTopup() {
  return (
    <div className="hwscr">
      <div className="hwscr__bar"><span>9:41</span><span className="hwscr__sig"><i></i><i></i><i></i><i></i></span></div>
      <div className="hwscr__pad">
        <div className="hwscr__title">Top up</div>
        <div className="hwscr__sub">Add USDT to your card balance.</div>
        <div className="tpu__coin">
          <span className="tpu__coin-ic">₮</span>
          <div><div className="tpu__coin-n">Tether</div><div className="tpu__coin-net">USDT · TRC-20</div></div>
          <Icon name="chevron" size={14} />
        </div>
        <label className="hwscr__lbl">Amount</label>
        <div className="tpu__amt">500<span>USDT</span><span className="tpu__caret"></span>
          <span className="hwscr__click hwscr__click--amt"><svg viewBox="0 0 24 24" width="34" height="34" fill="#0a0a0d"><path d="M4 2l16 9-7 1.5L9 20 4 2z"/></svg></span>
        </div>
        <div className="tpu__quick"><span>+100</span><span>+500</span><span className="is-on">Max</span></div>
        <div className="tpu__sum">
          <div className="tpu__sum-row"><span>You add</span><strong>500 USDT</strong></div>
          <div className="tpu__sum-row"><span>Card balance after</span><strong>$1,784.50</strong></div>
        </div>
        <button className="hwscr__btn hwscr__btn--press">Confirm top-up <Icon name="arrowRight" size={15} /><span className="hwscr__click"><svg viewBox="0 0 24 24" width="34" height="34" fill="#0a0a0d"><path d="M4 2l16 9-7 1.5L9 20 4 2z"/></svg></span></button>
      </div>
    </div>
  );
}

const HW_SCREENS = [ScreenCreate, ScreenKyc, ScreenApply, ScreenIssuing, ScreenActivate, ScreenTopup];

const HW_STEPS = [
  { num: "1", title: "Create Account", body: "Sign up with your email, name and address on the web — no app install needed.", screen: 0 },
  { num: "2", title: "Verify Identity (KYC)", body: "Scan your passport or ID and take a quick selfie. Approved in minutes.", screen: 1 },
  { num: "3", title: "Apply for a Card", body: "Choose virtual or physical Visa and submit your application.", screen: 2 },
  { num: "4", title: "Card Issuing", body: "Pay the issuance fee, then we create and ship your card.", screen: 3 },
  { num: "5", title: "Activate Card", body: "Register your card number to unlock your personal wallet.", screen: 4 },
  { num: "6", title: "Top Up & Spend", body: "Add USDT or USDC and tap to pay anywhere Visa is accepted.", screen: 5 },
];

function HowItWorks() {
  const steps = HW_STEPS;
  const [active, setActive] = useState(0);
  const pause = useRef(false);
  useEffect(() => {
    const t = setInterval(() => { if (!pause.current) setActive((v) => (v + 1) % steps.length); }, 5000);
    return () => clearInterval(t);
  }, [steps.length]);
  const Screen = HW_SCREENS[steps[active].screen];
  return (
    <section id="how" className="section section--ink howsteps">
      <div className="shell">
        <div className="howsteps__head">
          <span className="eyebrow eyebrow--light"><span className="dot"></span> How it works</span>
          <h2 className="howsteps__title">From wallet to payment in six simple steps.</h2>
        </div>

        <div className="howsteps__grid">
          <div className="howphone"
            onMouseEnter={() => { pause.current = true; }}
            onMouseLeave={() => { pause.current = false; }}>
            <div className="howphone__device">
              <span className="howphone__btn howphone__btn--l1"></span>
              <span className="howphone__btn howphone__btn--l2"></span>
              <span className="howphone__btn howphone__btn--r1"></span>
              <div className="howphone__screen">
                <div className="howphone__notch"></div>
                <div className="howphone__fade" key={active}>
                  <Screen />
                </div>
              </div>
            </div>
          </div>

          <ol className="howsteps__list">
            {steps.map((s, i) => (
              <li className={`howstep ${i === active ? "is-active" : ""}`} key={s.num}>
                <button className="howstep__hit" onClick={() => { setActive(i); pause.current = true; }}>
                  <span className={`howstep__num ${i === active ? "howstep__num--active" : ""}`}>{s.num}</span>
                  <div className="howstep__body">
                    <div className="howstep__title">{s.title}</div>
                    <p className="howstep__text">{s.body}</p>
                  </div>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>);
}

export { Features, HowItWorks };
