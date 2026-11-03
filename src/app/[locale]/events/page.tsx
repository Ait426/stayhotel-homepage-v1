export const runtime = 'edge';

/**
 * Events & Promotions 페이지 — admin '프로모션 관리'에서 노출 중(켜짐·기간 내)인 프로모션만 표시
 */

import EventsView from '@/components/EventsView';
import { Locale } from '@/types';
import { getPromotionConfig } from '@/lib/promotion-store';
import { getKstToday, toPublicPromotions } from '@/config/promotion-plan';

interface EventsPageProps {
    params: { locale: string };
}

export default async function EventsPage({ params }: EventsPageProps) {
    const locale = params.locale as Locale;
    const config = await getPromotionConfig();
    return <EventsView locale={locale} promotions={toPublicPromotions(config, locale, getKstToday())} />;
}
