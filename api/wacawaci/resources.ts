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

const memoryResources: Resource[] = [];

function mentorCodeFrom(req: any, body?: any) {
  return String(req.query?.mentor_code || body?.mentor_code || body?.code || "").trim().toUpperCase();
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[_()\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferSubtest(path: string): string | null {
  const p = normalize(path);

  // Check the longer/specific names first so nothing gets swallowed by a shorter code.
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
  const query = new URLSearchParams({ ...params, key });
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${query.toString()}`);
  const text = await response.text();
  if (!response.ok) throw new Error(`Google Drive API gagal (${response.status}): ${text.slice(0, 300)}`);
  const body = JSON.parse(text);
  return Array.isArray(body.files) ? body.files : [];
}

async function driveResources(): Promise<Resource[]> {
  if (!process.env.GOOGLE_DRIVE_API_KEY) return [];

  const folders = await driveList({
    q: `'${DRIVE_ROOT_ID}' in parents and trashed = false`,
    pageSize: "100",
    fields: "files(id,name,mimeType,webViewLink,parents)",
  });

  const result: Resource[] = [];
  const queue = folders.map((item: any) => ({ id: item.id, name: item.name, path: item.name }));
  const seen = new Set<string>();

  while (queue.length) {
    const current = queue.shift()!;
    if (seen.has(current.id)) continue;
    seen.add(current.id);

    const children = await driveList({
      q: `'${current.id}' in parents and trashed = false`,
      pageSize: "100",
      fields: "files(id,name,mimeType,webViewLink,parents)",
    });

    for (const item of children) {
      const path = `${current.path}/${item.name}`;
      if (item.mimeType === "application/vnd.google-apps.folder") {
        queue.push({ id: item.id, name: item.name, path });
        continue;
      }

      const subtest = inferSubtest(path);
      const kind = inferKind(path, String(item.mimeType || ""));
      if (!subtest || !kind) continue;

      result.push({
        id: `drive-${item.id}`,
        kind,
        title: item.name,
        description: path,
        url: item.webViewLink || `https://drive.google.com/open?id=${item.id}`,
        is_public: true,
        created_by: "Google Drive Wacawaci",
        // Drive folder structure is subtest -> VIDEO/MODUL, not level-specific.
        // Leave level empty so every student's level can see the Drive material.
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
      const driveItems = await driveResources();
      return res.status(200).json([...driveItems, ...memoryResources]);
    }

    if (req.method === "DELETE") {
      if (mentorCodeFrom(req) !== MENTOR_CODE) return res.status(401).json({ detail: "Kode mentor tidak cocok." });
      const id = String(req.query?.id || req.body?.id || "").trim();
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
    memoryResources.unshift(resource);
    return res.status(201).json(resource);
  } catch (error: any) {
    console.error("Wacawaci API error", error);
    return res.status(500).json({ detail: error?.message || "Gagal membaca materi Wacawaci." });
  }
}
