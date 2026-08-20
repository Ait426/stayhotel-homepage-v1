# Premium Hotel Website

프리미엄 호텔 웹사이트 템플릿 - Next.js 14, TypeScript, Tailwind CSS

## 주요 기능

- **다국어 지원**: 한국어/영어 URL 기반 라우팅 (`/ko`, `/en`)
- **브랜드 설정**: `.env.local` 파일만 수정하면 호텔 브랜드 변경 가능
- **CMS 어댑터**: Mock 어댑터로 개발, 실제 CMS (Sanhawings) 연동 준비 완료
- **7가지 객실 타입**: 스탠다드부터 파티 스위트까지
- **실시간 채팅**: Tawk.to 라이브 챗 위젯 통합
- **블로그 연동**: 네이버 블로그 RSS 피드

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일을 수정하세요:

```env
# 브랜드 설정
NEXT_PUBLIC_BRAND_NAME=호텔 이름
NEXT_PUBLIC_BRAND_NAME_EN=Hotel Name
NEXT_PUBLIC_BRAND_TAGLINE=호텔 슬로건
NEXT_PUBLIC_BRAND_TAGLINE_EN=Hotel Tagline

# 연락처
NEXT_PUBLIC_CONTACT_PHONE=02-1234-5678
NEXT_PUBLIC_CONTACT_EMAIL=info@hotel.com
NEXT_PUBLIC_CONTACT_ADDRESS=서울시 강남구 테헤란로 123
NEXT_PUBLIC_CONTACT_ADDRESS_EN=123 Teheran-ro, Gangnam-gu, Seoul

# Tawk.to (선택)
NEXT_PUBLIC_TAWK_PROPERTY_ID=your_property_id
NEXT_PUBLIC_TAWK_WIDGET_ID=your_widget_id

# 네이버 블로그 (선택)
NEXT_PUBLIC_NAVER_BLOG_ID=your_blog_id

# CMS 설정
NEXT_PUBLIC_USE_MOCK_CMS=true
SANHAWINGS_API_KEY=your_api_key
SANHAWINGS_API_URL=https://api.sanhawings.com/v1
```

### 3. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 에서 확인하세요.

## 프로젝트 구조

```
src/
├── app/
│   ├── [locale]/           # 다국어 페이지
│   │   ├── page.tsx        # 홈페이지
│   │   ├── rooms/          # 객실 페이지
│   │   ├── facilities/     # 부대시설 페이지
│   │   ├── location/       # 위치 페이지
│   │   ├── blog/           # 블로그 페이지 (RSS 연동)
│   │   ├── events/         # 이벤트 페이지 (신규)
│   │   ├── booking/        # 예약 페이지
│   │   └── layout.tsx      # 레이아웃
│   └── api/                # API 라우트
│       ├── rooms/          # 객실/예약 API
│       └── blog/           # 블로그 RSS API
├── components/             # React 컴포넌트
│   ├── Navigation.tsx      # 네비게이션
│   ├── Footer.tsx          # 푸터
│   ├── TawkToWidget.tsx    # 라이브 챗
│   ├── RoomCard.tsx        # 객실 카드
│   ├── BlogList.tsx        # 블로그 리스트 (RSS)
│   ├── BookingForm.tsx     # 예약 폼
│   ├── index.ts            # 컴포넌트 Export
│   └── sections/           # 섹션 컴포넌트
├── config/
│   ├── brand.ts            # 브랜드 설정
│   └── rooms.ts            # 객실 데이터
├── i18n/                   # 국제화 설정
│   └── routing.ts          # 라우팅 설정
├── lib/
│   ├── cms/                # CMS 어댑터
│   │   ├── adapter.ts      # 베이스 어댑터
│   │   ├── mock-adapter.ts # Mock 어댑터
│   │   └── sanhawings-adapter.ts # 실제 CMS
│   ├── utils/              # 유틸리티
│   └── translations*.ts    # 번역 관련 유틸리티
├── messages/               # 다국어 메시지
│   ├── ko.json
│   └── en.json
├── types/                  # TypeScript 타입
└── middleware.ts           # Next.js 미들웨어
```

## 객실 타입

가격은 요일별로 다르게 적용된다 (금·토 할증). 단일 출처는 `src/config/rooms.ts`.

| 객실명 | 일~목 | 금 | 토 | 기준/최대 인원 | 크기 | 추가 인원 요금 |
|--------|-------|-----|-----|---------------|------|---------------|
| 스탠다드 | ₩70,000 | ₩80,000 | ₩90,000 | 2 / 2명 | 20㎡ | — |
| 스탠다드 프리미엄 | ₩80,000 | ₩90,000 | ₩105,000 | 2 / 2명 | 25㎡ | — |
| 디럭스 | ₩90,000 | ₩100,000 | ₩115,000 | 2 / 2명 | 30㎡ | — |
| 패밀리 트윈 | ₩90,000 | ₩100,000 | ₩115,000 | 2 / 3명 | 32㎡ | ₩10,000/인/박 |
| 패밀리 트리플 | ₩120,000 | ₩135,000 | ₩150,000 | 3 / 4명 | 38㎡ | ₩10,000/인/박 |
| 로얄 스위트 | ₩140,000 | ₩160,000 | ₩180,000 | 2 / 2명 | 45㎡ | — |
| 파티 스위트 | ₩170,000 | ₩200,000 | ₩225,000 | 4 / 4명 | 60㎡ | — |

## CMS 연동

### Mock 모드 (개발용)

```env
NEXT_PUBLIC_USE_MOCK_CMS=true
```

### 실제 CMS 연동

1. `.env.local` 수정:
```env
NEXT_PUBLIC_USE_MOCK_CMS=false
SANHAWINGS_API_KEY=실제_API_키
SANHAWINGS_API_URL=https://api.sanhawings.com/v1
```

2. `src/lib/cms/sanhawings-adapter.ts`의 TODO 항목 구현

## 디자인 시스템

### 색상

- **Primary (Navy)**: `#1a237e`
- **Accent (Gold)**: `#d4af37`
- **Neutral**: Gray scale

### 폰트

- **헤딩**: Playfair Display
- **본문**: Inter

## 빌드 & 배포

```bash
# 프로덕션 빌드
npm run build

# 프로덕션 실행
npm start
```

## 라이선스

MIT License
