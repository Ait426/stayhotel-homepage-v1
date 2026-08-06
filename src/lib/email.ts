/**
 * Email Utility for Booking Notifications - Edge Runtime Compatible
 *
 * Uses Resend API (fetch-based). No PDF dependencies.
 *
 * Two-phase booking flow:
 * 1. sendBookingEmail() - Hotel gets notification with "Confirm" button
 * 2. sendConfirmationEmail() - Guest gets professional HTML receipt after hotel confirms
 *
 * HTML Email Design:
 * - Table-based layout for cross-client compatibility (Gmail, Outlook, Apple Mail)
 * - Strict inline CSS only (Gmail strips <style> tags)
 * - Max width 600px (universal email client standard)
 * - No flexbox, grid, or media queries (Outlook uses Word rendering engine)
 * - System font stack for Korean/English support
 *
 * Required environment variables:
 * - RESEND_API_KEY: Resend API key (re_xxxx)
 * - EMAIL_FROM: Verified sender email
 * - SITE_URL: Site base URL (for confirm button link)
 */

import { BookingFormData } from '@/types';
import { PricingSnapshot } from '@/lib/booking-store';
import { getRoomById, getRoomName, formatPrice, calculateRoomTotal, calculateExtraGuestFee, getExtraGuestCount } from '@/config/rooms';
import { getBrandConfig } from '@/config/brand';
import { esc, escMultiline, mailtoHref, telHref } from '@/lib/html';
import { currencyForPromo, formatAmount } from '@/lib/promo';

const RESERVATION_TYPE_LABELS: Record<string, Record<string, string>> = {
  general: { ko: '일반', en: 'General' },
  corporate: { ko: '기업체', en: 'Corporate' },
  military: { ko: '군인', en: 'Military' },
};

const TRANSPORTATION_LABELS: Record<string, Record<string, string>> = {
  walk: { ko: '도보', en: 'Walk' },
  car: { ko: '차량', en: 'Car' },
};

// Shared font stack for all email templates
const FONT_STACK = "'Apple SD Gothic Neo', 'Malgun Gothic', 'Segoe UI', Arial, sans-serif";

/**
 * fetch 기반 이메일 전송 (Resend API)
 */
async function sendEmail(options: {
  to: string;
  from: string;
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[Email] CRITICAL: RESEND_API_KEY is not configured.');
    console.error(`[Email] To: ${options.to} | Subject: ${options.subject}`);
    throw new Error('RESEND_API_KEY environment variable is not set');
  }

  console.log(`[Email] Sending to: ${options.to} | Subject: ${options.subject}`);

  const payload = {
    from: options.from,
    to: [options.to],
    subject: options.subject,
    html: options.html,
  };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseBody = await response.text();

  if (!response.ok) {
    console.error(`[Email] Resend API error: ${response.status} ${response.statusText}`);
    console.error(`[Email] Response body: ${responseBody}`);
    console.error(`[Email] Payload from: ${payload.from} | to: ${payload.to}`);
    throw new Error(`Resend API ${response.status}: ${responseBody}`);
  }

  console.log(`[Email] Success: ${response.status} | Response: ${responseBody}`);
}

