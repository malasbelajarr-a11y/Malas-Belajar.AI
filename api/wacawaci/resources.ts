import { supabaseConfigured, supabaseRequest } from "../_lib/supabase";

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
const DRIVE_ROOT_ID = "1i5nHtu10NXsPeOufGs1Q4cFwzmcyjvoS";
const DRIVE_API = "https://www.googleapis.com/drive/v3/files";

const memoryResources: Resource[] = [];

function mentorCodeFrom(req: any, body?: any) {
  return String(req.query?.mentor_code || body?.mentor_code || body?.code || "").trim().toUpperCase();
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[_()\-]+/g, " ").replace(/\s+/g, " ").trim();
}

function inferSubtest(path: string): string | null {
  const p = normalize(path);
  if (/literasi bahasa indonesia|(^| )lit indo( |$)/.test(p)) return "lit_indo";
  if (/literasi bahasa inggris|(^| )lit inggris( |$)/.test(p)) return "lit_inggris";
  if (/pengetahuan .*pemahaman umum|(^| )ppu( |$)/.test(p)) return "ppu";
  if (/pemahaman bacaan|pemahaman .*menulis|(^| )pbm( |$)/.test(p)) return "pbm";
  if (/pengetahuan kuantitatif|(^| )pk( |$)/.test(p)) return "pk";
  if (/penalaran matematika|(^| )pm( |$)/.test(p)) return "pm";
  if (/penalaran umum|(^| )pu( |$)/.test(p)) return "pu";
  return null;
}

function inferKind(path: string, mimeType: string): "video" | "module" | null {
  const p = normalize(path);
  if (/video|vidio/.test(p) || mimeType.startsWith("video/")) return "video";
  if (/modul|module|materi|pdf|document|docs/.test(p) || mimeType === "application/pdf" || mimeType.includes("document")) return "module";
  return null;
}

async function driveList(params: Record<string, string>) {
  const key = String(process.env.GOOGLE_DRIVE_API_KEY || "").trim();
  if (!key) return [];

  const all: any[] = [];
  let pageToken = "";
  do {
    const queryParams = new URLSearchParams({ ...params, pageSize: "100", ...(pageToken ? { pageToken } : {}), key });
    const response = await fetch(`${DRIVE_API}?${queryParams.toString()}`);
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Google Drive API gagal (${response.status}): ${text.slice(0, 300)}`);
    }
    const body = JSON.parse(text);
    if (Array.isArray(body.files)) all.push(...body.files);
    pageToken = String(body.nextPageToken || "");
  } while (pageToken);

  return all;
}

function dbResource(row: any): Resource {
  let description = String(row?.description || "");
  let subtest = "";
  try {
    const meta = JSON.parse(description);
    if (meta && typeof meta === "object" && meta.__mls_wacawaci) {
      description = String(meta.description || "");
      subtest = String(meta.subtest || "");
    }
  } catch {}
  return { id: String(row.id), kind: String(row.kind || "module"), title: String(row.title || ""), description, url: String(row.url || ""), is_public: Boolean(row.is_public), created_by: String(row.created_by || ""), level: String(row.level || "nguli"), subtest };
}

async function storedResources(): Promise<Resource[]> {
  if (!supabaseConfigured()) return [];
  const rows = await supabaseRequest<any[]>("wacawaci_resources?select=*&kind=in.(video,module,pdf,ringkasan,cheatsheet)&order=created_at.desc");
  return rows.map(dbResource);
}

async function driveResources(): Promise<Resource[]> {
  const key = String(process.env.GOOGLE_DRIVE_API_KEY || "").trim();
  if (!key) return [];

  const result: Resource[] = [];
  const seen = new Set<string>();
  const queue: Array<{ id: string; path: string }> = [{ id: DRIVE_ROOT_ID, path: "" }];

  while (queue.length) {
    const current = queue.shift()!;
    if (seen.has(current.id)) continue;
    seen.add(current.id);

    const children = await driveList({
      q: `'${current.id}' in parents and trashed = false`,
      fields: "nextPageToken,files(id,name,mimeType,webViewLink,parents)",
    });

    for (const item of children) {
      const itemPath = current.path ? `${current.path}/${item.name}` : item.name;
      if (item.mimeType === "application/vnd.google-apps.folder") {
        queue.push({ id: item.id, path: itemPath });
        continue;
      }

      const subtest = inferSubtest(itemPath);
      const kind = inferKind(itemPath, String(item.mimeType || ""));
      if (!subtest || !kind) continue;

      result.push({
        id: `drive-${item.id}`,
        kind,
        title: item.name,
        description: itemPath,
        url: item.webViewLink || `https://drive.google.com/open?id=${item.id}`,
        is_public: true,
        created_by: "Google Drive Wacawaci",
        level: "",
        subtest,
      });
    }
  }

  return result;
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method === "GET") {
      const stored = await storedResources();
      return res.status(200).json([...stored, ...(await driveResources()), ...memoryResources]);
    }

    if (req.method === "DELETE") {
      if (mentorCodeFrom(req) !== MENTOR_CODE) return res.status(401).json({ detail: "Kode mentor tidak cocok." });
      const id = String(req.query?.id || req.body?.id || "").trim();
      if (supabaseConfigured()) {
        await supabaseRequest(`wacawaci_resources?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
      }
      const index = memoryResources.findIndex((item) => item.id === id);
      if (index >= 0) memoryResources.splice(index, 1);
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
    if (!url) return res.status(400).json({ detail: "Masukkan link Google Drive/YouTube." });

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
    if (supabaseConfigured()) {
      await supabaseRequest("wacawaci_resources", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          id: resource.id,
          kind: resource.kind,
          title: resource.title,
          description: JSON.stringify({ __mls_wacawaci: true, description: resource.description, subtest: resource.subtest }),
          url: resource.url,
          is_public: resource.is_public,
          created_by: resource.created_by,
          level: resource.level,
        }),
      });
    } else {
      memoryResources.unshift(resource);
    }
    return res.status(201).json(resource);
  } catch (error: any) {
    console.error("Wacawaci API error", error);
    return res.status(500).json({ detail: error?.message || "Gagal membaca materi Wacawaci." });
  }
}
