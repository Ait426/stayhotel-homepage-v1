export const runtime = 'edge';

/**
 * Rooms List Page - Seoul Dragon City Style
 *
 * Elegant room listings with premium styling
 */

import { Locale } from '@/types';
import { rooms } from '@/config/rooms';
import RoomCard from '@/components/RoomCard';
import { createTranslator } from '@/lib/translations';
import { buildAlternates } from '@/lib/seo';

interface RoomsPageProps {
  params: { locale: string };
}

export async function generateMetadata({ params }: RoomsPageProps) {
  const t = createTranslator(params.locale, 'rooms');

  return {
    title: t('title'),
    description: t('subtitle'),
    alternates: buildAlternates(params.locale, '/rooms'),
  };
}

export default async function RoomsPage({ params }: RoomsPageProps) {
  const { locale } = params;

  return (
    <>
      {/* Page Header */}
      <section className="relative h-[50vh] md:h-[65vh] min-h-[350px] md:min-h-[500px] flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(/images/rooms/royal-suite/9.JPG)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary-900/70 via-primary-900/50 to-primary-900/80" />

        {/* Content */}
        <div className="relative z-10 container-custom text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-normal text-white mb-6 tracking-wide">
            Rooms
          </h1>
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-12 h-px bg-accent-500" />
            <div className="w-1.5 h-1.5 rotate-45 bg-accent-500" />
            <div className="w-12 h-px bg-accent-500" />
          </div>
        </div>
      </section>

      {/* Rooms Grid */}
      <section className="section bg-white">
        <div className="container-custom">
          {/* Room count info */}
          <div className="flex items-center justify-between mb-12 pb-6 border-b border-neutral-200">
            <p className="text-sm text-neutral-500 tracking-wide">
              {{ ko: `총 ${rooms.length}개의 객실 타입`, en: `${rooms.length} room types available`, ja: `全${rooms.length}タイプの客室`, zh: `共${rooms.length}种客房类型` }[locale]}
            </p>
          </div>

          {/* Rooms Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
            {rooms.map((room, index) => (
              <div
                key={room.id}
                className="opacity-0 animate-[fadeInUp_0.6s_ease-out_forwards]"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <RoomCard room={room} locale={locale as Locale} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 lg:py-32 bg-primary-900 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="hidden md:block absolute top-0 left-0 w-64 h-64 border border-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="hidden md:block absolute bottom-0 right-0 w-96 h-96 border border-white/5 rounded-full translate-x-1/3 translate-y-1/3" />

        <div className="container-custom text-center relative z-10">
          <span className="inline-block text-xs font-medium text-accent-500 uppercase tracking-[0.3em] mb-6">
            {{ ko: '특별한 경험', en: 'Special Experience', ja: '特別な体験', zh: '特别体验' }[locale]}
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-normal text-white mb-6 tracking-wide">
            {{ ko: '특별한 숙박을 위한 완벽한 선택', en: 'The Perfect Choice for Your Stay', ja: '特別な滞在のための完璧な選択', zh: '您的完美住宿之选' }[locale]}
          </h2>
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="w-12 h-px bg-accent-500" />
            <div className="w-1.5 h-1.5 rotate-45 bg-accent-500" />
            <div className="w-12 h-px bg-accent-500" />
          </div>
          <p className="text-white/70 text-lg max-w-2xl mx-auto mb-12 font-light">
            {{ ko: '지금 바로 예약하고 특별한 혜택을 받으세요', en: 'Book now and receive exclusive benefits', ja: '今すぐご予約いただくと特別な特典がございます', zh: '立即预订，享受专属优惠' }[locale]}
          </p>
          <a
            href={`/${locale}/booking`}
            className="inline-flex items-center gap-3 px-10 py-4 bg-accent-500 text-primary-900 text-sm tracking-widest uppercase transition-all duration-300 hover:bg-white"
          >
            {{ ko: '지금 예약하기', en: 'Book Now', ja: '今すぐ予約', zh: '立即预订' }[locale]}
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </a>
        </div>
      </section>
    </>
  );
}
