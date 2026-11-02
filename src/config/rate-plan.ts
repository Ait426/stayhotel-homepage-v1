/**
 * 요금세트 · 날짜별 세트 지정 (Wings CMS 방식)
 *
 * - 요금세트: 세트마다 객실별 1박 가격. WEEK·FRI·SAT는 기본 세트(삭제 불가), 그 외는 특수 세트
 * - 날짜 지정(overrides): 특정 날짜에 쓸 세트를 지정. 지정이 없으면 자동 규칙
 *   (config/special-rates.ts getDayRate — 내일 쉬면 FRI, 오늘·내일 다 쉬면 SAT, 그 외 WEEK)
 *
 * 실제 값은 admin '요금 관리'에서 편집해 KV(rates:config)에 저장한다 (lib/rate-store.ts).
 * KV가 비어 있으면 rooms.ts의 기본 요금으로 만든 기본 설정을 쓴다.
 * 이 파일은 KV를 모르는 순수 함수만 둔다 — 클라이언트(예약 폼)와 서버가 같이 쓴다.
 */

import { Room } from '@/types';
import { getDayRate, toDateKey, FIXED_SPECIAL_DATES, DEFAULT_SPECIAL_DATE_YEARS } from '@/config/special-rates';

export type BuiltinSetId = 'WEEK' | 'FRI' | 'SAT';
export const BUILTIN_SET_IDS: BuiltinSetId[] = ['WEEK', 'FRI', 'SAT'];

export interface RateSet {
  id: string;
  name: string;
  builtin: boolean;
  /** roomId → 1박 가격 (KRW) */
  prices: Record<string, number>;
}

export interface RateConfig {
  sets: RateSet[];
  /** 'YYYY-MM-DD' → setId */
  overrides: Record<string, string>;
  /** 마지막 저장 시각 (ISO). 동시 수정 충돌 감지용. 기본 설정은 null */
  updatedAt: string | null;
}

/** 기본 설정의 특수 세트 id (12/24·12/31 = 토요일 + 할증) */
export const DEFAULT_SPECIAL_SET_ID = 'SPECIAL';

export const MAX_NIGHT_PRICE = 10_000_000;
export const MAX_SETS = 20;
const SET_ID_PATTERN = /^[A-Z0-9_]{1,20}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * rooms.ts의 기본 요금으로 기본 설정 생성 — KV가 비어 있을 때의 동작이 도입 전과 같도록 만든다
 */
export function buildRateConfigFromRooms(rooms: Room[]): RateConfig {
  const pick = (fn: (r: Room) => number) =>
    Object.fromEntries(rooms.map((r) => [r.id, fn(r)]));

  const surcharges = Array.from(new Set(Object.values(FIXED_SPECIAL_DATES).map((f) => f.surcharge).filter((s) => s > 0)));
  const surcharge = surcharges[0] ?? 0;

  const sets: RateSet[] = [
    { id: 'WEEK', name: '평일', builtin: true, prices: pick((r) => r.pricePerNight) },
    { id: 'FRI', name: '금요일', builtin: true, prices: pick((r) => r.fridayPrice) },
    { id: 'SAT', name: '토요일', builtin: true, prices: pick((r) => r.saturdayPrice) },
    { id: DEFAULT_SPECIAL_SET_ID, name: `특수일 (토+${surcharge.toLocaleString('ko-KR')})`, builtin: false, prices: pick((r) => r.saturdayPrice + surcharge) },
  ];

  const overrides: Record<string, string> = {};
  for (const year of DEFAULT_SPECIAL_DATE_YEARS) {
    for (const [mmdd, rule] of Object.entries(FIXED_SPECIAL_DATES)) {
      overrides[`${year}-${mmdd}`] = rule.surcharge > 0 ? DEFAULT_SPECIAL_SET_ID : 'SAT';
    }
  }

  return { sets, overrides, updatedAt: null };
}

/** 자동 규칙으로 정해지는 세트 */
export function getAutoSetId(date: Date): BuiltinSetId {
  const { type } = getDayRate(date);
  if (type === 'saturday') return 'SAT';
  if (type === 'friday') return 'FRI';
  return 'WEEK';
}

/** 해당 날짜(그날 밤 숙박)에 적용되는 세트 id — 날짜 지정 우선, 없으면 자동 규칙 */
export function resolveSetId(config: RateConfig, date: Date): string {
  const override = config.overrides[toDateKey(date)];
  if (override && config.sets.some((s) => s.id === override)) return override;
  return getAutoSetId(date);
}

