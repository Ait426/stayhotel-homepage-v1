/**
 * Admin Bookings API
 *
 * GET /api/admin/bookings
 * - Requires X-Admin-Key header (validated server-side)
 * - Lists all booking records from Cloudflare KV
 * - Falls back to in-memory store in local dev
 * - Returns bookings sorted by creation date (newest first)
 */

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { isAuthorized } from '@/lib/admin-auth';
import { memoryStore } from '@/lib/booking-store';

interface KVLike {
  get(key: string): Promise<string | null>;
  list(options?: { prefix?: string; cursor?: string; limit?: number }): Promise<{
    keys: { name: string }[];
    list_complete: boolean;
    cursor?: string;
  }>;
}

// Local-dev fallback backed by the *same* Map that booking-store writes to.
const memoryFallback: KVLike = {
  async get(key: string) { return memoryStore.get(key) ?? null; },
  async list(options?: { prefix?: string }) {
    const keys = Array.from(memoryStore.keys())
      .filter((k) => !options?.prefix || k.startsWith(options.prefix))
      .map((name) => ({ name }));
    return { keys, list_complete: true };
  },
};

function getStore(): KVLike {
  try {
    const ctx = getRequestContext();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const env = ctx.env as any;
    const kv = env.BOOKING_KV as KVLike | undefined;
    if (kv) return kv;
  } catch {
    // local dev — fall through
  }
  return memoryFallback;
}

export async function GET(request: NextRequest) {
  // --- Auth gate (server-side, env var, constant-time) ---
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const kv = getStore();

    // KV list()는 한 번에 최대 1000키만 돌려준다. 커서를 따라가지 않으면
    // 1001번째 예약부터 대시보드에서 조용히 사라진다.
    const keys: { name: string }[] = [];
    let cursor: string | undefined;
    do {
      const page = await kv.list({ prefix: 'booking:', cursor });
      keys.push(...page.keys);
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor && keys.length < 5000);

    // Fetch all booking values
    const bookings = await Promise.all(
      keys.map(async ({ name }) => {
        const raw = await kv.get(name);
        if (!raw) return null;
        try { return JSON.parse(raw); } catch { return null; }
      })
    );

    // Filter nulls, sort newest first
    const sorted = bookings
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ success: true, bookings: sorted });
  } catch (error) {
    console.error('[admin/bookings] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}
