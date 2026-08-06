/**
 * SEO helpers shared by every page's `generateMetadata`.
 *
 * The site serves the same content under /ko, /en, /ja and /zh. Without
 * canonical + hreflang annotations search engines treat those as four competing
 * duplicates, so every page must declare its alternates.
 */

import type { Metadata } from 'next';

export const LOCALES = ['ko', 'en', 'ja', 'zh'] as const;
export type SeoLocale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: SeoLocale = 'ko';

/** BCP-47 tags used for hreflang and Open Graph. */
export const LOCALE_META: Record<SeoLocale, { hreflang: string; og: string }> = {
  ko: { hreflang: 'ko-KR', og: 'ko_KR' },
  en: { hreflang: 'en-US', og: 'en_US' },
  ja: { hreflang: 'ja-JP', og: 'ja_JP' },
  zh: { hreflang: 'zh-CN', og: 'zh_CN' },
};

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://pyeongtaekstay.com').replace(/\/$/, '');
}

/** Default social share image (1200×630). */
export const OG_IMAGE = '/images/og-cover.jpg';

/**
 * Build `alternates` for a page.
 *
 * @param locale  current locale
 * @param path    path *without* the locale prefix, e.g. '' or '/rooms' or '/rooms/deluxe'
 */
export function buildAlternates(locale: string, path = ''): Metadata['alternates'] {
  const base = siteUrl();
  const clean = path && !path.startsWith('/') ? `/${path}` : path;

  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    languages[LOCALE_META[l].hreflang] = `${base}/${l}${clean}`;
  }
  // x-default points at the Korean version — the hotel's primary market.
  languages['x-default'] = `${base}/${DEFAULT_LOCALE}${clean}`;

  return {
    canonical: `${base}/${locale}${clean}`,
    languages,
  };
}

/**
 * Assemble page metadata with canonical/hreflang and a social preview image.
 */
export function buildMetadata(opts: {
  locale: string;
  path?: string;
  title: string;
  description: string;
  image?: string;
  noindex?: boolean;
}): Metadata {
  const { locale, path = '', title, description, image = OG_IMAGE, noindex } = opts;
  const base = siteUrl();
  const ogLocale = LOCALE_META[(locale as SeoLocale)]?.og ?? 'ko_KR';

  return {
    title,
    description,
    alternates: buildAlternates(locale, path),
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title,
      description,
      url: `${base}/${locale}${path}`,
      siteName: 'STAY HOTEL in PYEONGTAEK',
      locale: ogLocale,
      type: 'website',
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}
