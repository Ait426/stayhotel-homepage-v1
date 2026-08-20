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
import { MILITARY_FIXED_RATE_USD } from '@/config/events';

/**
 * 서버 측 가격 snapshot 생성 — 클라이언트 finalAmount를 신뢰하지 않음
 * 이 snapshot이 이메일/admin의 유일한 가격 기준
 */
function buildPricingSnapshot(body: BookingFormData): PricingSnapshot {
  const room = getRoomById(body.roomId);
  if (!room) return { baseAmount: 0, extraGuestCount: 0, extraGuestFeeUnit: 0, extraGuestFeeTotal: 0, discountAmount: 0, finalAmount: 0, nights: 0 };

  const diff = new Date(body.checkOut).getTime() - new Date(body.checkIn).getTime();
  const nights = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));

  const baseAmount = calculateRoomTotal(room, body.checkIn, body.checkOut);
  const extraGuestCount = getExtraGuestCount(room, body.guestCount);
  const extraGuestFeeUnit = room.extraGuestFee || 0;
  const extraGuestFeeTotal = calculateExtraGuestFee(room, body.guestCount, nights);
  const subtotal = baseAmount + extraGuestFeeTotal;

  // 미군 특가: 고정 요금 × 박 수 (USD, 추가요금 없음)
  if (body.appliedPromo === 'military_fixed') {
    return { baseAmount, extraGuestCount: 0, extraGuestFeeUnit: 0, extraGuestFeeTotal: 0, discountAmount: 0, finalAmount: nights * MILITARY_FIXED_RATE_USD, nights };
  }

  // 연박 할인
  let discountAmount = 0;
  let finalAmount = subtotal;
  if (body.appliedPromo === 'longstay_15' && nights >= 7) {
    finalAmount = Math.floor(subtotal * 0.85);
    discountAmount = subtotal - finalAmount;
  } else if (body.appliedPromo === 'longstay_10' && nights >= 2) {
    finalAmount = Math.floor(subtotal * 0.90);
    discountAmount = subtotal - finalAmount;
  }

  return { baseAmount, extraGuestCount, extraGuestFeeUnit, extraGuestFeeTotal, discountAmount, finalAmount, nights };
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

    // 객실 존재 여부 + 최대 인원 검증
    const room = getRoomById(body.roomId);
    if (!room) {
      return NextResponse.json(
        { success: false, error: `Invalid room ID: ${body.roomId}` },
        { status: 400 }
      );
    }

    if (body.guestCount > room.maxGuests) {
      return NextResponse.json(
        { success: false, error: `Guest count ${body.guestCount} exceeds room max ${room.maxGuests}` },
        { status: 400 }
      );
    }

    // 서버 측 가격 snapshot 생성 — 클라이언트 금액을 신뢰하지 않음
    const pricing = buildPricingSnapshot(body);

    // 클라이언트 금액과 서버 금액 불일치 시 로그 기록
    if (body.finalAmount != null && body.finalAmount !== pricing.finalAmount) {
      console.warn(
        `[booking-request] 가격 불일치: client=${body.finalAmount}, server=${pricing.finalAmount}, room=${body.roomId}, guests=${body.guestCount}`
      );
    }

    // 서버 계산 금액으로 강제 교체
    body.finalAmount = pricing.finalAmount;

    // 예약 ID 생성
    const bookingId = 'BK-' + Date.now().toString(36).toUpperCase();

    // 예약 저장 (pricing snapshot 포함)
    const booking = await saveBooking(body, bookingId, pricing);

    // 호텔에 알림 이메일 발송 — pricing snapshot 전달
    // Cloudflare Edge는 응답 전송 시점에 V8 isolate를 종료함
    const emailResult = await sendBookingEmail(body, bookingId, booking.token, pricing);

    if (!emailResult.success) {
      console.error(`[booking-request] Email failed for ${bookingId}: ${emailResult.error}`);
      // Booking is saved but email failed — return 500 so client knows
      return NextResponse.json(
        {
          success: false,
          bookingId,
          error: `Booking saved but email notification failed: ${emailResult.error}`,
        },
        { status: 500 }
      );
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
