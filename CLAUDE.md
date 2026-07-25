# Anytap Homepage — Claude Code 가이드

Anytap 공식 마케팅 사이트 + 회원 포털(대시보드) SPA.  
**작업 루트:** 이 디렉터리(`www/`). Vercel Root Directory도 `www`.

---

## 프로젝트 규칙 (최우선 준수)

> **이 규칙은 모든 작업에서 항상 참고하고 지킨다.**

| 규칙 | 세부 내용 |
|------|-----------|
| **언어** | React + **TypeScript** — 신규 파일은 `.tsx` / `.ts` 사용 |
| **스타일** | **TailwindCSS** 우선 — 신규 컴포넌트는 Tailwind 클래스로 작성 |
| **반응형** | **Mobile First** — 모바일 기준 작성 후 `md:` `lg:` 확장 |
| **앱** | **PWA** 대응 — 서비스워커, 오프라인 fallback, manifest 유지 |
| **UI** | **기존 UI 변경 금지** — 시각적 결과물은 항상 현재와 동일하게 유지 |
| **디자인** | **Figma 기준** — UI 변경 시 반드시 Figma 디자인 확인 후 구현 |
| **컴포넌트** | **재사용 우선** — 기존 컴포넌트 확장·조합 가능하면 신규 생성 금지 |
| **백엔드** | **Supabase** 사용 예정 (인증, DB, Storage) |
| **카드 API** | **Wasabi API** 사용 예정 (카드 발급·관리) |
| **결제 API** | **Cregis API** 사용 예정 (USDT 입출금) |

### 기술 스택 전환 방향

현재 코드베이스는 **JavaScript + 커스텀 CSS** 로 작성되어 있음.  
앞으로 신규 파일·컴포넌트는 **TypeScript + TailwindCSS** 로 작성하며,  
기존 파일은 수정 요청이 있을 때 단계적으로 마이그레이션한다.

- 기존 `.jsx` → 수정 시 `.tsx`로 전환
- 기존 BEM 클래스 CSS → 수정 시 Tailwind로 대체
- 기존 UI 비주얼은 **절대 바뀌면 안 됨** (Tailwind로 교체해도 픽셀 수준 동일 유지)

---

## 기술 스택

