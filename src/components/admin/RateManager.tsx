'use client';

/**
 * admin 요금 관리 — 요금세트 가격 편집 · 날짜별 세트 지정 달력 · 특수 세트 추가
 *
 * 저장은 /api/admin/rates (KV). 저장 후에는 반드시 다시 불러와 서버 값과 대조한다
 * — "저장되었습니다" 메시지만 믿지 않는다.
 * 이미 접수된 예약은 저장된 가격 snapshot을 쓰므로 영향이 없다.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { rooms, getRoomName } from '@/config/rooms';
import { RateConfig, RateSet, MAX_SETS, getAutoSetId, getSetPrice, validateRateConfig } from '@/config/rate-plan';
import { PUBLIC_HOLIDAYS, toDateKey } from '@/config/special-rates';

interface RateManagerProps {
  adminKey: string;
  /** 탭이 처음 보일 때 불러온다 */
  active: boolean;
}

const ROOM_IDS = rooms.map((r) => r.id);
const HOLIDAYS = new Set(PUBLIC_HOLIDAYS);
const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const AUTO = '__AUTO__';

// 세트별 칩 색 (기본 세트 3개 + 특수 세트 순서대로)
const SET_COLORS: Record<string, string> = {
  WEEK: 'bg-slate-100 text-slate-600 border-slate-200',
  FRI: 'bg-sky-50 text-sky-700 border-sky-200',
  SAT: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};
const CUSTOM_COLORS = [
  'bg-rose-50 text-rose-700 border-rose-200',
  'bg-amber-50 text-amber-700 border-amber-200',
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  'bg-teal-50 text-teal-700 border-teal-200',
];

const won = (n: number) => `₩${n.toLocaleString('ko-KR')}`;
const cloneConfig = (c: RateConfig): RateConfig => JSON.parse(JSON.stringify(c));
const configBody = (c: RateConfig) => JSON.stringify({ sets: c.sets, overrides: c.overrides });

/** 저장된 설정과 편집 중인 설정의 차이 건수 */
function countChanges(base: RateConfig, draft: RateConfig): number {
  let n = 0;
  const baseSets = new Map(base.sets.map((s) => [s.id, s]));
  const draftIds = new Set(draft.sets.map((s) => s.id));
  for (const s of draft.sets) {
    const b = baseSets.get(s.id);
    if (!b) { n++; continue; }
    if (b.name !== s.name) n++;
    for (const id of ROOM_IDS) if (b.prices[id] !== s.prices[id]) n++;
  }
  for (const s of base.sets) if (!draftIds.has(s.id)) n++;
  const dates = new Set([...Object.keys(base.overrides), ...Object.keys(draft.overrides)]);
  dates.forEach((d) => { if (base.overrides[d] !== draft.overrides[d]) n++; });
  return n;
}

