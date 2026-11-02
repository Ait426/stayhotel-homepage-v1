/**
 * 요금 설정 저장소 — Cloudflare KV (키: rates:config)
 *
 * admin '요금 관리'에서 저장한 요금세트·날짜 지정을 읽고 쓴다.
 * 저장된 값이 없거나 깨져 있으면 rooms.ts 기본 요금으로 만든 기본 설정을 쓴다 (판매가 끊기지 않게).
 * KV·메모리 폴백은 booking-store의 getStore()를 공유한다.
 */

import { getStore } from '@/lib/booking-store';
import { rooms, getDefaultRateConfig } from '@/config/rooms';
import { RateConfig, validateRateConfig } from '@/config/rate-plan';

const RATE_CONFIG_KEY = 'rates:config';

export const ROOM_IDS = rooms.map((r) => r.id);

/**
 * 현재 요금 설정 조회
 */
export async function getRateConfig(): Promise<RateConfig> {
  try {
    const raw = await getStore().get(RATE_CONFIG_KEY);
    if (!raw) return getDefaultRateConfig();

    const parsed = JSON.parse(raw) as RateConfig;
    const errors = validateRateConfig(parsed, ROOM_IDS);
    if (errors.length > 0) {
      // 객실 추가 등으로 저장값이 현재 코드와 맞지 않는 경우 — 기본값으로 판매는 유지하고 원인을 남긴다
      console.error(`[rate-store] 저장된 요금 설정이 유효하지 않아 기본 요금을 사용합니다: ${errors.slice(0, 5).join(' / ')}`);
      return getDefaultRateConfig();
    }
    return parsed;
  } catch (e) {
    console.error(`[rate-store] 요금 설정 조회 실패 — 기본 요금 사용: ${e instanceof Error ? e.message : String(e)}`);
    return getDefaultRateConfig();
  }
}

/**
 * 요금 설정 저장 (검증은 호출 전에 끝나 있어야 한다)
 */
export async function saveRateConfig(config: RateConfig): Promise<RateConfig> {
  const saved: RateConfig = { ...config, updatedAt: new Date().toISOString() };
  await getStore().put(RATE_CONFIG_KEY, JSON.stringify(saved));
  console.log(`[rate-store] 요금 설정 저장: 세트 ${saved.sets.length}개, 날짜 지정 ${Object.keys(saved.overrides).length}건`);
  return saved;
}