/**
 * 세트의 객실 가격. 세트나 객실 가격이 없으면 rooms.ts의 같은 유형 요금으로 대체하고 로그를 남긴다.
 * (검증을 거친 설정에서는 일어나지 않아야 한다)
 */
export function getSetPrice(config: RateConfig, room: Room, setId: string): number {
  const set = config.sets.find((s) => s.id === setId);
  const price = set?.prices[room.id];
  if (typeof price === 'number' && price > 0) return price;

  console.error(`[rate-plan] 세트 ${setId}에 객실 ${room.id} 가격이 없어 기본 요금으로 대체합니다.`);
  if (setId === 'SAT') return room.saturdayPrice;
  if (setId === 'FRI') return room.fridayPrice;
  return room.pricePerNight;
}

/** 해당 날짜의 1박 요금 */
export function getNightPrice(config: RateConfig, room: Room, date: Date): number {
  return getSetPrice(config, room, resolveSetId(config, date));
}

/**
 * 저장 전 검증 — 오류 메시지 목록 (비어 있으면 통과)
 */
export function validateRateConfig(input: unknown, roomIds: string[]): string[] {
  const errors: string[] = [];
  if (!input || typeof input !== 'object') return ['설정 형식이 올바르지 않습니다.'];
  const config = input as Partial<RateConfig>;

  if (!Array.isArray(config.sets)) return ['요금세트 목록이 없습니다.'];
  if (config.sets.length > MAX_SETS) errors.push(`요금세트는 최대 ${MAX_SETS}개까지 만들 수 있습니다.`);

  const ids = new Set<string>();
  for (const set of config.sets) {
    if (!set || typeof set !== 'object') { errors.push('요금세트 형식이 올바르지 않습니다.'); continue; }
    const label = set.name || set.id;
    if (typeof set.id !== 'string' || !SET_ID_PATTERN.test(set.id)) errors.push(`세트 코드 "${set.id}"는 영문 대문자·숫자·_ 20자 이내여야 합니다.`);
    if (ids.has(set.id)) errors.push(`세트 코드 "${set.id}"가 중복됩니다.`);
    ids.add(set.id);
    if (typeof set.name !== 'string' || !set.name.trim() || set.name.length > 30) errors.push(`세트 "${set.id}"의 이름은 1~30자여야 합니다.`);
    if (typeof set.builtin !== 'boolean' || set.builtin !== BUILTIN_SET_IDS.includes(set.id as BuiltinSetId)) {
      errors.push(`세트 "${label}"의 기본 세트 여부가 올바르지 않습니다.`);
    }
    if (!set.prices || typeof set.prices !== 'object') { errors.push(`세트 "${label}"에 가격이 없습니다.`); continue; }
    for (const roomId of roomIds) {
      const p = set.prices[roomId];
      if (typeof p !== 'number' || !Number.isInteger(p) || p < 1 || p > MAX_NIGHT_PRICE) {
        errors.push(`세트 "${label}"의 ${roomId} 가격이 올바르지 않습니다 (1 ~ ${MAX_NIGHT_PRICE.toLocaleString('ko-KR')}원 정수).`);
      }
    }
    const unknownRooms = Object.keys(set.prices).filter((k) => !roomIds.includes(k));
    if (unknownRooms.length) errors.push(`세트 "${label}"에 없는 객실이 있습니다: ${unknownRooms.join(', ')}`);
  }

  for (const id of BUILTIN_SET_IDS) {
    if (!ids.has(id)) errors.push(`기본 세트 ${id}는 삭제할 수 없습니다.`);
  }

  if (!config.overrides || typeof config.overrides !== 'object' || Array.isArray(config.overrides)) {
    errors.push('날짜 지정 형식이 올바르지 않습니다.');
  } else {
    for (const [date, setId] of Object.entries(config.overrides)) {
      if (!DATE_PATTERN.test(date) || Number.isNaN(new Date(`${date}T00:00:00`).getTime())) errors.push(`날짜 "${date}" 형식이 올바르지 않습니다.`);
      if (typeof setId !== 'string' || !ids.has(setId)) errors.push(`${date}에 지정된 세트 "${setId}"가 없습니다.`);
    }
  }

  return errors;
}
