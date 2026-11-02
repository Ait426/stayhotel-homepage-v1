'use client';

/**
 * Room Card Component - Seoul Dragon City Style
 *
 * Elegant, minimal design with:
 * - Image zoom on hover
 * - Sophisticated overlay
 * - Premium luxury feel
 */

import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from '@/lib/translations';
import { Room, Locale } from '@/types';
import { getRoomName, getRoomDescription, formatPrice } from '@/config/rooms';

const BLUR_PLACEHOLDER = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/2wBDAQoLCw4NDhwQEBw7KCIoOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozv/wAARCAADAAQDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAABv/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AhgA//9k=';

interface RoomCardProps {
  room: Room;
  locale: Locale;
  /** 표시할 1박 가격 (요금 관리 평일 세트). 없으면 기본 요금 */
  nightlyPrice?: number;
}

export default function RoomCard({ room, locale, nightlyPrice }: RoomCardProps) {
  const t = useTranslations('rooms');

  const roomName = getRoomName(room, locale);
  const description = getRoomDescription(room, locale);
  const primaryImage = room.images.find(img => img.isPrimary) || room.images[0];

  return (
    <Link href={`/${locale}/rooms/${room.slug}`} className="group block">
      <div className="bg-white overflow-hidden">
        {/* Image Container */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={primaryImage.url}
            alt={primaryImage.alt}
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            quality={75}
            placeholder="blur"
            blurDataURL={BLUR_PLACEHOLDER}
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-500" />

          {/* Price Tag - Always visible on mobile, hover on desktop */}
          <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 transform translate-y-0 opacity-100 md:translate-y-4 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 transition-all duration-500">
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-xl sm:text-2xl text-white">{formatPrice(nightlyPrice ?? room.pricePerNight, locale)}</span>
              <span className="text-white/70 text-sm">~</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 border border-neutral-100 border-t-0">
          {/* Room Name */}
          <h3 className="font-serif text-xl text-primary-900 mb-3 tracking-wide group-hover:text-accent-500 transition-colors duration-300">
            {roomName}
          </h3>

          {/* Room Info */}
          <div className="flex items-center gap-4 sm:gap-6 text-sm text-neutral-400 mb-4 flex-wrap">
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {room.baseGuests
                ? `${room.baseGuests}${{ ko: '인', en: '', ja: '名', zh: '位' }[locale]}~${room.maxGuests}${{ ko: '인', en: ' Guests', ja: '名', zh: '位' }[locale]}`
                : `${room.maxGuests}${{ ko: '인', en: ' Guests', ja: '名', zh: '位' }[locale]}`
              }
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              {room.size}m²
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" />
              </svg>
              {{ single: { ko: '싱글', en: 'Single', ja: 'シングル', zh: '单人' }, double: { ko: '더블', en: 'Double', ja: 'ダブル', zh: '双人' }, twin: { ko: '트윈', en: 'Twin', ja: 'ツイン', zh: '双床' }, queen: { ko: '퀸', en: 'Queen', ja: 'クイーン', zh: '大床' }, king: { ko: '킹', en: 'King', ja: 'キング', zh: '特大床' } }[room.bedType]?.[locale] || room.bedType}
            </span>
          </div>

          {/* 추가 인원 안내 */}
          {room.extraGuestFee && room.extraGuestFee > 0 ? (
            <p className="text-xs text-amber-600 mb-3">
              {{ ko: `기준 ${room.baseGuests}인 초과 시 1인당 ₩${room.extraGuestFee.toLocaleString()} 추가`, en: `₩${room.extraGuestFee.toLocaleString()} per extra guest (base ${room.baseGuests})`, ja: `基準${room.baseGuests}名超過時 1名あたり ₩${room.extraGuestFee.toLocaleString()} 追加`, zh: `超过${room.baseGuests}人时每人加收 ₩${room.extraGuestFee.toLocaleString()}` }[locale]}
            </p>
          ) : room.baseGuests && room.baseGuests === room.maxGuests ? (
            <p className="text-xs text-neutral-400 mb-3">
              {{ ko: '추가 인원 불가', en: 'No extra guests', ja: '追加人数不可', zh: '不可加人' }[locale]}
            </p>
          ) : null}

          {/* Description */}
          <p className="text-sm text-neutral-500 line-clamp-2 mb-6 leading-relaxed">
            {description}
          </p>

          {/* View Details */}
          <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
            <span className="text-xs tracking-widest uppercase text-primary-900 group-hover:text-accent-500 transition-colors">
              {t('viewDetails')}
            </span>
            <svg
              className="w-5 h-5 text-primary-900 group-hover:text-accent-500 group-hover:translate-x-1 transition-all duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
