'use client';

/**
 * Admin Dashboard — Front Desk Booking Viewer
 *
 * Password-gated. Password is validated server-side via the API.
 * Displays all bookings in a dense spreadsheet-style table.
 */

import { useState, useCallback, useEffect, Fragment } from 'react';
import { getRoomById } from '@/config/rooms';
import { MILITARY_FIXED_RATE_USD } from '@/config/events';

interface PricingSnapshot {
  baseAmount: number;
  extraGuestCount: number;
  extraGuestFeeUnit: number;
  extraGuestFeeTotal: number;
  discountAmount: number;
  finalAmount: number;
  nights: number;
}

interface BookingRecord {
  bookingId: string;
  token: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
  agreedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  cancelledBy?: 'hotel' | 'customer' | 'admin';
  appliedPromo?: string | null;
  finalAmount?: number | null;
  pricing?: PricingSnapshot | null;
  formData: {
    roomId: string;
    checkIn: string;
    checkOut: string;
    guestCount: number;
    reservationType: string;
    transportation: string;
    guestName: string;
    guestEmail: string;
    guestPhone: string;
    specialRequests?: string;
  };
}

type StatusFilter = 'all' | 'pending' | 'confirmed' | 'cancelled';
type AnalyticsPeriod = '24h' | '7d' | '30d';

