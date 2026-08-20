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
 *
 * CF는 토큰 권한 부족이나 잘못된 zone에도 HTTP 200 + errors 배열로 응답한다.
 * 이걸 무시하면 화면에 0만 잔뜩 찍히고 원인을 알 수 없으므로 errors도 예외로 올린다.
 */
async function cfQuery(token: string, query: string): Promise<{ data: unknown }> {
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

  const json = (await res.json()) as { data?: unknown; errors?: { message?: string }[] };

  if (Array.isArray(json.errors) && json.errors.length > 0) {
    const messages = json.errors.map((e) => e?.message).filter(Boolean).join(' / ');
    throw new Error(messages || 'Cloudflare GraphQL 오류 (상세 메시지 없음)');
  }

  return { data: json.data };
}

export async function GET(request: NextRequest) {
  // --- admin 인증 ---
  const adminKey = request.headers.get('X-Admin-Key');
  const adminPassword = getEnv('ADMIN_PASSWORD');
  if (!adminPassword || adminKey !== adminPassword) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const cfToken = getEnv('CLOUDFLARE_API_TOKEN');
  const zoneId = getEnv('CLOUDFLARE_ZONE_ID');

  // 미설정은 '오류'가 아니라 '설정 필요' 상태 — 화면에서 안내를 띄울 수 있게 코드로 구분한다
  if (!cfToken || !zoneId) {
    const missing = [
      !cfToken ? 'CLOUDFLARE_API_TOKEN' : null,
      !zoneId ? 'CLOUDFLARE_ZONE_ID' : null,
    ].filter(Boolean) as string[];

    console.warn(`[cf-analytics] 환경변수 미설정: ${missing.join(', ')}`);

    return NextResponse.json(
      {
        success: false,
        code: 'not_configured',
        missing,
        error: `${missing.join(', ')} 미설정`,
      },
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
    // 핵심 지표라 실패를 숨기면 안 된다. 0으로 채워 보내면 '트래픽이 없다'로 오해된다.
    const message = err instanceof Error ? err.message : String(err);
    console.error('[cf-analytics] Series query failed:', message);
    return NextResponse.json(
      {
        success: false,
        code: 'cf_error',
        error: `Cloudflare 통계 조회 실패: ${message}`,
      },
      { status: 502 }
    );
  }

  // --- 쿼리 2: Top URLs (httpRequestsAdaptiveGroups — 요금제에 따라 미제공) ---
  // 이쪽은 실패해도 KPI/추이는 보여줄 수 있으므로 빈 배열로 넘어간다.
  let topUrls: { path: string; count: number }[] = [];
  let topUrlsError: string | null = null;

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
    topUrlsError = err instanceof Error ? err.message : String(err);
    console.error('[cf-analytics] Top URLs query failed (may not be available on this plan):', topUrlsError);
    // topUrls 빈 배열 유지 — KPI는 정상 반환한다
  }

  // --- 5분 캐시 ---
  const response = NextResponse.json({
    success: true,
    period,
    kpi,
    chart,
    topUrls,
    topUrlsError,
  });
  response.headers.set('Cache-Control', 'private, max-age=300');
  return response;
}
