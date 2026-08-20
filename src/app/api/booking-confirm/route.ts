/**
 * Booking Confirm API Route — Phase 2
 *
 * GET  /api/booking-confirm?token=xxx  — 확정 대상 예약을 보여주는 확인 화면 (부작용 없음)
 * POST /api/booking-confirm            — 실제 확정 처리 (확인 화면의 버튼 제출)
 *
 * GET을 조회 전용으로 유지하는 이유:
 * 메일 클라이언트와 보안 스캐너는 본문의 링크를 사람 대신 미리 열어보는 경우가 있다.
 * 확정 처리를 GET에 두면 담당자가 클릭하지 않아도 예약이 확정되고
 * 고객에게 확정 메일이 나가버린다. 따라서 상태 변경은 POST에서만 수행한다.
 *
 * Flow:
 * 1. 호텔 담당자가 알림 메일의 '예약 확정' 버튼 클릭 → GET → 확인 화면
 * 2. 확인 화면의 '예약 확정하기' 버튼 제출 → POST
 * 3. 예약 상태 'pending' → 'confirmed'
 * 4. sendConfirmationEmail() → 고객에게 HTML 영수증 발송
 * 5. 처리 결과 페이지 반환
 */

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { confirmBooking, getBookingByToken, StoredBooking } from '@/lib/booking-store';
import { sendConfirmationEmail } from '@/lib/email';
import { getRoomById, getRoomName, formatPrice, calculateRoomTotal } from '@/config/rooms';
import { escapeHtml } from '@/lib/utils';

/** 검색엔진 색인 및 캐시 금지 — 토큰이 담긴 1회성 관리 화면 */
const HTML_HEADERS: Record<string, string> = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'X-Robots-Tag': 'noindex, nofollow',
};

function calculateNights(checkIn: string, checkOut: string): number {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * 요청에서 token 추출 — 폼 제출(POST), JSON(POST), 쿼리스트링 모두 지원
 */
async function readToken(request: NextRequest): Promise<string | null> {
  const contentType = request.headers.get('content-type') || '';

  try {
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const value = form.get('token');
      if (typeof value === 'string' && value) return value;
    } else if (contentType.includes('application/json')) {
      const body = await request.json();
      const value = (body as { token?: unknown })?.token;
      if (typeof value === 'string' && value) return value;
    }
  } catch (e) {
    console.error(`[booking-confirm] 요청 본문 파싱 실패: ${e instanceof Error ? e.message : String(e)}`);
  }

  return request.nextUrl.searchParams.get('token');
}

/**
 * 호텔 담당자에게 보여줄 HTML 페이지
 */
