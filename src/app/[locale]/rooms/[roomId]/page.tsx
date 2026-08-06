export const runtime = 'edge';

/**
 * Room Detail Page
 *
 * Displays detailed information about a specific room.
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Locale } from '@/types';
import {
  rooms,
  getRoomBySlug,
  getRoomName,
  getRoomDescription,
  formatPrice,
} from '@/config/rooms';
import { createTranslator } from '@/lib/translations';
import RoomImageGallery from '@/components/RoomImageGallery';
import { buildAlternates, siteUrl } from '@/lib/seo';
import type { Room } from '@/types';

interface RoomDetailPageProps {
  params: { locale: string; roomId: string };
}

export async function generateMetadata({ params }: RoomDetailPageProps) {
  const room = getRoomBySlug(params.roomId);

  // Unknown slug renders the 404 page — keep it out of the index.
  if (!room) {
    return { title: 'Room Not Found', robots: { index: false, follow: false } };
  }

  const roomName = getRoomName(room, params.locale as Locale);
  const description = getRoomDescription(room, params.locale as Locale);
  const primary = room.images.find((i) => i.isPrimary) || room.images[0];

  return {
    title: roomName,
    description: description.slice(0, 160),
    alternates: buildAlternates(params.locale, `/rooms/${room.slug}`),
    openGraph: {
      title: roomName,
      description: description.slice(0, 160),
      images: primary ? [{ url: primary.url, alt: roomName }] : undefined,
    },
  };
}

/**
 * HotelRoom + Offer structured data. The page already has price, size,
 * occupancy and bed type — surfacing it lets Google show rate-rich results.
 */
