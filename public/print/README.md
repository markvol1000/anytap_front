# Anytap 3단 신용카드 안내서

인쇄용 3단 접지 안내서 시안입니다.

## 파일

- [`anytap-card-guide-trifold.html`](./anytap-card-guide-trifold.html) — 펼침면 + 겉면 시안

## 스펙

| 항목 | 값 |
|------|-----|
| 용지 | A4 Landscape (297 × 210mm) |
| 접지 | 3단 (패널 99 × 210mm) |
| 컬러 | Navy `#0F172A` · Orange `#FF5500` |
| 가운데 패널 | 좌측 카드 포켓(모서리 칼집 4곳) · 우측 안내 카피 |
| 카드 규격 | ISO ID-1 85.6 × 53.98mm |

## 인쇄

1. 브라우저에서 HTML 열기
2. 인쇄 → **A4 가로**, **여백 없음**, 배경 그래픽 켜기
3. 1페이지 = 펼침면(Inside), 2페이지 = 겉면(Outside)
4. 타발: 가운데 패널 카드 자리 **네 모서리 대각 칼집**

## 로컬 미리보기

```bash
# www 루트에서
npm run dev
# 또는 정적 파일
open public/print/anytap-card-guide-trifold.html
```

경로: `/print/anytap-card-guide-trifold.html`
