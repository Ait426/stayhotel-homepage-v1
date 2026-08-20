/**
 * Room Configuration Data
 *
 * Contains all 7 room types with Korean/English descriptions.
 * This data is used by the Mock CMS adapter.
 * When integrating with a real CMS, this data will be fetched from the API.
 */

import { Room, RoomAmenity } from '@/types';

// ============================================
// Common Amenities
// ============================================

export const commonAmenities: RoomAmenity[] = [
  { id: 'wifi', nameKo: '무료 Wi-Fi', nameEn: 'Free Wi-Fi', icon: 'wifi' },
  { id: 'tv', nameKo: '스마트 TV', nameEn: 'Smart TV', icon: 'tv' },
  { id: 'ac', nameKo: '에어컨', nameEn: 'Air Conditioning', icon: 'snowflake' },
  { id: 'fridge', nameKo: '미니 냉장고', nameEn: 'Mini Refrigerator', icon: 'box' },
  { id: 'safe', nameKo: '객실 금고', nameEn: 'In-room Safe', icon: 'lock' },
  { id: 'toiletries', nameKo: '어메니티', nameEn: 'Toiletries', icon: 'sparkles' },
];

export const premiumAmenities: RoomAmenity[] = [
  ...commonAmenities,
  { id: 'minibar', nameKo: '미니바', nameEn: 'Mini Bar', icon: 'wine' },
];

export const suiteAmenities: RoomAmenity[] = [
  ...premiumAmenities,
  { id: 'living', nameKo: '거실 공간', nameEn: 'Living Area', icon: 'sofa' },
  { id: 'jacuzzi', nameKo: '자쿠지', nameEn: 'Jacuzzi', icon: 'droplets' },
  { id: 'view', nameKo: '시티 뷰', nameEn: 'City View', icon: 'building' },
];

// ============================================
// Room Data - 7 Room Types
// ============================================

