/**
 * Admin API authentication.
 *
 * The dashboard sends the shared password in an `X-Admin-Key` header on every
 * request. Comparison is constant-time so response latency cannot be used to
 * recover the secret one character at a time.
 */

import { getRequestContext } from '@cloudflare/next-on-pages';

/**
 * Read ADMIN_PASSWORD. Cloudflare Pages exposes bindings through the request
 * context; `process.env` is the local-dev path.
 */
export function getAdminPassword(): string {
  try {
    const ctx = getRequestContext();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pw = (ctx.env as any).ADMIN_PASSWORD as string | undefined;
    if (pw) return pw;
  } catch {
    // local dev — fall through to process.env
  }
  return process.env.ADMIN_PASSWORD || '';
}

/** Constant-time string comparison (Web Crypto is unavailable for this on edge). */
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ba = enc.encode(a);
  const bb = enc.encode(b);
  // Fold the length difference into the result instead of returning early.
  let diff = ba.length ^ bb.length;
  const len = Math.max(ba.length, bb.length);
  for (let i = 0; i < len; i++) {
    diff |= (ba[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

/**
 * Verify the `X-Admin-Key` header. Fails closed when ADMIN_PASSWORD is unset,
 * so a misconfigured deployment never exposes the dashboard.
 */
export function isAuthorized(request: Request): boolean {
  const adminPassword = getAdminPassword();
  if (!adminPassword) return false;
  const key = request.headers.get('X-Admin-Key');
  if (!key) return false;
  return timingSafeEqual(key, adminPassword);
}
