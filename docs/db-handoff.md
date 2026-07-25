# Anytap DB / Seed Data Handoff (Frontend 기준)

백엔드 개발자 전달용. 프론트 UI·상태 분기 기준으로 **필요 테이블, enum, 테스트 계정 seed** 를 정리함.

참고:
- Production: `https://anytap.io` · Member portal: `https://anytap.io/account` · Admin: `https://anytap.io/admin`
- Support: `support@anytap.io` · B2B: `biz@anytap.io`
- Swagger: http://anytap-alb-1199820250.ap-northeast-2.elb.amazonaws.com/swagger-ui/index.html
- API 매핑: `docs/api-field-mapping.md`
- 회원 상태 SSOT: `docs/member-state-handoff.md` · `src/lib/member-state.js`

---

## 1. 핵심 원칙

프론트는 DB의 `memberState` 컬럼을 직접 쓰지 않음.  
**`kycStatus` + `cardStatus` (+ `needsActivation`)** 조합으로 화면 상태를 계산함.

| memberState (UI) | kycStatus | cardStatus | needsActivation |
|------------------|-----------|------------|-----------------|
| `kyc_required` | `pending` | `not_issued` | false |
| `kyc_pending` | `under_review` 또는 `rejected` | `not_issued` | false |
| `card_apply_ready` | `approved` | `not_issued` | false |
| `card_issuing` | `approved` | `application_review` / `deposit_received` / `creating` / `shipping` | false |
| `activate_card` | `approved` | `issued` | true |
| `card_active` | `approved` | `active` 또는 `frozen` | false |

> 카드는 **user 기준**이며, 한 유저당 최대 **3장** (`MAX_CARDS_PER_USER = 3`).

---

## 2. 필수 테이블

### 2.1 `user_temp` (가입 전 임시)

Swagger `send-verification-email` 에서 명시됨.

| 컬럼 | 타입 | 비고 |
|------|------|------|
| email | string | unique |
| login_id | string | 8–32자 |
| password_hash | string | |
| merchant_id | string | |
| verification_code | string | 6자리 |
| expires_at | datetime | |
| verified | boolean | |

### 2.2 `users` (회원)

| 컬럼 | 타입 | 필수 | 비고 |
|------|------|------|------|
| user_id | string/uuid | Y | 로그인·카드 API path 키 |
| email | string | Y | unique |
| login_id | string | Y | unique |
| password_hash | string | Y | |
| merchant_id | string | Y | |
| name | string | | 표시명 |
| phone | string | | |
| country | string | | |
| account_status | enum | Y | `active`, `suspended` |
| kyc_status | enum | Y | 아래 enum 참고 |
| referral_status | enum | | `none`, `member`, `applicant`, `partner` |
| b2b_status | enum | | `not_applied`, `submitted`, `under_review`, `approved`, `rejected` |
| admin_memo | text | | 어드민 메모 |
| created_at | datetime | Y | |
| updated_at | datetime | Y | |

**`kyc_status` enum (DB 저장값 권장)**

| DB/API (대문자) | 프론트 매핑 (소문자) | 의미 |
|-----------------|---------------------|------|
| `PENDING` | `pending` | KYC 미시작 |
| `UNDER_REVIEW` | `under_review` | 심사중 |
| `APPROVED` / `COMPLETED` | `approved` | 승인 |
| `REJECTED` / `FAILED` | `rejected` | 반려 |

### 2.3 `wallets` (Cregis 입금 지갑)

| 컬럼 | 타입 | 필수 | 비고 |
|------|------|------|------|
| wallet_id | string | Y | |
| user_id | FK → users | Y | 1 user : 1 wallet |
| cregis_address | string | Y | 로그인 응답 `cregisWalletAddress` |
| network | string | Y | `TRC20` 등 |
| balance_usdt | decimal | | 온체인 가용 잔액 (Cregis) |
| status | enum | Y | `active`, `locked` |
| created_at | datetime | Y | |

### 2.4 `kyc_applications`

| 컬럼 | 타입 | 필수 | 비고 |
|------|------|------|------|
| kyc_id | string | Y | |
| user_id | FK | Y | |
| status | enum | Y | `pending`, `under_review`, `approved`, `rejected` |
| document_type | string | | Passport, National ID 등 |
| id_document_url | string | | 어드민 미리보기 |
| selfie_url | string | | 어드민 미리보기 |
| reject_reason | text | | |
| submitted_at | datetime | Y | |
| reviewed_at | datetime | | |
| reviewed_by | FK → admins | | |

### 2.5 `card_applications` (카드 신청)

