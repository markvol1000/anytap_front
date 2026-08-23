/** Public production origin — marketing site + member portal */
export const SITE_ORIGIN = 'https://anytap.io';

/** Customer support (FAQ, portal support, legal pages) */
export const SUPPORT_EMAIL = 'support@anytap.io';

/** B2B / partnership inquiries */
export const BIZ_EMAIL = 'biz@anytap.io';

export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;
export const BIZ_MAILTO = `mailto:${BIZ_EMAIL}`;

/** Official X / Twitter handle (with @) for twitter:site cards */
export const TWITTER_HANDLE = '@anytapglobal';

/** Official company SNS — footer icons + share metadata */
export const SOCIAL = {
  tiktok: 'https://www.tiktok.com/@anytap_global',
  facebook: 'https://www.facebook.com/profile.php?id=61592647613275',
  x: 'https://x.com/anytapglobal',
  youtube: 'https://www.youtube.com/channel/UCi47HjYb-r4k0lJPGFuNBTg',
} as const;

/** Footer order matches existing icon row: Facebook, TikTok, X, YouTube */
export const SOCIAL_LINKS = [
  { label: 'Facebook', href: SOCIAL.facebook },
  { label: 'TikTok', href: SOCIAL.tiktok },
  { label: 'X', href: SOCIAL.x },
  { label: 'YouTube', href: SOCIAL.youtube },
] as const;
