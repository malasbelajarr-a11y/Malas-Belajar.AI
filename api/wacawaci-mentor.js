import type { VercelRequest, VercelResponse } from "@vercel/node";

const DRIVE_ROOT = "1hUF0G01PZkzRcONhLFRAywGi_qD8AUds";

const ALIASES = [
  ["pu", ["pu", "penalaran umum"]],
  ["ppu", ["ppu", "pengetahuan pemahaman umum", "pengetahuan & pemahaman umum"]],
  ["pbm", ["pbm", "pemahaman bacaan", "pemahaman bacaan & menulis"]],
  ["pk", ["pk", "pengetahuan kuantitatif"]],
  ["lit_indo", ["literasi bahasa indonesia", "literasi indonesia"]],
  ["lit_inggris", ["literasi bahasa inggris", "literasi inggris"]],
  ["pm", ["pm", "penalaran matematika"]],
];

function normalize(value: unknown) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function detectSubtest(value: unknown) {
  const name = normalize(value);
  for (const [id, names] of ALIASES) {
    if (names.some((alias) => name.includes(normalize(alias)))) return id;
  }
  return "";
}

function jsonError(res: VercelResponse, status: number, detail: string) {
  return res.status(status).json({ ok: false, detail });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return jsonError(res, 405, "Method not allowed.");

  const key = String(process.env.GOOGLE_DRIVE_API_KEY ?? "").trim();
  if (!key) return jsonError(res, 500, "GOOGLE_DRIVE_API_KEY belum tersedia di Vercel.");

  const requestedSubtest = detectSubtest(req.query?.subtest);
  const requestedKind = normalize(req.query?.kind);
  const result: any[] = [];
  const visited = new Set<string>();

  async function walk(parent: string, inheritedSubtest = "", inheritedKind = "") {
    if (visited.has(parent)) return;
    visited.add(parent);

    const q = encodeURIComponent(`'${parent}' in parents and trashed = false`);
    const fields = encodeURIComponent(
      "nextPageToken,files(id,name,mimeType,webViewLink,webContentLink,createdTime,modifiedTime,size)"
    );

    let pageToken = "";
    do {
      const url =
        "https://www.googleapis.com/drive/v3/files" +
        `?q=${q}&pageSize=1000&fields=${fields}&orderBy=folder,name&includeItemsFromAllDrives=true&supportsAllDrives=true&corpora=allDrives&key=${encodeURIComponent(key)}` +
        (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "");

      const response = await fetch(url);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          String(data?.error?.message || `Google Drive API ${response.status}`)
        );
      }

      for (const file of Array.isArray(data?.files) ? data.files : []) {
        const id = String(file?.id ?? "");
        if (!id) continue;

        const name = String(file?.name ?? "Materi Wacawaci");
        const mime = String(file?.mimeType ?? "");
        const subtest = detectSubtest(name) || inheritedSubtest;

        if (mime === "application/vnd.google-apps.folder") {
          const folderKind = normalize(name).includes("video")
            ? "video"
            : inheritedKind;
          await walk(id, subtest, folderKind);
          continue;
        }

        if (!subtest) continue;

        const kind =
          mime.startsWith("video/") || inheritedKind === "video"
            ? "video"
            : "module";

        if (requestedSubtest && requestedSubtest !== subtest) continue;
        if (requestedKind && requestedKind !== kind) continue;

        result.push({
          id: `drive-${id}`,
          kind,
          title: name,
          description: "Materi Wacawaci dari Google Drive",
          url:
            String(file?.webViewLink || "") ||
            String(file?.webContentLink || "") ||
            `https://drive.google.com/file/d/${id}/view`,
          is_public: true,
          created_by: "Google Drive",
          level: "all",
          subtest,
          created_at: file?.createdTime ? String(file.createdTime) : undefined,
          updated_at: file?.modifiedTime ? String(file.modifiedTime) : undefined,
          size: file?.size ? Number(file.size) : undefined,
        });
      }

      pageToken = String(data?.nextPageToken ?? "");
    } while (pageToken);
  }

  try {
    await walk(DRIVE_ROOT);
    result.sort((a, b) => {
      const aa = String(a.updated_at || a.created_at || "");
      const bb = String(b.updated_at || b.created_at || "");
      return bb.localeCompare(aa);
    });

    return res.status(200).json({
      ok: true,
      source: "google-drive",
      count: result.length,
      resources: result,
    });
  } catch (error) {
    console.error("WACAWACI_MENTOR_DRIVE_ERROR", error);
    return jsonError(
      res,
      502,
      error instanceof Error ? error.message : "Google Drive gagal dibaca."
    );
  }
}
