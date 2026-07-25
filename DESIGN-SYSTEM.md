# Anytap Design System

Vite + React · Red Hat Display/Text · Pretendard CJK · **custom CSS** (Tailwind 없음)

## 파일 구조

| 파일 | 역할 |
|------|------|
| **`src/styles/design-system.css`** | 토큰 단일 소스 (`:root` CSS 변수) |
| `src/styles/colors_and_type.css` | 폰트 로드, 베이스 타이포, `.t-*` 유틸 클래스 |
| `src/styles/styles.css` | 컴포넌트 BEM (`.btn`, `.hero`, `.dt` 등) |
| `src/styles/account.css` | 회원 포털 전용 스타일 |
| `src/components/ui.jsx` | Logo, Icon, PaymentCard, PayBrand |

**새 색·간격·radius 추가 시 → `design-system.css`만 수정**

---

## 브랜드 컬러

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--brand-primary` | `#FF5500` | CTA, 링크, 강조 |
| `--brand-primary-hover` | `#FF7733` | 버튼 hover |
| `--brand-primary-strong` | `#FF5500` | 밝은 배경 위 강조 텍스트 |
| `--brand-primary-pale` | `#FFF0EB` | 틴트 배경 |
| `--brand-primary-tint` | `#FFE4D9` | 보더, 그라데이션 |
| `--brand-secondary` | `#3B1B5E` | 다크 카드, 히어로 |
| `--brand-secondary-hover` | `#5A3480` | secondary hover |

레거시 별칭 (유효): `--anytap-orange`, `--anytap-orange-soft`, `--anytap-ink` 등

RGBA 글로우: `rgba(var(--brand-rgb), 0.25)`

---

## 뉴트럴 & 서피스

| 토큰 | 값 |
|------|-----|
| `--bg-canvas` | `#F8F6F4` |
| `--paper` | `#FFFFFF` |
| `--ink` / `--fg-default` | `#1A1A1A` |
| `--fg-muted` | `#6B6057` |
| `--fg-subtle` | `#A09790` |
| `--border-default` | `rgba(26,26,26,0.10)` |

---

## 타이포그래피

- **Display**: Red Hat Display (`--font-display`) — 헤드라인
- **Body**: Red Hat Text (`--font-sans`) — 15px / lh 1.55
- **CJK**: Pretendard (`--font-cjk`)
- **유틸**: `.t-display-lg`, `.t-h2`, `.t-body`, `.t-eyebrow` 등

---

## Radius

| Token | Size | Use |
|-------|------|-----|
| `--radius-btn` / `--radius-input` | 10px | Buttons, inputs |
| `--radius-panel` | 12px | Containers, panels |
| `--radius-card` | 16px | Cards, wallet artwork |
| `--radius-modal` | 18px | Modals |
| `--radius-sheet` | 20px | Bottom sheets |
| `--radius-pill` | 999px | Badges only |
| `--radius-full` | 50% | Avatars |

Scale aliases: `--radius-xs` 6px · `--radius-sm/md` 10px · `--radius-lg` 12px · `--radius-xl` 16px · `--radius-2xl` 20px

---

## 버튼 (`.btn`)

- `--radius-btn` (10px) — structured corners
- `btn--primary` — 다크 (`--anytap-ink`)
- `btn--accent` — 오렌지 CTA (`--brand-primary`)
- `btn--outline` · `btn--ghost`
- 크기: `btn--sm` · default · `btn--lg`

---

## 카드

- 기본: `--paper` + `--border-default` + `--shadow-md` + `--radius-card`
- 오렌지 강조: `--brand-primary` 배경
- 다크: `--brand-secondary` 배경

---

## 시맨틱

`--success-500` · `--warning-500` · `--danger-500`

---

## 규칙

- ❌ 구 앰버 팔레트 (`#e88828`, `#d6741a`) 사용 금지
- ❌ Tailwind / Next.js font import 금지
- ❌ 사각 버튼 금지 — pill 또는 토큰 radius
- ✅ CTA는 `--brand-primary` (#FF5500)
- ✅ `prefers-reduced-motion` 준수
- ✅ 새 UI는 `styles.css` 기존 BEM 클래스 우선 재사용

---

## Cursor AI 규칙

에이전트용 요약: `.cursor/rules/design-system.mdc`
