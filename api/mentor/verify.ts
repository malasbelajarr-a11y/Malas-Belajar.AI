export default function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ detail: "Method not allowed" });
  }

  let raw: any = req.body || {};
  if (typeof raw === "string") {
    try { raw = JSON.parse(raw || "{}"); } catch { raw = {}; }
  }

  const code = String(raw.code || raw.mentor_code || "").trim().toUpperCase();
  const configured = "CECEKOKOMLS";

  if (code === configured) {
    return res.status(200).json({ valid: true, verified: true, level: "mentor", message: "Kode mentor valid." });
  }

  return res.status(401).json({ valid: false, verified: false, detail: "Kode mentor tidak cocok." });
}
