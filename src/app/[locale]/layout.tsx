export const runtime = 'edge';

/**
 * Locale Layout
 *
 * This layout wraps all pages within a specific locale.
 * It provides:
 * - HTML lang attribute based on locale
 * - TranslationProvider for client-side translations
 * - Navigation and Footer components
 * - Tawk.to chat widget
 */

import { notFound } from 'next/navigation';
import { Playfair_Display, Noto_Serif_KR, Noto_Sans_KR } from 'next/font/google';
import { Locale } from '@/types';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import TawkToWidget from '@/components/TawkToWidget';
import { getBrandConfig } from '@/config/brand';
import { getMessages, TranslationProvider } from '@/lib/translations';
import { LOCALE_META, OG_IMAGE, SeoLocale } from '@/lib/seo';

// Supported locales
const locales = ['ko', 'en', 'ja', 'zh'] as const;

// Enable static generation with revalidation
export const revalidate = 3600; // revalidate every hour

/**
 * Fonts.
 *
 * Playfair/Cormorant carry no Hangul, so Korean headings were falling through
 * to whatever serif the OS picked — which is why the hero title rendered as a
 * blocky system face instead of a display serif. Noto Serif/Sans KR are loaded
 * alongside and listed first for Korean; Playfair still handles Latin.
 */
const playfair = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair',
});

const notoSerifKr = Noto_Serif_KR({
  weight: ['400', '500'],
  display: 'swap',
  // `subsets` is omitted on purpose: next/font has no `korean` subset for CJK
  // families, and naming only `latin` ships a file with no Hangul at all —
  // which is what silently reverted Korean headings to a system sans.
  // Omitting it pulls every unicode-range; `preload: false` keeps the (large)
  // Hangul ranges off the critical path.
  preload: false,
  variable: '--font-serif-kr',
});

const notoSansKr = Noto_Sans_KR({
  weight: ['300', '400', '500', '700'],
  display: 'swap',
  preload: false,
  variable: '--font-sans-kr',
});

// Generate metadata based on locale
export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}) {
  const brand = getBrandConfig();
  const locale = (params.locale || 'ko') as Locale;
  const brandName = brand.name[locale] || brand.name.en;
  const tagline = brand.tagline[locale] || brand.tagline.en;

  return {
    // `absolute` keeps the brand name from being appended to itself — the old
    // `default` value was fed back through this same template, producing
    // "STAY HOTEL in PYEONGTAEK | STAY HOTEL in PYEONGTAEK".
    title: {
      absolute: `${brandName} — ${tagline}`,
      template: `%s | ${brandName}`,
    },
    description: tagline,
    openGraph: {
      title: brandName,
      description: tagline,
      siteName: brandName,
      locale: LOCALE_META[locale as SeoLocale]?.og || 'ko_KR',
      type: 'website',
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: brandName }],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: brandName,
      description: tagline,
      images: [OG_IMAGE],
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;

  // Validate locale
  if (!locales.includes(locale as typeof locales[number])) {
    notFound();
  }

  // Get messages for this locale
  const messages = getMessages(locale);

  return (
    <html lang={locale} className={`${playfair.variable} ${notoSerifKr.variable} ${notoSansKr.variable}`}>
      <body className="font-body antialiased bg-white text-neutral-900">
        <TranslationProvider locale={locale} messages={messages}>
          {/* Skip to content link for accessibility */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-900 focus:text-white focus:rounded"
          >
            {{ ko: '본문으로 건너뛰기', en: 'Skip to content', ja: 'コンテンツへスキップ', zh: '跳至内容' }[locale as Locale] || 'Skip to content'}
          </a>

          {/* Navigation */}
          <Navigation locale={locale as Locale} />

          {/* Main content */}
          <main id="main-content" className="min-h-screen">
            {children}
          </main>

          {/* Footer */}
          <Footer locale={locale as Locale} />

          {/* Tawk.to Live Chat Widget */}
          <TawkToWidget />
        </TranslationProvider>
      </body>
    </html>
  );
}
