import logoUrl from '/assets/anytap-logo.png';

type PageLoaderProps = {
  fullScreen?: boolean;
  label?: string;
};

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
