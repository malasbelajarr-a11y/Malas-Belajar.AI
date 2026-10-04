// Completely isolated student Wacawaci endpoint.
// It intentionally does not depend on the old Wacawaci router.
const fallback = [
  { id: "waca-pu", kind: "module", title: "Penalaran Umum (PU) — Materi", description: "Materi Wacawaci PU.", url: "https://example.com/wacawaci-pu", is_public: true, created_by: "Malas Belajar", level: "all", subtest: "pu" },
  { id: "waca-ppu", kind: "module", title: "Pengetahuan & Pemahaman Umum (PPU) — Materi", description: "Materi Wacawaci PPU.", url: "https://example.com/wacawaci-ppu", is_public: true, created_by: "Malas Belajar", level: "all", subtest: "ppu" },
  { id: "waca-pbm", kind: "module", title: "Pemahaman Bacaan & Menulis (PBM) — Materi", description: "Materi Wacawaci PBM.", url: "https://example.com/wacawaci-pbm", is_public: true, created_by: "Malas Belajar", level: "all", subtest: "pbm" },
  { id: "waca-pk", kind: "module", title: "Pengetahuan Kuantitatif (PK) — Materi", description: "Materi Wacawaci PK.", url: "https://example.com/wacawaci-pk", is_public: true, created_by: "Malas Belajar", level: "all", subtest: "pk" },
  { id: "waca-lit-indo", kind: "module", title: "Literasi Bahasa Indonesia — Materi", description: "Materi Wacawaci Literasi Bahasa Indonesia.", url: "https://example.com/wacawaci-lit-indo", is_public: true, created_by: "Malas Belajar", level: "all", subtest: "lit_indo" },
  { id: "waca-lit-inggris", kind: "module", title: "Literasi Bahasa Inggris — Materi", description: "Materi Wacawaci Literasi Bahasa Inggris.", url: "https://example.com/wacawaci-lit-inggris", is_public: true, created_by: "Malas Belajar", level: "all", subtest: "lit_inggris" },
  { id: "waca-pm", kind: "module", title: "Penalaran Matematika (PM) — Materi", description: "Materi Wacawaci PM.", url: "https://example.com/wacawaci-pm", is_public: true, created_by: "Malas Belajar", level: "all", subtest: "pm" },
];

function clean(row) {
  return {
    id: String(row?.id ?? ""),
    kind: String(row?.kind ?? "module"),
    title: String(row?.title ?? "Materi Wacawaci"),
    description: String(row?.description ?? ""),
    url: String(row?.url ?? ""),
    is_public: row?.is_public !== false,
    created_by: String(row?.created_by ?? ""),
    level: String(row?.level ?? "all"),
    subtest: String(row?.subtest ?? ""),
  };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  if (req.method !== "GET") return res.status(405).json({ detail: "Method not allowed" });

  const supabaseUrl = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "");

  if (supabaseUrl && serviceKey) {
    try {
      const response = await fetch(
        supabaseUrl + "/rest/v1/wacawaci_resources?select=id,kind,title,description,url,is_public,created_by,level,subtest,created_at&is_public=eq.true&order=created_at.desc",
        { headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey } }
      );
      if (response.ok) {
        const rows = await response.json();
        if (Array.isArray(rows) && rows.length) {
          return res.status(200).json(rows.map(clean));
        }
      }
    } catch (error) {
      console.error("ISOLATED_WACAWACI_SUPABASE_ERROR", error);
    }
  }

  return res.status(200).json(fallback);
}
