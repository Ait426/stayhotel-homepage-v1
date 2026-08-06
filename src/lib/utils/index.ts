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
 * The hotel's calendar day. Dates must be resolved in Asia/Seoul, not UTC:
 * `toISOString()` returns the previous day between 00:00 and 09:00 KST, which
 * made the booking bar default to a check-in date already in the past.
 *
 * Using an explicit time zone also keeps the server render and the client
 * hydration in agreement regardless of where either one runs.
 */
export const HOTEL_TIME_ZONE = 'Asia/Seoul';

/** en-CA formats as YYYY-MM-DD, which is exactly the wire format we use. */
const seoulDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: HOTEL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Get today's date at the hotel, in YYYY-MM-DD format.
 */
export function getTodayString(): string {
  return seoulDateFormatter.format(new Date());
}

/**
 * Get date N days from today (hotel time), in YYYY-MM-DD format.
 */
export function getDateFromNow(days: number): string {
  // Shift by whole days on the already-localised date so DST/offset changes
  // can't push the result onto the wrong calendar day.
  const [y, m, d] = getTodayString().split('-').map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  return shifted.toISOString().split('T')[0];
}

/**
 * Get tomorrow's date in YYYY-MM-DD format
 */
export function getTomorrowString(): string {
  return getDateFromNow(1);
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
