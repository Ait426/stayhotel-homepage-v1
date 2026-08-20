/**
 * Booking Store - Cloudflare KV Persistent Storage
 *
 * Uses Cloudflare KV binding (BOOKING_KV) for persistent booking data.
 * Falls back to in-memory Map for local development only.
 *
 * Cloudflare Pages setup required:
 * 1. Create KV namespace "stayhotel-bookings" in Cloudflare dashboard
 * 2. Bind it as "BOOKING_KV" in Pages → Settings → Functions → KV namespace bindings
 *
 * 보관 정책: 무기한 (put에 expirationTtl을 주지 않는다) — 아래 DATA RETENTION POLICY 참고
 */

import { getRequestContext } from '@cloudflare/next-on-pages';
import { BookingFormData } from '@/types';

/**
 * 서버에서 계산한 가격 snapshot — 이메일/admin 공통 기준
 */
export interface PricingSnapshot {
  baseAmount: number;         // 객실 요금 합계 (요일별 적용)
  extraGuestCount: number;    // 기준 초과 인원 수
  extraGuestFeeUnit: number;  // 1인/1박 추가요금 단가 (₩10,000)
  extraGuestFeeTotal: number; // 추가 인원 요금 합계
  discountAmount: number;     // 할인 금액 (프로모션)
  finalAmount: number;        // 최종 결제 금액
  nights: number;             // 숙박 일수
}

export interface StoredBooking {
  bookingId: string;
  token: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  formData: BookingFormData;
  createdAt: string;
  confirmedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  cancelledBy?: 'hotel' | 'customer' | 'admin';
  agreedAt: string; // ISO timestamp — legal proof of cancellation policy agreement
  appliedPromo?: 'longstay_10' | 'longstay_15' | 'military_fixed' | null;
  finalAmount?: number; // Discounted total (KRW) — source of truth for emails/admin
  pricing?: PricingSnapshot; // 서버 계산 가격 snapshot
}

/**
 * KV-compatible interface (subset of Cloudflare KVNamespace)
 */
interface KVLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  list(options?: { prefix?: string }): Promise<{ keys: { name: string }[] }>;
}

// In-memory fallback for local development (next dev)
// ⚠️ 이 Map은 이 모듈 하나만 소유한다. 다른 파일에서 같은 폴백을 재구현하면
//    서로 다른 Map을 보게 되어 로컬에서 조회가 항상 비어 보인다.
const memoryStore = new Map<string, string>();
const memoryFallback: KVLike = {
  async get(key: string) { return memoryStore.get(key) ?? null; },
  async put(key: string, value: string) { memoryStore.set(key, value); },
  async list(options?: { prefix?: string }) {
    const prefix = options?.prefix;
    const keys = Array.from(memoryStore.keys())
      .filter((k) => !prefix || k.startsWith(prefix))
      .map((name) => ({ name }));
    return { keys };
  },
};

// DATA RETENTION POLICY: Indefinite (Updated 2026-03-09)

/**
 * Get KV store — Cloudflare KV in production, in-memory in local dev
 */
function getStore(): KVLike {
  try {
    const ctx = getRequestContext();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const env = ctx.env as any;
    const kv = env.BOOKING_KV as KVLike | undefined;
    if (kv) {
      console.log('[BookingStore] ✅ Using Cloudflare KV (BOOKING_KV binding)');
      return kv;
    }
    const envKeys = Object.keys(env);
    console.error(`[BookingStore] ❌ BOOKING_KV NOT FOUND in env. Available bindings: [${envKeys.join(', ')}]`);
  } catch (e) {
    console.error(`[BookingStore] ❌ getRequestContext() failed: ${e instanceof Error ? e.message : String(e)}`);
  }
  console.warn('[BookingStore] ⚠️ FALLING BACK TO IN-MEMORY STORE — data will NOT persist between requests');
  return memoryFallback;
}

/**
 * Save a new booking with pending status
 */
export async function saveBooking(formData: BookingFormData, bookingId: string, pricing?: PricingSnapshot): Promise<StoredBooking> {
  const booking: StoredBooking = {
    bookingId,
    token: crypto.randomUUID(),
    status: 'pending',
    formData,
    createdAt: new Date().toISOString(),
    agreedAt: new Date().toISOString(),
    appliedPromo: formData.appliedPromo || null,
    finalAmount: pricing?.finalAmount ?? formData.finalAmount ?? undefined,
    pricing: pricing || undefined,
  };

  const kvKey = `booking:${booking.token}`;
  const kv = getStore();

  console.log(`[BookingStore] PUT key="${kvKey}" | bookingId=${bookingId}`);
  await kv.put(kvKey, JSON.stringify(booking));

  // Verify write — immediate read-back
  const verify = await kv.get(kvKey);
  if (verify) {
    console.log(`[BookingStore] ✅ PUT verified: key="${kvKey}" | data length=${verify.length}`);
  } else {
    console.error(`[BookingStore] ❌ PUT verification FAILED: key="${kvKey}" — read-back returned null`);
  }

  return booking;
}