| 항목 | 현재 | 목표 |
|------|------|------|
| 빌드 | Vite 6 | Vite 6 (유지) |
| UI | React 18 + React Router 6 | React 18 + React Router 6 (유지) |
| 언어 | JavaScript (`.jsx`) | **TypeScript (`.tsx`)** |
| 스타일 | 커스텀 CSS (BEM) | **TailwindCSS** |
| 인증·DB | mock (클라이언트) | **Supabase** |
| 카드 발급 | mock | **Wasabi API** |
| 입출금 | mock | **Cregis API** |
| 폰트 | Red Hat Display/Text + Pretendard CJK | 유지 |
| 아이콘 | `@phosphor-icons/react` | 유지 |
| 배포 | Vercel SPA (`vercel.json` rewrite) | 유지 |
| PWA | 미적용 | **manifest + Service Worker 추가 예정** |

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run preview
```

---

## 디렉터리 구조

```
www/
├── src/
│   ├── App.jsx                 # 라우팅 루트 (/account/* vs 마케팅)
│   ├── routes.jsx              # 공개 페이지 경로
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   └── AccountApp.jsx      # 회원 포털 셸 + 라우팅
│   ├── components/
│   │   ├── chrome.jsx          # Header/Footer (마케팅)
│   │   ├── ui.jsx              # Logo, Icon, PaymentCard
│   │   ├── sections.jsx        # 홈 섹션
│   │   ├── sub-*.jsx           # 마케팅 서브페이지
│   │   ├── account-dashboard.jsx
│   │   ├── account-cards.jsx   # 카드 미디어, 캐러셀, 지갑
│   │   ├── account-card-apply.jsx
│   │   └── account-activity.jsx
│   ├── lib/
│   │   ├── account-data.js     # 포털 mock 데이터·시나리오·라우트
│   │   ├── auth.js             # mock 로그인·세션
│   │   ├── dashboard-state.js  # 대시보드 hero/퀵액션 설정
│   │   ├── card-application.js # 카드 신청 플로우
│   │   └── legal.js
│   └── styles/
│       ├── design-system.css   # :root 토큰 (단일 소스)
│       ├── colors_and_type.css
│       ├── styles.css          # 마케팅 BEM
│       └── account.css         # 포털 전용
├── public/
│   ├── assets/cards/           # 카드 PNG
│   └── manifest.webmanifest    # PWA manifest (추가 예정)
├── DESIGN-SYSTEM.md            # 디자인 토큰 참고
├── anytab-website-ia.html      # IA 대시보드 (기획 참고)
└── .cursor/rules/design-system.mdc  # Cursor 규칙 (필수 준수)
```

---

## 라우팅

### 마케팅 (`src/routes.jsx` + `PageShell`)

| 경로 | 페이지 |
|------|--------|
| `/` | 홈 |
| `/login`, `/sign-up`, `/forgot-password` | 인증 |
| `/card-how-to-use`, `/card-benefits`, … | 카드 |
| `/payment-*`, `/innovation-*`, `/referral-*` | 서브 |
| `/security`, `/privacy`, `/terms`, … | 법적 |

### 회원 포털 (`/account/*` → `AccountApp.jsx`)

| screen id | 경로 | 설명 |
|-----------|------|------|
| `home` | `/account` | 대시보드 |
| `card` | `/account/card` | 내 카드 |
| `cardApply` | `/account/card-apply` | 카드 신청 (5단계) |
| `topup` | `/account/topup` | USDT 입금 주소 (mock) |
| `history` | `/account/history` | 입금 이력 |
| `transactions` | `/account/transactions` | 카드 사용 내역 |
| `referral` | `/account/referral` | 레퍼럴 |
| `settings/*` | `/account/settings/...` | 설정 |

라우트·네비 정의: `src/lib/account-data.js` → `SCREEN_ROUTES`, `NAV_MAIN`, `pathToScreen()`

---

## 디자인 시스템 (필수)

- **토큰:** `src/styles/design-system.css`만 수정. hex 하드코딩 금지.
- **Primary CTA:** `--brand-primary` `#FF5500`
- **버튼:** 항상 pill (`border-radius: 999px` / `.btn`)
- **구 amber 팔레트** (`#e88828` 등) 사용 금지
- **Tailwind 사용 시** `tailwind.config`에서 design-system 토큰을 `extend`로 연결해 사용

상세: `DESIGN-SYSTEM.md`, `.cursor/rules/design-system.mdc`

### 포털 UI 원칙 (기존 UI 유지 기준)

- 대시보드(`portal-dash--unified`): **섹션 구분선만**, `portal-panel` 박스 중첩 최소화
- 활성 대시보드 카드: `DashboardCardWallet` 피크 캐러셀
- 카드 최소 너비: `--portal-dash-card-min-w: 300px`, PC `max-width: 360px` 중앙 정렬
- 첫 슬롯(첫 번째 카드) 항상 중앙 — `scrollIntoView({ inline: 'center' })`

---

## 카드 정책 (UI·카피)

| 구분 | 규칙 |
|------|------|
| 네트워크 | **Visa only** (Mastercard/partner명 UI 노출 금지) |
| Virtual | Black 카드 (`black_card.png`), BIN `493875`, **흰색 텍스트** |
| Physical | White 카드 (`white_card.png`), BIN `493724`, **검정 텍스트** |
| `data-card-theme` | virtual → `dark`, physical → `light` |
| 보유 한도 | `MAX_CARDS_PER_USER = 3` |
| 브랜드 라벨 | 카드 위 `Anytap Visa` (`cardKindLabel`) |
| 마스킹 | `maskCardWithBin()` — 예: `4938 75•• ••••4921` |

카드 이미지: `CARD_IMAGES` in `account-data.js`  
카드 신청: `account-card-apply.jsx` + `card-application.js`

### 지갑 캐러셀 (`DashboardCardWallet`)

- 슬롯 3개: 실제 카드 + 빈 슬롯(`+` → `cardApply`)
- 0장: 중앙 `+` 단일 슬롯
- 1장: 카드 중앙, 스와이프 시 빈 슬롯
- 3장 full: PC 양옆 peek(축소·투명), 모바일 최소 peek

---

## API 연동 계획

> 현재는 모두 클라이언트 mock. 아래 순서로 실 API로 교체 예정.

### Supabase
- **인증:** 이메일/비밀번호 로그인, 세션 관리 (`src/lib/auth.js` 교체)
- **DB:** 사용자 프로필, KYC 상태, 카드 상태
- **Storage:** KYC 문서, 프로필 이미지
- 환경변수: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### Wasabi API (카드 발급·관리)
- 카드 발급, 카드번호·CVV 조회, 카드 동결/해제
- 파트너명 (`WasabiCard`) 사용자-facing 노출 금지
- 환경변수: `VITE_WASABI_API_URL`, `VITE_WASABI_API_KEY`

### Cregis API (USDT 입출금)
- USDT 입금 주소 생성, 입금 확인, 잔액 조회
- 파트너명 (`Cregis`, `Tapayz`) 사용자-facing 노출 금지
- 환경변수: `VITE_CREGIS_API_URL`, `VITE_CREGIS_API_KEY`

---

## Mock 인증 & 개발 시나리오

### 로그인 (mock)

```
이메일: test@test.co.kr
비밀번호: test1234
```

`src/lib/auth.js` — `attemptLogin`, `setMockSession`

### 대시보드 시나리오 (`ACCOUNT_SCENARIOS`)

이메일로 시나리오 분기 (`scenarioForMockSession` in `auth.js`):

| 이메일 | scenarioKey | 상태 |
|--------|-------------|------|
| `new@anytap.com` | `newUser` | KYC pending |
| `review@anytap.com` | `kycReview` | KYC 심사 중 |
| `jane.doe@example.com` | `notIssued` | KYC 승인, 카드 미발급 |
| 그 외 (기본) | `active` | 카드 1장 활성 |

`AccountApp.jsx`에 시나리오 스위처(개발용) 포함.  
시나리오 키: `newUser`, `kycReview`, `notIssued`, `depositReceived`, `cardCreating`, `shipping`, `activateCard`, `issued`, `active`, `activeThree`, `zeroBalance`

카드 라이프사이클: `not_issued` → `deposit_received` → `creating` → `issued` → `active`

---

## 회원 상태 (User State Flow)

> **화면 설계 기준은 API 필드가 아니라 사용자 상태(`memberState`)입니다.**  
> 소스: `src/lib/member-state.js` · 대시보드: `dashboard-state.js` → `resolveDashboardView()`

### 대시보드 6개 메인 상태

| memberState | 사용자에게 보이는 단계 | Dev scenario |
|-------------|------------------------|--------------|
| `kyc_required` | ① KYC Required — 가입·이메일 인증 완료, KYC 미시작 | `newUser` |
| `kyc_pending` | ② KYC Pending — 제출 완료, 심사 중 (24–48h, 버튼 없음) | `kycReview` |
| `card_apply_ready` | ③ Card Apply Ready — KYC 승인, 카드 신청 가능 | `notIssued` |
| `card_issuing` | ④ Card Issuing — 승인/제작/배송 진행 중 | `depositReceived`, `cardCreating`, `shipping` |
| `activate_card` | ⑤ Activate Card — 카드 수령, 앱 등록 필요 | `activateCard` |
| `card_active` | ⑥ Card Active — Wallet·Top Up·Send 전부 사용 | `active`, `activeThree`, `zeroBalance` |

### API → 사용자 상태 매핑

```
kycStatus: pending           → kyc_required
kycStatus: under_review      → kyc_pending
kycStatus: approved + not_issued     → card_apply_ready
kycStatus: approved + deposit_received | creating | shipping → card_issuing
kycStatus: approved + issued (+ needsActivation) → activate_card
kycStatus: approved + active | frozen → card_active
```

### B2B (카드와 별도)

`B2B_STATE`: `not_applied` → `submitted` → `under_review` → `approved` | `rejected`  
별도 플로우로 분리 (대시보드 메인 6상태와 독립).

### 잔액 0원 오버레이

`card_active` + `zeroBalance: true` (또는 카드 balance 0) → 대시보드 상단 **Balance $0.00 · Top Up Now** 프롬프트.

### 상태별 대시보드 UI 요약

| 상태 | 카드 영역 | CTA | Wallet |
|------|-----------|-----|--------|
| KYC Required | 빈 카드 + Verify Identity | Verify Identity | — |
| KYC Pending | 빈 카드 + 심사 배너 | 없음 | — |
| Card Apply Ready | 빈 카드 + Apply Card | Apply Card | — |
| Card Issuing | 회색/블러 카드 또는 배송 트래킹 | 없음 (배송: Track) | — |
| Activate Card | 발급된 카드 + Activate 배너 | Activate Card | — |
| Card Active | 지갑 히어로 + 카드 캐러셀 | Top Up on card | Receive / Send |

---

## 핵심 파일 역할

| 파일 | 역할 |
|------|------|
| `account-data.js` | 카드 템플릿, 활동 mock, 상태 정의, `resolveUserCards()`, `resolveDashboardView` 입력 |
| `dashboard-state.js` | `resolveDashboardView()` — member state 기반 hero, quick actions |
| `member-state.js` | **사용자 상태 SSOT** — `resolveMemberState()`, 대시보드 config |
| `account-dashboard.jsx` | `AccountHome`, `DashboardCardSection` |
| `account-cards.jsx` | `PortalCardMedia`, `DashboardCardWallet`, `buildWalletSlots` |
| `AccountApp.jsx` | 포털 레이아웃, 사이드바/모바일 nav, 화면 스위치 |

---

## 아직 mock / 미완성

- **Top Up:** 입금 주소·QR만 있음. 금액 입력·충전 확인 UX 없음
- **API 연동 없음:** 로그인, KYC, 카드 발급, 입금 모두 클라이언트 mock
- **파트너명:** WasabiCard, Cregis, Tapayz 등 사용자-facing 노출 금지
- **포털 UI 언어:** English (마케팅·법적 페이지 포함)
- **PWA:** manifest, service worker 미적용

---

## 작업 시 주의

1. **기존 UI 변경 금지** — 시각적 결과물이 달라지면 안 됨. Tailwind로 재작성해도 픽셀 수준 동일해야 함
2. **TypeScript 우선** — 신규 파일은 `.tsx`/`.ts`, 타입 `any` 최소화
3. **Mobile First** — 스타일은 모바일 기준, `md:` `lg:` 순서로 확장
4. **컴포넌트 재사용** — 신규 컴포넌트 생성 전 기존 컴포넌트 확장 가능한지 확인
5. **스코프 최소화** — 요청 범위 밖 리팩터·포맷 금지
6. **커밋** — 사용자가 명시적으로 요청할 때만
7. **임시 파일 커밋 금지** — `tmp-*`, `tmp-portal-extract/`, `최종자료/` 등
8. **카드 CSS** — virtual/physical 색상 테마 반대로 적용하지 말 것 (black = white text)
9. **캐러셀** — 첫 카드 중앙 정렬 깨지 않게 `padding-inline` + `scroll-padding` 유지
10. **파트너명 노출 금지** — Wasabi, Cregis, Tapayz 등 내부 파트너명은 UI에 표시 안 함

---

## 배포

- GitHub: `ymy-anytap/homepage`
- Vercel Root: `www`, Build: `npm run build`, Output: `dist`
- `vercel.json` SPA rewrite 적용

---

## 참고 문서

- `anytab-website-ia.html` — 전체 사이트맵·포털 IA
- `DESIGN-SYSTEM.md` — 컬러·타이포·컴포넌트
- `README.md` — 설치·배포 요약
