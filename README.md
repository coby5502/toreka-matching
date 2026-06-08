# 닮은 토레카 찾기 💖

사진 한 장을 올리면 **본인 컬렉션 DB** 안에서 가장 닮은 CUTIE STREET 토레카 **Top 10**을 찾아주는 웹.

> 🌐 **Live** · <https://matching-liard.vercel.app>
> 🃏 데이터·매칭 엔진 제공 · [Cutie Card](https://card.taba.asia)

업로드 → 컬렉션에서 유사도 매칭 → Top 10 카드(점수순) → 카드를 탭하면 상세화면에서 앞/뒤 3D 플립으로 확인.

---

## ✨ 기능

- **이미지 매칭** — 사진 업로드(드래그&드롭 / 탭)하면 컬렉션에서 가장 닮은 카드 Top 10을 유사도 점수와 함께 표시
- **컬렉션 기반** — 마스터 카탈로그가 아니라 *내가 저장해 둔 카드*(`card.taba.asia` 컬렉션 DB)와 매칭
- **상세 + 3D 플립** — 결과 카드를 탭하면 상세화면으로. 큰 카드 이미지를 다시 탭하면 앞면 ↔ 뒷면이 뒤집힘
- **다국어 (한국어 / 日本語)** — 폰 언어 자동 감지 + 우상단 토글, 선택은 `localStorage`로 유지
- **Y2K 버블 키치 디자인** — 형광 그라데이션·스티커 보더·떠다니는 데코, 버블체 폰트(Jua / Mochiy Pop)
- **키 비노출** — API 키는 서버리스 프록시 환경변수에만 존재, 클라이언트로 절대 안 나감

## 🧱 구조

```
matching/
├─ index.html        # 단일 페이지 프론트엔드 (Tailwind CDN + 바닐라 JS, 빌드 없음)
└─ api/
   └─ match.js       # Vercel 서버리스 프록시 (Edge Runtime)
```

- **`index.html`** — 모든 UI·로직·다국어·스타일이 한 파일에. 브라우저는 같은 출처의 `/api/match`만 호출.
- **`api/match.js`** — `X-API-Key`를 붙여 `card.taba.asia/api/v1/match`(컬렉션 매칭)를 대신 호출하고, 응답 `items[].card`를 프론트가 쓰기 좋은 형태로 정규화해서 Top 10 반환. 멤버/시리즈 메타·이미지 URL이 응답에 인라인이라 추가 조회 없음. 일시적 5xx 대비 1회 재시도 포함.

## 🔄 데이터 흐름

```
[브라우저]  사진 업로드
    │  POST /api/match  (multipart, image)
    ▼
[Vercel Edge 프록시]  + X-API-Key (env: CARD_API_KEY)
    │  POST card.taba.asia/api/v1/match  (limit=10)
    ▼
[Cutie Card API]  컬렉션 임베딩과 코사인 유사도 → Top N
    │  items[].card (member/series/이미지/설명…)
    ▼
[프록시]  정규화 → { items: [{ rank, score, member, series, image_url, back_image_url, … }] }
    ▼
[브라우저]  Top 10 렌더 → 카드 탭 → 상세 + 앞/뒤 플립
```

CORS·키 노출 때문에 브라우저가 `card.taba.asia`를 직접 부르지 않고, **같은 출처의 프록시**를 거치는 게 핵심.

## 🔌 매칭 API 응답 형태 (`/api/match`)

```json
{
  "catalog_built": true,
  "items": [
    {
      "rank": 1,
      "score": 0.91,
      "member": { "key": "sano_aika", "name_ko": "사노 아이카", "name_ja": "佐野愛花", "color": "#E94B6A" },
      "series": { "sku": "CS-0170", "kind": "random", "label": "ver.7" },
      "name": "사노 아이카 · ver.7",
      "description": "CUTIE STREET 정규 · ver.7 · 사노 아이카 (佐野愛花)",
      "image_url": "https://card.taba.asia/api/collection/7/image",
      "back_image_url": "https://card.taba.asia/api/collection/7/back-image",
      "reference_image_url": "https://card.taba.asia/api/collection/7/reference-image",
      "created_at": "2026-05-15T09:00:00+00:00"
    }
  ]
}
```

## 🚀 배포 (Vercel)

1. 이 저장소를 Vercel에 import — **Framework Preset: Other**, 빌드 설정 없음(정적 + `/api` 함수 자동 인식)
2. 환경변수 추가: **`CARD_API_KEY`** = Cutie Card API 키
3. Deploy
4. (필요 시) Settings → Deployment Protection을 꺼서 공개 접근 허용

`main` 브랜치에 push하면 Vercel이 자동 재배포합니다.

## 💻 로컬 실행

```bash
npm i -g vercel
vercel link            # 최초 1회 (프로젝트 연결)
vercel env pull        # CARD_API_KEY 등 환경변수 받아오기 (.env.local)
vercel dev             # http://localhost:3000  (프록시 함수 포함)
```

> 정적 서버(`python -m http.server`)로는 `/api/match` 함수가 안 떠서 매칭이 동작하지 않아요. 매칭까지 보려면 `vercel dev`를 쓰세요.

## ⚙️ 환경변수

| 이름 | 필수 | 설명 |
|---|---|---|
| `CARD_API_KEY` | ✅ | Cutie Card 마스터 API 키. 프록시(`api/match.js`)에서만 사용, 클라이언트 비노출 |

## 🛠 기술

- 프론트엔드: 단일 HTML + 바닐라 JS, [Tailwind Play CDN](https://tailwindcss.com), 폰트 `Jua` · `Mochiy Pop One/P One`
- 백엔드(프록시): Vercel Edge Function (의존성 0)
- 매칭 엔진: [Cutie Card](https://card.taba.asia) (DINOv2-L + SigLIP-2 임베딩, 회전 TTA)

## 📝 참고

- 점수는 *컬렉션 안에서의 상대적 닮은 정도*예요. 똑같은 카드를 보유하고 있지 않으면 점수가 낮게(예: 50%대) 나올 수 있습니다.
- 컬렉션에 새 카드를 추가하면, 그 카드가 처음 매칭에 잡힐 때만 임베딩을 계산하느라 잠깐 느려질 수 있어요(이후 캐시됨).
