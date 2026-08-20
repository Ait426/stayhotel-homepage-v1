/**
 * Booking Cancel API Route
 *
 * GET  /api/booking-cancel?token=xxx  — 취소 대상 예약을 보여주는 확인 화면 (부작용 없음)
 * POST /api/booking-cancel
 *   - form-encoded (token)            — 이메일 확인 화면에서 제출된 실제 취소 처리 → HTML 응답
 *   - JSON (token, reason, ...)       — admin 대시보드 취소 (X-Admin-Key 인증) → JSON 응답
 *
 * GET을 조회 전용으로 유지하는 이유:
 * 메일 클라이언트와 보안 스캐너는 본문의 링크를 사람 대신 미리 열어보는 경우가 있다.
 * 취소 처리를 GET에 두면 담당자가 클릭하지 않아도 예약이 취소되고
 * 고객에게 취소 메일이 나가버린다. 따라서 상태 변경은 POST에서만 수행한다.
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
import { getRequestContext } from '@cloudflare/next-on-pages';
import { cancelBooking, getBookingByToken, StoredBooking } from '@/lib/booking-store';
import { sendCancellationEmail } from '@/lib/email';
import { getRoomById, getRoomName } from '@/config/rooms';
import { escapeHtml } from '@/lib/utils';

/** 검색엔진 색인 및 캐시 금지 — 토큰이 담긴 1회성 관리 화면 */
const HTML_HEADERS: Record<string, string> = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'X-Robots-Tag': 'noindex, nofollow',
};

function getAdminPassword(): string {
  try {
    const ctx = getRequestContext();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pw = (ctx.env as any).ADMIN_PASSWORD as string | undefined;
    if (pw) return pw;
  } catch {
    // local dev — fall through
  }
  return process.env.ADMIN_PASSWORD || '';
}

