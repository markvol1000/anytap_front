import React, { useState } from 'react';
import { SubHero, Band, SectionHead, IconCards, StepFlow, DataTable, Split, CtaBand, StatTiles, CheckList } from './sub-common.jsx';
import { Icon } from './ui.jsx';
import { englishFormProps, handleEnglishSubmit } from '../utils/formValidation.js';

// Anytap — REFERRAL subpages: Why Referral / Earn More / Apply Now

// 4-1 Why Referral
function ReferralWhy() {
  return (
    <>
      <SubHero
        variant="referral-network"
        title={<>Share Anytap. <span className="subhero__accent">Earn</span> while you sleep.</>}
        sub="Every time a member you brought tops up their card, your earnings grow."
        primary={{ label: "Become a Referral", href: "/referral-apply" }} />

      <Band>
        <Split media={
          <div className="ref-card">
            <div className="ref-card__head"><span>Referral earnings</span><span className="ref-card__live"><span className="dot"></span> Live</span></div>
            <div className="ref-card__amount">$2,410<span>.25</span></div>
            <div className="ref-card__sub">This month · paid in USDT</div>
            <div className="ref-card__bars">{[42,58,50,72,64,88,100].map((h,i)=><span key={i} style={{height:`${h}%`}}></span>)}</div>
            <div className="ref-card__row">
              <div><div className="ref-card__row-k">Active referrals</div><div className="ref-card__row-v">312</div></div>
              <div><div className="ref-card__row-k">Commission tier</div><div className="ref-card__row-v">0.2%</div></div>
            </div>
          </div>
        }>
          <SectionHead eyebrow="Overview" title="It's not about selling cards" />
          <p className="prose">The Anytap Referral Program isn't about selling cards directly. You share a referral link, and earn continuously while the members you bring use the service.</p>
          <CheckList items={[
            "Start with a simple online application — no complex process.",
            "Get active the moment your referral code is issued.",
            "Settled monthly, paid in USDT.",
          ]} />
        </Split>
      </Band>

      <Band tone="subtle">
        <SectionHead eyebrow="Cumulative earnings" title="Earn More Scenarios" />
        <DataTable
          highlightCol={1}
          headers={["Scenario", "Estimated monthly earnings"]}
          rows={[
            ["10 referred members × $1,000 top-up / month", { v: "Up to $20 USDT / month", kind: "em" }],
            ["50 referred members × $1,000 top-up / month", { v: "Up to $100 USDT / month", kind: "em" }],
            ["100 referred members × $1,000 top-up / month", { v: "Up to $200 USDT / month", kind: "em" }],
          ]} />
      </Band>
    </>
  );
}

