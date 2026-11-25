import { Link } from 'react-router-dom';
import { SubHero, Band, SectionHead, IconCards, StepFlow, DataTable, Split, CtaBand, CheckList, StatTiles, LogoWall, onlineBrands, franchiseBrands } from './sub-common.jsx';
import { Icon, PayBrand, NetMark, AccountCreatePhone } from './ui.jsx';
import { DepositTutorial } from './DepositTutorial.tsx';
import { EASY_TOPUP_FAQ } from '../lib/faq-content.ts';
import { useState } from 'react';

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
          { title: "Card Issuing", body: "Pay the issuance fee (virtual 20 USDT, physical 100 USDT), then we create your card. Physical cards are shipped to your door directly by Anytap. Up to 3 physical cards per person.", note: "Virtual fast · Physical 7–14 days" },
          { title: "Activate Card", body: "When your card arrives, register the card number in your Anytap dashboard to unlock your wallet." },
          { title: "Top Up & Spend", body: "Top up with USDT (TRC-20) or Easy Top Up, and you're set — pay at any Visa merchant worldwide." },
        ]} />
      </Band>

      <Band tone="subtle">
        <SectionHead
          eyebrow="Top up"
          title="How to add money"
          lede="Follow the deposit flow on mobile — TRC-20 only, then scan or copy your address."
        />
        <DepositTutorial />
        <p className="prose" style={{ marginTop: 28 }}>
          Top-up fee: 2%, deducted in USDT at top-up. No maximum top-up amount.
        </p>
        <p className="prose">
          Prefer to pay in local currency? <Link to="/card-easy-top-up">Use Easy Top Up →</Link>
        </p>
      </Band>

      <Band>
        <SectionHead eyebrow="Mobile pay" title="Add it to your phone wallet" lede="Both virtual and physical cards can be added to Apple Pay, Google Pay and Samsung Pay. Tap to pay at any NFC terminal." />
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
        sub="Hold USDT — or top up in your local currency with Easy Top Up. Apply online from any country where card issuance is available." />

      <Band>
        <Split media={<div className="acctphone-sm"><AccountCreatePhone /></div>}>
          <SectionHead eyebrow="Eligibility" title="Application requirements" />
          <CheckList items={[
            "18 years or older",
            "A valid government ID (passport or national ID)",
            "Able to top up with USDT (TRC-20) or with local currency via Easy Top Up",
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
          <div className="vvtable__row">
            <div className="vvtable__cell">20 USDT</div>
            <div className="vvtable__cell vvtable__cell--mid">Issuance fee</div>
            <div className="vvtable__cell">100 USDT</div>
          </div>
          <div className="vvtable__row">
            <div className="vvtable__cell">—</div>
            <div className="vvtable__cell vvtable__cell--mid">Cards per person</div>
            <div className="vvtable__cell">Physical up to 3</div>
          </div>
          <div className="vvtable__row">
            <div className="vvtable__cell">None</div>
            <div className="vvtable__cell vvtable__cell--mid">Annual fee</div>
            <div className="vvtable__cell">None</div>
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
        <SectionHead eyebrow="Key benefits" title="Reasons it stands out" />
        <IconCards cols={3} items={[
          { icon: "globe", title: "Spend at any Visa merchant", body: "Use it identically at tens of millions of Visa merchants worldwide — no manual currency exchange." },
          { icon: "phone", title: "Apple · Samsung · Google Pay", body: "Register to your phone wallet and complete payment with a single NFC tap." },
          { icon: "bank", title: "No bank account needed", body: "Get issued through an online application alone — no separate bank account required." },
          { icon: "zap", title: "Two ways to top up", body: "USDT on TRC-20, reflected within minutes, or Easy Top Up in your local currency." },
          { icon: "shield", title: "60+ BINs, no downtime", body: "If one stops, traffic switches to another instantly — designed for uninterrupted service." },
          { icon: "checkCircle", title: "Licensed & compliant", body: "US MSB/MTL, PCI DSS L1 and Singapore Visa TPA — held where competitors fall short." },
          { icon: "creditCard", title: "Up to 3 physical cards", body: "Limits apply per card, so 3 cards give you up to 3x the payment and ATM limits." },
          { icon: "swap", title: "Free card-to-card transfers", body: "Send balance using just an email address." },
          { icon: "checkCircle", title: "No annual fee", body: "Pay only when you use it." },
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
        <SectionHead eyebrow="Limits" title="Card limits (per card)" />
        <DataTable
          headers={["Limit", "Amount"]}
          rows={[
            ["Virtual card", "$150,000 per transaction · $200,000 per day · $1,000,000 per month"],
            ["Apple Pay / Google Pay", "$100,000 per transaction · $200,000 per day · $5,000,000 per month"],
            ["Physical card", "$20,000 per transaction · $250,000 per day (up to 100 transactions) · $1,000,000 per month"],
            ["ATM", "$1,500 per withdrawal · $1,500 per day (up to 30) · $15,000 per month"],
            ["Top-up", "no limit"],
          ]} />
        <p className="prose" style={{ marginTop: 24 }}>
          Limits apply per card. With 3 physical cards, you can spend and withdraw up to 3x the single-card limits — for example, up to $3,000,000 per month in payments, and $4,500 per day and $45,000 per month at ATMs.
        </p>
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

function CardEasyTopUp() {
  const [openKey, setOpenKey] = useState(null);
  return (
    <>
      <SubHero
        eyebrow="Easy Top Up"
        badge="Coming soon"
        title={<>Top up with your <span className="subhero__accent">local currency.</span></>}
        sub="No crypto exchange account. No wallet. Just send money from a remittance provider or bank in your country — it arrives on your Anytap card as USDT."
        primary={{ label: "Get your card", href: "/sign-up" }}
        secondary={{ label: "How it works", href: "#how-it-works" }}
      />
      <Band>
        <ul className="easyup__chips" aria-label="Easy Top Up highlights">
          {["No exchange needed", "Your own virtual account", "Automatic card top-up", "Minimum 50 USDT"].map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </Band>
      <Band id="how-it-works">
        <SectionHead
          eyebrow="How it works"
          title="From your local currency to your card in 5 steps"
          lede="Easy Top Up connects your local money transfer to your Anytap card."
        />
        <StepFlow steps={[
          { title: "You", body: "Send money in your local currency using your usual remittance provider or bank.", note: "e.g. KRW" },
          { title: "Local remittance provider or bank", body: "Sends your money abroad to your personal virtual account.", note: "in your country" },
          { title: "Global virtual account provider", body: "Your personal virtual account receives USD and converts it to USDT.", note: "on-ramp service" },
          { title: "Anytap", body: "USDT is delivered automatically — no wallet in between.", note: "closed, secure path" },
          { title: "Your Anytap Visa card", body: "Your balance is topped up and ready to spend anywhere Visa is accepted.", note: "virtual & physical" },
        ]} />
        <p className="prose" style={{ marginTop: 28, textAlign: "center" }}>
          1 member = 1 personal virtual account · One card: topped up automatically · Two or more cards: you choose
        </p>
      </Band>
      <Band tone="subtle">
        <SectionHead eyebrow="Flow" title="What happens at each step" />
        <DataTable
          headers={["Step", "Who", "What happens", "What you do", "Money"]}
          rows={[
            ["1", "You", "You send money in your local currency.", "Make a transfer in your remittance or banking app.", "Local currency"],
            ["2", "Local remittance provider or bank", "Your provider sends the money abroad to your personal virtual account.", "Nothing — your provider handles it.", "Local currency → USD"],
            ["3", "Global virtual account provider", "Your personal virtual account receives USD and converts it to USDT through an on-ramp service.", "Nothing — it happens automatically.", "USD → USDT"],
            ["4", "Anytap", "The USDT is delivered to Anytap automatically.", "Nothing — there is no wallet to manage.", "USDT"],
            ["5", "Your Anytap Visa card", "Your card balance is topped up (2% top-up fee deducted in USDT).", "One card: nothing. Two or more cards: choose the card.", "Card balance"],
          ]}
        />
      </Band>
      <Band>
        <SectionHead eyebrow="Why Easy Top Up" title="Built for people who just want to spend" />
        <IconCards cols={2} items={[
          { icon: "bank", title: "01 No exchange needed", body: "In some countries buying USDT is hard. With Easy Top Up you don't need a crypto exchange account or your own wallet." },
          { icon: "wallet", title: "02 Your own virtual account", body: "Every member gets one personal virtual account, used only for your top-ups." },
          { icon: "zap", title: "03 Automatic", body: "One card is topped up automatically. With two or more cards, you choose which one." },
          { icon: "shield", title: "04 Licensed partners", body: "On-ramp services come from licensed partners, and strict KYC standards apply to every customer." },
        ]} />
      </Band>
      <Band tone="subtle">
        <SectionHead eyebrow="Fees and limits" title="Good to know — Fees and limits" />
        <StatTiles items={[
          { value: "2%", label: "Top-up fee: Deducted in USDT when your top-up is processed." },
          { value: "50 USDT", label: "Minimum top-up: No maximum on a single top-up." },
          { value: "Your provider", label: "Transfer fees & exchange rate: Your remittance provider or bank may charge its own transfer fees and applies its own exchange rate." },
        ]} />
        <p className="prose" style={{ marginTop: 28, textAlign: "center", maxWidth: 720, marginInline: "auto" }}>
          Available first in Korea, with more countries to follow. Prefer crypto? You can still top up by sending USDT on the TRC-20 network.
        </p>
      </Band>
      <Band>
        <SectionHead eyebrow="FAQ" title="Easy Top Up questions" />
        <div className="faq-page">
          <div className="faq-page__list">
            {EASY_TOPUP_FAQ.map((item, i) => {
              const isOpen = openKey === i;
              return (
                <div className={`faq-page__item${isOpen ? " is-open" : ""}`} key={item.id}>
                  <button
                    type="button"
                    className="faq-page__q"
                    aria-expanded={isOpen}
                    onClick={() => setOpenKey(isOpen ? null : i)}
                  >
                    <span>
                      <span className="faq-page__qid">{item.id}.</span> {item.question}
                    </span>
                    <Icon name="chevronDown" size={18} stroke={2} />
                  </button>
                  {isOpen ? (
                    <div className="faq-page__a">
                      {item.answer.split("\n").filter(Boolean).map((line) => (
                        <p key={line.slice(0, 48)}>{line}</p>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </Band>
      <CtaBand
        title="Ready to try Easy Top Up?"
        sub="Questions? support@anytap.io (English only)"
        primary={{ label: "Get your card", href: "/sign-up" }}
      />
    </>
  );
}

export { CardHowToUse, CardWhoCanApply, CardBenefits, CardEasyTopUp };
