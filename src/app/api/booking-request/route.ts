/**
 * Booking Request API Route
 *
 * POST /api/booking-request
 * - Guest submits booking form
 * - Saves booking as 'pending'
 * - Sends notification email to hotel with confirm link
 */

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { BookingFormData } from '@/types';
import { saveBooking, PricingSnapshot } from '@/lib/booking-store';
import { sendBookingEmail } from '@/lib/email';
import { getRoomById, calculateRoomTotal, calculateExtraGuestFee, getExtraGuestCount } from '@/config/rooms';
import { resolvePromo, MILITARY_NIGHTLY_USD, PromoCode } from '@/lib/promo';
import { getTodayString } from '@/lib/utils';

/** 요청사항 등 자유 입력 필드 상한 — KV 값과 메일 본문이 무한정 커지는 것을 방지 */
const MAX_TEXT = 1000;
const MAX_NAME = 100;
/** 예약 가능한 최장 숙박 일수 */
const MAX_NIGHTS = 60;
const EMAIL_RE = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/;

/** YYYY-MM-DD 형식이고 실제 존재하는 날짜인지 검사 */
function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10) === value ? d : null;
}

/** 호텔 기준(Asia/Seoul) 오늘 자정 — 과거 날짜 예약 차단용 */
function hotelToday(): Date {
  return new Date(`${getTodayString()}T00:00:00Z`);
}

/**
 * 서버 측 가격 snapshot 생성 — 클라이언트 finalAmount를 신뢰하지 않음
 * 이 snapshot이 이메일/admin의 유일한 가격 기준
 */
function buildPricingSnapshot(
  body: BookingFormData,
  nights: number,
  promo: PromoCode | null
): PricingSnapshot {
  const room = getRoomById(body.roomId);
  if (!room) {
    return { baseAmount: 0, extraGuestCount: 0, extraGuestFeeUnit: 0, extraGuestFeeTotal: 0, discountAmount: 0, finalAmount: 0, nights: 0, currency: 'KRW' };
  }

  const baseAmount = calculateRoomTotal(room, body.checkIn, body.checkOut);
  const extraGuestCount = getExtraGuestCount(room, body.guestCount);
  const extraGuestFeeUnit = room.extraGuestFee || 0;
  const extraGuestFeeTotal = calculateExtraGuestFee(room, body.guestCount, nights);
  const subtotal = baseAmount + extraGuestFeeTotal;

  // 미군 특가: $64 × 박 수 (USD 고정, 추가 인원 요금 없음)
  if (promo === 'military_fixed') {
    return {
      baseAmount, extraGuestCount: 0, extraGuestFeeUnit: 0, extraGuestFeeTotal: 0,
      discountAmount: 0, finalAmount: nights * MILITARY_NIGHTLY_USD, nights, currency: 'USD',
    };
  }

  // 연박 할인 — 자격 검증은 resolvePromo()에서 이미 끝났다
  let discountAmount = 0;
  let finalAmount = subtotal;
  if (promo === 'longstay_15') {
    finalAmount = Math.floor(subtotal * 0.85);
    discountAmount = subtotal - finalAmount;
  } else if (promo === 'longstay_10') {
    finalAmount = Math.floor(subtotal * 0.90);
    discountAmount = subtotal - finalAmount;
  }

  return { baseAmount, extraGuestCount, extraGuestFeeUnit, extraGuestFeeTotal, discountAmount, finalAmount, nights, currency: 'KRW' };
}

