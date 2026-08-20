import { MetadataRoute } from 'next';
import { rooms } from '@/config/rooms';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pyeongtaekstay.com';
const locales = ['ko', 'en', 'ja', 'zh'];

// 객실 목록은 config/rooms.ts가 단일 출처 — 객실을 추가/삭제해도 sitemap이 자동 반영된다
const roomSlugs = rooms.map((room) => room.slug);

const staticPages = [
  '',
  '/rooms',
  '/facilities',
  '/location',
  '/events',
  '/booking',
  '/blog',
  '/privacy',
  '/terms',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  // Static pages for each locale
  for (const page of staticPages) {
    for (const locale of locales) {
      entries.push({
        url: `${baseUrl}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: page === '' ? 'daily' : 'weekly',
        priority: page === '' ? 1.0 : 0.8,
      });
    }
  }

  // Room detail pages for each locale
  for (const slug of roomSlugs) {
    for (const locale of locales) {
      entries.push({
        url: `${baseUrl}/${locale}/rooms/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  }

  return entries;
}