/**
 * 전체 예약 목록 조회 (최신순) — admin 대시보드용
 *
 * 저장/조회와 같은 스토어를 쓰므로 로컬 In-Memory 폴백에서도 방금 저장한 예약이 보인다.
 */
export async function listAllBookings(): Promise<StoredBooking[]> {
  const kv = getStore();
  const listed = await kv.list({ prefix: 'booking:' });

  console.log(`[BookingStore] LIST prefix="booking:" | ${listed.keys.length}건`);

  const raws = await Promise.all(listed.keys.map(({ name }) => kv.get(name)));

  const bookings: StoredBooking[] = [];
  raws.forEach((raw, i) => {
    if (!raw) {
      console.warn(`[BookingStore] LIST: key="${listed.keys[i].name}" 값이 비어 있어 건너뜀`);
      return;
    }
    try {
      bookings.push(JSON.parse(raw) as StoredBooking);
    } catch (e) {
      console.error(
        `[BookingStore] LIST: key="${listed.keys[i].name}" JSON 파싱 실패 — ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  });

  // 최신순 정렬
  bookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return bookings;
}

/**
 * Find a booking by its confirmation token
 */
export async function getBookingByToken(token: string): Promise<StoredBooking | null> {
  const kvKey = `booking:${token}`;
  console.log(`[BookingStore] GET key="${kvKey}"`);

  const kv = getStore();
  const data = await kv.get(kvKey);

  console.log(`[BookingStore] KV GET result: ${data === null ? 'NULL' : `string(${data.length} chars)`}`);

  if (!data) {
    console.error(`[BookingStore] ❌ LOOKUP FAILED: key="${kvKey}" | KV returned null`);
    return null;
  }

  const booking = JSON.parse(data) as StoredBooking;
  console.log(`[BookingStore] ✅ Found: ${booking.bookingId} | status: ${booking.status} | token: ${token}`);
  return booking;
}

/**
 * Confirm a booking by token, returns the updated booking or null if not found
 */
export async function confirmBooking(token: string): Promise<StoredBooking | null> {
  const kvKey = `booking:${token}`;
  console.log(`[BookingStore] CONFIRM key="${kvKey}"`);

  const kv = getStore();
  const data = await kv.get(kvKey);

  console.log(`[BookingStore] CONFIRM GET result: ${data === null ? 'NULL' : `string(${data.length} chars)`}`);

  if (!data) {
    console.error(`[BookingStore] ❌ CONFIRM FAILED: key="${kvKey}" | KV returned null`);
    return null;
  }

  const booking = JSON.parse(data) as StoredBooking;

  // 취소된 예약은 확정 불가
  if (booking.status === 'cancelled') {
    console.error(`[BookingStore] ❌ CONFIRM BLOCKED: ${booking.bookingId} is cancelled`);
    return null;
  }

  booking.status = 'confirmed';
  booking.confirmedAt = new Date().toISOString();

  await kv.put(kvKey, JSON.stringify(booking));

  console.log(`[BookingStore] ✅ Confirmed: ${booking.bookingId} | token: ${token}`);
  return booking;
}

/**
 * Cancel a booking by token
 * 허용: pending → cancelled, confirmed → cancelled
 * 금지: cancelled → cancelled (idempotent 처리, 기존 데이터 반환)
 */
export async function cancelBooking(
  token: string,
  reason?: string,
  cancelledBy: 'hotel' | 'customer' | 'admin' = 'admin',
): Promise<{ booking: StoredBooking | null; alreadyCancelled: boolean }> {
  const kvKey = `booking:${token}`;
  console.log(`[BookingStore] CANCEL key="${kvKey}"`);

  const kv = getStore();
  const data = await kv.get(kvKey);

  if (!data) {
    console.error(`[BookingStore] ❌ CANCEL FAILED: key="${kvKey}" | KV returned null`);
    return { booking: null, alreadyCancelled: false };
  }

  const booking = JSON.parse(data) as StoredBooking;

  // 이미 취소된 예약 — idempotent 처리
  if (booking.status === 'cancelled') {
    console.log(`[BookingStore] ⚠️ Already cancelled: ${booking.bookingId}`);
    return { booking, alreadyCancelled: true };
  }

  booking.status = 'cancelled';
  booking.cancelledAt = new Date().toISOString();
  booking.cancelReason = reason || undefined;
  booking.cancelledBy = cancelledBy;

  await kv.put(kvKey, JSON.stringify(booking));

  console.log(`[BookingStore] ✅ Cancelled: ${booking.bookingId} | by: ${cancelledBy} | token: ${token}`);
  return { booking, alreadyCancelled: false };
}
