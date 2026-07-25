# ALB API ↔ Dashboard UI Field Mapping

`VITE_API_MODE=http` 기준. DB 테이블은 이 문서 범위 밖(백엔드 repo / RDS 필요).

- Production: `https://anytap.io` · Member portal: `https://anytap.io/account` · Admin: `https://anytap.io/admin`
- Support: `support@anytap.io`
- Swagger: `http://anytap-alb-1199820250.ap-northeast-2.elb.amazonaws.com/swagger-ui/index.html`

---

## Auth

### `POST /auth/login` → `httpSession` (`sessionStorage`)

**요청:** `{ loginId, password }` — 스웨거상 `loginId`만 허용.

> **P0 백엔드 요청 (고객 로그인은 이메일만):**  
> - UI/고객은 **email + password** 만 사용. `loginId`는 가입 시 서버/클라이언트가 내부 발급하는 값이며 고객에게 노출하지 않음.  
> - `POST /auth/login`이 `{ email, password }` 를 받아 `Users.email`로 조회해 주세요.  
> - (호환) `loginId`에 `@`가 포함되면 `Users.email`로, 아니면 `Users.login_id`로 조회해도 됩니다.  
> - 프론트는 loginId를 이메일에서 **추측하지 않습니다.**


| API 응답                | 프론트 저장                        | UI 사용처                               |
| --------------------- | ----------------------------- | ------------------------------------ |
| `userId`              | `session.userId`              | API path, 카드/거래 조회 키                 |
| `email`               | `session.email`               | 헤더, 프로필, KYC 요청                      |
| `merchantId`          | `session.merchantId`          | (표시 안 함)                             |
| `cregisWalletAddress` | `session.cregisWalletAddress` | Wallet → Receive 주소, `wallet.exists` |
| `kycStatus`           | `session.kycStatus`           | KYC 배지, 카드 신청 게이트                    |
| (내부) `loginId`        | `session.loginId`             | 재로그인용 (이메일→loginId 매핑)               |


**미사용:** 없음 (응답 필드 전부 세션에 저장)

---

## Card info

### `GET /cards/{userId}/info` → `fetchAccountContext`


| API 응답                          | 매핑 (`accountApi.js`)                                             | UI          |
| ------------------------------- | ---------------------------------------------------------------- | ----------- |
| `balanceInfo.amount`            | `wallet.balanceUsdt`, `accountState.walletBalance`, 카드 `balance` | 지갑/카드 잔액 표시 |
| `cardNo` / `balanceInfo.cardNo` | `userCards[].last4`                                              | 카드 썸네일, 마스킹 |
| `status` (`Normal` 등)           | `userCards[].status` (`active`/`frozen`)                         | 카드 상태       |
| `blocked`                       | frozen 판별                                                        | 동결 UI       |
| `holderInfo.`*                  | **미사용**                                                          | —           |
| `cardBankBin`                   | **미사용**                                                          | —           |
| `cardTypeId`                    | 카드 존재 여부만                                                        | —           |


> 지갑 온체인 잔액은 Cregis API(`/cregis/`*)가 있으나 **아직 미연동**. 현재 잔액 숫자는 Wasabi 카드 잔액에서 가져옴.

---

## Card transactions (연동됨)

### `GET /cards/{userId}/transactions?pageNum&pageSize`

**응답 형식 (실측):**

```json
{ "total": 0, "records": [ /* Wasabi row */ ] }
```

**레코드 → Activity item (`wasabiMappers.js`):**


