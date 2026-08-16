import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './ui.jsx';
import { SubHero, Band, SectionHead, IconCards, StatTiles } from './sub-common.jsx';
import { englishFormProps, handleEnglishSubmit } from '../utils/formValidation.js';
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '../lib/site.ts';

// ---- shared form helpers ----
function FormDone({ title, msg }) {
  return (
    <div className="aform-done">
      <div className="aform-done__check"><Icon name="checkCircle" size={42} /></div>
      <h3>{title}</h3>
      <p>{msg}</p>
      <Link to="/" className="btn btn--outline aform-done__back">Back to home <Icon name="arrowRight" size={14} /></Link>
    </div>
  );
}

function FormField({ label, req, children, full }) {
  return (
    <div className={`aform__field ${full ? "aform__field--full" : ""}`}>
      <label>{label} {req && <span className="aform__req">*</span>}</label>
      {children}
    </div>
  );
}

function CheckGroup({ name, options }) {
  return (
    <div className="aform__checks">
      {options.map((o) => (
        <label className="aform__check" key={o}><input type="checkbox" name={name} value={o} /> <span>{o}</span></label>
      ))}
    </div>
  );
}

function RadioGroup({ name, options }) {
  return (
    <div className="aform__checks">
      {options.map((o) => (
        <label className="aform__check" key={o}><input type="radio" name={name} value={o} /> <span>{o}</span></label>
      ))}
    </div>
  );
}

// ─────────────── Card application ───────────────
function ApplyCardPage() {
  const [done, setDone] = useState(false);
  return (
    <>
      <SubHero
        title={<><span className="subhero__accent">Apply</span> for your Anytap Card</>}
        sub="No bank account needed. Complete the short application below — your virtual card is issued instantly after KYC approval, and the physical card ships to your door." />
      <Band>
        <div className="aform-wrap">
          {done ? (
            <FormDone title="Application received" msg="Thanks! Check your email to finish KYC verification. Your virtual card is issued the moment KYC is approved." />
          ) : (
            <form className="aform" {...englishFormProps} onSubmit={handleEnglishSubmit(() => setDone(true))}>
              <div className="aform__sec">Account</div>
              <div className="aform__grid">
                <FormField label="Email" req><input type="email" required placeholder="Enter your email" /></FormField>
                <FormField label="Full legal name" req><input type="text" required placeholder="Enter your full legal name" /></FormField>
                <FormField label="Date of birth" req><input type="text" required placeholder="MM / DD / YYYY" lang="en" inputMode="numeric" /></FormField>
                <FormField label="Country / Region" req>
                  <select required defaultValue=""><option value="" disabled>Select…</option><option>United States</option><option>Singapore</option><option>United Arab Emirates</option><option>United Kingdom</option><option>Vietnam</option><option>Japan</option><option>Other</option></select>
                </FormField>
                <FormField label="Residential address" req full><input type="text" required placeholder="Enter your residential address" /></FormField>
              </div>

              <div className="aform__sec">Identity (KYC)</div>
              <div className="aform__grid">
                <FormField label="ID document type" req>
                  <select required defaultValue="Passport"><option value="Passport">Passport</option><option value="Driver's license">Driver's license</option></select>
                </FormField>
                <FormField label="Stablecoin you'll top up with" req>
                  <select required defaultValue=""><option value="" disabled>Select…</option><option>USDT (TRC-20)</option><option>USDT (ERC-20)</option><option>USDC</option></select>
                </FormField>
              </div>

              <div className="aform__sec">Card</div>
              <div className="aform__grid">
                <FormField label="Card type" req>
                  <select required defaultValue="Physical"><option value="Physical">Physical</option><option value="Virtual">Virtual</option></select>
                </FormField>
                <FormField label="Add to mobile wallet">
                  <select defaultValue=""><option value="" disabled>Select…</option><option>Apple Pay</option><option>Google Pay</option><option>Samsung Pay</option><option>Decide later</option></select>
                </FormField>
              </div>

              <label className="aform__check aform__agree"><input type="checkbox" required /> <span>I confirm I am 18+ and not a resident of an OFAC-sanctioned country, and I agree to the <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>.</span></label>

              <div className="aform__actions">
                <button type="submit" className="btn btn--accent btn--lg">Submit application <Icon name="arrowRight" size={16} /></button>
                <span className="aform__note">A one-time USD 100 issuance fee covers both the virtual and physical card. A 3% fee applies on stablecoin top-ups.</span>
              </div>
            </form>
          )}
        </div>
      </Band>
    </>
  );
}

