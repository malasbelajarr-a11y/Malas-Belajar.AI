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

const resources: Resource[] = [
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

export default function handler(req: any, res: any) {
  if (req.method === "GET") return res.status(200).json(resources);

  if (req.method === "DELETE") {
    const mentorCode = String(req.query?.mentor_code || req.body?.mentor_code || req.body?.code || "").trim().toUpperCase();
    if (mentorCode !== "CECEKOKOMLS") return res.status(401).json({ detail: "Kode mentor tidak cocok." });
    const id = String(req.query?.id || req.body?.id || "").trim();
    const index = resources.findIndex((r) => r.id === id);
    if (index < 0) return res.status(404).json({ detail: "Materi tidak ditemukan." });
    const [deleted] = resources.splice(index, 1);
    return res.status(200).json({ ok: true, deleted });
  }

  if (req.method !== "POST") return res.status(405).json({ detail: "Method not allowed" });

  let body: any = req.body || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body || "{}"); } catch { body = {}; }
  }

  const mentorCode = String(body.mentor_code || body.code || "").trim().toUpperCase();
  if (mentorCode !== "CECEKOKOMLS") return res.status(401).json({ detail: "Kode mentor tidak cocok." });

  const validLevels = ["nguli", "mandor", "supervisor"];
  const validKinds = ["video", "module"];
  const validSubtests = ["pu", "ppu", "pbm", "pk", "lit_indo", "lit_inggris", "pm"];
  const level = validLevels.includes(body.level) ? body.level : "nguli";
  const kind = validKinds.includes(body.kind) ? body.kind : "module";
  const subtest = validSubtests.includes(body.subtest) ? body.subtest : "pu";

  const resource: Resource = {
    id: `res-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    title: String(body.title || "Materi Baru"),
    description: String(body.description || "Deskripsi materi pembelajaran"),
    url: String(body.url || "https://example.com"),
    is_public: true,
    created_by: "Mentor Malas Belajar",
    level,
    subtest,
  };

  resources.unshift(resource);
  return res.status(201).json(resource);
}
