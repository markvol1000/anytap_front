import { useState } from 'react';
import { HOME_FAQ } from '../lib/home-faq.ts';
import { Icon } from './ui.jsx';

export function HomeFaq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="section home-faq" aria-labelledby="home-faq-title">
      <div className="shell home-faq__inner">
        <div className="section-header home-faq__head">
          <span className="eyebrow"><span className="dot"></span> FAQ</span>
          <h2 id="home-faq-title" className="section-title">Questions, answered.</h2>
          <p className="section-lede">
            Quick answers about cards, top-ups, and spending with Anytap.
          </p>
        </div>

        <div className="home-faq__list">
          {HOME_FAQ.map((item, i) => {
            const isOpen = open === i;
            return (
              <div className={`home-faq__item${isOpen ? ' is-open' : ''}`} key={item.question}>
                <button
                  type="button"
                  className="home-faq__q"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  <span>{item.question}</span>
                  <Icon name="chevronDown" size={18} stroke={2} />
                </button>
                {isOpen ? <p className="home-faq__a">{item.answer}</p> : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
