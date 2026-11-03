/**
 * 프로모션 설정 · 적용 규칙 (admin '프로모션 관리')
 *
 * - 프로모션 문구·이미지·기간·할인 조건은 KV(promotions:config)에 저장한다 (lib/promotion-store.ts).
 *   KV가 비어 있으면 config/events.ts의 기존 4개로 만든 기본 설정을 쓴다.
 * - 한 예약에는 프로모션 1개만 적용된다 (예약 링크 ?promo=<id>).
 * - evaluatePromotion은 예약 폼(표시)과 서버(booking-request, 최종 금액)가 같이 쓴다.
 *   서버는 고객이 보낸 프로모션 값을 믿지 않고 이 함수로 다시 판정한다.
 * - 이 파일은 KV를 모르는 순수 함수만 둔다.
 */

import { Locale, ReservationType } from '@/types';
import { offers, MILITARY_FIXED_RATE_USD } from '@/config/events';

export type L10n = Record<Locale, string>;
export type L10nList = Record<Locale, string[]>;

export type PromoBenefit =
  | { kind: 'info' }
  | { kind: 'percent'; tiers: { minNights: number; percent: number }[] }
  | { kind: 'fixed'; currency: 'KRW' | 'USD'; pricePerNight: number; waiveExtraGuestFee: boolean };

export interface Promotion {
  /** 예약 링크 ?promo=<id> */
  id: string;
  enabled: boolean;
  tab: 'room' | 'event';
  image: string;
  /** 이미지 확대 표시 (여백이 많은 이미지용) */
  imageZoom: boolean;
  title: L10n;
  subtitle: L10n;
  desc: L10n;
  period: L10n;
  details: L10nList;
  /** 예약 폼에서 프로모션이 적용됐을 때 보이는 안내 */
  bookingNote: L10n;
  /** 판매 기간 (예약하는 날, 한국 시간 기준). null이면 제한 없음 */
  startDate: string | null;
  endDate: string | null;
  benefit: PromoBenefit;
  conditions: {
    minNights: number;
    /** 체크인 며칠 전까지 예약해야 하는지 (0 = 제한 없음) */
    minAdvanceDays: number;
    /** 빈 배열 = 전 객실 */
    roomIds: string[];
    /** 빈 배열 = 전 예약 유형 */
    reservationTypes: ReservationType[];
  };
  /** 예약 폼 기본값 */
  presets: { roomId: string | null; reservationType: ReservationType | null };
  cta: {
    /** 상세 모달에 '이 혜택으로 예약하기' 버튼 */
    show: boolean;
    /** 홈 카드에도 CTA 문구 노출 */
    showOnHome: boolean;
    /** 예약 링크를 특정 언어 페이지로 고정 (미군 특가 = en) */
    locale: Locale | null;
    /** 비우면 기본 문구 */
    label: L10n;
  };
}

export interface PromotionConfig {
  /** 배열 순서 = 노출 순서 */
  promotions: Promotion[];
  updatedAt: string | null;
}

/** admin에서 고를 수 있는 이미지 — 새 이미지는 public/images/events에 추가하고 여기에 등록 */
export const PROMO_IMAGES = [
  '/images/events/early-bird.jpg',
  '/images/events/booking-benefits.png',
  '/images/events/military-special.png',
  '/images/events/corporate-benefits.png',
];

export const LOCALES: Locale[] = ['ko', 'en', 'ja', 'zh'];
export const RESERVATION_TYPES: ReservationType[] = ['general', 'corporate', 'military'];
export const MAX_PROMOTIONS = 30;
const PROMO_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,29}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const emptyL10n = (): L10n => ({ ko: '', en: '', ja: '', zh: '' });
export const emptyL10nList = (): L10nList => ({ ko: [], en: [], ja: [], zh: [] });

/** 해당 언어 문구 — 비어 있으면 한국어 */
export const pickL10n = (v: L10n, locale: Locale): string => (v[locale] || '').trim() || v.ko;
export const pickL10nList = (v: L10nList, locale: Locale): string[] =>
  (v[locale] && v[locale].length > 0 ? v[locale] : v.ko);

/** 한국 시간 기준 오늘 (YYYY-MM-DD) — 서버(UTC)와 브라우저 어디서든 같은 날짜 */
export const getKstToday = (now: Date = new Date()): string =>
  new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

const daysBetween = (from: string, to: string): number =>
  Math.round((Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10)) - Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10))) / 86400000);

export type PromoStatus = 'live' | 'scheduled' | 'ended' | 'disabled';

