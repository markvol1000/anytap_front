import { SubHero, Band } from './sub-common.jsx';
import { LEGAL } from '../utils/legal.js';

const LEGAL_TITLE_ACCENT = {
  privacy: 'Privacy',
  cookies: 'Cookie',
  terms: 'Service',
  disclosure: 'Disclosure',
};

function legalHeroTitle(title, docKey) {
  const accent = LEGAL_TITLE_ACCENT[docKey];
  if (!accent) return title;
  const i = title.indexOf(accent);
  if (i === -1) return title;
  return (
    <>
      {title.slice(0, i)}
      <span className="subhero__accent">{accent}</span>
      {title.slice(i + accent.length)}
    </>
  );
}

function LegalPage({ docKey }) {
  const data = LEGAL[docKey] || { title: "Document", effective: "", blocks: [] };
  return (
    <>
      <SubHero title={legalHeroTitle(data.title, docKey)} sub={data.effective} />
      <Band>
        <div className="legal">
          {data.blocks.map((b, i) => {
            if (b.t === "h2") return <h2 className="legal__h2" key={i}>{b.x}</h2>;
            if (b.t === "h3") return <h3 className="legal__h3" key={i}>{b.x}</h3>;
            if (b.t === "li") return <li className="legal__li" key={i}>{b.x}</li>;
            if (b.t === "table") {
              const [head, ...body] = b.rows;
              return (
                <div className="legal__tablewrap" key={i}>
                  <table className="legal__table">
                    <thead>
                      <tr>{head.map((c, j) => <th key={j}>{c}</th>)}</tr>
                    </thead>
                    <tbody>
                      {body.map((row, ri) => (
                        <tr key={ri}>
                          {row.map((c, ci) => (
                            <td key={ci} data-label={head[ci]}>{c}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }
            return <p className="legal__p" key={i}>{b.x}</p>;
          })}
        </div>
      </Band>
    </>
  );
}

function PrivacyPage() { return <LegalPage docKey="privacy" />; }
function TermsPage() { return <LegalPage docKey="terms" />; }
function CookiesPage() { return <LegalPage docKey="cookies" />; }
function DisclosurePage() { return <LegalPage docKey="disclosure" />; }

export { PrivacyPage, TermsPage, CookiesPage, DisclosurePage };
