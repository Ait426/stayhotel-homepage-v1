/**
 * HTML escaping helpers for server-rendered strings.
 *
 * Booking confirm/cancel pages and every outbound email template build raw HTML
 * from guest-supplied values (name, email, phone, requests). Without escaping, a
 * guest can inject markup that runs in hotel staff's browser or mail client.
 * Every interpolation of guest data must go through one of these.
 */

/** Escape a value for use in HTML text or a double-quoted attribute. */
export function esc(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escape for HTML text, converting newlines to <br> (for free-text fields). */
export function escMultiline(value: unknown): string {
  return esc(value).replace(/\r?\n/g, '<br>');
}

/**
 * Build a safe `mailto:` href. Returns '#' when the value is not a plausible
 * address, so a crafted value can never break out of the attribute.
 */
export function mailtoHref(email: unknown): string {
  const v = String(email ?? '').trim();
  return /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(v)
    ? `mailto:${encodeURIComponent(v)}`
    : '#';
}

/** Build a safe `tel:` href, keeping only digits and a leading '+'. */
export function telHref(phone: unknown): string {
  const v = String(phone ?? '').replace(/[^\d+]/g, '');
  return v.length >= 7 ? `tel:${v}` : '#';
}
