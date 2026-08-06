export const runtime = 'edge';

import { buildAlternates } from '@/lib/seo';

interface PageProps {
    params: { locale: string };
}

export async function generateMetadata({ params }: PageProps) {
    return {
        title: { ko: '부대시설', en: 'Facilities', ja: '施設', zh: '设施' }[params.locale] || 'Facilities',
        description: { ko: '다양한 부대시설을 즐겨보세요.', en: 'Enjoy our various facilities.', ja: '多彩な施設をお楽しみください。', zh: '享受我们的各种设施。' }[params.locale] || 'Enjoy our various facilities.',
        alternates: buildAlternates(params.locale, '/facilities'),
    };
}

const facilities = [
    {
        name: { ko: '피트니스 센터', en: 'Fitness Center', ja: 'フィットネスセンター', zh: '健身中心' },
        desc: { ko: '최신 운동 기구를 갖춘 피트니스 센터', en: 'Fully equipped fitness center with modern equipment', ja: '最新のトレーニング機器を備えたフィットネスセンター', zh: '配备现代化设备的健身中心' },
        image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200&auto=format&fit=crop',
    },
    {
        name: { ko: '레스토랑', en: 'Restaurant', ja: 'レストラン', zh: '餐厅' },
        desc: { ko: '조식 및 다양한 메뉴를 제공하는 레스토랑', en: 'Restaurant serving breakfast and various cuisines', ja: '朝食や多彩なメニューをご提供するレストラン', zh: '提供早餐及各种美食的餐厅' },
        image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1200&auto=format&fit=crop',
    },
    {
        name: { ko: '세탁실', en: 'Laundry Room', ja: 'ランドリールーム', zh: '洗衣房' },
        desc: { ko: '24시간 이용 가능한 셀프 세탁실', en: '24-hour self-service laundry room', ja: '24時間利用可能なセルフランドリー', zh: '24小时自助洗衣房' },
        image: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?q=80&w=1200&auto=format&fit=crop',
    },
    {
        name: { ko: '비즈니스 센터', en: 'Business Center', ja: 'ビジネスセンター', zh: '商务中心' },
        desc: { ko: '프린터, PC 등을 갖춘 비즈니스 센터', en: 'Business center with printer, PC and more', ja: 'プリンター・PC完備のビジネスセンター', zh: '配备打印机和电脑的商务中心' },
        image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1200&auto=format&fit=crop',
    },
];

export default async function FacilitiesPage({ params }: PageProps) {
    const { locale } = params;
    const loc = locale as 'ko' | 'en' | 'ja' | 'zh';

    return (
        <div className="min-h-screen bg-white pb-20">
            {/* Header Section */}
            <section className="relative h-[50vh] md:h-[65vh] min-h-[350px] md:min-h-[500px] flex items-center justify-center overflow-hidden">
                {/* Background */}
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage: 'url(https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=1920&auto=format&fit=crop)',
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-primary-900/70 via-primary-900/50 to-primary-900/80" />

                {/* Content */}
                <div className="relative z-10 container mx-auto px-6 text-center text-white">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-normal text-white mb-6 tracking-wide">
                        Facilities
                    </h1>
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <div className="w-12 h-px bg-accent-500" />
                        <div className="w-1.5 h-1.5 rotate-45 bg-accent-500" />
                        <div className="w-12 h-px bg-accent-500" />
                    </div>
                </div>
            </section>

            {/* Content Section */}
            <div className="container mx-auto px-6 py-20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {facilities.map((facility, idx) => (
                        <div key={idx} className="group relative h-64 md:h-80 lg:h-96 rounded-lg overflow-hidden">
                            <img
                                src={facility.image}
                                alt={facility.name[loc]}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors duration-300" />
                            <div className="absolute inset-x-0 bottom-0 p-4 md:p-6 lg:p-8">
                                <h3 className="text-2xl font-serif text-white mb-2">{facility.name[loc]}</h3>
                                <p className="text-white/80 text-sm">{facility.desc[loc]}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-neutral-500 mt-4 text-right w-full">
                    {{ ko: '* 본 부대시설 이미지는 이해를 돕기 위한 연출 컷으로 실제 운영 중인 시설의 형태와 다를 수 있습니다.', en: '* Notice: Facility images are conceptual renderings. Actual amenities are available but may vary in appearance.', ja: '* 本施設の画像はイメージです。実際に運営中の施設と外観が異なる場合があります。', zh: '* 本设施图片为概念效果图。实际设施已投入运营，但外观可能有所不同。' }[loc]}
                </p>
            </div>
        </div>
    );
}