| Wasabi / API 필드 (우선순위)                               | Activity 필드                               | UI        |
| ---------------------------------------------------- | ----------------------------------------- | --------- |
| `tradeNo` / `transactionId` / `orderNo`              | `id`, `reference`                         | 거래 상세     |
| `merchantName` / `merchantData.name` / `description` | `title`                                   | 목록 제목     |
| `amount` / `authorizedAmount` / `settleAmount`       | `amount`                                  | 금액        |
| `transactionTime` (ms)                               | `at` (ISO)                                | 날짜/시간     |
| `type` (`auth`, `deposit`, `refund`…)                | `kind` (`card_spend`, `card_topup`, …)    | 필터 탭, 아이콘 |
| `status`                                             | `status` (`completed`/`pending`/`failed`) | 상태 배지     |
| `cardNo`                                             | `cardLast4`                               | 카드 필터     |


**UI 소비 경로:**

- `activityItems` → 대시보드 Recent activity (`account-dashboard-wallet-first.jsx`)
- `activityItems` → `/account/transactions` (`AccountCardTransactions.jsx`)
- `topUpHistory` → `kind === card_topup | wallet_topup` 만 필터

**미연동 API (백엔드에 존재):**

- `POST /webhooks/cregis` — 입금 시뮬 (test-dashboard)
- `POST /cregis/`* — 지갑 잔액·출금
- `GET /cards/{userId}/transactions` 외 wallet 거래 소스 없음 → Wallet 탭은 카드+입금류만

---

## KYC (Wasabi ID)

> 구 `POST /kyc/session` · `POST /kyc/complete` 는 **삭제됨** (404).

| 단계 | API | 프론트 |
|------|-----|--------|
| 서류 업로드 | `POST /files/upload?docType=PASSPORT\|ID_CARD\|SELFIE` (multipart `file`) | `apiUpload` → `fileId` |
| 회원 KYC·홀더 | `POST /cards/{userId}/register` `{ email, idFrontId, idBackId?, selfieId? }` | `submitKycApplication` |
| 임시회원 홀더 | `POST /auth/register-cardholder` (가입 **전** User_Temp만) | 가입 전 플로우용 (포털 미사용) |
| 반려 재제출 | `POST /users/{userId}/kyc/resubmit` | 반려 시 `submitKycApplication` |
| 반려 사유 | `GET /users/{userId}/kyc/rejection-reason` | (선택) |
| 회원 상태 갱신 | `GET /users/{userId}` | 제출 후 세션 패치 |

`SignUpRequest`에 `kycKey` 없음 — 가입은 `email` / `password` / `loginId` / `merchantId` 만.

---

## Sign-up flow


| 단계    | API                       | 저장 위치                             |
| ----- | ------------------------- | --------------------------------- |
| 인증 메일 | `send-verification-email` | 백엔드 `User_Temp` (Swagger 명시)      |
| 코드 확인 | `verify-code`             | 백엔드                               |
| 가입 완료 | `sign-up`                 | 백엔드 회원 DB (+ Cregis/Wasabi는 정책에 따름) |


---

## 브라우저만 (서버 DB 아님)


| 키                                      | 내용              |
| -------------------------------------- | --------------- |
| `sessionStorage.anytap_http_session`   | 로그인 프로필         |
| `sessionStorage.anytap_signup_pending` | 가입 인증 대기        |
| `localStorage.anytap_email_login_id`   | email → loginId |


---

## 코드 위치


| 역할                      | 파일                                                               |
| ----------------------- | ---------------------------------------------------------------- |
| HTTP 계정 로드              | `src/lib/services/account/accountApi.js`                         |
| Wasabi 거래 매핑            | `src/lib/services/account/wasabiMappers.js`                      |
| Activity 표시             | `src/lib/activity.js`, `src/components/account-transactions.jsx` |
| Mock fallback 차단 (http) | `resolvePortalActivityItems` in `activity.js`                    |


---

## 확인 방법

1. 로그인 후 DevTools → Network → `cards/.../info`, `cards/.../transactions`
2. [test-dashboard](http://anytap-alb-1199820250.ap-northeast-2.elb.amazonaws.com/views/test-dashboard.html) Step 7·9
3. 거래 없으면 `records: []` — 정상 (신규 계정). 카드 결제/입금 웹훅 후 재조회