// ─────────────── Merchant application ───────────────
function MerchantApplyForm() {
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <FormDone
        title="Application received"
        msg="Thank you. The Anytap partner team will review your submission and email your assigned contact within 10 business days."
      />
    );
  }

  return (
    <form className="aform" {...englishFormProps} onSubmit={handleEnglishSubmit(() => setDone(true))}>
      <div className="aform__sec">A · Company information</div>
      <div className="aform__grid">
        <FormField label="Company (legal entity) name" req><input type="text" required placeholder="Enter company name" /></FormField>
        <FormField label="Business / company registration no." req><input type="text" required placeholder="Enter registration number" /></FormField>
        <FormField label="HQ country & city" req><input type="text" required placeholder="Enter country and city" /></FormField>
        <FormField label="Contact name & title" req><input type="text" required placeholder="Enter name and title" /></FormField>
        <FormField label="Contact email & phone" req full><input type="text" required placeholder="Enter email and phone number" /></FormField>
      </div>

      <div className="aform__sec">B · Business status</div>
      <FormField label="Main business field (select all that apply)" req>
        <CheckGroup name="field" options={["Gaming / item trading", "E-commerce / online retail", "SaaS / subscriptions", "Fintech / financial services", "Crypto exchange / wallet", "Content (OTT, education, media)", "Travel / hospitality / air", "Advertising / marketing", "Other"]} />
      </FormField>
      <div className="aform__grid">
        <FormField label="Operating / target markets" req><input type="text" required placeholder="Enter target markets" /></FormField>
        <FormField label="Average monthly revenue" req>
          <select required defaultValue=""><option value="" disabled>Select…</option><option>Under $100K</option><option>$100K – $1M</option><option>$1M – $5M</option><option>$5M+</option><option>Startup / pre-revenue</option><option>Prefer not to say</option></select>
        </FormField>
        <FormField label="Expected monthly crypto volume (USD)" req>
          <select required defaultValue=""><option value="" disabled>Select…</option><option>Under $10,000</option><option>$10,000 – $100,000</option><option>$100,000 – $500,000</option><option>$500,000 – $1,000,000</option><option>$1,000,000+</option><option>Undecided</option></select>
        </FormField>
      </div>
      <FormField label="Current payment methods (optional)">
        <CheckGroup name="current" options={["Credit / debit card", "Bank transfer", "Local e-wallets", "Crypto (already accepting)", "Other"]} />
      </FormField>

      <div className="aform__sec">C · Technical & integration</div>
      <FormField label="Preferred integration method" req>
        <CheckGroup name="integration" options={["Direct API", "Payment link / invoice", "Shopify / WooCommerce plugin", "Undecided — consult first"]} />
      </FormField>
      <FormField label="Service type" req>
        <RadioGroup name="servicetype" options={["Web service", "Mobile app (iOS / Android)", "Web + app", "Includes offline store", "Other"]} />
      </FormField>

      <div className="aform__sec">D · Compliance</div>
      <FormField label="Do you have an AML / KYC policy?" req>
        <RadioGroup name="aml" options={["Yes — own AML/KYC policy in operation", "Partial (improving)", "None (planning to adopt)", "Not applicable"]} />
      </FormField>
      <FormField label="Industry confirmation" req>
        <RadioGroup name="industry" options={["None of the restricted categories apply (can proceed)", "Gambling / online casino", "Adult content", "Illegal substances", "Weapons trade"]} />
      </FormField>
      <p className="aform__hint">Restricted industries may not be eligible. You must select "None of the restricted categories apply" to complete the application.</p>

      <div className="aform__sec">E · Partnership purpose</div>
      <FormField label="Purpose & service introduction (optional)" full>
        <textarea rows="4" placeholder="Tell us about your business and goals"></textarea>
      </FormField>

      <div className="aform__actions">
        <button type="submit" className="btn btn--accent btn--lg">Submit application <Icon name="arrowRight" size={16} /></button>
        <span className="aform__note">By submitting you agree to Anytap's <Link to="/privacy">Privacy Policy</Link> and partner terms. Reviewed within 10 business days.</span>
      </div>
    </form>
  );
}

