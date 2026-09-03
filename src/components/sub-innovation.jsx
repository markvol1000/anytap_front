import React from 'react';
import { SubHero, Band, SectionHead, IconCards, StepFlow, DataTable, Split, CtaBand, StatTiles } from './sub-common.jsx';
import { Icon } from './ui.jsx';

// Anytap — INNOVATION subpages: Tech Stack / Web3 Vision / Market Outlook

// Infrastructure partners + licensing trust block (used on Tech page)
function PartnerTrust() {
  const partners = [
    {
      name: "Global Card Rails",
      role: "Card-issuing infrastructure",
      body: "Global BIN sponsorship and card-issuing rails behind Anytap's 60+ BIN redundancy — the backbone that keeps cards live.",
      tags: ["Visa principal program", "PCI DSS Level 1"],
    },
    {
      name: "Enterprise Custody",
      role: "Wallet & custody infrastructure",
      body: "Enterprise-grade wallet orchestration and on-chain settlement, so customer balances stay non-custodial and auditable.",
      tags: ["MPC wallet security", "On-chain settlement"],
    },
  ];
  return (
    <div className="ptrust">
      {partners.map((p) => (
        <div className="ptrust__card" key={p.name}>
          <div className="ptrust__top">
            <span className="ptrust__logo">{p.name}</span>
            <span className="ptrust__role">{p.role}</span>
          </div>
          <p className="ptrust__body">{p.body}</p>
          <div className="ptrust__tags">
            {p.tags.map((t) => <span className="ptrust__tag" key={t}><Icon name="checkCircle" size={14} /> {t}</span>)}
          </div>
        </div>
      ))}
    </div>
  );
}

// 3-1 Our Tech Stack
function InnovationTech() {
  return (
    <>
      <SubHero
        variant="innovation-video"
        title={<>Infrastructure you can <span className="subhero__accent">trust</span></>}
        sub="Even if a single service goes down, Anytap keeps working — built on licensed, redundant rails." />

      <Band tone="subtle">
        <SectionHead eyebrow="Licensed & certified" title="Backed by regulated infrastructure" lede="Card issuance and custody run on established, licensed rails — so reliability is structural, not promised." />
        <div className="liccred">
          <span className="liccred__item"><Icon name="shield" size={16} /> PCI DSS Level 1</span>
          <span className="liccred__item"><Icon name="bank" size={16} /> US &amp; Canada MSB</span>
          <span className="liccred__item"><Icon name="checkCircle" size={16} /> Singapore Visa TPA</span>
          <span className="liccred__item"><Icon name="lock" size={16} /> RSA-encrypted card data</span>
        </div>
      </Band>

      <Band>
        <SectionHead eyebrow="Risk management" title="A 3-layer risk control system" lede="Industry-leading low fraud-decline rates, maintained by three layers working together." />
        <IconCards cols={3} items={[
          { icon: "shield", title: "Layer 1 · Real-time rule engine", body: "200+ rules inspect every transaction instantly. High-risk merchant codes (gambling, adult, etc.) are blocked automatically." },
          { icon: "eye", title: "Layer 2 · Behavioral model", body: "Analyzes transaction time, merchant type and device data. Unusual patterns are detected and handled at once." },
          { icon: "cpu", title: "Layer 3 · AI detection", body: "Scores each transaction's risk (0–100) in real time. Above threshold, it auto-declines or requests step-up authentication." },
        ]} />
      </Band>
    </>
  );
}

// 3-2 Web3 Vision
function InnovationVision() {
  return (
    <>
      <SubHero
        variant="gradient"
        title={<><span className="subhero__accent">Borderless</span> — spend crypto, anywhere, anytime</>}
        sub="How stablecoins are changing the world. Anytap is at the front line." />

      <Band>
        <SectionHead eyebrow="Roadmap" title="Anytap's three phases" />
        <div className="roadmap">
          <div className="phase phase--1">
            <div className="phase__when">Phase 01 · 2026</div>
            <div className="phase__name">Crypto Debit Card</div>
            <p className="phase__body">Distribute crypto debit cards across Asia. Building a consumer base comes first.</p>
          </div>
          <div className="phase phase--2">
            <div className="phase__when">Phase 02 · 2026–2027</div>
            <div className="phase__name">Cross-border Payment</div>
            <p className="phase__body">Add a business revenue layer with white-label payment solutions — for gaming, fintech and exchanges.</p>
          </div>
          <div className="phase phase--3">
            <div className="phase__when">Phase 03 · 2027–</div>
            <div className="phase__name">Anytap Coin (ATC)</div>
            <p className="phase__body">Issue a usage-backed token where card volume directly drives token demand. Targeting top-10 global exchange listings.</p>
          </div>
        </div>
      </Band>

      <Band tone="subtle">
        <SectionHead eyebrow="The shift" title="A new way to pay, built on stablecoins" />
        <StatTiles items={[
          { value: "$27.6T", label: "Global stablecoin annual volume", src: "Visa / ARK Investment 2025" },
          { value: "Up to 80%", label: "Cheaper than legacy remittance", src: "" },
          { value: "24/7/365", label: "Instant settlement, no banking days", src: "" },
        ]} />
        <p className="prose" style={{ marginTop: 28, textAlign: 'center', maxWidth: 720, marginInline: 'auto' }}>Anytap is the real-world touchpoint for this flow. We're building a world where anyone holding crypto can pay anywhere with just a smartphone.</p>
      </Band>
    </>
  );
}

// 3-3 Market Outlook
function InnovationMarket() {
  return (
    <>
      <SubHero
        variant="gradient"
        title={<>The market is <span className="subhero__accent">ready</span>. The gap is real.</>}
        sub="What the data says about the opportunity right now." />

      <Band>
        <SectionHead eyebrow="Key data" title="The numbers behind the moment" />
        <StatTiles items={[
          { value: "$27.6T", label: "Global stablecoin annual volume", src: "Visa / ARK Investment 2025" },
          { value: "4M+", label: "Leading crypto-card users", src: "Cointelegraph 2025" },
          { value: "2M+", label: "Top crypto cards issued", src: "Industry report 2025" },
        ]} />
      </Band>

      <Band tone="subtle">
        <SectionHead eyebrow="Why Anytap" title="Why Anytap is chosen" />
        <DataTable
          highlightCol={1}
          headers={["", "Anytap", "Competitors"]}
          rows={[
            ["Physical card shipping", { v: "Global shipping", kind: "yes" }, { v: "None or downtime risk", kind: "no" }],
            ["BIN redundancy", { v: "60+", kind: "em" }, { v: "None", kind: "no" }],
            ["Global licenses", { v: "US MSB/MTL · PCI DSS L1 · SG Visa TPA", kind: "em" }, { v: "Often none", kind: "no" }],
            ["Dedicated support", { v: "Yes", kind: "yes" }, { v: "No", kind: "no" }],
          ]} />
      </Band>
    </>
  );
}

export { InnovationTech, InnovationVision, InnovationMarket };