function htmlPage(title: string, message: string, details?: string, actions?: string) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>${escapeHtml(title)} - STAY HOTEL</title>
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
    .actions { margin-top: 28px; }
    .btn { display: inline-block; width: 100%; padding: 16px 24px; background: #d4af37; color: #1a1a2e; border: none; font-family: inherit; font-size: 15px; font-weight: 700; letter-spacing: 1px; cursor: pointer; }
    .btn:hover { background: #c19b2e; }
    .hint { margin-top: 14px; font-size: 12px; color: #999; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">STAY HOTEL</div>
    <h1>${escapeHtml(title)}</h1>
    <p>${message}</p>
    ${details || ''}
    ${actions || ''}
  </div>
</body>
</html>`;
}

/**
 * 최종 금액 표기 — 미군 특가는 USD 고정 요금이므로 ₩로 표기하면 안 된다
 */
function formatBookingAmount(booking: StoredBooking): string {
  const data = booking.formData;
  const room = getRoomById(data.roomId);
  const basePrice = room ? calculateRoomTotal(room, data.checkIn, data.checkOut) : 0;
  const amount = booking.finalAmount != null ? booking.finalAmount : basePrice;
  if (amount <= 0) return '-';
  if (booking.appliedPromo === 'military_fixed') return `$${amount.toLocaleString()}`;
  return formatPrice(amount, 'ko');
}

/**
 * 예약 상세 행 — 확인 화면과 결과 화면이 공유
 * 고객 입력값은 전부 escapeHtml을 거친다
 */
function bookingDetailRows(booking: StoredBooking): string {
  const data = booking.formData;
  const room = getRoomById(data.roomId);
  const roomName = room ? getRoomName(room, 'ko') : data.roomId;
  const nights = calculateNights(data.checkIn, data.checkOut);
  const promoLabel = booking.appliedPromo === 'military_fixed' ? 'Military $64'
    : booking.appliedPromo === 'longstay_15' ? '연박 15%'
    : booking.appliedPromo === 'longstay_10' ? '연박 10%'
    : null;

  return `
      <div class="row"><span class="label">예약번호</span><span class="value">${escapeHtml(booking.bookingId)}</span></div>
      <div class="row"><span class="label">고객명</span><span class="value">${escapeHtml(data.guestName)}</span></div>
      <div class="row"><span class="label">객실</span><span class="value">${escapeHtml(roomName)}</span></div>
      <div class="row"><span class="label">체크인</span><span class="value">${escapeHtml(data.checkIn)}</span></div>
      <div class="row"><span class="label">체크아웃</span><span class="value">${escapeHtml(data.checkOut)} (${nights}박)</span></div>
      <div class="row"><span class="label">인원</span><span class="value">${escapeHtml(String(data.guestCount))}명</span></div>
      <div class="row"><span class="label">방문 방법</span><span class="value">${data.transportation === 'car' ? '차량' : '도보'}</span></div>
      ${promoLabel ? `<div class="row"><span class="label">적용 할인</span><span class="value" style="color: #2e7d32;">${promoLabel}</span></div>` : ''}
      <div class="row"><span class="label">최종 금액</span><span class="value" style="color: #d4af37;">${escapeHtml(formatBookingAmount(booking))}</span></div>`;
}

// ========================================
// GET — 확인 화면 (상태 변경 없음)
// ========================================

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  console.log(`[booking-confirm] GET(확인 화면) 요청 | token: ${token || '(none)'}`);

  // ── Guard: missing token ──
  if (!token) {
    return new NextResponse(
      htmlPage('잘못된 요청', '유효하지 않은 링크입니다.'),
      { status: 400, headers: HTML_HEADERS }
    );
  }

  // ── Guard: booking not found ──
  const booking = await getBookingByToken(token);
  if (!booking) {
    console.error(`[booking-confirm] BOOKING NOT FOUND | token: "${token}" | KV lookup returned null`);
    return new NextResponse(
      htmlPage('예약을 찾을 수 없습니다', '유효하지 않거나 만료된 링크입니다.'),
      { status: 404, headers: HTML_HEADERS }
    );
  }

  // ── Guard: already confirmed ──
  if (booking.status === 'confirmed') {
    return new NextResponse(
      htmlPage('이미 확정된 예약입니다', `예약번호 ${escapeHtml(booking.bookingId)}는 이미 확정 처리되었습니다.`),
      { status: 200, headers: HTML_HEADERS }
    );
  }

  // ── Guard: cancelled booking cannot be confirmed ──
  if (booking.status === 'cancelled') {
    return new NextResponse(
      htmlPage('취소된 예약입니다', `예약번호 ${escapeHtml(booking.bookingId)}는 취소된 예약이므로 확정할 수 없습니다.`),
      { status: 400, headers: HTML_HEADERS }
    );
  }

  // ── 확인 화면 — 실제 확정은 아래 폼 제출(POST)에서만 일어난다 ──
  const actions = `
    <form class="actions" method="POST" action="/api/booking-confirm">
      <input type="hidden" name="token" value="${escapeHtml(token)}">
      <button class="btn" type="submit">예약 확정하기</button>
      <p class="hint">확정하면 고객(${escapeHtml(booking.formData.guestEmail)})에게 확정 메일이 발송됩니다.<br>이 화면을 그냥 닫으면 아무것도 처리되지 않습니다.</p>
    </form>`;

  return new NextResponse(
    htmlPage(
      '예약을 확정하시겠습니까?',
      '아래 내용을 확인한 뒤 확정 버튼을 눌러주세요.',
      `<div class="details">${bookingDetailRows(booking)}</div>`,
      actions
    ),
    { status: 200, headers: HTML_HEADERS }
  );
}

// ========================================
// POST — 실제 확정 처리
// ========================================

export async function POST(request: NextRequest) {
  const token = await readToken(request);

  console.log(`[booking-confirm] POST(확정 처리) 요청 | token: ${token || '(none)'}`);

  // ── Guard: missing token ──
  if (!token) {
    return new NextResponse(
      htmlPage('잘못된 요청', '유효하지 않은 링크입니다.'),
      { status: 400, headers: HTML_HEADERS }
    );
  }

  // ── Guard: booking not found ──
  const existing = await getBookingByToken(token);
  if (!existing) {
    console.error(`[booking-confirm] BOOKING NOT FOUND | token: "${token}" | KV lookup returned null`);
    return new NextResponse(
      htmlPage('예약을 찾을 수 없습니다', '유효하지 않거나 만료된 링크입니다.'),
      { status: 404, headers: HTML_HEADERS }
    );
  }

  // ── Guard: already confirmed ──
  if (existing.status === 'confirmed') {
    return new NextResponse(
      htmlPage('이미 확정된 예약입니다', `예약번호 ${escapeHtml(existing.bookingId)}는 이미 확정 처리되었습니다.`),
      { status: 200, headers: HTML_HEADERS }
    );
  }

  // ── Guard: cancelled booking cannot be confirmed ──
  if (existing.status === 'cancelled') {
    return new NextResponse(
      htmlPage('취소된 예약입니다', `예약번호 ${escapeHtml(existing.bookingId)}는 취소된 예약이므로 확정할 수 없습니다.`),
      { status: 400, headers: HTML_HEADERS }
    );
  }

  // ── Step 1: Update status → 'confirmed' in KV ──
  const booking = await confirmBooking(token);
  if (!booking) {
    return new NextResponse(
      htmlPage('오류 발생', '예약 확정 처리 중 오류가 발생했습니다.'),
      { status: 500, headers: HTML_HEADERS }
    );
  }

  // ── Step 2: Send HTML receipt email to guest ──
  // MUST await — Cloudflare kills the isolate when the response is sent.
  // pricing snapshot을 함께 넘겨야 영수증의 할인 금액과 합계가 맞는다
  const emailResult = await sendConfirmationEmail(booking.formData, booking.bookingId, booking.finalAmount, booking.pricing);

  if (!emailResult.success) {
    console.error(`[booking-confirm] Email to guest failed for ${booking.bookingId}: ${emailResult.error}`);
  } else {
    console.log(`[booking-confirm] Confirmation email sent for ${booking.bookingId}`);
  }

  // ── Step 3: Show result page to admin ──
  const detailsHtml = `
    <div class="status">CONFIRMED</div>
    <div class="details">${bookingDetailRows(booking)}</div>`;

  const message = emailResult.success
    ? `고객(${escapeHtml(booking.formData.guestEmail)})에게 확정 이메일(HTML 영수증)이 발송되었습니다.`
    : `예약은 확정되었으나 고객 메일 발송에 실패했습니다. 고객(${escapeHtml(booking.formData.guestEmail)})에게 직접 연락해주세요.`;

  return new NextResponse(
    htmlPage('예약이 확정되었습니다', message, detailsHtml),
    { status: 200, headers: HTML_HEADERS }
  );
}