// ========================================
// 공통 HTML 렌더링
// ========================================

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
    .status { display: inline-block; margin-top: 16px; padding: 6px 16px; background: #fef2f2; color: #dc2626; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; }
    .actions { margin-top: 28px; }
    .btn { display: inline-block; width: 100%; padding: 16px 24px; background: #dc2626; color: #ffffff; border: none; font-family: inherit; font-size: 15px; font-weight: 700; letter-spacing: 1px; cursor: pointer; }
    .btn:hover { background: #b91c1c; }
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
 * 예약 상세 행 — 확인 화면과 결과 화면이 공유
 * 고객 입력값은 전부 escapeHtml을 거친다
 */
function bookingDetailRows(booking: StoredBooking): string {
  const data = booking.formData;
  const room = getRoomById(data.roomId);
  const roomName = room ? getRoomName(room, 'ko') : data.roomId;

  return `
      <div class="row"><span class="label">예약번호</span><span class="value">${escapeHtml(booking.bookingId)}</span></div>
      <div class="row"><span class="label">고객명</span><span class="value">${escapeHtml(data.guestName)}</span></div>
      <div class="row"><span class="label">객실</span><span class="value">${escapeHtml(roomName)}</span></div>
      <div class="row"><span class="label">체크인</span><span class="value">${escapeHtml(data.checkIn)}</span></div>
      <div class="row"><span class="label">체크아웃</span><span class="value">${escapeHtml(data.checkOut)}</span></div>`;
}

// ========================================
// GET — 확인 화면 (상태 변경 없음)
// ========================================

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  console.log(`[booking-cancel] GET(확인 화면) 요청 | token: ${token || '(none)'}`);

  // token 없음
  if (!token) {
    return new NextResponse(
      htmlPage('잘못된 요청', '유효하지 않은 링크입니다.'),
      { status: 400, headers: HTML_HEADERS }
    );
  }

  // 예약 조회
  const booking = await getBookingByToken(token);
  if (!booking) {
    return new NextResponse(
      htmlPage('예약을 찾을 수 없습니다', '유효하지 않거나 만료된 링크입니다.'),
      { status: 404, headers: HTML_HEADERS }
    );
  }

  // 이미 취소된 경우 — idempotent
  if (booking.status === 'cancelled') {
    return new NextResponse(
      htmlPage('이미 취소된 예약입니다', `예약번호 ${escapeHtml(booking.bookingId)}는 이미 취소 처리되었습니다.`),
      { status: 200, headers: HTML_HEADERS }
    );
  }

  // 확인 화면 — 실제 취소는 아래 폼 제출(POST)에서만 일어난다
  const actions = `
    <form class="actions" method="POST" action="/api/booking-cancel">
      <input type="hidden" name="token" value="${escapeHtml(token)}">
      <button class="btn" type="submit">예약 취소하기</button>
      <p class="hint">취소하면 고객(${escapeHtml(booking.formData.guestEmail)})에게 취소 메일이 발송되며 되돌릴 수 없습니다.<br>이 화면을 그냥 닫으면 아무것도 처리되지 않습니다.</p>
    </form>`;

  return new NextResponse(
    htmlPage(
      '예약을 취소하시겠습니까?',
      '아래 내용을 확인한 뒤 취소 버튼을 눌러주세요.',
      `<div class="details">${bookingDetailRows(booking)}</div>`,
      actions
    ),
    { status: 200, headers: HTML_HEADERS }
  );
}

// ========================================
// POST — 실제 취소 처리
// 폼 제출(이메일 확인 화면) → HTML / JSON(admin) → JSON
// ========================================

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';
  const isFormSubmit =
    contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data');

  return isFormSubmit ? handleEmailCancel(request) : handleAdminCancel(request);
}

/**
 * 이메일 확인 화면에서 제출된 취소 — 토큰 소유 자체가 인증
 */
async function handleEmailCancel(request: NextRequest) {
  let token: string | null = null;
  try {
    const form = await request.formData();
    const value = form.get('token');
    token = typeof value === 'string' && value ? value : null;
  } catch (e) {
    console.error(`[booking-cancel] 폼 파싱 실패: ${e instanceof Error ? e.message : String(e)}`);
  }

  console.log(`[booking-cancel] POST(이메일 취소) 요청 | token: ${token || '(none)'}`);

  if (!token) {
    return new NextResponse(
      htmlPage('잘못된 요청', '유효하지 않은 링크입니다.'),
      { status: 400, headers: HTML_HEADERS }
    );
  }

  const existing = await getBookingByToken(token);
  if (!existing) {
    return new NextResponse(
      htmlPage('예약을 찾을 수 없습니다', '유효하지 않거나 만료된 링크입니다.'),
      { status: 404, headers: HTML_HEADERS }
    );
  }

  if (existing.status === 'cancelled') {
    return new NextResponse(
      htmlPage('이미 취소된 예약입니다', `예약번호 ${escapeHtml(existing.bookingId)}는 이미 취소 처리되었습니다.`),
      { status: 200, headers: HTML_HEADERS }
    );
  }

  const { booking } = await cancelBooking(token, '이메일 링크를 통한 취소', 'hotel');
  if (!booking) {
    return new NextResponse(
      htmlPage('오류 발생', '예약 취소 처리 중 오류가 발생했습니다.'),
      { status: 500, headers: HTML_HEADERS }
    );
  }

  // 고객에게 취소 이메일 발송
  const emailResult = await sendCancellationEmail(
    booking.formData,
    booking.bookingId,
    booking.cancelledAt || new Date().toISOString(),
    booking.finalAmount,
    booking.pricing,
  );

  if (!emailResult.success) {
    console.error(`[booking-cancel] 취소 이메일 발송 실패: ${booking.bookingId}: ${emailResult.error}`);
  } else {
    console.log(`[booking-cancel] 취소 이메일 발송 완료: ${booking.bookingId}`);
  }

  const detailsHtml = `
    <div class="status">CANCELLED</div>
    <div class="details">${bookingDetailRows(booking)}</div>`;

  const message = emailResult.success
    ? `고객(${escapeHtml(booking.formData.guestEmail)})에게 취소 이메일이 발송되었습니다.`
    : `예약은 취소되었으나 고객 메일 발송에 실패했습니다. 고객(${escapeHtml(booking.formData.guestEmail)})에게 직접 연락해주세요.`;

  return new NextResponse(
    htmlPage('예약이 취소되었습니다', message, detailsHtml),
    { status: 200, headers: HTML_HEADERS }
  );
}

/**
 * admin 대시보드에서 호출하는 취소 — X-Admin-Key 인증 필요, JSON 응답
 */
async function handleAdminCancel(request: NextRequest) {
  // --- 관리자 인증 ---
  const key = request.headers.get('X-Admin-Key');
  const adminPassword = getAdminPassword();
  if (!adminPassword || key !== adminPassword) {
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
    booking.pricing,
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
