import { supabaseConfigured, supabaseRequest } from "../_lib/supabase";

const DRIVE_ROOT = "1hUF0G01PZkzRcONhLFRAywGi_qD8AUds";
const ALLOWED_KINDS = new Set(["video", "module", "pdf", "ringkasan", "cheatsheet", "rodi_material"]);
const SUBTESTS = [
  ["pu", ["pu", "penalaran umum"]],
  ["ppu", ["ppu", "pengetahuan & pemahaman umum", "pengetahuan pemahaman umum"]],
  ["pbm", ["pbm", "pemahaman bacaan", "pemahaman bacaan & menulis"]],
  ["pk", ["pk", "pengetahuan kuantitatif"]],
  ["lit_indo", ["literasi bahasa indonesia", "literasi indonesia"]],
  ["lit_inggris", ["literasi bahasa inggris", "literasi inggris"]],
  ["pm", ["pm", "penalaran matematika"]],
] as const;

function normalize(value: unknown) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function detectSubtest(name: unknown) {
  const n = normalize(name);
  const tokens = new Set(n.split(" ").filter(Boolean));
  for (const [id, aliases] of SUBTESTS) {
    for (const alias of aliases) {
      const a = normalize(alias);
      if (a.includes(" ") ? n.includes(a) : tokens.has(a)) return id;
    }
  }
  return "";
}

function decodeRow(row: any) {
  let description = String(row?.description || "");
  let subtest = String(row?.subtest || "");
  let subbab = String(row?.subbab || "");
  try {
    const meta = JSON.parse(description);
    if (meta && typeof meta === "object" && meta.__mls_wacawaci) {
      description = String(meta.description || "");
      subtest = String(meta.subtest || subtest);
      subbab = String(meta.subbab || subbab);
    }
  } catch {}
  return {
    id: String(row?.id || ""),
    kind: String(row?.kind || "module"),
    title: String(row?.title || "Materi Wacawaci"),
    description,
    url: String(row?.url || ""),
    is_public: Boolean(row?.is_public),
    created_by: String(row?.created_by || ""),
    level: String(row?.level || "nguli"),
    subtest,
    subbab,
    created_at: row?.created_at ? String(row.created_at) : undefined,
  };
}

async function fromSupabase() {
  if (!supabaseConfigured()) return [];
  const rows = await supabaseRequest<any[]>("wacawaci_resources?select=*&order=created_at.desc");
  return (Array.isArray(rows) ? rows : [])
    .map(decodeRow)
    .filter((r) => ALLOWED_KINDS.has(r.kind) && r.is_public !== false);
}

async function driveChildren(parent: string) {
  const key = String(process.env.GOOGLE_DRIVE_API_KEY || "").trim();
  if (!key) return [];
  const q = encodeURIComponent(`'${parent}' in parents and trashed = false`);
  const fields = encodeURIComponent("nextPageToken,files(id,name,mimeType,webViewLink,webContentLink)");
  const out: any[] = [];
  let pageToken = "";
  do {
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=1000&fields=${fields}&includeItemsFromAllDrives=true&supportsAllDrives=true&corpora=allDrives&key=${encodeURIComponent(key)}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Google Drive API ${response.status}`);
    const data = await response.json() as any;
    out.push(...(Array.isArray(data.files) ? data.files : []));
    pageToken = String(data.nextPageToken || "");
  } while (pageToken);
  return out;
}

async function fromDrive() {
  if (!String(process.env.GOOGLE_DRIVE_API_KEY || "").trim()) return [];
  const out: any[] = [];
  async function walk(parent: string, inheritedSubtest = "", inheritedKind = "") {
    const files = await driveChildren(parent);
    for (const file of files) {
      const name = String(file.name || "");
      const mime = String(file.mimeType || "");
      const subtest = detectSubtest(name) || inheritedSubtest;
      if (mime === "application/vnd.google-apps.folder") {
        const lower = normalize(name);
        const kind = lower.includes("video") ? "video" : (lower.includes("modul") || lower.includes("materi") || lower.includes("pdf") ? "module" : inheritedKind);
        await walk(String(file.id), subtest, kind);
      } else if (subtest) {
        const lower = normalize(name);
        const kind = lower.includes("video") || mime.startsWith("video/") || inheritedKind === "video" ? "video" : "module";
        out.push({
          id: `drive-${file.id}`,
          kind,
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
  }
  await walk(DRIVE_ROOT);
  return out;
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  if (req.method !== "GET") return res.status(405).json({ detail: "Method not allowed" });

  // Supabase is the primary source. Drive is an additional source and must never
  // make the student endpoint fail when Drive is temporarily unavailable.
  let stored: any[] = [];
  let drive: any[] = [];
  try { stored = await fromSupabase(); } catch (error) { console.error("WACAWACI_SUPABASE_GET_ERROR", error); }
  try { drive = await fromDrive(); } catch (error) { console.error("WACAWACI_DRIVE_GET_ERROR", error); }

  // Return a valid JSON array even if one external source is unavailable.
  return res.status(200).json([...drive, ...stored]);
}
