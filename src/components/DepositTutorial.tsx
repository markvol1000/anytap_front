import { useState, type ReactNode } from 'react';
import { QRCode, Icon } from './ui.jsx';

type TutorialStepId =
  | 'network'
  | 'deposit'
  | 'detected'
  | 'processing'
  | 'balance';

interface TutorialStep {
  id: TutorialStepId;
  title: string;
  body: ReactNode;
  screen: ReactNode;
}

function PhoneChrome({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="deptut__phone" aria-hidden={!title}>
      <div className="deptut__device">
        <div className="deptut__notch" />
        <div className="deptut__screen">
          <div className="deptut__status">
            <span>9:41</span>
            <span className="deptut__batt" />
          </div>
          {title ? <div className="deptut__scr-title">{title}</div> : null}
          {children}
        </div>
      </div>
    </div>
  );
}

function ScreenNetwork() {
  return (
    <PhoneChrome title="Network & amount">
      <div className="deptut__pad">
        <label className="deptut__lbl">Network</label>
        <div className="deptut__field deptut__field--accent">TRC-20 (Tron) only</div>
        <label className="deptut__lbl">Minimum deposit</label>
        <div className="deptut__chips">
          <span className="deptut__chip is-on">50 USDT</span>
          <span className="deptut__chip">100 USDT</span>
          <span className="deptut__chip">200 USDT</span>
        </div>
        <p className="deptut__warn">
          Only send USDT via the TRC-20 network. Other networks may result in loss of funds.
        </p>
      </div>
    </PhoneChrome>
  );
}

function ScreenDeposit() {
  return (
    <PhoneChrome title="Deposit USDT">
      <div className="deptut__pad deptut__pad--center">
        <div className="deptut__qrbox">
          <QRCode size={148} />
          <div className="deptut__addr">TTr9…rJtUx (TRC-20)</div>
          <button type="button" className="deptut__cta" tabIndex={-1}>
            Copy address
          </button>
        </div>
      </div>
    </PhoneChrome>
  );
}

function ScreenDetected() {
  return (
    <PhoneChrome>
      <div className="deptut__status-view">
        <div className="deptut__ring deptut__ring--partial" aria-hidden="true" />
        <div className="deptut__status-title">Deposit detected</div>
      </div>
    </PhoneChrome>
  );
}

function ScreenProcessing() {
  return (
    <PhoneChrome>
      <div className="deptut__status-view">
        <div className="deptut__ring deptut__ring--mid" aria-hidden="true" />
        <div className="deptut__status-title">Processing</div>
        <p className="deptut__status-sub">Usually takes 1-3 min. depending on network</p>
      </div>
    </PhoneChrome>
  );
}

function ScreenBalance() {
  return (
    <PhoneChrome>
      <div className="deptut__status-view">
        <span className="deptut__ok" aria-hidden="true">
          <Icon name="check" size={28} stroke={3} />
        </span>
        <div className="deptut__status-title">Balance updated</div>
        <div className="deptut__amount">+100.00 USDT</div>
      </div>
    </PhoneChrome>
  );
}

const STEPS: TutorialStep[] = [
  {
    id: 'network',
    title: 'TRC-20 network only',
    body: (
      <>
        Always use the <em>TRC-20</em> network — sending on any other network can result in{' '}
        <em>lost funds</em>. Minimum deposit is <em>50 USDT</em>.
      </>
    ),
    screen: <ScreenNetwork />,
  },
  {
    id: 'deposit',
    title: 'Deposit USDT',
    body: (
      <>
        Copy your personal deposit address or scan the QR code from any wallet or exchange to send
        USDT.
      </>
    ),
    screen: <ScreenDeposit />,
  },
  {
    id: 'detected',
    title: 'Deposit detected',
    body: (
      <>
        Your USDT deposit has been <em>detected on-chain</em> and is now being confirmed.
      </>
    ),
    screen: <ScreenDetected />,
  },
  {
    id: 'processing',
    title: 'Processing',
    body: (
      <>
        Processing usually takes <em>1-3 minutes</em>, depending on network conditions.
      </>
    ),
    screen: <ScreenProcessing />,
  },
  {
    id: 'balance',
    title: 'Balance updated',
    body: (
      <>
        Your balance is updated — funds are <em>ready to spend</em> on your Anytap card.
      </>
    ),
    screen: <ScreenBalance />,
  },
];

/** Mobile-first deposit tutorial — phone UI extracted from design screens. */
export function DepositTutorial() {
  const [active, setActive] = useState(0);
  const step = STEPS[active];

  return (
    <div className="deptut">
      <div className="deptut__stage" data-step={step.id}>
        {step.screen}
        <div className="deptut__copy">
          <h3 className="deptut__title">{step.title}</h3>
          <p className="deptut__body">{step.body}</p>
        </div>
      </div>

      <div className="deptut__pager" role="tablist" aria-label="Deposit tutorial steps">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={i === active}
            className={`deptut__dot${i === active ? ' is-on' : ''}`}
            onClick={() => setActive(i)}
          >
            <span className="deptut__dot-num">{i + 1}</span>
            <span className="deptut__dot-label">{s.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export { STEPS as DEPOSIT_TUTORIAL_STEPS };
