// Vercel 서버리스 프록시 (Edge Runtime)
// 브라우저 → /api/match → (X-API-Key 부착) → card.taba.asia/api/v1/match
// API 키는 Vercel 환경변수 CARD_API_KEY 에만 존재하고 클라이언트로 절대 노출되지 않음.
export const config = { runtime: "edge" };

const UPSTREAM = "https://card.taba.asia/api/v1/match";
const TOP_N = 3;

export default async function handler(req) {
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }

  const key = process.env.CARD_API_KEY;
  if (!key) {
    return json({ error: "server misconfigured: CARD_API_KEY missing" }, 500);
  }

  let image;
  try {
    const form = await req.formData();
    image = form.get("image");
  } catch (e) {
    return json({ error: "invalid multipart body" }, 400);
  }
  if (!image) {
    return json({ error: "image field required" }, 400);
  }

  const upstreamForm = new FormData();
  upstreamForm.append("image", image, image.name || "upload.jpg");
  upstreamForm.append("limit", String(TOP_N)); // limit 은 쿼리가 아니라 폼 필드로 받음

  let upstream;
  try {
    upstream = await fetch(UPSTREAM, {
      method: "POST",
      headers: { "X-API-Key": key },
      body: upstreamForm,
    });
  } catch (e) {
    return json({ error: "upstream fetch failed" }, 502);
  }

  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