// 4-2 Earn More
function ReferralEarn() {
  return (
    <>
      <SubHero
        variant="gradient"
        title={<>One program. One goal: maximize your <span className="subhero__accent">earnings</span>.</>}
        sub="Become an Anytap Referral Partner and start earning."
        primary={{ label: "Become a Referral", href: "/referral-apply" }} />

      <Band>
        <SectionHead eyebrow="Commission" title="Referral Partner Commission" />
        <DataTable
          highlightCol={1}
          headers={["Item", "Referral Partner"]}
          rows={[
            ["Card issuance bonus", "$10 USDT per card"],
            ["Top-up fee income", "0.2% of every top-up"],
            ["How to join", "Apply → Admin approval"],
          ]} />
      </Band>

      <Band tone="subtle">
        <SectionHead
          eyebrow="Top-up fee"
          title="What is Top-Up Fee Income?"
          lede="A fee is applied each time an Anytap card is topped up. As a referral partner, you automatically receive a share of that fee every time your referred member tops up. As long as your members keep topping up, your income keeps growing."
        />
      </Band>

      <Band>
        <SectionHead eyebrow="Competitive edge" title="Anytap vs competitors" />
        <DataTable
          highlightCol={1}
          headers={["", "Anytap", "Competitors"]}
          rows={[
            ["Real-time earnings tracking", { v: "Yes", kind: "yes" }, { v: "No", kind: "no" }],
            ["Instant withdrawal requests", { v: "Yes", kind: "yes" }, "Limited"],
            ["Lifetime earnings structure", { v: "Yes", kind: "yes" }, "Partial"],
            ["Industry-leading earning rate", { v: "Yes", kind: "yes" }, "Average"],
            ["Referral dashboard", { v: "Yes", kind: "yes" }, "Limited"],
          ]} />
      </Band>

      <Band tone="subtle">
        <SectionHead eyebrow="Simulation" title="Monthly earnings simulation" lede="Top-up commission recurs every month for as long as your members stay active." />
        <DataTable
          highlightCol={1}
          headers={["Member monthly top-up", "Referral Partner (0.2%)"]}
          rows={[
            ["$1,000 USDT", { v: "$2 USDT", kind: "em" }],
            ["$10,000 USDT", { v: "$20 USDT", kind: "em" }],
            ["$100,000 USDT", { v: "$200 USDT", kind: "em" }],
          ]} />
      </Band>

      <Band tone="subtle">
        <SectionHead eyebrow="Settlement" title="How and when you get paid" />
        <DataTable
          headers={["Item", "Detail"]}
          rows={[
            ["Settlement date", "Paid once in the following month. May change later by partner."],
            ["Payout currency", { v: "USDT", kind: "em" }],
            ["Payout method", "Request withdrawal from the referral dashboard → reviewed → paid"],
            ["Sign-up commission", "Settled the following month after KYC + card issuance complete"],
            ["Top-up commission", "Monthly commission totaled, settled the following month"],
          ]} />
      </Band>
    </>
  );
}

// 4-3 Apply Now
function ReferralForm() {
  const [done, setDone] = useState(false);
  if (done) {
    return (
      <div className="refform refform--done">
        <div className="refform__check"><Icon name="checkCircle" size={40} /></div>
        <h3>Application received</h3>
        <p>Thank you. Our team will review your application and email you the decision shortly.</p>
      </div>
    );
  }
  return (
    <form className="refform" {...englishFormProps} onSubmit={handleEnglishSubmit(() => setDone(true))}>
      <div className="refform__field"><label>Full name *</label><input type="text" required placeholder="Enter your full name" /></div>
      <div className="refform__field"><label>Email *</label><input type="email" required placeholder="Enter your email" /></div>
      <div className="refform__field"><label>Contact (Telegram / WhatsApp) *</label><input type="text" required placeholder="Enter your contact handle" /></div>
      <div className="refform__field"><label>Main channel (blog / SNS / community)</label><input type="text" placeholder="Enter your main channel" /></div>
      <div className="refform__field">
        <label>Expected monthly referrals</label>
        <select defaultValue=""><option value="" disabled>Select…</option><option>1–50</option><option>51–200</option><option>201 or more</option></select>
      </div>
      <div className="refform__field refform__field--full"><label>Short introduction</label><textarea rows="4" placeholder="Enter a short introduction"></textarea></div>
      <div className="refform__actions">
        <button type="submit" className="btn btn--accent btn--lg">Submit <Icon name="arrowRight" size={16} /></button>
        <span className="refform__note">Your information is used only for referral review and is never shared.</span>
      </div>
    </form>
  );
}

function ReferralApply() {
  return (
    <>
      <SubHero
        title={<>Join the Anytap <span className="subhero__accent">Referral</span> Program</>}
        sub="Become a referral and receive your referral code." />

      <Band>
        <SectionHead eyebrow="How it works" title="From application to code" />
        <StepFlow steps={[
          { title: "Apply", body: "Fill out the short application form below." },
          { title: "Review", body: "Our team reviews your application and channels." },
          { title: "Approve", body: "Approved applicants receive confirmation by email." },
          { title: "Get your code", body: "Your referral code is issued — start sharing right away." },
        ]} />
      </Band>

      <Band tone="subtle">
        <SectionHead eyebrow="Application" title="Tell us about you" lede="Bloggers, YouTubers, SNS creators, community managers and crypto investors are all welcome." />
        <ReferralForm />
      </Band>
    </>
  );
}

export { ReferralWhy, ReferralEarn, ReferralApply };
