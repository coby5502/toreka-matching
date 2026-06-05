# 닮은 토레카 찾기 💖

사진을 업로드하면 [Cutie Card](https://card.taba.asia) DB에서 가장 닮은 CUTIE STREET 토레카 **Top 3**를 보여주는 웹.

## 구조

- `index.html` — 단일 페이지 프론트엔드 (Tailwind CDN + 바닐라 JS)
- `api/match.js` — Vercel 서버리스 프록시 (Edge). API 키를 서버에 숨기고 `card.taba.asia/api/identify`(시세 조회 없는 가벼운 매칭) 호출 후, 멤버 한글이름·컬러·절대 이미지 URL 로 보강해서 Top 3 반환

브라우저는 같은 출처의 `/api/match`만 호출하므로 API 키가 클라이언트로 노출되지 않음.

## 배포 (Vercel)

1. 이 저장소를 Vercel에 import (Framework Preset: **Other**, 빌드 설정 없음)
2. 환경변수 추가: `CARD_API_KEY` = Cutie Card API 키
3. Deploy

## 로컬 실행

```bash
npm i -g vercel
vercel dev        # http://localhost:3000  (프록시 함수 포함)
```

> 환경변수 `CARD_API_KEY`가 있어야 매칭이 동작합니다 (`vercel env pull` 또는 `.env.local`).
