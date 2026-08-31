# Anytap Homepage (Omega)

React + Vite SPA migrated from the Claude-built static homepage.

> **작업 흐름·2트랙 가이드:** 저장소 루트 [`WORK.md`](../WORK.md)

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy (AWS Amplify)

이 프론트는 **AWS Amplify**로 배포한다. Vercel을 쓰지 않는다.

```powershell
.\deploy_amplify.ps1
```

- 앱: `anytap-front-1` (`ap-northeast-2`)
- 빌드: `npm run build` → `dist`
- SPA rewrite·API 프록시: Amplify custom rules (`/api/v1` → `https://api.anytap.io`)
- 응답 헤더: `customHttp.yml`
