import { useEffect, useState, type ReactNode } from 'react';
import logoUrl from '/assets/anytap-logo.png';

type PageLoaderProps = {
  fullScreen?: boolean;
  label?: string;
};

/** Keep a loading screen visible long enough to paint (avoids a white flash). */
export function holdAtLeast(startedAt: number, minMs = 500): Promise<void> {
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
export function HoldPageLoader({ children, minMs = 500 }: HoldPageLoaderProps) {
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

export function PageLoader({ fullScreen = true, label = 'Loading…' }: PageLoaderProps) {
  return (
    <div
      className={fullScreen ? 'page-loader' : 'page-loader page-loader--inline'}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="page-loader__inner">
        <img src={logoUrl} alt="Anytap" className="page-loader__logo" />
        <span className="page-loader__spinner" aria-hidden="true" />
        <p className="page-loader__label">{label}</p>
      </div>
    </div>
  );
}

export default PageLoader;
