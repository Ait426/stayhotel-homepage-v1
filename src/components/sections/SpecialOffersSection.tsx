'use client';

/**
 * Special Offers Section - Seoul Dragon City Style
 *
 * Tab-filtered grid of offer cards.
 * 카드 클릭 → 혜택 상세 모달 즉시 오픈 (events 페이지 이동 X)
 * CTA 버튼은 showHomeCta 이벤트(미군/연박)에만 노출, 클릭 시에도 모달 오픈
 * 실제 예약 이동은 모달 내부 기존 CTA에서만 발생
 */

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Locale } from '@/types';
import { offers, Offer, TabType } from '@/config/events';

const BLUR_PLACEHOLDER = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/2wBDAQoLCw4NDhwQEBw7KCIoOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozv/wAARCAADAAQDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAABv/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AhgA//9k=';

interface SpecialOffersSectionProps {
  locale: Locale;
}

const tabs: { key: TabType; label: { ko: string; en: string; ja: string; zh: string } }[] = [
  { key: 'all', label: { ko: '전체', en: 'ALL', ja: 'すべて', zh: '全部' } },
  { key: 'room', label: { ko: '객실 패키지', en: 'ROOM PACKAGE', ja: '客室パッケージ', zh: '客房套餐' } },
  { key: 'event', label: { ko: '이벤트', en: 'EVENTS', ja: 'イベント', zh: '活动' } },
];

