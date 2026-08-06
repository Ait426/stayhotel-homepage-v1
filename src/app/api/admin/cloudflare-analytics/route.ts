/**
 * Cloudflare Analytics API Route (서버 전용)
 *
 * GET /api/admin/cloudflare-analytics?period=24h
 * - Admin auth (X-Admin-Key)
 * - Cloudflare GraphQL API를 서버에서만 호출
 * - CLOUDFLARE_API_TOKEN / CLOUDFLARE_ZONE_ID 필요
 * - 브라우저에 CF 토큰 노출 없음
 */

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { isAuthorized } from '@/lib/admin-auth';

function getEnv(key: string): string {
  try {
    const ctx = getRequestContext();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const val = (ctx.env as any)[key] as string | undefined;
    if (val) return val;
  } catch {
    // local dev — fall through
  }
  return process.env[key] || '';
}

const CF_GRAPHQL = 'https://api.cloudflare.com/client/v4/graphql';

/**
 * Cloudflare GraphQL 호출 헬퍼
 */
async function cfQuery(token: string, query: string): Promise<{ data: unknown; errors?: unknown[] }> {
  const res = await fetch(CF_GRAPHQL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudflare API ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json();
}

export async function GET(request: NextRequest) {
  // --- admin 인증 (constant-time 비교) ---
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const cfToken = getEnv('CLOUDFLARE_API_TOKEN');
  const zoneId = getEnv('CLOUDFLARE_ZONE_ID');

  if (!cfToken || !zoneId) {
    return NextResponse.json(
      { success: false, error: 'CLOUDFLARE_API_TOKEN 또는 CLOUDFLARE_ZONE_ID 미설정' },
      { status: 503 }
    );
  }

  // --- 기간 계산 ---
  const period = request.nextUrl.searchParams.get('period') || '24h';
  const now = new Date();
  let since: Date;

  switch (period) {
    case '7d':
      since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  const sinceISO = since.toISOString();
  const untilISO = now.toISOString();

  // --- 쿼리 1: KPI + 시간대별 추이 (httpRequests1hGroups — 모든 플랜 사용 가능) ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let kpi = { requests: 0, pageViews: 0, bytes: 0, uniques: 0 };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let chart: { time: string; requests: number }[] = [];

  try {
    const seriesQuery = `{
      viewer {
        zones(filter: {zoneTag: "${zoneId}"}) {
          httpRequests1hGroups(
            filter: {datetime_geq: "${sinceISO}", datetime_lt: "${untilISO}"}
            orderBy: [datetime_ASC]
            limit: 720
          ) {
            dimensions { datetime }
            sum { requests bytes pageViews }
            uniq { uniques }
          }
        }
      }
    }`;

    const result = await cfQuery(cfToken, seriesQuery);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const zones = (result.data as any)?.viewer?.zones;
    if (zones && zones.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const series = zones[0].httpRequests1hGroups || [];

      let totalRequests = 0;
      let totalPageViews = 0;
      let totalBytes = 0;
      let totalUniques = 0;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const point of series) {
        totalRequests += point.sum?.requests || 0;
        totalPageViews += point.sum?.pageViews || 0;
        totalBytes += point.sum?.bytes || 0;
        totalUniques += point.uniq?.uniques || 0;
      }

      kpi = { requests: totalRequests, pageViews: totalPageViews, bytes: totalBytes, uniques: totalUniques };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chart = series.map((p: any) => ({
        time: p.dimensions.datetime,
        requests: p.sum?.requests || 0,
      }));
    }
  } catch (err) {
    console.error('[cf-analytics] Series query failed:', err);
    // KPI/chart는 기본값(0) 유지, 에러 시에도 계속 진행
  }

  // --- 쿼리 2: Top URLs (httpRequestsAdaptiveGroups — 실패 시 빈 배열) ---
  let topUrls: { path: string; count: number }[] = [];

  try {
    const topQuery = `{
      viewer {
        zones(filter: {zoneTag: "${zoneId}"}) {
          httpRequestsAdaptiveGroups(
            filter: {datetime_geq: "${sinceISO}", datetime_lt: "${untilISO}"}
            orderBy: [count_DESC]
            limit: 5
          ) {
            count
            dimensions { clientRequestPath }
          }
        }
      }
    }`;

    const result = await cfQuery(cfToken, topQuery);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const zones = (result.data as any)?.viewer?.zones;
    if (zones && zones.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = zones[0].httpRequestsAdaptiveGroups || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      topUrls = items.map((item: any) => ({
        path: item.dimensions?.clientRequestPath || '(unknown)',
        count: item.count || 0,
      }));
    }
  } catch (err) {
    console.error('[cf-analytics] Top URLs query failed (may not be available on this plan):', err);
    // topUrls 빈 배열 유지
  }

  // --- 5분 캐시 ---
  const response = NextResponse.json({
    success: true,
    period,
    kpi,
    chart,
    topUrls,
  });
  response.headers.set('Cache-Control', 'private, max-age=300');
  return response;
}