export function getPromotionStatus(p: Promotion, today: string): PromoStatus {
  if (!p.enabled) return 'disabled';
  if (p.startDate && today < p.startDate) return 'scheduled';
  if (p.endDate && today > p.endDate) return 'ended';
  return 'live';
}

export const isPromotionLive = (p: Promotion, today: string) => getPromotionStatus(p, today) === 'live';

// ============================================
// 적용 판정
// ============================================

export interface PromoContext {
  checkIn: string;
  nights: number;
  roomId: string;
  reservationType: ReservationType;
  /** 객실 요금 합계 (요금 관리 기준) */
  roomTotal: number;
  /** 추가 인원 요금 합계 */
  extraGuestFee: number;
  today: string;
}

export type PromoRejectReason = 'disabled' | 'not_started' | 'ended' | 'min_nights' | 'advance' | 'room' | 'reservation_type';

export type PromoResult =
  | {
      ok: true;
      finalAmount: number;
      discountAmount: number;
      currency: 'KRW' | 'USD';
      /** 적용된 % (percent형) */
      percent: number | null;
      /** 고정가 1박 금액 (fixed형) */
      pricePerNight: number | null;
      extraGuestFeeWaived: boolean;
    }
  | { ok: false; reason: PromoRejectReason; required: number | null };

/** percent형에서 할인이 시작되는 최소 박수 */
const percentMinNights = (b: PromoBenefit) =>
  b.kind === 'percent' && b.tiers.length > 0 ? Math.min(...b.tiers.map((t) => t.minNights)) : 0;

export function evaluatePromotion(p: Promotion, ctx: PromoContext): PromoResult {
  const status = getPromotionStatus(p, ctx.today);
  if (status === 'disabled') return { ok: false, reason: 'disabled', required: null };
  if (status === 'scheduled') return { ok: false, reason: 'not_started', required: null };
  if (status === 'ended') return { ok: false, reason: 'ended', required: null };

  const c = p.conditions;
  if (c.roomIds.length > 0 && !c.roomIds.includes(ctx.roomId)) return { ok: false, reason: 'room', required: null };
  if (c.reservationTypes.length > 0 && !c.reservationTypes.includes(ctx.reservationType)) return { ok: false, reason: 'reservation_type', required: null };
  const minNights = Math.max(c.minNights, percentMinNights(p.benefit));
  if (ctx.nights < minNights) return { ok: false, reason: 'min_nights', required: minNights };
  if (c.minAdvanceDays > 0 && daysBetween(ctx.today, ctx.checkIn) < c.minAdvanceDays) {
    return { ok: false, reason: 'advance', required: c.minAdvanceDays };
  }

  const subtotal = ctx.roomTotal + ctx.extraGuestFee;
  const b = p.benefit;

  if (b.kind === 'percent') {
    const tier = [...b.tiers].sort((a, z) => z.minNights - a.minNights).find((t) => ctx.nights >= t.minNights)!;
    // 기존 연박 할인과 같은 방식: 최종 금액을 내림, 할인액 = 차액
    const finalAmount = Math.floor(subtotal * (1 - tier.percent / 100));
    return { ok: true, finalAmount, discountAmount: subtotal - finalAmount, currency: 'KRW', percent: tier.percent, pricePerNight: null, extraGuestFeeWaived: false };
  }

  if (b.kind === 'fixed') {
    const waived = b.currency === 'USD' || b.waiveExtraGuestFee;
    const finalAmount = ctx.nights * b.pricePerNight + (waived ? 0 : ctx.extraGuestFee);
    const discountAmount = b.currency === 'KRW' ? Math.max(0, subtotal - finalAmount) : 0;
    return { ok: true, finalAmount, discountAmount, currency: b.currency, percent: null, pricePerNight: b.pricePerNight, extraGuestFeeWaived: waived };
  }

  return { ok: true, finalAmount: subtotal, discountAmount: 0, currency: 'KRW', percent: null, pricePerNight: null, extraGuestFeeWaived: false };
}

