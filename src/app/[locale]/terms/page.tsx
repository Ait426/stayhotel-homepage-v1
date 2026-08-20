export const runtime = 'edge';

import { Locale } from '@/types';
import { getBrandConfig } from '@/config/brand';
import { cancellationPolicy } from '@/config/policy';

interface PageProps {
  params: { locale: string };
}

export async function generateMetadata({ params }: PageProps) {
  const titles: Record<string, string> = {
    ko: '이용약관',
    en: 'Terms of Service',
    ja: '利用規約',
    zh: '使用条款',
  };
  return { title: titles[params.locale] || titles.en };
}

const content: Record<string, { title: string; lastUpdated: string; sections: { heading: string; body: string[] }[] }> = {
  ko: {
    title: '이용약관',
    lastUpdated: '2026년 2월 9일',
    sections: [
      {
        heading: '제1조 (목적)',
        body: [
          '본 약관은 STAY HOTEL in PYEONGTAEK(이하 "호텔")이 제공하는 숙박 및 부대 서비스(이하 "서비스")의 이용에 관한 사항을 규정함을 목적으로 합니다.',
        ],
      },
      {
        heading: '제2조 (예약 및 결제)',
        body: [
          '예약은 홈페이지, 전화 또는 메신저를 통해 가능하며, 예약 시 정확한 개인정보를 제공해야 합니다.',
          '예약 확정은 결제 완료 시점 또는 호텔의 예약 확인 통보 시점으로 합니다.',
          '요금은 객실 유형, 투숙 기간, 시즌에 따라 상이하며, 예약 시 안내된 금액이 적용됩니다.',
          '결제는 현장 결제(현금, 카드) 또는 온라인 결제로 가능합니다.',
        ],
      },
      {
        heading: '제3조 (체크인 및 체크아웃)',
        body: [
          '체크인 시간: 오후 3시 (15:00)',
          '체크아웃 시간: 낮 12시 (12:00)',
          '체크인 시 신분증 또는 여권을 제시해야 합니다.',
          '얼리 체크인 및 레이트 체크아웃은 객실 상황에 따라 추가 요금이 발생할 수 있습니다.',
        ],
      },
      {
        heading: '제4조 (예약 변경 및 취소)',
        body: cancellationPolicy.ko.body,
      },
      {
        heading: '제5조 (고객의 의무)',
        body: [
          '고객은 호텔 시설을 선량한 관리자의 주의로 이용해야 합니다.',
          '호텔 시설 및 비품의 훼손 시 고객은 해당 손해를 배상해야 합니다.',
          '타 고객에게 피해를 주는 행위(소음, 흡연 등)는 금지되며, 위반 시 퇴실 조치될 수 있습니다.',
          '객실 내 흡연은 전 객실 금지이며, 위반 시 별도의 청소 비용이 부과됩니다.',
        ],
      },
      {
        heading: '제6조 (호텔의 책임과 면책)',
        body: [
          '호텔은 고객에게 안전하고 쾌적한 숙박 환경을 제공하기 위해 최선을 다합니다.',
          '천재지변, 정전 등 불가항력적 사유로 인한 서비스 제공 불가 시 호텔은 책임을 지지 않습니다.',
          '고객의 귀중품 분실에 대해 호텔은 프론트에 보관을 요청하지 않은 경우 책임을 지지 않습니다.',
          '고객의 부주의로 인한 사고에 대해 호텔은 책임을 지지 않습니다.',
        ],
      },
      {
        heading: '제7조 (군인 및 기업 고객 특별 요금)',
        body: [
          '미군 관련 특별 요금은 체크인 시 유효한 군인 ID 제시가 필수입니다.',
          '기업 고객 특별 요금은 사업자등록증 또는 재직증명서 제시가 필요합니다.',
          '특별 요금은 다른 프로모션과 중복 적용이 불가합니다.',
        ],
      },
      {
        heading: '제8조 (분쟁 해결)',
        body: [
          '본 약관과 관련한 분쟁은 대한민국 법률에 따릅니다.',
          '분쟁 발생 시 호텔 소재지 관할 법원을 전속 관할 법원으로 합니다.',
        ],
      },
      {
        heading: '제9조 (약관의 변경)',
        body: [
          '호텔은 필요 시 본 약관을 변경할 수 있으며, 변경된 약관은 홈페이지에 공지합니다.',
          '변경된 약관은 공지 후 7일째부터 효력이 발생합니다.',
        ],
      },
    ],
  },
  en: {
    title: 'Terms of Service',
    lastUpdated: 'February 9, 2026',
    sections: [
      {
        heading: 'Article 1. Purpose',
        body: [
          'These Terms govern the use of accommodation and ancillary services ("Services") provided by STAY HOTEL in PYEONGTAEK ("Hotel").',
        ],
      },
      {
        heading: 'Article 2. Reservations and Payment',
        body: [
          'Reservations can be made via our website, phone, or messenger services. Accurate personal information must be provided at the time of booking.',
          'A reservation is confirmed upon completion of payment or upon receipt of confirmation from the Hotel.',
          'Rates vary by room type, duration of stay, and season. The rate quoted at the time of booking will apply.',
          'Payment may be made on-site (cash or card) or via online payment.',
        ],
      },
      {
        heading: 'Article 3. Check-in and Check-out',
        body: [
          'Check-in time: 3:00 PM (15:00)',
          'Check-out time: 12:00 PM (12:00)',
          'A valid ID or passport must be presented at check-in.',
          'Early check-in and late check-out are subject to availability and may incur additional charges.',
        ],
      },
      {
        heading: 'Article 4. Modification and Cancellation',
        body: cancellationPolicy.en.body,
      },
      {
        heading: 'Article 5. Guest Responsibilities',
        body: [
          'Guests shall use hotel facilities with due care and diligence.',
          'Guests are liable for any damage to hotel property or furnishings.',
          'Behavior that disturbs other guests (noise, smoking in unauthorized areas, etc.) is prohibited and may result in eviction.',
          'Smoking is prohibited in all rooms. A cleaning fee will be charged for violations.',
        ],
      },
      {
        heading: 'Article 6. Hotel Liability and Disclaimers',
        body: [
          'The Hotel strives to provide a safe and comfortable environment for all guests.',
          'The Hotel is not liable for service interruptions due to force majeure events such as natural disasters or power outages.',
          'The Hotel is not responsible for loss of valuables not deposited at the front desk.',
          'The Hotel is not liable for accidents caused by guest negligence.',
        ],
      },
      {
        heading: 'Article 7. Military and Corporate Rates',
        body: [
          'US Military special rates require a valid military ID at check-in.',
          'Corporate rates require a business registration certificate or employment verification.',
          'Special rates cannot be combined with other promotions.',
        ],
      },
      {
        heading: 'Article 8. Dispute Resolution',
        body: [
          'These Terms are governed by the laws of the Republic of Korea.',
          'Any disputes shall be submitted to the exclusive jurisdiction of the court with jurisdiction over the Hotel\'s location.',
        ],
      },
      {
        heading: 'Article 9. Changes to Terms',
        body: [
          'The Hotel may amend these Terms as necessary. Amended Terms will be posted on the website.',
          'Amended Terms take effect 7 days after posting.',
        ],
      },
    ],
  },
  ja: {
    title: '利用規約',
    lastUpdated: '2026年2月9日',
    sections: [
      {
        heading: '第1条（目的）',
        body: [
          '本規約は、STAY HOTEL in PYEONGTAEK（以下「ホテル」）が提供する宿泊および付帯サービス（以下「サービス」）の利用に関する事項を定めることを目的とします。',
        ],
      },
      {
        heading: '第2条（予約および決済）',
        body: [
          '予約はホームページ、電話、またはメッセンジャーにて可能です。予約時に正確な個人情報をご提供ください。',
          '予約確定は決済完了時またはホテルからの予約確認通知の時点とします。',
          '料金は客室タイプ、宿泊期間、シーズンにより異なり、予約時にご案内した金額が適用されます。',
          '決済は現地決済（現金・カード）またはオンライン決済が可能です。',
        ],
      },
      {
        heading: '第3条（チェックイン・チェックアウト）',
        body: [
          'チェックイン時間：午後3時（15:00）',
          'チェックアウト時間：正午12時（12:00）',
          'チェックイン時に身分証またはパスポートのご提示が必要です。',
          'アーリーチェックイン・レイトチェックアウトは客室状況により追加料金が発生する場合があります。',
        ],
      },
      {
        heading: '第4条（予約変更・キャンセル）',
        body: cancellationPolicy.ja.body,
      },
      {
        heading: '第5条（お客様の義務）',
        body: [
          'お客様はホテル施設を善良な管理者の注意をもってご利用ください。',
          'ホテル施設・備品の破損時、お客様はその損害を賠償する責任を負います。',
          '他のお客様への迷惑行為（騒音、喫煙等）は禁止されており、違反時は退室措置となる場合があります。',
          '全室禁煙です。違反時は別途清掃費用が請求されます。',
        ],
      },
      {
        heading: '第6条（ホテルの責任と免責）',
        body: [
          'ホテルはお客様に安全で快適な宿泊環境を提供するよう最善を尽くします。',
          '天災、停電等の不可抗力によるサービス提供不可の場合、ホテルは責任を負いません。',
          'フロントにお預けいただいていない貴重品の紛失についてホテルは責任を負いません。',
          'お客様の不注意による事故についてホテルは責任を負いません。',
        ],
      },
      {
        heading: '第7条（軍人・法人特別料金）',
        body: [
          '米軍特別料金はチェックイン時に有効な軍人IDの提示が必須です。',
          '法人特別料金は事業者登録証または在職証明書の提示が必要です。',
          '特別料金は他のプロモーションとの併用はできません。',
        ],
      },
      {
        heading: '第8条（紛争解決）',
        body: [
          '本規約に関する紛争は大韓民国の法律に準拠します。',
          '紛争発生時はホテル所在地の管轄裁判所を専属管轄裁判所とします。',
        ],
      },
      {
        heading: '第9条（規約の変更）',
        body: [
          'ホテルは必要に応じて本規約を変更できるものとし、変更後の規約はホームページにて告知します。',
          '変更後の規約は告知後7日目から効力が発生します。',
        ],
      },
    ],
  },
  zh: {
    title: '使用条款',
    lastUpdated: '2026年2月9日',
    sections: [
      {
        heading: '第一条 目的',
        body: [
          '本条款旨在规定STAY HOTEL in PYEONGTAEK（以下简称"酒店"）提供的住宿及附属服务（以下简称"服务"）的使用相关事项。',
        ],
      },
      {
        heading: '第二条 预订与支付',
        body: [
          '可通过官网、电话或即时通讯进行预订，预订时须提供准确的个人信息。',
          '预订在完成支付或酒店发出预订确认通知时确认。',
          '价格因房型、住宿时间和季节而异，以预订时告知的价格为准。',
          '可选择现场支付（现金或刷卡）或在线支付。',
        ],
      },
      {
        heading: '第三条 入住与退房',
        body: [
          '入住时间：下午3点（15:00）',
          '退房时间：中午12点（12:00）',
          '入住时须出示身份证或护照。',
          '提前入住和延迟退房视房间情况而定，可能产生额外费用。',
        ],
      },
      {
        heading: '第四条 预订变更与取消',
        body: cancellationPolicy.zh.body,
      },
      {
        heading: '第五条 客人的义务',
        body: [
          '客人应以善良管理人的注意义务使用酒店设施。',
          '损坏酒店设施及物品时，客人须承担相应赔偿责任。',
          '禁止影响其他客人的行为（噪音、吸烟等），违反者可能被要求退房。',
          '所有客房禁止吸烟，违反者将收取额外清洁费用。',
        ],
      },
      {
        heading: '第六条 酒店的责任与免责',
        body: [
          '酒店将尽力为客人提供安全舒适的住宿环境。',
          '因自然灾害、停电等不可抗力导致无法提供服务时，酒店不承担责任。',
          '未在前台寄存的贵重物品丢失，酒店不承担责任。',
          '因客人自身疏忽导致的事故，酒店不承担责任。',
        ],
      },
      {
        heading: '第七条 军人及企业客户特别价格',
        body: [
          '美军特别价格须在入住时出示有效军人ID。',
          '企业特别价格须出示营业执照或在职证明。',
          '特别价格不可与其他促销活动同时使用。',
        ],
      },
      {
        heading: '第八条 争议解决',
        body: [
          '本条款相关争议适用大韩民国法律。',
          '发生争议时，以酒店所在地管辖法院为专属管辖法院。',
        ],
      },
      {
        heading: '第九条 条款变更',
        body: [
          '酒店可根据需要变更本条款，变更后的条款将在官网公告。',
          '变更后的条款自公告后第7日起生效。',
        ],
      },
    ],
  },
};