| 컬럼 | 타입 | 필수 | 비고 |
|------|------|------|------|
| application_id | string | Y | |
| user_id | FK | Y | |
| card_variant | enum | Y | `virtual`, `physical` |
| status | enum | Y | `pending`, `approved`, `rejected` |
| fee_usdt | decimal | | 발급비 (예: 100 USDT) |
| reference | string | | 신청 참조번호 |
| reject_reason | text | | |
| created_at | datetime | Y | |

### 2.6 `cards` (발급된 카드)

| 컬럼 | 타입 | 필수 | 비고 |
|------|------|------|------|
| card_id | string | Y | Wasabi card id |
| user_id | FK | Y | **카드 소유는 user 기준** |
| application_id | FK | | |
| card_variant | enum | Y | `virtual`, `physical` |
| card_no | string | | 마스킹/last4 계산용 |
| card_bank_bin | string | | virtual `493875`, physical `493724` |
| status | enum | Y | 아래 enum 참고 |
| blocked | boolean | | true → frozen |
| needs_activation | boolean | | 수령 후 앱 등록 필요 |
| balance_usdt | decimal | | Wasabi 카드 잔액 |
| holder_name | string | | |
| expiry | string | | `MM/YY` |
| is_primary | boolean | | |
| tracking_number | string | | shipping 시 |
| carrier | string | | |
| estimated_delivery | date | | |
| issued_at | datetime | | |
| created_at | datetime | Y | |

**`cards.status` enum (프론트 `cardStatus`와 1:1 맞출 것)**

```
not_issued
application_review
deposit_received
creating
shipping
issued
active
frozen
cancelled
```

> 현재 Swagger `GET /cards/{userId}/info` 는 **user당 1장**처럼 보이지만,  
> 프론트는 **list API** (`GET /cards/{userId}` 또는 `/cards?userId=`) 확장을 전제로 설계됨.

### 2.7 `transactions`

카드 거래(Wasabi) + 지갑 거래(Cregis) 통합 또는 분리 테이블 가능.  
프론트 activity 표시용 공통 필드:

| 컬럼 | 타입 | 비고 |
|------|------|------|
| tx_id | string | |
| user_id | FK | |
| card_id | FK | nullable (지갑 거래면 null) |
| kind | enum | `card_spend`, `card_topup`, `wallet_topup`, `wallet_withdraw`, `wallet_receive`, `wallet_send`, `refund`, `reversal` |
| amount | decimal | |
| currency | string | `USDT` |
| status | enum | `completed`, `pending`, `failed` |
| merchant_name | string | 카드 결제 시 |
| reference | string | tradeNo 등 |
| tx_hash | string | 온체인 시 |
| occurred_at | datetime | |

### 2.8 `withdrawals` (어드민)

| 컬럼 | 타입 | 비고 |
|------|------|------|
| withdrawal_id | string | |
| user_id | FK | |
| amount | decimal | |
| wallet_address | string | |
| status | enum | `pending`, `approved`, `rejected` |
| tx_hash | string | |
| memo | text | |
| requested_at | datetime | |

### 2.9 `referrals` (선택, 어드민)

| 컬럼 | 타입 | 비고 |
|------|------|------|
| user_id | FK | |
| referral_code | string | |
| reward_balance | decimal | |
| available_balance | decimal | |
| pending_balance | decimal | |
| referred_count | int | |
| status | enum | `none`, `member`, `applicant`, `partner` |

### 2.10 `admins`

| 컬럼 | 타입 | 비고 |
|------|------|------|
| admin_id | string | |
| email | string | unique |
| login_id | string | |
| password_hash | string | |
| name | string | |
| role | enum | `super_admin`, `ops`, `support` |
| status | enum | `active`, `disabled` |

### 2.11 `admin_logs`

| 컬럼 | 타입 | 비고 |
|------|------|------|
| log_id | string | |
| admin_id | FK | |
| action | string | |
| target | string | member_id, card_id 등 |
| created_at | datetime | |

---

## 3. 로그인 응답에 꼭 필요한 필드

`POST /auth/login` → 프론트 `httpSession` 저장

```json
{
  "userId": "usr-001",
  "email": "active-card@anytap.io",
  "loginId": "active001",
  "merchantId": "test-merchant",
  "cregisWalletAddress": "TQn9Y2khEsLJW1ChVWFMSMeRDow5oNF3kd",
  "kycStatus": "APPROVED"
}
```

---

## 4. 카드 조회 응답에 꼭 필요한 필드

`GET /cards/{userId}/info` (현재) → 향후 list 확장 권장

```json
{
  "cardId": "card-001",
  "cardNo": "4938751234564921",
  "status": "Normal",
  "blocked": false,
  "needsActivation": false,
  "cardTypeId": "virtual",
  "cardBankBin": "493875",
  "balanceInfo": {
    "cardNo": "4938751234564921",
    "amount": 1240.50
  }
}
```

