type Resource = {
  id: string;
  kind: string;
  title: string;
  description: string;
  url: string;
  is_public: boolean;
  created_by: string;
  level: string;
  subtest: string;
};

const MENTOR_CODE = "CECEKOKOMLS";
const validLevels = ["nguli", "mandor", "supervisor"];
const validKinds = ["video", "module"];
const validSubtests = ["pu", "ppu", "pbm", "pk", "lit_indo", "lit_inggris", "pm"];

// Fallback agar upload tetap berfungsi sebelum Supabase dihubungkan.
const memoryResources: Resource[] = [
  {
    id: "res-demo-pu",
    kind: "module",
    title: "Modul Penalaran Umum",
    description: "Materi dasar dan strategi cepat Penalaran Umum.",
    url: "https://example.com/modul-pu.pdf",
    is_public: true,
    created_by: "Mentor Malas Belajar",
    level: "nguli",
    subtest: "pu",
  },
];

function mentorCodeFrom(req: any, body?: any) {
  return String(req.query?.mentor_code || body?.mentor_code || body?.code || "").trim().toUpperCase();
}

function hasSupabase() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function supabaseRequest<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const url = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "");
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) throw new Error(body?.message || body?.hint || body?.details || body?.error || `Supabase request failed (${response.status})`);
  return body as T;
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method === "GET") {
      if (!hasSupabase()) return res.status(200).json(memoryResources);
      const rows = await supabaseRequest<Resource[]>("wacawaci_resources?select=id,kind,title,description,url,is_public,created_by,level,subtest&order=created_at.desc");
      return res.status(200).json(rows || []);
    }

    if (req.method === "DELETE") {
      if (mentorCodeFrom(req) !== MENTOR_CODE) return res.status(401).json({ detail: "Kode mentor tidak cocok." });
      const id = String(req.query?.id || req.body?.id || "").trim();
      if (!id) return res.status(400).json({ detail: "ID materi wajib diisi." });
      if (!hasSupabase()) {
        const index = memoryResources.findIndex((item) => item.id === id);
        if (index >= 0) memoryResources.splice(index, 1);
      } else {
        await supabaseRequest(`wacawaci_resources?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      }
      return res.status(200).json({ ok: true, id });
    }

    if (req.method !== "POST") return res.status(405).json({ detail: "Method not allowed" });
    let body: any = req.body || {};
    if (typeof body === "string") {
      try { body = JSON.parse(body || "{}"); } catch { body = {}; }
    }
    if (mentorCodeFrom(req, body) !== MENTOR_CODE) return res.status(401).json({ detail: "Kode mentor tidak cocok." });

    const level = validLevels.includes(body.level) ? body.level : "nguli";
    const kind = validKinds.includes(body.kind) ? body.kind : "module";
    const subtest = validSubtests.includes(body.subtest) ? body.subtest : "pu";
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const url = String(body.url || "").trim();
    if (!title) return res.status(400).json({ detail: "Judul materi wajib diisi." });
    if (!url) return res.status(400).json({ detail: "URL/file materi belum tersedia. Untuk file besar, gunakan URL Google Drive/YouTube." });

    const resource: Resource = {
      id: `res-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      kind,
      title,
      description,
      url,
      is_public: true,
      created_by: "Mentor Malas Belajar",
      level,
      subtest,
    };

    if (!hasSupabase()) {
      memoryResources.unshift(resource);
      return res.status(201).json(resource);
    }

    const inserted = await supabaseRequest<Resource[]>("wacawaci_resources", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(resource),
    });
    return res.status(201).json(Array.isArray(inserted) ? inserted[0] : inserted);
  } catch (error: any) {
    console.error("Wacawaci API error", error);
    return res.status(500).json({ detail: error?.message || "Gagal menyimpan materi Wacawaci." });
  }
}
