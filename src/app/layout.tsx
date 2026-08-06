export const runtime = 'edge';

/**
 * Root Layout
 *
 * Minimal root layout for the App Router.
 * The locale-specific layout handles navigation, footer and translations.
 */

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'STAY HOTEL in PYEONGTAEK',
    template: '%s | STAY HOTEL in PYEONGTAEK',
  },
  description: '평택역 도보 2분, 프리미엄 부띠크 호텔. 비즈니스와 레저를 위한 최고의 선택.',
  keywords: ['평택호텔', '평택역호텔', 'Pyeongtaek hotel', 'STAY HOTEL', '비즈니스호텔', '부띠크호텔', '호텔', '숙박', '평택숙소'],
  icons: {
    icon: '/icon.png',
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://pyeongtaekstay.com'),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
