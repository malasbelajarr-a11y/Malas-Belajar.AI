import { supabaseConfigured, supabaseRequest } from "../_lib/supabase";

const DRIVE_ROOT = "1hUF0G01PZkzRcONhLFRAywGi_qD8AUds";

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
    subbab: String(row?.subbab ?? ""),
    created_at: row?.created_at ? String(row.created_at) : undefined,
  };
}

async function getSupabase() {
  if (!supabaseConfigured()) return [];
  const rows = await supabaseRequest<any[]>(
    "wacawaci_resources?select=id,kind,title,description,url,is_public,created_by,level,subtest,subbab,created_at&order=created_at.desc"
  );
  return (Array.isArray(rows) ? rows : [])
    .map(clean)
    .filter((item) => item.is_public);
}

function normalize(value: unknown) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function subtestFromName(value: unknown) {
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
        `?q=${q}&pageSize=1000&fields=${fields}` +
        "&includeItemsFromAllDrives=true&supportsAllDrives=true&corpora=allDrives" +
        `&key=${encodeURIComponent(key)}` +
        (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "");

      const response = await fetch(url);
      if (!response.ok) throw new Error(`Drive ${response.status}`);
      const data = await response.json() as any;
      const files = Array.isArray(data.files) ? data.files : [];

      for (const file of files) {
        const name = String(file.name ?? "");
        const mime = String(file.mimeType ?? "");
        const subtest = subtestFromName(name) || inheritedSubtest;

        if (mime === "application/vnd.google-apps.folder") {
          const lower = normalize(name);
          const kind = lower.includes("video") ? "video" : inheritedKind;
          await walk(String(file.id), subtest, kind);
        } else if (subtest) {
          const kind = mime.startsWith("video/") || inheritedKind === "video" ? "video" : "module";
          result.push({
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

  let supabaseItems: any[] = [];
  let driveItems: any[] = [];

  try {
    supabaseItems = await getSupabase();
  } catch (error) {
    console.error("WACAWACI_SUPABASE_ERROR", error);
  }

  try {
    driveItems = await getDrive();
  } catch (error) {
    console.error("WACAWACI_DRIVE_ERROR", error);
  }

  return res.status(200).json([...driveItems, ...supabaseItems]);
}
