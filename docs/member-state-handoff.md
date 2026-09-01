# Anytap 회원 상태값 전달 (프론트 UI 기준)

백엔드·기획 공유용. 프론트 화면 분기 기준으로 회원 상태와 필요한 API 필드를 정리함.

- Production: `https://anytap.io` · Member portal: `https://anytap.io/account` · Admin: `https://anytap.io/admin`
- Support: `support@anytap.io` · B2B: `biz@anytap.io`
- Swagger: [http://anytap-alb-1199820250.ap-northeast-2.elb.amazonaws.com/swagger-ui/index.html](http://anytap-alb-1199820250.ap-northeast-2.elb.amazonaws.com/swagger-ui/index.html)
- 프론트 SSOT: `src/lib/member-state.js`

---

## 0. 핵심 전제

- **B2B / B2C 구분 없음.** 채널만 다를 뿐 **전원 동일 플로우**.
- **B2B·B2C 모두** 카드 수령 후 **카드번호 등록(Activate)** 해야 사용 가능. (등록 없이 바로 사용 불가)
- **가입 시 카드·개인 지갑 자동 발급 없음.**
- 프론트는 DB `member_state` 컬럼을 직접 쓰지 않음.
- `**kycStatus` + `cardStatus` + `walletExists` + `needsActivation`** (+ 발급비 입금 주소) 조합으로 UI 상태를 계산함.

### 0.1 운영 순서 (확정)

```
1. 회원가입
2. KYC 인증
3. KYC 승인 후 → 카드 신청
4. 신청 직후 → 발급비 $100 입금 지갑(주소) 노출 · 입금
5. 입금 확인 → 카드 제작
6. 배송 시작  ← 이 시점부터 $100 입금 지갑 노출 종료
7. 수령 후 카드 등록(Activate)  ← B2B·B2C 모두 필수
8. 등록 완료 → 개인 지갑(Cregis) 오픈
9. 개인 지갑에 USDT 충전
10. 지갑 → 카드로 이체(충전)
11. 카드 사용 시작
```

### 0.2 지갑 두 종류 (혼동 금지)


| 구분                 | 언제 노출                       | 용도              | API 필드 (요청)                                                                                           |
| ------------------ | --------------------------- | --------------- | ----------------------------------------------------------------------------------------------------- |
| **발급비 $100 입금 지갑** | 카드 **신청 직후** ~ **배송 시작 직전** | 발급비 100 USDT    | `issuanceDepositAddress` (또는 동등). `**application_review` → `deposit_received` → `creating` 동안 계속 노출** |
| **개인 사용 지갑**       | 카드 **등록(`active`) 이후**만     | 충전 → 카드 이체 → 결제 | `cregisWalletAddress` / `walletExists=true`                                                           |


> 발급비 입금 주소 ≠ 개인 지갑.  
> `shipping` / `issued` / `active` 부터는 발급비 지갑 UI **숨김**.

---

## 1. 프론트 메인 회원 상태 (6단계)


| #   | memberState        | 사용자 단계     | 화면 요약                             |
| --- | ------------------ | ---------- | --------------------------------- |
| ①   | `kyc_required`     | KYC 미시작    | 본인인증 유도                           |
| ②   | `kyc_pending`      | KYC 심사중/반려 | 심사 대기 (반려 시 재시도)                  |
| ③   | `card_apply_ready` | 카드 신청 가능   | 카드 신청 CTA                         |
| ④   | `card_issuing`     | 발급 진행중     | **$100 입금 지갑 노출**(배송 전) · 제작 · 배송 |
| ⑤   | `activate_card`    | 카드 등록 필요   | 수령 후 등록 (**B2B·B2C 공통**)          |
| ⑥   | `card_active`      | 카드 사용 가능   | 개인 지갑 오픈 · 충전 · 카드 이체 · 결제        |


---

## 2. 백엔드 필드 → UI 매핑

### 2.1 KYC (`kycStatus`)


| API/DB                  | 프론트            | UI 상태                |
| ----------------------- | -------------- | -------------------- |
| `PENDING`               | `pending`      | ① kyc_required       |
| `UNDER_REVIEW`          | `under_review` | ② kyc_pending        |
| `REJECTED`, `FAILED`    | `rejected`     | ② kyc_pending        |
| `APPROVED`, `COMPLETED` | `approved`     | ③~⑥ (cardStatus로 분기) |


### 2.2 카드 (`cardStatus`) — KYC approved 이후


| cardStatus           | UI 상태              | 의미                                | 발급비 $100 지갑 노출        |
| -------------------- | ------------------ | --------------------------------- | --------------------- |
| `not_issued`         | ③ card_apply_ready | 카드 미신청                            | ❌                     |
| `application_review` | ④ card_issuing     | 신청 완료, **$100 입금 대기**             | ✅ **계속 노출**           |
| `deposit_received`   | ④ card_issuing     | 입금 확인, 심사/제작 대기                   | ✅ **계속 노출**           |
| `creating`           | ④ card_issuing     | 카드 제작중                            | ✅ **계속 노출** (배송 직전까지) |
| `shipping`           | ④ card_issuing     | 배송중                               | ❌ 노출 종료               |
| `issued`             | ⑤ activate_card    | 배송 완료, **카드번호 등록 전** (B2B·B2C 공통) | ❌                     |
| `active`             | ⑥ card_active      | 등록 완료 → 개인 지갑 오픈 · 사용 가능          | ❌                     |
| `frozen`             | ⑥ card_active      | 등록됨, 카드 동결                        | ❌                     |


### 2.3 지갑 노출

**A. 발급비 $100 입금 지갑** (`issuanceDepositAddress`)


| cardStatus                                             | 노출                           |
| ------------------------------------------------------ | ---------------------------- |
| `application_review` / `deposit_received` / `creating` | **예 — 신청 후 배송 시작 전까지 유지 유지** |
| `shipping` 이후                                          | 아니오                          |


**B. 개인 사용 지갑** (`walletExists` / `cregisWalletAddress`)


| 시점                           | walletExists | cregisWalletAddress |
| ---------------------------- | ------------ | ------------------- |
| 가입 ~ KYC ~ 카드 신청 ~ 배송 ~ 등록 전 | `false`      | `null`              |
| **카드 등록 완료 (`active`) 후**    | `true`       | 실제 TRC20 주소         |


개인 Cregis 지갑은 `**cardStatus=active` 이후**에만 내려주면 됨.  
그 다음 UX: **지갑 충전 → 지갑에서 카드로 이체 → 사용**.

### 2.4 보조 필드


| 필드                          | 용도                                    |
| --------------------------- | ------------------------------------- |
| `needsActivation`           | `true` → ⑤ activate_card (수령 후 등록 필요) |
| `issuanceDepositAddress`    | 발급비 $100 입금 주소 (신청 후 ~ 배송 전)          |
| `issuanceDepositAmount`     | 예: `100` (USDT)                       |
| `walletBalance`             | 개인 지갑 USDT (등록 후)                     |
| `cardCount`                 | 보유 카드 수 (최대 3)                        |
| `trackingNumber`, `carrier` | `shipping` 시 배송 추적                    |


---

## 3. 단계별 플로우

```
[①] kycStatus=PENDING, cardStatus=not_issued
    → KYC 유도

[②] kycStatus=UNDER_REVIEW|REJECTED, cardStatus=not_issued
    → 심사 대기 / 반려 재시도

[③] kycStatus=APPROVED, cardStatus=not_issued
    → 카드 신청 CTA

[④ 입금 대기] cardStatus=application_review
    → 발급비 $100 입금 지갑 노출 (유지)

[④ 입금 확인] cardStatus=deposit_received
    → $100 지갑 계속 노출 + 입금 확인됨

[④ 제작중] cardStatus=creating
    → $100 지갑 계속 노출 + 제작중

[④ 배송] cardStatus=shipping
    → $100 지갑 노출 종료 · 배송 추적

[⑤] cardStatus=issued, needsActivation=true
    → 수령 후 카드 등록 (B2B·B2C 동일)

[⑥] cardStatus=active, walletExists=true, cregisWalletAddress=있음
    → 개인 지갑 오픈 · 지갑 충전 · 카드 이체 · 사용
```

---

## 4. 테스트 계정 seed (8 + admin 1)

**공통:** password `test1234` · merchantId `test-merchant`


| 로그인 방식                                 | 입력                   | 비고                            |
| -------------------------------------- | -------------------- | ----------------------------- |
| **사용자 UI** (`https://anytap.io/login`) | 이메일 + password       | 프론트가 내부 `loginId`로 변환해 API 호출 |
| **API/seed 직접 테스트**                    | `loginId` + password | 아래 표의 `loginId` 값 그대로 사용      |



| #   | email                                                     | loginId      | password | UI  | kycStatus    | cardStatus         | walletExists     |
| --- | --------------------------------------------------------- | ------------ | -------- | --- | ------------ | ------------------ | ---------------- |
| 1   | [kyc-required@anytap.io](mailto:kyc-required@anytap.io)   | kycreq001    | test1234 | ①   | PENDING      | not_issued         | false            |
| 2   | [kyc-pending@anytap.io](mailto:kyc-pending@anytap.io)     | kycpend001   | test1234 | ②   | UNDER_REVIEW | not_issued         | false            |
| 3   | [card-ready@anytap.io](mailto:card-ready@anytap.io)       | cardready001 | test1234 | ③   | APPROVED     | not_issued         | false            |
| 4   | [card-deposit@anytap.io](mailto:card-deposit@anytap.io)   | deposit001   | test1234 | ④   | APPROVED     | application_review | false            |
| 5   | [card-shipping@anytap.io](mailto:card-shipping@anytap.io) | shipping001  | test1234 | ④   | APPROVED     | shipping           | false            |
| 6   | [activate-card@anytap.io](mailto:activate-card@anytap.io) | activate001  | test1234 | ⑤   | APPROVED     | issued             | false            |
| 7   | [active-card@anytap.io](mailto:active-card@anytap.io)     | active001    | test1234 | ⑥   | APPROVED     | active             | true             |
| 8   | [zero-balance@anytap.io](mailto:zero-balance@anytap.io)   | zerobal001   | test1234 | ⑥   | APPROVED     | active             | true (balance=0) |


**관리자 (1)**


| email                                     | loginId  | password | role        |
| ----------------------------------------- | -------- | -------- | ----------- |
| [admin@anytap.io](mailto:admin@anytap.io) | admin001 | test1234 | super_admin |


---

## 5. 로그인 응답 예시

**등록 전 (①~⑤)**

```json
{
  "userId": "US123456",
  "email": "activate-card@anytap.io",
  "loginId": "activate001",
  "merchantId": "test-merchant",
  "kycStatus": "APPROVED",
  "cregisWalletAddress": null
}
```

**등록 후 (⑥)**

```json
{
  "userId": "US123457",
  "email": "active-card@anytap.io",
  "loginId": "active001",
  "merchantId": "test-merchant",
  "kycStatus": "APPROVED",
  "cregisWalletAddress": "TQn9Y2khEsLJW1ChVWFMSMeRDow5oNF3kd"
}
```

---

## 6. Swagger와 다른 점 (백엔드 정합 필요)


| 항목              | 현재 Swagger | 실제 운영 (요청)   |
| --------------- | ---------- | ------------ |
| sign-up 시 카드/지갑 | 즉시 발급      | 발급 안 함       |
| login 시 지갑주소    | 포함 가능      | 등록 전엔 `null` |
| cards/register  | 가상카드 즉시 발급 | 수령 후 카드번호 등록 |


---

## 7. 백엔드 전달 한 줄

> 회원 8상태 테스트 계정 + admin 1개 seed 필요 (전 계정 password: `test1234`, merchantId: `test-merchant`). B2B·B2C 동일: 가입→KYC→카드신청→**발급비 $100 입금 지갑을 신청 후~배송 시작 전까지 계속 노출**→제작→배송→**수령 후 카드 등록 필수**→개인 지갑 오픈→지갑 충전→카드 이체→사용. `issuanceDepositAddress`는 `application_review|deposit_received|creating`에만. `cregisWalletAddress`/`walletExists`는 `cardStatus=active` 이후에만.

---

## 8. Admin 화면용 seed · API 요청

회원 seed만으로는 **어드민 UI 테스트가 부족**할 수 있음. 아래도 같이 요청.

### 8.1 Admin 계정 (§4 참고)


| email                                     | loginId  | password | role        |
| ----------------------------------------- | -------- | -------- | ----------- |
| [admin@anytap.io](mailto:admin@anytap.io) | admin001 | test1234 | super_admin |


- `GET /admin/me` 응답에 `name`, `email`, `role` 포함

### 8.2 회원 seed에 딸린 연관 데이터


| 어드민 화면           | 넣어달라고 할 데이터                                                                |
| ---------------- | -------------------------------------------------------------------------- |
| **Members**      | §4 회원 8명 전원 (이름·국가·joinDate 등 기본 필드)                                       |
| **KYC**          | #1 `#2`용 `kyc_applications` — pending 1건, under_review 1건 (반려 1건 있으면 더 좋음) |
| **Cards**        | #4 application_review, #5 shipping(+tracking), #6 issued, #7 active        |
| **Wallets**      | #7 `#8` — `cregis_address` + balance (#8는 0)                               |
| **Transactions** | #7 — `card_spend` 2건 + `card_topup` 1건 이상                                  |
| **Dashboard**    | withdrawal `pending` 1건, wallet_receive `pending` 1건 (입금 검증 큐)             |


### 8.3 shipping 계정 보조 데이터 (#5)


| 필드                  | 예시                   |
| ------------------- | -------------------- |
| `trackingNumber`    | `1Z999AA10123456784` |
| `carrier`           | `DHL`                |
| `estimatedDelivery` | `2026-07-15`         |


### 8.4 Admin API (프론트가 기대, Swagger에 아직 없음)

우선순위 높은 것부터:


| 우선순위 | API                                      | 용도                     |
| ---- | ---------------------------------------- | ---------------------- |
| P0   | `GET /admin/me`                          | 어드민 로그인·사이드바           |
| P0   | `GET /admin/members`                     | 회원 목록                  |
| P0   | `GET /admin/kyc`                         | KYC 심사 목록              |
| P0   | `GET /admin/cards/applications`          | 카드 신청·발급 목록            |
| P1   | `GET /admin/dashboard`                   | 대시보드 KPI·pending tasks |
| P1   | `GET /admin/wallets`                     | 지갑 목록                  |
| P1   | `GET /admin/transactions`                | 거래 목록                  |
| P2   | `GET /admin/withdrawals`                 | 출금 요청                  |
| P2   | `POST /admin/kyc/{id}/approve`, `reject` | KYC 승인/반려              |


> 현재 Swagger에는 `POST /admin/settlement/payout/{userId}` 만 있음.  
> **DB seed만 넣고 admin list API가 없으면** HTTP 모드 어드민 화면은 빈 목록/404.

### 8.5 백엔드 전달 (Admin 추가 한 줄)

> Admin 테스트: `admin@anytap.io` / `admin001` / `test1234` + §4 회원 8명 seed와 연결된 KYC·카드·거래·withdrawal pending 데이터. `GET /admin/me`, `/admin/members`, `/admin/kyc`, `/admin/cards/applications` 우선 구현 부탁드립니다.

---

## 9. 구현 화면 ↔ 피그마 매핑 (백엔드·디자인 공유용)

회원 UI는 `memberState` 6단계(①~⑥)로 분기한다. **별도 URL이 아니라 같은 `/account` 대시보드**가 상태마다 히어로·CTA만 바뀐다.

- Preview: `http://localhost:5173`
- 로그인: 이메일 + password `test1234` (프론트가 내부 `loginId`로 변환)
- 피그마: 아래 **구현 경로**마다 프레임 1장(또는 Dashboard ①~⑥ variant)을 붙이면 됨

### 9.1 ①②가 뭔지


| #   | memberState    | 의미                  | login 필드                    | 대시보드에 보이는 것                       |
| --- | -------------- | ------------------- | --------------------------- | --------------------------------- |
| ①   | `kyc_required` | 가입만 됨, KYC **미시작**  | `kycStatus=PENDING`         | Welcome + **Verify Identity** CTA |
| ②   | `kyc_pending`  | KYC **제출함**, 심사중/반려 | `UNDER_REVIEW` / `REJECTED` | 심사 배너(24–48h), **버튼 없음**          |


> ①②는 `/account` 한 화면의 variant다. KYC 전용 별도 라우트가 아님.  
> **UI는 이미 구현됨.** 다만 ALB login이 `kycStatus=APPROVED`만 주면 ③처럼 보임.  
> **데모 링크**(`/demo/state/kyc-required`, `kyc-pending`)는 프론트가 `PENDING` / `UNDER_REVIEW`를 **강제**해 미리보기 가능. 운영 seed는 백엔드에서 진짜 `PENDING`/`UNDER_REVIEW` 내려줘야 함.

### 9.2 Dashboard 상태별 (필수 — 피그마 variant 6~8장)


| memberState              | 테스트 계정 (email)            | 구현 경로      | 피그마 프레임 (권장 이름)                         | 화면 요약                          |
| ------------------------ | ------------------------- | ---------- | --------------------------------------- | ------------------------------ |
| ① `kyc_required`         | `kyc-required@anytap.io`  | `/account` | `Portal/Dashboard/① KYC Required`       | Verify Identity                |
| ② `kyc_pending`          | `kyc-pending@anytap.io`   | `/account` | `Portal/Dashboard/② KYC Pending`        | Under review 배너                |
| ③ `card_apply_ready`     | `card-ready@anytap.io`    | `/account` | `Portal/Dashboard/③ Card Apply Ready`   | Identity verified + Apply Card |
| ④ `card_issuing` (입금/심사) | `card-deposit@anytap.io`  | `/account` | `Portal/Dashboard/④ Issuing – Review`   | Application under review       |
| ④ `card_issuing` (배송)    | `card-shipping@anytap.io` | `/account` | `Portal/Dashboard/④ Issuing – Shipping` | Track delivery                 |
| ⑤ `activate_card`        | `activate-card@anytap.io` | `/account` | `Portal/Dashboard/⑤ Activate Card`      | Activate 배너                    |
| ⑥ `card_active`          | `active-card@anytap.io`   | `/account` | `Portal/Dashboard/⑥ Card Active`        | Wallet + 카드 캐러셀                |
| ⑥ + zero balance         | `zero-balance@anytap.io`  | `/account` | `Portal/Dashboard/⑥ Zero Balance`       | Balance $0 · Top Up overlay    |


### 9.3 플로우·서브 페이지 (상태와 연결)


| 구현 경로                         | 주로 쓰는 상태                      | 피그마 프레임 (권장 이름)                        |
| ----------------------------- | ----------------------------- | -------------------------------------- |
| `/login`                      | 공통                            | `Portal/Auth/Login`                    |
| `/sign-up`, `/sign-up/verify` | 공통                            | `Portal/Auth/Sign Up`                  |
| `/account/card-apply`         | ① KYC 진입, ③ 카드 신청             | `Portal/Card Apply` (다단계)              |
| `/account/card-register`      | ⑤ 수령 후 등록                     | `Portal/Card Register`                 |
| `/account/card`               | ⑤⑥ 내 카드                       | `Portal/My Card`                       |
| `/account/topup`              | ④ 발급비 $100 입금 / ⑥ 개인 지갑·카드 충전 | `Portal/Top Up` (발급비 vs 개인 지갑 variant) |
| `/account/wallet`             | ⑥                             | `Portal/Wallet`                        |
| `/account/transactions`       | ⑥                             | `Portal/Transactions`                  |
| `/account/history`            | ⑥ 입금 이력                       | `Portal/Top-up History`                |
| `/account/referral`           | ⑥                             | `Portal/Referral`                      |
| `/account/settings/`*         | 공통                            | `Portal/Settings`                      |


### 9.4 백엔드·디자인 전달 한 줄

> 피그마는 **Dashboard ①~⑥(+ zero) variant**와 **card-apply / card-register / card / topup(발급비·개인지갑)** 를 §9 구현 경로에 매핑해 주세요. 순서: 가입→KYC→카드신청→**$100 입금 지갑 유지(배송 전)**→배송→**등록(B2B·B2C 공통)**→개인지갑→충전→카드이체→사용. ①② seed용 `kycStatus` `PENDING`/`UNDER_REVIEW` 필요.

### 9.5 상태·페이지 미리보기 링크

목록: `/demo/states` (대시보드 + **페이지별 API needs** 표시)  
자동 로그인: `/demo/state/{slug}` → 시드 로그인 후 `path`로 이동  
비밀번호: `test1234`

#### 대시보드 ①~⑥

| 상태 | 바로가기 | 핵심 API |
| --- | --- | --- |
| 목록 | `/demo/states` | — |
| ① KYC Required | `/demo/state/kyc-required` | `kycStatus=PENDING` |
| ② KYC Pending | `/demo/state/kyc-pending` | `UNDER_REVIEW\|REJECTED` |
| ③ Card Apply Ready | `/demo/state/card-ready` | `APPROVED` + `not_issued` |
| ④ $100 deposit | `/demo/state/card-deposit` | `application_review` + `issuanceDepositAddress` |
| ④ Shipping | `/demo/state/card-shipping` | `shipping` + `trackingNumber`/`carrier` |
| ⑤ Activate | `/demo/state/activate-card` | `issued` + `needsActivation` |
| ⑥ Active | `/demo/state/active-card` | `active` + `cregisWalletAddress` |
| ⑥ Zero balance | `/demo/state/zero-balance` | `walletBalance=0` |

#### 페이지별 (백엔드 필드 확인용)

| 화면 | 바로가기 | 랜딩 | 필요한 정보 (요약) |
| --- | --- | --- | --- |
| KYC 시작 | `/demo/state/page-kyc-entry` | `/account/card-apply` | `PENDING` → submit → `UNDER_REVIEW` |
| Card Apply | `/demo/state/page-card-apply` | `/account/card-apply` | 신청 POST → `application_review` + 발급비 주소 |
| 발급비 $100 | `/demo/state/page-issuance-deposit` | `/account` | `issuanceDepositAddress`, amount |
| Shipping | `/demo/state/page-shipping` | `/account` | `trackingNumber`, `carrier` |
| Card Register | `/demo/state/page-card-register` | `/account/card-register` | 등록 POST → `active` + 개인지갑 |
| My Card | `/demo/state/page-my-card` | `/account/card` | `cards[]` (bin, last4, status) |
| Wallet Top Up | `/demo/state/page-wallet-topup` | `/account/topup` | `cregisWalletAddress`, balance |
| Top Up (잔액0) | `/demo/state/page-zero-topup` | `/account/topup` | `walletBalance=0` |
| Transactions | `/demo/state/page-transactions` | `/account/transactions` | `transactions[]` |
| Top-up History | `/demo/state/page-history` | `/account/history` | deposits / receives |
| Referral | `/demo/state/page-referral` | `/account/referral` | `referralCode`, stats |
| Settings | `/demo/state/page-settings` | `/account/settings` | profile / security prefs |

Preview 예: `http://localhost:5173/demo/states`