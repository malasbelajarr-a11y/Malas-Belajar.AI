import crypto from "node:crypto";
import { supabaseConfigured, supabaseRequest } from "../_lib/supabase";
import { validMentorCode } from "../_lib/mentorBank";

const DRIVE_ROOT_ID = "1hUF0G01PZkzRcONhLFRAywGi_qD8AUds";
const SUBTESTS: Record<string, string[]> = {
  pu: ["pu", "penalaran umum"],
  ppu: ["ppu", "pengetahuan pemahaman umum", "pengetahuan & pemahaman umum"],
  pbm: ["pbm", "pemahaman bacaan", "pemahaman bacaan & menulis"],
  pk: ["pk", "pengetahuan kuantitatif"],
  lit_indo: ["lit indo", "literasi bahasa indonesia", "literasi indonesia"],
  lit_inggris: ["lit inggris", "literasi bahasa inggris", "literasi inggris"],
  pm: ["pm", "penalaran matematika"],
};

const clean = (v: unknown) => String(v ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function detectSubtest(name: string, inherited = "") {
  const n = clean(name);
  for (const [id, aliases] of Object.entries(SUBTESTS)) {
    if (aliases.some((alias) => n.includes(clean(alias)))) return id;
  }
  return inherited;
}

async function driveChildren(parent: string) {
  const key = String(process.env.GOOGLE_DRIVE_API_KEY || "").trim();
  if (!key) return [];
  const q = encodeURIComponent(`'${parent}' in parents and trashed = false`);
  const fields = encodeURIComponent("files(id,name,mimeType,webViewLink,webContentLink),nextPageToken");
  const all: any[] = [];
  let token = "";
  do {
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=1000&fields=${fields}&includeItemsFromAllDrives=true&supportsAllDrives=true&key=${encodeURIComponent(key)}${token ? `&pageToken=${encodeURIComponent(token)}` : ""}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Google Drive API ${r.status}`);
    const data = await r.json() as any;
    all.push(...(Array.isArray(data.files) ? data.files : []));
    token = String(data.nextPageToken || "");
  } while (token);
  return all;
}

async function getDriveResources() {
  if (!String(process.env.GOOGLE_DRIVE_API_KEY || "").trim()) return [];
  const out: any[] = [];
  async function walk(parent: string, inheritedSubtest = "", inheritedKind = "module") {
    for (const file of await driveChildren(parent)) {
      const name = String(file.name || "");
      const mime = String(file.mimeType || "");
      const subtest = detectSubtest(name, inheritedSubtest);
      if (mime === "application/vnd.google-apps.folder") {
        const folderName = clean(name);
        const kind = folderName.includes("video") ? "video" : inheritedKind;
        await walk(String(file.id), subtest, kind);
        continue;
      }
      if (!subtest) continue;
      out.push({
        id: `drive-${file.id}`,
        kind: inheritedKind === "video" || mime.startsWith("video/") ? "video" : "module",
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
  await walk(DRIVE_ROOT_ID);
  return out;
}

function parseBody(req: any) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();

  // STUDENT: this endpoint must ALWAYS return an array, even if one backend source fails.
  if (req.method === "GET") {
    const result: any[] = [];

    if (supabaseConfigured()) {
      try {
        const rows = await supabaseRequest<any[]>(
          "wacawaci_resources?select=*&order=created_at.desc"
        );
        for (const row of Array.isArray(rows) ? rows : []) {
          let meta: any = {};
          try { meta = JSON.parse(String(row.description || "")); } catch {}
          result.push({
            id: String(row.id),
            kind: String(row.kind || meta.kind || "module"),
            title: String(row.title || ""),
            description: String(meta.description || row.description || ""),
            url: String(row.url || ""),
            is_public: row.is_public !== false,
            created_by: String(row.created_by || ""),
            level: String(row.level || "nguli"),
            subtest: String(row.subtest || meta.subtest || ""),
            subbab: String(row.subbab || meta.subbab || ""),
            created_at: row.created_at,
          });
        }
      } catch (e) {
        console.error("WACAWACI_SUPABASE_GET", e);
      }
    }

    try {
      result.unshift(...await getDriveResources());
    } catch (e) {
      console.error("WACAWACI_DRIVE_GET", e);
    }

    return res.status(200).json(result);
  }

  const body = parseBody(req);
  const code = String(req.query?.mentor_code || body.mentor_code || body.code || "").trim().toUpperCase();
  if (!validMentorCode(code)) return res.status(401).json({ detail: "Kode mentor tidak cocok." });

  if (req.method === "DELETE") {
    const id = String(req.query?.id || body.id || "").trim();
    if (!id || !supabaseConfigured()) return res.status(400).json({ detail: "ID materi tidak valid atau database belum aktif." });
    await supabaseRequest(`wacawaci_resources?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
    return res.status(200).json({ ok: true, id });
  }

  if (req.method === "POST") {
    if (!supabaseConfigured()) return res.status(503).json({ detail: "Database Wacawaci belum tersambung." });
    const kind = String(body.kind || "module");
    const title = String(body.title || "").trim();
    const url = String(body.url || body.file_url || body.video_url || "").trim();
    const description = String(body.description || "").trim();
    const subtest = String(body.subtest || "pu");
    const subbab = String(body.subbab || "").trim();
    const level = String(body.level || "nguli");
    if (!title || !url) return res.status(400).json({ detail: "Judul dan link materi wajib diisi." });
    if (!Object.keys(SUBTESTS).includes(subtest)) return res.status(400).json({ detail: "Subtes Wacawaci tidak valid." });
    const resource = {
      id: `waca-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      kind, title, description, url, is_public: true,
      created_by: "Mentor Malas Belajar", level, subtest, subbab,
      created_at: new Date().toISOString(),
    };
    await supabaseRequest("wacawaci_resources", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ ...resource, description: JSON.stringify({ __mls_wacawaci: true, description, subtest, subbab }) }),
    });
    return res.status(201).json(resource);
  }

  return res.status(405).json({ detail: "Method not allowed" });
}
