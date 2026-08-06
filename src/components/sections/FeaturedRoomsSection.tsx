/**
 * Featured Rooms — homepage section.
 *
 * Server component: the only interactive part is RoomCard, so there's no reason
 * to ship the section shell to the browser.
 */

import Link from 'next/link';
import { Locale } from '@/types';
import { rooms } from '@/config/rooms';
import RoomCard from '@/components/RoomCard';
import { createTranslator } from '@/lib/translations';

interface FeaturedRoomsSectionProps {
  locale: Locale;
}

// Deliberately spans the price range so the homepage answers "how much?" —
// an entry rate is the single most-requested fact for a business hotel.
const FEATURED_IDS = ['standard', 'deluxe', 'royal-suite'];

export default function FeaturedRoomsSection({ locale }: FeaturedRoomsSectionProps) {
  const t = createTranslator(locale, 'home');
  const tCommon = createTranslator(locale, 'common');

  const featuredRooms = FEATURED_IDS
    .map((id) => rooms.find((room) => room.id === id))
    .filter((room): room is NonNullable<typeof room> => Boolean(room));

  return (
    <section className="section bg-white">
      <div className="container-custom">
        {/* Section Header */}
        <div className="text-center mb-14 md:mb-20">
          <span className="inline-block text-xs font-medium text-accent-500 uppercase tracking-[0.3em] mb-4">
            {{ ko: '객실 안내', en: 'Accommodations', ja: '客室案内', zh: '客房介绍' }[locale]}
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-normal text-primary-900 tracking-wide mb-6">
            {t('featuredRooms')}
          </h2>
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-12 h-px bg-accent-500" />
            <div className="w-1.5 h-1.5 rotate-45 bg-accent-500" />
            <div className="w-12 h-px bg-accent-500" />
          </div>
          <p className="text-neutral-600 text-base md:text-lg max-w-2xl mx-auto leading-relaxed font-light">
            {t('featuredRoomsSubtitle')}
          </p>
        </div>

        {/* Room Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
          {featuredRooms.map((room) => (
            <RoomCard key={room.id} room={room} locale={locale} />
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-14 md:mt-16">
          <Link
            href={`/${locale}/rooms`}
            className="group inline-flex items-center gap-3 px-8 py-4 border border-primary-900 text-primary-900 text-sm tracking-widest uppercase transition-all duration-300 hover:bg-primary-900 hover:text-white"
          >
            {tCommon('viewAll')}
            <svg
              aria-hidden="true"
              className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
