import { isValidElement, useEffect, useRef } from 'react';
import { Icon, OptimizedImg } from './ui.jsx';
import { Link } from 'react-router-dom';
import { onlineBrands, franchiseBrands } from '../utils/brands.js';
import { resolveStepIcon } from '../utils/step-icon.js';
import { resolveFeatureIcon } from '../utils/feature-icons.js';
import { useScrollProgress } from '../hooks/useScrollProgress.js';

function SubHeroVideoBg({ src }) {
  const videoRef = useRef(null);
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const tryPlay = () => { el.play().catch(() => {}); };
    tryPlay();
    el.addEventListener('loadeddata', tryPlay);
    return () => el.removeEventListener('loadeddata', tryPlay);
  }, []);

  return (
    <div className="subhero__bg subhero__bg--video" aria-hidden="true">
      <video
        ref={videoRef}
        className="subhero__video"
        autoPlay
        muted
        loop
        playsInline
        preload="auto">
        <source src={src} type="video/mp4" />
      </video>
    </div>
  );
}

function SubHeroReferralNetworkBg() {
  return (
    <div className="subhero__bg" aria-hidden="true">
      <OptimizedImg
        webp="/assets/network.webp"
        src="/assets/network.png"
        alt=""
        className="subhero__bg-img subhero__bg-img--referral"
        width={1254}
        height={1254}
        loading="eager"
      />
    </div>
  );
}

function SubHero({ eyebrow, title, sub, primary, secondary, tone = 'light', variant, children }) {
  const ref = useRef(null);
  useScrollProgress(ref, variant === 'referral-network' ? { mode: 'hero' } : {});

  return (
    <section ref={ref} className={`subhero ${tone === "ink" ? "subhero--ink" : ""} ${variant ? `subhero--${variant}` : ""} ${children ? "" : "subhero--solo"}`}>
      {variant === 'why-card' && <div className="subhero__bg" aria-hidden="true" />}
      {variant === 'referral-network' && <SubHeroReferralNetworkBg />}
      {variant === 'innovation-video' && <SubHeroVideoBg src="/assets/innovation_sub.mp4" />}
      {variant === 'security-globe' && <SubHeroVideoBg src="/assets/infra_bg.mp4" />}
      <div className="shell subhero__grid">
        <div className="subhero__copy">
          {eyebrow && <span className="eyebrow"><span className="dot"></span> {eyebrow}</span>}
          <h1 className="subhero__title">{title}</h1>
          {sub && <p className="subhero__sub">{sub}</p>}
          {(primary || secondary) && (
            <div className="subhero__cta">
              {primary && <Link to={primary.href} className="btn btn--accent btn--lg">{primary.label} <Icon name="arrowRight" size={16} /></Link>}
              {secondary && <Link to={secondary.href} className="btn btn--outline btn--lg">{secondary.label}</Link>}
            </div>
          )}
        </div>
        {children && <div className="subhero__visual">{children}</div>}
      </div>
    </section>
  );
}

