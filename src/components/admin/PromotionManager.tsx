'use client';

/**
 * admin 프로모션 관리 — 문구·노출 편집 · 할인 조건 편집 · 새 프로모션 추가 · 기간 자동 적용
 *
 * 저장은 /api/admin/promotions (KV). 저장 후에는 반드시 다시 불러와 서버 값과 대조한다
 * — "저장되었습니다" 메시지만 믿지 않는다 (RateManager와 같은 흐름).
 * 이미 접수된 예약은 저장된 가격 snapshot을 쓰므로 영향이 없다.
 */

import { useState, useEffect, useCallback } from 'react';
import { Locale, ReservationType } from '@/types';
import { rooms, getRoomName } from '@/config/rooms';
import {
  Promotion, PromotionConfig, PromoBenefit, PromoStatus, L10n,
  PROMO_IMAGES, LOCALES, RESERVATION_TYPES, MAX_PROMOTIONS,
  emptyL10n, emptyL10nList, pickL10n, pickL10nList, getKstToday, getPromotionStatus, validatePromotionConfig,
} from '@/config/promotion-plan';

interface PromotionManagerProps {
  adminKey: string;
  /** 탭이 처음 보일 때 불러온다 */
  active: boolean;
}

const ROOM_IDS = rooms.map((r) => r.id);

