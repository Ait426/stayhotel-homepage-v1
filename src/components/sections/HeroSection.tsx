'use client';

/**
 * Hero Section — full-screen slider.
 *
 * Art direction is done with <picture> + media queries rather than a JS
 * `isMobile` flag. The old version started with `isMobile = false`, so the
 * server HTML always referenced the desktop image; phones downloaded that
 * (the LCP element) and then swapped to the mobile file after hydration —
 * two downloads for one visible image. <picture> lets the browser pick once,
 * before any JavaScript runs.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Locale } from '@/types';

interface HeroSectionProps {
  locale: Locale;
}

type Localized = Record<Locale, string>;

interface SlideData {
  /** Basename under /images/rooms/hero — expects -sm/-md/-lg .webp variants. */
  slug: string;
  title: Localized;
  subtitle: Localized;
}

const SLIDES: SlideData[] = [
  {
    slug: 'party-suite',
    title: { ko: '도심 속 완벽한 휴식', en: 'Perfect Urban Retreat', ja: '都心の完璧な休息', zh: '城市中的完美休憩' },
    subtitle: { ko: '평택의 랜드마크, 스테이호텔에서 특별한 하루를', en: 'A Landmark in Pyeongtaek, Experience Luxury', ja: '平澤のランドマーク、ステイホテルで特別な一日を', zh: '平泽地标，在Stay Hotel度过特别的一天' },
  },
  {
    slug: 'royal-suite',
    title: { ko: '프리미엄 비즈니스 스테이', en: 'Premium Business Stay', ja: 'プレミアムビジネスステイ', zh: '高端商务住宿' },
    subtitle: { ko: '비즈니스와 휴식의 완벽한 조화', en: 'Where business meets comfort', ja: 'ビジネスと休息の完璧な調和', zh: '商务与舒适的完美融合' },
  },
  {
    slug: 'deluxe',
    title: { ko: '특별한 순간을 위한 공간', en: 'Space for Special Moments', ja: '特別なひとときのための空間', zh: '为特别时刻打造的空间' },
    subtitle: { ko: '소중한 추억을 만들어 드립니다', en: 'Creating precious memories', ja: '大切な思い出をお作りします', zh: '为您创造珍贵的回忆' },
  },
];

/**
 * Stable, keyword-bearing lead line. The <h1> used to be the rotating slide
 * title alone, so the page had no heading mentioning the hotel or Pyeongtaek —
 * the two terms local search actually runs on.
 */
const EYEBROW: Localized = {
  ko: '평택역 도보 2분 · 스테이호텔 평택',
  en: '2 min walk from Pyeongtaek Station · STAY HOTEL in Pyeongtaek',
  ja: '平澤駅から徒歩2分 · ステイホテル平澤',
  zh: '平泽站步行2分钟 · 平泽Stay Hotel',
};

const CTA: Localized = { ko: '객실 둘러보기', en: 'Explore Rooms', ja: '客室を見る', zh: '浏览客房' };
const CALL: Localized = { ko: '전화 예약', en: 'Call to Book', ja: '電話予約', zh: '电话预订' };
const SCROLL_HINT: Localized = { ko: '아래로 스크롤', en: 'Scroll down', ja: '下にスクロール', zh: '向下滚动' };

const HOTEL_PHONE = process.env.NEXT_PUBLIC_CONTACT_PHONE || '031-654-3333';

