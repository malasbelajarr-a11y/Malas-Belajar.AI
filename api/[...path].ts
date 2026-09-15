import app from "../server";
import crypto from "node:crypto";
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

type Level = "nguli" | "mandor" | "supervisor";
const generatedCodes = new Map<string, { level: Level; used: boolean; used_by: string }>();
const seedCodes: Array<[string, Level]> = [["NGULI-MLS", "nguli"], ["MLS2026", "nguli"], ["MLS-NGU-9921", "nguli"], ["MANDOR-MLS", "mandor"], ["SPV-MLS", "supervisor"]];
for (const [code, level] of seedCodes) generatedCodes.set(code, { level, used: false, used_by: "" });

function bodyOf(req: any): any {
  if (!req.body) return {};
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch { return {}; } }
  return req.body;
}
function levelFromCode(code: string): Level | null {
  const normalized = String(code || "").trim().toUpperCase();
  const saved = generatedCodes.get(normalized);
  if (saved) return saved.level;
  if (/^MLS-NGU-\d{4}$/.test(normalized)) return "nguli";
  if (/^MLS-MAN-\d{4}$/.test(normalized)) return "mandor";
  if (/^MLS-SPV-\d{4}$/.test(normalized)) return "supervisor";
  return null;
}
function setCookie(res: any, student: any) {
  const token = encodeURIComponent(JSON.stringify(publicStudent(student)));
  res.setHeader("Set-Cookie", `mls_session=${token}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax; Secure`);
}
function readSession(req: any): any | null {
  const match = String(req.headers?.cookie || "").match(/(?:^|;\s*)mls_session=([^;]+)/);
  if (!match) return null;
  try { return JSON.parse(decodeURIComponent(match[1])); } catch { return null; }
}

async function auth(req: any, res: any, path: string) {
  const body = bodyOf(req);
  if (path === "/api/auth/me" && req.method === "GET") {
    const session = readSession(req);
    if (!session?.id) return res.status(200).json(null);
    const student = (await listStudents()).find((s) => s.id === String(session.id));
    return res.status(200).json(student ? publicStudent(student) : session);
  }
  if (path === "/api/auth/logout" && req.method === "POST") {
    res.setHeader("Set-Cookie", "mls_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure");
    return res.status(200).json({ ok: true });
  }
  if (path === "/api/auth/register" && req.method === "POST") {
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const code = String(body.access_code || "").trim().toUpperCase();
    if (!name || !email || !password || !code) return res.status(400).json({ detail: "Nama, email, password, dan kode akses wajib diisi." });
    if (password.length < 6) return res.status(400).json({ detail: "Password minimal 6 karakter." });
    const level = levelFromCode(code);
    if (!level) return res.status(400).json({ detail: "Kode akses tidak valid." });
    if (await accessCodeAlreadyUsed(code) || generatedCodes.get(code)?.used) return res.status(409).json({ detail: "Kode akses ini sudah pernah dipakai." });
    if (await findStudent(email)) return res.status(409).json({ detail: "Email sudah terdaftar. Silakan login dengan password yang dibuat sebelumnya." });
    const student = await saveStudent({ name, email, level, password, accessCode: code });
    const entry = generatedCodes.get(code); if (entry) { entry.used = true; entry.used_by = student.id; }
    setCookie(res, student);
    return res.status(201).json(publicStudent(student));
  }
  if (path === "/api/auth/login" && req.method === "POST") {
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email || !password) return res.status(400).json({ detail: "Email dan password wajib diisi." });
    const student = await findStudent(email);
    if (!student) return res.status(401).json({ detail: "Email belum terdaftar. Silakan daftar terlebih dahulu." });
    if (!student.active) return res.status(403).json({ detail: "Akun kamu sedang dinonaktifkan." });
    if (!passwordMatches(student, password)) return res.status(401).json({ detail: "Password salah." });
    setCookie(res, student);
    return res.status(200).json(publicStudent(student));
  }
  if (path === "/api/auth/level" && (req.method === "PATCH" || req.method === "POST")) {
    const session = readSession(req);
    const email = String(body.email || session?.email || "").trim().toLowerCase();
    const target = String(body.level || "").trim().toLowerCase() as Level;
    const code = String(body.access_code || "").trim().toUpperCase();
    const order: Level[] = ["nguli", "mandor", "supervisor"];
    if (!email || !order.includes(target) || !code) return res.status(400).json({ detail: "Email, level tujuan, dan kode akses wajib diisi." });
    const student = await findStudent(email);
    if (!student) return res.status(404).json({ detail: "Akun siswa tidak ditemukan." });
    if (order.indexOf(target) <= order.indexOf(student.level)) return res.status(400).json({ detail: "Level tujuan harus lebih tinggi dari level sekarang." });
    if (levelFromCode(code) !== target) return res.status(400).json({ detail: "Kode akses tidak sesuai dengan level tujuan." });
    if (await accessCodeAlreadyUsed(code) || generatedCodes.get(code)?.used) return res.status(409).json({ detail: "Kode akses ini sudah pernah dipakai." });
    const updated = await markAccessCodeUsed(student, code, target);
    const entry = generatedCodes.get(code); if (entry) { entry.used = true; entry.used_by = student.id; }
    setCookie(res, updated);
    return res.status(200).json(publicStudent(updated));
  }
  return null;
}

async function admin(req: any, res: any, path: string) {
  if (path === "/api/admin/students" && req.method === "GET") return res.status(200).json((await listStudents()).map(publicStudent));
  if (path === "/api/admin/students" && req.method === "PATCH") {
    const body = bodyOf(req); const id = String(body.id || req.query?.id || "");
    const student = (await listStudents()).find((s) => s.id === id);
    if (!student) return res.status(404).json({ detail: "Siswa tidak ditemukan." });
    return res.status(200).json(publicStudent(await setStudentActive(student, Boolean(body.active))));
  }
  if (path === "/api/admin/access-codes" && req.method === "POST") {
    const body = bodyOf(req); const level = String(body.level || "nguli").toLowerCase() as Level;
    const count = Math.max(1, Math.min(50, Number(body.count) || 3));
    if (!["nguli", "mandor", "supervisor"].includes(level)) return res.status(400).json({ detail: "Level tidak valid." });
    const prefix = level === "nguli" ? "NGU" : level === "mandor" ? "MAN" : "SPV";
    const out = [];
    for (let i = 0; i < count; i++) {
      let code = ""; do { code = `MLS-${prefix}-${crypto.randomInt(1000, 10000)}`; } while (generatedCodes.has(code));
      generatedCodes.set(code, { level, used: false, used_by: "" }); out.push({ id: `code-${Date.now()}-${i}`, code, level, used: false, used_by: "" });
    }
    return res.status(200).json(out);
  }
  return null;
}

export default async function handler(req: any, res: any) {
  const path = String(req.url || "").split("?")[0];
  try {
    if (path.startsWith("/api/auth/")) { const result = await auth(req, res, path); if (result !== null) return result; }
    if (path.startsWith("/api/admin/")) { const result = await admin(req, res, path); if (result !== null) return result; }
    return app(req, res);
  } catch (error) {
    console.error("API_HANDLER_ERROR", error);
    if (!res.headersSent) return res.status(500).json({ detail: "Server gagal memproses permintaan." });
  }
}
