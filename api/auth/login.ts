import { findStudent, passwordMatches, publicStudent } from "../_lib/studentStore";

function setStudentCookie(res: any, student: any) {
  const token = encodeURIComponent(JSON.stringify(publicStudent(student)));
  res.setHeader("Set-Cookie", `mls_session=${token}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax; Secure`);
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") return res.status(405).json({ detail: "Method not allowed" });
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email || !password) return res.status(400).json({ detail: "Email dan password wajib diisi." });

    const student = await findStudent(email);
    if (!student) return res.status(401).json({ detail: "Email belum terdaftar. Silakan daftar terlebih dahulu." });
    if (!student.active) return res.status(403).json({ detail: "Akun kamu sedang dinonaktifkan." });
    if (!passwordMatches(student, password)) return res.status(401).json({ detail: "Password salah." });

    setStudentCookie(res, student);
    return res.json(publicStudent(student));
  } catch (error) {
    console.error("AUTH_LOGIN_ERROR", error);
    return res.status(500).json({ detail: "Server gagal memproses login." });
  }
}
