import { generateAccessCode } from "../../src/lib/accessCode";

export default function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ detail: "Method not allowed" });

  let body: any = req.body || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body || "{}"); } catch { body = {}; }
  }

  const mentorCode = String(body.mentor_code || "").trim().toUpperCase();
  const validMentorCodes = ["CECEKOKOMLS"];
  if (!validMentorCodes.includes(mentorCode)) {
    return res.status(401).json({ detail: "Kode mentor tidak cocok." });
  }

  const level = ["nguli", "mandor", "supervisor"].includes(body.level)
    ? body.level
    : "nguli";
  const count = Math.min(20, Math.max(1, Number(body.count) || 3));

  const generated = Array.from({ length: count }, (_, i) => ({
    id: `code-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
    code: generateAccessCode(level),
    level,
    used: false,
    used_by: "",
  }));

  return res.status(200).json(generated);
}
