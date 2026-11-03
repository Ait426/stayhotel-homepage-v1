/**
 * Admin Promotions API — 프로모션 관리
 *
 * GET /api/admin/promotions  — 현재 프로모션 설정 (저장값이 없으면 기본 설정, saved:false)
 * PUT /api/admin/promotions  — 설정 저장
 *   body: { config: PromotionConfig, baseUpdatedAt: string | null }
 *   - baseUpdatedAt이 현재 저장값의 updatedAt과 다르면 409 (다른 곳에서 먼저 저장됨)
 *   - 검증 실패 시 400 + errors
 *
 * 인증: X-Admin-Key 헤더 (admin/bookings·rates와 동일)
 * 이미 접수된 예약은 저장된 가격 snapshot을 쓰므로 영향 없음
 */

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getPromotionConfig, savePromotionConfig, PROMO_ROOM_IDS } from '@/lib/promotion-store';
import { Promotion, PromotionConfig, validatePromotionConfig } from '@/config/promotion-plan';

function getAdminPassword(): string {
  // Cloudflare Pages: env vars via getRequestContext().env
  try {
    const ctx = getRequestContext();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pw = (ctx.env as any).ADMIN_PASSWORD as string | undefined;
    if (pw) return pw;
  } catch {
    // local dev — fall through
  }
  // Fallback: process.env (next dev / .env.local)
  return process.env.ADMIN_PASSWORD || '';
}

function isAuthorized(request: NextRequest): boolean {
  const adminPassword = getAdminPassword();
  return !!adminPassword && request.headers.get('X-Admin-Key') === adminPassword;
}

const NO_STORE = { 'Cache-Control': 'no-store' };

/** 저장하는 필드만 골라 담는다 (임의 필드가 KV에 섞이지 않게) */
function pickPromotion(p: Promotion): Promotion {
  const l10n = (v: Promotion['title']) => ({ ko: v.ko.trim(), en: v.en.trim(), ja: v.ja.trim(), zh: v.zh.trim() });
  const list = (v: Promotion['details']) => ({
    ko: v.ko.map((s) => s.trim()).filter(Boolean),
    en: v.en.map((s) => s.trim()).filter(Boolean),
    ja: v.ja.map((s) => s.trim()).filter(Boolean),
    zh: v.zh.map((s) => s.trim()).filter(Boolean),
  });
  const b = p.benefit;
  const benefit: Promotion['benefit'] =
    b.kind === 'percent' ? { kind: 'percent', tiers: b.tiers.map((t) => ({ minNights: t.minNights, percent: t.percent })) }
    : b.kind === 'fixed' ? { kind: 'fixed', currency: b.currency, pricePerNight: b.pricePerNight, waiveExtraGuestFee: b.waiveExtraGuestFee }
    : { kind: 'info' };
  return {
    id: p.id,
    enabled: p.enabled,
    tab: p.tab,
    image: p.image,
    imageZoom: p.imageZoom,
    title: l10n(p.title),
    subtitle: l10n(p.subtitle),
    desc: l10n(p.desc),
    period: l10n(p.period),
    details: list(p.details),
    bookingNote: l10n(p.bookingNote),
    startDate: p.startDate,
    endDate: p.endDate,
    benefit,
    conditions: {
      minNights: p.conditions.minNights,
      minAdvanceDays: p.conditions.minAdvanceDays,
      roomIds: [...p.conditions.roomIds],
      reservationTypes: [...p.conditions.reservationTypes],
    },
    presets: { roomId: p.presets.roomId, reservationType: p.presets.reservationType },
    cta: { show: p.cta.show, showOnHome: p.cta.showOnHome, locale: p.cta.locale, label: l10n(p.cta.label) },
  };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const config = await getPromotionConfig();
    return NextResponse.json(
      { success: true, config, saved: config.updatedAt !== null },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error('[admin/promotions] GET 실패:', error);
    return NextResponse.json({ success: false, error: '프로모션 설정을 불러오지 못했습니다.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: { config?: unknown; baseUpdatedAt?: string | null };
  try {
    body = await request.json();
  } catch (e) {
    console.warn('[admin/promotions] 요청 본문 JSON 파싱 실패:', e instanceof Error ? e.message : String(e));
    return NextResponse.json({ success: false, error: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const errors = validatePromotionConfig(body.config, PROMO_ROOM_IDS);
  if (errors.length > 0) {
    console.warn(`[admin/promotions] 검증 실패 ${errors.length}건: ${errors.slice(0, 3).join(' / ')}`);
    return NextResponse.json({ success: false, error: '입력값을 확인해 주세요.', errors }, { status: 400 });
  }

  try {
    const current = await getPromotionConfig();
    if ((body.baseUpdatedAt ?? null) !== current.updatedAt) {
      console.warn(`[admin/promotions] 저장 충돌: 기준 ${body.baseUpdatedAt} / 현재 ${current.updatedAt}`);
      return NextResponse.json(
        { success: false, code: 'conflict', error: '다른 곳에서 프로모션이 먼저 저장되었습니다. 새로고침 후 다시 수정해 주세요.' },
        { status: 409 }
      );
    }

    const input = body.config as PromotionConfig;
    const saved = await savePromotionConfig({ promotions: input.promotions.map(pickPromotion), updatedAt: null });
    return NextResponse.json({ success: true, config: saved }, { headers: NO_STORE });
  } catch (error) {
    console.error('[admin/promotions] PUT 실패:', error);
    return NextResponse.json({ success: false, error: '프로모션 설정을 저장하지 못했습니다.' }, { status: 500 });
  }
}