export const rooms: Room[] = [
  // 1. Standard Room
  {
    id: 'standard',
    slug: 'standard',
    nameKo: '스탠다드',
    nameEn: 'Standard',
    descriptionKo:
      '아늑하고 편안한 스탠다드 객실입니다. 비즈니스 출장이나 단기 투숙에 적합하며, 필수 편의시설이 완비되어 있습니다. 퀸 사이즈 침대와 쾌적한 욕실로 편안한 휴식을 보장합니다.',
    descriptionEn:
      'A cozy and comfortable standard room perfect for business trips or short stays. Equipped with essential amenities, featuring a queen-size bed and a pleasant bathroom for a restful experience.',
    pricePerNight: 70000,
    fridayPrice: 80000,
    saturdayPrice: 90000,
    maxGuests: 2,
    size: 20,
    bedType: 'queen',
    viewType: 'city',
    amenities: commonAmenities,
    images: [
      { url: '/images/rooms/standard/5.JPG', alt: 'Standard Room', isPrimary: true },
      { url: '/images/rooms/standard/3.JPG', alt: 'Standard Room Desk' },
      { url: '/images/rooms/standard/1.JPG', alt: 'Standard Room Bathroom' },
    ],
    isAvailable: true,
  },

  // 2. Standard Premium Room
  {
    id: 'standard-premium',
    slug: 'standard-premium',
    nameKo: '스탠다드 프리미엄',
    nameEn: 'Standard Premium',
    descriptionKo:
      '스탠다드 객실의 업그레이드 버전으로, 더 넓은 공간과 추가 편의시설을 제공합니다. 프리미엄 침구류와 고급 어메니티로 한층 높은 수준의 편안함을 경험하세요.',
    descriptionEn:
      'An upgraded version of our standard room with more space and additional amenities. Experience enhanced comfort with premium bedding and luxury toiletries.',
    pricePerNight: 80000,
    fridayPrice: 90000,
    saturdayPrice: 105000,
    maxGuests: 2,
    size: 25,
    bedType: 'queen',
    viewType: 'city',
    amenities: [...commonAmenities, { id: 'coffee', nameKo: '커피 머신', nameEn: 'Coffee Machine', icon: 'coffee' }],
    images: [
      { url: '/images/rooms/premium/3.JPG', alt: 'Standard Premium Room', isPrimary: true },
      { url: '/images/rooms/premium/5.JPG', alt: 'Standard Premium Room View' },
      { url: '/images/rooms/premium/1.JPG', alt: 'Standard Premium Room Bathroom' },
    ],
    isAvailable: true,
  },

  // 3. Deluxe Room
  {
    id: 'deluxe',
    slug: 'deluxe',
    nameKo: '디럭스',
    nameEn: 'Deluxe',
    descriptionKo:
      '세련된 인테리어와 넓은 공간의 디럭스 객실입니다. 킹 사이즈 침대, 고급 욕조, 시티 뷰가 제공되며 비즈니스와 레저 모두에 완벽한 선택입니다.',
    descriptionEn:
      'A sophisticated deluxe room with elegant interiors and spacious layout. Features a king-size bed, luxury bathtub, and city views - perfect for both business and leisure travelers.',
    pricePerNight: 90000,
    fridayPrice: 100000,
    saturdayPrice: 115000,
    maxGuests: 2,
    size: 30,
    bedType: 'king',
    viewType: 'city',
    amenities: premiumAmenities,
    images: [
      { url: '/images/rooms/deluxe/5.JPG', alt: 'Deluxe Room', isPrimary: true },
      { url: '/images/rooms/deluxe/3.JPG', alt: 'Deluxe Room View' },
      { url: '/images/rooms/deluxe/1.JPG', alt: 'Deluxe Room Bathroom' },
    ],
    isAvailable: true,
  },

  // 4. Family Twin Room
  {
    id: 'family-twin',
    slug: 'family-twin',
    nameKo: '패밀리 트윈',
    nameEn: 'Family Twin',
    descriptionKo:
      '가족 여행에 적합한 트윈 베드 객실입니다. 더블 베드 2개가 제공되어 기준 2인, 최대 3인까지 투숙하실 수 있습니다. 가족 단위 투숙에 필요한 편의시설을 갖추고 있습니다.',
    descriptionEn:
      'A twin-bed room suited to family travel. Two double beds accommodate up to 3 guests (base 2), with the amenities needed for a family stay.',
    pricePerNight: 90000,
    fridayPrice: 100000,
    saturdayPrice: 115000,
    baseGuests: 2,
    maxGuests: 3,
    extraGuestFee: 10000,
    size: 32,
    bedType: 'twin',
    viewType: 'garden',
    amenities: [
      ...premiumAmenities,

    ],
    images: [
      { url: '/images/rooms/family-twin/5.JPG', alt: 'Family Twin Room', isPrimary: true },
      { url: '/images/rooms/family-twin/3.JPG', alt: 'Family Twin Room View' },
      { url: '/images/rooms/family-twin/1.JPG', alt: 'Family Twin Room Bathroom' },
    ],
    isAvailable: true,
  },

  // 5. Family Triple Room
  {
    id: 'family-triple',
    slug: 'family-triple',
    nameKo: '패밀리 트리플',
    nameEn: 'Family Triple',
    descriptionKo:
      '가족 단위 투숙에 적합한 객실입니다. 더블 베드 1개와 싱글 베드 2개가 제공되어 기준 3인, 최대 4인까지 투숙 가능합니다.',
    descriptionEn:
      'A room suited to family stays. One double bed and two single beds accommodate up to 4 guests (base 3).',
    pricePerNight: 120000,
    fridayPrice: 135000,
    saturdayPrice: 150000,
    baseGuests: 3,
    maxGuests: 4,
    extraGuestFee: 10000,
    size: 38,
    bedType: 'twin',
    viewType: 'garden',
    amenities: [
      ...premiumAmenities,

    ],
    images: [
      { url: '/images/rooms/family-triple/5.JPG', alt: 'Family Triple Room', isPrimary: true },
      { url: '/images/rooms/family-triple/3.JPG', alt: 'Family Triple Room View' },
      { url: '/images/rooms/family-triple/1.JPG', alt: 'Family Triple Room Bathroom' },
    ],
    isAvailable: true,
  },

  // 6. Royal Suite
  {
    id: 'royal-suite',
    slug: 'royal-suite',
    nameKo: '로얄 스위트',
    nameEn: 'Royal Suite',
    descriptionKo:
      '최고급 럭셔리 스위트 객실입니다. 독립된 거실과 침실, 대형 자쿠지 욕조, 파노라마 시티 뷰를 갖추고 있습니다. VIP 고객과 특별한 기념일에 완벽한 선택입니다.',
    descriptionEn:
      'Our premium luxury suite offering the finest accommodations. Features separate living room and bedroom, large jacuzzi bath, and panoramic city views. Perfect for VIP guests and special occasions.',
    pricePerNight: 140000,
    fridayPrice: 160000,
    saturdayPrice: 180000,
    maxGuests: 2,
    size: 45,
    bedType: 'king',
    viewType: 'city',
    amenities: suiteAmenities,
    images: [
      { url: '/images/rooms/royal-suite/9.JPG', alt: 'Royal Suite', isPrimary: true },
      { url: '/images/rooms/royal-suite/7.JPG', alt: 'Royal Suite Living' },
      { url: '/images/rooms/royal-suite/3.JPG', alt: 'Royal Suite Bathroom' },
      { url: '/images/rooms/royal-suite/5.JPG', alt: 'Royal Suite Bathtub' },
    ],
    isAvailable: true,
  },

  // 7. Party Suite
  {
    id: 'party-suite',
    slug: 'party-suite',
    nameKo: '파티 스위트',
    nameEn: 'Party Suite',
    descriptionKo:
      '특별한 모임을 위한 최대 규모의 스위트 객실입니다. 넓은 거실 공간은 소규모 파티나 비즈니스 미팅에 적합하며, 최대 4인이 투숙 가능합니다. 프라이빗한 분위기에서 특별한 순간을 만드세요.',
    descriptionEn:
      'Our largest suite designed for special gatherings. The spacious living area is perfect for intimate parties or business meetings, accommodating up to 4 guests. Create memorable moments in a private setting.',
    pricePerNight: 170000,
    fridayPrice: 200000,
    saturdayPrice: 225000,
    baseGuests: 4,
    maxGuests: 4,
    size: 60,
    bedType: 'king',
    viewType: 'city',
    amenities: [
      ...suiteAmenities,
      { id: 'sound', nameKo: '사운드 시스템', nameEn: 'Sound System', icon: 'music' },
      { id: 'projector', nameKo: '프로젝터', nameEn: 'Projector', icon: 'projector' },
      { id: 'kitchen', nameKo: '간이 주방', nameEn: 'Kitchenette', icon: 'utensils' },
    ],
    images: [
      { url: '/images/rooms/party-suite/5.JPG', alt: 'Party Suite Living', isPrimary: true },
      { url: '/images/rooms/party-suite/3.JPG', alt: 'Party Suite Bedroom' },
      { url: '/images/rooms/party-suite/7.JPG', alt: 'Party Suite Dining' },
      { url: '/images/rooms/party-suite/9.JPG', alt: 'Party Suite Bathroom' },
    ],
    isAvailable: true,
  },
];

