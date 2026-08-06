import { MetadataRoute } from 'next';
import { LOCALES, siteUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = siteUrl();

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/_next/',
        // The admin dashboard lists guest names, phones and emails.
        ...LOCALES.map((l) => `/${l}/admin`),
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
