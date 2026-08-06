/**
 * Booking Confirm API Route — Phase 2
 *
 * GET /api/booking-confirm?token=xxx
 *
 * Flow:
 * 1. Hotel admin clicks the secure confirmation link from notification email
 * 2. Validates token against booking store
 * 3. Updates booking status: 'pending' → 'confirmed'
 * 4. Triggers sendConfirmationEmail() → sends cross-client HTML receipt to guest
 * 5. Returns styled HTML confirmation page to admin's browser
 *
 * No PDF generation. Guest receives an inline HTML email receipt.
 */

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { confirmBooking, getBookingByToken } from '@/lib/booking-store';
import { sendConfirmationEmail } from '@/lib/email';
import { getRoomById, getRoomName, formatPrice, calculateRoomTotal } from '@/config/rooms';
import { esc } from '@/lib/html';
import { currencyForPromo, formatAmount } from '@/lib/promo';

function calculateNights(checkIn: string, checkOut: string): number {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Admin-facing HTML response page shown after clicking the confirm link.
 */
/**
 * `message`와 `details`는 호출부에서 이미 escape된 HTML 조각이다.
 * `title`은 여기서 escape한다.
 */
function htmlPage(title: string, message: string, details?: string) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>${esc(title)} - STAY HOTEL</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; background: #f5f5f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .card { background: white; max-width: 500px; width: 90%; padding: 48px; text-align: center; box-shadow: 0 2px 20px rgba(0,0,0,0.08); }
    .logo { color: #d4af37; font-size: 14px; letter-spacing: 3px; margin-bottom: 32px; }
    h1 { font-size: 22px; color: #1a1a2e; margin-bottom: 12px; }
    p { font-size: 14px; color: #666; line-height: 1.6; }
    .details { margin-top: 24px; padding: 20px; background: #f9f9f9; text-align: left; font-size: 13px; color: #444; }
    .details .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
    .details .row:last-child { border-bottom: none; }
    .details .label { color: #888; }
    .details .value { font-weight: 600; }
    .status { display: inline-block; margin-top: 16px; padding: 6px 16px; background: #e8f5e9; color: #2e7d32; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">STAY HOTEL</div>
    <h1>${esc(title)}</h1>
    <p>${message}</p>
    ${details || ''}
  </div>
</body>
</html>`;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  // 토큰은 확정 권한 그 자체이므로 값을 로그에 남기지 않는다
  console.log(`[booking-confirm] Received request | token present: ${Boolean(token)}`);

  // ── Guard: missing token ──
  if (!token) {
    return new NextResponse(
      htmlPage('잘못된 요청', '유효하지 않은 링크입니다.'),
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  // ── Guard: booking not found ──
  const existing = await getBookingByToken(token);
  if (!existing) {
    console.error('[booking-confirm] BOOKING NOT FOUND | KV lookup returned null');
    return new NextResponse(
      htmlPage('예약을 찾을 수 없습니다', '유효하지 않거나 만료된 링크입니다.'),
      { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  // ── Guard: already confirmed ──
  if (existing.status === 'confirmed') {
    return new NextResponse(
      htmlPage('이미 확정된 예약입니다', `예약번호 ${esc(existing.bookingId)}는 이미 확정 처리되었습니다.`),
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  // ── Guard: cancelled booking cannot be confirmed ──
  if (existing.status === 'cancelled') {
    return new NextResponse(
      htmlPage('취소된 예약입니다', `예약번호 ${esc(existing.bookingId)}는 취소된 예약이므로 확정할 수 없습니다.`),
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  // ── Step 1: Update status → 'confirmed' in KV ──
  const booking = await confirmBooking(token);
  if (!booking) {
    return new NextResponse(
      htmlPage('오류 발생', '예약 확정 처리 중 오류가 발생했습니다.'),
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  // ── Step 2: Send HTML receipt email to guest ──
  // MUST await — Cloudflare kills the isolate when the response is sent.
  // pricing snapshot을 넘겨야 금액·통화·할인 내역이 청구 기준과 일치한다.
  const emailResult = await sendConfirmationEmail(
    booking.formData,
    booking.bookingId,
    booking.finalAmount,
    booking.pricing
  );
  const emailDelivered = emailResult.success;

  if (!emailDelivered) {
    console.error(`[booking-confirm] Email to guest failed for ${booking.bookingId}: ${emailResult.error}`);
  } else {
    console.log(`[booking-confirm] Confirmation email sent for ${booking.bookingId}`);
  }

  // ── Step 3: Show confirmation page to admin ──
  const data = booking.formData;
  const room = getRoomById(data.roomId);
  const roomName = room ? getRoomName(room, 'ko') : data.roomId;
  const nights = booking.pricing?.nights ?? calculateNights(data.checkIn, data.checkOut);
  // Use stored finalAmount (includes discounts) — fall back to base calculation
  const finalAmount = booking.finalAmount;
  const basePrice = room ? calculateRoomTotal(room, data.checkIn, data.checkOut) : 0;
  const displayPrice = finalAmount != null ? finalAmount : basePrice;
  // 통화는 snapshot을 따른다. 미군 특가는 USD이므로 원화 포맷을 쓰면 $128이 ₩128로 찍힌다.
  const currency = booking.pricing?.currency ?? currencyForPromo(booking.appliedPromo);
  const priceText = displayPrice > 0
    ? (currency === 'USD' ? formatAmount(displayPrice, currency) : formatPrice(displayPrice, 'ko'))
    : '-';
  const promoLabel = booking.appliedPromo === 'military_fixed' ? 'Military $64/박'
    : booking.appliedPromo === 'longstay_15' ? '연박 15%'
    : booking.appliedPromo === 'longstay_10' ? '연박 10%'
    : null;

  // 고객이 입력한 값은 전부 escape한다 — 직원 브라우저에서 실행되는 것을 막는다
  const detailsHtml = `
    <div class="status">CONFIRMED</div>
    <div class="details">
      <div class="row"><span class="label">예약번호</span><span class="value">${esc(booking.bookingId)}</span></div>
      <div class="row"><span class="label">고객명</span><span class="value">${esc(data.guestName)}</span></div>
      <div class="row"><span class="label">객실</span><span class="value">${esc(roomName)}</span></div>
      <div class="row"><span class="label">체크인</span><span class="value">${esc(data.checkIn)}</span></div>
      <div class="row"><span class="label">체크아웃</span><span class="value">${esc(data.checkOut)} (${nights}박)</span></div>
      <div class="row"><span class="label">방문 방법</span><span class="value">${data.transportation === 'car' ? '차량' : '도보'}</span></div>
      ${promoLabel ? `<div class="row"><span class="label">적용 할인</span><span class="value" style="color: #2e7d32;">${esc(promoLabel)}</span></div>` : ''}
      <div class="row"><span class="label">최종 금액</span><span class="value" style="color: #d4af37;">${esc(priceText)}</span></div>
    </div>`;

  const guestMailNote = emailDelivered
    ? `고객(${esc(data.guestEmail)})에게 확정 이메일이 발송되었습니다.`
    : `⚠️ 예약은 확정되었으나 고객(${esc(data.guestEmail)})에게 확정 메일을 보내지 못했습니다. 직접 연락해 주세요.`;

  return new NextResponse(
    htmlPage('예약이 확정되었습니다', guestMailNote, detailsHtml),
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}
