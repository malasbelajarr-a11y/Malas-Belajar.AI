const ROOT = "1hUF0G01PZkzRcONhLFRAywGi_qD8AUds";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const SUBTESTS = [
  ["pu", ["pu", "penalaran umum"]],
  ["ppu", ["ppu", "pengetahuan pemahaman umum", "pengetahuan dan pemahaman umum"]],
  ["pbm", ["pbm", "pemahaman bacaan", "pemahaman bacaan dan menulis"]],
  ["pk", ["pk", "pengetahuan kuantitatif"]],
  ["lit_indo", ["lit indo", "literasi bahasa indonesia", "literasi indonesia"]],
  ["lit_inggris", ["lit inggris", "literasi bahasa inggris", "literasi inggris"]],
  ["pm", ["pm", "penalaran matematika"]],
];
const normalize = (v) => String(v ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
function detectSubtest(v) {
  const n = normalize(v);
  for (const [id, aliases] of SUBTESTS) {
    if (aliases.some((a) => { const x = normalize(a); return x && (n === x || n.includes(x)); })) return id;
  }
  return "";
}
function detectLevel(v, inherited = "all") {
  const n = normalize(v);
  if (n.includes("supervisor")) return "supervisor";
  if (n.includes("mandor")) return "mandor";
  if (n.includes("nguli")) return "nguli";
  return inherited || "all";
}
function makeResource(file, subtest, level, inheritedKind) {
  const id = String(file.id || "");
  const mime = String(file.mimeType || "");
  return {
    id: "drive-" + id,
    kind: mime.startsWith("video/") || inheritedKind === "video" ? "video" : "module",
    title: String(file.name || "Materi Wacawaci"),
    description: "Materi Wacawaci dari Google Drive",
    url: String(file.webViewLink || file.webContentLink || ("https://drive.google.com/file/d/" + id + "/view")),
    is_public: true,
    created_by: "Google Drive",
    level,
    subtest,
    created_at: file.createdTime || null,
    modified_at: file.modifiedTime || null,
  };
}
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ ok: false, items: [], detail: "Method not allowed." });

  const key = String(process.env.GOOGLE_DRIVE_API_KEY || "").trim();
  if (!key) return res.status(500).json({
    ok: false, drive_ok: false, items: [],
    detail: "GOOGLE_DRIVE_API_KEY belum tersedia di Vercel Production.",
  });

  const requestedLevel = ["nguli", "mandor", "supervisor"].includes(String(req.query?.level || ""))
    ? String(req.query.level) : "";
  const requestedSubtest = detectSubtest(req.query?.subtest);
  const requestedKind = ["module", "video"].includes(String(req.query?.kind || ""))
    ? String(req.query.kind) : "";

  const visited = new Set();
  const items = [];

  async function listChildren(parentId) {
    let pageToken = "";
    const all = [];
    do {
      const params = new URLSearchParams();
      params.set("q", "'" + parentId + "' in parents and trashed = false");
      params.set("pageSize", "1000");
      params.set("spaces", "drive");
      params.set("orderBy", "folder,name");
      params.set("includeItemsFromAllDrives", "true");
      params.set("supportsAllDrives", "true");
      params.set("fields", "nextPageToken,files(id,name,mimeType,webViewLink,webContentLink,createdTime,modifiedTime,size)");
      params.set("key", key);
      if (pageToken) params.set("pageToken", pageToken);

      const response = await fetch("https://www.googleapis.com/drive/v3/files?" + params.toString());
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(data?.error?.message || ("Google Drive API gagal (HTTP " + response.status + ").")));
      all.push(...(Array.isArray(data?.files) ? data.files : []));
      pageToken = String(data?.nextPageToken || "");
    } while (pageToken);
    return all;
  }

  async function walk(parentId, inheritedSubtest = "", inheritedLevel = "all", inheritedKind = "") {
    if (visited.has(parentId)) return;
    visited.add(parentId);
    for (const file of await listChildren(parentId)) {
      const name = String(file.name || "");
      const mime = String(file.mimeType || "");
      const subtest = detectSubtest(name) || inheritedSubtest;
      const level = detectLevel(name, inheritedLevel);

      if (mime === FOLDER_MIME) {
        const folderKind = normalize(name).includes("video") ? "video" : inheritedKind;
        await walk(String(file.id), subtest, level, folderKind);
        continue;
      }
      if (!subtest) continue;
      if (requestedSubtest && requestedSubtest !== subtest) continue;
      if (requestedLevel && level !== "all" && level !== requestedLevel) continue;

      const resource = makeResource(file, subtest, level, inheritedKind);
      if (requestedKind && resource.kind !== requestedKind) continue;
      items.push(resource);
    }
  }

  try {
    await walk(ROOT);
    const unique = new Map();
    for (const item of items) unique.set(item.id, item);
    const result = [...unique.values()].sort((a, b) =>
      String(b.modified_at || b.created_at || "").localeCompare(String(a.modified_at || a.created_at || ""))
    );
    return res.status(200).json({
      ok: true, drive_ok: true, source: "google-drive",
      root_folder: ROOT, count: result.length, items: result,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Google Drive gagal dibaca.";
    console.error("WACAWACI_DRIVE_ERROR", detail);
    return res.status(502).json({
      ok: false, drive_ok: false, source: "google-drive",
      root_folder: ROOT, count: 0, items: [], detail,
    });
  }
}
