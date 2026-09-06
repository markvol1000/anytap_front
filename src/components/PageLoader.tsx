import { useEffect, useState, type ReactNode } from 'react';
import logoUrl from '/assets/anytap-logo.png';

type PageLoaderProps = {
  fullScreen?: boolean;
  label?: string;
};

/** Keep a loading screen visible long enough to paint (avoids a white flash). */
export function holdAtLeast(startedAt: number, minMs = 800): Promise<void> {
  const left = minMs - (Date.now() - startedAt);
  if (left <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    window.setTimeout(resolve, left);
  });
}

type HoldPageLoaderProps = {
  children: ReactNode;
  minMs?: number;
};

/** Shows PageLoader for at least minMs after this tree mounts (lazy route entry). */
export function HoldPageLoader({ children, minMs = 800 }: HoldPageLoaderProps) {
  const [held, setHeld] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setHeld(false), minMs);
    return () => window.clearTimeout(timer);
  }, [minMs]);

  return (
    <>
      {children}
      {held ? <PageLoader /> : null}
    </>
  );
}

export function PageLoader({ fullScreen = true, label = 'Loading' }: PageLoaderProps) {
  return (
    <div
      className={fullScreen ? 'page-loader' : 'page-loader page-loader--inline'}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <div className="page-loader__inner">
        <img src={logoUrl} alt="" className="page-loader__logo" />
        <div className="page-loader__clock" aria-hidden="true">
          <span className="page-loader__clock-tick page-loader__clock-tick--12" />
          <span className="page-loader__clock-tick page-loader__clock-tick--3" />
          <span className="page-loader__clock-tick page-loader__clock-tick--6" />
          <span className="page-loader__clock-tick page-loader__clock-tick--9" />
          <span className="page-loader__clock-hand page-loader__clock-hand--hour" />
          <span className="page-loader__clock-hand page-loader__clock-hand--minute" />
          <span className="page-loader__clock-hand page-loader__clock-hand--second" />
          <span className="page-loader__clock-center" />
        </div>
      </div>
    </div>
  );
}

export default PageLoader;