/**
 * Get room by ID
 */
export const getRoomById = (id: string): Room | undefined => {
  return rooms.find((room) => room.id === id);
};

/**
 * Get room by slug
 */
export const getRoomBySlug = (slug: string): Room | undefined => {
  return rooms.find((room) => room.slug === slug);
};

/**
 * Get all available rooms
 */
export const getAvailableRooms = (): Room[] => {
  return rooms.filter((room) => room.isAvailable);
};

/**
 * Get price for a specific date based on day of week
 * Friday(5) uses fridayPrice, Saturday(6) uses saturdayPrice, others use pricePerNight
 */
export const getPriceForDate = (room: Room, date: Date): number => {
  const day = date.getDay();
  if (day === 5) return room.fridayPrice;
  if (day === 6) return room.saturdayPrice;
  return room.pricePerNight;
};

/**
 * Calculate total price for a stay period (day-by-day)
 */
export const calculateRoomTotal = (room: Room, checkIn: string, checkOut: string): number => {
  let total = 0;
  const current = new Date(checkIn + 'T00:00:00');
  const end = new Date(checkOut + 'T00:00:00');
  while (current < end) {
    total += getPriceForDate(room, current);
    current.setDate(current.getDate() + 1);
  }
  return total;
};

/**
 * Calculate extra guest fee for a stay
 * 기준 인원 초과 시 1인당 추가요금 × 초과 인원 × 박 수
 */
export const calculateExtraGuestFee = (room: Room, guestCount: number, nights: number): number => {
  const baseGuests = room.baseGuests || room.maxGuests;
  const extraGuests = Math.max(0, guestCount - baseGuests);
  return extraGuests * (room.extraGuestFee || 0) * nights;
};

/**
 * Get the number of extra guests beyond base capacity
 */
export const getExtraGuestCount = (room: Room, guestCount: number): number => {
  const baseGuests = room.baseGuests || room.maxGuests;
  return Math.max(0, guestCount - baseGuests);
};

/**
 * Format price in KRW
 */
export const formatPrice = (price: number, locale: string): string => {
  const localeMap: Record<string, string> = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', zh: 'zh-CN' };
  return `₩${price.toLocaleString(localeMap[locale] || 'en-US')}`;
};

/**
 * Get room name by locale
 */
export const getRoomName = (room: Room, locale: string): string => {
  return locale === 'ko' ? room.nameKo : room.nameEn;
};

/**
 * Get room description by locale
 */
export const getRoomDescription = (room: Room, locale: string): string => {
  return locale === 'ko' ? room.descriptionKo : room.descriptionEn;
};
