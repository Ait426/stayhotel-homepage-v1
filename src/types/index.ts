/**
 * TypeScript Type Definitions for Hotel Website
 * All shared types are defined here for consistency across the application
 */

// ============================================
// Room Types
// ============================================

export interface RoomAmenity {
  id: string;
  nameKo: string;
  nameEn: string;
  icon: string; // Icon name for display
}

export interface RoomImage {
  url: string;
  alt: string;
  isPrimary?: boolean;
}

export interface Room {
  id: string;
  slug: string; // URL-friendly identifier
  nameKo: string;
  nameEn: string;
  descriptionKo: string;
  descriptionEn: string;
  pricePerNight: number; // in KRW (Sun-Thu)
  fridayPrice: number; // in KRW (Friday)
  saturdayPrice: number; // in KRW (Saturday)
  baseGuests?: number;
  maxGuests: number;
  extraGuestFee?: number; // 기준 초과 1인당 추가요금 (KRW/박)
  size: number; // in square meters
  amenities: RoomAmenity[];
  images: RoomImage[];
  isAvailable: boolean;
  bedType: BedType;
  viewType?: ViewType;
}

export type BedType = 'single' | 'double' | 'twin' | 'queen' | 'king';
export type ViewType = 'city' | 'garden' | 'pool' | 'mountain' | 'ocean';

// ============================================
// Booking Types
// ============================================

export type ReservationType = 'general' | 'corporate' | 'military';
export type TransportationType = 'walk' | 'car';

export interface BookingFormData {
  roomId: string;
  checkIn: string; // ISO date string
  checkOut: string; // ISO date string
  guestCount: number;
  reservationType: ReservationType;
  transportation: TransportationType;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  specialRequests?: string;
  agreedToPolicy: boolean;
  /** 적용 프로모션 id (admin '프로모션 관리'). 옛 예약은 'longstay_10' | 'longstay_15' | 'military_fixed' */
  appliedPromo?: string | null;
  finalAmount?: number; // 최종 금액 (KRW, USD 프로모션이면 USD — 서버가 다시 계산해 덮어씀)
}

export interface BookingResponse {
  success: boolean;
  bookingId?: string;
  message: string;
  error?: string;
}

// ============================================
// Blog Types
// ============================================

export interface BlogPost {
  title: string;
  link: string;
  pubDate: string;
  content?: string;
  contentSnippet?: string;
  thumbnail?: string;
}

export interface BlogFeedResponse {
  success: boolean;
  posts: BlogPost[];
  error?: string;
}

// ============================================
// CMS Adapter Types
// ============================================

export interface CMSAdapter {
  // Room operations
  getRooms(): Promise<Room[]>;
  getRoomById(id: string): Promise<Room | null>;
  getRoomBySlug(slug: string): Promise<Room | null>;
  checkAvailability(roomId: string, checkIn: string, checkOut: string): Promise<boolean>;

  // Booking operations
  createBooking(data: BookingFormData): Promise<BookingResponse>;

  // Connection status
  isConnected(): Promise<boolean>;
}

export interface CMSConfig {
  apiUrl?: string;
  apiKey?: string;
  useMock: boolean;
}

// ============================================
// Brand Configuration Types
// ============================================

export interface LocalizedString {
  ko: string;
  en: string;
  ja: string;
  zh: string;
}

export interface BrandConfig {
  name: LocalizedString;
  tagline: LocalizedString;
  contact: {
    phone: string;
    email: string;
    address: LocalizedString;
  };
  social?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    youtube?: string;
    naverBlog?: string;
  };
}

// ============================================
// i18n Types
// ============================================

export type Locale = 'ko' | 'en' | 'ja' | 'zh';

export interface LocaleParams {
  params: {
    locale: Locale;
  };
}

export interface RoomPageParams {
  params: {
    locale: Locale;
    roomId: string;
  };
}

// ============================================
// Component Props Types
// ============================================

export interface NavigationProps {
  locale: Locale;
}

export interface FooterProps {
  locale: Locale;
}

export interface RoomCardProps {
  room: Room;
  locale: Locale;
}

export interface BookingFormProps {
  roomId?: string;
  locale: Locale;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