// Logo marquee for subpages
function LogoWall({ brands, dir }) {
  const loop = [...brands, ...brands];
  return (
    <div className="logowall" aria-hidden="true">
      <div className={`logowall__track ${dir === "rtl" ? "logowall__track--rtl" : ""}`}>
        {loop.map((b, i) => (
          <span className="logotile" key={i}>
            <span className="logotile__name" style={{ color: b.c }}>{b.n}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// Generic section band
function Band({ tone, tight, id, children }) {
  const cls = ["section"];
  if (tone === "subtle") cls.push("section--subtle");
  if (tone === "ink") cls.push("section--ink");
  if (tight) cls.push("section--tight");
  return <section id={id} className={cls.join(" ")}><div className="shell">{children}</div></section>;
}

function SectionHead({ eyebrow, title, lede }) {
  return (
    <div className="section-header">
      {eyebrow && <span className="eyebrow"><span className="dot"></span> {eyebrow}</span>}
      <h2 className="section-title">{title}</h2>
      {lede && <p className="section-lede">{lede}</p>}
    </div>
  );
}

// Icon feature rows / grid
function IconCards({ items, cols = 3 }) {
  return (
    <div className="iconcards" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {items.map((it) => {
        const FeatureIcon = resolveFeatureIcon(it.icon);
        return (
          <div className="iconcard" key={it.title}>
            <div className="iconcard__icon">
              {FeatureIcon ? (
                <FeatureIcon size={22} weight="duotone" aria-hidden="true" />
              ) : (
                <Icon name={it.icon} size={22} />
              )}
            </div>
            <div className="iconcard__title">{it.title}</div>
            <p className="iconcard__body">{it.body}</p>
          </div>
        );
      })}
    </div>
  );
}

// Numbered step flow
function StepFlow({ steps }) {
  return (
    <div className="flowsteps">
      {steps.map((s, i) => {
        const StepIcon = resolveStepIcon(s, i);
        return (
          <div className="flowstep" key={i}>
            <div className="flowstep__head">
              <h3 className="flowstep__title">
                <span className="flowstep__num">{String(i + 1).padStart(2, '0')}</span>
                <span className="flowstep__title-text">{s.title}</span>
              </h3>
              <div className="flowstep__ic">
                <StepIcon size={22} weight="duotone" aria-hidden="true" />
              </div>
            </div>
            <p className="flowstep__body">{s.body}</p>
            {s.note && <span className="flowstep__note">{s.note}</span>}
          </div>
        );
      })}
    </div>
  );
}

// Generic table — headers[], rows[][] (cells: string, {v, kind:'yes'|'no'|'em'}, or a React element)
function DataTable({ headers, rows, highlightCol, accentCol }) {
  const cell = (c) => {
    if (isValidElement(c)) return c;
    if (c && typeof c === "object") {
      if (c.kind === "yes") return <span className="dt-yes"><Icon name="checkCircle" size={16} /> {c.v}</span>;
      if (c.kind === "no") return <span className="dt-no"><Icon name="xCircle" size={16} /> {c.v}</span>;
      if (c.kind === "em") return <strong>{c.v}</strong>;
      return c.v;
    }
    return c;
  };
  const colClass = (ci) => `${ci === highlightCol ? "dt-hl" : ""} ${ci === accentCol ? "dt-accent" : ""}`.trim();

  return (
    <>
      <div className="dt-wrap dt-wrap--table">
        <table className="dt">
          <thead>
            <tr>{headers.map((h, i) => <th key={i} className={colClass(i)}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>
                {r.map((c, ci) => (
                  ci === 0
                    ? <th key={ci} scope="row">{cell(c)}</th>
                    : <td key={ci} className={colClass(ci)}>{cell(c)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="dt-cards">
        {rows.map((r, ri) => (
          <article className="dt-card" key={ri}>
            <h3 className="dt-card__feature">{cell(r[0])}</h3>
            <dl className="dt-card__rows">
              {r.slice(1).map((c, ci) => {
                const col = ci + 1;
                return (
                  <div key={col} className={`dt-card__row ${colClass(col)}`}>
                    <dt className="dt-card__label">{headers[col]}</dt>
                    <dd className="dt-card__value">{cell(c)}</dd>
                  </div>
                );
              })}
            </dl>
          </article>
        ))}
      </div>
    </>
  );
}

// Two-column split with media slot + text
function Split({ reverse, media, children, className = '' }) {
  return (
    <div className={[`split`, reverse && 'split--rev', className].filter(Boolean).join(' ')}>
      <div className="split__media">{media}</div>
      <div className="split__body">{children}</div>
    </div>
  );
}

function CtaBandVideoBg({ src }) {
  const videoRef = useRef(null);
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const tryPlay = () => { el.play().catch(() => {}); };
    tryPlay();
    el.addEventListener('loadeddata', tryPlay);
    return () => el.removeEventListener('loadeddata', tryPlay);
  }, []);

  return (
    <video
      ref={videoRef}
      className="ctaband__video"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true">
      <source src={src} type="video/mp4" />
    </video>
  );
}

// CTA band
function CtaBand({ title, sub, primary, tone = "ink", video }) {
  return (
    <section className="section section--tight">
      <div className="shell">
        <div className={`ctaband ${tone === "amber" ? "ctaband--amber" : ""} ${video ? "ctaband--video" : ""}`}>
          <div className="ctaband__bg">
            {video && <CtaBandVideoBg src={video} />}
          </div>
          <div className="ctaband__copy">
            <h2 className="ctaband__title">{title}</h2>
            {sub && <p className="ctaband__sub">{sub}</p>}
          </div>
          {primary && <Link to={primary.href} className="btn btn--accent btn--lg">{primary.label} <Icon name="arrowRight" size={16} /></Link>}
        </div>
      </div>
    </section>
  );
}

// Bullet list with check ticks
function CheckList({ items }) {
  return (
    <ul className="checklist">
      {items.map((it, i) => <li key={i}><span className="tick"><Icon name="check" size={12} stroke={3} /></span>{it}</li>)}
    </ul>
  );
}

// Simple stat tiles
function StatTiles({ items }) {
  return (
    <div className="stattiles">
      {items.map((s) => (
        <div className="stattile" key={s.label}>
          <div className="stattile__v">{s.value}</div>
          <div className="stattile__l">{s.label}</div>
          {s.src && <div className="stattile__src">{s.src}</div>}
        </div>
      ))}
    </div>
  );
}

export {
  SubHero, Band, SectionHead, IconCards, StepFlow, DataTable, Split, CtaBand, CheckList, StatTiles, LogoWall,
  onlineBrands, franchiseBrands,
};
