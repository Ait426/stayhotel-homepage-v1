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
import { getRateConfig } from '@/lib/rate-store';
import { RateConfig } from '@/config/rate-plan';
import { getPromotionConfig } from '@/lib/promotion-store';
import { PromotionConfig, evaluatePromotion, getKstToday, pickL10n } from '@/config/promotion-plan';

/**
 * 서버 측 가격 snapshot 생성 — 클라이언트 finalAmount를 신뢰하지 않음
 * 이 snapshot이 이메일/admin의 유일한 가격 기준
 * - 객실 요금은 admin '요금 관리'에서 저장한 설정(KV)
 * - 프로모션은 admin '프로모션 관리' 설정(KV)으로 다시 판정한다.
 *   고객이 보낸 appliedPromo는 '어떤 프로모션을 원하는지'로만 쓰고,
 *   꺼짐·기간 밖·조건 불충족이면 할인 없이 정가로 접수한다.
 */
function buildPricingSnapshot(
  body: BookingFormData,
  rateConfig: RateConfig,
  promotionConfig: PromotionConfig
): { pricing: PricingSnapshot; appliedPromo: string | null } {
  const room = getRoomById(body.roomId);
  if (!room) return { pricing: { baseAmount: 0, extraGuestCount: 0, extraGuestFeeUnit: 0, extraGuestFeeTotal: 0, discountAmount: 0, finalAmount: 0, nights: 0 }, appliedPromo: null };

  const diff = new Date(body.checkOut).getTime() - new Date(body.checkIn).getTime();
  const nights = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));

  const baseAmount = calculateRoomTotal(room, body.checkIn, body.checkOut, rateConfig);
  const extraGuestCount = getExtraGuestCount(room, body.guestCount);
  const extraGuestFeeUnit = room.extraGuestFee || 0;
  const extraGuestFeeTotal = calculateExtraGuestFee(room, body.guestCount, nights);
  const regular: PricingSnapshot = { baseAmount, extraGuestCount, extraGuestFeeUnit, extraGuestFeeTotal, discountAmount: 0, finalAmount: baseAmount + extraGuestFeeTotal, nights };

  // 배포 직후 옛 화면이 보내는 값(longstay_10/15, military_fixed)은 새 코드로 바꿔 같은 방식으로 다시 판정
  const LEGACY_REQUEST: Record<string, string> = { longstay_10: 'longstay', longstay_15: 'longstay', military_fixed: 'military' };
  const requested = body.appliedPromo ? (LEGACY_REQUEST[body.appliedPromo] || body.appliedPromo) : null;
  if (!requested) return { pricing: regular, appliedPromo: null };

  const promo = promotionConfig.promotions.find((p) => p.id === requested);
  if (!promo) {
    console.warn(`[booking-request] 없는 프로모션 요청 "${requested}" — 정가로 접수`);
    return { pricing: regular, appliedPromo: null };
  }

  const result = evaluatePromotion(promo, {
    checkIn: body.checkIn,
    nights,
    roomId: room.id,
    reservationType: body.reservationType,
    roomTotal: baseAmount,
    extraGuestFee: extraGuestFeeTotal,
    today: getKstToday(),
  });
  if (!result.ok) {
    console.warn(`[booking-request] 프로모션 "${requested}" 적용 불가(${result.reason}) — 정가로 접수. room=${room.id}, type=${body.reservationType}, nights=${nights}`);
    return { pricing: regular, appliedPromo: null };
  }

  return {
    pricing: {
      baseAmount,
      // 추가 인원 요금이 면제되는 고정가(미군 특가 등)는 추가 인원 0으로 기록 (기존과 동일)
      extraGuestCount: result.extraGuestFeeWaived ? 0 : extraGuestCount,
      extraGuestFeeUnit: result.extraGuestFeeWaived ? 0 : extraGuestFeeUnit,
      extraGuestFeeTotal: result.extraGuestFeeWaived ? 0 : extraGuestFeeTotal,
      discountAmount: result.discountAmount,
      finalAmount: result.finalAmount,
      nights,
      promoId: promo.id,
      promoLabel: pickL10n(promo.title, 'ko'),
      promoLabelEn: pickL10n(promo.title, 'en'),
      currency: result.currency,
    },
    appliedPromo: promo.id,
  };
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
    const [rateConfig, promotionConfig] = await Promise.all([getRateConfig(), getPromotionConfig()]);
    const { pricing, appliedPromo } = buildPricingSnapshot(body, rateConfig, promotionConfig);
    // 서버가 판정한 프로모션으로 교체 (적용 불가면 null)
    body.appliedPromo = appliedPromo;

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
