/**
 * Location & Access — homepage section.
 *
 * "2 minutes from Pyeongtaek Station" is the hotel's strongest selling point and
 * the thing guests search for, but it only existed in the meta description and
 * the footer address. This puts it on the page, above the fold of the second
 * screen, with a tap-to-call and a map link.
 */

import Link from 'next/link';
import { Locale } from '@/types';
import { getBrandConfig } from '@/config/brand';

interface LocationSectionProps {
  locale: Locale;
}

type Localized = Record<Locale, string>;

const COPY: Record<string, Localized> = {
  eyebrow: { ko: '위치 & 교통', en: 'Location & Access', ja: 'アクセス', zh: '位置与交通' },
  heading: {
    ko: '평택역에서 걸어서 2분',
    en: 'A 2-Minute Walk from Pyeongtaek Station',
    ja: '平澤駅から徒歩2分',
    zh: '距平泽站步行2分钟',
  },
  body: {
    ko: 'KTX·SRT·지하철 1호선이 모두 지나는 평택역 바로 앞. 캠프 험프리스와 평택항, 산업단지 어디로든 이동이 편리합니다.',
    en: 'Right by Pyeongtaek Station, served by KTX, SRT and Seoul Subway Line 1 — with easy access to Camp Humphreys, Pyeongtaek Port and the industrial complexes.',
    ja: 'KTX・SRT・地下鉄1号線が通る平澤駅のすぐ前。キャンプ・ハンフリーズや平澤港、産業団地へのアクセスも良好です。',
    zh: '紧邻平泽站，KTX、SRT与地铁1号线均可到达，前往汉弗莱营、平泽港及各产业园区都很方便。',
  },
  directions: { ko: '오시는 길 자세히', en: 'Detailed Directions', ja: 'アクセス詳細', zh: '详细路线' },
  callLabel: { ko: '전화 문의', en: 'Call Us', ja: 'お電話', zh: '电话咨询' },
  mapLabel: { ko: '지도에서 보기', en: 'View on Map', ja: '地図で見る', zh: '在地图上查看' },
  addressLabel: { ko: '주소', en: 'Address', ja: '住所', zh: '地址' },
};

const HIGHLIGHTS: { value: Localized; label: Localized }[] = [
  {
    value: { ko: '도보 2분', en: '2 min walk', ja: '徒歩2分', zh: '步行2分钟' },
    label: { ko: '평택역', en: 'Pyeongtaek Stn.', ja: '平澤駅', zh: '平泽站' },
  },
  {
    value: { ko: '차로 20분', en: '20 min drive', ja: '車で20分', zh: '车程20分钟' },
    label: { ko: '캠프 험프리스', en: 'Camp Humphreys', ja: 'キャンプ・ハンフリーズ', zh: '汉弗莱营' },
  },
  {
    value: { ko: '15:00 / 12:00', en: '15:00 / 12:00', ja: '15:00 / 12:00', zh: '15:00 / 12:00' },
    label: { ko: '체크인 / 체크아웃', en: 'Check-in / out', ja: 'チェックイン/アウト', zh: '入住 / 退房' },
  },
];

export default function LocationSection({ locale }: LocationSectionProps) {
  const brand = getBrandConfig();
  const address = brand.contact.address[locale] || brand.contact.address.ko;
  const phone = brand.contact.phone;
  const telHref = `tel:${phone.replace(/[^\d+]/g, '')}`;
  const mapUrl = `https://map.naver.com/p/search/${encodeURIComponent(brand.contact.address.ko)}`;

  return (
    <section className="py-20 md:py-28 bg-primary-900 text-white">
      <div className="container-custom">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Copy */}
          <div>
            <span className="inline-block text-xs font-medium text-accent-400 uppercase tracking-[0.3em] mb-4">
              {COPY.eyebrow[locale]}
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-normal tracking-wide mb-6 text-white">
              {COPY.heading[locale]}
            </h2>
            <p className="text-white/75 text-base md:text-lg leading-relaxed font-light mb-8">
              {COPY.body[locale]}
            </p>

            <dl className="mb-8">
              <dt className="text-xs uppercase tracking-[0.2em] text-white/50 mb-2">
                {COPY.addressLabel[locale]}
              </dt>
              <dd className="text-white/90 text-base leading-relaxed">{address}</dd>
            </dl>

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={telHref}
                className="inline-flex items-center justify-center px-8 py-3.5 bg-accent-500 text-primary-900 text-sm font-bold tracking-[0.15em] uppercase transition-colors duration-300 hover:bg-white"
              >
                {COPY.callLabel[locale]} · {phone}
              </a>
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-8 py-3.5 border border-white/40 text-white text-sm tracking-[0.15em] uppercase transition-colors duration-300 hover:bg-white hover:text-primary-900"
              >
                {COPY.mapLabel[locale]}
              </a>
            </div>
          </div>

          {/* Highlights */}
          <div>
            <ul className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-px bg-white/15">
              {HIGHLIGHTS.map((item) => (
                <li key={item.label.en} className="bg-primary-900 px-6 py-7 lg:py-8">
                  <p className="font-serif text-2xl md:text-3xl text-accent-400 mb-1.5">
                    {item.value[locale]}
                  </p>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                    {item.label[locale]}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-8 text-center lg:text-left">
              <Link
                href={`/${locale}/location`}
                className="group inline-flex items-center gap-2 text-sm tracking-widest uppercase text-white/80 hover:text-accent-400 transition-colors"
              >
                {COPY.directions[locale]}
                <svg
                  aria-hidden="true"
                  className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