interface AnalyticsData {
  kpi: { requests: number; pageViews: number; bytes: number; uniques: number };
  chart: { time: string; requests: number }[];
  topUrls: { path: string; count: number }[];
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(1)} KB`;
  return `${bytes} B`;
}

/**
 * 시간대별 데이터를 차트 바로 집계
 * 24h → 시간별, 7d/30d → 일별
 */
function aggregateChart(data: { time: string; requests: number }[], period: string): { label: string; value: number }[] {
  if (period === '24h') {
    return data.map(d => ({
      label: new Date(d.time).toLocaleTimeString('ko', { hour: '2-digit', hour12: false }),
      value: d.requests,
    }));
  }
  const daily = new Map<string, number>();
  for (const d of data) {
    const day = d.time.slice(0, 10);
    daily.set(day, (daily.get(day) || 0) + d.requests);
  }
  return Array.from(daily.entries()).map(([day, value]) => ({
    label: day.slice(5),
    value,
  }));
}

/**
 * 추가 인원 정보 — snapshot 우선, 없으면 config/rooms.ts 기준으로 재계산
 *
 * 객실명·기준가·기준인원·추가요금 단가는 전부 config/rooms.ts가 단일 출처다.
 * 여기에 값을 복제해두면 요금을 바꿀 때 admin만 옛 숫자를 보여주게 된다 (2026-08-20 수정).
 */
function getExtraGuestInfo(b: BookingRecord): { extraCount: number; fee: number; unit: number; nights: number } | null {
  // snapshot이 있으면 snapshot에서 직접 읽기
  if (b.pricing && b.pricing.extraGuestCount > 0) {
    return { extraCount: b.pricing.extraGuestCount, fee: b.pricing.extraGuestFeeTotal, unit: b.pricing.extraGuestFeeUnit, nights: b.pricing.nights };
  }
  // fallback: 객실 설정에서 재계산
  const room = getRoomById(b.formData.roomId);
  if (!room) return null;
  const baseGuests = room.baseGuests ?? room.maxGuests;
  const extraCount = Math.max(0, b.formData.guestCount - baseGuests);
  if (extraCount === 0) return null;
  const unit = room.extraGuestFee || 0;
  const nights = calculateNights(b.formData.checkIn, b.formData.checkOut);
  return { extraCount, fee: extraCount * unit * nights, unit, nights };
}

function formatDateTime(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
}

function calculateNights(checkIn: string, checkOut: string): number {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Smart currency display:
 * - military_fixed → 저장된 USD 금액 (요금 변경 시 과거 예약이 소급되지 않도록)
 * - KRW finalAmount → "63,000원"
 * - Missing finalAmount (legacy) → fallback to base price estimate
 */
function formatDisplayPrice(b: BookingRecord): { text: string; isFallback: boolean } {
  // Military fixed rate: always USD — 예약 시점에 저장된 금액을 쓴다
  if (b.appliedPromo === 'military_fixed') {
    const stored = b.pricing?.finalAmount ?? b.finalAmount;
    if (stored != null && stored > 0) return { text: `$${stored.toLocaleString()}`, isFallback: false };
    const nights = calculateNights(b.formData.checkIn, b.formData.checkOut);
    return { text: `$${MILITARY_FIXED_RATE_USD * nights}`, isFallback: true };
  }
  // Has finalAmount from frontend → KRW with comma
  if (b.finalAmount != null && b.finalAmount > 0) {
    return { text: `${b.finalAmount.toLocaleString()}원`, isFallback: false };
  }
  // Fallback for legacy data: estimate from base price (평일 기준가)
  const basePrice = getRoomById(b.formData.roomId)?.pricePerNight;
  if (basePrice) {
    const nights = calculateNights(b.formData.checkIn, b.formData.checkOut);
    return { text: `${(basePrice * nights).toLocaleString()}원`, isFallback: true };
  }
  return { text: '-', isFallback: false };
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [cancellingToken, setCancellingToken] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // --- Cloudflare 통계 ---
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsPeriod>('24h');
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  const fetchBookings = useCallback(async (pw: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/bookings', {
        headers: { 'X-Admin-Key': pw },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || '인증 실패');
        setAuthenticated(false);
        return;
      }
      setAuthenticated(true);
      setBookings(data.bookings || []);
    } catch {
      setError('서버 연결 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAnalytics = useCallback(async (pw: string, period: AnalyticsPeriod) => {
    setAnalyticsLoading(true);
    setAnalyticsError('');
    try {
      const res = await fetch(`/api/admin/cloudflare-analytics?period=${period}`, {
        headers: { 'X-Admin-Key': pw },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setAnalyticsError(data.error || '통계 로드 실패');
        setAnalyticsData(null);
        return;
      }
      setAnalyticsData({ kpi: data.kpi, chart: data.chart, topUrls: data.topUrls });
    } catch {
      setAnalyticsError('통계 서버 연결 실패');
      setAnalyticsData(null);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  // 로그인 성공 후 또는 기간 변경 시 통계 fetch
  useEffect(() => {
    if (authenticated && password) {
      fetchAnalytics(password, analyticsPeriod);
    }
  }, [authenticated, analyticsPeriod, password, fetchAnalytics]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBookings(password);
  };

  const handleRefresh = () => {
    fetchBookings(password);
  };

  const handleCancel = async (token: string, bookingId: string) => {
    if (!confirm(`예약 ${bookingId}을(를) 취소하시겠습니까?\n취소 시 고객에게 취소 메일이 발송됩니다.`)) return;

    setCancellingToken(token);
    try {
      const res = await fetch('/api/booking-cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': password,
        },
        body: JSON.stringify({ token, cancelledBy: 'admin' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(`취소 실패: ${data.error || '알 수 없는 오류'}`);
        return;
      }
      if (data.alreadyCancelled) {
        alert('이미 취소된 예약입니다.');
      } else {
        alert(`예약 ${bookingId} 취소 완료`);
      }
      fetchBookings(password);
    } catch {
      alert('서버 연결 실패');
    } finally {
      setCancellingToken(null);
    }
  };

  const filteredBookings = statusFilter === 'all'
    ? bookings
    : bookings.filter(b => b.status === statusFilter);

  const statusCounts = {
    all: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  };

  // --- Login Gate ---
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 w-full max-w-sm">
          <h1 className="text-lg font-bold text-slate-800 mb-1">STAY HOTEL ADMIN</h1>
          <p className="text-xs text-slate-500 mb-6">예약 관리 대시보드</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 입력"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 mb-3"
            autoFocus
          />
          {error && <p className="text-red-600 text-xs mb-3">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 bg-slate-900 text-white text-sm tracking-wider uppercase rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            {loading ? '확인 중...' : '로그인'}
          </button>
        </form>
      </div>
    );
  }

  // --- Dashboard ---
  return (
    <div className="min-h-screen mt-[80px] pb-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      {/* Admin Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm rounded-xl px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">예약 관리 대시보드</h1>
          <p className="text-xs text-slate-500 mt-0.5">STAY HOTEL ADMIN &middot; 총 <span className="font-semibold text-slate-700">{bookings.length}</span>건</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium border border-slate-300 text-slate-700 bg-white rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-colors disabled:opacity-50"
          >
            {loading ? '로딩...' : '새로고침'}
          </button>
          <button
            onClick={() => { setAuthenticated(false); setPassword(''); setBookings([]); }}
            className="px-4 py-2 text-xs font-medium border border-slate-300 text-slate-700 bg-white rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* ============================================ */}
      {/* Cloudflare 사이트 통계 (접이식)             */}
      {/* ============================================ */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl mt-3 overflow-hidden">
        {/* 토글 바 */}
        <button
          onClick={() => setAnalyticsOpen(prev => !prev)}
          className="w-full px-6 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
            <span className="text-sm font-medium text-slate-700">사이트 통계</span>
            {analyticsLoading && <span className="text-[10px] text-slate-400 animate-pulse">로딩...</span>}
          </div>
          <div className="flex items-center gap-3">
            {/* 기간 선택 (토글 바 안에 배치) */}
            {analyticsOpen && (
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                {(['24h', '7d', '30d'] as AnalyticsPeriod[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setAnalyticsPeriod(p)}
                    className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                      analyticsPeriod === p ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
            <svg className={`w-4 h-4 text-slate-400 transition-transform ${analyticsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>
        </button>

        {/* 통계 본문 */}
        {analyticsOpen && (
          <div className="px-6 pb-5 border-t border-slate-100">
            {analyticsError ? (
              <p className="text-xs text-slate-400 py-4 text-center">{analyticsError}</p>
            ) : !analyticsData ? (
              <p className="text-xs text-slate-400 py-4 text-center animate-pulse">통계 로딩 중...</p>
            ) : (
              <>
                {/* KPI 카드 4개 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  {[
                    { label: 'Requests', value: formatNum(analyticsData.kpi.requests), sub: analyticsPeriod },
                    { label: 'Page Views', value: formatNum(analyticsData.kpi.pageViews), sub: analyticsPeriod },
                    { label: 'Visitors', value: formatNum(analyticsData.kpi.uniques), sub: 'unique' },
                    { label: 'Bandwidth', value: formatBytes(analyticsData.kpi.bytes), sub: 'transfer' },
                  ].map(({ label, value, sub }) => (
                    <div key={label} className="bg-slate-50 rounded-lg px-4 py-3">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</div>
                      <div className="text-lg font-bold text-slate-800 mt-0.5">{value}</div>
                      <div className="text-[10px] text-slate-400">{sub}</div>
                    </div>
                  ))}
                </div>

                {/* 요청 추이 바 차트 */}
                {analyticsData.chart.length > 0 && (() => {
                  const bars = aggregateChart(analyticsData.chart, analyticsPeriod);
                  const maxVal = Math.max(...bars.map(b => b.value), 1);
                  return (
                    <div className="mt-4">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Requests 추이</div>
                      <div className="flex items-end gap-[2px] h-20">
                        {bars.map((bar, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-blue-400 rounded-t-sm min-w-[2px] hover:bg-blue-500 transition-colors"
                            style={{ height: `${Math.max((bar.value / maxVal) * 100, 1)}%` }}
                            title={`${bar.label}: ${bar.value.toLocaleString()}`}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[9px] text-slate-400">{bars[0]?.label}</span>
                        <span className="text-[9px] text-slate-400">{bars[bars.length - 1]?.label}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Top URLs */}
                {analyticsData.topUrls.length > 0 && (
                  <div className="mt-4">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Top URLs</div>
                    <div className="space-y-1">
                      {analyticsData.topUrls.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-slate-600 truncate max-w-[70%]">{item.path}</span>
                          <span className="text-slate-400 font-mono">{item.count.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* 상태 필터 */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl px-6 py-3 mt-3 flex items-center gap-2 flex-wrap">
        {([
          { key: 'all' as StatusFilter, label: '전체', color: 'slate' },
          { key: 'pending' as StatusFilter, label: '대기', color: 'amber' },
          { key: 'confirmed' as StatusFilter, label: '확정', color: 'green' },
          { key: 'cancelled' as StatusFilter, label: '취소', color: 'red' },
        ]).map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              statusFilter === key
                ? color === 'slate' ? 'bg-slate-900 text-white'
                : color === 'amber' ? 'bg-amber-500 text-white'
                : color === 'green' ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {label} ({statusCounts[key]})
          </button>
        ))}
      </div>

      {/* Table Container — compact 10컬럼 + expandable detail + sticky action */}
      <div className="mt-5 overflow-x-auto bg-white shadow-sm rounded-xl border border-slate-200">
        {filteredBookings.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            {statusFilter === 'all' ? '예약 내역이 없습니다.' : `${statusFilter === 'pending' ? '대기' : statusFilter === 'confirmed' ? '확정' : '취소'} 상태의 예약이 없습니다.`}
          </div>
        ) : (
          <table className="w-full text-xs border-collapse min-w-[960px]">
            <thead>
              <tr className="bg-slate-800 text-white text-left">
                <th className="px-3 py-2.5 font-medium whitespace-nowrap">상태</th>
                <th className="px-3 py-2.5 font-medium whitespace-nowrap">예약번호</th>
                <th className="px-3 py-2.5 font-medium whitespace-nowrap">예약일시</th>
                <th className="px-3 py-2.5 font-medium whitespace-nowrap">고객명</th>
                <th className="px-3 py-2.5 font-medium whitespace-nowrap">체크인/아웃</th>
                <th className="px-3 py-2.5 font-medium whitespace-nowrap">룸 타입</th>
                <th className="px-3 py-2.5 font-medium whitespace-nowrap text-center">인원</th>
                <th className="px-3 py-2.5 font-medium whitespace-nowrap text-right">추가요금</th>
                <th className="px-3 py-2.5 font-medium whitespace-nowrap text-right">결제금액</th>
                <th className="px-3 py-2.5 font-medium whitespace-nowrap text-center sticky right-0 z-20 bg-slate-800" style={{ boxShadow: '-4px 0 8px -4px rgba(0,0,0,0.15)' }}>액션</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((b, idx) => {
                const isExpanded = expandedId === b.bookingId;
                const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';
                return (
                  <Fragment key={b.bookingId}>
                    <tr
                      className={`border-b border-slate-100 hover:bg-blue-50/40 transition-colors cursor-pointer select-none ${b.status === 'cancelled' ? 'opacity-50' : ''} ${rowBg}`}
                      onClick={() => setExpandedId(prev => prev === b.bookingId ? null : b.bookingId)}
                    >
                      {/* 상태 + 펼침 표시 */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <svg className={`w-3 h-3 text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                          <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                            b.status === 'confirmed' ? 'bg-green-100 text-green-800' : b.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {b.status === 'confirmed' ? '확정' : b.status === 'cancelled' ? '취소' : '대기'}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 font-mono whitespace-nowrap text-slate-600">{b.bookingId}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-500">{formatDateTime(b.createdAt)}</td>
                      <td className="px-3 py-2 font-medium whitespace-nowrap text-slate-900">{b.formData.guestName}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-600">{b.formData.checkIn} ~ {b.formData.checkOut}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-700">{getRoomById(b.formData.roomId)?.nameKo || b.formData.roomId}</td>
                      <td className="px-3 py-2 text-center whitespace-nowrap text-slate-600">{b.formData.guestCount}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-right">
                        {(() => {
                          const extra = getExtraGuestInfo(b);
                          if (!extra) return <span className="text-slate-400">-</span>;
                          return <span className="text-orange-600 font-medium">+{extra.fee.toLocaleString()}원</span>;
                        })()}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right font-medium">
                        {(() => {
                          const { text, isFallback } = formatDisplayPrice(b);
                          if (text === '-') return <span className="text-slate-400">-</span>;
                          if (b.appliedPromo === 'military_fixed') return <span className="text-blue-700 font-bold">{text}</span>;
                          if (isFallback) return <span className="text-slate-400" title="추정치">{text}</span>;
                          return <span className="text-slate-700">{text}</span>;
                        })()}
                      </td>
                      {/* Sticky 액션 컬럼 */}
                      <td
                        className={`px-3 py-2 whitespace-nowrap text-center sticky right-0 z-10 ${rowBg}`}
                        style={{ boxShadow: '-4px 0 8px -4px rgba(0,0,0,0.08)' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {b.status !== 'cancelled' ? (
                          <button
                            onClick={() => handleCancel(b.token, b.bookingId)}
                            disabled={cancellingToken === b.token}
                            className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-red-300 text-red-600 bg-white hover:bg-red-50 hover:border-red-400 transition-colors disabled:opacity-50"
                          >
                            {cancellingToken === b.token ? '처리중...' : '취소'}
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                    {/* 펼침 상세 영역 */}
                    {isExpanded && (
                      <tr className={rowBg}>
                        <td colSpan={10} className="px-6 py-4 border-b border-slate-200">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-3 text-xs">
                            <div>
                              <span className="text-slate-400 block">이메일</span>
                              <span className="text-slate-700 mt-0.5 block">{b.formData.guestEmail}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">연락처</span>
                              <span className="text-slate-700 mt-0.5 block">{b.formData.guestPhone}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">예약유형</span>
                              <span className="text-slate-700 mt-0.5 block">{b.formData.reservationType === 'military' ? '군인' : b.formData.reservationType === 'corporate' ? '기업체' : '일반'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">방문방법</span>
                              <span className="text-slate-700 mt-0.5 block">{b.formData.transportation === 'car' ? '차량' : '도보'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">프로모션</span>
                              <span className="text-slate-700 mt-0.5 block">{b.appliedPromo ? (b.appliedPromo === 'military_fixed' ? 'US Military' : b.appliedPromo === 'longstay_15' ? '연박15%' : b.appliedPromo === 'longstay_10' ? '연박10%' : b.appliedPromo) : '-'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">군인할인</span>
                              <span className="text-slate-700 mt-0.5 block">{b.formData.reservationType === 'military' ? 'YES' : '-'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">정책동의</span>
                              <span className="text-slate-700 mt-0.5 block">{b.agreedAt ? formatDateTime(b.agreedAt) : '-'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">취소일시</span>
                              <span className={`mt-0.5 block ${b.cancelledAt ? 'text-red-600' : 'text-slate-700'}`}>{b.cancelledAt ? formatDateTime(b.cancelledAt) : '-'}</span>
                            </div>
                            {(() => {
                              const extra = getExtraGuestInfo(b);
                              if (!extra) return null;
                              return (
                                <div>
                                  <span className="text-slate-400 block">추가요금 상세</span>
                                  <span className="text-orange-600 mt-0.5 block">{extra.extraCount}명 × {extra.nights}박 × ₩{extra.unit.toLocaleString()}/인/박</span>
                                </div>
                              );
                            })()}
                            {b.formData.specialRequests && (
                              <div className="col-span-2 md:col-span-4">
                                <span className="text-slate-400 block">요청사항</span>
                                <span className="text-slate-700 mt-0.5 block">{b.formData.specialRequests}</span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