/** 적용 불가 사유 문구 (예약 폼 표시용) */
export function promoRejectText(reason: PromoRejectReason, required: number | null, locale: Locale): string {
  const n = required ?? 0;
  const texts: Record<PromoRejectReason, L10n> = {
    disabled: { ko: '현재 진행하지 않는 프로모션입니다. 정상 요금으로 예약됩니다.', en: 'This promotion is not currently available. Standard rates apply.', ja: '現在実施していないプロモーションです。通常料金で予約されます。', zh: '该促销目前不可用，将按标准价格预订。' },
    not_started: { ko: '아직 시작되지 않은 프로모션입니다. 정상 요금으로 예약됩니다.', en: 'This promotion has not started yet. Standard rates apply.', ja: 'まだ開始していないプロモーションです。通常料金で予約されます。', zh: '该促销尚未开始，将按标准价格预订。' },
    ended: { ko: '종료된 프로모션입니다. 정상 요금으로 예약됩니다.', en: 'This promotion has ended. Standard rates apply.', ja: '終了したプロモーションです。通常料金で予約されます。', zh: '该促销已结束，将按标准价格预订。' },
    min_nights: { ko: `${n}박 이상 예약 시에만 적용됩니다.`, en: `Requires a minimum of ${n} nights.`, ja: `${n}泊以上のご予約にのみ適用されます。`, zh: `仅适用于${n}晚以上的预订。` },
    advance: { ko: `체크인 ${n}일 전까지 예약 시에만 적용됩니다.`, en: `Must be booked at least ${n} days before check-in.`, ja: `チェックイン${n}日前までのご予約にのみ適用されます。`, zh: `须在入住前${n}天以上预订。` },
    room: { ko: '선택하신 객실에는 적용되지 않는 프로모션입니다.', en: 'This promotion does not apply to the selected room.', ja: '選択された客室には適用されないプロモーションです。', zh: '该促销不适用于所选房型。' },
    reservation_type: { ko: '선택하신 예약 유형에는 적용되지 않는 프로모션입니다.', en: 'This promotion does not apply to the selected reservation type.', ja: '選択された予約タイプには適用されないプロモーションです。', zh: '该促销不适用于所选预订类型。' },
  };
  return texts[reason][locale];
}

// ============================================
// 예약 기록의 프로모션 표시 (메일·admin·확정 화면 공용)
// ============================================

/** snapshot 도입 전 예약의 프로모션 값 */
const LEGACY_PROMO_LABELS: Record<string, { ko: string; en: string }> = {
  longstay_10: { ko: '연박 10% 할인', en: '10% Long-Stay Discount' },
  longstay_15: { ko: '연박 15% 할인', en: '15% Long-Stay Discount' },
  military_fixed: { ko: 'US Military Special', en: 'US Military Special' },
};

interface PromoRecordLike {
  appliedPromo?: string | null;
  pricing?: { currency?: 'KRW' | 'USD'; promoLabel?: string; promoLabelEn?: string } | null;
}

/** USD 금액인 예약인지 (미군 특가 등) */
export const isUsdBooking = (b: PromoRecordLike): boolean =>
  b.pricing?.currency === 'USD' || b.appliedPromo === 'military_fixed';

/** 예약에 적용된 프로모션 이름 (없으면 null) */
export function getBookingPromoLabel(b: PromoRecordLike, lang: 'ko' | 'en'): string | null {
  if (!b.appliedPromo) return null;
  const fromSnapshot = lang === 'ko' ? b.pricing?.promoLabel : b.pricing?.promoLabelEn;
  if (fromSnapshot) return fromSnapshot;
  return LEGACY_PROMO_LABELS[b.appliedPromo]?.[lang] || b.appliedPromo;
}

// ============================================
// 기본 설정 (KV가 비어 있을 때) — 기존 events.ts 4개 그대로
// ============================================

const DEFAULT_IDS: Record<number, string> = { 1: 'longstay', 2: 'booking-benefits', 4: 'military', 5: 'corporate' };

