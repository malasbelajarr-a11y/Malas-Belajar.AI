import app from "../server";
import {
  accessCodeAlreadyUsed,
  findStudent,
  listStudents,
  markAccessCodeUsed,
  passwordMatches,
  publicStudent,
  saveStudent,
  setStudentActive,
} from "./_lib/studentStore";

function setStudentCookie(res: any, student: any) {
  res.setHeader("Set-Cookie", `mls_session=${encodeURIComponent(student.id)}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax; Secure`);
}

function clearStudentCookie(res: any) {
  res.setHeader("Set-Cookie", "mls_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure");
}

function bodyOf(req: any) {
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body || "{}"); } catch { return {}; }
  }
  return req.body || {};
}

function cleanLevel(value: any) {
  return ["nguli", "mandor", "supervisor"].includes(value) ? value : null;
}

function validAccessCode(code: any) {
  const value = String(code || "").trim().toUpperCase();
  return /^MLS-(NGU|MAN|SPV)-[0-9]{4}$/.test(value) || /^MLS-(NGU|MAN|SPV)-[A-Z0-9]{6}-[A-Z0-9]{2}$/.test(value) || ["NGULI-MLS", "MANDOR-MLS", "SPV-MLS", "MLS2026", "MLS-NGU-9921"].includes(value);
}

function codeLevel(code: string) {
  const value = code.toUpperCase();
  if (value.includes("MAN") || value.includes("MANDOR")) return "mandor";
  if (value.includes("SPV") || value.includes("SUPERVISOR")) return "supervisor";
  return "nguli";
}

export default async function handler(req: any, res: any) {
  // Vercel may strip the /api prefix before invoking a catch-all function.
  // Normalize it so the existing Express routes and auth handlers see the same path.
  const rawUrl = String(req.url || "/");
  const normalizedUrl = rawUrl.startsWith("/api/") || rawUrl === "/api" ? rawUrl : `/api${rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`}`;
  req.url = normalizedUrl;
  const url = normalizedUrl.split("?")[0].replace(/\/+$/, "") || "/";

  // Student auth is handled here so registration, login, and mentor student-list
  // all use the same persistent store and do not become separate Vercel functions.
  if (url === "/api/auth/register" && req.method === "POST") {
    try {
      const body = bodyOf(req);
      const name = String(body.name || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const accessCode = String(body.access_code || "").trim().toUpperCase();
      if (!name || !email || !password || !accessCode) return res.status(400).json({ detail: "Nama, email, password, dan kode akses wajib diisi." });
      if (password.length < 6) return res.status(400).json({ detail: "Password minimal 6 karakter." });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ detail: "Format email tidak valid." });
      if (!validAccessCode(accessCode)) return res.status(400).json({ detail: "Kode akses tidak valid." });
      if (await findStudent(email)) return res.status(409).json({ detail: "Email sudah terdaftar. Silakan login dengan password yang kamu buat." });
      if (await accessCodeAlreadyUsed(accessCode)) return res.status(409).json({ detail: "Kode akses ini sudah pernah digunakan." });

      const level = codeLevel(accessCode) as any;
      const student = await saveStudent({ name, email, level, password, accessCode });
      setStudentCookie(res, student);
      return res.status(201).json(publicStudent(student));
    } catch (error) {
      console.error("AUTH_REGISTER_ERROR", error);
      return res.status(500).json({ detail: "Server gagal menyimpan pendaftaran." });
    }
  }

  if (url === "/api/auth/login" && req.method === "POST") {
    try {
      const body = bodyOf(req);
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

  if (url === "/api/auth/me" && req.method === "GET") {
    try {
      const token = String(req.headers["x-mls-session"] || "").trim() || String(req.cookies?.mls_session || "").trim();
      const student = token ? await findStudent(decodeURIComponent(token)) : null;
      return res.json(student ? publicStudent(student) : null);
    } catch {
      return res.json(null);
    }
  }

  if (url === "/api/auth/logout" && req.method === "POST") {
    clearStudentCookie(res);
    return res.json({ ok: true });
  }

  if (url === "/api/auth/level" && (req.method === "POST" || req.method === "PATCH")) {
    try {
      const body = bodyOf(req);
      const email = String(body.email || "").trim().toLowerCase();
      const targetLevel = cleanLevel(body.level);
      const accessCode = String(body.access_code || body.code || "").trim().toUpperCase();
      if (!email || !targetLevel || !accessCode) return res.status(400).json({ detail: "Email, level tujuan, dan kode akses wajib diisi." });
      if (!validAccessCode(accessCode)) return res.status(400).json({ detail: "Kode akses tidak valid." });
      if (codeLevel(accessCode) !== targetLevel) return res.status(400).json({ detail: "Kode akses tidak sesuai dengan level tujuan." });
      const student = await findStudent(email);
      if (!student) return res.status(404).json({ detail: "Akun siswa tidak ditemukan." });
      const rank = { nguli: 1, mandor: 2, supervisor: 3 };
      if (rank[targetLevel as keyof typeof rank] <= rank[student.level]) return res.status(400).json({ detail: "Level tujuan harus lebih tinggi dari level saat ini." });
      if (await accessCodeAlreadyUsed(accessCode)) return res.status(409).json({ detail: "Kode akses ini sudah pernah digunakan." });
      const updated = await markAccessCodeUsed(student, accessCode, targetLevel as any);
      setStudentCookie(res, updated);
      return res.json(publicStudent(updated));
    } catch (error) {
      console.error("AUTH_LEVEL_ERROR", error);
      return res.status(500).json({ detail: "Server gagal menaikkan level." });
    }
  }

  if (url === "/api/admin/students" && req.method === "GET") {
    try { return res.json((await listStudents()).map(publicStudent)); }
    catch (error) { console.error("ADMIN_STUDENTS_ERROR", error); return res.status(500).json({ detail: "Gagal memuat data siswa." }); }
  }

  const studentPatch = url.match(/^\/api\/admin\/students\/([^/]+)$/);
  if (studentPatch && req.method === "PATCH") {
    try {
      const id = decodeURIComponent(studentPatch[1]);
      const students = await listStudents();
      const student = students.find((item) => item.id === id);
      if (!student) return res.status(404).json({ detail: "Siswa tidak ditemukan." });
      const body = bodyOf(req);
      const updated = await setStudentActive(student, Boolean(body.active));
      return res.json(publicStudent(updated));
    } catch (error) { console.error("ADMIN_STUDENT_PATCH_ERROR", error); return res.status(500).json({ detail: "Gagal memperbarui akun siswa." }); }
  }

  return app(req, res);
}