function calculateNights(checkIn: string, checkOut: string): number {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

const PROMO_LABELS: Record<string, { ko: string; en: string }> = {
  longstay_10: { ko: '연박 10% 할인', en: '10% Long-Stay Discount' },
  longstay_15: { ko: '연박 15% 할인', en: '15% Long-Stay Discount' },
  military_fixed: { ko: 'US Military Special ($64 고정)', en: 'US Military Special ($64 Fixed)' },
};

/**
 * 고객 메일용 예약 요약.
 *
 * 가격은 서버가 저장한 PricingSnapshot을 그대로 쓴다. snapshot이 없는 예전
 * 예약만 재계산으로 폴백한다 — 예전에는 항상 재계산해서 미군 특가($) 예약이
 * 원화 breakdown 위에 "₩128"로 찍히는 문제가 있었다.
 */
function getBookingDetails(data: BookingFormData, finalAmount?: number, pricing?: PricingSnapshot) {
  const room = getRoomById(data.roomId);
  const roomName = room ? getRoomName(room, 'ko') : data.roomId;
  const roomNameEn = room ? getRoomName(room, 'en') : data.roomId;
  const nights = pricing?.nights ?? calculateNights(data.checkIn, data.checkOut);
  const currency = pricing?.currency ?? currencyForPromo(data.appliedPromo);

  const basePrice = pricing?.baseAmount ?? (room ? calculateRoomTotal(room, data.checkIn, data.checkOut) : 0);
  const extraGuestCount = pricing?.extraGuestCount ?? (room ? getExtraGuestCount(room, data.guestCount) : 0);
  const extraGuestFee = pricing?.extraGuestFeeTotal ?? (room ? calculateExtraGuestFee(room, data.guestCount, nights) : 0);
  const extraGuestFeeUnit = pricing?.extraGuestFeeUnit ?? room?.extraGuestFee ?? 0;
  const discountAmount = pricing?.discountAmount ?? 0;

  const totalPrice = pricing?.finalAmount ?? (finalAmount != null ? finalAmount : basePrice + extraGuestFee);
  // 최종 금액만 예약 통화를 따른다. breakdown 항목은 언제나 원화 정가다.
  const priceText = totalPrice > 0 ? formatAmount(totalPrice, currency) : '-';
  const basePriceText = basePrice > 0 ? formatPrice(basePrice, 'ko') : '-';
  const extraFeeText = extraGuestFee > 0 ? formatPrice(extraGuestFee, 'ko') : null;
  const discountText = discountAmount > 0 ? formatPrice(discountAmount, 'ko') : null;
  const typeLabel = RESERVATION_TYPE_LABELS[data.reservationType]?.ko || data.reservationType;
  const typeLabelEn = RESERVATION_TYPE_LABELS[data.reservationType]?.en || data.reservationType;
  const transportLabel = TRANSPORTATION_LABELS[data.transportation]?.ko || data.transportation || '도보';
  const transportLabelEn = TRANSPORTATION_LABELS[data.transportation]?.en || data.transportation || 'Walk';
  const appliedPromo = data.appliedPromo || null;
  const promoLabelKo = appliedPromo ? (PROMO_LABELS[appliedPromo]?.ko || appliedPromo) : null;
  const promoLabelEn = appliedPromo ? (PROMO_LABELS[appliedPromo]?.en || appliedPromo) : null;
  return {
    room, roomName, roomNameEn, nights, currency,
    basePrice, basePriceText, extraGuestCount, extraGuestFee, extraGuestFeeUnit, extraFeeText,
    discountAmount, discountText, totalPrice, priceText,
    typeLabel, typeLabelEn, transportLabel, transportLabelEn, appliedPromo, promoLabelKo, promoLabelEn,
  };
}

/**
 * Phase 1: Send booking notification to HOTEL ONLY
 * - PricingSnapshot 기반 breakdown (서버 계산 snapshot)
 * - 확정 + 취소 버튼 2개
 */
export async function sendBookingEmail(
  data: BookingFormData,
  bookingId: string,
  confirmToken: string,
  pricing: PricingSnapshot,
): Promise<{ success: boolean; error?: string }> {
  const brand = getBrandConfig();
  const hotelEmail = brand.contact.email;
  const brandName = brand.name.ko;

  const room = getRoomById(data.roomId);
  const roomName = room ? getRoomName(room, 'ko') : data.roomId;
  const roomNameEn = room ? getRoomName(room, 'en') : data.roomId;
  const typeLabel = RESERVATION_TYPE_LABELS[data.reservationType]?.ko || data.reservationType;
  const transportLabel = TRANSPORTATION_LABELS[data.transportation]?.ko || data.transportation || '도보';
  const promoLabelKo = data.appliedPromo ? (PROMO_LABELS[data.appliedPromo]?.ko || data.appliedPromo) : null;

  // snapshot 기반 가격 텍스트 — 통화는 snapshot이 결정한다
  const basePriceText = formatPrice(pricing.baseAmount, 'ko');
  const extraFeeText = pricing.extraGuestFeeTotal > 0 ? formatPrice(pricing.extraGuestFeeTotal, 'ko') : null;
  const discountText = pricing.discountAmount > 0 ? formatPrice(pricing.discountAmount, 'ko') : null;
  const finalText = formatAmount(pricing.finalAmount, pricing.currency);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'http://localhost:3000';
  const confirmUrl = `${siteUrl}/api/booking-confirm?token=${encodeURIComponent(confirmToken)}`;
  const cancelUrl = `${siteUrl}/api/booking-cancel?token=${encodeURIComponent(confirmToken)}`;
  // 토큰은 확정/취소 권한 그 자체이므로 URL 전문을 로그에 남기지 않는다
  console.log(`[Email] Confirm/cancel links generated for booking ${bookingId}`);
  const fromEmail = process.env.EMAIL_FROM || 'noreply@pyeongtaekstay.com';

  const ROW = (label: string, value: string, color = '#1a1a2e') =>
    `<tr><td style="padding: 12px 0; color: #888888; width: 120px; border-bottom: 1px solid #f0f0f0;">${label}</td><td style="padding: 12px 0; font-weight: 600; color: ${color}; border-bottom: 1px solid #f0f0f0;">${value}</td></tr>`;

  const hotelHtml = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
  <tr><td align="center" style="padding: 24px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; width: 100%; background-color: #ffffff;">
      <!-- Header -->
      <tr><td style="background-color: #1a1a2e; padding: 24px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td style="color: #d4af37; font-family: ${FONT_STACK}; font-size: 18px; font-weight: 700; letter-spacing: 2px;">${brandName}</td></tr>
        </table>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding: 32px; border: 1px solid #e5e5e5; border-top: none;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td style="font-family: ${FONT_STACK}; font-size: 20px; font-weight: 700; color: #1a1a2e; padding-bottom: 24px;">새 예약 접수</td></tr>
          <tr><td style="font-family: ${FONT_STACK}; font-size: 13px; color: #888888; padding-bottom: 16px;">예약번호: <strong style="color: #1a1a2e;">${esc(bookingId)}</strong></td></tr>
        </table>
        <!-- 예약 정보 -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family: ${FONT_STACK}; font-size: 14px;">
          ${ROW('객실', esc(`${roomName} (${roomNameEn})`))}
          ${ROW('체크인', esc(data.checkIn))}
          ${ROW('체크아웃', esc(`${data.checkOut} (${pricing.nights}박)`))}
          ${ROW('인원', esc(`${data.guestCount}명`))}
          ${ROW('예약 유형', esc(typeLabel))}
          ${ROW('방문 방법', esc(transportLabel))}
        </table>
        <!-- 가격 breakdown -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family: ${FONT_STACK}; font-size: 14px; margin-top: 16px; background-color: #faf6eb; border: 1px solid #f0e8d0;">
          <tr><td style="padding: 16px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr><td style="padding: 6px 0; color: #888888; font-size: 13px;">객실 요금</td><td align="right" style="padding: 6px 0; font-weight: 600; color: #1a1a2e; font-size: 13px;">${basePriceText} (${pricing.nights}박)</td></tr>
              ${pricing.extraGuestFeeTotal > 0 ? `<tr><td style="padding: 6px 0; color: #e65100; font-size: 13px;">추가 인원</td><td align="right" style="padding: 6px 0; font-weight: 600; color: #e65100; font-size: 13px;">+${extraFeeText} (${pricing.extraGuestCount}명 × ${pricing.nights}박 × ₩${pricing.extraGuestFeeUnit.toLocaleString()}/인/박)</td></tr>` : ''}
              ${discountText ? `<tr><td style="padding: 6px 0; color: #2e7d32; font-size: 13px;">할인 (${promoLabelKo})</td><td align="right" style="padding: 6px 0; font-weight: 600; color: #2e7d32; font-size: 13px;">-${discountText}</td></tr>` : ''}
              ${promoLabelKo && !discountText ? `<tr><td style="padding: 6px 0; color: #2e7d32; font-size: 13px;">적용 프로모션</td><td align="right" style="padding: 6px 0; font-weight: 600; color: #2e7d32; font-size: 13px;">${promoLabelKo}</td></tr>` : ''}
              <tr><td colspan="2" style="border-top: 1px solid #f0e8d0; padding-top: 10px; font-size: 0;">&nbsp;</td></tr>
              <tr><td style="padding: 4px 0; color: #1a1a2e; font-size: 14px; font-weight: 700;">최종 금액</td><td align="right" style="padding: 4px 0; font-weight: 700; color: #d4af37; font-size: 18px;">${finalText}</td></tr>
            </table>
          </td></tr>
        </table>
        <!-- 고객 정보 -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 24px;">
          <tr><td style="font-family: ${FONT_STACK}; font-size: 16px; font-weight: 700; color: #1a1a2e; padding-bottom: 12px;">고객 정보</td></tr>
        </table>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family: ${FONT_STACK}; font-size: 14px;">
          ${ROW('이름', esc(data.guestName))}
          <tr><td style="padding: 12px 0; color: #888888; border-bottom: 1px solid #f0f0f0;">이메일</td><td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;"><a href="${esc(mailtoHref(data.guestEmail))}" style="color: #1a1a2e; text-decoration: none;">${esc(data.guestEmail)}</a></td></tr>
          <tr><td style="padding: 12px 0; color: #888888; border-bottom: 1px solid #f0f0f0;">전화</td><td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;"><a href="${esc(telHref(data.guestPhone))}" style="color: #1a1a2e; text-decoration: none;">${esc(data.guestPhone)}</a></td></tr>
          ${data.specialRequests ? `<tr><td style="padding: 12px 0; color: #888888; vertical-align: top;">요청사항</td><td style="padding: 12px 0; color: #1a1a2e;">${escMultiline(data.specialRequests)}</td></tr>` : ''}
        </table>
        <!-- 확정 / 취소 버튼 -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 32px;">
          <tr>
            <td align="center" style="padding-bottom: 12px;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${confirmUrl}" style="height:48px;v-text-anchor:middle;width:220px;" fillcolor="#d4af37" stroke="f">
                <center style="color:#1a1a2e;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">예약 확정</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-->
              <a href="${confirmUrl}" style="display: inline-block; padding: 14px 40px; background-color: #d4af37; color: #1a1a2e; font-family: ${FONT_STACK}; font-size: 15px; font-weight: 700; text-decoration: none; letter-spacing: 1px;">예약 확정</a>
              <!--<![endif]-->
              &nbsp;&nbsp;
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${cancelUrl}" style="height:48px;v-text-anchor:middle;width:220px;" fillcolor="#dc2626" stroke="f">
                <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">예약 취소</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-->
              <a href="${cancelUrl}" style="display: inline-block; padding: 14px 40px; background-color: #dc2626; color: #ffffff; font-family: ${FONT_STACK}; font-size: 15px; font-weight: 700; text-decoration: none; letter-spacing: 1px;">예약 취소</a>
              <!--<![endif]-->
            </td>
          </tr>
          <tr><td align="center" style="padding-top: 8px; font-family: ${FONT_STACK}; font-size: 12px; color: #aaaaaa;">확정 클릭 → 고객에게 확인 메일 발송 &nbsp;|&nbsp; 취소 클릭 → 고객에게 취소 메일 발송</td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  try {
    await sendEmail({
      from: `${brandName} 예약시스템 <${fromEmail}>`,
      to: hotelEmail,
      subject: `[STAY HOTEL] 새 예약 접수 - ${data.guestName.replace(/[\r\n]/g, ' ')} (${data.checkIn} ~ ${data.checkOut})`,
      html: hotelHtml,
    });

    console.log(`Hotel notification sent: ${bookingId} -> ${hotelEmail}`);
    return { success: true };
  } catch (error) {
    console.error('Hotel email send failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

/**
 * Phase 2: Send professional HTML receipt to GUEST (after hotel confirms)
 *
 * Cross-client compatible HTML email receipt:
 * - Table-based layout (Outlook Word engine compatible)
 * - Inline CSS only (Gmail compatible)
 * - 600px max-width (universal standard)
 * - Bilingual: Korean + English
 * - Brand colors: Navy #1a1a2e, Gold #d4af37
 */
export async function sendConfirmationEmail(
  data: BookingFormData,
  bookingId: string,
  finalAmount?: number,
  pricing?: PricingSnapshot,
): Promise<{ success: boolean; error?: string }> {
  const brand = getBrandConfig();
  const hotelEmail = brand.contact.email;
  const hotelPhone = brand.contact.phone;
  const brandName = brand.name.ko;
  const {
    roomName, roomNameEn, nights, basePriceText, extraGuestCount, extraGuestFee,
    extraGuestFeeUnit, extraFeeText, discountText, priceText, currency,
    typeLabel, typeLabelEn, transportLabel, transportLabelEn, promoLabelKo, promoLabelEn,
  } = getBookingDetails(data, finalAmount, pricing);
  const fromEmail = process.env.EMAIL_FROM || 'noreply@pyeongtaekstay.com';
  const confirmedDate = new Date().toISOString().split('T')[0];

  // 무료 취소 마감 = 체크인 전날 (체크인 24시간 전 기준)
  const freeCancelUntil = new Date(new Date(`${data.checkIn}T00:00:00Z`).getTime() - 86400000)
    .toISOString()
    .slice(0, 10);

  const isMilitary = data.appliedPromo === 'military_fixed';
  const mapUrl = `https://map.naver.com/p/search/${encodeURIComponent(brand.contact.address.ko)}`;

  // 안내 문구 — 예약 유형에 따라 달라지는 줄을 조립한다
  const noticeKo: string[] = [
    '<strong style="color:#1a1a2e;">결제는 체크인 시 호텔 프런트에서</strong> 진행됩니다. 카드·현금 모두 가능하며, 지금은 결제하실 것이 없습니다.',
    `체크인 <strong style="color:#1a1a2e;">15:00</strong> · 체크아웃 <strong style="color:#1a1a2e;">12:00</strong> 입니다. 늦은 도착이 예상되면 미리 전화 주세요.`,
    `<strong style="color:#1a1a2e;">${esc(freeCancelUntil)}</strong> 까지 무료 취소 가능합니다 (체크인 24시간 전 기준).`,
    '프런트에 예약자 성함만 말씀하시면 됩니다. 이 메일을 보여주지 않으셔도 됩니다.',
  ];
  const noticeEn: string[] = [
    '<strong>Payment is made at the front desk on arrival</strong> (card or cash). Nothing is charged now.',
    'Check-in 15:00 · Check-out 12:00. Please call ahead if you expect to arrive late.',
    `Free cancellation until <strong>${esc(freeCancelUntil)}</strong> (24 hours before check-in).`,
    'Just give your name at the front desk — no need to show this email.',
  ];
  if (isMilitary) {
    noticeKo.push('미군 특가 적용 예약입니다. 체크인 시 <strong style="color:#1a1a2e;">유효한 미군 ID(CAC) 또는 Veteran 신분증</strong>을 제시해 주세요.');
    noticeEn.push('This is a US Military rate booking. Please present a <strong>valid US Military ID (CAC) or Veteran ID</strong> at check-in.');
  }
  if (data.reservationType === 'corporate') {
    noticeKo.push('기업체 예약입니다. 체크인 시 명함을 제출해 주시면 세금계산서 발행이 가능합니다.');
    noticeEn.push('Corporate booking — please present a business card at check-in if you need a tax invoice.');
  }

  const NOTICE_ROW = (text: string, muted = false) =>
    `<tr><td style="padding-bottom: 8px; line-height: 1.7; ${muted ? 'color:#999999;' : ''}">&#8226;&nbsp; ${text}</td></tr>`;

  const guestHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation - ${bookingId}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
<!-- Wrapper Table -->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
  <tr><td align="center" style="padding: 32px 16px;">

    <!-- Main Container (600px) -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; width: 100%; border-collapse: collapse;">

      <!-- ============================================ -->
      <!-- HEADER: Navy background with brand name     -->
      <!-- ============================================ -->
      <tr><td style="background-color: #1a1a2e; padding: 28px 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="font-family: Georgia, 'Times New Roman', serif; font-size: 20px; font-weight: 700; color: #d4af37; letter-spacing: 3px;">STAY HOTEL</td>
            <td align="right" style="font-family: ${FONT_STACK}; font-size: 10px; color: #8888a0; letter-spacing: 2px; text-transform: uppercase;">Booking Confirmation</td>
          </tr>
        </table>
      </td></tr>
      <!-- Gold accent line -->
      <tr><td style="background-color: #d4af37; height: 3px; font-size: 0; line-height: 0;">&nbsp;</td></tr>

      <!-- ============================================ -->
      <!-- CONFIRMATION MESSAGE                         -->
      <!-- ============================================ -->
      <tr><td style="background-color: #ffffff; padding: 32px 40px 24px 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td align="center" style="font-family: ${FONT_STACK}; font-size: 22px; font-weight: 700; color: #1a1a2e; padding-bottom: 10px;">예약이 확정되었습니다</td></tr>
          <tr><td align="center" style="font-family: ${FONT_STACK}; font-size: 14px; color: #555555; line-height: 1.7; padding-bottom: 6px;">
            <strong style="color:#1a1a2e;">${esc(data.guestName)}</strong> 님, 스테이호텔을 선택해 주셔서 감사합니다.<br>
            아래 내용으로 예약이 확정되었으며, <strong style="color:#1a1a2e;">추가로 하실 일은 없습니다.</strong><br>
            체크인 당일 프런트에서 뵙겠습니다.
          </td></tr>
          <tr><td align="center" style="font-family: ${FONT_STACK}; font-size: 12px; color: #999999; line-height: 1.7; padding-top: 6px;">
            Dear ${esc(data.guestName)}, thank you for choosing STAY HOTEL.<br>
            Your reservation is confirmed &mdash; nothing further is required from you.
          </td></tr>
        </table>
      </td></tr>

      <!-- ============================================ -->
      <!-- BOOKING NUMBER BOX                           -->
      <!-- ============================================ -->
      <tr><td style="background-color: #ffffff; padding: 0 40px 28px 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8f8f8; border-left: 4px solid #d4af37;">
          <tr><td style="padding: 20px 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td>
                  <span style="font-family: ${FONT_STACK}; font-size: 11px; color: #888888; letter-spacing: 1px;">예약번호 / Booking No.</span><br>
                  <span style="font-family: 'Courier New', Courier, monospace; font-size: 22px; font-weight: 700; color: #1a1a2e; letter-spacing: 1px;">${esc(bookingId)}</span>
                </td>
                <td align="right" style="vertical-align: bottom;">
                  <span style="font-family: ${FONT_STACK}; font-size: 11px; color: #aaaaaa;">확정일: ${esc(confirmedDate)}</span>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </td></tr>

      <!-- ============================================ -->
      <!-- STAY DETAILS SECTION                         -->
      <!-- ============================================ -->
      <tr><td style="background-color: #ffffff; padding: 0 40px;">
        <!-- Section Title -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td style="font-family: ${FONT_STACK}; font-size: 13px; font-weight: 700; color: #1a1a2e; letter-spacing: 2px; text-transform: uppercase; padding-bottom: 8px;">숙박 정보 / Stay Details</td></tr>
          <tr><td style="border-bottom: 1px solid #d4af37; font-size: 0; line-height: 0; height: 1px;">&nbsp;</td></tr>
        </table>
        <!-- Details Table -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family: ${FONT_STACK}; font-size: 14px;">
          <tr>
            <td style="padding: 14px 0 14px 0; color: #888888; width: 45%; border-bottom: 1px solid #f0f0f0;">객실 / Room</td>
            <td style="padding: 14px 0 14px 0; color: #1a1a2e; font-weight: 600; text-align: right; border-bottom: 1px solid #f0f0f0;">${esc(roomName)}<br><span style="font-size: 12px; color: #888888; font-weight: 400;">${esc(roomNameEn)}</span></td>
          </tr>
          <tr>
            <td style="padding: 14px 0; color: #888888; border-bottom: 1px solid #f0f0f0;">체크인 / Check-in</td>
            <td style="padding: 14px 0; color: #1a1a2e; font-weight: 600; text-align: right; border-bottom: 1px solid #f0f0f0;">${esc(data.checkIn)} <span style="font-size: 12px; color: #888888; font-weight: 400;">15:00 부터</span></td>
          </tr>
          <tr>
            <td style="padding: 14px 0; color: #888888; border-bottom: 1px solid #f0f0f0;">체크아웃 / Check-out</td>
            <td style="padding: 14px 0; color: #1a1a2e; font-weight: 600; text-align: right; border-bottom: 1px solid #f0f0f0;">${esc(data.checkOut)} <span style="font-size: 12px; color: #888888; font-weight: 400;">12:00 까지</span></td>
          </tr>
          <tr>
            <td style="padding: 14px 0; color: #888888; border-bottom: 1px solid #f0f0f0;">숙박 / Duration</td>
            <td style="padding: 14px 0; color: #1a1a2e; font-weight: 600; text-align: right; border-bottom: 1px solid #f0f0f0;">${nights}박 / ${nights} night${nights > 1 ? 's' : ''}</td>
          </tr>
          <tr>
            <td style="padding: 14px 0; color: #888888; border-bottom: 1px solid #f0f0f0;">인원 / Guests</td>
            <td style="padding: 14px 0; color: #1a1a2e; font-weight: 600; text-align: right; border-bottom: 1px solid #f0f0f0;">${esc(data.guestCount)}명</td>
          </tr>
          <tr>
            <td style="padding: 14px 0; color: #888888; border-bottom: 1px solid #f0f0f0;">예약유형 / Type</td>
            <td style="padding: 14px 0; color: #1a1a2e; font-weight: 600; text-align: right; border-bottom: 1px solid #f0f0f0;">${esc(typeLabel)} / ${esc(typeLabelEn)}</td>
          </tr>
          <tr>
            <td style="padding: 14px 0; color: #888888; border-bottom: 1px solid #f0f0f0;">방문 방법 / Transport</td>
            <td style="padding: 14px 0; color: #1a1a2e; font-weight: 600; text-align: right; border-bottom: 1px solid #f0f0f0;">${esc(transportLabel)} / ${esc(transportLabelEn)}</td>
          </tr>
        </table>
      </td></tr>

      <!-- ============================================ -->
      <!-- PRICE BOX                                    -->
      <!-- ============================================ -->
      <tr><td style="background-color: #ffffff; padding: 20px 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #faf6eb; border: 1px solid #f0e8d0;">
          <tr><td style="padding: 20px 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="font-family: ${FONT_STACK}; font-size: 12px; color: #888888; padding-bottom: 6px;">객실 요금 / Room Rate</td>
                <td align="right" style="font-family: ${FONT_STACK}; font-size: 12px; font-weight: 600; color: #1a1a2e; padding-bottom: 6px;">${esc(basePriceText)} (${nights}박/${nights} night${nights > 1 ? 's' : ''})</td>
              </tr>
              ${extraGuestFee > 0 ? `<tr>
                <td style="font-family: ${FONT_STACK}; font-size: 12px; color: #e65100; padding-bottom: 6px;">추가 인원 / Extra Guests</td>
                <td align="right" style="font-family: ${FONT_STACK}; font-size: 12px; font-weight: 600; color: #e65100; padding-bottom: 6px;">+${esc(extraFeeText)} (${extraGuestCount}명 × ${nights}박 × ₩${extraGuestFeeUnit.toLocaleString('ko-KR')})</td>
              </tr>` : ''}
              ${discountText ? `<tr>
                <td style="font-family: ${FONT_STACK}; font-size: 12px; color: #2e7d32; padding-bottom: 8px;">할인 / Discount <span style="color:#8a9a8a;">(${esc(promoLabelKo)})</span></td>
                <td align="right" style="font-family: ${FONT_STACK}; font-size: 12px; font-weight: 600; color: #2e7d32; padding-bottom: 8px;">&minus;${esc(discountText)}</td>
              </tr>` : ''}
              ${promoLabelKo && !discountText ? `<tr>
                <td style="font-family: ${FONT_STACK}; font-size: 12px; color: #2e7d32; padding-bottom: 8px;">적용 혜택 / Applied Offer</td>
                <td align="right" style="font-family: ${FONT_STACK}; font-size: 12px; font-weight: 600; color: #2e7d32; padding-bottom: 8px;">${esc(promoLabelKo)} / ${esc(promoLabelEn)}</td>
              </tr>` : ''}
              <tr>
                <td style="font-family: ${FONT_STACK}; font-size: 13px; color: #888888; vertical-align: middle; padding-top: 8px; border-top: 1px solid #f0e8d0;">현장 결제 금액 / Due at Hotel</td>
                <td align="right" style="font-family: Georgia, 'Times New Roman', serif; font-size: 24px; font-weight: 700; color: #d4af37; letter-spacing: 1px; padding-top: 8px; border-top: 1px solid #f0e8d0;">${esc(priceText)}</td>
              </tr>
              ${currency === 'USD' ? `<tr>
                <td colspan="2" align="right" style="font-family: ${FONT_STACK}; font-size: 11px; color: #999999; padding-top: 6px;">미군 특가는 USD 고정 요금입니다 · Flat USD rate, payable at the front desk</td>
              </tr>` : ''}
            </table>
          </td></tr>
        </table>
      </td></tr>

      <!-- ============================================ -->
      <!-- GUEST INFORMATION SECTION                    -->
      <!-- ============================================ -->
      <tr><td style="background-color: #ffffff; padding: 8px 40px 0 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td style="font-family: ${FONT_STACK}; font-size: 13px; font-weight: 700; color: #1a1a2e; letter-spacing: 2px; text-transform: uppercase; padding-bottom: 8px;">투숙객 정보 / Guest Information</td></tr>
          <tr><td style="border-bottom: 1px solid #d4af37; font-size: 0; line-height: 0; height: 1px;">&nbsp;</td></tr>
        </table>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family: ${FONT_STACK}; font-size: 14px;">
          <tr>
            <td style="padding: 14px 0; color: #888888; width: 45%; border-bottom: 1px solid #f0f0f0;">성명 / Name</td>
            <td style="padding: 14px 0; color: #1a1a2e; font-weight: 600; text-align: right; border-bottom: 1px solid #f0f0f0;">${esc(data.guestName)}</td>
          </tr>
          <tr>
            <td style="padding: 14px 0; color: #888888; border-bottom: 1px solid #f0f0f0;">연락처 / Phone</td>
            <td style="padding: 14px 0; color: #1a1a2e; text-align: right; border-bottom: 1px solid #f0f0f0;">${esc(data.guestPhone)}</td>
          </tr>
          <tr>
            <td style="padding: 14px 0; color: #888888; border-bottom: 1px solid #f0f0f0;">이메일 / Email</td>
            <td style="padding: 14px 0; color: #1a1a2e; text-align: right; border-bottom: 1px solid #f0f0f0;">${esc(data.guestEmail)}</td>
          </tr>
          ${data.specialRequests ? `<tr>
            <td style="padding: 14px 0; color: #888888; vertical-align: top;">요청사항 / Requests</td>
            <td style="padding: 14px 0; color: #1a1a2e; text-align: right;">${escMultiline(data.specialRequests)}</td>
          </tr>` : ''}
        </table>
      </td></tr>

      <!-- ============================================ -->
      <!-- NOTICE / IMPORTANT INFORMATION               -->
      <!-- ============================================ -->
      <tr><td style="background-color: #ffffff; padding: 24px 40px 8px 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fffbeb; border-left: 3px solid #d4af37;">
          <tr><td style="padding: 20px 22px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family: ${FONT_STACK}; font-size: 13px; color: #666666;">
              <tr><td style="font-weight: 700; color: #1a1a2e; padding-bottom: 14px; font-size: 12px; letter-spacing: 1px; text-transform: uppercase;">투숙 전 확인해 주세요 / Before Your Stay</td></tr>
              ${noticeKo.map((line) => NOTICE_ROW(line)).join('')}
              <tr><td style="padding-top: 10px; border-top: 1px solid #f0e8d0; font-size: 0; line-height: 0;">&nbsp;</td></tr>
              ${noticeEn.map((line) => NOTICE_ROW(line, true)).join('')}
            </table>
          </td></tr>
        </table>
      </td></tr>

      <!-- ============================================ -->
      <!-- DIRECT BOOKING PERKS                         -->
      <!-- ============================================ -->
      <tr><td style="background-color: #ffffff; padding: 8px 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f4f7f4; border-left: 3px solid #2e7d32;">
          <tr><td style="padding: 20px 22px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family: ${FONT_STACK}; font-size: 13px; color: #4a5a4a;">
              <tr><td style="font-weight: 700; color: #1f5c22; padding-bottom: 12px; font-size: 12px; letter-spacing: 1px; text-transform: uppercase;">홈페이지 예약 특전 / Direct Booking Perks</td></tr>
              <tr><td style="padding-bottom: 8px; line-height: 1.7;">&#8226;&nbsp; 투숙 기간 내내 <strong style="color:#1f5c22;">라운지 무료 이용</strong></td></tr>
              <tr><td style="padding-bottom: 8px; line-height: 1.7;">&#8226;&nbsp; 라운지 <strong style="color:#1f5c22;">커피 &amp; 아마드티 무제한 무료</strong> (체크인~체크아웃)</td></tr>
              <tr><td style="padding-bottom: 8px; line-height: 1.7;">&#8226;&nbsp; <strong style="color:#1f5c22;">회의실 대관 할인</strong> (요금은 프런트 문의)</td></tr>
              <tr><td style="padding-top: 8px; border-top: 1px solid #dbe6db; color: #8a9a8a; line-height: 1.7;">&#8226;&nbsp; Complimentary lounge access, free coffee &amp; tea, and discounted meeting room rental &mdash; because you booked with us directly.</td></tr>
            </table>
          </td></tr>
        </table>
      </td></tr>

      <!-- ============================================ -->
      <!-- GETTING HERE                                 -->
      <!-- ============================================ -->
      <tr><td style="background-color: #ffffff; padding: 16px 40px 8px 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td style="font-family: ${FONT_STACK}; font-size: 13px; font-weight: 700; color: #1a1a2e; letter-spacing: 2px; text-transform: uppercase; padding-bottom: 8px;">오시는 길 / Getting Here</td></tr>
          <tr><td style="border-bottom: 1px solid #d4af37; font-size: 0; line-height: 0; height: 1px;">&nbsp;</td></tr>
          <tr><td style="font-family: ${FONT_STACK}; font-size: 14px; color: #1a1a2e; padding-top: 14px; line-height: 1.7;">${esc(brand.contact.address.ko)}</td></tr>
          <tr><td style="font-family: ${FONT_STACK}; font-size: 12px; color: #888888; padding-top: 2px; line-height: 1.7;">${esc(brand.contact.address.en)}</td></tr>
          <tr><td style="font-family: ${FONT_STACK}; font-size: 13px; color: #555555; padding-top: 10px; line-height: 1.7;"><strong style="color:#1a1a2e;">평택역 1번 출구에서 도보 2분</strong> &nbsp;·&nbsp; 2 min walk from Pyeongtaek Station Exit 1</td></tr>
          <tr><td style="padding-top: 14px; padding-bottom: 6px;">
            <a href="${esc(mapUrl)}" style="font-family: ${FONT_STACK}; font-size: 13px; font-weight: 700; color: #1a1a2e; text-decoration: none; border-bottom: 2px solid #d4af37; padding-bottom: 2px;">지도에서 보기 / View on map &rarr;</a>
          </td></tr>
        </table>
      </td></tr>

      <!-- ============================================ -->
      <!-- FOOTER                                       -->
      <!-- ============================================ -->
      <tr><td style="background-color: #ffffff; padding: 0 40px 32px 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td style="border-top: 1px solid #e5e5e5; padding-top: 24px;" align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr><td align="center" style="font-family: ${FONT_STACK}; font-size: 13px; color: #555555; padding-bottom: 16px; line-height: 1.7;">
                변경이나 취소가 필요하시면 아래 번호로 연락 주세요.<br>
                <span style="color:#999999;">Need to change or cancel? Just give us a call.</span>
              </td></tr>
              <tr><td align="center" style="padding-bottom: 20px;">
                <a href="${esc(telHref(hotelPhone))}" style="display: inline-block; padding: 12px 32px; background-color: #1a1a2e; color: #d4af37; font-family: ${FONT_STACK}; font-size: 15px; font-weight: 700; text-decoration: none; letter-spacing: 1px;">${esc(hotelPhone)}</a>
              </td></tr>
              <tr><td align="center" style="font-family: Georgia, 'Times New Roman', serif; font-size: 14px; font-weight: 700; color: #1a1a2e; letter-spacing: 2px; padding-bottom: 8px;">STAY HOTEL in PYEONGTAEK</td></tr>
              <tr><td align="center" style="font-family: ${FONT_STACK}; font-size: 12px; color: #888888; padding-bottom: 4px;"><a href="${esc(mailtoHref(hotelEmail))}" style="color: #888888; text-decoration: none;">${esc(hotelEmail)}</a></td></tr>
              <tr><td align="center" style="font-family: ${FONT_STACK}; font-size: 12px; color: #888888; padding-bottom: 4px;">${esc(brand.contact.address.ko)}</td></tr>
              <tr><td align="center" style="font-family: ${FONT_STACK}; font-size: 11px; color: #aaaaaa; padding-top: 4px;">${esc(brand.contact.address.en)}</td></tr>
              <tr><td align="center" style="font-family: ${FONT_STACK}; font-size: 11px; color: #bbbbbb; padding-top: 16px; line-height: 1.6;">본 메일은 예약 확정 안내를 위해 발송된 발신 전용 메일입니다.<br>This is a booking confirmation; please do not reply to this address.</td></tr>
            </table>
          </td></tr>
        </table>
      </td></tr>

    </table>
    <!-- /Main Container -->

  </td></tr>
</table>
</body>
</html>`;

  try {
    await sendEmail({
      from: `${brandName} <${fromEmail}>`,
      to: data.guestEmail,
      subject: `예약이 확정되었습니다 · ${data.checkIn} 체크인 / Booking Confirmed — STAY HOTEL (${bookingId})`,
      html: guestHtml,
    });

    console.log(`Guest confirmation sent: ${bookingId} -> ${data.guestEmail}`);
    return { success: true };
  } catch (error) {
    console.error('Guest email send failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

/**
 * Phase 3: Send cancellation notification to GUEST
 *
 * 예약 취소 시 고객에게 취소 안내 이메일 발송
 * - 예약번호, 객실명, 체크인/아웃, 인원, 취소 시각, 문의 연락처 포함
 * - 이중 언어 (한국어 + English)
 */
export async function sendCancellationEmail(
  data: BookingFormData,
  bookingId: string,
  cancelledAt: string,
  finalAmount?: number,
): Promise<{ success: boolean; error?: string }> {
  const brand = getBrandConfig();
  const hotelEmail = brand.contact.email;
  const hotelPhone = brand.contact.phone;
  const brandName = brand.name.ko;
  const { roomName, roomNameEn, nights, priceText } = getBookingDetails(data, finalAmount);
  const fromEmail = process.env.EMAIL_FROM || 'noreply@pyeongtaekstay.com';
  const cancelDate = cancelledAt.split('T')[0];
  const cancelTime = cancelledAt.split('T')[1]?.substring(0, 5) || '';

  const cancelHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Cancelled - ${bookingId}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
  <tr><td align="center" style="padding: 32px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; width: 100%; border-collapse: collapse;">

      <!-- 헤더 -->
      <tr><td style="background-color: #1a1a2e; padding: 28px 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="font-family: Georgia, 'Times New Roman', serif; font-size: 20px; font-weight: 700; color: #d4af37; letter-spacing: 3px;">STAY HOTEL</td>
            <td align="right" style="font-family: ${FONT_STACK}; font-size: 10px; color: #8888a0; letter-spacing: 2px; text-transform: uppercase;">Booking Cancelled</td>
          </tr>
        </table>
      </td></tr>
      <!-- 빨간색 경고선 -->
      <tr><td style="background-color: #dc2626; height: 3px; font-size: 0; line-height: 0;">&nbsp;</td></tr>

      <!-- 취소 메시지 -->
      <tr><td style="background-color: #ffffff; padding: 32px 40px 24px 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td align="center" style="font-family: ${FONT_STACK}; font-size: 22px; font-weight: 700; color: #dc2626; padding-bottom: 8px;">예약이 취소되었습니다</td></tr>
          <tr><td align="center" style="font-family: ${FONT_STACK}; font-size: 13px; color: #888888; padding-bottom: 4px;">Your booking has been cancelled.</td></tr>
        </table>
      </td></tr>

      <!-- 예약번호 -->
      <tr><td style="background-color: #ffffff; padding: 0 40px 28px 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fef2f2; border-left: 4px solid #dc2626;">
          <tr><td style="padding: 20px 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td>
                  <span style="font-family: ${FONT_STACK}; font-size: 11px; color: #888888; letter-spacing: 1px;">예약번호 / Booking No.</span><br>
                  <span style="font-family: 'Courier New', Courier, monospace; font-size: 22px; font-weight: 700; color: #1a1a2e; letter-spacing: 1px;">${esc(bookingId)}</span>
                </td>
                <td align="right" style="vertical-align: bottom;">
                  <span style="font-family: ${FONT_STACK}; font-size: 11px; color: #dc2626;">취소일: ${esc(cancelDate)} ${esc(cancelTime)}</span>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </td></tr>

      <!-- 숙박 정보 -->
      <tr><td style="background-color: #ffffff; padding: 0 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td style="font-family: ${FONT_STACK}; font-size: 13px; font-weight: 700; color: #1a1a2e; letter-spacing: 2px; text-transform: uppercase; padding-bottom: 8px;">취소된 예약 정보 / Cancelled Booking Details</td></tr>
          <tr><td style="border-bottom: 1px solid #dc2626; font-size: 0; line-height: 0; height: 1px;">&nbsp;</td></tr>
        </table>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family: ${FONT_STACK}; font-size: 14px;">
          <tr>
            <td style="padding: 14px 0; color: #888888; width: 45%; border-bottom: 1px solid #f0f0f0;">객실 / Room</td>
            <td style="padding: 14px 0; color: #1a1a2e; font-weight: 600; text-align: right; border-bottom: 1px solid #f0f0f0;">${esc(roomName)}<br><span style="font-size: 12px; color: #888888; font-weight: 400;">${esc(roomNameEn)}</span></td>
          </tr>
          <tr>
            <td style="padding: 14px 0; color: #888888; border-bottom: 1px solid #f0f0f0;">체크인 / Check-in</td>
            <td style="padding: 14px 0; color: #1a1a2e; font-weight: 600; text-align: right; border-bottom: 1px solid #f0f0f0;">${esc(data.checkIn)}</td>
          </tr>
          <tr>
            <td style="padding: 14px 0; color: #888888; border-bottom: 1px solid #f0f0f0;">체크아웃 / Check-out</td>
            <td style="padding: 14px 0; color: #1a1a2e; font-weight: 600; text-align: right; border-bottom: 1px solid #f0f0f0;">${esc(data.checkOut)} (${nights}박 / ${nights} night${nights > 1 ? 's' : ''})</td>
          </tr>
          <tr>
            <td style="padding: 14px 0; color: #888888; border-bottom: 1px solid #f0f0f0;">인원 / Guests</td>
            <td style="padding: 14px 0; color: #1a1a2e; font-weight: 600; text-align: right; border-bottom: 1px solid #f0f0f0;">${esc(data.guestCount)}명</td>
          </tr>
          <tr>
            <td style="padding: 14px 0; color: #888888; border-bottom: 1px solid #f0f0f0;">금액 / Amount</td>
            <td style="padding: 14px 0; color: #888888; font-weight: 600; text-align: right; border-bottom: 1px solid #f0f0f0; text-decoration: line-through;">${esc(priceText)}</td>
          </tr>
        </table>
      </td></tr>

      <!-- 안내사항 -->
      <tr><td style="background-color: #ffffff; padding: 24px 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f9fafb; border-left: 3px solid #9ca3af;">
          <tr><td style="padding: 20px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family: ${FONT_STACK}; font-size: 13px; color: #666666;">
              <tr><td style="font-weight: 700; color: #1a1a2e; padding-bottom: 12px; font-size: 12px; letter-spacing: 1px; text-transform: uppercase;">안내사항 / Notice</td></tr>
              <tr><td style="padding-bottom: 6px; line-height: 1.6;">&#8226; 본 예약은 정상적으로 취소 처리되었습니다</td></tr>
              <tr><td style="padding-bottom: 6px; line-height: 1.6;">&#8226; 재예약을 원하시면 홈페이지를 이용해주세요</td></tr>
              <tr><td style="padding-bottom: 6px; line-height: 1.6;">&#8226; 문의사항은 호텔로 직접 연락해주세요</td></tr>
              <tr><td style="padding-top: 8px; border-top: 1px solid #e5e7eb; color: #888888; line-height: 1.6;">&#8226; This booking has been successfully cancelled</td></tr>
              <tr><td style="padding-bottom: 2px; color: #888888; line-height: 1.6;">&#8226; To rebook, please visit our website</td></tr>
              <tr><td style="color: #888888; line-height: 1.6;">&#8226; For inquiries, please contact the hotel directly</td></tr>
            </table>
          </td></tr>
        </table>
      </td></tr>

      <!-- 푸터 -->
      <tr><td style="background-color: #ffffff; padding: 0 40px 32px 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td style="border-top: 1px solid #e5e5e5; padding-top: 24px;" align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr><td align="center" style="font-family: Georgia, 'Times New Roman', serif; font-size: 14px; font-weight: 700; color: #1a1a2e; letter-spacing: 2px; padding-bottom: 8px;">STAY HOTEL in PYEONGTAEK</td></tr>
              <tr><td align="center" style="font-family: ${FONT_STACK}; font-size: 12px; color: #888888; padding-bottom: 4px;"><a href="${esc(telHref(hotelPhone))}" style="color:#888888;text-decoration:none;">${esc(hotelPhone)}</a> &nbsp;|&nbsp; <a href="${esc(mailtoHref(hotelEmail))}" style="color:#888888;text-decoration:none;">${esc(hotelEmail)}</a></td></tr>
              <tr><td align="center" style="font-family: ${FONT_STACK}; font-size: 12px; color: #888888; padding-bottom: 4px;">${esc(brand.contact.address.ko)}</td></tr>
              <tr><td align="center" style="font-family: ${FONT_STACK}; font-size: 11px; color: #aaaaaa; padding-top: 4px;">${esc(brand.contact.address.en)}</td></tr>
            </table>
          </td></tr>
        </table>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

  try {
    await sendEmail({
      from: `${brandName} <${fromEmail}>`,
      to: data.guestEmail,
      subject: `[STAY HOTEL] 예약 취소 안내 / Booking Cancelled - ${bookingId}`,
      html: cancelHtml,
    });

    console.log(`Cancellation email sent: ${bookingId} -> ${data.guestEmail}`);
    return { success: true };
  } catch (error) {
    console.error('Cancellation email send failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}
