'use client';

/**
 * Navigation Component - Seoul Dragon City Style
 *
 * Structure:
 * - Each menu item has its own dropdown
 * - Submenu items displayed horizontally
 * - Full-width dropdown below menu bar
 */

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Locale } from '@/types';
import { getBrandName } from '@/config/brand';

interface NavigationProps {
  locale: Locale;
}

const languageOptions: { code: Locale; label: string; short: string }[] = [
  { code: 'ko', label: '한국어', short: 'KOR' },
  { code: 'en', label: 'English', short: 'ENG' },
  { code: 'ja', label: '日本語', short: 'JPN' },
  { code: 'zh', label: '中文', short: 'CHN' },
];

const menuItems: { key: string; path: string; label: Record<Locale, string> }[] = [
  { key: 'home', path: '', label: { ko: '홈', en: 'Home', ja: 'ホーム', zh: '首页' } },
  { key: 'rooms', path: '/rooms', label: { ko: '객실', en: 'Rooms', ja: '客室', zh: '客房' } },
  { key: 'facilities', path: '/facilities', label: { ko: '시설', en: 'Facilities', ja: '施設', zh: '设施' } },
  { key: 'location', path: '/location', label: { ko: '오시는 길', en: 'Location', ja: 'アクセス', zh: '位置' } },
  { key: 'events', path: '/events', label: { ko: '이벤트', en: 'Events', ja: 'イベント', zh: '活动' } },
];

export default function Navigation({ locale }: NavigationProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  const brandName = getBrandName(locale);

  const currentLang = languageOptions.find((l) => l.code === locale) || languageOptions[0];

  // Handle scroll for transparent header
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 50);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
    setIsLangOpen(false);
  }, [pathname]);

  // Close language dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get the path without locale prefix for language switcher
  const getPathWithoutLocale = () => {
    const pathParts = pathname.split('/').filter(Boolean);
    if (['ko', 'en', 'ja', 'zh'].includes(pathParts[0])) {
      pathParts.shift();
    }
    return '/' + pathParts.join('/');
  };

  const pathWithoutLocale = getPathWithoutLocale();

  const bookingText: Record<Locale, string> = {
    ko: '예약하기',
    en: 'Booking',
    ja: '予約する',
    zh: '立即预订',
  };

  const isActive = (path: string) => {
    if (path === '') return pathname === `/${locale}`;
    return pathname.includes(path);
  };

  // Dynamic colors based on scroll state
  const headerBg = isScrolled ? 'bg-primary-900/95 backdrop-blur-sm shadow-md' : 'bg-transparent';
  const logoColor = 'text-white';
  const borderColor = 'border-white/15';

  return (
    <>
      {/* Fixed Header - Always visible with transition */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${headerBg}`} style={{ textShadow: isScrolled ? 'none' : '0 1px 3px rgba(0,0,0,0.5)' }}>
        {/* 1st Row: Utility Bar */}
        <div className={`border-b transition-colors duration-300 ${borderColor}`}>
          <div className="container mx-auto px-6">
            <div className="flex justify-end items-center h-10">
              {/* Language Dropdown */}
              <div className="relative" ref={langDropdownRef}>
                <button
                  onClick={() => setIsLangOpen(!isLangOpen)}
                  className="flex items-center gap-1.5 text-xs tracking-wider text-white/80 hover:text-white transition-colors"
                  aria-expanded={isLangOpen}
                  aria-haspopup="true"
                >
                  <span className="font-bold text-white">{currentLang.short}</span>
                  <svg
                    className={`w-3 h-3 transition-transform duration-200 ${isLangOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {isLangOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-primary-900/95 backdrop-blur-sm border border-white/10 min-w-[140px] z-50">
                    {languageOptions.map((lang) => (
                      <Link
                        key={lang.code}
                        href={`/${lang.code}${pathWithoutLocale}`}
                        className={`flex items-center justify-between px-4 py-2.5 text-xs tracking-wider transition-colors ${
                          locale === lang.code
                            ? 'text-amber-400 bg-white/5'
                            : 'text-white/85 hover:text-white hover:bg-white/5'
                        }`}
                        onClick={() => setIsLangOpen(false)}
                      >
                        <span>{lang.label}</span>
                        <span className="text-[10px] text-white/40">{lang.short}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 2nd Row: Logo (Centered) */}
        <div className={`border-b transition-colors duration-300 ${borderColor}`}>
          <div className="container mx-auto px-6">
            <div className="flex justify-center items-center py-3">
              <Link
                href={`/${locale}`}
                className={`text-xl md:text-2xl lg:text-3xl font-medium tracking-widest transition-colors duration-300 ${logoColor}`}
              >
                {brandName}
              </Link>
            </div>
          </div>
        </div>

        {/* 3rd Row: Main Navigation (Centered) */}
        <div className="relative">
          <div className="container mx-auto px-6">
            <nav className="hidden lg:flex justify-center items-center h-12">
              <div className="flex items-center">
                {menuItems.map((item) => (
                  <Link
                    key={item.key}
                    href={`/${locale}${item.path}`}
                    className={`px-6 py-3 text-sm tracking-wider uppercase transition-all duration-300 relative group ${
                      isActive(item.path)
                        ? 'text-white font-medium'
                        : 'text-white/90 hover:text-white'
                    } ${item.key === 'home' ? 'px-8' : ''}`}
                  >
                    {item.label[locale]}
                    <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 h-0.5 bg-amber-400 transition-all duration-300 ${
                      isActive(item.path) ? 'w-6' : 'w-0 group-hover:w-6'
                    }`} />
                  </Link>
                ))}

                {/* Booking */}
                <Link
                  href={`/${locale}/booking`}
                  className="ml-4 px-6 py-2 text-sm tracking-wider uppercase transition-all duration-300 border border-amber-400 text-amber-400 hover:bg-amber-400 hover:text-primary-900"
                >
                  {bookingText[locale]}
                </Link>
              </div>
            </nav>

            {/* Mobile Menu Button */}
            <div className="lg:hidden flex justify-end py-3">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`ml-auto p-3 transition-colors duration-300 ${logoColor}`}
                aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* Spacer REMOVED to allow overlay */}
      {/* Mobile Menu */}
      <div className={`lg:hidden fixed inset-0 z-40 bg-black transition-all duration-500 ${isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        }`}>
        <div className="container mx-auto px-6 pt-[120px] pb-8 h-full overflow-y-auto">
          <div className="space-y-0">
            {menuItems.map((item) => (
              <Link
                key={item.key}
                href={`/${locale}${item.path}`}
                className={`block py-4 text-lg tracking-wider border-b border-white/10 transition-colors ${
                  isActive(item.path) ? 'text-amber-400' : 'text-white/80'
                }`}
              >
                {item.label[locale]}
              </Link>
            ))}
            <Link
              href={`/${locale}/booking`}
              className="block py-4 text-lg tracking-wider border-b border-white/10 text-amber-400 transition-colors"
            >
              {bookingText[locale]}
            </Link>
          </div>

          {/* Mobile Language Selector */}
          <div className="mt-8 space-y-2">
            {languageOptions.map((lang) => (
              <Link
                key={lang.code}
                href={`/${lang.code}${pathWithoutLocale}`}
                className={`block py-2 text-sm tracking-wider transition-colors ${
                  locale === lang.code ? 'text-amber-400' : 'text-white/50 hover:text-white'
                }`}
              >
                {lang.label} ({lang.short})
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
