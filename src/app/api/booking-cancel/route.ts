/**
 * Booking Cancel API Route
 *
 * GET  /api/booking-cancel?token=xxx  — 이메일 원클릭 취소 (token 기반, 인증 불필요)
 * POST /api/booking-cancel            — admin 대시보드 취소 (X-Admin-Key 인증)
 *
 * 상태 전이 규칙:
 * - pending → cancelled ✅
 * - confirmed → cancelled ✅
 * - cancelled → cancelled ✅ (idempotent, 에러 아님)
 * - cancelled → confirmed ❌ (booking-confirm에서 차단)
 */

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cancelBooking, getBookingByToken } from '@/lib/booking-store';
import { sendCancellationEmail } from '@/lib/email';
import { getRoomById, getRoomName } from '@/config/rooms';
import { esc } from '@/lib/html';
import { isAuthorized } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  // --- 관리자 인증 (constant-time 비교) ---
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: '인증 실패' },
      { status: 401 }
    );
  }

  let body: { token?: string; reason?: string; cancelledBy?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: '잘못된 요청 형식' },
      { status: 400 }
    );
  }

  const { token, reason, cancelledBy } = body;

  if (!token) {
    return NextResponse.json(
      { success: false, error: '토큰이 필요합니다' },
      { status: 400 }
    );
  }

  // --- 예약 조회 ---
  const existing = await getBookingByToken(token);
  if (!existing) {
    return NextResponse.json(
      { success: false, error: '예약을 찾을 수 없습니다' },
      { status: 404 }
    );
  }

  // --- 취소 처리 ---
  const validCancelledBy = (cancelledBy === 'hotel' || cancelledBy === 'customer' || cancelledBy === 'admin')
    ? cancelledBy
    : 'admin';

  const { booking, alreadyCancelled } = await cancelBooking(token, reason, validCancelledBy);

  if (!booking) {
    return NextResponse.json(
      { success: false, error: '취소 처리 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }

  // 이미 취소된 경우 idempotent 응답
  if (alreadyCancelled) {
    return NextResponse.json({
      success: true,
      message: '이미 취소된 예약입니다',
      bookingId: booking.bookingId,
      alreadyCancelled: true,
    });
  }

  // --- 고객에게 취소 이메일 발송 ---
  const emailResult = await sendCancellationEmail(
    booking.formData,
    booking.bookingId,
    booking.cancelledAt || new Date().toISOString(),
    booking.finalAmount,
  );

  if (!emailResult.success) {
    console.error(`[booking-cancel] 취소 이메일 발송 실패: ${booking.bookingId}: ${emailResult.error}`);
  } else {
    console.log(`[booking-cancel] 취소 이메일 발송 완료: ${booking.bookingId}`);
  }

  return NextResponse.json({
    success: true,
    message: '예약이 취소되었습니다',
    bookingId: booking.bookingId,
    alreadyCancelled: false,
  });
}

// ========================================
// GET — 이메일 원클릭 취소 (token 기반)
// booking-confirm GET과 대칭 구조
// ========================================

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
    .status { display: inline-block; margin-top: 16px; padding: 6px 16px; background: #fef2f2; color: #dc2626; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; }
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

  // 토큰은 취소 권한 그 자체이므로 값을 로그에 남기지 않는다
  console.log(`[booking-cancel-GET] Received request | token present: ${Boolean(token)}`);

  // token 없음
  if (!token) {
    return new NextResponse(
      htmlPage('잘못된 요청', '유효하지 않은 링크입니다.'),
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  // 예약 조회
  const existing = await getBookingByToken(token);
  if (!existing) {
    return new NextResponse(
      htmlPage('예약을 찾을 수 없습니다', '유효하지 않거나 만료된 링크입니다.'),
      { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  // 이미 취소된 경우 — idempotent
  if (existing.status === 'cancelled') {
    return new NextResponse(
      htmlPage('이미 취소된 예약입니다', `예약번호 ${esc(existing.bookingId)}는 이미 취소 처리되었습니다.`),
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  // 취소 처리
  const { booking } = await cancelBooking(token, '이메일 링크를 통한 취소', 'hotel');
  if (!booking) {
    return new NextResponse(
      htmlPage('오류 발생', '예약 취소 처리 중 오류가 발생했습니다.'),
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  // 고객에게 취소 이메일 발송
  const emailResult = await sendCancellationEmail(
    booking.formData,
    booking.bookingId,
    booking.cancelledAt || new Date().toISOString(),
    booking.finalAmount,
  );

  if (!emailResult.success) {
    console.error(`[booking-cancel-GET] 취소 이메일 발송 실패: ${booking.bookingId}: ${emailResult.error}`);
  } else {
    console.log(`[booking-cancel-GET] 취소 이메일 발송 완료: ${booking.bookingId}`);
  }

  // 결과 페이지
  const data = booking.formData;
  const room = getRoomById(data.roomId);
  const roomName = room ? getRoomName(room, 'ko') : data.roomId;

  // 고객이 입력한 값은 전부 escape한다 — 직원 브라우저에서 실행되는 것을 막는다
  const detailsHtml = `
    <div class="status">CANCELLED</div>
    <div class="details">
      <div class="row"><span class="label">예약번호</span><span class="value">${esc(booking.bookingId)}</span></div>
      <div class="row"><span class="label">고객명</span><span class="value">${esc(data.guestName)}</span></div>
      <div class="row"><span class="label">객실</span><span class="value">${esc(roomName)}</span></div>
      <div class="row"><span class="label">체크인</span><span class="value">${esc(data.checkIn)}</span></div>
      <div class="row"><span class="label">체크아웃</span><span class="value">${esc(data.checkOut)}</span></div>
    </div>`;

  const guestMailNote = emailResult.success
    ? `고객(${esc(data.guestEmail)})에게 취소 이메일이 발송되었습니다.`
    : `⚠️ 예약은 취소되었으나 고객(${esc(data.guestEmail)})에게 취소 메일을 보내지 못했습니다. 직접 연락해 주세요.`;

  return new NextResponse(
    htmlPage('예약이 취소되었습니다', guestMailNote, detailsHtml),
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}
