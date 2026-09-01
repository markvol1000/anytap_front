import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  absoluteUrl,
  defaultOgImage,
  OG_IMAGE_ALT,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  resolveSeo,
} from '../lib/seo.ts';
import { SOCIAL_LINKS, SITE_ORIGIN, TWITTER_HANDLE } from '../lib/site.ts';

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

function upsertJsonLd(id: string, data: unknown) {
  let el = document.head.querySelector(`script#${id}`) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
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
    upsertMeta(
      'name',
      'naver-site-verification',
      '2a5e4bf4f2722aaa22f035db9d83d2008d4d582d',
    );

    upsertLink('canonical', url);

    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', 'Anytap');
    upsertMeta('property', 'og:title', seo.title);
    upsertMeta('property', 'og:description', seo.description);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:image', image);
    upsertMeta('property', 'og:image:width', String(OG_IMAGE_WIDTH));
    upsertMeta('property', 'og:image:height', String(OG_IMAGE_HEIGHT));
    upsertMeta('property', 'og:image:alt', OG_IMAGE_ALT);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:site', TWITTER_HANDLE);
    upsertMeta('name', 'twitter:title', seo.title);
    upsertMeta('name', 'twitter:description', seo.description);
    upsertMeta('name', 'twitter:image', image);
    upsertMeta('name', 'twitter:image:alt', OG_IMAGE_ALT);

    upsertJsonLd('org-jsonld', {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Anytap',
      url: SITE_ORIGIN,
      sameAs: SOCIAL_LINKS.map((s) => s.href),
    });
  }, [pathname]);

  return null;
}
