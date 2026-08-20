/**
 * 취소 및 환불 규정 — 단일 출처
 *
 * 성격이 다른 두 규정을 구분해서 담는다.
 *
 * 1) onlineBookingCancellationPolicy — **홈페이지 예약** 취소 규정 (체크인 24시간 전까지 무료)
 *    예약 폼에서 고객이 실제로 동의하는 대상이며 '규정 전문 보기' 팝업이 이 내용을 보여준다.
 *    예약 페이지 안내, 이벤트 상세, 고객 확정 메일의 안내 문구도 같은 기준이어야 한다.
 *
 * 2) termsCancellationArticle — **이용약관 제4조** 원문 (투숙 중 환불 등 일반 조항)
 *    약관 페이지가 그대로 렌더한다. 법적 문서이므로 임의로 고치지 않는다.
 *
 * 고객이 동의한 규정과 표시되는 규정이 갈라지면 분쟁 소지가 있으므로
 * 문구는 반드시 이 파일에만 두고 화면들은 여기를 참조한다.
 */

import { Locale } from '@/types';

export interface CancellationPolicy {
  /** 팝업 제목 */
  title: string;
  /** 어떤 기준의 규정인지 */
  scopeLabel: string;
  /** 규정 본문 항목 */
  body: string[];
  /** 하단 안내 */
  note: string;
  /** 전체 약관 링크 문구 */
  fullTermsLabel: string;
}

/**
 * 홈페이지 예약 취소 규정 — 예약 폼 동의 대상
 */
export const onlineBookingCancellationPolicy: Record<Locale, CancellationPolicy> = {
  ko: {
    title: '취소 및 환불 규정',
    scopeLabel: '홈페이지 예약 기준',
    body: [
      '본 홈페이지를 통한 예약은 체크인 24시간 전까지 무료로 취소하실 수 있습니다.',
      '체크인 24시간 이내의 취소 및 노쇼(No-show)는 취소 수수료가 발생할 수 있습니다.',
      '투숙 중 환불은 이용약관 제4조에 따릅니다.',
      '특별 프로모션 또는 패키지 상품은 별도의 취소 정책이 적용될 수 있습니다.',
      '결제는 체크인 시 호텔 현장에서 진행됩니다.',
    ],
    note: '예약은 접수 후 호텔 확인을 거쳐 확정됩니다. 자세한 내용은 이용약관 제4조를 확인해 주세요.',
    fullTermsLabel: '이용약관 전문 보기',
  },
  en: {
    title: 'Cancellation & Refund Policy',
    scopeLabel: 'For bookings made on this website',
    body: [
      'Bookings made through this website can be cancelled free of charge up to 24 hours before check-in.',
      'Cancellations within 24 hours of check-in and no-shows may incur a cancellation fee.',
      'Refunds during your stay are governed by Article 4 of our Terms of Service.',
      'Special promotions or package deals may be subject to separate cancellation policies.',
      'Payment is made on-site at the hotel upon check-in.',
    ],
    note: 'Your booking is submitted as a request and confirmed after hotel review. See Article 4 of our Terms of Service for details.',
    fullTermsLabel: 'View full Terms of Service',
  },
  ja: {
    title: 'キャンセル・返金規定',
    scopeLabel: 'ホームページ予約の基準',
    body: [
      '本ホームページからのご予約は、チェックイン24時間前まで無料でキャンセルいただけます。',
      'チェックイン24時間以内のキャンセルおよびノーショーは、キャンセル料が発生する場合があります。',
      'ご滞在中の返金は利用規約第4条に従います。',
      '特別プロモーションやパッケージ商品には別途キャンセルポリシーが適用される場合があります。',
      'お支払いはチェックイン時にホテルにて行います。',
    ],
    note: 'ご予約はリクエストとして受付され、ホテル確認後に確定します。詳細は利用規約第4条をご確認ください。',
    fullTermsLabel: '利用規約の全文を見る',
  },
  zh: {
    title: '取消与退款规定',
    scopeLabel: '官网预订适用',
    body: [
      '通过本官网预订的房间可在入住前24小时之前免费取消。',
      '入住前24小时以内取消及未到（No-show）可能产生取消费用。',
      '住宿期间的退款依照《使用条款》第四条。',
      '特别促销或套餐产品可能适用其他取消政策。',
      '付款在入住时于酒店前台进行。',
    ],
    note: '预订提交后经酒店确认方可成立。详情请参阅《使用条款》第四条。',
    fullTermsLabel: '查看完整使用条款',
  },
};

/**
 * 이용약관 제4조 원문 — 약관 페이지가 사용
 *
 * 2026-08-21 개정: 홈페이지 예약 취소(24시간 기준)와 투숙 중 환불(3일 기준)이
 * 하나의 조항에 뭉뚱그려져 있어 서로 다른 기준이 구분되지 않던 문제를 정리했다.
 * 개정 시 약관 페이지의 lastUpdated도 함께 갱신할 것.
 */
export const termsCancellationArticle: Record<Locale, { heading: string; body: string[] }> = {
  ko: {
    heading: '제4조 (예약 변경 및 취소)',
    body: [
      '본 홈페이지를 통한 예약은 체크인 24시간 전까지 무료로 변경·취소할 수 있습니다.',
      '체크인 24시간 이내의 취소 및 노쇼(No-show)는 취소 수수료가 부과됩니다.',
      '투숙 중 환불은 체크인 3일 전 기준으로 산정하며, 체크인 2일 전 50%, 1일 전 또는 당일 100%의 수수료가 부과됩니다.',
      '특별 프로모션 또는 패키지 상품은 별도의 취소 정책이 적용될 수 있습니다.',
    ],
  },
  en: {
    heading: 'Article 4. Modification and Cancellation',
    body: [
      'Bookings made through this website may be modified or cancelled free of charge up to 24 hours before check-in.',
      'Cancellations within 24 hours of check-in and no-shows are subject to a cancellation fee.',
      'Refunds during a stay are calculated on the basis of 3 days before check-in: a 50% fee applies 2 days before check-in, and a 100% fee applies 1 day before or on the day of check-in.',
      'Special promotions or package deals may be subject to separate cancellation policies.',
    ],
  },
  ja: {
    heading: '第4条（予約変更・キャンセル）',
    body: [
      '本ホームページからのご予約は、チェックイン24時間前まで無料で変更・キャンセルいただけます。',
      'チェックイン24時間以内のキャンセルおよびノーショーには、キャンセル料が発生します。',
      'ご滞在中の返金はチェックイン3日前を基準に算定し、チェックイン2日前は50%、前日または当日は100%のキャンセル料が発生します。',
      '特別プロモーションやパッケージ商品には別途キャンセルポリシーが適用される場合があります。',
    ],
  },
  zh: {
    heading: '第四条 预订变更与取消',
    body: [
      '通过本官网预订的房间可在入住前24小时之前免费变更或取消。',
      '入住前24小时以内取消及未到（No-show）将收取取消费用。',
      '住宿期间的退款以入住前3天为基准计算：入住前2天收取房费的50%，入住前1天或当天收取房费的100%。',
      '特别促销或套餐产品可能适用其他取消政策。',
    ],
  },
};

/** 홈페이지 예약 취소 규정 조회 (미지원 로케일은 한국어로 폴백) */
export function getCancellationPolicy(locale: string): CancellationPolicy {
  return onlineBookingCancellationPolicy[locale as Locale] || onlineBookingCancellationPolicy.ko;
}
