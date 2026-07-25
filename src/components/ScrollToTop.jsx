import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Scroll window to top on every marketing-route navigation (PC submenu fix). */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = decodeURIComponent(hash.replace(/^#/, ''));
      const el = id ? document.getElementById(id) : null;
      if (el) {
        el.scrollIntoView({ behavior: 'auto', block: 'start' });
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, hash]);

  return null;
}
