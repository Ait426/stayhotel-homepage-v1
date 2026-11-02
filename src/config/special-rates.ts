/**
 * 공휴일 · 요일 자동 규칙
 *
 * 요금은 '그날 밤 숙박'을 기준으로 정한다. '쉬는 날'은 토·일·공휴일이다.
 *
 * 1) 그날도 쉬고 다음 날도 쉬는 날 → 토요일 세트 (토요일, 샌드위치데이, 연휴 중간)
 * 2) 다음 날만 쉬는 날          → 금요일 세트 (금요일, 공휴일 전날)
 * 3) 그 외                      → 평일 세트
 *
 * 이 규칙은 날짜 지정이 없는 날의 기본값이다. 12/24·12/31 같은 특수일은
 * admin '요금 관리'의 날짜별 세트 지정으로 관리한다 (config/rate-plan.ts).
 */

/** 기본 설정의 12/24·12/31 할증 (토요일 요금에 더하는 금액, KRW) */
export const SPECIAL_DATE_SURCHARGE = 20000;

/** 기본 설정에 미리 넣어 둘 연도 — 이후 연도는 admin 달력에서 지정한다 */
export const DEFAULT_SPECIAL_DATE_YEARS = [2026, 2027];

/** 기본 설정의 특수일 (MM-DD). KV에 저장된 설정이 있으면 쓰이지 않는다 */
export const FIXED_SPECIAL_DATES: Record<string, { base: 'saturday'; surcharge: number }> = {
  '12-24': { base: 'saturday', surcharge: SPECIAL_DATE_SURCHARGE },
  '12-31': { base: 'saturday', surcharge: SPECIAL_DATE_SURCHARGE },
  '12-25': { base: 'saturday', surcharge: 0 },
};

/**
 * 관공서 공휴일 (대체공휴일 포함, 토·일과 겹치는 날도 그대로 적는다)
 *
 * 출처: 우주항공청 「2027년 월력요항」 (노동절·제헌절 관공서 공휴일 지정 반영)
 * 매년 6월경 다음 해 월력요항이 발표되면 그 해 날짜를 추가하고 HOLIDAYS_COVERED_UNTIL을 갱신한다.
 */
export const PUBLIC_HOLIDAYS: string[] = [
  // 2026 (잔여분)
  '2026-12-25', // 성탄절
  // 2027
  '2027-01-01', // 신정
  '2027-02-06', '2027-02-07', '2027-02-08', // 설 연휴
  '2027-02-09', // 설 대체공휴일
  '2027-03-01', // 삼일절
  '2027-05-01', // 노동절
  '2027-05-03', // 노동절 대체공휴일
  '2027-05-05', // 어린이날
  '2027-05-13', // 부처님오신날
  '2027-06-06', // 현충일
  '2027-07-17', // 제헌절
  '2027-07-19', // 제헌절 대체공휴일
  '2027-08-15', // 광복절
  '2027-08-16', // 광복절 대체공휴일
  '2027-09-14', '2027-09-15', '2027-09-16', // 추석 연휴
  '2027-10-03', // 개천절
  '2027-10-04', // 개천절 대체공휴일
  '2027-10-09', // 한글날
  '2027-10-11', // 한글날 대체공휴일
  '2027-12-25', // 성탄절
  '2027-12-27', // 성탄절 대체공휴일
];

/** 공휴일 목록이 유효한 마지막 날짜. 이후 날짜는 주말·고정 특수일만 반영된다. */
export const HOLIDAYS_COVERED_UNTIL = '2027-12-31';

const holidaySet = new Set(PUBLIC_HOLIDAYS);

/** 로컬 날짜 기준 YYYY-MM-DD (toISOString은 시간대에 따라 하루 밀릴 수 있어 쓰지 않는다) */
export const toDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

let coverageWarned = false;

/** 쉬는 날 여부 (토·일·공휴일) */
export const isDayOff = (date: Date): boolean => {
  const day = date.getDay();
  if (day === 0 || day === 6) return true;

  const key = toDateKey(date);
  if (key > HOLIDAYS_COVERED_UNTIL && !coverageWarned) {
    coverageWarned = true;
    console.warn(`[special-rates] ${key}은 공휴일 목록 범위(${HOLIDAYS_COVERED_UNTIL}) 밖입니다. 다음 해 공휴일을 추가해야 합니다.`);
  }
  return holidaySet.has(key);
};

export type DayRateType = 'weekday' | 'friday' | 'saturday';

/**
 * 해당 날짜(그날 밤 숙박)의 자동 요금 유형 (날짜 지정은 rate-plan.ts에서 먼저 반영)
 */
export const getDayRate = (date: Date): { type: DayRateType; surcharge: number } => {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  const tomorrowOff = isDayOff(next);

  if (tomorrowOff && isDayOff(date)) return { type: 'saturday', surcharge: 0 };
  if (tomorrowOff) return { type: 'friday', surcharge: 0 };
  return { type: 'weekday', surcharge: 0 };
};