export default function SpecialOffersSection({ locale }: SpecialOffersSectionProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  // Element that opened the modal, so focus can be handed back on close.
  const openerRef = useRef<HTMLElement | null>(null);

  const loc = locale as 'ko' | 'en' | 'ja' | 'zh';

  const openOffer = (offer: Offer, event: { currentTarget: HTMLElement }) => {
    openerRef.current = event.currentTarget;
    setSelectedOffer(offer);
  };

  // 모달 Escape 닫기 + Tab 포커스 가두기
  useEffect(() => {
    if (!selectedOffer) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedOffer(null);
        return;
      }
      if (e.key !== 'Tab' || !modalRef.current) return;

      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedOffer]);

  // 모달이 열리면 포커스를 안으로, 닫히면 열었던 요소로 되돌린다
  useEffect(() => {
    if (selectedOffer) {
      modalRef.current?.focus();
    } else {
      openerRef.current?.focus();
      openerRef.current = null;
    }
  }, [selectedOffer]);

  // 모달 열릴 때 body 스크롤 잠금
  useEffect(() => {
    if (selectedOffer) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedOffer]);

  const filteredOffers = activeTab === 'all'
    ? offers
    : offers.filter(offer => offer.type === activeTab);

  const detailsTitle: Record<string, string> = {
    ko: '이용 안내 및 주의사항',
    en: 'Terms & Conditions',
    ja: 'ご利用案内・注意事項',
    zh: '使用须知及注意事项',
  };

  const closeLabel: Record<string, string> = {
    ko: '닫기',
    en: 'Close',
    ja: '閉じる',
    zh: '关闭',
  };

  const ctaLabel: Record<string, string> = {
    ko: '이 혜택으로 예약하기',
    en: 'Book with this offer',
    ja: 'この特典で予約する',
    zh: '以此优惠预订',
  };

  return (
    <section className="py-20 md:py-28 bg-neutral-50">
      <div className="container-custom">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-normal text-primary-900 tracking-wide">
            {{ ko: '특별 혜택', en: 'Exclusive Benefits', ja: '特別特典', zh: '专属礼遇' }[locale]}
          </h2>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-6 py-3 text-xs tracking-widest uppercase transition-all duration-300 ${activeTab === tab.key
                  ? 'bg-primary-900 text-white'
                  : 'bg-white text-neutral-500 hover:text-primary-900'
                }`}
            >
              {tab.label[locale]}
            </button>
          ))}
        </div>

        {/* Offers Grid — 카드 클릭 → 모달 오픈 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredOffers.map((offer) => (
            // A plain div with onClick was unreachable by keyboard — the whole
            // offers grid could not be operated without a mouse.
            <div
              key={offer.id}
              role="button"
              tabIndex={0}
              aria-haspopup="dialog"
              onClick={(e) => openOffer(offer, e)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openOffer(offer, e);
                }
              }}
              className="group bg-white overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
            >
              {/* Image */}
              <div className="aspect-[4/3] relative overflow-hidden">
                <Image
                  src={offer.image}
                  alt={offer.title[locale]}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  quality={75}
                  placeholder="blur"
                  blurDataURL={BLUR_PLACEHOLDER}
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-primary-900/0 group-hover:bg-primary-900/40 transition-all duration-500 flex items-center justify-center">
                  <span className="text-white text-sm tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-500 border border-white px-6 py-2">
                    {{ ko: '자세히 보기', en: 'View Details', ja: '詳細を見る', zh: '查看详情' }[locale]}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Subtitle/Badge */}
                <span className="text-xs text-accent-500 tracking-widest uppercase">
                  {offer.subtitle[locale]}
                </span>

                {/* Title */}
                <h3 className="font-serif text-xl text-primary-900 mt-2 mb-2 tracking-wide group-hover:text-accent-500 transition-colors">
                  {offer.title[locale]}
                </h3>

                {/* Description */}
                <p className="text-sm text-neutral-500 mb-4">
                  {offer.desc[locale]}
                </p>

                {/* Period + CTA */}
                <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-xs text-neutral-400">
                    {offer.period[locale]}
                  </span>
                  {offer.showHomeCta ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); openOffer(offer, e); }}
                      className="text-xs font-medium text-accent-600 hover:text-accent-700 tracking-wide transition-colors"
                    >
                      {ctaLabel[locale]}
                    </button>
                  ) : (
                    <svg
                      className="w-5 h-5 text-neutral-300 group-hover:text-accent-500 group-hover:translate-x-1 transition-all duration-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-12">
          <Link
            href={`/${locale}/events`}
            className="inline-flex items-center gap-3 px-8 py-4 border border-primary-900 text-primary-900 text-sm tracking-widest uppercase transition-all duration-300 hover:bg-primary-900 hover:text-white"
          >
            {{ ko: '전체 보기', en: 'View All', ja: 'すべて見る', zh: '查看全部' }[locale]}
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>

      {/* ============================================ */}
      {/* 혜택 상세 모달 — /events 페이지와 동일 구조   */}
      {/* ============================================ */}
      {selectedOffer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedOffer(null)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />

          {/* Modal Content */}
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="offer-modal-title"
            tabIndex={-1}
            className="relative bg-white max-w-2xl w-full max-h-[90vh] sm:max-h-[85vh] overflow-y-auto animate-fade-in-up shadow-2xl rounded-lg sm:rounded-none focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button — 모바일 터치 영역 확대 */}
            <button
              onClick={() => setSelectedOffer(null)}
              aria-label={closeLabel[locale]}
              className="absolute top-3 right-3 z-10 w-11 h-11 flex items-center justify-center bg-black/40 rounded-full text-white/90 hover:text-white hover:bg-black/60 transition-colors"
            >
              <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Image */}
            <div className="aspect-[16/9] relative overflow-hidden">
              <Image
                src={selectedOffer.image}
                alt={selectedOffer.title[loc]}
                fill
                sizes="(max-width: 768px) 100vw, 672px"
                quality={80}
                className={`object-cover ${selectedOffer.id === 5 ? 'scale-[1.35]' : ''}`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <span className="text-xs text-accent-400 tracking-widest uppercase font-medium">
                  {selectedOffer.subtitle[loc]}
                </span>
                <h2 id="offer-modal-title" className="text-2xl md:text-3xl font-serif text-white mt-2 tracking-wide">
                  {selectedOffer.title[loc]}
                </h2>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 md:p-8">
              <p className="text-gray-600 text-sm leading-relaxed mb-6">
                {selectedOffer.desc[loc]}
              </p>

              <div className="flex items-center gap-2 mb-4 text-xs text-gray-400 tracking-wider">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {selectedOffer.period[loc]}
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 my-6" />

              {/* Details / Terms */}
              <h3 className="text-sm font-medium text-primary-900 tracking-wider uppercase mb-4">
                {detailsTitle[locale]}
              </h3>
              <ul className="space-y-3">
                {selectedOffer.details[loc].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-gray-600 leading-relaxed">
                    <span className="text-accent-500 mt-1 flex-shrink-0">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>

              {/* CTA + Close — 모달 내부 CTA만 실제 예약 이동 */}
              <div className="mt-8 flex flex-col items-center gap-3 w-full">
                {selectedOffer.id === 1 && (
                  <a
                    href={`/${locale}/booking?promo=longstay`}
                    className="block w-full sm:w-auto text-center px-10 py-4 sm:py-3 bg-accent-500 text-primary-900 text-sm font-bold tracking-widest uppercase transition-all duration-300 hover:bg-primary-900 hover:text-white"
                  >
                    {ctaLabel[locale]}
                  </a>
                )}
                {selectedOffer.id === 4 && (
                  // Stay in the visitor's locale — this used to hard-code /en,
                  // dropping Korean/Japanese/Chinese visitors into English.
                  <a
                    href={`/${locale}/booking?promo=military`}
                    className="block w-full sm:w-auto text-center px-10 py-4 sm:py-3 bg-accent-500 text-primary-900 text-sm font-bold tracking-widest uppercase transition-all duration-300 hover:bg-primary-900 hover:text-white"
                  >
                    US Military Special — Book Now
                  </a>
                )}
                <button
                  onClick={() => setSelectedOffer(null)}
                  className="w-full sm:w-auto px-10 py-4 sm:py-3 bg-primary-900 text-white text-sm tracking-widest uppercase transition-all duration-300 hover:bg-accent-500"
                >
                  {closeLabel[locale]}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