export function buildDefaultPromotionConfig(): PromotionConfig {
  const promotions: Promotion[] = offers.map((o) => {
    const id = DEFAULT_IDS[o.id] || `promo-${o.id}`;
    const base: Promotion = {
      id,
      enabled: true,
      tab: o.type === 'room' ? 'room' : 'event',
      image: o.image,
      imageZoom: o.id === 5,
      title: { ...o.title },
      subtitle: { ...o.subtitle },
      desc: { ...o.desc },
      period: { ...o.period },
      details: { ko: [...o.details.ko], en: [...o.details.en], ja: [...o.details.ja], zh: [...o.details.zh] },
      bookingNote: emptyL10n(),
      startDate: null,
      endDate: null,
      benefit: { kind: 'info' },
      conditions: { minNights: 0, minAdvanceDays: 0, roomIds: [], reservationTypes: [] },
      presets: { roomId: null, reservationType: null },
      cta: { show: false, showOnHome: false, locale: null, label: emptyL10n() },
    };

    if (id === 'longstay') {
      base.benefit = { kind: 'percent', tiers: [{ minNights: 2, percent: 10 }, { minNights: 7, percent: 15 }] };
      // 미군 예약 유형은 연박 할인 불가 (기존 동작)
      base.conditions.reservationTypes = ['general', 'corporate'];
      base.cta = { show: true, showOnHome: !!o.showHomeCta, locale: null, label: emptyL10n() };
    }
    if (id === 'military') {
      base.benefit = { kind: 'fixed', currency: 'USD', pricePerNight: MILITARY_FIXED_RATE_USD, waiveExtraGuestFee: true };
      // 스탠다드로 예약 → 현장에서 디럭스 업그레이드. 군인 예약 유형만
      base.conditions.roomIds = ['standard'];
      base.conditions.reservationTypes = ['military'];
      base.presets = { roomId: 'standard', reservationType: 'military' };
      base.bookingNote = {
        ko: `$${MILITARY_FIXED_RATE_USD} 고정 요금 적용 (주말 할증 없음) · 디럭스 무료 업그레이드 · 1인 조식 포함`,
        en: `Flat $${MILITARY_FIXED_RATE_USD}/night (No weekend surcharge) · Free Deluxe upgrade · Breakfast for 1 included`,
        ja: `$${MILITARY_FIXED_RATE_USD}固定料金適用（週末割増なし）· デラックス無料UP · 朝食1名付`,
        zh: `$${MILITARY_FIXED_RATE_USD}固定价格（无周末加价）· 免费升级豪华房 · 含1人早餐`,
      };
      const label = 'US Military Special — Book Now';
      base.cta = { show: true, showOnHome: !!o.showHomeCta, locale: 'en', label: { ko: label, en: label, ja: label, zh: label } };
    }
    return base;
  });
  return { promotions, updatedAt: null };
}

// ============================================
// 공개 화면용 (서버에서 언어별로 풀어서 클라이언트에 넘김)
// ============================================

export interface PublicPromotion {
  id: string;
  tab: 'room' | 'event';
  image: string;
  imageZoom: boolean;
  title: string;
  subtitle: string;
  desc: string;
  period: string;
  details: string[];
  ctaHref: string | null;
  ctaLabel: string | null;
  showHomeCta: boolean;
}

const DEFAULT_CTA_LABEL: L10n = { ko: '이 혜택으로 예약하기', en: 'Book with this offer', ja: 'この特典で予約する', zh: '以此优惠预订' };

export function toPublicPromotions(config: PromotionConfig, locale: Locale, today: string): PublicPromotion[] {
  return config.promotions
    .filter((p) => isPromotionLive(p, today))
    .map((p) => ({
      id: p.id,
      tab: p.tab,
      image: p.image,
      imageZoom: p.imageZoom,
      title: pickL10n(p.title, locale),
      subtitle: pickL10n(p.subtitle, locale),
      desc: pickL10n(p.desc, locale),
      period: pickL10n(p.period, locale),
      details: pickL10nList(p.details, locale),
      ctaHref: p.cta.show ? `/${p.cta.locale || locale}/booking?promo=${p.id}` : null,
      ctaLabel: p.cta.show ? (pickL10n(p.cta.label, locale) || DEFAULT_CTA_LABEL[locale]) : null,
      showHomeCta: p.cta.show && p.cta.showOnHome,
    }));
}

// ============================================
// 저장 전 검증
// ============================================

