import { useState } from 'react';
import { FAQ_SECTIONS } from '../lib/faq-content.ts';
import { SubHero, Band } from '../components/sub-common.jsx';
import { Icon } from '../components/ui.jsx';

export function FaqPage() {
  const [openKey, setOpenKey] = useState<string | null>(
    FAQ_SECTIONS[0]?.items[0] ? `${FAQ_SECTIONS[0].title}::0` : null,
  );

  return (
    <>
      <SubHero
        title={
          <>
            Frequently asked <span className="subhero__accent">questions</span>
          </>
        }
        sub="Everything about Anytap cards, KYC, top-ups, fees, security, and the referral program."
      />
      <Band>
        <div className="faq-page">
          {FAQ_SECTIONS.map((section) => (
            <section key={section.title} className="faq-page__section" aria-labelledby={`faq-${section.title}`}>
              <h2 id={`faq-${section.title}`} className="faq-page__section-title">
                {section.title.replace(/^SECTION\s+\d+\s*[—–-]\s*/i, '')}
              </h2>
              <div className="faq-page__list">
                {section.items.map((item, i) => {
                  const key = `${section.title}::${i}`;
                  const isOpen = openKey === key;
                  return (
                    <div className={`faq-page__item${isOpen ? ' is-open' : ''}`} key={item.id}>
                      <button
                        type="button"
                        className="faq-page__q"
                        aria-expanded={isOpen}
                        onClick={() => setOpenKey(isOpen ? null : key)}
                      >
                        <span>
                          <span className="faq-page__qid">{item.id}.</span> {item.question}
                        </span>
                        <Icon name="chevronDown" size={18} stroke={2} />
                      </button>
                      {isOpen ? (
                        <div className="faq-page__a">
                          {item.answer.split('\n').filter(Boolean).map((line) => (
                            <p key={line.slice(0, 48)}>{line}</p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </Band>
    </>
  );
}
