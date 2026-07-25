/** Register the PWA service worker (installability + offline shell later). */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const register = async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      // Pick up newly deployed SW immediately (avoids stale hashed bundles).
      reg.update().catch(() => {});
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // One reload after SW takeover so clients use the latest assets.
        if (sessionStorage.getItem('anytap_sw_reloaded') === '1') return;
        sessionStorage.setItem('anytap_sw_reloaded', '1');
        window.location.reload();
      });
    } catch {
      /* noop — install banner falls back to manual guide */
    }
  };

  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
