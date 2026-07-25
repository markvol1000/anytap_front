import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  absoluteUrl,
  defaultOgImage,
  resolveSeo,
} from '../lib/seo.ts';

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/** Updates document title + meta tags on every route change. */
export function Seo() {
  const { pathname } = useLocation();

  useEffect(() => {
    const seo = resolveSeo(pathname);
    const url = absoluteUrl(seo.path === '/' ? '/' : seo.path);
    const image = seo.ogImage || defaultOgImage();

    document.title = seo.title;

    upsertMeta('name', 'description', seo.description);
    upsertMeta('name', 'robots', seo.noindex ? 'noindex, nofollow' : 'index, follow');

    upsertLink('canonical', url);

    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', 'Anytap');
    upsertMeta('property', 'og:title', seo.title);
    upsertMeta('property', 'og:description', seo.description);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:image', image);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', seo.title);
    upsertMeta('name', 'twitter:description', seo.description);
    upsertMeta('name', 'twitter:image', image);
  }, [pathname]);

  return null;
}