export default async function TermsPage({ params }: PageProps) {
  const locale = params.locale as Locale;
  const brand = getBrandConfig();
  const brandName = brand.name[locale] || brand.name.en;
  const c = content[locale] || content.en;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <section className="bg-primary-900 pt-40 pb-16">
        <div className="container-custom text-center">
          <h1 className="text-3xl md:text-4xl font-serif text-white tracking-wide">
            {c.title}
          </h1>
          <p className="text-white/40 text-sm mt-4 tracking-wide">
            {brandName}
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 md:py-24">
        <div className="container-custom max-w-3xl">
          <p className="text-sm text-neutral-400 mb-12">
            {{ ko: '최종 수정일', en: 'Last updated', ja: '最終更新日', zh: '最后更新' }[locale]}: {c.lastUpdated}
          </p>

          <div className="space-y-10">
            {c.sections.map((section, i) => (
              <div key={i}>
                <h2 className="text-lg font-medium text-primary-900 mb-4 tracking-wide">
                  {section.heading}
                </h2>
                <div className="space-y-2">
                  {section.body.map((line, j) => (
                    <p key={j} className="text-sm text-neutral-600 leading-relaxed">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Contact Info */}
          <div className="mt-12 pt-8 border-t border-neutral-200">
            <div className="space-y-1.5 text-sm text-neutral-500">
              <p>{brandName}</p>
              <p>{brand.contact.phone}</p>
              <p>{brand.contact.email}</p>
              <p>{brand.contact.address[locale] || brand.contact.address.ko}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