export function validatePromotionConfig(input: unknown, roomIds: string[]): string[] {
  const errors: string[] = [];
  if (!input || typeof input !== 'object') return ['설정 형식이 올바르지 않습니다.'];
  const config = input as Partial<PromotionConfig>;
  if (!Array.isArray(config.promotions)) return ['프로모션 목록이 없습니다.'];
  if (config.promotions.length > MAX_PROMOTIONS) errors.push(`프로모션은 최대 ${MAX_PROMOTIONS}개까지 만들 수 있습니다.`);

  const isL10n = (v: unknown) => !!v && typeof v === 'object' && LOCALES.every((l) => typeof (v as L10n)[l] === 'string' && (v as L10n)[l].length <= 300);
  const isL10nList = (v: unknown) => !!v && typeof v === 'object' && LOCALES.every((l) => Array.isArray((v as L10nList)[l]) && (v as L10nList)[l].length <= 30 && (v as L10nList)[l].every((s) => typeof s === 'string' && s.length <= 300));
  const isDate = (v: unknown) => v === null || (typeof v === 'string' && DATE_PATTERN.test(v) && !Number.isNaN(new Date(`${v}T00:00:00`).getTime()));
  const isInt = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

  const ids = new Set<string>();
  for (const p of config.promotions) {
    if (!p || typeof p !== 'object') { errors.push('프로모션 형식이 올바르지 않습니다.'); continue; }
    const name = (p.title && typeof p.title.ko === 'string' && p.title.ko) || p.id || '(이름 없음)';
    const err = (m: string) => errors.push(`[${name}] ${m}`);

    if (typeof p.id !== 'string' || !PROMO_ID_PATTERN.test(p.id)) err('코드는 영문 소문자·숫자·하이픈 2~30자여야 합니다.');
    if (ids.has(p.id)) err(`코드 "${p.id}"가 중복됩니다.`);
    ids.add(p.id);
    if (typeof p.enabled !== 'boolean' || typeof p.imageZoom !== 'boolean') err('켜기/이미지 확대 값이 올바르지 않습니다.');
    if (p.tab !== 'room' && p.tab !== 'event') err('분류(객실/이벤트)가 올바르지 않습니다.');
    if (!PROMO_IMAGES.includes(p.image)) err('이미지는 목록에서 골라야 합니다.');
    for (const key of ['title', 'subtitle', 'desc', 'period', 'bookingNote'] as const) {
      if (!isL10n(p[key])) err(`${key} 문구 형식이 올바르지 않습니다 (최대 300자).`);
    }
    if (!isL10n(p.title) || !p.title.ko.trim()) err('한국어 제목은 필수입니다.');
    if (!isL10nList(p.details)) err('상세 항목 형식이 올바르지 않습니다 (언어별 최대 30줄).');
    if (!isDate(p.startDate) || !isDate(p.endDate)) err('기간 날짜 형식이 올바르지 않습니다.');
    else if (p.startDate && p.endDate && p.startDate > p.endDate) err('종료일이 시작일보다 빠릅니다.');

    const b = p.benefit as PromoBenefit | undefined;
    if (!b || typeof b !== 'object') err('혜택 종류가 없습니다.');
    else if (b.kind === 'percent') {
      if (!Array.isArray(b.tiers) || b.tiers.length === 0 || b.tiers.length > 5) err('% 할인 구간은 1~5개여야 합니다.');
      else {
        for (const t of b.tiers) {
          if (!isInt(t?.minNights, 1, 60) || !isInt(t?.percent, 1, 90)) err('% 할인 구간은 박수 1~60, 할인율 1~90% 정수여야 합니다.');
        }
        if (new Set(b.tiers.map((t) => t.minNights)).size !== b.tiers.length) err('% 할인 구간의 박수가 중복됩니다.');
      }
    } else if (b.kind === 'fixed') {
      if (b.currency !== 'KRW' && b.currency !== 'USD') err('고정가 통화가 올바르지 않습니다.');
      const max = b.currency === 'USD' ? 10_000 : 10_000_000;
      if (!isInt(b.pricePerNight, 1, max)) err(`1박 고정가는 1 ~ ${max.toLocaleString('ko-KR')} 정수여야 합니다.`);
      if (typeof b.waiveExtraGuestFee !== 'boolean') err('추가 인원 요금 면제 값이 올바르지 않습니다.');
      if (b.currency === 'USD' && b.waiveExtraGuestFee !== true) err('USD 고정가는 추가 인원 요금(원화)을 면제해야 합니다.');
    } else if (b.kind !== 'info') err('혜택 종류가 올바르지 않습니다.');

    const c = p.conditions;
    if (!c || typeof c !== 'object') err('적용 조건이 없습니다.');
    else {
      if (!isInt(c.minNights, 0, 60)) err('최소 박수는 0~60이어야 합니다.');
      if (!isInt(c.minAdvanceDays, 0, 365)) err('사전 예약 일수는 0~365여야 합니다.');
      if (!Array.isArray(c.roomIds) || c.roomIds.some((r) => !roomIds.includes(r))) err('적용 객실에 없는 객실이 있습니다.');
      if (!Array.isArray(c.reservationTypes) || c.reservationTypes.some((r) => !RESERVATION_TYPES.includes(r))) err('예약 유형 값이 올바르지 않습니다.');
    }
    const ps = p.presets;
    if (!ps || typeof ps !== 'object') err('예약 폼 기본값이 없습니다.');
    else {
      if (ps.roomId !== null && !roomIds.includes(ps.roomId)) err('예약 폼 기본 객실이 없는 객실입니다.');
      if (ps.reservationType !== null && !RESERVATION_TYPES.includes(ps.reservationType)) err('예약 폼 기본 예약 유형이 올바르지 않습니다.');
    }
    const cta = p.cta;
    if (!cta || typeof cta !== 'object' || typeof cta.show !== 'boolean' || typeof cta.showOnHome !== 'boolean' || !isL10n(cta.label)) err('예약 버튼 설정이 올바르지 않습니다.');
    else if (cta.locale !== null && !LOCALES.includes(cta.locale)) err('예약 버튼 언어가 올바르지 않습니다.');
  }
  return errors;
}
