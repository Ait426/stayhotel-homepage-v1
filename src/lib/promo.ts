/**
 * Promotion eligibility — single source of truth, enforced server-side.
 *
 * The client sends a promo code it picked up from an Events-page CTA query
 * param. That value is a *request*, never a grant: this module decides which
 * promo (if any) actually applies, and callers must write the resolved value
 * back onto the booking so the stored record, the guest email and the admin
 * table can never disagree with the amount that was charged.
 */

export type PromoCode = 'longstay_10' | 'longstay_15' | 'military_fixed';

export type Currency = 'KRW' | 'USD';

/** Flat nightly rate for the US Military offer, in USD. */
export const MILITARY_NIGHTLY_USD = 64;

const KNOWN: readonly PromoCode[] = ['longstay_10', 'longstay_15', 'military_fixed'];

export interface PromoContext {
  nights: number;
  reservationType: string;
}

export interface ResolvedPromo {
  /** The promo that actually applies, or null. */
  promo: PromoCode | null;
  /** Currency the final amount is denominated in. */
  currency: Currency;
  /** Human-readable reason the requested promo was refused, for logging. */
  rejectedReason: string | null;
}

/**
 * Decide which promo applies. Requesting an ineligible promo is not an error —
 * it simply resolves to no discount, and the caller records the rejection.
 */
export function resolvePromo(
  requested: unknown,
  { nights, reservationType }: PromoContext
): ResolvedPromo {
  const none: ResolvedPromo = { promo: null, currency: 'KRW', rejectedReason: null };

  if (requested === null || requested === undefined || requested === '') return none;

  if (typeof requested !== 'string' || !KNOWN.includes(requested as PromoCode)) {
    return { ...none, rejectedReason: `unknown promo code: ${String(requested).slice(0, 40)}` };
  }

  const promo = requested as PromoCode;

  switch (promo) {
    case 'military_fixed':
      // The offer is for US service members and their immediate family. Booking
      // type must say so; a valid military ID is checked at the front desk.
      if (reservationType !== 'military') {
        return { ...none, rejectedReason: 'military_fixed requires reservationType "military"' };
      }
      return { promo, currency: 'USD', rejectedReason: null };

    case 'longstay_15':
      if (nights < 7) {
        return { ...none, rejectedReason: `longstay_15 requires 7+ nights (got ${nights})` };
      }
      return { promo, currency: 'KRW', rejectedReason: null };

    case 'longstay_10':
      if (nights < 2) {
        return { ...none, rejectedReason: `longstay_10 requires 2+ nights (got ${nights})` };
      }
      return { promo, currency: 'KRW', rejectedReason: null };
  }
}

/** Currency implied by a stored promo code. */
export function currencyForPromo(promo: string | null | undefined): Currency {
  return promo === 'military_fixed' ? 'USD' : 'KRW';
}

/**
 * Format an amount in the currency the booking was priced in.
 * Military bookings are quoted in USD; everything else in KRW.
 */
export function formatAmount(amount: number, currency: Currency): string {
  if (currency === 'USD') return `$${amount.toLocaleString('en-US')}`;
  return `₩${amount.toLocaleString('ko-KR')}`;
}
