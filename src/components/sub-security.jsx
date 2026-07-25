import React from 'react';
import { SubHero, Band, SectionHead, CheckList, CtaBand } from './sub-common.jsx';
import { Icon } from './ui.jsx';

// Anytap — SECURITY single page

function SecurityPage() {
  const partners = [
    { name: "Chainalysis", icon: "eye", role: "Blockchain transaction monitoring & risky-fund detection" },
    { name: "TRM Labs", icon: "chart", role: "Crypto transaction risk analysis" },
    { name: "Elliptic", icon: "shield", role: "Anti-money-laundering compliance" },
    { name: "Sumsub", icon: "checkCircle", role: "KYC / KYB identity verification" },
  ];
  return (
    <>
      <SubHero
        tone="ink"
        variant="security-globe"
        title={<>Your <span className="subhero__accent">crypto</span>. Our responsibility.</>}
        sub="Anytap runs on infrastructure certified by financial authorities.">
        <div className="secart">
          <div className="secart__glow"></div>
          <div className="secart__shield">
            <Icon name="shield" size={68} />
            <div className="secart__lock"><Icon name="lock" size={26} /></div>
          </div>
          <div className="secart__chips">
            <span className="secart__chip"><Icon name="checkCircle" size={14} /> PCI DSS L1</span>
            <span className="secart__chip"><Icon name="eye" size={14} /> 24/7 monitoring</span>
            <span className="secart__chip"><Icon name="lock" size={14} /> RSA encryption</span>
          </div>
          <div className="secart__grid" aria-hidden="true">
            {Array.from({ length: 36 }).map((_, i) => <span key={i}></span>)}
          </div>
        </div>
      </SubHero>

      <Band tone="ink">
        <SectionHead eyebrow="Risk control" title="Triple-layered risk control" />
        <div className="seclayers">
          <div className="seclayer">
            <div className="seclayer__ic"><Icon name="shield" size={22} /></div>
            <div>
              <div className="seclayer__n">Layer 1 · Real-time rule engine</div>
              <div className="seclayer__t">200+ rules, every transaction</div>
              <p className="seclayer__b">Every transaction is inspected instantly. High-risk merchant codes (gambling, adult, etc.) are blocked automatically.</p>
            </div>
          </div>
          <div className="seclayer">
            <div className="seclayer__ic"><Icon name="eye" size={22} /></div>
            <div>
              <div className="seclayer__n">Layer 2 · Behavioral risk model</div>
              <div className="seclayer__t">Pattern-aware detection</div>
              <p className="seclayer__b">Analyzes transaction time, merchant type and device data. Patterns that differ from the norm are detected and handled immediately.</p>
            </div>
          </div>
          <div className="seclayer">
            <div className="seclayer__ic"><Icon name="cpu" size={22} /></div>
            <div>
              <div className="seclayer__n">Layer 3 · AI detection</div>
              <div className="seclayer__t">Real-time risk scoring (0–100)</div>
              <p className="seclayer__b">Each transaction is scored in real time. Above the threshold, it is auto-declined or step-up authentication is requested.</p>
            </div>
          </div>
        </div>
      </Band>

      <Band>
        <div className="secsplit">
          <div className="secsplit__col">
            <SectionHead eyebrow="KYC / AML" title="Fully compliant by design" />
            <p className="prose">Anytap fully complies with international anti-money-laundering (AML) and counter-terrorist-financing (CFT) regulations.</p>
            <CheckList items={[
              "Valid government-issued ID required",
              "Biometric selfie verification",
              "Proof of residence (when required)",
            ]} />
            <p className="prose" style={{ marginTop: 18 }}>Anytap monitors suspicious transactions and is obligated to report to the relevant authorities. Accounts confirmed for fraudulent use may be suspended without prior notice.</p>
          </div>
          <div className="secsplit__col">
            <SectionHead eyebrow="Privacy" title="Your data, protected" />
            <CheckList items={[
              "Sensitive data such as card number and CVV is RSA-encrypted and delivered only to your device — never stored on our servers.",
              "Personal data collected during KYC is retained per legally required periods.",
              "All API communication runs over encrypted channels.",
            ]} />
          </div>
        </div>
      </Band>

      <Band tone="subtle">
        <SectionHead eyebrow="External partners" title="Backed by leading security partners" lede="Anytap integrates the industry's most trusted compliance and risk providers — so every transaction is screened by best-in-class tooling." />
        <div className="partnerlogos">
          {partners.map((p) => (
            <div className="partnerlogo" key={p.name}>
              <div className="partnerlogo__ic"><Icon name={p.icon} size={22} /></div>
              <div className="partnerlogo__name">{p.name}</div>
              <div className="partnerlogo__role">{p.role}</div>
            </div>
          ))}
        </div>
        <div className="secbadges secbadges--tight">
          <div className="secbadges__row">
            {[
              { icon: "shield", label: "PCI DSS Level 1" },
              { icon: "bank", label: "US MSB · MTL" },
              { icon: "checkCircle", label: "Singapore Visa TPA" },
              { icon: "layers", label: "3-Layer Risk Control" },
              { icon: "lock", label: "RSA Encrypted" },
            ].map((b) => (
              <div className="secbadge" key={b.label}>
                <div className="secbadge__icon"><Icon name={b.icon} size={20} /></div>
                <span>{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </Band>

      <CtaBand
        title="24/7 monitoring. Always watching."
        sub="Spotted something suspicious? Contact our support team right away — our response system runs around the clock."
        primary={{ label: "Contact Support", href: "/contact" }} />
    </>
  );
}

export { SecurityPage };