function MerchantApplyPage() {
  return (
    <>
      <SubHero
        tone="ink"
        title={<>Turn your customers' crypto into <span className="subhero__accent">revenue</span></>}
        sub="Integrate USDT · USDC stablecoin payments into your service today. No complex financial license — start global crypto acceptance with a single API." />

      <Band tone="subtle">
        <SectionHead eyebrow="What you get" title="Why partner with Anytap Pay" />
        <IconCards cols={3} items={[
          { icon: "swap", title: "350+ cryptocurrencies", body: "Accept BTC, ETH, XRP, SOL, BNB and 30+ stablecoins including USDT & USDC." },
          { icon: "wallet", title: "Settle your way", body: "You never hold or manage crypto — Anytap handles processing, settlement and risk." },
          { icon: "api", title: "API · link · plugin", body: "Connect by REST API, payment link, or a Shopify / WooCommerce plugin." },
        ]} />
      </Band>

      <Band>
        <div className="aform-wrap">
          <SectionHead eyebrow="Merchant application · 15 questions" title="Tell us about your business" lede="Complete the form and the Anytap partner team will review and contact you within 10 business days. Your information is used for review only and is never shared." />
          <div className="aform__actions aform__actions--lead">
            <Link to="/merchant-apply/form" className="btn btn--accent btn--lg">
              Start application <Icon name="arrowRight" size={16} />
            </Link>
          </div>
        </div>
      </Band>
    </>
  );
}

function MerchantApplyFormPage() {
  return (
    <>
      <SubHero
        tone="ink"
        title={<>Merchant <span className="subhero__accent">application</span></>}
        sub="Answer 15 questions about your business. The Anytap partner team will review and contact you within 10 business days." />

      <Band>
        <div className="aform-wrap">
          <SectionHead eyebrow="Merchant application · 15 questions" title="Tell us about your business" lede="Your information is used for review only and is never shared." />
          <MerchantApplyForm />
        </div>
      </Band>
    </>
  );
}

// ─────────────── Contact ───────────────
function ContactPage() {
  const [done, setDone] = useState(false);
  return (
    <>
      <SubHero
        title={<>Contact <span className="subhero__accent">support</span></>}
        sub="Need a hand? Tell us what's going on and our team will get back to you. For lost or stolen cards, we monitor 24/7." />
      <Band>
        <div className="aform-wrap aform-wrap--narrow">
          <p className="aform__note" style={{ textAlign: 'center', marginBottom: 20 }}>
            Prefer email?{' '}
            <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>
          </p>
          {done ? (
            <FormDone title="Message sent" msg="Thanks for reaching out. Our support team will reply to your email shortly. For urgent card loss, your card has been flagged for review." />
          ) : (
            <form className="aform" {...englishFormProps} onSubmit={handleEnglishSubmit(() => setDone(true))}>
              <div className="aform__grid">
                <FormField label="Your name" req><input type="text" required placeholder="Enter your name" /></FormField>
                <FormField label="Email or Account ID" req><input type="text" required placeholder="Enter email or account ID" /></FormField>
              </div>
              <FormField label="What do you need help with?" req>
                <select required defaultValue=""><option value="" disabled>Select a category…</option><option>Card issuance & KYC</option><option>Card top-up & balance</option><option>Lost or stolen card</option><option>Payment / merchant solution</option><option>Referral program</option><option>Other</option></select>
              </FormField>
              <FormField label="Message" req full>
                <textarea rows="5" required placeholder="Enter your message"></textarea>
              </FormField>
              <div className="aform__actions">
                <button type="submit" className="btn btn--accent btn--lg">Submit <Icon name="arrowRight" size={16} /></button>
                <span className="aform__note">Average first response under a few hours. Lost-card reports are prioritized 24/7.</span>
              </div>
            </form>
          )}
        </div>
      </Band>
    </>
  );
}

// ─────────────── About ───────────────
function AboutPage() {
  return (
    <>
      <SubHero
        tone="ink"
        title={<>The fintech operator connecting crypto and <span className="subhero__accent">everyday life</span></>}
        sub="A U.S.-headquartered fintech company specializing in cryptocurrency solutions, with offices in Singapore, Dubai and London." />

      <Band>
        <SectionHead eyebrow="Our mission" title={'“We hold crypto — so why is it still so hard to spend?”'} lede="That question is where Anytap began. Crypto is already a store of value for hundreds of millions of people — yet real barriers remain for something as simple as paying at a store or sending money abroad. Removing those barriers is our mission." />
      </Band>

      <Band tone="subtle">
        <SectionHead eyebrow="One platform, two engines" title="Card issuance + payment gateway" />
        <IconCards cols={2} items={[
          { icon: "creditCard", title: "Visa card engine", body: "Real-time blockchain processing, API-controlled card management, and automatic stablecoin-to-fiat settlement. Physical & virtual cards, with Apple Pay and Google Pay." },
          { icon: "api", title: "Anytap Pay gateway", body: "A REST-API enterprise solution that integrates with e-commerce, SaaS, marketplaces and trading platforms — 350+ cryptocurrencies and 30+ stablecoins, on a global AML/KYC framework." },
        ]} />
      </Band>

      <Band>
        <SectionHead eyebrow="Global footprint" title="Operating across three regions" />
        <StatTiles items={[
          { value: "USA", label: "Headquarters" },
          { value: "SG · Dubai · London", label: "Operational offices" },
          { value: "Americas · Asia · Europe", label: "Infrastructure partners" },
        ]} />
        <p className="prose" style={{ marginTop: 28, textAlign: "center", maxWidth: 720, marginInline: "auto" }}>
          Anytap believes blockchain can become the financial infrastructure people rely on every day — buying groceries, having coffee, or booking travel. Crypto adoption for everyday life is the one challenge we're built to solve.
        </p>
      </Band>
    </>
  );
}

export { ApplyCardPage, MerchantApplyPage, MerchantApplyFormPage, ContactPage, AboutPage };
