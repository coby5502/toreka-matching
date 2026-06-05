// Vercel 서버리스 프록시 (Edge Runtime)
// 브라우저 → /api/match → (X-API-Key 부착) → card.taba.asia/api/identify
// 시세 조회 없는 가벼운 엔드포인트를 써서 빠름(≈4s) + 504 방지.
// 멤버 key 를 한글이름·컬러로, 상대 이미지경로를 절대 URL 로 보강해서 내려줌.
// API 키는 Vercel 환경변수 CARD_API_KEY 에만 존재하고 클라이언트로 절대 노출되지 않음.
export const config = { runtime: "edge" };

const BASE = "https://card.taba.asia";
const IDENTIFY = `${BASE}/api/identify`;
const MEMBERS = `${BASE}/api/members`;
const TOP_N = 3;

let _membersCache = null; // 워밍된 isolate 에서 재사용

async function getMembers(key) {
  if (_membersCache) return _membersCache;
  try {
    const r = await fetch(MEMBERS, { headers: { "X-API-Key": key } });
    if (!r.ok) return {};
    const list = await r.json();
    _membersCache = Object.fromEntries(list.map((m) => [m.key, m]));
    return _membersCache;
  } catch {
    return {};
  }
}

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

  const upstreamForm = new FormData();
  upstreamForm.append("image", image, image.name || "upload.jpg");

  let identify, members;
  try {
    [identify, members] = await Promise.all([
      fetch(IDENTIFY, { method: "POST", headers: { "X-API-Key": key }, body: upstreamForm }),
      getMembers(key),
    ]);
  } catch {
    return json({ error: "upstream fetch failed" }, 502);
  }

  if (!identify.ok) {
    return json({ error: `upstream ${identify.status}` }, identify.status === 401 ? 401 : 502);
  }

  const data = await identify.json();
  const matches = (data.matches || []).slice(0, TOP_N);

  const items = matches.map((m, i) => {
    const mem = members[m.member] || {};
    return {
      rank: i + 1,
      score: m.score,
      member: {
        key: m.member,
        name_ko: mem.name_ko || m.member,
        name_ja: mem.name_ja || "",
        color: mem.color || "#ec4899",
      },
      series: { sku: m.series_sku, label: m.series_label || "" },
      image_url: m.sample_url ? BASE + m.sample_url : null,
      source_url: m.source_url || null,
    };
  });

  return json({ catalog_built: data.catalog_built !== false, items }, 200);
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