export default function RateManager({ adminKey, active }: RateManagerProps) {
  const [loaded, setLoaded] = useState<RateConfig | null>(null);
  const [draft, setDraft] = useState<RateConfig | null>(null);
  const [savedOnServer, setSavedOnServer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string; details?: string[] } | null>(null);

  // 달력
  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // 기간 적용
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [rangeDays, setRangeDays] = useState<boolean[]>([true, true, true, true, true, true, true]);
  const [rangeSet, setRangeSet] = useState<string>(AUTO);

  // 세트 추가
  const [newSetName, setNewSetName] = useState('');
  const [newSetSource, setNewSetSource] = useState('SAT');
  const [newSetAdjust, setNewSetAdjust] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/rates', { headers: { 'X-Admin-Key': adminKey }, cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      setLoaded(data.config);
      setDraft(cloneConfig(data.config));
      setSavedOnServer(!!data.saved);
      return data.config as RateConfig;
    } catch (e) {
      const text = e instanceof Error ? e.message : String(e);
      console.error('[RateManager] 요금 설정 조회 실패:', text);
      setMessage({ type: 'error', text: `요금 설정을 불러오지 못했습니다: ${text}` });
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

  const setColor = useCallback((setId: string) => {
    if (SET_COLORS[setId]) return SET_COLORS[setId];
    const customIds = (draft?.sets || []).filter((s) => !s.builtin).map((s) => s.id);
    return CUSTOM_COLORS[Math.max(0, customIds.indexOf(setId)) % CUSTOM_COLORS.length];
  }, [draft]);

  if (!draft || !loaded) {
    return (
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl mt-3 p-10 text-center text-sm text-slate-500">
        {loading ? '요금 설정을 불러오는 중...' : (message?.text || '요금 설정이 없습니다.')}
        {!loading && (
          <button onClick={load} className="ml-3 px-3 py-1.5 text-xs border border-slate-300 rounded-lg hover:bg-slate-50">다시 시도</button>
        )}
      </div>
    );
  }

  const setName = (id: string) => draft.sets.find((s) => s.id === id)?.name || id;

  // --- 편집 함수 ---
  const updateSet = (setId: string, patch: (s: RateSet) => RateSet) => {
    setDraft({ ...draft, sets: draft.sets.map((s) => (s.id === setId ? patch(s) : s)) });
  };

  const updatePrice = (setId: string, roomId: string, value: string) => {
    const n = value === '' ? 0 : Math.round(Number(value.replace(/[^\d]/g, '')));
    updateSet(setId, (s) => ({ ...s, prices: { ...s.prices, [roomId]: Number.isFinite(n) ? n : 0 } }));
  };

  const addSet = () => {
    const name = newSetName.trim();
    if (!name) { setMessage({ type: 'error', text: '새 세트 이름을 입력해 주세요.' }); return; }
    if (draft.sets.length >= MAX_SETS) { setMessage({ type: 'error', text: `요금세트는 최대 ${MAX_SETS}개까지 만들 수 있습니다.` }); return; }
    const source = draft.sets.find((s) => s.id === newSetSource) || draft.sets[0];
    let i = 1;
    while (draft.sets.some((s) => s.id === `CUSTOM_${i}`)) i++;
    const prices = Object.fromEntries(ROOM_IDS.map((id) => [id, Math.max(1, (source.prices[id] || 0) + newSetAdjust)]));
    setDraft({ ...draft, sets: [...draft.sets, { id: `CUSTOM_${i}`, name, builtin: false, prices }] });
    setNewSetName('');
    setNewSetAdjust(0);
    setMessage(null);
  };

  const removeSet = (set: RateSet) => {
    const usedDates = Object.entries(draft.overrides).filter(([, id]) => id === set.id).map(([d]) => d).sort();
    if (usedDates.length > 0) {
      setMessage({
        type: 'error',
        text: `"${set.name}" 세트가 ${usedDates.length}개 날짜에 지정되어 있어 삭제할 수 없습니다. 먼저 달력에서 다른 세트로 바꿔 주세요.`,
        details: usedDates.slice(0, 20),
      });
      return;
    }
    if (!confirm(`"${set.name}" 세트를 삭제할까요? (저장해야 반영됩니다)`)) return;
    setDraft({ ...draft, sets: draft.sets.filter((s) => s.id !== set.id) });
  };

  const assignDate = (dateKey: string, setId: string) => {
    const overrides = { ...draft.overrides };
    if (setId === AUTO) delete overrides[dateKey];
    else overrides[dateKey] = setId;
    setDraft({ ...draft, overrides });
  };

  const applyRange = () => {
    if (!rangeStart || !rangeEnd || rangeStart > rangeEnd) {
      setMessage({ type: 'error', text: '기간의 시작일과 종료일을 확인해 주세요.' });
      return;
    }
    const overrides = { ...draft.overrides };
    const cur = new Date(`${rangeStart}T00:00:00`);
    const end = new Date(`${rangeEnd}T00:00:00`);
    let count = 0;
    while (cur <= end && count < 800) {
      if (rangeDays[cur.getDay()]) {
        const key = toDateKey(cur);
        if (rangeSet === AUTO) delete overrides[key];
        else overrides[key] = rangeSet;
        count++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    setDraft({ ...draft, overrides });
    setMessage({ type: 'ok', text: `${count}개 날짜에 "${rangeSet === AUTO ? '자동' : setName(rangeSet)}"을(를) 적용했습니다. 저장해야 반영됩니다.` });
  };

  // --- 저장 ---
  const save = async () => {
    const errors = validateRateConfig(draft, ROOM_IDS);
    if (errors.length > 0) {
      setMessage({ type: 'error', text: '입력값을 확인해 주세요.', details: errors });
      return;
    }
    if (!confirm(`변경 ${changes}건을 저장할까요?\n저장 즉시 홈페이지 예약 요금에 반영됩니다. (이미 접수된 예약은 그대로)`)) return;

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/rates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ config: draft, baseUpdatedAt: loaded.updatedAt }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        console.error('[RateManager] 저장 실패:', res.status, data.error);
        setMessage({ type: 'error', text: data.error || `저장 실패 (HTTP ${res.status})`, details: data.errors });
        return;
      }

      // 저장 후 다시 불러와 서버 값과 대조
      const expected = configBody(draft);
      const reloaded = await load();
      if (reloaded && configBody(reloaded) === expected) {
        setMessage({ type: 'ok', text: `저장 완료 — 서버에서 다시 읽어 ${changes}건 반영을 확인했습니다. 홈페이지에는 1분 이내에 반영됩니다.` });
      } else {
        console.error('[RateManager] 저장 후 재조회 값이 다름');
        setMessage({ type: 'error', text: '저장 응답은 성공했지만 다시 읽은 값이 다릅니다. 1분 후 새로고침해 확인해 주세요.' });
      }
    } catch (e) {
      const text = e instanceof Error ? e.message : String(e);
      console.error('[RateManager] 저장 요청 오류:', text);
      setMessage({ type: 'error', text: `저장 요청 중 오류: ${text}` });
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    if (!confirm('저장하지 않은 변경을 모두 되돌릴까요?')) return;
    setDraft(cloneConfig(loaded));
    setMessage(null);
  };

  // --- 달력 데이터 ---
  const firstDow = month.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const todayKey = toDateKey(today);
  const baseRoom = rooms[0];

  const selected = selectedDate ? new Date(`${selectedDate}T00:00:00`) : null;
  const selectedOverride = selectedDate ? draft.overrides[selectedDate] : undefined;
  const selectedSetId = selected ? (selectedOverride && draft.sets.some((s) => s.id === selectedOverride) ? selectedOverride : getAutoSetId(selected)) : null;

  const inputCls = 'px-2 py-1.5 border border-slate-300 rounded-md text-xs focus:outline-none focus:border-slate-700';

  return (
    <div className="mt-3 space-y-3">
      {/* 상단 상태 바 */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          {savedOnServer
            ? <>마지막 저장 <span className="font-semibold text-slate-700">{new Date(loaded.updatedAt as string).toLocaleString('ko-KR')}</span></>
            : <>아직 저장된 적 없음 — 기본 요금(코드 기본값)으로 판매 중</>}
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

      {/* ============ 요금세트 ============ */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800">요금세트</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">1박 객실 요금 (추가 인원 요금·연박 할인·미군 특가는 별도 규칙으로 계산됩니다)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">세트</th>
                {rooms.map((r) => <th key={r.id} className="px-2 py-2 text-right font-medium whitespace-nowrap">{getRoomName(r, 'ko')}</th>)}
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {draft.sets.map((set) => (
                <tr key={set.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {set.builtin ? (
                      <span className={`inline-block px-2 py-0.5 rounded border text-[11px] font-semibold ${setColor(set.id)}`}>{set.name}</span>
                    ) : (
                      <input
                        value={set.name}
                        maxLength={30}
                        onChange={(e) => updateSet(set.id, (s) => ({ ...s, name: e.target.value }))}
                        className={`${inputCls} w-36 font-semibold`}
                      />
                    )}
                  </td>
                  {rooms.map((r) => {
                    const changed = loaded.sets.find((s) => s.id === set.id)?.prices[r.id] !== set.prices[r.id];
                    return (
                      <td key={r.id} className="px-2 py-2 text-right">
                        <input
                          inputMode="numeric"
                          value={set.prices[r.id] ? set.prices[r.id].toLocaleString('ko-KR') : ''}
                          onChange={(e) => updatePrice(set.id, r.id, e.target.value)}
                          className={`${inputCls} w-24 text-right tabular-nums ${changed ? 'bg-amber-50 border-amber-400' : ''}`}
                        />
                      </td>
                    );
                  })}
                  <td className="px-2 py-2 text-right">
                    {!set.builtin && (
                      <button onClick={() => removeSet(set)} className="px-2 py-1 text-[11px] text-red-600 border border-red-200 rounded-md hover:bg-red-50">삭제</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* 세트 추가 */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-700">특수 세트 추가</span>
          <input value={newSetName} onChange={(e) => setNewSetName(e.target.value)} maxLength={30} placeholder="이름 (예: 성수기)" className={`${inputCls} w-36`} />
          <select value={newSetSource} onChange={(e) => setNewSetSource(e.target.value)} className={inputCls}>
            {draft.sets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <span>요금에서</span>
          <input
            inputMode="numeric"
            value={newSetAdjust === 0 ? '' : String(newSetAdjust)}
            onChange={(e) => { const n = Number(e.target.value.replace(/[^\d-]/g, '')); setNewSetAdjust(Number.isFinite(n) ? n : 0); }}
            placeholder="0"
            className={`${inputCls} w-24 text-right`}
          />
          <span>원 조정해서</span>
          <button onClick={addSet} className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-md hover:bg-slate-100">추가</button>
        </div>
      </div>

      {/* ============ 달력 ============ */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-800">날짜별 세트</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">점선 = 자동 규칙(내일 쉬면 금요일, 오늘·내일 다 쉬면 토요일) · 실선 = 직접 지정 · 금액은 {getRoomName(baseRoom, 'ko')} 기준</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="px-2.5 py-1 border border-slate-300 rounded-md text-xs hover:bg-slate-50">◀</button>
            <span className="text-sm font-semibold text-slate-800 w-24 text-center">{month.getFullYear()}년 {month.getMonth() + 1}월</span>
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="px-2.5 py-1 border border-slate-300 rounded-md text-xs hover:bg-slate-50">▶</button>
            <button onClick={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))} className="px-2.5 py-1 border border-slate-300 rounded-md text-xs hover:bg-slate-50">오늘</button>
          </div>
        </div>

        <div className="grid grid-cols-7 text-[11px] text-center font-medium text-slate-500 bg-slate-50 border-b border-slate-100">
          {WEEKDAY_LABELS.map((d, i) => <div key={d} className={`py-1.5 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : ''}`}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((date, idx) => {
            if (!date) return <div key={`e${idx}`} className="min-h-[72px] border-b border-r border-slate-100 bg-slate-50/50" />;
            const key = toDateKey(date);
            const override = draft.overrides[key];
            const isOverride = !!override && draft.sets.some((s) => s.id === override);
            const setId = isOverride ? override : getAutoSetId(date);
            const changed = loaded.overrides[key] !== draft.overrides[key];
            const isHoliday = HOLIDAYS.has(key);
            const dow = date.getDay();
            const past = key < todayKey;
            return (
              <button
                key={key}
                onClick={() => setSelectedDate(key)}
                className={`min-h-[72px] border-b border-r border-slate-100 p-1.5 text-left align-top hover:bg-slate-50 transition-colors ${selectedDate === key ? 'ring-2 ring-inset ring-slate-800' : ''} ${past ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${isHoliday || dow === 0 ? 'text-red-500' : dow === 6 ? 'text-blue-500' : 'text-slate-700'}`}>{date.getDate()}</span>
                  {changed && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="저장 안 된 변경" />}
                </div>
                {isHoliday && <div className="text-[9px] text-red-400 leading-tight">공휴일</div>}
                <div className={`mt-1 inline-block max-w-full truncate px-1.5 py-0.5 rounded text-[10px] font-semibold border ${setColor(setId)} ${isOverride ? '' : 'border-dashed'}`}>
                  {setName(setId)}
                </div>
                <div className="text-[10px] text-slate-500 tabular-nums mt-0.5">{won(getSetPrice(draft, baseRoom, setId))}</div>
              </button>
            );
          })}
        </div>

        {/* 선택한 날짜 */}
        {selected && selectedDate && selectedSetId && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center gap-3 text-xs">
            <span className="font-semibold text-slate-800">{selectedDate} ({WEEKDAY_LABELS[selected.getDay()]}){HOLIDAYS.has(selectedDate) ? ' · 공휴일' : ''}</span>
            <span className="text-slate-500">자동 규칙: {setName(getAutoSetId(selected))}</span>
            <select value={selectedOverride && draft.sets.some((s) => s.id === selectedOverride) ? selectedOverride : AUTO} onChange={(e) => assignDate(selectedDate, e.target.value)} className={inputCls}>
              <option value={AUTO}>자동 ({setName(getAutoSetId(selected))})</option>
              {draft.sets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <span className="text-slate-500 w-full sm:w-auto">
              {rooms.map((r) => `${getRoomName(r, 'ko')} ${won(getSetPrice(draft, r, selectedSetId))}`).join(' · ')}
            </span>
          </div>
        )}

        {/* 기간 적용 */}
        <div className="px-5 py-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-700">기간 적용</span>
          <input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} className={inputCls} />
          <span>~</span>
          <input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} className={inputCls} />
          <div className="flex gap-0.5">
            {WEEKDAY_LABELS.map((d, i) => (
              <button
                key={d}
                onClick={() => setRangeDays(rangeDays.map((v, j) => (j === i ? !v : v)))}
                className={`w-7 py-1 rounded border text-[11px] ${rangeDays[i] ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-400 border-slate-200'}`}
              >
                {d}
              </button>
            ))}
          </div>
          <select value={rangeSet} onChange={(e) => setRangeSet(e.target.value)} className={inputCls}>
            <option value={AUTO}>자동으로 되돌리기</option>
            {draft.sets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button onClick={applyRange} className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-md hover:bg-slate-100">적용</button>
        </div>
      </div>
    </div>
  );
}
