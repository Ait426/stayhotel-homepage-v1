/**
 * 취소 및 환불 규정 — 단일 출처
 *
 * 이용약관 제4조와 예약 폼의 '규정 전문' 팝업이 **반드시 같은 내용**을 보여줘야 한다.
 * 고객이 예약 시 동의하는 규정과 약관에 적힌 규정이 다르면 분쟁이 생기므로
 * 문구는 이 파일에만 두고 양쪽이 여기를 참조한다.
 *
 * 출처: 이용약관 제4조 (예약 변경 및 취소)
 */

import { Locale } from '@/types';

export interface CancellationPolicy {
  /** 팝업 제목 */
  title: string;
  /** 약관에서 쓰는 조항 제목 */
  articleHeading: string;
  /** 규정 본문 항목 */
  body: string[];
  /** 하단 안내 */
  note: string;
  /** 전체 약관 링크 문구 */
  fullTermsLabel: string;
}

export const cancellationPolicy: Record<Locale, CancellationPolicy> = {
  ko: {
    title: '취소 및 환불 규정',
    articleHeading: '제4조 (예약 변경 및 취소)',
    body: [
      '예약 변경 및 취소는 체크인 3일 전까지 무료로 가능합니다.',
      '체크인 2일 전: 객실 요금의 50% 취소 수수료',
      '체크인 1일 전 또는 당일: 객실 요금의 100% 취소 수수료',
      '노쇼(No-show): 객실 요금의 100% 부과',
      '특별 프로모션 또는 패키지 상품은 별도의 취소 정책이 적용될 수 있습니다.',
    ],
    note: '본 규정은 이용약관 제4조에 근거합니다. 결제는 체크인 시 호텔 현장에서 진행됩니다.',
    fullTermsLabel: '이용약관 전문 보기',
  },
  en: {
    title: 'Cancellation & Refund Policy',
    articleHeading: 'Article 4. Modification and Cancellation',
    body: [
      'Free modification or cancellation is available up to 3 days before check-in.',
      '2 days before check-in: 50% cancellation fee',
      '1 day before or on the day of check-in: 100% cancellation fee',
      'No-show: 100% of room charge',
      'Special promotions or package deals may be subject to separate cancellation policies.',
    ],
    note: 'This policy is based on Article 4 of our Terms of Service. Payment is made on-site at check-in.',
    fullTermsLabel: 'View full Terms of Service',
  },
  ja: {
    title: 'キャンセル・返金規定',
    articleHeading: '第4条（予約変更・キャンセル）',
    body: [
      'チェックイン3日前まで無料で変更・キャンセルが可能です。',
      'チェックイン2日前：客室料金の50%のキャンセル料',
      'チェックイン前日または当日：客室料金の100%のキャンセル料',
      'ノーショー：客室料金の100%',
      '特別プロモーションやパッケージ商品には別途キャンセルポリシーが適用される場合があります。',
    ],
    note: '本規定は利用規約第4条に基づきます。お支払いはチェックイン時にホテルにて行います。',
    fullTermsLabel: '利用規約の全文を見る',
  },
  zh: {
    title: '取消与退款规定',
    articleHeading: '第四条 预订变更与取消',
    body: [
      '入住前3天可免费变更或取消预订。',
      '入住前2天：收取房费的50%作为取消费',
      '入住前1天或当天：收取房费的100%作为取消费',
      '未到（No-show）：收取房费的100%',
      '特别促销或套餐产品可能适用其他取消政策。',
    ],
    note: '本规定依据《使用条款》第四条。付款在入住时于酒店前台进行。',
    fullTermsLabel: '查看完整使用条款',
  },
};

/** 로케일별 취소 규정 조회 (미지원 로케일은 한국어로 폴백) */
export function getCancellationPolicy(locale: string): CancellationPolicy {
  return cancellationPolicy[locale as Locale] || cancellationPolicy.ko;
}
