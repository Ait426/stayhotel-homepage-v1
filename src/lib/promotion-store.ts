/**
 * 프로모션 설정 저장소 — Cloudflare KV (키: promotions:config)
 *
 * admin '프로모션 관리'에서 저장한 프로모션 목록을 읽고 쓴다.
 * 저장값이 없거나 깨져 있으면 config/events.ts 기존 4개로 만든 기본 설정을 쓴다.
 * KV·메모리 폴백은 booking-store의 getStore()를 공유한다 (rate-store와 같은 방식).
 */

import { getStore } from '@/lib/booking-store';
import { rooms } from '@/config/rooms';
import { PromotionConfig, buildDefaultPromotionConfig, validatePromotionConfig } from '@/config/promotion-plan';

const PROMOTION_CONFIG_KEY = 'promotions:config';

export const PROMO_ROOM_IDS = rooms.map((r) => r.id);

let defaultConfig: PromotionConfig | null = null;
const getDefault = (): PromotionConfig => {
  if (!defaultConfig) defaultConfig = buildDefaultPromotionConfig();
  return defaultConfig;
};

/**
 * 현재 프로모션 설정 조회
 */
export async function getPromotionConfig(): Promise<PromotionConfig> {
  try {
    const raw = await getStore().get(PROMOTION_CONFIG_KEY);
    if (!raw) return getDefault();

    const parsed = JSON.parse(raw) as PromotionConfig;
    const errors = validatePromotionConfig(parsed, PROMO_ROOM_IDS);
    if (errors.length > 0) {
      console.error(`[promotion-store] 저장된 프로모션 설정이 유효하지 않아 기본 설정을 사용합니다: ${errors.slice(0, 5).join(' / ')}`);
      return getDefault();
    }
    return parsed;
  } catch (e) {
    console.error(`[promotion-store] 프로모션 설정 조회 실패 — 기본 설정 사용: ${e instanceof Error ? e.message : String(e)}`);
    return getDefault();
  }
}

/**
 * 프로모션 설정 저장 (검증은 호출 전에 끝나 있어야 한다)
 */
export async function savePromotionConfig(config: PromotionConfig): Promise<PromotionConfig> {
  const saved: PromotionConfig = { ...config, updatedAt: new Date().toISOString() };
  await getStore().put(PROMOTION_CONFIG_KEY, JSON.stringify(saved));
  console.log(`[promotion-store] 프로모션 설정 저장: ${saved.promotions.length}개`);
  return saved;
}
