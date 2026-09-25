import crypto from "node:crypto";
import { supabaseConfigured, supabaseRequest } from "./_lib/supabase";
import { validMentorCode } from "./_lib/mentorBank";

const DRIVE_ROOT_ID = "1hUF0G01PZkzRcONhLFRAywGi_qD8AUds";
const WACA_KINDS = "video,module,pdf,ringkasan,cheatsheet,rodi_material";
const SUBTESTS = new Set(["pu","ppu","pbm","pk","lit_indo","lit_inggris","pm"]);
const KINDS = new Set(["video","module","pdf","ringkasan","cheatsheet","rodi_material"]);

const DRIVE_SUBTESTS: Array<[string,string[]]> = [
  ["pu",["pu","penalaran umum"]],
  ["ppu",["ppu","pengetahuan pemahaman umum","pengetahuan & pemahaman umum"]],
  ["pbm",["pbm","pemahaman bacaan","pemahaman bacaan & menulis"]],
  ["pk",["pk","pengetahuan kuantitatif"]],
  ["lit_indo",["literasi bahasa indonesia","literasi indonesia","literasi indo"]],
  ["lit_inggris",["literasi bahasa inggris","literasi inggris"]],
  ["pm",["pm","penalaran matematika"]],
];

function normalizeName(value: unknown) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
}

function detectSubtest(name: string) {
  const normalized = normalizeName(name);
  const tokens = new Set(normalized.split(" ").filter(Boolean));
  for (const [id, aliases] of DRIVE_SUBTESTS) {
    for (const alias of aliases) {
      const a = normalizeName(alias);
      if (a.includes(" ") ? normalized.includes(a) : tokens.has(a)) return id;
    }
  }
  return "";
}

function detectKind(name: string, mimeType: string, inherited: string) {
  const lower = normalizeName(name);
  if (lower.includes("video") || mimeType.startsWith("video/") || inherited === "video") return "video";
  return "module";
}

function bodyOf(req: any) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

async function listDriveChildren(parent: string) {
  const key = String(process.env.GOOGLE_DRIVE_API_KEY || "").trim();
  if (!key) return [];

  const q = encodeURIComponent("'" + parent + "' in parents and trashed = false");
  const fields = encodeURIComponent("nextPageToken,files(id,name,mimeType,webViewLink,webContentLink)");
  const out: any[] = [];
  let pageToken = "";

  do {
    const common =
      "q=" + q +
      "&pageSize=1000" +
      "&fields=" + fields +
      "&includeItemsFromAllDrives=true" +
      "&supportsAllDrives=true" +
      "&key=" + encodeURIComponent(key);

    let response = await fetch(
      "https://www.googleapis.com/drive/v3/files?" +
      common +
      (pageToken ? "&pageToken=" + encodeURIComponent(pageToken) : "")
    );

    if (!response.ok) {
      const firstStatus = response.status;
      response = await fetch(
        "https://www.googleapis.com/drive/v3/files?" +
        common +
        "&corpora=allDrives" +
        (pageToken ? "&pageToken=" + encodeURIComponent(pageToken) : "")
      );
      if (!response.ok) throw new Error("Google Drive API " + firstStatus + "/" + response.status);
    }

    const data = await response.json() as any;
    for (const file of Array.isArray(data.files) ? data.files : []) out.push(file);
    pageToken = String(data.nextPageToken || "");
  } while (pageToken);

  return out;
}

async function getDriveResources() {
  if (!String(process.env.GOOGLE_DRIVE_API_KEY || "").trim()) return [];

  const resources: any[] = [];

  async function walk(parent: string, inheritedSubtest = "", inheritedKind = "") {
    const files = await listDriveChildren(parent);

    for (const file of files) {
      const name = String(file.name || "");
      const mimeType = String(file.mimeType || "");
      const subtest = detectSubtest(name) || inheritedSubtest;

      if (mimeType === "application/vnd.google-apps.folder") {
        const lower = normalizeName(name);
        const kind =
          lower.includes("video") ? "video" :
          lower.includes("modul") || lower.includes("materi") || lower.includes("pdf") ? "module" :
          inheritedKind;
        await walk(String(file.id), subtest, kind);
        continue;
      }

      if (!subtest) continue;

      resources.push({
        id: "drive-" + String(file.id),
        kind: detectKind(name, mimeType, inheritedKind),
        title: name || "Materi Wacawaci",
        description: "Materi Google Drive",
        url: String(
          file.webViewLink ||
          file.webContentLink ||
          "https://drive.google.com/file/d/" + String(file.id) + "/view"
        ),
        is_public: true,
        created_by: "Google Drive",
        level: "all",
        subtest,
      });
    }
  }

  await walk(DRIVE_ROOT_ID);
  return resources;
}