export default function HeroSection({ locale }: HeroSectionProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  // Slides only mount their <img> once they've been shown, so the browser
  // isn't fetching three full-bleed photos during first paint.
  const [mounted, setMounted] = useState<boolean[]>(() => SLIDES.map((_, i) => i === 0));
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [paused]);

  useEffect(() => {
    setMounted((prev) => (prev[currentSlide] ? prev : prev.map((v, i) => v || i === currentSlide)));
  }, [currentSlide]);

  // Respect users who prefer no motion — stop the carousel entirely.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setPaused(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const current = SLIDES[currentSlide];
  // Wide letter-spacing and uppercase read as elegant in Latin and as broken
  // in Hangul/Kana/Hanzi, so those treatments are gated on the locale.
  const isLatin = locale === 'en';

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Slider background */}
      <div className="absolute inset-0 bg-black">
        {SLIDES.map((slide, index) => (
          <div
            key={slide.slug}
            aria-hidden={index !== currentSlide}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            {mounted[index] && (
              <picture>
                <source
                  media="(max-width: 767px)"
                  srcSet={`/images/rooms/hero/${slide.slug}-sm.webp`}
                  type="image/webp"
                />
                <source
                  media="(max-width: 1439px)"
                  srcSet={`/images/rooms/hero/${slide.slug}-md.webp`}
                  type="image/webp"
                />
                <img
                  src={`/images/rooms/hero/${slide.slug}-lg.webp`}
                  alt=""
                  decoding={index === 0 ? 'sync' : 'async'}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  {...({ fetchpriority: index === 0 ? 'high' : 'low' } as any)}
                  className={`w-full h-full object-cover ${
                    index === currentSlide && !paused ? 'animate-kenburns' : ''
                  }`}
                />
              </picture>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/25 to-black/60" />
          </div>
        ))}
      </div>

      {/* Content — vertically centred, not pushed down from the top, so the
          block stays balanced instead of crowding the lower half. */}
      <div className="relative z-20 h-full flex items-center justify-center px-6">
        <div className="text-center max-w-4xl -mt-[6vh]">
          <h1 className="flex flex-col items-center">
            {/* Eyebrow: hairline rules instead of wide letter-spacing. Hangul has
                no word gaps, so tracking just makes it look broken apart. */}
            <span className={`flex items-center gap-4 mb-6 md:mb-8 ${isLatin ? 'tracking-[0.25em] uppercase' : 'tracking-tight'}`}>
              <span aria-hidden="true" className="hidden sm:block w-8 h-px bg-accent-400/60" />
              <span
                className="text-accent-400/90 text-[11px] sm:text-xs font-body font-normal"
                style={{ textShadow: '0 1px 6px rgba(0,0,0,0.7)' }}
              >
                {EYEBROW[locale]}
              </span>
              <span aria-hidden="true" className="hidden sm:block w-8 h-px bg-accent-400/60" />
            </span>

            <span
              key={`title-${currentSlide}`}
              className={`text-white text-[2.1rem] leading-[1.25] sm:text-5xl md:text-6xl lg:text-[4.25rem] font-serif font-normal animate-fade-in-up ${isLatin ? 'tracking-tight' : 'tracking-[-0.01em]'}`}
              style={{ textShadow: '0 2px 24px rgba(0,0,0,0.45)' }}
            >
              {current.title[locale]}
            </span>
          </h1>

          <p
            key={`subtitle-${currentSlide}`}
            className="text-white/70 text-sm sm:text-base md:text-lg mt-5 md:mt-7 font-light animate-fade-in-up"
            style={{ textShadow: '0 1px 12px rgba(0,0,0,0.5)', animationDelay: '0.15s', animationFillMode: 'both' }}
          >
            {current.subtitle[locale]}
          </p>

          {/* One primary action. The phone number sits below as a quiet line
              rather than inside a second button competing for attention. */}
          <div className="mt-9 md:mt-11 flex flex-col items-center gap-5">
            <Link
              href={`/${locale}/rooms`}
              className="inline-flex items-center gap-3 px-9 py-3.5 border border-white/50 text-white text-[13px] tracking-[0.12em] font-medium transition-colors duration-300 hover:bg-white hover:text-primary-900 hover:border-white"
            >
              {CTA[locale]}
              <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>

            <a
              href={`tel:${HOTEL_PHONE.replace(/[^\d+]/g, '')}`}
              className="group text-white/60 hover:text-accent-400 text-xs sm:text-[13px] transition-colors"
              style={{ textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}
            >
              <span className="mr-2">{CALL[locale]}</span>
              <span className="font-body tracking-[0.08em] border-b border-white/25 group-hover:border-accent-400/60 pb-0.5">
                {HOTEL_PHONE}
              </span>
            </a>
          </div>
        </div>
      </div>

      {/* Scroll indicator — sits above the dots with real clearance; the two
          used to overlap near the bottom edge. */}
      <div className="absolute bottom-20 md:bottom-28 left-1/2 -translate-x-1/2 z-20 hidden sm:flex flex-col items-center gap-2.5">
        <span className="sr-only">{SCROLL_HINT[locale]}</span>
        <span aria-hidden="true" className="text-white/45 text-[9px] tracking-[0.35em] uppercase">Scroll</span>
        <div aria-hidden="true" className="w-px h-10 bg-gradient-to-b from-white/45 to-transparent" />
      </div>

      {/* Slide indicators */}
      <div className="absolute bottom-8 md:bottom-10 left-1/2 -translate-x-1/2 z-30 flex gap-3">
        {SLIDES.map((slide, index) => (
          <button
            key={slide.slug}
            onClick={() => setCurrentSlide(index)}
            aria-label={`${index + 1} / ${SLIDES.length}`}
            aria-current={index === currentSlide}
            className={`h-1.5 -my-2 py-2 box-content transition-all duration-500 ${
              index === currentSlide ? 'w-12' : 'w-6'
            }`}
          >
            <span
              className={`block h-0.5 w-full transition-colors duration-500 ${
                index === currentSlide ? 'bg-white' : 'bg-white/40 hover:bg-white/70'
              }`}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
