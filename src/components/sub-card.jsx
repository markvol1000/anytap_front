import { SubHero, Band, SectionHead, IconCards, StepFlow, DataTable, Split, CtaBand, CheckList, StatTiles, LogoWall, onlineBrands, franchiseBrands } from './sub-common.jsx';
import { Icon, PayBrand, NetMark, AccountCreatePhone } from './ui.jsx';
import { DepositTutorial } from './DepositTutorial.tsx';

// Anytap — CARD subpages: How to Use / Who Can Apply / Card Benefits

// 1-1 How to Use
function CardHowToUse() {
  return (
    <>
      <SubHero
        variant="why-card"
        title={<>Get your card in 6 <span className="subhero__accent">simple</span> steps</>}
        sub="No bank account. Just an online application — and your own crypto card you can use anywhere in the world." />

      <Band>
        <SectionHead eyebrow="Issuance" title="From sign-up to spending" />
        <StepFlow steps={[
          { title: "Create Account", body: "Register with your email on the Anytap website. No app install required — start instantly on the web." },
          { title: "Complete KYC", body: "Submit a government ID and a selfie to verify your identity.", note: "Up to 2 business days" },
          { title: "Apply for a Card", body: "Choose a virtual or physical Visa and submit your application." },
          { title: "Card Issuing", body: "Pay the issuance fee, then we create your card. Physical cards ship to your door.", note: "Virtual fast · Physical 7–14 days" },
          { title: "Activate Card", body: "When your card arrives, register the card number in the app to unlock your wallet." },
          { title: "Top Up & Spend", body: "Add USDT or USDC and you're set — pay at any Visa merchant worldwide." },
        ]} />
      </Band>

      <Band tone="subtle">
        <SectionHead
          eyebrow="Top up"
          title="How to add money"
          lede="Follow the deposit flow on mobile — TRC-20 only, then scan or copy your address."
        />
        <DepositTutorial />
      </Band>

      <Band>
        <SectionHead eyebrow="Mobile pay" title="Add it to your phone wallet" lede="After your virtual card is issued, register it to a phone wallet and tap to pay at any NFC terminal." />
        <div className="walletpay">
          <div className="walletpay__card">
            <div className="walletpay__logo walletpay__logo--lg"><PayBrand name="apple" /></div>
            <p className="walletpay__body">iPhone Wallet app → Add card → enter your Anytap card details.</p>
          </div>
          <div className="walletpay__card">
            <div className="walletpay__logo walletpay__logo--lg"><PayBrand name="samsung" /></div>
            <p className="walletpay__body">Samsung Wallet app → Add card → scan or enter your Anytap card.</p>
          </div>
          <div className="walletpay__card">
            <div className="walletpay__logo walletpay__logo--lg"><PayBrand name="google" /></div>
            <p className="walletpay__body">Google Wallet app → Add card → confirm and start tapping.</p>
          </div>
        </div>
      </Band>
    </>
  );
}

// 1-2 Who Can Apply
function CardWhoCanApply() {
  return (
    <>
      <SubHero
        title={<>Who is <span className="subhero__accent">Anytap Card</span> for?</>}
        sub="If you hold crypto, you can apply — from anywhere in the world." />

      <Band>
        <Split media={<div className="acctphone-sm"><AccountCreatePhone /></div>}>
          <SectionHead eyebrow="Eligibility" title="Application requirements" />
          <CheckList items={[
            "18 years or older",
            "A valid government ID (passport or national ID)",
            "Holder of USDT or USDC",
            "Not a resident of an OFAC-sanctioned country",
          ]} />
        </Split>
      </Band>

      <Band tone="subtle">
        <SectionHead eyebrow="Who it's for" title="Made for these people" />
        <IconCards cols={4} items={[
          { icon: "plane", title: "Travelers", body: "Spend abroad with no currency exchange hassle." },
          { icon: "briefcase", title: "Digital nomads", body: "A global payment method without a local bank account." },
          { icon: "chart", title: "Investors", body: "Use crypto holdings for everyday spending." },
          { icon: "globe", title: "Expats", body: "Reliable cross-border payments wherever you live." },
        ]} />
      </Band>

      <Band>
        <SectionHead eyebrow="Card specs" title="Virtual vs physical" />
        <div className="vvtable">
          <div className="vvtable__head">
            <div className="vvtable__hcell"><Icon name="phone" size={16} /> Virtual</div>
            <div className="vvtable__hcell vvtable__hcell--mid">Comparison standards</div>
            <div className="vvtable__hcell"><Icon name="creditCard" size={16} /> Physical</div>
          </div>
          <div className="vvtable__row">
            <div className="vvtable__cell"><NetMark name="visa" /></div>
            <div className="vvtable__cell vvtable__cell--mid">Card network</div>
            <div className="vvtable__cell"><NetMark name="visa" /></div>
          </div>
          <div className="vvtable__row">
            <div className="vvtable__cell">Instant</div>
            <div className="vvtable__cell vvtable__cell--mid">Issuance time</div>
            <div className="vvtable__cell">7–14 business days</div>
          </div>
          <div className="vvtable__row">
            <div className="vvtable__cell vvtable__cell--logos"><PayBrand name="apple" /><PayBrand name="samsung" /><PayBrand name="google" /></div>
            <div className="vvtable__cell vvtable__cell--mid">Mobile pay</div>
            <div className="vvtable__cell"><PayBrand name="google" /></div>
          </div>
          <div className="vvtable__row">
            <div className="vvtable__cell">Online</div>
            <div className="vvtable__cell vvtable__cell--mid">Where to use</div>
            <div className="vvtable__cell">Online, offline &amp; ATM</div>
          </div>
          <div className="vvtable__row">
            <div className="vvtable__cell"><span className="vvtable__x"><Icon name="xCircle" size={22} /></span></div>
            <div className="vvtable__cell vvtable__cell--mid">ATM withdrawal</div>
            <div className="vvtable__cell"><span className="vvtable__check"><Icon name="checkCircle" size={22} /></span></div>
          </div>
        </div>
      </Band>
    </>
  );
}

