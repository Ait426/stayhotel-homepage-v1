/**
 * Admin Rates API — 요금세트·날짜별 세트 지정 관리
 *
 * GET /api/admin/rates  — 현재 요금 설정 (저장값이 없으면 기본 설정, saved:false)
 * PUT /api/admin/rates  — 설정 저장
 *   body: { config: RateConfig, baseUpdatedAt: string | null }
 *   - baseUpdatedAt이 현재 저장값의 updatedAt과 다르면 409 (다른 곳에서 먼저 저장됨)
 *   - 검증 실패 시 400 + errors
 *
 * 인증: X-Admin-Key 헤더 (admin/bookings와 동일)
 * 이미 접수된 예약은 저장된 가격 snapshot을 쓰므로 영향 없음
 */

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getRateConfig, saveRateConfig, ROOM_IDS } from '@/lib/rate-store';
import { RateConfig, validateRateConfig } from '@/config/rate-plan';

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

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const config = await getRateConfig();
    return NextResponse.json(
      { success: true, config, saved: config.updatedAt !== null },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error('[admin/rates] GET 실패:', error);
    return NextResponse.json({ success: false, error: '요금 설정을 불러오지 못했습니다.' }, { status: 500 });
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
    console.warn('[admin/rates] 요청 본문 JSON 파싱 실패:', e instanceof Error ? e.message : String(e));
    return NextResponse.json({ success: false, error: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const errors = validateRateConfig(body.config, ROOM_IDS);
  if (errors.length > 0) {
    console.warn(`[admin/rates] 검증 실패 ${errors.length}건: ${errors.slice(0, 3).join(' / ')}`);
    return NextResponse.json({ success: false, error: '입력값을 확인해 주세요.', errors }, { status: 400 });
  }

  try {
    const current = await getRateConfig();
    if ((body.baseUpdatedAt ?? null) !== current.updatedAt) {
      console.warn(`[admin/rates] 저장 충돌: 기준 ${body.baseUpdatedAt} / 현재 ${current.updatedAt}`);
      return NextResponse.json(
        { success: false, code: 'conflict', error: '다른 곳에서 요금이 먼저 저장되었습니다. 새로고침 후 다시 수정해 주세요.' },
        { status: 409 }
      );
    }

    const input = body.config as RateConfig;
    // 저장하는 필드만 골라 담는다 (임의 필드가 KV에 섞이지 않게)
    const saved = await saveRateConfig({
      sets: input.sets.map((s) => ({ id: s.id, name: s.name.trim(), builtin: s.builtin, prices: s.prices })),
      overrides: input.overrides,
      updatedAt: null,
    });
    return NextResponse.json({ success: true, config: saved }, { headers: NO_STORE });
  } catch (error) {
    console.error('[admin/rates] PUT 실패:', error);
    return NextResponse.json({ success: false, error: '요금 설정을 저장하지 못했습니다.' }, { status: 500 });
  }
}
