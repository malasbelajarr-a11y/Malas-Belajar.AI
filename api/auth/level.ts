import { accessCodeAlreadyUsed, findStudent, markAccessCodeUsed, publicStudent } from "../_lib/studentStore";

type Level = "nguli" | "mandor" | "supervisor";
const LEVEL_ORDER: Level[] = ["nguli", "mandor", "supervisor"];
const PREFIX: Record<string, Level> = { NGU: "nguli", MAN: "mandor", SPV: "supervisor" };

function verifyCode(raw: string): Level | null {
  const code = String(raw || "").trim().toUpperCase();
  const match = code.match(/^MLS-(NGU|MAN|SPV)-([0-9]{4})$/);
  if (match) return PREFIX[match[1]];
  const secure = code.match(/^MLS-(NGU|MAN|SPV)-[0-9A-Z]{6}-[0-9A-Z]{2}$/);
  return secure ? PREFIX[secure[1]] : null;
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "PATCH" && req.method !== "POST") return res.status(405).json({ detail: "Method not allowed" });
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const email = String(body.email || "").trim().toLowerCase();
    const accessCode = String(body.access_code || "").trim().toUpperCase();
    const targetLevel = body.level as Level;
    if (!email || !accessCode || !LEVEL_ORDER.includes(targetLevel)) return res.status(400).json({ detail: "Email, level, dan kode akses wajib diisi." });

    const student = await findStudent(email);
    if (!student) return res.status(404).json({ detail: "Akun siswa tidak ditemukan." });
    const codeLevel = verifyCode(accessCode);
    if (!codeLevel || LEVEL_ORDER.indexOf(codeLevel) !== LEVEL_ORDER.indexOf(targetLevel)) return res.status(401).json({ detail: "Kode akses tidak cocok dengan level tujuan." });
    if (LEVEL_ORDER.indexOf(targetLevel) <= LEVEL_ORDER.indexOf(student.level)) return res.status(400).json({ detail: "Kode ini hanya dipakai saat naik level." });
    if (await accessCodeAlreadyUsed(accessCode)) return res.status(409).json({ detail: "Kode akses ini sudah pernah dipakai." });

    const updated = await markAccessCodeUsed(student, accessCode, targetLevel);
    const token = encodeURIComponent(JSON.stringify(publicStudent(updated)));
    res.setHeader("Set-Cookie", `mls_session=${token}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax; Secure`);
    return res.json(publicStudent(updated));
  } catch (error) {
    console.error("AUTH_LEVEL_ERROR", error);
    return res.status(500).json({ detail: "Server gagal memperbarui level." });
  }
}
