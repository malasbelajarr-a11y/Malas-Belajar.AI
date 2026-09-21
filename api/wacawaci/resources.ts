import crypto from "node:crypto";
import { supabaseConfigured, supabaseRequest } from "../_lib/supabase";

const DRIVE_ROOT_ID = "1hUF0G01PZkzRcONhLFRAywGi_qD8AUds";
const WACA_KINDS = "video,module,pdf,ringkasan,cheatsheet,rodi_material";

const DRIVE_SUBTESTS: Array<[string, string[]]> = [
  ["pu", ["pu", "penalaran umum"]],
  ["ppu", ["ppu", "pengetahuan pemahaman umum", "pengetahuan & pemahaman umum"]],
  ["pbm", ["pbm", "pemahaman bacaan", "pemahaman bacaan & menulis"]],
  ["pk", ["pk", "pengetahuan kuantitatif"]],
  ["lit_indo", ["literasi bahasa indonesia", "literasi indonesia", "literasi indo"]],
  ["lit_inggris", ["literasi bahasa inggris", "literasi inggris"]],
  ["pm", ["pm", "penalaran matematika"]],
];

function normalizeName(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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

const MENTOR_CODE_HASH = "d36da217d9e1e322ce91fd8bd8eaa4f327cfbc5648f827ac0554d4e49b25fa2e";
const LEGACY_MENTOR_CODES = new Set([
  "MENTOR-MLS", "RODI2026", "MALASBELAJAR", "MLS2026", "123456", "ADMIN", "MENTOR",
]);

function validMentorCode(value: unknown) {
  const code = String(value || "").trim().toUpperCase();
  return LEGACY_MENTOR_CODES.has(code) ||
    crypto.createHash("sha256").update(code).digest("hex") === MENTOR_CODE_HASH;
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

    let response = await fetch("https://www.googleapis.com/drive/v3/files?" + common + (pageToken ? "&pageToken=" + encodeURIComponent(pageToken) : ""));
    if (!response.ok) {
      const firstStatus = response.status;
      response = await fetch(
        "https://www.googleapis.com/drive/v3/files?" +
        common +
        "&corpora=allDrives" +
        (pageToken ? "&pageToken=" + encodeURIComponent(pageToken) : ""),
      );
      if (!response.ok) throw new Error("Google Drive API " + firstStatus + "/" + response.status);
    }

    const body = await response.json() as any;
    for (const file of Array.isArray(body.files) ? body.files : []) out.push(file);
    pageToken = String(body.nextPageToken || "");
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
  };
}

export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    let stored: any[] = [];
    try {
      if (supabaseConfigured()) {
        const rows = await supabaseRequest<any[]>(
          "wacawaci_resources?kind=in.(" + WACA_KINDS + ")&select=*&order=created_at.desc",
        );
        stored = rows.map(decodeStored);
      }
    } catch (error) {
      console.error("WACAWACI_STORED_GET_ERROR", error);
    }

    let drive: any[] = [];
    try {
      drive = await getDriveResources();
    } catch (error) {
      console.error("WACAWACI_DRIVE_GET_ERROR", error);
    }

    return res.status(200).json([...drive, ...stored]);
  }

  const body = bodyOf(req);
  const mentorCode = req.query?.mentor_code || body.mentor_code;

  if (!validMentorCode(mentorCode)) {
    return res.status(401).json({ detail: "Kode mentor tidak cocok." });
  }

  if (req.method === "DELETE") {
    if (!supabaseConfigured()) {
      return res.status(500).json({ detail: "Penyimpanan Supabase belum aktif." });
    }
    const id = String(req.query?.id || body.id || "").trim();
    await supabaseRequest(
      "wacawaci_resources?id=eq." + encodeURIComponent(id),
      { method: "DELETE" },
    );
    return res.status(200).json({ ok: true, id });
  }

  if (req.method === "POST") {
    if (!supabaseConfigured()) {
      return res.status(500).json({ detail: "Penyimpanan Supabase belum aktif." });
    }

    const allowed = ["video", "module", "pdf", "ringkasan", "cheatsheet", "rodi_material"];
    const kind = allowed.includes(String(body.kind)) ? String(body.kind) : "module";
    const title = String(body.title || "").trim();
    const url = String(body.url || "").trim();

    if (!title) return res.status(400).json({ detail: "Judul materi wajib diisi." });
    if (!url && kind !== "rodi_material") {
      return res.status(400).json({ detail: "Masukkan link atau file materi." });
    }

    const resource = {
      id: "res-" + Date.now() + "-" + crypto.randomBytes(3).toString("hex"),
      kind,
      title,
      description: String(body.description || "").trim(),
      url,
      is_public: true,
      created_by: "Mentor Malas Belajar",
      level: ["nguli", "mandor", "supervisor"].includes(String(body.level)) ? String(body.level) : "nguli",
      subtest: String(body.subtest || "pu"),
      subbab: String(body.subbab || ""),
    };

    await supabaseRequest("wacawaci_resources", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        id: resource.id,
        kind: resource.kind,
        title: resource.title,
        description: JSON.stringify({
          __mls_wacawaci: true,
          description: resource.description,
          subtest: resource.subtest,
          subbab: resource.subbab,
        }),
        url: resource.url,
        is_public: true,
        created_by: resource.created_by,
        level: resource.level,
      }),
    });

    return res.status(201).json(resource);
  }

  return res.status(405).json({ detail: "Method not allowed" });
}
