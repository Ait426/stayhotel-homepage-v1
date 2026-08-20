'use client';

/**
 * Booking Form Component - Seoul Dragon City Style
 *
 * Elegant multi-step booking form with premium styling
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from '@/lib/translations';
import { Locale, BookingFormData, ReservationType, TransportationType } from '@/types';
import { rooms, getRoomName, formatPrice, calculateRoomTotal, calculateExtraGuestFee, getExtraGuestCount } from '@/config/rooms';
import { MILITARY_FIXED_RATE_USD } from '@/config/events';
import { getCancellationPolicy } from '@/config/policy';
import DatePickerInput from './DatePickerInput';
import DropdownSelect from './DropdownSelect';
import { getTodayString, getTomorrowString, calculateNights, formatCurrency } from '@/lib/utils';

interface BookingFormProps {
  locale: Locale;
  preselectedRoomId?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuestCount?: number;
  initialReservationType?: ReservationType;
  initialStep?: 'dates' | 'room';
}

type FormStep = 'dates' | 'room' | 'info' | 'confirm' | 'success';

const reservationTypeOptions: { value: ReservationType; label: Record<Locale, string> }[] = [
  { value: 'general', label: { ko: '일반', en: 'General', ja: '一般', zh: '普通' } },
  { value: 'corporate', label: { ko: '기업체', en: 'Corporate', ja: '法人', zh: '企业' } },
  { value: 'military', label: { ko: '군인', en: 'Military', ja: '軍人', zh: '军人' } },
];

const transportationOptions: { value: TransportationType; label: Record<Locale, string> }[] = [
  { value: 'walk', label: { ko: '도보', en: 'Walk', ja: '徒歩', zh: '步行' } },
  { value: 'car', label: { ko: '차량', en: 'Car', ja: '車', zh: '车辆' } },
];

export default function BookingForm({ locale, preselectedRoomId, initialCheckIn, initialCheckOut, initialGuestCount, initialReservationType, initialStep }: BookingFormProps) {
  const t = useTranslations('booking');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const searchParams = useSearchParams();

  // Promo flags — only active when arriving from Events page CTA
  const isLongstayPromo = searchParams.get('promo') === 'longstay';
  const isMilitaryPromo = searchParams.get('promo') === 'military';

  // Form state
  const [step, setStep] = useState<FormStep>(initialStep || 'dates');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<string>('');
  const [error, setError] = useState<string>('');
  // 취소·환불 규정 팝업
  const [isPolicyOpen, setIsPolicyOpen] = useState(false);
  const policy = getCancellationPolicy(locale);

  // Form data
  const [formData, setFormData] = useState<BookingFormData>({
    roomId: isMilitaryPromo ? 'standard' : (preselectedRoomId || ''),
    checkIn: initialCheckIn || getTodayString(),
    checkOut: initialCheckOut || getTomorrowString(),
    guestCount: initialGuestCount || 2,
    reservationType: isMilitaryPromo ? 'military' : (initialReservationType || 'general'),
    transportation: 'walk',
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    specialRequests: '',
    agreedToPolicy: false,
  });

  // If preselected room, skip to info step
  useEffect(() => {
    if (preselectedRoomId) {
      setStep('dates');
    }
  }, [preselectedRoomId]);

  // 규정 팝업: ESC로 닫기 + 열려 있는 동안 배경 스크롤 잠금
  useEffect(() => {
    if (!isPolicyOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsPolicyOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isPolicyOpen]);

  // Get selected room
  const selectedRoom = rooms.find((r) => r.id === formData.roomId);

  // Calculate total price (day-by-day for Fri/Sat rates)
  const nights = calculateNights(formData.checkIn, formData.checkOut);
  const roomBaseTotal = selectedRoom ? calculateRoomTotal(selectedRoom, formData.checkIn, formData.checkOut) : 0;
  // 추가 인원 요금
  const extraGuestFeeTotal = selectedRoom ? calculateExtraGuestFee(selectedRoom, formData.guestCount, nights) : 0;
  const totalPrice = roomBaseTotal + extraGuestFeeTotal;

  // Long-stay promo discount calculation (disabled when military promo is active)
  const promoBlocked = (isLongstayPromo && formData.reservationType === 'military') || isMilitaryPromo;
  const promoDiscount = (() => {
    if (!isLongstayPromo || promoBlocked) return { rate: 0, label: '' as 'longstay_10' | 'longstay_15' | null, amount: 0 };
    if (nights >= 7) return { rate: 0.15, label: 'longstay_15' as const, amount: totalPrice - Math.floor(totalPrice * 0.85) };
    if (nights >= 2) return { rate: 0.10, label: 'longstay_10' as const, amount: totalPrice - Math.floor(totalPrice * 0.90) };
    return { rate: 0, label: null, amount: 0 };
  })();

  // Military fixed rate: 고정 요금/박 (추가 인원 요금 없음)
  const militaryFixedRate = isMilitaryPromo ? nights * MILITARY_FIXED_RATE_USD : 0;
  const finalPrice = isMilitaryPromo ? militaryFixedRate : (promoDiscount.rate > 0 ? totalPrice - promoDiscount.amount : totalPrice);

  // 전체 객실 중 최대 인원 (드롭다운 상한)
  const overallMaxGuests = Math.max(...rooms.map(r => r.maxGuests));

  // Check if selected dates include Friday or Saturday (weekend surcharge)
  const includesWeekend = (() => {
    const current = new Date(formData.checkIn + 'T00:00:00');
    const end = new Date(formData.checkOut + 'T00:00:00');
    while (current < end) {
      const day = current.getDay();
      if (day === 5 || day === 6) return true;
      current.setDate(current.getDate() + 1);
    }
    return false;
  })();

  // Handle form field changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  // Validate current step
  const validateStep = (): boolean => {
    switch (step) {
      case 'dates':
        if (!formData.checkIn || !formData.checkOut) {
          setError(tErrors('invalidDates'));
          return false;
        }
        if (new Date(formData.checkOut) <= new Date(formData.checkIn)) {
          setError(tErrors('invalidDates'));
          return false;
        }
        return true;

      case 'room':
        if (!formData.roomId) {
          setError({ ko: '객실을 선택해주세요', en: 'Please select a room', ja: '客室を選択してください', zh: '请选择客房' }[locale] || 'Please select a room');
          return false;
        }
        return true;

      case 'info':
        if (!formData.guestName) {
          setError(tErrors('requiredField'));
          return false;
        }
        if (!formData.guestEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.guestEmail)) {
          setError(tErrors('invalidEmail'));
          return false;
        }
        if (!formData.guestPhone) {
          setError(tErrors('invalidPhone'));
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  // Navigate to next step
  const nextStep = () => {
    if (!validateStep()) return;

    switch (step) {
      case 'dates':
        setStep(formData.roomId ? 'info' : 'room');
        break;
      case 'room':
        setStep('info');
        break;
      case 'info':
        setStep('confirm');
        break;
    }
  };

  // Navigate to previous step
  const prevStep = () => {
    switch (step) {
      case 'room':
        setStep('dates');
        break;
      case 'info':
        setStep('room');
        break;
      case 'confirm':
        setStep('info');
        break;
    }
  };

  // Submit booking
  const handleSubmit = async () => {
    // 클라이언트 측 최대 인원 이중 검증
    if (selectedRoom && formData.guestCount > selectedRoom.maxGuests) {
      setError({ ko: `최대 ${selectedRoom.maxGuests}명까지 예약 가능합니다.`, en: `Maximum ${selectedRoom.maxGuests} guests allowed.`, ja: `最大${selectedRoom.maxGuests}名まで予約可能です。`, zh: `最多可预订${selectedRoom.maxGuests}位客人。` }[locale] || `Maximum ${selectedRoom.maxGuests} guests allowed.`);
      return;
    }
    if (!formData.agreedToPolicy) {
      setError(t('policyAgreementRequired'));
      return;
    }
    setIsSubmitting(true);
    setError('');

    try {
      // Call API to create booking
      const payload = {
        ...formData,
        appliedPromo: isMilitaryPromo ? 'military_fixed' : (promoDiscount.label || null),
        finalAmount: finalPrice,
      };
      const response = await fetch('/api/booking-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        setBookingId(result.bookingId || 'BK-' + Date.now().toString(36).toUpperCase());
        setStep('success');
      } else {
        setError(result.message || tErrors('bookingFailed'));
      }
    } catch {
      setError(tErrors('bookingFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step indicator
  const steps = [
    { key: 'dates', label: t('step1') },
    { key: 'room', label: t('step2') },
    { key: 'info', label: t('step3') },
    { key: 'confirm', label: t('step4') },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="bg-white overflow-hidden">
      {/* Step indicator */}
      {step !== 'success' && (
        <div className="border-b border-neutral-200 px-6 py-6">
          <div className="flex items-center justify-between max-w-xl mx-auto">
            {steps.map((s, index) => (
              <div key={s.key} className="flex items-center">
                <div
                  className={`w-10 h-10 flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                    index <= currentStepIndex
                      ? 'bg-primary-900 text-white'
                      : 'bg-neutral-100 text-neutral-400'
                  }`}
                >
                  {index + 1}
                </div>
                <span
                  className={`ml-3 text-xs tracking-widest uppercase hidden sm:block transition-colors ${
                    index <= currentStepIndex ? 'text-primary-900' : 'text-neutral-400'
                  }`}
                >
                  {s.label}
                </span>
                {index < steps.length - 1 && (
                  <div
                    className={`w-8 sm:w-12 h-px mx-3 transition-colors ${
                      index < currentStepIndex ? 'bg-primary-900' : 'bg-neutral-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form content */}
      <div className="p-4 sm:p-6 md:p-8 lg:p-12">
        {/* Military Promo Badge */}
        {isMilitaryPromo && step !== 'success' && (
          <div className="mb-8 p-4 bg-blue-50 border border-blue-300 flex items-center gap-3">
            <span className="inline-block px-3 py-1 bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-full flex-shrink-0">US MILITARY</span>
            <span className="text-blue-900 text-sm font-medium">
              {{ ko: `US Military Special Rate 적용 ($${MILITARY_FIXED_RATE_USD} 고정)`, en: `US Military Special Rate Applied ($${MILITARY_FIXED_RATE_USD} Fixed)`, ja: `US Military Special Rate 適用 ($${MILITARY_FIXED_RATE_USD} 固定)`, zh: `US Military Special Rate 已应用 ($${MILITARY_FIXED_RATE_USD} 固定)` }[locale]}
            </span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-8 p-4 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Dates */}
        {step === 'dates' && (
          <div className="space-y-8">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-serif text-primary-900 tracking-wide">
                {t('step1')}
              </h2>
              <div className="w-12 h-px bg-accent-500 mx-auto mt-4" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="form-label">{t('checkIn')}</label>
                <DatePickerInput
                  value={formData.checkIn}
                  onChange={(date) => {
                    setFormData(prev => {
                      const updated = { ...prev, checkIn: date };
                      if (prev.checkOut <= date) {
                        const nextDay = new Date(date + 'T00:00:00');
                        nextDay.setDate(nextDay.getDate() + 1);
                        const y = nextDay.getFullYear();
                        const m = String(nextDay.getMonth() + 1).padStart(2, '0');
                        const d = String(nextDay.getDate()).padStart(2, '0');
                        updated.checkOut = `${y}-${m}-${d}`;
                      }
                      return updated;
                    });
                    setError('');
                  }}
                  minDate={getTodayString()}
                  locale={locale}
                  theme="light"
                />
              </div>

              <div>
                <label className="form-label">{t('checkOut')}</label>
                <DatePickerInput
                  value={formData.checkOut}
                  onChange={(date) => {
                    setFormData(prev => ({ ...prev, checkOut: date }));
                    setError('');
                  }}
                  minDate={formData.checkIn || getTodayString()}
                  locale={locale}
                  theme="light"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="form-label">{t('numberOfGuests')}</label>
                <DropdownSelect
                  value={String(formData.guestCount)}
                  onChange={(val) => {
                    setFormData(prev => ({ ...prev, guestCount: Number(val) }));
                    setError('');
                  }}
                  options={Array.from({ length: overallMaxGuests }, (_, i) => i + 1).map((n) => ({
                    value: String(n),
                    label: `${n} ${{ ko: '명', en: n === 1 ? 'guest' : 'guests', ja: '名', zh: '位' }[locale]}`,
                  }))}
                  theme="light"
                />
              </div>

              <div>
                <label className="form-label">
                  {{ ko: '예약 유형', en: 'Reservation Type', ja: '予約タイプ', zh: '预订类型' }[locale]}
                </label>
                <DropdownSelect
                  value={formData.reservationType}
                  onChange={(val) => {
                    setFormData(prev => ({ ...prev, reservationType: val as ReservationType }));
                    setError('');
                  }}
                  options={reservationTypeOptions.map((opt) => ({
                    value: opt.value,
                    label: opt.label[locale],
                  }))}
                  theme="light"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="form-label">{t('transportationMethod')} *</label>
                <DropdownSelect
                  value={formData.transportation}
                  onChange={(val) => {
                    setFormData(prev => ({ ...prev, transportation: val as TransportationType }));
                    setError('');
                  }}
                  options={transportationOptions.map((opt) => ({
                    value: opt.value,
                    label: opt.label[locale],
                  }))}
                  theme="light"
                />
              </div>
              <div />
            </div>
          </div>
        )}

        {/* Step 2: Room selection */}
        {step === 'room' && (
          <div className="space-y-8">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-serif text-primary-900 tracking-wide">
                {t('selectRoom')}
              </h2>
              <div className="w-12 h-px bg-accent-500 mx-auto mt-4" />
            </div>

            <div className="grid grid-cols-1 gap-4">
              {rooms
                .filter((room) => room.maxGuests >= formData.guestCount)
                .map((room) => (
                  <label
                    key={room.id}
                    className={`flex items-center gap-3 p-3 sm:gap-4 sm:p-4 md:gap-6 md:p-6 cursor-pointer transition-all duration-300 ${
                      formData.roomId === room.id
                        ? 'bg-primary-900 text-white'
                        : 'bg-neutral-50 hover:bg-neutral-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="roomId"
                      value={room.id}
                      checked={formData.roomId === room.id}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 border flex items-center justify-center flex-shrink-0 transition-colors ${
                        formData.roomId === room.id
                          ? 'border-accent-500 bg-accent-500'
                          : 'border-neutral-300'
                      }`}
                    >
                      {formData.roomId === room.id && (
                        <svg className="w-3 h-3 text-primary-900" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-serif text-lg tracking-wide ${
                        formData.roomId === room.id ? 'text-white' : 'text-primary-900'
                      }`}>
                        {getRoomName(room, locale)}
                      </h3>
                      <p className={`text-sm mt-1 ${
                        formData.roomId === room.id ? 'text-white/70' : 'text-neutral-500'
                      }`}>
                        {room.baseGuests
                          ? `${room.baseGuests}~${room.maxGuests}`
                          : room.maxGuests} {{ ko: '인', en: ' guests', ja: '名', zh: '位' }[locale]} · {room.size}m²
                      </p>
                    </div>
                    <div className="text-right">
                      {(() => {
                        const roomTotal = calculateRoomTotal(room, formData.checkIn, formData.checkOut);
                        const extraFee = calculateExtraGuestFee(room, formData.guestCount, nights);
                        return (
                          <>
                            <span className={`font-serif text-xl ${
                              formData.roomId === room.id ? 'text-accent-500' : 'text-primary-900'
                            }`}>
                              {formatPrice(roomTotal + extraFee, locale)}
                            </span>
                            <span className={`text-sm block ${
                              formData.roomId === room.id ? 'text-white/70' : 'text-neutral-500'
                            }`}>
                              {nights}{{ ko: '박 합계', en: ' night total', ja: '泊 合計', zh: '晚 总计' }[locale]}
                            </span>
                            {extraFee > 0 && (
                              <span className={`text-xs block mt-1 ${
                                formData.roomId === room.id ? 'text-amber-300' : 'text-amber-600'
                              }`}>
                                {{ ko: `추가 인원 ${getExtraGuestCount(room, formData.guestCount)}명 +${formatPrice(extraFee, locale)}`, en: `Extra guest ×${getExtraGuestCount(room, formData.guestCount)} +${formatPrice(extraFee, locale)}`, ja: `追加${getExtraGuestCount(room, formData.guestCount)}名 +${formatPrice(extraFee, locale)}`, zh: `加人${getExtraGuestCount(room, formData.guestCount)}位 +${formatPrice(extraFee, locale)}` }[locale]}
                              </span>
                            )}
                            {includesWeekend && (
                              <span className={`text-xs block mt-1 ${
                                formData.roomId === room.id ? 'text-amber-300' : 'text-amber-600'
                              }`}>
                                {t('weekendRateApplied')}
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </label>
                ))}
            </div>
          </div>
        )}

        {/* Step 3: Guest information */}
        {step === 'info' && (
          <div className="space-y-8">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-serif text-primary-900 tracking-wide">
                {t('guestInfo')}
              </h2>
              <div className="w-12 h-px bg-accent-500 mx-auto mt-4" />
            </div>

            <div>
              <label className="form-label">{t('guestName')} *</label>
              <input
                type="text"
                name="guestName"
                value={formData.guestName}
                onChange={handleChange}
                placeholder={t('guestNamePlaceholder')}
                className="w-full px-4 py-4 border-b border-neutral-300 text-sm focus:border-primary-900 focus:outline-none bg-transparent transition-colors"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="form-label">{t('email')} *</label>
                <input
                  type="email"
                  name="guestEmail"
                  value={formData.guestEmail}
                  onChange={handleChange}
                  placeholder={t('emailPlaceholder')}
                  className="w-full px-4 py-4 border-b border-neutral-300 text-sm focus:border-primary-900 focus:outline-none bg-transparent transition-colors"
                  required
                />
              </div>

              <div>
                <label className="form-label">{t('phone')} *</label>
                <input
                  type="tel"
                  name="guestPhone"
                  value={formData.guestPhone}
                  onChange={handleChange}
                  placeholder={t('phonePlaceholder')}
                  className="w-full px-4 py-4 border-b border-neutral-300 text-sm focus:border-primary-900 focus:outline-none bg-transparent transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="form-label">{t('specialRequests')}</label>
              <textarea
                name="specialRequests"
                value={formData.specialRequests}
                onChange={handleChange}
                placeholder={t('specialRequestsPlaceholder')}
                className="w-full px-4 py-4 border border-neutral-300 text-sm focus:border-primary-900 focus:outline-none bg-transparent transition-colors min-h-[120px] resize-none"
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 'confirm' && selectedRoom && (
          <div className="space-y-8">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-serif text-primary-900 tracking-wide">
                {t('bookingSummary')}
              </h2>
              <div className="w-12 h-px bg-accent-500 mx-auto mt-4" />
            </div>

            <div className="border border-neutral-200 divide-y divide-neutral-200">
              <div className="flex justify-between p-4">
                <span className="text-neutral-500 text-sm">{t('selectedRoom')}</span>
                <span className="font-medium text-primary-900">
                  {getRoomName(selectedRoom, locale)}
                </span>
              </div>
              <div className="flex justify-between p-4">
                <span className="text-neutral-500 text-sm">{t('stayDuration')}</span>
                <span className="font-medium text-primary-900">
                  {formData.checkIn} ~ {formData.checkOut} ({nights}{' '}
                  {{ ko: '박', en: nights === 1 ? 'night' : 'nights', ja: '泊', zh: '晚' }[locale]})
                </span>
              </div>
              <div className="flex justify-between p-4">
                <span className="text-neutral-500 text-sm">{t('numberOfGuests')}</span>
                <span className="font-medium text-primary-900">
                  {formData.guestCount} {{ ko: '명', en: 'guests', ja: '名', zh: '位' }[locale]}
                </span>
              </div>
              <div className="flex justify-between p-4">
                <span className="text-neutral-500 text-sm">
                  {{ ko: '예약 유형', en: 'Reservation Type', ja: '予約タイプ', zh: '预订类型' }[locale]}
                </span>
                <span className="font-medium text-primary-900">
                  {reservationTypeOptions.find(o => o.value === formData.reservationType)?.label[locale]}
                </span>
              </div>
              <div className="flex justify-between p-4">
                <span className="text-neutral-500 text-sm">{t('transportationMethod')}</span>
                <span className="font-medium text-primary-900">
                  {transportationOptions.find(o => o.value === formData.transportation)?.label[locale]}
                </span>
              </div>
              <div className="flex justify-between p-4">
                <span className="text-neutral-500 text-sm">{t('guestName')}</span>
                <span className="font-medium text-primary-900">{formData.guestName}</span>
              </div>
              <div className="flex justify-between p-4">
                <span className="text-neutral-500 text-sm">{t('email')}</span>
                <span className="font-medium text-primary-900">{formData.guestEmail}</span>
              </div>
              <div className="flex justify-between p-4">
                <span className="text-neutral-500 text-sm">{t('phone')}</span>
                <span className="font-medium text-primary-900">{formData.guestPhone}</span>
              </div>

              <div className="p-4 bg-neutral-50">
                {isMilitaryPromo ? (
                  <>
                    <div className="flex justify-between mb-2">
                      <span className="text-neutral-500 text-sm">US Military Special Rate</span>
                      <span className="font-medium text-primary-900">
                        ${MILITARY_FIXED_RATE_USD} × {nights} {{ ko: '박', en: ' nights', ja: '泊', zh: '晚' }[locale]}
                      </span>
                    </div>
                    <div className="p-3 mb-2 bg-blue-50 border border-blue-200 text-blue-800 text-xs">
                      {{ ko: `$${MILITARY_FIXED_RATE_USD} 고정 요금 적용 (주말 할증 없음) · 디럭스 무료 업그레이드 · 1인 조식 포함`, en: `Flat $${MILITARY_FIXED_RATE_USD}/night (No weekend surcharge) · Free Deluxe upgrade · Breakfast for 1 included`, ja: `$${MILITARY_FIXED_RATE_USD}固定料金適用（週末割増なし）· デラックス無料UP · 朝食1名付`, zh: `$${MILITARY_FIXED_RATE_USD}固定价格（无周末加价）· 免费升级豪华房 · 含1人早餐` }[locale]}
                    </div>
                    <div className="flex justify-between pt-4 border-t border-neutral-200">
                      <span className="font-medium text-primary-900">{t('total')}</span>
                      <span className="font-serif text-2xl text-accent-500">
                        ${militaryFixedRate}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between mb-2">
                      <span className="text-neutral-500 text-sm">{t('roomRate')}</span>
                      <span className="font-medium text-primary-900">
                        {nights}{{ ko: '박', en: ' nights', ja: '泊', zh: '晚' }[locale]}
                        {' '}
                        <span className="text-neutral-400 text-xs">
                          ({{ ko: '요일별 요금 적용', en: 'Daily rates applied', ja: '曜日別料金適用', zh: '按日费率计算' }[locale]})
                        </span>
                      </span>
                    </div>
                    {/* 추가 인원 요금 */}
                    {extraGuestFeeTotal > 0 && selectedRoom && (
                      <div className="flex justify-between mb-2 text-amber-700">
                        <span className="text-sm">
                          {{ ko: `추가 인원 ${getExtraGuestCount(selectedRoom, formData.guestCount)}명 × ${nights}박 × ₩10,000`, en: `Extra guest ×${getExtraGuestCount(selectedRoom, formData.guestCount)} × ${nights} nights × ₩10,000`, ja: `追加${getExtraGuestCount(selectedRoom, formData.guestCount)}名 × ${nights}泊 × ₩10,000`, zh: `加人${getExtraGuestCount(selectedRoom, formData.guestCount)}位 × ${nights}晚 × ₩10,000` }[locale]}
                        </span>
                        <span className="font-medium">+{formatCurrency(extraGuestFeeTotal, locale)}</span>
                      </div>
                    )}
                    {/* Long-stay promo discount line */}
                    {isLongstayPromo && promoBlocked && (
                      <div className="p-3 mb-2 bg-red-50 border border-red-200 text-red-700 text-xs">
                        {{ ko: '다른 이벤트(미군 특가 등)와 중복 적용할 수 없습니다.', en: 'Cannot combine with other offers (Military Special, etc.).', ja: '他のイベント（米軍特価など）との併用はできません。', zh: '不可与其他优惠（美军特价等）同时使用。' }[locale]}
                      </div>
                    )}
                    {isLongstayPromo && !promoBlocked && nights < 2 && (
                      <div className="p-3 mb-2 bg-red-50 border border-red-200 text-red-700 text-xs">
                        {{ ko: '연박 할인은 최소 2박 이상 예약 시에만 적용됩니다.', en: 'Long-stay discount requires a minimum of 2 nights.', ja: '連泊割引は2泊以上のご予約にのみ適用されます。', zh: '连住折扣仅适用于2晚以上的预订。' }[locale]}
                      </div>
                    )}
                    {isLongstayPromo && promoDiscount.rate > 0 && (
                      <div className="flex justify-between mb-2 text-green-700">
                        <span className="text-sm font-medium">
                          {nights >= 7
                            ? { ko: '7박 이상 15% 연박 할인', en: '7+ nights 15% long-stay discount', ja: '7泊以上 15%連泊割引', zh: '7晚以上 15%连住折扣' }[locale]
                            : { ko: '2박 이상 10% 연박 할인', en: '2+ nights 10% long-stay discount', ja: '2泊以上 10%連泊割引', zh: '2晚以上 10%连住折扣' }[locale]
                          }
                        </span>
                        <span className="font-medium">-{formatCurrency(promoDiscount.amount, locale)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-4 border-t border-neutral-200">
                      <span className="font-medium text-primary-900">{t('total')}</span>
                      <span className="font-serif text-2xl text-accent-500">
                        {formatCurrency(finalPrice, locale)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 예약 방식 안내 */}
            <div className="p-4 bg-blue-50 border-l-2 border-blue-500">
              <p className="text-blue-800 text-sm font-medium mb-1">
                {{ ko: '예약 접수 안내', en: 'Booking Process', ja: '予約受付のご案内', zh: '预订流程说明' }[locale]}
              </p>
              <p className="text-blue-700 text-sm leading-relaxed">
                {{ ko: '예약 제출 시 예약 요청이 접수되며, 호텔 확인 후 확정 이메일이 발송됩니다. 즉시 확정이 아닌 점 양해 부탁드립니다.', en: 'Your booking will be submitted as a request. A confirmation email will be sent after hotel review. This is not an instant confirmation.', ja: 'ご予約はリクエストとして受付されます。ホテル確認後に確定メールが送信されます。即時確定ではございません。', zh: '提交后为预订请求，酒店确认后发送确认邮件。非即时确认，敬请谅解。' }[locale]}
              </p>
            </div>

            <div className="p-4 bg-primary-50 border-l-2 border-primary-900">
              <p className="text-primary-900 text-sm">{t('paymentNote')}</p>
            </div>

            {/* Cancellation Policy Agreement */}
            <div className="p-4 bg-amber-50 border border-amber-200">
              <p className="text-neutral-600 text-sm leading-relaxed mb-4">
                {t('cancellationPolicySummary')}
              </p>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.agreedToPolicy}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, agreedToPolicy: e.target.checked }));
                      setError('');
                    }}
                    className="mt-0.5 w-5 h-5 accent-primary-900 flex-shrink-0"
                  />
                  <span className="text-sm font-medium text-primary-900">
                    {t('agreeCancellationPolicy')}
                  </span>
                </label>
                {/* 규정 전문 — 별도 팝업으로 표시 (동의 대상이 무엇인지 폼에서 바로 확인 가능해야 함) */}
                <button
                  type="button"
                  onClick={() => setIsPolicyOpen(true)}
                  className="text-sm font-medium text-primary-900 underline underline-offset-4 hover:text-accent-500 transition-colors min-h-[44px] px-1"
                >
                  {{ ko: '규정 전문 보기', en: 'View full policy', ja: '規定全文を見る', zh: '查看规定全文' }[locale]}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success */}
        {step === 'success' && (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-8 flex items-center justify-center text-accent-500">
              <svg
                className="w-16 h-16"
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
            <h2 className="text-3xl font-serif text-primary-900 mb-4 tracking-wide">
              {t('bookingSuccess')}
            </h2>
            <p className="text-neutral-500 mb-8">{t('bookingSuccessMessage')}</p>
            {/* Pending warning banner */}
            <div className="max-w-md mx-auto mb-8 p-4 bg-amber-50 border border-amber-300 text-amber-800 text-sm leading-relaxed">
              <span className="font-bold block mb-1">&#9888; {{ ko: '안내', en: 'Notice', ja: 'ご案内', zh: '提示' }[locale]}</span>
              {t('bookingPendingNotice')}
            </div>
            {/* 다음 단계 안내 */}
            <div className="max-w-sm mx-auto mb-8 text-left">
              <div className="space-y-2 text-sm">
                <div className="flex gap-3 items-start">
                  <span className="w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                  <span className="text-neutral-600">{{ ko: '예약 요청이 접수되었습니다', en: 'Your booking request has been received', ja: '予約リクエストを受け付けました', zh: '预订请求已受理' }[locale]}</span>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="w-5 h-5 rounded-full bg-amber-400 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                  <span className="text-neutral-600">{{ ko: '호텔에서 확인 후 확정 메일을 보내드립니다', en: 'The hotel will review and send a confirmation email', ja: 'ホテル確認後、確定メールをお送りします', zh: '酒店确认后将发送确认邮件' }[locale]}</span>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="w-5 h-5 rounded-full bg-neutral-300 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                  <span className="text-neutral-600">{{ ko: '결제는 체크인 시 현장에서 진행됩니다', en: 'Payment is processed on-site at check-in', ja: 'お支払いはチェックイン時に現地で行います', zh: '付款在入住时于酒店现场进行' }[locale]}</span>
                </div>
              </div>
            </div>

            <div className="inline-block border-2 border-amber-400 bg-amber-50 px-8 py-4 mb-10">
              <span className="text-xs text-amber-700 tracking-widest uppercase block mb-1">{t('bookingId')}</span>
              <p className="text-xl font-mono font-bold text-primary-900">{bookingId}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push(`/${locale}`)}
                className="px-8 py-4 border border-primary-900 text-primary-900 text-sm tracking-widest uppercase transition-all duration-300 hover:bg-primary-900 hover:text-white"
              >
                {t('backToHome')}
              </button>
              <button
                onClick={() => {
                  setStep('dates');
                  setFormData({
                    roomId: '',
                    checkIn: getTodayString(),
                    checkOut: getTomorrowString(),
                    guestCount: 2,
                    reservationType: 'general',
                    transportation: 'walk',
                    guestName: '',
                    guestEmail: '',
                    guestPhone: '',
                    specialRequests: '',
                    agreedToPolicy: false,
                  });
                }}
                className="px-8 py-4 bg-primary-900 text-white text-sm tracking-widest uppercase transition-all duration-300 hover:bg-accent-500"
              >
                {t('makeAnotherBooking')}
              </button>
            </div>
          </div>
        )}

        {/* Navigation buttons — 모바일 터치 영역 확보 */}
        {step !== 'success' && (
          <div className="flex justify-between mt-12 pt-8 border-t border-neutral-200 gap-3">
            {step !== 'dates' ? (
              <button
                onClick={prevStep}
                className="px-6 sm:px-8 py-4 min-h-[48px] border border-neutral-300 text-neutral-600 text-sm tracking-widest uppercase transition-all duration-300 hover:border-primary-900 hover:text-primary-900"
              >
                {{ ko: '이전', en: 'Back', ja: '戻る', zh: '返回' }[locale]}
              </button>
            ) : (
              <div />
            )}

            {step === 'confirm' ? (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.agreedToPolicy}
                className="flex-1 sm:flex-none px-8 sm:px-10 py-4 min-h-[52px] bg-accent-500 text-primary-900 text-sm font-bold tracking-widest uppercase transition-all duration-300 hover:bg-primary-900 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? ({ ko: '처리 중...', en: 'Processing...', ja: '処理中...', zh: '处理中...' }[locale])
                  : t('confirmBooking')}
              </button>
            ) : (
              <button
                onClick={nextStep}
                className="flex-1 sm:flex-none px-8 sm:px-10 py-4 min-h-[48px] bg-primary-900 text-white text-sm tracking-widest uppercase transition-all duration-300 hover:bg-accent-500"
              >
                {{ ko: '다음', en: 'Next', ja: '次へ', zh: '下一步' }[locale]}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 취소·환불 규정 팝업 — 내용은 config/policy.ts (이용약관 제4조와 동일 출처) */}
      {isPolicyOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancellation-policy-title"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsPolicyOpen(false)}
          />

          <div className="relative bg-white w-full max-w-lg max-h-[85vh] flex flex-col shadow-large">
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-neutral-200">
              <div>
                <h3 id="cancellation-policy-title" className="font-serif text-xl text-primary-900 tracking-wide">
                  {policy.title}
                </h3>
                <p className="text-xs text-neutral-400 mt-1">{policy.articleHeading}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPolicyOpen(false)}
                aria-label={{ ko: '닫기', en: 'Close', ja: '閉じる', zh: '关闭' }[locale]}
                className="text-neutral-400 hover:text-primary-900 transition-colors text-2xl leading-none flex-shrink-0 min-h-[44px] min-w-[44px]"
              >
                &times;
              </button>
            </div>

            <div className="px-6 py-5 overflow-y-auto">
              <ul className="space-y-3">
                {policy.body.map((line, index) => (
                  <li key={index} className="flex gap-3 text-sm text-neutral-700 leading-relaxed">
                    <span className="text-accent-500 flex-shrink-0">&#8226;</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 pt-4 border-t border-neutral-100 text-xs text-neutral-500 leading-relaxed">
                {policy.note}
              </p>
              <a
                href={`/${locale}/terms`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 text-xs text-primary-900 underline underline-offset-4 hover:text-accent-500 transition-colors"
              >
                {policy.fullTermsLabel}
              </a>
            </div>

            <div className="px-6 py-4 border-t border-neutral-200 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setIsPolicyOpen(false)}
                className="flex-1 px-6 py-3 min-h-[48px] border border-neutral-300 text-neutral-600 text-sm tracking-widest uppercase transition-all duration-300 hover:border-primary-900 hover:text-primary-900"
              >
                {{ ko: '닫기', en: 'Close', ja: '閉じる', zh: '关闭' }[locale]}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, agreedToPolicy: true }));
                  setError('');
                  setIsPolicyOpen(false);
                }}
                className="flex-1 px-6 py-3 min-h-[48px] bg-primary-900 text-white text-sm tracking-widest uppercase transition-all duration-300 hover:bg-accent-500"
              >
                {{ ko: '동의하고 닫기', en: 'Agree & close', ja: '同意して閉じる', zh: '同意并关闭' }[locale]}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