export async function POST(request: NextRequest) {
  try {
    const body: BookingFormData = await request.json();

    // 필수 필드 검증
    if (
      !body.roomId ||
      !body.checkIn ||
      !body.checkOut ||
      !body.guestName ||
      !body.guestEmail ||
      !body.guestPhone ||
      !body.transportation
    ) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 취소 정책 동의 검증 (법적 요구사항)
    if (body.agreedToPolicy !== true) {
      return NextResponse.json(
        { success: false, error: 'You must agree to the cancellation policy' },
        { status: 400 }
      );
    }

    // 이메일 형식 검증 — 확정 메일이 실제로 도달해야 예약이 성립한다
    if (!EMAIL_RE.test(body.guestEmail)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // 자유 입력 길이 상한
    if (body.guestName.length > MAX_NAME || body.guestPhone.length > MAX_NAME) {
      return NextResponse.json(
        { success: false, error: 'Name or phone is too long' },
        { status: 400 }
      );
    }
    if (body.specialRequests && body.specialRequests.length > MAX_TEXT) {
      body.specialRequests = body.specialRequests.slice(0, MAX_TEXT);
    }

    // 날짜 검증 — 과거/역순/동일일자/과다 숙박 차단
    const checkIn = parseDate(body.checkIn);
    const checkOut = parseDate(body.checkOut);
    if (!checkIn || !checkOut) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format, expected YYYY-MM-DD' },
        { status: 400 }
      );
    }
    if (checkOut.getTime() <= checkIn.getTime()) {
      return NextResponse.json(
        { success: false, error: 'Check-out must be after check-in' },
        { status: 400 }
      );
    }
    if (checkIn.getTime() < hotelToday().getTime()) {
      return NextResponse.json(
        { success: false, error: 'Check-in date is in the past' },
        { status: 400 }
      );
    }
    const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000);
    if (nights > MAX_NIGHTS) {
      return NextResponse.json(
        { success: false, error: `Stay exceeds the ${MAX_NIGHTS}-night maximum` },
        { status: 400 }
      );
    }

    // 객실 존재 여부 + 인원 검증
    const room = getRoomById(body.roomId);
    if (!room) {
      return NextResponse.json(
        { success: false, error: `Invalid room ID: ${body.roomId}` },
        { status: 400 }
      );
    }

    // guestCount는 명시적으로 정수 검증한다. 예전에는 검사가 없어서 값이 빠지면
    // NaN이 그대로 흘러 finalAmount가 null로 저장됐다.
    const guestCount = Number(body.guestCount);
    if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > room.maxGuests) {
      return NextResponse.json(
        { success: false, error: `Guest count must be between 1 and ${room.maxGuests}` },
        { status: 400 }
      );
    }
    body.guestCount = guestCount;

    // 프로모션 자격 검증 — 클라이언트가 보낸 코드는 '요청'일 뿐 '승인'이 아니다
    const { promo, rejectedReason } = resolvePromo(body.appliedPromo, {
      nights,
      reservationType: body.reservationType,
    });
    if (rejectedReason) {
      console.warn(`[booking-request] 프로모션 거부: ${rejectedReason}`);
    }
    // 승인된 값으로 덮어써야 KV/이메일/admin이 실제 청구액과 어긋나지 않는다
    body.appliedPromo = promo;

    // 서버 측 가격 snapshot 생성 — 클라이언트 금액을 신뢰하지 않음
    const pricing = buildPricingSnapshot(body, nights, promo);

    // 클라이언트 금액과 서버 금액 불일치 시 로그 기록
    if (body.finalAmount != null && body.finalAmount !== pricing.finalAmount) {
      console.warn(
        `[booking-request] 가격 불일치: client=${body.finalAmount}, server=${pricing.finalAmount}, room=${body.roomId}, guests=${body.guestCount}`
      );
    }

    // 서버 계산 금액으로 강제 교체
    body.finalAmount = pricing.finalAmount;

    // 예약 ID 생성 — 밀리초만 쓰면 동시 예약 시 같은 번호가 나오므로 난수 4자리를 덧붙인다
    const suffix = Math.floor(Math.random() * 36 ** 3).toString(36).toUpperCase().padStart(3, '0');
    const bookingId = `BK-${Date.now().toString(36).toUpperCase()}${suffix}`;

    // 예약 저장 (pricing snapshot 포함)
    const booking = await saveBooking(body, bookingId, pricing);

    // 호텔에 알림 이메일 발송 — pricing snapshot 전달
    // Cloudflare Edge는 응답 전송 시점에 V8 isolate를 종료함
    const emailResult = await sendBookingEmail(body, bookingId, booking.token, pricing);

    if (!emailResult.success) {
      // 예약은 이미 KV에 저장됐다. 여기서 500을 반환하면 클라이언트가 재시도해
      // 중복 예약이 쌓이므로, 성공으로 응답하되 알림 실패를 함께 알린다.
      console.error(`[booking-request] Email failed for ${bookingId}: ${emailResult.error}`);
      return NextResponse.json({
        success: true,
        bookingId,
        emailDelivered: false,
        warning: 'Booking was saved, but the hotel notification email could not be sent.',
      });
    }

    console.log(`[booking-request] Success: ${bookingId}, email sent to hotel`);
    return NextResponse.json({
      success: true,
      bookingId,
      message: 'Booking request sent successfully',
    });
  } catch (error) {
    console.error('[booking-request] Unhandled error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}
