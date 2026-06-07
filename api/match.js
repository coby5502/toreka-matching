// Vercel 서버리스 프록시 (Edge Runtime)
// 브라우저 → /api/match → (X-API-Key 부착) → card.taba.asia/api/v1/match
// 마스터 카탈로그가 아니라 "본인 컬렉션 DB" 안에서 유사도 Top N 매칭.
// 멤버/시리즈 메타·절대 이미지 URL 이 응답 card 에 인라인이라 추가 조회 불필요.
// API 키는 Vercel 환경변수 CARD_API_KEY 에만 존재하고 클라이언트로 절대 노출되지 않음.
export const config = { runtime: "edge" };

const UPSTREAM = "https://card.taba.asia/api/v1/match";
const TOP_N = 3;

export default async function handler(req) {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const key = process.env.CARD_API_KEY;
  if (!key) return json({ error: "server misconfigured: CARD_API_KEY missing" }, 500);

  let image;
  try {
    const form = await req.formData();
    image = form.get("image");
  } catch {
    return json({ error: "invalid multipart body" }, 400);
  }
  if (!image) return json({ error: "image field required" }, 400);

  // 업스트림 호출 (일시적 502/503 대비 1회 재시도)
  let upstream;
  for (let attempt = 0; attempt < 2; attempt++) {
    const upstreamForm = new FormData();
    upstreamForm.append("image", image, image.name || "upload.jpg");
    upstreamForm.append("limit", String(TOP_N)); // limit 은 폼 필드
    try {
      upstream = await fetch(UPSTREAM, { method: "POST", headers: { "X-API-Key": key }, body: upstreamForm });
    } catch {
      if (attempt === 1) return json({ error: "upstream fetch failed" }, 502);
      continue;
    }
    if (upstream.status === 401 || upstream.status === 403) return json({ error: "unauthorized" }, 401);
    if (upstream.ok) break;
    if (attempt === 1) return json({ error: `upstream ${upstream.status}` }, 502);
    // 재시도 전 짧게 대기
    await new Promise((r) => setTimeout(r, 600));
  }

  const data = await upstream.json();

  const items = (data.items || []).slice(0, TOP_N).map((it, i) => {
    const c = it.card || {};
    const mem = c.member || {};
    return {
      rank: it.rank ?? i + 1,
      score: it.score,
      member: {
        key: mem.key || c.member_id || "",
        name_ko: mem.name_ko || "",
        name_ja: mem.name_ja || "",
        color: mem.color || "#FF4FD8",
      },
      series: { sku: c.series?.sku || c.item_code || "", kind: c.series?.kind || c.item_type || "", label: c.series?.label || "" },
      name: c.name || "",
      description: c.description || "",
      // 본인 컬렉션 사진 (이미 절대 URL)
      image_url: c.image_url || null,
      back_image_url: c.back_image_url || null,
      reference_image_url: c.reference_image_url || null,
      created_at: c.created_at || null,
    };
  });

  return json({ catalog_built: true, items }, 200);
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