프론트 매핑:
- `status` + `blocked` → `active` / `frozen`
- `cardNo` → `last4`
- `balanceInfo.amount` → 잔액 표시
- **중간 상태**(`shipping`, `issued`, `creating` 등)는 DB `cards.status` 와 API 응답에 반드시 포함 필요

---

## 5. 요청할 테스트 계정 (seed)

`docs/member-state-handoff.md` §4와 **동일** (8 + admin 1).

비밀번호 공통: `test1234` · merchantId: `test-merchant`

| 로그인 방식 | 입력 | 비고 |
|-------------|------|------|
| **사용자 UI** (`https://anytap.io/login`) | 이메일 + password | 프론트가 내부 `loginId`로 변환 |
| **API/seed 직접 테스트** | `loginId` + password | 아래 표 `loginId` 고정값 사용 |

| # | email | loginId | password | 목표 UI | users.kyc_status | cards.status | walletExists |
|---|-------|---------|----------|---------|------------------|--------------|--------------|
| 1 | kyc-required@anytap.io | kycreq001 | test1234 | ① | PENDING | not_issued | false |
| 2 | kyc-pending@anytap.io | kycpend001 | test1234 | ② | UNDER_REVIEW | not_issued | false |
| 3 | card-ready@anytap.io | cardready001 | test1234 | ③ | APPROVED | not_issued | false |
| 4 | card-deposit@anytap.io | deposit001 | test1234 | ④ | APPROVED | application_review | false |
| 5 | card-shipping@anytap.io | shipping001 | test1234 | ④ | APPROVED | shipping | false |
| 6 | activate-card@anytap.io | activate001 | test1234 | ⑤ | APPROVED | issued | false |
| 7 | active-card@anytap.io | active001 | test1234 | ⑥ | APPROVED | active | true |
| 8 | zero-balance@anytap.io | zerobal001 | test1234 | ⑥ | APPROVED | active | true (balance=0) |

> **선택:** 카드 동결 UI 테스트용 `frozen-card@anytap.io` / `frozen001` (⑥ frozen) 추가 가능.

### 관리자 계정 1개

| email | loginId | password | role | 비고 |
|-------|---------|----------|------|------|
| admin@anytap.io | admin001 | test1234 | super_admin | `/admin/me` 응답용 |

---

## 6. seed 시 같이 넣으면 좋은 연관 데이터

### KYC (어드민 `/admin/kyc`용)

- #1, #2 계정: `kyc_applications` 1건씩 (`pending`, `under_review`)
- #4 반려 케이스 1건 추가 권장: `rejected` + `reject_reason` (#2 계정 또는 별도)

### 카드 신청 (어드민 `/admin/cards`용)

- #3: `card_applications.status = pending`
- #4: `card_applications.status = approved`, `cards.status = application_review` (입금 확인 대기)
- #5: `cards.status = shipping` (+ tracking)
- #6: `cards.status = issued`, `needs_activation = true`
- #7: `cards.status = active`, `last4` 존재

### 지갑

- **#7, #8만** `wallets.cregis_address` + balance (`cardStatus=active` 이후)
- #1~#6: 개인 지갑 없음 (`cregisWalletAddress=null`)

### 거래내역

- #6: `card_spend` 3건 + `card_topup` 1건 이상
- #7: 거래 0건 또는 balance 0
- `wallet_receive` pending 1건 → 어드민 대시보드 입금 검증 큐용

### 출금 (어드민)

- pending 1건, approved 1건, rejected 1건

---

## 7. 현재 Swagger vs 프론트 기대 gap

| 영역 | Swagger에 있음 | 프론트/어드민이 추가로 필요 |
|------|----------------|------------------------------|
| Auth | O | — |
| KYC session/complete | O | kyc_applications 상세·심사 API |
| Card info/transactions | O (user 단건) | **card list**, 중간 status enum |
| Cregis wallet | O | wallet 거래 history |
| Admin | settlement 1개만 | members, kyc list, cards list, wallets, transactions, withdrawals, dashboard, logs |

> 어드민 화면은 UI만 있고, DB seed를 넣어도 **admin list API가 없으면** HTTP 모드에서 빈 화면임.  
> 우선순위: `users` + `cards` + `kyc_applications` seed → 회원 포털 6상태 검증 → 어드민 list API.

---

## 8. 백엔드에 보낼 한 줄 요약

```
회원 6상태 테스트용 계정 8개 + admin 1개 seed 필요.
핵심은 users.kyc_status + cards.status(+needs_activation) 조합이며,
카드는 user 기준 최대 3장, 로그인 응답에 userId/email/kycStatus/cregisWalletAddress 필수.
```