// 1-3 Card Benefits
function CardBenefits() {
  return (
    <>
      <SubHero
        title={<>Why <span className="subhero__accent">Anytap Card</span>?</>}
        sub="The most reliable crypto card, running on an infrastructure of 60+ global BINs." />

      <Band>
        <SectionHead eyebrow="Key benefits" title="Five reasons it stands out" />
        <IconCards cols={3} items={[
          { icon: "globe", title: "Spend at any Visa merchant", body: "Use it identically at tens of millions of Visa merchants worldwide — no manual currency exchange." },
          { icon: "phone", title: "Apple · Samsung · Google Pay", body: "Register to your phone wallet and complete payment with a single NFC tap." },
          { icon: "bank", title: "No bank account needed", body: "Get issued through an online application alone — no separate bank account required." },
          { icon: "zap", title: "Instant USDT / USDC top-up", body: "Reflected within minutes on the TRC-20 network." },
          { icon: "shield", title: "60+ BINs, no downtime", body: "If one stops, traffic switches to another instantly — service continuity guaranteed." },
          { icon: "checkCircle", title: "Licensed & compliant", body: "US MSB/MTL, PCI DSS L1 and Singapore Visa TPA — held where competitors fall short." },
        ]} />
      </Band>

      <Band>
        <div className="bin-redundancy">
          <SectionHead eyebrow="BIN redundancy" title="Never stops working" />
          <p className="prose prose--accent">Most crypto cards depend on just one or two issuers (BINs). If that partner faces a regulatory probe or outage, every card freezes at once.</p>
          <p className="prose">Anytap maintains 60+ BIN partners. When one stops, traffic switches instantly to another — so you never experience an interruption.</p>
        </div>
      </Band>

      <Band tone="subtle">
        <SectionHead eyebrow="Comparison" title="Anytap vs typical competitors" />
        <DataTable
          highlightCol={1}
          headers={["Feature", "Anytap", "Typical competitor"]}
          rows={[
            ["BIN redundancy", { v: "60+, instant switch", kind: "em" }, { v: "1–2 (downtime risk)", kind: "no" }],
            ["Apple Pay", { v: "Official", kind: "yes" }, { v: "Unofficial / none", kind: "no" }],
            ["Samsung Pay", { v: "Official", kind: "yes" }, { v: "None", kind: "no" }],
            ["Google Pay", { v: "Official", kind: "yes" }, "Partial"],
            ["Global licenses", { v: "US MSB/MTL · PCI DSS L1 · SG Visa TPA", kind: "em" }, { v: "Often none", kind: "no" }],
            ["Dedicated support", { v: "Yes", kind: "yes" }, { v: "No", kind: "no" }],
          ]} />
      </Band>

      <Band>
        <SectionHead eyebrow="Where to use" title="Online and offline, everywhere" lede="Anywhere Visa is accepted — across 180+ countries." />
      </Band>
      <LogoWall brands={onlineBrands} dir="rtl" />
      <LogoWall brands={franchiseBrands} dir="rtl" />
      <Band>
        <p className="wheretouse__note">
          …and tens of millions more merchants worldwide. If it takes Visa,
          it takes Anytap.
        </p>
      </Band>
    </>
  );
}

export { CardHowToUse, CardWhoCanApply, CardBenefits };
