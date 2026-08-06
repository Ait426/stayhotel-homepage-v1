export const runtime = 'edge';

/**
 * Events & Promotions route segment.
 *
 * Server component wrapper — owns metadata; the interactive card/modal UI lives
 * in EventsClient.
 */

import { buildMetadata } from '@/lib/seo';
import EventsClient from './EventsClient';

interface EventsPageProps {
  params: { locale: string };
}

const META: Record<string, { title: string; description: string }> = {
  ko: {
    title: '이벤트 & 프로모션',
    description: '연박 최대 15% 할인, US Military $64 특가, 기업체 혜택, 홈페이지 예약 특전까지 — 평택 스테이호텔의 상시 혜택을 확인하세요.',
  },
  en: {
    title: 'Events & Promotions',
    description: 'Up to 15% off long stays, a flat $64 US Military rate, corporate benefits and direct-booking perks at STAY HOTEL in Pyeongtaek.',
  },
  ja: {
    title: 'イベント＆プロモーション',
    description: '連泊最大15%OFF、US Military $64特価、法人特典、ホームページ予約特典 — 平澤ステイホテルの常時特典をご確認ください。',
  },
  zh: {
    title: '活动与优惠',
    description: '连住最高85折、US Military $64特价、企业优惠及官网预订专享 — 平泽Stay Hotel常年优惠。',
  },
};

export async function generateMetadata({ params }: EventsPageProps) {
  const m = META[params.locale] || META.en;
  return buildMetadata({
    locale: params.locale,
    path: '/events',
    title: m.title,
    description: m.description,
  });
}

export default function EventsPage({ params }: EventsPageProps) {
  return <EventsClient params={params} />;
}
