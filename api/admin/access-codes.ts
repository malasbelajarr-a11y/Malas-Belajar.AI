import crypto from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const LEGACY = new Set(["MENTOR-MLS","RODI2026","MALASBELAJAR","MLS2026","123456","ADMIN","MENTOR"]);
const MENTOR_CODE_HASH = "d36da217d9e1e322ce91fd8bd8eaa4f327cfbc5648f827ac0554d4e49b25fa2e";
function validMentorCode(v: unknown) {
  const c = String(v || "").trim().toUpperCase();
  return LEGACY.has(c) || crypto.createHash("sha256").update(c).digest("hex") === MENTOR_CODE_HASH;
}
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ detail: "Method tidak diizinkan." });
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  if (!validMentorCode(body.mentor_code)) return res.status(403).json({ detail: "Kode mentor tidak valid. Verifikasi mentor terlebih dahulu." });
  const level = String(body.level || "nguli").toLowerCase();
  if (!["nguli","mandor","supervisor"].includes(level)) return res.status(400).json({ detail: "Level tidak valid." });
  const count = Math.max(1, Math.min(50, Number(body.count) || 1));
  const prefix = level === "nguli" ? "NGU" : level === "mandor" ? "MAN" : "SPV";
  const out = Array.from({ length: count }, (_, i) => ({
    id: `code-${Date.now()}-${i}-${crypto.randomBytes(2).toString("hex")}`,
    code: `MLS-${prefix}-${crypto.randomInt(1000, 10000)}`,
    level,
    used: false,
    used_by: "",
  }));
  return res.status(200).json(out);
}