function RoomJsonLd({ room, locale }: { room: Room; locale: string }) {
  const base = siteUrl();
  const primary = room.images.find((i) => i.isPrimary) || room.images[0];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HotelRoom',
    name: getRoomName(room, locale as Locale),
    description: getRoomDescription(room, locale as Locale),
    url: `${base}/${locale}/rooms/${room.slug}`,
    ...(primary ? { image: `${base}${primary.url}` } : {}),
    bed: { '@type': 'BedDetails', typeOfBed: room.bedType },
    occupancy: { '@type': 'QuantitativeValue', maxValue: room.maxGuests, unitText: 'guests' },
    floorSize: { '@type': 'QuantitativeValue', value: room.size, unitCode: 'MTK' },
    amenityFeature: room.amenities.map((a) => ({
      '@type': 'LocationFeatureSpecification',
      name: locale === 'ko' ? a.nameKo : a.nameEn,
      value: true,
    })),
    offers: {
      '@type': 'Offer',
      price: room.pricePerNight,
      priceCurrency: 'KRW',
      availability: room.isAvailable
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `${base}/${locale}/booking?room=${room.id}`,
    },
    containedInPlace: {
      '@type': 'Hotel',
      name: 'STAY HOTEL in PYEONGTAEK',
      url: base,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default async function RoomDetailPage({ params }: RoomDetailPageProps) {
  const { locale, roomId } = params;

  const room = getRoomBySlug(roomId);

  if (!room) {
    notFound();
  }

  const t = createTranslator(locale, 'rooms');
  const tCommon = createTranslator(locale, 'common');
  const tBed = createTranslator(locale, 'bedTypes');

  const roomName = getRoomName(room, locale as Locale);
  const description = getRoomDescription(room, locale as Locale);

  return (
    <>
      <RoomJsonLd room={room} locale={locale} />
      {/* Hero Section */}
      <section className="pt-[120px] md:pt-[180px] pb-10 md:pb-16 bg-primary-900">
        <div className="container-custom">
          {/* Breadcrumb */}
          <nav className="mb-8">
            <ol className="flex items-center gap-2 text-sm text-neutral-300">
              <li>
                <Link
                  href={`/${locale}`}
                  className="hover:text-accent-500 transition-colors"
                >
                  {{ ko: '홈', en: 'Home', ja: 'ホーム', zh: '首页' }[locale]}
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link
                  href={`/${locale}/rooms`}
                  className="hover:text-accent-500 transition-colors"
                >
                  {t('title')}
                </Link>
              </li>
              <li>/</li>
              <li className="text-accent-500">{roomName}</li>
            </ol>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12 items-center">
            {/* Image Gallery */}
            <RoomImageGallery images={room.images} roomName={roomName} />

            {/* Room Info */}
            <div>
              <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-accent-500 text-primary-950 mb-4">
                {{ ko: '객실 상세', en: 'Room Details', ja: '客室詳細', zh: '客房详情' }[locale]}
              </span>
              <h1 className="text-4xl md:text-5xl font-heading font-semibold text-white mb-4">
                {roomName}
              </h1>
              <div className="w-16 h-1 bg-gradient-to-r from-accent-500 to-accent-400 my-6 rounded-full" />

              {/* 핵심 스펙 한 줄 요약 — 즉시 비교/판단용 */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-300 mb-6">
                <span>{room.baseGuests ? `${room.baseGuests}~${room.maxGuests}` : room.maxGuests}{{ ko: '인', en: ' guests', ja: '名', zh: '位' }[locale]}</span>
                <span className="text-neutral-500">·</span>
                <span>{room.size}m²</span>
                <span className="text-neutral-500">·</span>
                <span>{tBed(room.bedType)}</span>
                <span className="text-neutral-500">·</span>
                <span className="text-accent-400 font-medium">{formatPrice(room.pricePerNight, locale as Locale)}~{{ ko: '/박', en: '/night', ja: '/泊', zh: '/晚' }[locale]}</span>
                {room.extraGuestFee && room.extraGuestFee > 0 && (
                  <>
                    <span className="text-neutral-500">·</span>
                    <span className="text-amber-400 text-xs">{{ ko: `추가 ₩${room.extraGuestFee.toLocaleString()}/인/박`, en: `+₩${room.extraGuestFee.toLocaleString()}/guest/night`, ja: `追加 ₩${room.extraGuestFee.toLocaleString()}/名/泊`, zh: `加收 ₩${room.extraGuestFee.toLocaleString()}/人/晚` }[locale]}</span>
                  </>
                )}
              </div>

              <p className="text-neutral-200 text-lg mb-8">{description}</p>

              {/* Price */}
              <div className="bg-white/10 rounded-xl p-6 mb-8">
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-4xl font-heading font-semibold text-accent-500">
                    {formatPrice(room.pricePerNight, locale as Locale)}
                  </span>
                  <span className="text-neutral-300">~</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-white/5 rounded-lg px-3 py-2 text-center">
                    <span className="block text-neutral-400 text-xs mb-1">
                      {{ ko: '일~목', en: 'Sun-Thu', ja: '日〜木', zh: '日~四' }[locale]}
                    </span>
                    <span className="text-white font-medium">{formatPrice(room.pricePerNight, locale as Locale)}</span>
                  </div>
                  <div className="bg-white/5 rounded-lg px-3 py-2 text-center">
                    <span className="block text-neutral-400 text-xs mb-1">
                      {{ ko: '금요일', en: 'Friday', ja: '金曜日', zh: '周五' }[locale]}
                    </span>
                    <span className="text-accent-400 font-medium">{formatPrice(room.fridayPrice, locale as Locale)}</span>
                  </div>
                  <div className="bg-white/5 rounded-lg px-3 py-2 text-center">
                    <span className="block text-neutral-400 text-xs mb-1">
                      {{ ko: '토요일', en: 'Saturday', ja: '土曜日', zh: '周六' }[locale]}
                    </span>
                    <span className="text-accent-400 font-medium">{formatPrice(room.saturdayPrice, locale as Locale)}</span>
                  </div>
                </div>
              </div>

              {/* Quick Info */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white/5 rounded-lg p-4">
                  <span className="text-neutral-400 text-sm block mb-1">
                    {t('maxGuests')}
                  </span>
                  <span className="text-white font-medium">
                    {room.baseGuests ? (
                      <>
                        {{ ko: `기준 ${room.baseGuests}인`, en: `Base ${room.baseGuests}`, ja: `基準 ${room.baseGuests}名`, zh: `基准 ${room.baseGuests}位` }[locale]}
                        {' / '}
                        {{ ko: `최대 ${room.maxGuests}인`, en: `Max ${room.maxGuests}`, ja: `最大 ${room.maxGuests}名`, zh: `最多 ${room.maxGuests}位` }[locale]}
                      </>
                    ) : (
                      <>{room.maxGuests} {tCommon('guests')}</>
                    )}
                  </span>
                  {room.extraGuestFee && room.extraGuestFee > 0 ? (
                    <span className="block text-amber-400 text-xs mt-1">
                      {{ ko: `기준 초과 1인당 ₩${room.extraGuestFee.toLocaleString()} 추가/박`, en: `₩${room.extraGuestFee.toLocaleString()} per extra guest/night`, ja: `基準超過 1名あたり ₩${room.extraGuestFee.toLocaleString()}/泊`, zh: `超出基准每人 ₩${room.extraGuestFee.toLocaleString()}/晚` }[locale]}
                    </span>
                  ) : room.baseGuests && room.baseGuests === room.maxGuests ? (
                    <span className="block text-neutral-400 text-xs mt-1">
                      {{ ko: '추가 인원 불가', en: 'No extra guests', ja: '追加人数不可', zh: '不可加人' }[locale]}
                    </span>
                  ) : null}
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <span className="text-neutral-400 text-sm block mb-1">
                    {t('roomSize')}
                  </span>
                  <span className="text-white font-medium">
                    {room.size}
                    {tCommon('sqm')}
                  </span>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <span className="text-neutral-400 text-sm block mb-1">
                    {t('bedType')}
                  </span>
                  <span className="text-white font-medium">{tBed(room.bedType)}</span>
                </div>
              </div>

              {/* Book Button */}
              <Link
                href={`/${locale}/booking?room=${room.id}`}
                className="inline-flex items-center gap-2 px-8 py-4 text-lg font-medium rounded-lg bg-accent-500 text-primary-950 hover:bg-accent-400 hover:-translate-y-0.5 hover:shadow-gold transition-all w-full justify-center"
              >
                {t('bookThisRoom')}
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Amenities Section */}
      <section className="section bg-white">
        <div className="container-custom">
          <h2 className="text-2xl md:text-3xl font-heading font-semibold text-primary-900 mb-8">
            {t('amenities')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {room.amenities.map((amenity) => (
              <div
                key={amenity.id}
                className="flex items-center gap-3 p-4 bg-neutral-50 rounded-lg"
              >
                <div className="w-10 h-10 rounded-full bg-accent-500/10 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-accent-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <span className="text-neutral-700 font-medium">
                  {locale === 'ko' ? amenity.nameKo : amenity.nameEn}{/* ja/zh fallback to English */}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 모바일 sticky 예약 CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-neutral-200 p-3 lg:hidden">
        <Link
          href={`/${locale}/booking?room=${room.id}`}
          className="block w-full text-center py-3.5 bg-accent-500 text-primary-950 font-bold text-sm tracking-wider uppercase rounded-lg"
        >
          {t('bookThisRoom')}
        </Link>
      </div>

      {/* Other Rooms */}
      <section className="section bg-neutral-50">
        <div className="container-custom">
          <h2 className="text-2xl md:text-3xl font-heading font-semibold text-primary-900 mb-8 text-center">
            {{ ko: '다른 객실 둘러보기', en: 'Explore Other Rooms', ja: '他の客室を見る', zh: '浏览其他客房' }[locale]}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {rooms
              .filter((r) => r.id !== room.id)
              .slice(0, 3)
              .map((otherRoom) => (
                <Link
                  key={otherRoom.id}
                  href={`/${locale}/rooms/${otherRoom.slug}`}
                  className="group bg-white rounded-xl p-6 hover:shadow-lg transition-all"
                >
                  <h3 className="font-heading text-lg font-semibold text-primary-900 group-hover:text-accent-600 transition-colors mb-2">
                    {getRoomName(otherRoom, locale as Locale)}
                  </h3>
                  <p className="text-neutral-500 text-sm mb-4">
                    {otherRoom.baseGuests
                      ? `${otherRoom.baseGuests}~${otherRoom.maxGuests}`
                      : otherRoom.maxGuests} {tCommon('guests')} · {otherRoom.size}
                    {tCommon('sqm')}
                  </p>
                  <span className="text-accent-600 font-semibold">
                    {formatPrice(otherRoom.pricePerNight, locale as Locale)}~
                    <span className="text-neutral-400 font-normal text-sm">
                      {' '}{tCommon('perNight')}
                    </span>
                  </span>
                </Link>
              ))}
          </div>
        </div>
      </section>

      {/* 모바일 sticky CTA 높이만큼 하단 여백 */}
      <div className="h-16 lg:hidden" />
    </>
  );
}
