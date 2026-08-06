export const runtime = 'edge';

/**
 * Booking Page - Seoul Dragon City Style
 *
 * Premium booking experience with elegant styling
 */

import BookingForm from '@/components/BookingForm';
import { createTranslator } from '@/lib/translations';
import { buildAlternates } from '@/lib/seo';

interface BookingPageProps {
  params: { locale: string };
  searchParams: {
    room?: string;
    checkIn?: string;
    checkOut?: string;
    guestCount?: string;
    reservationType?: string;
    step?: string;
  };
}

export async function generateMetadata({ params }: BookingPageProps) {
  const t = createTranslator(params.locale, 'booking');

  return {
    title: t('title'),
    description: t('subtitle'),
    alternates: buildAlternates(params.locale, '/booking'),
  };
}

export default async function BookingPage({ params, searchParams }: BookingPageProps) {
  const { locale } = params;
  const preselectedRoom = searchParams?.room;
  const initialCheckIn = searchParams?.checkIn;
  const initialCheckOut = searchParams?.checkOut;
  const initialGuestCount = searchParams?.guestCount;
  const initialReservationType = searchParams?.reservationType;
  const initialStep = searchParams?.step;

  return (
    <>
      {/* Page Header */}
      <section className="relative h-[50vh] md:h-[65vh] min-h-[350px] md:min-h-[500px] flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(/images/rooms/premium/3.JPG)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary-900/70 via-primary-900/50 to-primary-900/80" />

        {/* Content */}
        <div className="relative z-10 container-custom text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-normal text-white mb-6 tracking-wide">
            Booking
          </h1>
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-12 h-px bg-accent-500" />
            <div className="w-1.5 h-1.5 rotate-45 bg-accent-500" />
            <div className="w-12 h-px bg-accent-500" />
          </div>
        </div>
      </section>

      {/* Booking Form Section */}
      <section className="section bg-white">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <BookingForm
              locale={locale as 'ko' | 'en' | 'ja' | 'zh'}
              preselectedRoomId={preselectedRoom}
              initialCheckIn={initialCheckIn}
              initialCheckOut={initialCheckOut}
              initialGuestCount={initialGuestCount ? Number(initialGuestCount) : undefined}
              initialReservationType={initialReservationType as 'general' | 'corporate' | 'military' | undefined}
              initialStep={initialStep as 'dates' | 'room' | undefined}
            />
          </div>
        </div>
      </section>

      {/* Info Section */}
      <section className="py-20 bg-neutral-50">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-neutral-200">
              {/* Check-in/out times */}
              <div className="bg-white p-6 md:p-8 lg:p-10 text-center">
                <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center text-accent-500">
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="font-serif text-xl text-primary-900 mb-3 tracking-wide">
                  {{ ko: '체크인/아웃', en: 'Check-in/out', ja: 'チェックイン/アウト', zh: '入住/退房' }[locale]}
                </h3>
                <p className="text-neutral-500 text-sm leading-relaxed">
                  {{ ko: '체크인 15:00 / 체크아웃 12:00', en: 'Check-in 3:00 PM / Check-out 12:00 PM', ja: 'チェックイン 15:00 / チェックアウト 12:00', zh: '入住 15:00 / 退房 12:00' }[locale]}
                </p>
              </div>

              {/* Payment info */}
              <div className="bg-white p-6 md:p-8 lg:p-10 text-center">
                <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center text-accent-500">
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                </div>
                <h3 className="font-serif text-xl text-primary-900 mb-3 tracking-wide">
                  {{ ko: '결제 방법', en: 'Payment', ja: 'お支払い方法', zh: '付款方式' }[locale]}
                </h3>
                <p className="text-neutral-500 text-sm leading-relaxed">
                  {{ ko: '현장 결제 (카드/현금)', en: 'Pay at hotel (Card/Cash)', ja: '現地払い（カード/現金）', zh: '到店支付（卡/现金）' }[locale]}
                </p>
              </div>

              {/* Cancellation */}
              <div className="bg-white p-6 md:p-8 lg:p-10 text-center">
                <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center text-accent-500">
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="font-serif text-xl text-primary-900 mb-3 tracking-wide">
                  {{ ko: '무료 취소', en: 'Free Cancellation', ja: '無料キャンセル', zh: '免费取消' }[locale]}
                </h3>
                <p className="text-neutral-500 text-sm leading-relaxed">
                  {{ ko: '체크인 24시간 전까지 무료', en: 'Free until 24h before check-in', ja: 'チェックイン24時間前まで無料', zh: '入住前24小时免费' }[locale]}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
