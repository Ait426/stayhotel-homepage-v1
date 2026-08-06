export const runtime = 'edge';

/**
 * Home Page
 *
 * 1. Full-screen hero slider (with location eyebrow + phone CTA)
 * 2. Booking bar
 * 3. Featured rooms  — the homepage used to show no rooms and no prices
 * 4. Special offers
 * 5. Location & access — "2 min from Pyeongtaek Station" belongs on the page
 */

import { Locale } from '@/types';
import HeroSection from '@/components/sections/HeroSection';
import BookingBar from '@/components/BookingBar';
import FeaturedRoomsSection from '@/components/sections/FeaturedRoomsSection';
import SpecialOffersSection from '@/components/sections/SpecialOffersSection';
import LocationSection from '@/components/sections/LocationSection';
import { buildMetadata, siteUrl } from '@/lib/seo';

interface HomePageProps {
  params: { locale: string };
}

const META: Record<string, { title: string; description: string }> = {
  ko: {
    title: '평택역 도보 2분, 스테이호텔 평택',
    description: '평택역 1번 출구에서 도보 2분. 스탠다드부터 파티 스위트까지 7가지 객실, ₩70,000부터. 홈페이지 직접 예약 시 라운지 무료 이용.',
  },
  en: {
    title: 'STAY HOTEL in Pyeongtaek — 2 Min from Pyeongtaek Station',
    description: 'A 2-minute walk from Pyeongtaek Station. Seven room types from ₩70,000 a night, with complimentary lounge access when you book direct.',
  },
  ja: {
    title: '平澤駅から徒歩2分、ステイホテル平澤',
    description: '平澤駅1番出口から徒歩2分。スタンダードからパーティースイートまで7タイプ、₩70,000より。公式サイト予約でラウンジ無料。',
  },
  zh: {
    title: '平泽Stay Hotel — 距平泽站步行2分钟',
    description: '距平泽站1号出口步行2分钟。7种房型，每晚₩70,000起。官网直订可免费使用休息室。',
  },
};

export async function generateMetadata({ params }: HomePageProps) {
  const m = META[params.locale] || META.en;
  return buildMetadata({
    locale: params.locale,
    path: '',
    title: m.title,
    description: m.description,
  });
}

function HotelJsonLd({ locale }: { locale: string }) {
  const base = siteUrl();

  const descriptions: Record<string, string> = {
    ko: '평택역 도보 2분, 프리미엄 부띠크 호텔',
    en: '2 min walk from Pyeongtaek Station, Premium Boutique Hotel',
    ja: '平澤駅から徒歩2分、プレミアムブティックホテル',
    zh: '平泽站步行2分钟，精品酒店',
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    '@id': `${base}/#hotel`,
    name: 'STAY HOTEL in PYEONGTAEK',
    description: descriptions[locale] || descriptions.en,
    url: `${base}/${locale}`,
    image: `${base}/images/og-cover.jpg`,
    telephone: '031-654-3333',
    email: 'ptstayhotel@gmail.com',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '평택1로 7',
      addressLocality: '평택시',
      addressRegion: '경기도',
      postalCode: '17764',
      addressCountry: 'KR',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 36.9921,
      longitude: 127.0857,
    },
    hasMap: 'https://map.naver.com/p/search/%EA%B2%BD%EA%B8%B0%EB%8F%84%20%ED%8F%89%ED%83%9D%EC%8B%9C%20%ED%8F%89%ED%83%9D1%EB%A1%9C%207',
    checkinTime: '15:00',
    checkoutTime: '12:00',
    currenciesAccepted: 'KRW',
    paymentAccepted: 'Cash, Credit Card',
    priceRange: '₩₩',
    numberOfRooms: 7,
    petsAllowed: false,
    amenityFeature: [
      { '@type': 'LocationFeatureSpecification', name: 'Free Wi-Fi', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Lounge', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Meeting Room', value: true },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = params;

  return (
    <>
      <HotelJsonLd locale={locale} />
      <HeroSection locale={locale as Locale} />
      {/* Rendered on the server — this used to be `ssr: false`, so the site's
          main conversion element was missing from the HTML entirely. */}
      <BookingBar locale={locale as Locale} />
      <FeaturedRoomsSection locale={locale as Locale} />
      <SpecialOffersSection locale={locale as Locale} />
      <LocationSection locale={locale as Locale} />
    </>
  );
}
