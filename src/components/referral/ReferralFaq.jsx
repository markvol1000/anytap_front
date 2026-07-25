import { useState } from 'react';

export function ReferralFaq({ items }) {
  const [open, setOpen] = useState(null);

  return (
    <section className="portal-ref-dash__faq portal-dash-panel" aria-labelledby="referral-faq-title">
      <h2 id="referral-faq-title" className="portal-ref-dash__section-title">FAQ</h2>
      <div className="portal-ref-dash__faq-list">
        {items.map((item, i) => (
          <div className="portal-faq" key={item.question}>
            <button
              type="button"
              className="portal-faq__q"
              aria-expanded={open === i}
              onClick={() => setOpen(open === i ? null : i)}>
              {item.question}
              <span
                className={`portal-ref-dash__faq-chevron${open === i ? ' is-open' : ''}`}
                aria-hidden="true"
              />
            </button>
            {open === i ? <p className="portal-faq__a">{item.answer}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
