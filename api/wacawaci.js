const ROOT = "1hUF0G01PZkzRcONhLFRAywGi_qD8AUds";
const DRIVE_FOLDER = "application/vnd.google-apps.folder";

const SUBTESTS = [
  ["pu", ["pu", "penalaran umum"]],
  ["ppu", ["ppu", "pengetahuan pemahaman umum", "pengetahuan dan pemahaman umum"]],
  ["pbm", ["pbm", "pemahaman bacaan", "pemahaman bacaan dan menulis"]],
  ["pk", ["pk", "pengetahuan kuantitatif"]],
  ["lit_indo", ["lit indo", "literasi bahasa indonesia", "literasi indonesia", "bahasa indonesia"]],
  ["lit_inggris", ["lit inggris", "literasi bahasa inggris", "literasi inggris", "bahasa inggris"]],
  ["pm", ["pm", "penalaran matematika"]],
];

const normalize = (value) =>
  String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function detectSubtest(name) {
  const n = normalize(name);
  for (const [id, aliases] of SUBTESTS) {
    for (const alias of aliases) {
      const a = normalize(alias);
      if (a && (n === a || n.includes(a) || n.split(" ").includes(a))) return id;
    }
  }
  return "";
}

function detectLevel(name, inherited = "all") {
  const n = normalize(name);
  if (n.includes("supervisor")) return "supervisor";
  if (n.includes("mandor")) return "mandor";
  if (n.includes("nguli")) return "nguli";
  return inherited || "all";
}

function publicFile(file, subtest, level, inheritedKind) {
  const mime = String(file.mimeType || "");
  const kind =
    mime.startsWith("video/") || inheritedKind === "video" ? "video" : "module";

  return {
    id: "drive-" + String(file.id),
    kind,
    title: String(file.name || "Materi Wacawaci"),
    description: "Materi Wacawaci dari Google Drive",
    url: String(
      file.webViewLink ||
        file.webContentLink ||
        "https://drive.google.com/file/d/" + file.id + "/view"
    ),
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

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, detail: "Method not allowed." });
  }

  const key = String(process.env.GOOGLE_DRIVE_API_KEY || "").trim();
  if (!key) {
    return res.status(500).json({
      ok: false,
      items: [],
      detail: "GOOGLE_DRIVE_API_KEY belum tersedia di Vercel.",
    });
  }

  const requestedLevel =
    ["nguli", "mandor", "supervisor"].includes(String(req.query?.level || ""))
      ? String(req.query.level)
      : "";

  const requestedSubtest = detectSubtest(req.query?.subtest);
  const items = [];
  const visited = new Set();

  async function listChildren(parentId) {
    let pageToken = "";
    const result = [];

    do {
      const q = encodeURIComponent(
        "'" + parentId + "' in parents and trashed = false"
      );
      const fields = encodeURIComponent(
        "nextPageToken,files(id,name,mimeType,webViewLink,webContentLink,createdTime,modifiedTime)"
      );

      const url =
        "https://www.googleapis.com/drive/v3/files" +
        "?q=" + q +
        "&pageSize=1000" +
        "&fields=" + fields +
        "&orderBy=folder,name" +
        "&includeItemsFromAllDrives=true" +
        "&supportsAllDrives=true" +
        "&corpora=allDrives" +
        "&key=" + encodeURIComponent(key) +
        (pageToken ? "&pageToken=" + encodeURIComponent(pageToken) : "");

      const response = await fetch(url);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          String(data?.error?.message || "Google Drive API " + response.status)
        );
      }

      result.push(...(Array.isArray(data?.files) ? data.files : []));
      pageToken = String(data?.nextPageToken || "");
    } while (pageToken);

    return result;
  }

  async function walk(parentId, inheritedSubtest = "", inheritedLevel = "all", inheritedKind = "") {
    if (visited.has(parentId)) return;
    visited.add(parentId);

    const files = await listChildren(parentId);

    for (const file of files) {
      const name = String(file.name || "");
      const mime = String(file.mimeType || "");
      const subtest = detectSubtest(name) || inheritedSubtest;
      const level = detectLevel(name, inheritedLevel);

      if (mime === DRIVE_FOLDER) {
        const folderKind = normalize(name).includes("video") ? "video" : inheritedKind;
        await walk(String(file.id), subtest, level, folderKind);
        continue;
      }

      if (!subtest) continue;
      if (requestedSubtest && requestedSubtest !== subtest) continue;
      if (requestedLevel && level !== "all" && level !== requestedLevel) continue;

      items.push(publicFile(file, subtest, level, inheritedKind));
    }
  }

  try {
    await walk(ROOT);

    const unique = new Map();
    for (const item of items) unique.set(item.id, item);

    return res.status(200).json({
      ok: true,
      drive_ok: true,
      root_folder: ROOT,
      items: [...unique.values()],
    });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Google Drive gagal dibaca.";

    console.error("WACAWACI_DRIVE_ERROR", detail);

    return res.status(502).json({
      ok: false,
      drive_ok: false,
      root_folder: ROOT,
      items: [],
      detail,
    });
  }
}
