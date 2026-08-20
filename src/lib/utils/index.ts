/**
 * Utility Functions
 *
 * Common helper functions used throughout the application
 */

import { Locale } from '@/types';

/**
 * Format currency in KRW
 */
export function formatCurrency(
  amount: number,
  locale: Locale = 'ko',
  showSymbol = true
): string {
  const localeMap: Record<string, string> = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', zh: 'zh-CN' };
  const formatted = amount.toLocaleString(localeMap[locale] || 'en-US');
  return showSymbol ? `₩${formatted}` : formatted;
}

/**
 * Format date based on locale
 */
export function formatDate(
  date: string | Date,
  locale: Locale = 'ko',
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  };

  const localeMap2: Record<string, string> = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', zh: 'zh-CN' };
  return dateObj.toLocaleDateString(
    localeMap2[locale] || 'en-US',
    defaultOptions
  );
}

/**
 * Format date range
 */
export function formatDateRange(
  checkIn: string | Date,
  checkOut: string | Date,
  locale: Locale = 'ko'
): string {
  const checkInStr = formatDate(checkIn, locale, { month: 'short', day: 'numeric' });
  const checkOutStr = formatDate(checkOut, locale, { month: 'short', day: 'numeric' });
  return `${checkInStr} - ${checkOutStr}`;
}

/**
 * Calculate number of nights between two dates
 */
export function calculateNights(checkIn: string | Date, checkOut: string | Date): number {
  const checkInDate = typeof checkIn === 'string' ? new Date(checkIn) : checkIn;
  const checkOutDate = typeof checkOut === 'string' ? new Date(checkOut) : checkOut;
  const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate total price
 */
export function calculateTotalPrice(
  pricePerNight: number,
  checkIn: string | Date,
  checkOut: string | Date
): number {
  const nights = calculateNights(checkIn, checkOut);
  return pricePerNight * nights;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get tomorrow's date in YYYY-MM-DD format
 */
export function getTomorrowString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

/**
 * Get date N days from now in YYYY-MM-DD format
 */
export function getDateFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate Korean phone number
 */
export function isValidKoreanPhone(phone: string): boolean {
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  // Check if it's a valid Korean phone number (10-11 digits)
  return /^(01[016789]|02|0[3-9]{1}[0-9]{1})\d{7,8}$/.test(digitsOnly);
}

/**
 * Format Korean phone number
 */
export function formatKoreanPhone(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, '');

  if (digitsOnly.length === 11) {
    return digitsOnly.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  }
  if (digitsOnly.length === 10) {
    if (digitsOnly.startsWith('02')) {
      return digitsOnly.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3');
    }
    return digitsOnly.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  }

  return phone;
}

/**
 * Generate a URL-friendly slug
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Strip HTML tags from string
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => func(...args), wait);
  };
}

/**
 * Classnames utility (simple version of clsx/classnames)
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Get locale-aware text from an object with ko/en keys
 */
export function getLocalizedText(
  obj: Record<string, string>,
  locale: Locale
): string {
  return obj[locale] || obj.en || obj.ko;
}

/**
 * Sleep utility for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * HTML 이스케이프
 *
 * 사용자 입력(고객명, 요청사항 등)을 HTML 문자열 템플릿에 넣기 전 반드시 통과시킨다.
 * 이메일 본문과 API 라우트가 반환하는 HTML 페이지는 React가 아니라 문자열 보간으로
 * 만들어지므로 자동 이스케이프가 없다. 속성값 안에 들어가는 경우까지 고려해
 * 따옴표도 함께 변환한다.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 여러 줄 사용자 입력용 HTML 이스케이프 (줄바꿈을 <br>로 보존)
 */
export function escapeHtmlMultiline(value: unknown): string {
  return escapeHtml(value).replace(/\r?\n/g, '<br>');
}
