/**
 * Admin Bookings API
 *
 * GET /api/admin/bookings
 * - Requires X-Admin-Key header (validated server-side)
 * - Lists all booking records from Cloudflare KV
 * - Falls back to in-memory store in local dev
 * - Returns bookings sorted by creation date (newest first)
 *
 * 조회는 booking-store의 listAllBookings()에 위임한다.
 * 여기서 스토어 폴백을 다시 구현하면 booking-store와 다른 Map을 보게 되어
 * 로컬 개발에서 목록이 항상 비어 보인다 (2026-08-20 수정).
 */

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { listAllBookings } from '@/lib/booking-store';

function getAdminPassword(): string {
  // Cloudflare Pages: env vars via getRequestContext().env
  try {
    const ctx = getRequestContext();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pw = (ctx.env as any).ADMIN_PASSWORD as string | undefined;
    if (pw) return pw;
  } catch {
    // local dev — fall through
  }
  // Fallback: process.env (next dev / .env.local)
  return process.env.ADMIN_PASSWORD || '';
}

export async function GET(request: NextRequest) {
  // --- Auth gate (server-side, env var) ---
  const key = request.headers.get('X-Admin-Key');
  const adminPassword = getAdminPassword();
  if (!adminPassword || key !== adminPassword) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const bookings = await listAllBookings();
    return NextResponse.json({ success: true, bookings });
  } catch (error) {
    console.error('[admin/bookings] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}
