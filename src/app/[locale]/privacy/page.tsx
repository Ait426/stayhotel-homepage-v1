export const runtime = 'edge';

import { Locale } from '@/types';
import { getBrandConfig } from '@/config/brand';
import { buildAlternates } from '@/lib/seo';

interface PageProps {
  params: { locale: string };
}

export async function generateMetadata({ params }: PageProps) {
  const titles: Record<string, string> = {
    ko: '개인정보처리방침',
    en: 'Privacy Policy',
    ja: 'プライバシーポリシー',
    zh: '隐私政策',
  };
  return {
    title: titles[params.locale] || titles.en,
    alternates: buildAlternates(params.locale, '/privacy'),
  };
}

const content: Record<string, { title: string; lastUpdated: string; sections: { heading: string; body: string[] }[] }> = {
  ko: {
    title: '개인정보처리방침',
    lastUpdated: '2026년 2월 9일',
    sections: [
      {
        heading: '1. 개인정보의 수집 항목 및 수집 방법',
        body: [
          '회사는 예약, 고객 문의 등 서비스 제공을 위해 아래와 같은 개인정보를 수집합니다.',
          '필수 항목: 성명, 연락처(전화번호), 이메일 주소',
          '선택 항목: 투숙 목적, 특별 요청사항',
          '수집 방법: 홈페이지 예약 폼, 전화 예약, 메신저(WhatsApp, LINE, WeChat) 문의',
        ],
      },
      {
        heading: '2. 개인정보의 수집 및 이용 목적',
        body: [
          '객실 예약 및 투숙 관리',
          '고객 문의 및 불만 처리',
          '서비스 개선 및 마케팅 정보 제공 (동의 시)',
          '법령에 따른 의무 이행',
        ],
      },
      {
        heading: '3. 개인정보의 보유 및 이용 기간',
        body: [
          '예약 및 투숙 기록: 체크아웃일로부터 5년 (관광진흥법)',
          '고객 문의 기록: 처리 완료 후 3년 (전자상거래법)',
          '마케팅 수신 동의 기록: 동의 철회 시까지',
          '위 기간이 경과한 개인정보는 지체 없이 파기합니다.',
        ],
      },
      {
        heading: '4. 개인정보의 제3자 제공',
        body: [
          '회사는 원칙적으로 고객의 개인정보를 제3자에게 제공하지 않습니다. 다만, 아래의 경우에는 예외로 합니다.',
          '고객이 사전에 동의한 경우',
          '법령에 따라 수사기관 등에 제공이 요구되는 경우',
          '결제 처리를 위해 결제 대행사에 최소한의 정보를 전달하는 경우',
        ],
      },
      {
        heading: '5. 개인정보의 파기 절차 및 방법',
        body: [
          '전자적 파일: 복구할 수 없는 방법으로 영구 삭제',
          '종이 문서: 분쇄기를 이용하여 파기',
          '보유 기간이 만료된 개인정보는 만료일로부터 5일 이내에 파기합니다.',
        ],
      },
      {
        heading: '6. 고객의 권리와 행사 방법',
        body: [
          '고객은 언제든지 본인의 개인정보에 대해 열람, 정정, 삭제, 처리 정지를 요청할 수 있습니다.',
          '요청 방법: 이메일 또는 전화를 통해 본인 확인 후 처리',
          '요청 처리 기간: 접수일로부터 10일 이내',
        ],
      },
      {
        heading: '7. 쿠키(Cookie) 사용',
        body: [
          '회사는 웹사이트 이용 편의를 위해 쿠키를 사용할 수 있습니다.',
          '쿠키는 브라우저 설정을 통해 거부할 수 있으며, 이 경우 일부 서비스 이용에 제한이 있을 수 있습니다.',
        ],
      },
      {
        heading: '8. 개인정보 보호책임자',
        body: [
          '개인정보 관련 문의사항은 아래 연락처로 문의해 주시기 바랍니다.',
        ],
      },
      {
        heading: '9. 방침 변경에 관한 사항',
        body: [
          '본 개인정보처리방침은 법령 또는 회사 정책의 변경에 따라 수정될 수 있습니다.',
          '변경 사항은 홈페이지를 통해 공지하며, 변경된 방침은 공지 후 7일째부터 효력이 발생합니다.',
        ],
      },
    ],
  },
  en: {
    title: 'Privacy Policy',
    lastUpdated: 'February 9, 2026',
    sections: [
      {
        heading: '1. Information We Collect',
        body: [
          'We collect personal information to provide reservation and hospitality services.',
          'Required: Full name, phone number, email address',
          'Optional: Purpose of stay, special requests',
          'Collection methods: Website reservation form, phone reservations, messenger inquiries (WhatsApp, LINE, WeChat)',
        ],
      },
      {
        heading: '2. Purpose of Collection and Use',
        body: [
          'Room reservation and guest management',
          'Customer inquiries and complaint resolution',
          'Service improvement and marketing communications (with consent)',
          'Compliance with legal obligations',
        ],
      },
      {
        heading: '3. Retention Period',
        body: [
          'Reservation and stay records: 5 years from checkout (Tourism Promotion Act)',
          'Customer inquiry records: 3 years after resolution (E-Commerce Act)',
          'Marketing consent records: Until consent is withdrawn',
          'Personal information is destroyed without delay after the retention period expires.',
        ],
      },
      {
        heading: '4. Disclosure to Third Parties',
        body: [
          'We do not share personal information with third parties except in the following cases:',
          'When the customer has given prior consent',
          'When required by law or requested by investigative authorities',
          'When minimum information is shared with payment processors for transaction processing',
        ],
      },
      {
        heading: '5. Destruction of Personal Information',
        body: [
          'Electronic files: Permanently deleted using irrecoverable methods',
          'Paper documents: Destroyed using a shredder',
          'Expired personal information is destroyed within 5 days of expiration.',
        ],
      },
      {
        heading: '6. Your Rights',
        body: [
          'You may request access to, correction of, deletion of, or suspension of processing of your personal information at any time.',
          'How to request: Via email or phone after identity verification',
          'Processing time: Within 10 days of receipt',
        ],
      },
      {
        heading: '7. Use of Cookies',
        body: [
          'We may use cookies to enhance your browsing experience.',
          'You can refuse cookies through your browser settings, though some services may be limited.',
        ],
      },
      {
        heading: '8. Privacy Officer',
        body: [
          'For any privacy-related inquiries, please contact us using the information below.',
        ],
      },
      {
        heading: '9. Changes to This Policy',
        body: [
          'This privacy policy may be updated in accordance with changes in law or company policy.',
          'Changes will be announced on the website and take effect 7 days after posting.',
        ],
      },
    ],
  },
  ja: {
    title: 'プライバシーポリシー',
    lastUpdated: '2026年2月9日',
    sections: [
      {
        heading: '1. 収集する個人情報',
        body: [
          '当ホテルは予約・接客サービスの提供のため、以下の個人情報を収集いたします。',
          '必須項目：氏名、電話番号、メールアドレス',
          '任意項目：宿泊目的、特別なご要望',
          '収集方法：ホームページ予約フォーム、電話予約、メッセンジャー（WhatsApp、LINE、WeChat）でのお問い合わせ',
        ],
      },
      {
        heading: '2. 収集・利用の目的',
        body: [
          '客室予約および宿泊管理',
          'お客様のお問い合わせ・苦情対応',
          'サービス改善およびマーケティング情報の提供（同意時）',
          '法令に基づく義務の履行',
        ],
      },
      {
        heading: '3. 保有期間',
        body: [
          '予約・宿泊記録：チェックアウト日から5年',
          'お問い合わせ記録：処理完了後3年',
          'マーケティング同意記録：同意撤回時まで',
          '上記期間経過後、遅滞なく破棄いたします。',
        ],
      },
      {
        heading: '4. 第三者への提供',
        body: [
          '当ホテルは原則としてお客様の個人情報を第三者に提供いたしません。ただし、以下の場合を除きます。',
          'お客様が事前に同意された場合',
          '法令により捜査機関等への提供が求められる場合',
          '決済処理のために決済代行会社に最小限の情報を伝達する場合',
        ],
      },
      {
        heading: '5. 個人情報の破棄',
        body: [
          '電子ファイル：復元不可能な方法で永久削除',
          '紙文書：シュレッダーにて破棄',
          '保有期間満了後5日以内に破棄いたします。',
        ],
      },
      {
        heading: '6. お客様の権利',
        body: [
          'お客様はいつでもご自身の個人情報について、閲覧・訂正・削除・処理停止を請求できます。',
          '請求方法：メールまたは電話にて本人確認後に対応',
          '処理期間：受付日から10日以内',
        ],
      },
      {
        heading: '7. Cookieの使用',
        body: [
          '当ホテルはウェブサイトの利便性向上のためCookieを使用する場合があります。',
          'Cookieはブラウザ設定で拒否できますが、一部サービスの利用に制限が生じる場合があります。',
        ],
      },
      {
        heading: '8. 個人情報保護責任者',
        body: [
          '個人情報に関するお問い合わせは、下記連絡先までご連絡ください。',
        ],
      },
      {
        heading: '9. ポリシーの変更',
        body: [
          '本ポリシーは法令または会社方針の変更に伴い改定される場合があります。',
          '変更内容はホームページにて告知し、告知後7日目から効力が発生します。',
        ],
      },
    ],
  },
  zh: {
    title: '隐私政策',
    lastUpdated: '2026年2月9日',
    sections: [
      {
        heading: '1. 收集的个人信息',
        body: [
          '为提供预订及接待服务，本酒店收集以下个人信息。',
          '必填项：姓名、电话号码、电子邮箱',
          '选填项：住宿目的、特殊要求',
          '收集方式：官网预订表单、电话预订、即时通讯（WhatsApp、LINE、WeChat）咨询',
        ],
      },
      {
        heading: '2. 收集和使用目的',
        body: [
          '客房预订及住宿管理',
          '客户咨询及投诉处理',
          '服务改善及营销信息提供（经同意）',
          '履行法律规定的义务',
        ],
      },
      {
        heading: '3. 保留期限',
        body: [
          '预订及住宿记录：退房之日起5年',
          '客户咨询记录：处理完成后3年',
          '营销同意记录：至撤回同意时',
          '超过上述期限后将立即销毁。',
        ],
      },
      {
        heading: '4. 向第三方提供',
        body: [
          '本酒店原则上不向第三方提供客户个人信息，但以下情况除外：',
          '客户事先同意的情况',
          '法律规定需向调查机关提供的情况',
          '为处理支付向支付机构传递最少信息的情况',
        ],
      },
      {
        heading: '5. 个人信息的销毁',
        body: [
          '电子文件：以不可恢复的方式永久删除',
          '纸质文件：使用碎纸机销毁',
          '保留期限届满后5日内销毁。',
        ],
      },
      {
        heading: '6. 您的权利',
        body: [
          '您可随时要求查阅、更正、删除或暂停处理您的个人信息。',
          '申请方式：通过电子邮件或电话验证身份后处理',
          '处理期限：受理之日起10日内',
        ],
      },
      {
        heading: '7. Cookie的使用',
        body: [
          '本酒店可能使用Cookie以提升网站使用体验。',
          '您可通过浏览器设置拒绝Cookie，但部分服务可能受到限制。',
        ],
      },
      {
        heading: '8. 隐私保护负责人',
        body: [
          '如有隐私相关问题，请通过以下联系方式与我们联系。',
        ],
      },
      {
        heading: '9. 政策变更',
        body: [
          '本隐私政策可能因法律或公司政策变更而修改。',
          '变更内容将在网站公告，公告后第7日起生效。',
        ],
      },
    ],
  },
};

export default async function PrivacyPage({ params }: PageProps) {
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
