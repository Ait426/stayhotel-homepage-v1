import { MetadataRoute } from 'next';
import { rooms } from '@/config/rooms';
import { LOCALES, LOCALE_META, DEFAULT_LOCALE, siteUrl } from '@/lib/seo';

const staticPages = [
  '',
  '/rooms',
  '/facilities',
  '/location',
  '/events',
  '/blog',
  '/booking',
  '/privacy',
  '/terms',
];

/**
 * Build the `alternates.languages` map so each locale variant points at its
 * siblings instead of competing with them.
 */
function languagesFor(base: string, path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) {
    languages[LOCALE_META[locale].hreflang] = `${base}/${locale}${path}`;
  }
  languages['x-default'] = `${base}/${DEFAULT_LOCALE}${path}`;
  return languages;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const entries: MetadataRoute.Sitemap = [];

  // Content changes on deploy, not on crawl. A per-request `new Date()` made
  // every URL claim it had just changed, which makes lastmod worthless.
  const lastModified = new Date(
    process.env.NEXT_PUBLIC_BUILD_DATE || '2026-08-06T00:00:00Z'
  );

  // Room detail slugs come from the room config so the two can't drift.
  const paths = [
    ...staticPages.map((p) => ({ path: p, priority: p === '' ? 1.0 : 0.8 })),
    ...rooms.map((r) => ({ path: `/rooms/${r.slug}`, priority: 0.7 })),
  ];

  for (const { path, priority } of paths) {
    for (const locale of LOCALES) {
      entries.push({
        url: `${base}/${locale}${path}`,
        lastModified,
        changeFrequency: path === '' ? 'daily' : 'weekly',
        priority,
        alternates: { languages: languagesFor(base, path) },
      });
    }
  }

  return entries;
}
