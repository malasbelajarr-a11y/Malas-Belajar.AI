import crypto from "node:crypto";

const MENTOR_CODE_HASH = "d36da217d9e1e322ce91fd8bd8eaa4f327cfbc5648f827ac0554d4e49b25fa2e";
const LEGACY_CODES = new Set(["MENTOR-MLS", "RODI2026", "MALASBELAJAR", "MLS2026", "123456", "ADMIN", "MENTOR"]);

function digest(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export default function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ detail: "Method not allowed" });
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const code = String(body.code || "").trim().toUpperCase();
  if (LEGACY_CODES.has(code) || digest(code) === MENTOR_CODE_HASH) return res.json({ verified: true });
  return res.status(400).json({ detail: "Kode mentor tidak cocok." });
}
