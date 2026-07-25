import React from 'react';
import { SubHero, Band, SectionHead, IconCards, StepFlow, DataTable, Split, CtaBand, StatTiles } from './sub-common.jsx';
import { Icon, CheckoutApiArt, CoinChip } from './ui.jsx';

// Anytap — PAYMENT subpages: Why Crypto Pay / How It Works / For Business

// 2-1 Why Crypto Pay
function PaymentWhy() {
  return (
    <>
      <SubHero
        title={<>The <span className="subhero__accent">future</span> of business payments is here</>}
        sub="Move beyond the limits of traditional payments. Accept borderless crypto payments and welcome more customers."
        primary={{ label: "Apply as Merchant", href: "/merchant-apply" }}>
        <CheckoutApiArt />
      </SubHero>

      <Band>
        <SectionHead eyebrow="The problem" title="What traditional payments cost you" />
        <StatTiles items={[
          { value: "2.5–3.5%", label: "Average cross-border card fee" },
          { value: "3–7 days", label: "Typical settlement time" },
          { value: "Lost sales", label: "From unsupported countries & currencies" },
        ]} />
      </Band>

      <Band tone="subtle">
        <SectionHead eyebrow="The advantages" title="Three reasons to accept crypto" />
        <IconCards cols={3} items={[
          { icon: "zap", title: "Lower fees", body: "Transaction fees 50–90% lower than traditional payments — keeping more revenue with your business." },
          { icon: "globe", title: "Borderless acceptance", body: "Anyone holding USDT or USDC can pay for your service, anywhere in the world." },
          { icon: "shield", title: "Stablecoin stability", body: "USDT and USDC are pegged to the dollar — global reach without price-volatility risk." },
        ]} />
      </Band>

      <Band>
        <SectionHead eyebrow="Best fit" title="Industries that benefit most" />
        <IconCards cols={3} items={[
          { icon: "gamepad", title: "Gaming", body: "Games and in-game item marketplaces." },
          { icon: "store", title: "E-commerce", body: "Global online stores and marketplaces." },
          { icon: "code", title: "SaaS", body: "Software and subscription services." },
          { icon: "bank", title: "Fintech", body: "Remittance and money-movement services." },
          { icon: "chart", title: "Exchanges", body: "Crypto exchanges and wallet services." },
          { icon: "layers", title: "Content", body: "OTT, education and media platforms." },
        ]} />
      </Band>
    </>
  );
}

// 2-2 How It Works
function PaymentHow() {
  const coins = ["BTC", "ETH", "USDT", "USDC", "BNB", "SOL", "XRP", "LTC", "TRX", "DAI"];
  return (
    <>
      <SubHero
        title={<>Simple integration. <span className="subhero__accent">Instant</span> payments.</>}
        sub="Start accepting 350+ cryptocurrencies with a single API — no complex blockchain development."
        primary={{ label: "Apply as Merchant", href: "/merchant-apply" }} />

      <Band>
        <SectionHead eyebrow="Payment flow" title="From checkout to settlement" />
        <StepFlow steps={[
          { title: "Choose payment", body: "The customer selects crypto payment on your checkout page." },
          { title: "Address generated", body: "Anytap automatically creates a unique wallet address for that transaction.", note: "Automatic" },
          { title: "Coin sent", body: "The customer pays with any of 350+ supported coins to that address.", note: "350+ coins" },
          { title: "Settlement", body: "Anytap confirms receipt and settles to your account in the currency you choose." },
        ]} />
      </Band>

      <Band tone="subtle">
        <SectionHead eyebrow="Supported coins" title="350+ cryptocurrencies, 10+ chains" />
        <div className="coingrid">
          {coins.map((c) => <div className="coingrid__item" key={c}><CoinChip sym={c} size={44} /><span>{c}</span></div>)}
          <div className="coingrid__more">+340<br />more</div>
        </div>
        <div style={{ marginTop: 28 }}>
          <DataTable
            headers={["", "Coverage"]}
            rows={[
              ["Representative coins", "BTC · ETH · USDT · USDC · BNB · SOL · XRP · LTC · DOGE · DAI"],
              ["Stablecoins", { v: "30+ supported", kind: "em" }],
              ["Networks", "TRC-20 · ERC-20 · BEP-20 · Solana · Polygon · Avalanche and 10+ more"],
            ]} />
        </div>
      </Band>

      <Band>
        <SectionHead eyebrow="Integration" title="Connect the way that fits" />
        <DataTable
          headers={["Method", "Description", "Best for"]}
          rows={[
            [{ v: "Direct API", kind: "em" }, "REST API requests with real-time webhooks", "Teams with their own developers"],
            [{ v: "Payment link", kind: "em" }, "Accept payments instantly with one link — no code", "Small businesses"],
            [{ v: "Plugin", kind: "em" }, "Shopify, WooCommerce and other platform plugins", "E-commerce operators"],
            [{ v: "Widget", kind: "em" }, "Embed a pay button or widget on your site", "Web service operators"],
          ]} />
      </Band>
    </>
  );
}

// 2-3 For Business
function PaymentBusiness() {
  return (
    <>
      <SubHero
        tone="ink"
        title={<>Built for businesses that move <span className="subhero__accent">fast</span></>}
        sub="Gaming, fintech, e-commerce — a solution for any business that needs global crypto payments."
        primary={{ label: "Apply as Merchant", href: "/merchant-apply" }} />

      <Band>
        <SectionHead eyebrow="Why adopt" title="What merchants get" />
        <IconCards cols={2} items={[
          { icon: "zap", title: "Fast integration", body: "Start immediately with an API connection — no licensing of your own required." },
          { icon: "globe", title: "Global customer reach", body: "Convert crypto holders worldwide into paying customers." },
          { icon: "chart", title: "Low upfront cost", body: "No need to build blockchain infrastructure — minimal operating cost." },
          { icon: "users", title: "Dedicated tech support", body: "From onboarding to operations, the Anytap merchant team is with you." },
        ]} />
      </Band>

      <Band tone="subtle">
        <SectionHead eyebrow="How merchant onboarding works" title="Apply and go live in days" />
        <StepFlow steps={[
          { title: "Apply", body: "Submit the merchant application form." },
          { title: "Review", body: "Our team reviews and reaches out within 10 business days." },
          { title: "Integrate", body: "Connect via API, payment link, plugin, or widget." },
          { title: "Go live", body: "Go live and start accepting 350+ cryptocurrencies." },
        ]} />
      </Band>
    </>
  );
}

export { PaymentWhy, PaymentHow, PaymentBusiness };
