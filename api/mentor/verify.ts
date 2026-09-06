import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ detail: "Method not allowed" });
  }

  const raw = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const code = String(raw.code || "").trim().toUpperCase();

  if (code === "MLS-MENTOR-2026") {
    return res.status(200).json({ valid: true, level: "mentor", message: "Kode mentor valid." });
  }

  return res.status(401).json({ valid: false, detail: "Kode mentor tidak cocok." });
}
