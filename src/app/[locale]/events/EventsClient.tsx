'use client';

/**
 * Events page body. Split out of `page.tsx` so the route segment can stay a
 * server component — a `'use client'` page cannot export `generateMetadata`
 * (nor route config like `runtime`), which left this page with no title or
 * description of its own in any locale.
 */

import { useState, useEffect } from 'react';
import { offers, Offer } from '@/config/events';

interface EventsClientProps {
    params: { locale: string };
}

export default function EventsClient({ params }: EventsClientProps) {
    const { locale } = params;
    const loc = locale as 'ko' | 'en' | 'ja' | 'zh';

    const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);

    // Close on Escape
    useEffect(() => {
        if (!selectedOffer) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setSelectedOffer(null);
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [selectedOffer]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (selectedOffer) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [selectedOffer]);

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

    return (
        <div className="min-h-screen bg-neutral-50 pb-20">
            {/* Header Section */}
            <section className="relative h-[50vh] md:h-[65vh] min-h-[350px] md:min-h-[500px] flex items-center justify-center overflow-hidden bg-primary-900">
                <img
                    src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=1920&auto=format&fit=crop"
                    alt="Events & Promotions"
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
                <div className="relative z-10 container mx-auto px-6 text-center text-white">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-normal text-white mb-6 tracking-wide">
                        Events & Promotions
                    </h1>
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <div className="w-12 h-px bg-accent-500" />
                        <div className="w-1.5 h-1.5 rotate-45 bg-accent-500" />
                        <div className="w-12 h-px bg-accent-500" />
                    </div>
                </div>
            </section>

            {/* Events List Section */}
            <div className="container mx-auto px-6 pt-16 relative z-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
                    {offers.map((offer) => (
                        <div
                            key={offer.id}
                            onClick={() => setSelectedOffer(offer)}
                            className="group bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 flex flex-col cursor-pointer"
                        >
                            {/* Image */}
                            <div className="aspect-[4/3] relative overflow-hidden">
                                <img
                                    src={offer.image}
                                    alt={offer.title[loc]}
                                    className={`w-full h-full object-cover transition-transform duration-700 ${offer.id === 5 ? 'scale-[1.35] group-hover:scale-150' : 'group-hover:scale-110'}`}
                                />
                                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 text-xs font-medium text-gray-600 rounded-full uppercase tracking-wider">
                                    {offer.type}
                                </div>
                                {/* Hover overlay */}
                                <div className="absolute inset-0 bg-primary-900/0 group-hover:bg-primary-900/40 transition-all duration-500 flex items-center justify-center">
                                    <span className="text-white text-sm tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-500 border border-white px-6 py-2">
                                        {{ ko: '자세히 보기', en: 'View Details', ja: '詳細を見る', zh: '查看详情' }[locale]}
                                    </span>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 flex-1 flex flex-col">
                                <span className="text-xs text-accent-600 tracking-widest uppercase mb-2 block font-medium">
                                    {offer.subtitle[loc]}
                                </span>
                                <h3 className="text-xl font-medium text-gray-900 mb-3 group-hover:text-amber-700 transition-colors">
                                    {offer.title[loc]}
                                </h3>
                                <p className="text-gray-500 text-sm mb-4 flex-1">
                                    {offer.desc[loc]}
                                </p>

                                <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-400">
                                    <span>{offer.period[loc]}</span>
                                    <svg className="w-5 h-5 text-neutral-300 group-hover:text-accent-500 group-hover:translate-x-1 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Detail Modal */}
            {selectedOffer && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedOffer(null)}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />

                    {/* Modal Content */}
                    <div
                        className="relative bg-white max-w-2xl w-full max-h-[85vh] overflow-y-auto animate-fade-in-up shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            onClick={() => setSelectedOffer(null)}
                            className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Image */}
                        <div className="aspect-[16/9] relative overflow-hidden">
                            <img
                                src={selectedOffer.image}
                                alt={selectedOffer.title[loc]}
                                className={`w-full h-full object-cover ${selectedOffer.id === 5 ? 'scale-[1.35]' : ''}`}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-8">
                                <span className="text-xs text-accent-400 tracking-widest uppercase font-medium">
                                    {selectedOffer.subtitle[loc]}
                                </span>
                                <h2 className="text-2xl md:text-3xl font-serif text-white mt-2 tracking-wide">
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

                            {/* CTA + Close buttons */}
                            <div className="mt-8 flex flex-col items-center gap-3">
                                {selectedOffer.id === 1 && (
                                    <a
                                        href={`/${locale}/booking?promo=longstay`}
                                        className="inline-block px-10 py-3 bg-accent-500 text-primary-900 text-sm font-bold tracking-widest uppercase transition-all duration-300 hover:bg-primary-900 hover:text-white"
                                    >
                                        {{ ko: '이 혜택으로 예약하기', en: 'Book with this offer', ja: 'この特典で予約する', zh: '以此优惠预订' }[locale]}
                                    </a>
                                )}
                                {selectedOffer.id === 4 && (
                                    <a
                                        href={`/${locale}/booking?promo=military`}
                                        className="inline-block px-10 py-3 bg-accent-500 text-primary-900 text-sm font-bold tracking-widest uppercase transition-all duration-300 hover:bg-primary-900 hover:text-white"
                                    >
                                        US Military Special — Book Now
                                    </a>
                                )}
                                <button
                                    onClick={() => setSelectedOffer(null)}
                                    className="px-10 py-3 bg-primary-900 text-white text-sm tracking-widest uppercase transition-all duration-300 hover:bg-accent-500"
                                >
                                    {closeLabel[locale]}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