const LOCALE_LABELS: Record<Locale, string> = { ko: '한국어', en: 'English', ja: '日本語', zh: '中文' };
const RES_TYPE_LABELS: Record<ReservationType, string> = { general: '일반', corporate: '기업체', military: '미군' };
const STATUS_BADGES: Record<PromoStatus, { label: string; cls: string }> = {
  live: { label: '노출 중', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  scheduled: { label: '예정', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  ended: { label: '종료', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  disabled: { label: '꺼짐', cls: 'bg-slate-100 text-slate-400 border-slate-200' },
};
const BENEFIT_LABELS: Record<PromoBenefit['kind'], string> = { info: '혜택형 (가격 변화 없음)', percent: '% 할인', fixed: '1박 고정가' };

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/** 서버(api/admin/promotions pickPromotion)와 같은 정리 — 공백 제거, 빈 상세 줄 제거 */
function normalize(config: PromotionConfig): PromotionConfig {
  const l10n = (v: L10n): L10n => ({ ko: v.ko.trim(), en: v.en.trim(), ja: v.ja.trim(), zh: v.zh.trim() });
  return {
    ...config,
    promotions: config.promotions.map((p) => ({
      ...p,
      title: l10n(p.title),
      subtitle: l10n(p.subtitle),
      desc: l10n(p.desc),
      period: l10n(p.period),
      bookingNote: l10n(p.bookingNote),
      details: {
        ko: p.details.ko.map((s) => s.trim()).filter(Boolean),
        en: p.details.en.map((s) => s.trim()).filter(Boolean),
        ja: p.details.ja.map((s) => s.trim()).filter(Boolean),
        zh: p.details.zh.map((s) => s.trim()).filter(Boolean),
      },
      cta: { ...p.cta, label: l10n(p.cta.label) },
    })),
  };
}

const configBody = (c: PromotionConfig) => JSON.stringify(normalize(c).promotions);

/** 저장된 설정과 편집 중인 설정의 차이 건수 (프로모션 단위 + 순서 변경) */
function countChanges(base: PromotionConfig, draft: PromotionConfig): number {
  const norm = normalize(draft).promotions;
  const baseMap = new Map(base.promotions.map((p) => [p.id, JSON.stringify(p)]));
  const draftIds = new Set(norm.map((p) => p.id));
  let n = 0;
  for (const p of norm) if (baseMap.get(p.id) !== JSON.stringify(p)) n++;
  for (const p of base.promotions) if (!draftIds.has(p.id)) n++;
  if (n === 0 && base.promotions.map((p) => p.id).join() !== norm.map((p) => p.id).join()) n++;
  return n;
}

const toInt = (v: string, fallback = 0) => {
  const n = parseInt(v.replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) ? n : fallback;
};

function newPromotion(id: string): Promotion {
  return {
    id,
    enabled: false,
    tab: 'event',
    image: PROMO_IMAGES[0],
    imageZoom: false,
    title: { ...emptyL10n(), ko: '새 프로모션' },
    subtitle: emptyL10n(),
    desc: emptyL10n(),
    period: emptyL10n(),
    details: emptyL10nList(),
    bookingNote: emptyL10n(),
    startDate: null,
    endDate: null,
    benefit: { kind: 'info' },
    conditions: { minNights: 0, minAdvanceDays: 0, roomIds: [], reservationTypes: [] },
    presets: { roomId: null, reservationType: null },
    cta: { show: false, showOnHome: false, locale: null, label: emptyL10n() },
  };
}

export default function PromotionManager({ adminKey, active }: PromotionManagerProps) {
  const [loaded, setLoaded] = useState<PromotionConfig | null>(null);
  const [draft, setDraft] = useState<PromotionConfig | null>(null);
  const [savedOnServer, setSavedOnServer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string; details?: string[] } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lang, setLang] = useState<Locale>('ko');
  const today = getKstToday();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/promotions', { headers: { 'X-Admin-Key': adminKey }, cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      const config = data.config as PromotionConfig;
      setLoaded(config);
      setDraft(clone(config));
      setSavedOnServer(!!data.saved);
      setSelectedId((cur) => (cur && config.promotions.some((p) => p.id === cur) ? cur : config.promotions[0]?.id ?? null));
      return config;
    } catch (e) {
      const text = e instanceof Error ? e.message : String(e);
      console.error('[PromotionManager] 프로모션 설정 조회 실패:', text);
      setMessage({ type: 'error', text: `프로모션 설정을 불러오지 못했습니다: ${text}` });
      return null;
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  // 처음 탭이 보일 때 한 번만 자동 조회 (실패 시 무한 재시도하지 않고 '다시 시도' 버튼으로)
  const [autoLoaded, setAutoLoaded] = useState(false);
  useEffect(() => {
    if (active && !autoLoaded) {
      setAutoLoaded(true);
      load();
    }
  }, [active, autoLoaded, load]);

  const changes = loaded && draft ? countChanges(loaded, draft) : 0;

  // 저장하지 않은 변경이 있으면 페이지 이탈 경고
  useEffect(() => {
    if (changes === 0) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [changes]);

  if (!draft || !loaded) {
    return (
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl mt-3 p-10 text-center text-sm text-slate-500">
        {loading ? '프로모션 설정을 불러오는 중...' : (message?.text || '프로모션 설정이 없습니다.')}
        {!loading && (
          <button onClick={load} className="ml-3 px-3 py-1.5 text-xs border border-slate-300 rounded-lg hover:bg-slate-50">다시 시도</button>
        )}
      </div>
    );
  }

  const promo = draft.promotions.find((p) => p.id === selectedId) || null;
  const savedIds = new Set(loaded.promotions.map((p) => p.id));

  // --- 편집 함수 ---
  const update = (patch: (p: Promotion) => Promotion) => {
    if (!promo) return;
    setDraft({ ...draft, promotions: draft.promotions.map((p) => (p.id === promo.id ? patch(clone(p)) : p)) });
  };

  const uniqueId = (base: string) => {
    let i = 1;
    let id = base;
    while (draft.promotions.some((p) => p.id === id)) id = `${base}-${++i}`;
    return id;
  };

  const add = () => {
    if (draft.promotions.length >= MAX_PROMOTIONS) { setMessage({ type: 'error', text: `프로모션은 최대 ${MAX_PROMOTIONS}개까지 만들 수 있습니다.` }); return; }
    const p = newPromotion(uniqueId('promo'));
    setDraft({ ...draft, promotions: [...draft.promotions, p] });
    setSelectedId(p.id);
    setLang('ko');
    setMessage({ type: 'ok', text: '새 프로모션을 만들었습니다 (꺼진 상태). 내용을 채우고 켠 뒤 저장해 주세요.' });
  };

  const duplicate = () => {
    if (!promo) return;
    if (draft.promotions.length >= MAX_PROMOTIONS) { setMessage({ type: 'error', text: `프로모션은 최대 ${MAX_PROMOTIONS}개까지 만들 수 있습니다.` }); return; }
    const copy: Promotion = { ...clone(promo), id: uniqueId(`${promo.id}-copy`.slice(0, 25)), enabled: false };
    copy.title.ko = `${promo.title.ko} (복제)`;
    const idx = draft.promotions.findIndex((p) => p.id === promo.id);
    const list = [...draft.promotions];
    list.splice(idx + 1, 0, copy);
    setDraft({ ...draft, promotions: list });
    setSelectedId(copy.id);
    setMessage({ type: 'ok', text: '복제했습니다 (꺼진 상태). 저장해야 반영됩니다.' });
  };

  const remove = () => {
    if (!promo) return;
    if (!confirm(`"${promo.title.ko}" 프로모션을 삭제할까요?\n이 프로모션 예약 링크(?promo=${promo.id})는 정상 요금으로 접수됩니다. (저장해야 반영)`)) return;
    const list = draft.promotions.filter((p) => p.id !== promo.id);
    setDraft({ ...draft, promotions: list });
    setSelectedId(list[0]?.id ?? null);
  };

  const move = (id: string, dir: -1 | 1) => {
    const idx = draft.promotions.findIndex((p) => p.id === id);
    const to = idx + dir;
    if (idx < 0 || to < 0 || to >= draft.promotions.length) return;
    const list = [...draft.promotions];
    [list[idx], list[to]] = [list[to], list[idx]];
    setDraft({ ...draft, promotions: list });
  };

  const toggle = (id: string) => {
    setDraft({ ...draft, promotions: draft.promotions.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)) });
  };

  const changeId = (value: string) => {
    if (!promo) return;
    const next = value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30);
    if (draft.promotions.some((p) => p.id === next && p.id !== promo.id)) {
      setMessage({ type: 'error', text: `코드 "${next}"는 이미 사용 중입니다.` });
      return;
    }
    setDraft({ ...draft, promotions: draft.promotions.map((p) => (p.id === promo.id ? { ...p, id: next } : p)) });
    setSelectedId(next);
  };

  const setBenefitKind = (kind: PromoBenefit['kind']) => {
    update((p) => {
      p.benefit = kind === 'percent' ? { kind, tiers: [{ minNights: 2, percent: 10 }] }
        : kind === 'fixed' ? { kind, currency: 'KRW', pricePerNight: 70000, waiveExtraGuestFee: false }
        : { kind: 'info' };
      return p;
    });
  };

  // --- 저장 ---
  const save = async () => {
    const body = normalize(draft);
    const errors = validatePromotionConfig(body, ROOM_IDS);
    if (errors.length > 0) {
      setMessage({ type: 'error', text: '입력값을 확인해 주세요.', details: errors });
      return;
    }
    if (!confirm(`변경 ${changes}건을 저장할까요?\n저장 즉시 홈페이지 이벤트 화면과 예약 할인에 반영됩니다. (이미 접수된 예약은 그대로)`)) return;

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/promotions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ config: body, baseUpdatedAt: loaded.updatedAt }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        console.error('[PromotionManager] 저장 실패:', res.status, data.error);
        setMessage({ type: 'error', text: data.error || `저장 실패 (HTTP ${res.status})`, details: data.errors });
        return;
      }

      // 저장 후 다시 불러와 서버 값과 대조
      const expected = configBody(body);
      const reloaded = await load();
      if (reloaded && configBody(reloaded) === expected) {
        setMessage({ type: 'ok', text: `저장 완료 — 서버에서 다시 읽어 ${changes}건 반영을 확인했습니다. 홈페이지에는 1분 이내에 반영됩니다.` });
      } else {
        console.error('[PromotionManager] 저장 후 재조회 값이 다름');
        setMessage({ type: 'error', text: '저장 응답은 성공했지만 다시 읽은 값이 다릅니다. 1분 후 새로고침해 확인해 주세요.' });
      }
    } catch (e) {
      const text = e instanceof Error ? e.message : String(e);
      console.error('[PromotionManager] 저장 요청 오류:', text);
      setMessage({ type: 'error', text: `저장 요청 중 오류: ${text}` });
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    if (!confirm('저장하지 않은 변경을 모두 되돌릴까요?')) return;
    setDraft(clone(loaded));
    setSelectedId((cur) => (cur && loaded.promotions.some((p) => p.id === cur) ? cur : loaded.promotions[0]?.id ?? null));
    setMessage(null);
  };

  const inputCls = 'px-2 py-1.5 border border-slate-300 rounded-md text-xs focus:outline-none focus:border-slate-700';
  const labelCls = 'block text-[11px] font-semibold text-slate-500 mb-1';
  const sectionCls = 'px-5 py-4 border-t border-slate-100';

  // 언어별 문구 입력칸 (비우면 한국어 표시)
  const textField = (key: 'title' | 'subtitle' | 'desc' | 'period' | 'bookingNote', label: string, multiline = false) => {
    if (!promo) return null;
    const value = promo[key][lang];
    const placeholder = lang === 'ko' ? '' : `비우면 한국어 표시: ${promo[key].ko}`;
    const onChange = (v: string) => update((p) => { p[key][lang] = v; return p; });
    return (
      <div>
        <label className={labelCls}>{label}{key === 'title' && lang === 'ko' ? ' *' : ''}</label>
        {multiline
          ? <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} className={`${inputCls} w-full`} />
          : <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${inputCls} w-full`} />}
      </div>
    );
  };

  const status = promo ? getPromotionStatus(promo, today) : null;
  const benefit = promo?.benefit;

  return (
    <div className="mt-3 space-y-3">
      {/* 상단 상태 바 */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          {savedOnServer
            ? <>마지막 저장 <span className="font-semibold text-slate-700">{new Date(loaded.updatedAt as string).toLocaleString('ko-KR')}</span></>
            : <>아직 저장된 적 없음 — 기본 프로모션(코드 기본값)으로 노출 중</>}
          {changes > 0 && <span className="ml-3 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">저장 안 된 변경 {changes}건</span>}
        </div>
        <div className="flex gap-2">
          <button onClick={discard} disabled={changes === 0 || saving} className="px-4 py-2 text-xs font-medium border border-slate-300 text-slate-700 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-40">되돌리기</button>
          <button onClick={save} disabled={changes === 0 || saving} className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-700 disabled:opacity-40">{saving ? '저장 중...' : '저장'}</button>
        </div>
      </div>

      {message && (
        <div className={`rounded-xl border px-5 py-3 text-xs ${message.type === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
          <p className="font-medium">{message.text}</p>
          {message.details && message.details.length > 0 && (
            <ul className="mt-1.5 list-disc list-inside space-y-0.5">
              {message.details.slice(0, 20).map((d) => <li key={d}>{d}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-3 items-start">
        {/* 목록 */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">프로모션 {draft.promotions.length}개 <span className="font-normal text-slate-400">(위에서부터 노출)</span></span>
            <button onClick={add} className="px-2.5 py-1 text-[11px] font-semibold bg-slate-900 text-white rounded-md hover:bg-slate-700">+ 새 프로모션</button>
          </div>
          <ul>
            {draft.promotions.map((p, i) => {
              const st = STATUS_BADGES[getPromotionStatus(p, today)];
              return (
                <li key={p.id} className={`flex items-center gap-2 px-3 py-2.5 border-b border-slate-50 cursor-pointer ${p.id === selectedId ? 'bg-slate-50' : 'hover:bg-slate-50/60'}`} onClick={() => setSelectedId(p.id)}>
                  <div className="flex flex-col">
                    <button onClick={(e) => { e.stopPropagation(); move(p.id, -1); }} disabled={i === 0} className="text-[10px] leading-none text-slate-400 hover:text-slate-800 disabled:opacity-20" aria-label="위로">▲</button>
                    <button onClick={(e) => { e.stopPropagation(); move(p.id, 1); }} disabled={i === draft.promotions.length - 1} className="text-[10px] leading-none text-slate-400 hover:text-slate-800 disabled:opacity-20" aria-label="아래로">▼</button>
                  </div>
                  <img src={p.image} alt="" className="w-10 h-8 object-cover rounded flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-800 truncate">{p.title.ko || '(제목 없음)'}</p>
                    <p className="text-[10px] text-slate-400 truncate">{p.id} · {BENEFIT_LABELS[p.benefit.kind].split(' ')[0]}</p>
                  </div>
                  <span className={`px-1.5 py-0.5 text-[10px] rounded border flex-shrink-0 ${st.cls}`}>{st.label}</span>
                  <input type="checkbox" checked={p.enabled} onClick={(e) => e.stopPropagation()} onChange={() => toggle(p.id)} title="켜기/끄기" />
                </li>
              );
            })}
          </ul>
        </div>

        {/* 편집 */}
        {promo && benefit ? (
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-800">{promo.title.ko || '(제목 없음)'}</span>
                {status && <span className={`px-1.5 py-0.5 text-[10px] rounded border ${STATUS_BADGES[status].cls}`}>{STATUS_BADGES[status].label}</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={duplicate} className="px-3 py-1.5 text-xs border border-slate-300 rounded-md hover:bg-slate-50">복제</button>
                <button onClick={remove} className="px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded-md hover:bg-red-50">삭제</button>
              </div>
            </div>

            {/* 기본 정보 */}
            <div className={`${sectionCls} grid grid-cols-1 sm:grid-cols-3 gap-3`}>
              <div>
                <label className={labelCls}>코드 (예약 링크 ?promo=)</label>
                <input
                  value={promo.id}
                  onChange={(e) => changeId(e.target.value)}
                  disabled={savedIds.has(promo.id)}
                  className={`${inputCls} w-full disabled:bg-slate-50 disabled:text-slate-500`}
                />
                {savedIds.has(promo.id) && <p className="mt-1 text-[10px] text-slate-400">저장된 코드는 기존 링크·예약 기록 때문에 바꿀 수 없습니다.</p>}
              </div>
              <div>
                <label className={labelCls}>분류</label>
                <select value={promo.tab} onChange={(e) => update((p) => { p.tab = e.target.value as Promotion['tab']; return p; })} className={`${inputCls} w-full`}>
                  <option value="room">객실 패키지</option>
                  <option value="event">이벤트</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>판매 기간 (예약하는 날 기준, 비우면 상시)</label>
                <div className="flex items-center gap-1">
                  <input type="date" value={promo.startDate || ''} onChange={(e) => update((p) => { p.startDate = e.target.value || null; return p; })} className={`${inputCls} flex-1 min-w-0`} />
                  <span className="text-xs text-slate-400">~</span>
                  <input type="date" value={promo.endDate || ''} onChange={(e) => update((p) => { p.endDate = e.target.value || null; return p; })} className={`${inputCls} flex-1 min-w-0`} />
                </div>
              </div>
            </div>

            {/* 이미지 */}
            <div className={sectionCls}>
              <label className={labelCls}>이미지 (새 이미지는 파일을 받아 배포로 추가)</label>
              <div className="flex flex-wrap gap-2 items-center">
                {PROMO_IMAGES.map((src) => (
                  <button
                    key={src}
                    onClick={() => update((p) => { p.image = src; return p; })}
                    className={`w-20 h-14 rounded overflow-hidden border-2 ${promo.image === src ? 'border-slate-900' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  >
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
                <label className="ml-2 flex items-center gap-1.5 text-xs text-slate-600">
                  <input type="checkbox" checked={promo.imageZoom} onChange={(e) => update((p) => { p.imageZoom = e.target.checked; return p; })} />
                  이미지 확대 (여백이 많은 이미지)
                </label>
              </div>
            </div>

            {/* 문구 (언어 탭) */}
            <div className={sectionCls}>
              <div className="flex items-center gap-1 mb-3">
                {LOCALES.map((l) => (
                  <button key={l} onClick={() => setLang(l)} className={`px-3 py-1 text-xs rounded-md border ${lang === l ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                    {LOCALE_LABELS[l]}
                  </button>
                ))}
                {lang !== 'ko' && <span className="ml-2 text-[11px] text-slate-400">비워 두면 한국어 문구가 표시됩니다.</span>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {textField('title', '제목')}
                {textField('subtitle', '부제 (카드 상단 작은 글씨)')}
                <div className="sm:col-span-2">{textField('desc', '설명', true)}</div>
                {textField('period', '기간 표시 문구 (예: 상시 진행)')}
                {textField('bookingNote', '예약 폼 안내 (프로모션 적용 시 표시)')}
                <div className="sm:col-span-2">
                  <label className={labelCls}>이용 안내 · 주의사항 (한 줄에 하나)</label>
                  <textarea
                    value={promo.details[lang].join('\n')}
                    onChange={(e) => update((p) => { p.details[lang] = e.target.value.split('\n'); return p; })}
                    placeholder={lang === 'ko' ? '' : '비우면 한국어 항목 표시'}
                    rows={5}
                    className={`${inputCls} w-full`}
                  />
                </div>
              </div>
            </div>

            {/* 혜택 */}
            <div className={sectionCls}>
              <label className={labelCls}>혜택 종류</label>
              <div className="flex flex-wrap gap-3 mb-3">
                {(Object.keys(BENEFIT_LABELS) as PromoBenefit['kind'][]).map((k) => (
                  <label key={k} className="flex items-center gap-1.5 text-xs text-slate-700">
                    <input type="radio" checked={benefit.kind === k} onChange={() => setBenefitKind(k)} />
                    {BENEFIT_LABELS[k]}
                  </label>
                ))}
              </div>
              {benefit.kind === 'percent' && (
                <div className="space-y-1.5">
                  {benefit.tiers.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                      <input value={t.minNights} onChange={(e) => update((p) => { if (p.benefit.kind === 'percent') p.benefit.tiers[i].minNights = toInt(e.target.value); return p; })} className={`${inputCls} w-14 text-right`} />
                      <span>박 이상</span>
                      <input value={t.percent} onChange={(e) => update((p) => { if (p.benefit.kind === 'percent') p.benefit.tiers[i].percent = toInt(e.target.value); return p; })} className={`${inputCls} w-14 text-right`} />
                      <span>% 할인</span>
                      {benefit.tiers.length > 1 && (
                        <button onClick={() => update((p) => { if (p.benefit.kind === 'percent') p.benefit.tiers.splice(i, 1); return p; })} className="text-red-500 hover:text-red-700">삭제</button>
                      )}
                    </div>
                  ))}
                  {benefit.tiers.length < 5 && (
                    <button onClick={() => update((p) => { if (p.benefit.kind === 'percent') p.benefit.tiers.push({ minNights: (p.benefit.tiers[p.benefit.tiers.length - 1]?.minNights || 1) + 1, percent: 10 }); return p; })} className="px-2.5 py-1 text-[11px] border border-slate-300 rounded-md hover:bg-slate-50">+ 구간 추가</button>
                  )}
                  <p className="text-[11px] text-slate-400">박수가 큰 구간부터 적용. 객실 요금 + 추가 인원 요금에 할인 (기존 연박 할인과 같은 방식)</p>
                </div>
              )}
              {benefit.kind === 'fixed' && (
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <select
                    value={benefit.currency}
                    onChange={(e) => update((p) => {
                      if (p.benefit.kind === 'fixed') {
                        p.benefit.currency = e.target.value as 'KRW' | 'USD';
                        // USD 금액에 원화 추가 인원 요금을 더할 수 없으므로 면제 고정
                        if (p.benefit.currency === 'USD') p.benefit.waiveExtraGuestFee = true;
                      }
                      return p;
                    })}
                    className={inputCls}
                  >
                    <option value="KRW">원화 (₩)</option>
                    <option value="USD">달러 ($)</option>
                  </select>
                  <span>1박</span>
                  <input value={benefit.pricePerNight} onChange={(e) => update((p) => { if (p.benefit.kind === 'fixed') p.benefit.pricePerNight = toInt(e.target.value); return p; })} className={`${inputCls} w-24 text-right`} />
                  <span>{benefit.currency === 'USD' ? '$' : '원'} (요일·특수일 상관없이)</span>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={benefit.waiveExtraGuestFee} disabled={benefit.currency === 'USD'} onChange={(e) => update((p) => { if (p.benefit.kind === 'fixed') p.benefit.waiveExtraGuestFee = e.target.checked; return p; })} />
                    추가 인원 요금 면제{benefit.currency === 'USD' ? ' (달러는 항상 면제)' : ''}
                  </label>
                </div>
              )}
              {benefit.kind === 'info' && <p className="text-[11px] text-slate-400">가격은 그대로이고, 이벤트 화면에 혜택 안내만 표시됩니다.</p>}
            </div>

            {/* 적용 조건 */}
            <div className={`${sectionCls} grid grid-cols-1 sm:grid-cols-2 gap-3`}>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span className="font-semibold text-slate-500 text-[11px]">최소 박수</span>
                <input value={promo.conditions.minNights} onChange={(e) => update((p) => { p.conditions.minNights = toInt(e.target.value); return p; })} className={`${inputCls} w-14 text-right`} />
                <span>박 (0 = 제한 없음)</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span className="font-semibold text-slate-500 text-[11px]">사전 예약</span>
                <span>체크인</span>
                <input value={promo.conditions.minAdvanceDays} onChange={(e) => update((p) => { p.conditions.minAdvanceDays = toInt(e.target.value); return p; })} className={`${inputCls} w-14 text-right`} />
                <span>일 전까지 (0 = 제한 없음)</span>
              </div>
              <div>
                <label className={labelCls}>적용 객실 (아무것도 안 고르면 전 객실)</label>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {rooms.map((r) => (
                    <label key={r.id} className="flex items-center gap-1 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={promo.conditions.roomIds.includes(r.id)}
                        onChange={(e) => update((p) => { p.conditions.roomIds = e.target.checked ? [...p.conditions.roomIds, r.id] : p.conditions.roomIds.filter((x) => x !== r.id); return p; })}
                      />
                      {getRoomName(r, 'ko')}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>예약 유형 (아무것도 안 고르면 전체)</label>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {RESERVATION_TYPES.map((t) => (
                    <label key={t} className="flex items-center gap-1 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={promo.conditions.reservationTypes.includes(t)}
                        onChange={(e) => update((p) => { p.conditions.reservationTypes = e.target.checked ? [...p.conditions.reservationTypes, t] : p.conditions.reservationTypes.filter((x) => x !== t); return p; })}
                      />
                      {RES_TYPE_LABELS[t]}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* 예약 폼 기본값 · 예약 버튼 */}
            <div className={`${sectionCls} grid grid-cols-1 sm:grid-cols-2 gap-3`}>
              <div>
                <label className={labelCls}>예약 폼 기본값 (예약 버튼으로 들어왔을 때)</label>
                <div className="flex gap-2">
                  <select value={promo.presets.roomId || ''} onChange={(e) => update((p) => { p.presets.roomId = e.target.value || null; return p; })} className={`${inputCls} flex-1`}>
                    <option value="">객실 선택 안 함</option>
                    {rooms.map((r) => <option key={r.id} value={r.id}>{getRoomName(r, 'ko')}</option>)}
                  </select>
                  <select value={promo.presets.reservationType || ''} onChange={(e) => update((p) => { p.presets.reservationType = (e.target.value || null) as ReservationType | null; return p; })} className={`${inputCls} flex-1`}>
                    <option value="">예약 유형 그대로</option>
                    {RESERVATION_TYPES.map((t) => <option key={t} value={t}>{RES_TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>예약 버튼</label>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700">
                  <label className="flex items-center gap-1"><input type="checkbox" checked={promo.cta.show} onChange={(e) => update((p) => { p.cta.show = e.target.checked; if (!e.target.checked) p.cta.showOnHome = false; return p; })} />상세 화면에 표시</label>
                  <label className="flex items-center gap-1"><input type="checkbox" checked={promo.cta.showOnHome} disabled={!promo.cta.show} onChange={(e) => update((p) => { p.cta.showOnHome = e.target.checked; return p; })} />홈 카드에도 표시</label>
                  <select value={promo.cta.locale || ''} disabled={!promo.cta.show} onChange={(e) => update((p) => { p.cta.locale = (e.target.value || null) as Locale | null; return p; })} className={inputCls}>
                    <option value="">보던 언어로 예약</option>
                    {LOCALES.map((l) => <option key={l} value={l}>{LOCALE_LABELS[l]} 예약 페이지로 고정</option>)}
                  </select>
                </div>
                {promo.cta.show && (
                  <input
                    value={promo.cta.label[lang]}
                    onChange={(e) => update((p) => { p.cta.label[lang] = e.target.value; return p; })}
                    placeholder={`버튼 문구 (${LOCALE_LABELS[lang]}) — 비우면 '이 혜택으로 예약하기'`}
                    className={`${inputCls} w-full mt-2`}
                  />
                )}
                {promo.cta.show && benefit.kind === 'info' && <p className="mt-1 text-[11px] text-amber-600">혜택형은 가격이 그대로라 예약 버튼은 일반 예약으로 연결됩니다.</p>}
              </div>
            </div>

            {/* 미리보기 */}
            <div className={`${sectionCls} bg-slate-50`}>
              <label className={labelCls}>미리보기 ({LOCALE_LABELS[lang]})</label>
              <div className="max-w-xs bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100">
                <div className="aspect-[4/3] relative overflow-hidden">
                  <img src={promo.image} alt="" className={`w-full h-full object-cover ${promo.imageZoom ? 'scale-[1.35]' : ''}`} />
                  <div className="absolute top-3 right-3 bg-white/90 px-2.5 py-0.5 text-[10px] font-medium text-gray-600 rounded-full uppercase tracking-wider">{promo.tab}</div>
                </div>
                <div className="p-5">
                  <span className="text-[10px] text-amber-600 tracking-widest uppercase mb-1.5 block font-medium">{pickL10n(promo.subtitle, lang)}</span>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{pickL10n(promo.title, lang)}</h3>
                  <p className="text-gray-500 text-xs mb-3">{pickL10n(promo.desc, lang)}</p>
                  <div className="pt-3 border-t border-gray-100 text-xs text-gray-400">{pickL10n(promo.period, lang)}</div>
                </div>
              </div>
              {pickL10nList(promo.details, lang).filter((s) => s.trim()).length > 0 && (
                <ul className="mt-3 max-w-md list-disc list-inside text-[11px] text-slate-500 space-y-0.5">
                  {pickL10nList(promo.details, lang).filter((s) => s.trim()).map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-10 text-center text-sm text-slate-500">
            프로모션이 없습니다. 「+ 새 프로모션」으로 추가해 주세요.
          </div>
        )}
      </div>
    </div>
  );
}
