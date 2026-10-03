import { supabaseConfigured, supabaseRequest } from "../_lib/supabase";

const DRIVE_ROOT = "1hUF0G01PZkzRcONhLFRAywGi_qD8AUds";

// Keep a small fallback so Wacawaci can render even if Vercel's
// Supabase environment variables are temporarily missing.
const FALLBACK = [
  { id: "seed-waca-1", kind: "module", title: "Kitab Rumus Cepat Kuantitatif & Penalaran Matematika UTBK 2026", description: "Rangkuman praktis formula esensial untuk latihan UTBK.", url: "https://example.com/kitab-pk-mls.pdf", is_public: true, created_by: "Mentor Koko", level: "nguli", subtest: "pk" },
  { id: "seed-waca-2", kind: "video", title: "Masterclass Jebakan PPU & PBM", description: "Strategi membedah kalimat dan bacaan secara cepat.", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", is_public: true, created_by: "Mentor Cece", level: "mandor", subtest: "ppu" },
  { id: "seed-waca-3", kind: "module", title: "Peta Konsep EYD V", description: "Aturan penting EYD V untuk latihan PBM.", url: "https://example.com/eyd-v-cheat.pdf", is_public: true, created_by: "Mentor Cece", level: "nguli", subtest: "lit_indo" },
  { id: "seed-waca-4", kind: "module", title: "IRT Decoded", description: "Ringkasan strategi memahami kesukaran dan daya pembeda butir.", url: "https://example.com/irt-decoded.pdf", is_public: true, created_by: "Tim Riset MLS", level: "supervisor", subtest: "pm" },
];

function clean(row: any) {
  return {
    id: String(row?.id ?? ""),
    kind: String(row?.kind ?? "module"),
    title: String(row?.title ?? "Materi Wacawaci"),
    description: String(row?.description ?? ""),
    url: String(row?.url ?? ""),
    is_public: row?.is_public !== false,
    created_by: String(row?.created_by ?? ""),
    level: String(row?.level ?? "nguli"),
    subtest: String(row?.subtest ?? ""),
    created_at: row?.created_at ? String(row.created_at) : undefined,
  };
}

async function getSupabase() {
  if (!supabaseConfigured()) return [];
  // IMPORTANT: wacawaci_resources has no "subbab" column.
  const rows = await supabaseRequest<any[]>(
    "wacawaci_resources?select=id,kind,title,description,url,is_public,created_by,level,subtest,created_at&order=created_at.desc"
  );
  return (Array.isArray(rows) ? rows : [])
    .map(clean)
    .filter((item) => item.is_public);
}

function normalize(value: unknown) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function detectSubtest(value: unknown) {
  const n = normalize(value);
  const aliases: Array<[string, string[]]> = [
    ["pu", ["pu", "penalaran umum"]],
    ["ppu", ["ppu", "pengetahuan pemahaman umum", "pengetahuan & pemahaman umum"]],
    ["pbm", ["pbm", "pemahaman bacaan", "pemahaman bacaan & menulis"]],
    ["pk", ["pk", "pengetahuan kuantitatif"]],
    ["lit_indo", ["literasi bahasa indonesia", "literasi indonesia"]],
    ["lit_inggris", ["literasi bahasa inggris", "literasi inggris"]],
    ["pm", ["pm", "penalaran matematika"]],
  ];
  for (const [id, names] of aliases) {
    if (names.some((name) => n.includes(normalize(name)))) return id;
  }
  return "";
}

async function getDrive() {
  const key = String(process.env.GOOGLE_DRIVE_API_KEY ?? "").trim();
  if (!key) return [];
  const result: any[] = [];

  async function walk(parent: string, inheritedSubtest = "", inheritedKind = "") {
    const q = encodeURIComponent(`'${parent}' in parents and trashed = false`);
    const fields = encodeURIComponent("nextPageToken,files(id,name,mimeType,webViewLink,webContentLink)");
    let pageToken = "";
    do {
      const url = "https://www.googleapis.com/drive/v3/files" +
        `?q=${q}&pageSize=1000&fields=${fields}&includeItemsFromAllDrives=true&supportsAllDrives=true&corpora=allDrives&key=${encodeURIComponent(key)}` +
        (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "");
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Drive ${response.status}`);
      const data = await response.json() as any;
      for (const file of Array.isArray(data.files) ? data.files : []) {
        const name = String(file.name ?? "");
        const mime = String(file.mimeType ?? "");
        const subtest = detectSubtest(name) || inheritedSubtest;
        if (mime === "application/vnd.google-apps.folder") {
          const kind = normalize(name).includes("video") ? "video" : inheritedKind;
          await walk(String(file.id), subtest, kind);
        } else if (subtest) {
          result.push({
            id: `drive-${file.id}`,
            kind: mime.startsWith("video/") || inheritedKind === "video" ? "video" : "module",
            title: name || "Materi Wacawaci",
            description: "Materi Google Drive",
            url: String(file.webViewLink || file.webContentLink || `https://drive.google.com/file/d/${file.id}/view`),
            is_public: true,
            created_by: "Google Drive",
            level: "all",
            subtest,
          });
        }
      }
      pageToken = String(data.nextPageToken ?? "");
    } while (pageToken);
  }

  await walk(DRIVE_ROOT);
  return result;
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ detail: "Method not allowed" });

  let stored: any[] = [];
  let drive: any[] = [];
  try { stored = await getSupabase(); } catch (error) { console.error("WACAWACI_SUPABASE_ERROR", error); }
  try { drive = await getDrive(); } catch (error) { console.error("WACAWACI_DRIVE_ERROR", error); }

  const dbItems = stored.length ? stored : FALLBACK;
  return res.status(200).json([...drive, ...dbItems]);
}