function decodeStored(row: any) {
  let description = String(row?.description || "");
  let subtest = String(row?.subtest || "");
  let subbab = "";

  try {
    const meta = JSON.parse(description);
    if (meta && typeof meta === "object" && meta.__mls_wacawaci) {
      description = String(meta.description || "");
      subtest = String(meta.subtest || subtest);
      subbab = String(meta.subbab || "");
    }
  } catch {}

  return {
    id: String(row.id),
    kind: String(row.kind || "module"),
    title: String(row.title || ""),
    description,
    url: String(row.url || ""),
    is_public: Boolean(row.is_public),
    created_by: String(row.created_by || ""),
    level: String(row.level || "nguli"),
    subtest,
    subbab,
    created_at: row.created_at ? String(row.created_at) : undefined,
  };
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  if (req.method === "GET") {
    let stored: any[] = [];
    let drive: any[] = [];

    try {
      if (supabaseConfigured()) {
        const rows = await supabaseRequest<any[]>(
          "wacawaci_resources?kind=in.(" + WACA_KINDS + ")&select=*&order=created_at.desc"
        );
        stored = rows.map(decodeStored);
      }
    } catch (error) {
      console.error("WACAWACI_STORED_GET_ERROR", error);
    }

    try {
      drive = await getDriveResources();
    } catch (error) {
      console.error("WACAWACI_DRIVE_GET_ERROR", error);
    }

    return res.status(200).json([...drive, ...stored]);
  }

  const body = bodyOf(req);
  const mentorCode = req.query?.mentor_code || body.mentor_code || body.code;

  if (!validMentorCode(mentorCode)) {
    return res.status(401).json({ detail: "Kode mentor tidak cocok." });
  }

  if (req.method === "DELETE") {
    if (!supabaseConfigured()) {
      return res.status(500).json({ detail: "Penyimpanan Supabase belum aktif." });
    }

    const id = String(req.query?.id || body.id || "").trim();
    if (!id) return res.status(400).json({ detail: "ID materi wajib diisi." });

    await supabaseRequest(
      "wacawaci_resources?id=eq." + encodeURIComponent(id),
      { method: "DELETE" }
    );

    return res.status(200).json({ ok: true, id });
  }

  if (req.method === "POST") {
    if (!supabaseConfigured()) {
      return res.status(500).json({ detail: "Penyimpanan Supabase belum aktif." });
    }

    const kind = String(body.kind || "module");
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const url = String(body.url || body.file_url || body.video_url || "").trim();
    const level = String(body.level || "nguli");
    const subtest = String(body.subtest || "pu");
    const subbab = String(body.subbab || "").trim();

    if (!KINDS.has(kind)) return res.status(400).json({ detail: "Jenis materi Wacawaci tidak valid." });
    if (!SUBTESTS.has(subtest)) return res.status(400).json({ detail: "Subtes Wacawaci tidak valid." });
    if (!title) return res.status(400).json({ detail: "Judul materi wajib diisi." });
    if (!url && kind !== "rodi_material") return res.status(400).json({ detail: "Masukkan link atau file materi." });

    const resource = {
      id: "res-" + Date.now() + "-" + crypto.randomBytes(3).toString("hex"),
      kind,
      title,
      description,
      url,
      is_public: true,
      created_by: "Mentor Malas Belajar",
      level: ["nguli","mandor","supervisor"].includes(level) ? level : "nguli",
      subtest,
      subbab,
      created_at: new Date().toISOString(),
    };

    await supabaseRequest("wacawaci_resources", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        ...resource,
        description: JSON.stringify({
          __mls_wacawaci: true,
          description,
          subtest,
          subbab,
        }),
      }),
    });

    return res.status(201).json(resource);
  }

  return res.status(405).json({ detail: "Method not allowed" });
}
