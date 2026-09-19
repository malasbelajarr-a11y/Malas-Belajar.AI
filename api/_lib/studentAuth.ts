import type { VercelRequest, VercelResponse } from "@vercel/node";
import { accessCodeAlreadyUsed, findStudent, listStudents, markAccessCodeUsed, passwordMatches, publicStudent, saveStudent } from "./studentStore";
import { supabaseConfigured, supabaseRequest } from "./supabase";
type Level = "nguli" | "mandor" | "supervisor";
const order: Level[] = ["nguli", "mandor", "supervisor"];
async function levelFromCode(code: string): Promise<Level | null> {
  const n = String(code || "").trim().toUpperCase();
  if (/^MLS-NGU-\d{4}$/.test(n)) return "nguli";
  if (/^MLS-MAN-\d{4}$/.test(n)) return "mandor";
  if (/^MLS-SPV-\d{4}$/.test(n)) return "supervisor";
  if (supabaseConfigured()) {
    const rows = await supabaseRequest<any[]>("access_codes?code=eq." + encodeURIComponent(n) + "&select=level&limit=1");
    const level = String(rows?.[0]?.level || "").toLowerCase();
    if (level === "nguli" || level === "mandor" || level === "supervisor") return level;
  }
  return null;
}
function bodyOf(req: VercelRequest) {
  if (!req.body) return {};
  if (typeof req.body === "string") { try { return JSON.parse(req.body || "{}"); } catch { return {}; } }
  return req.body || {};
}
function setCookie(res: VercelResponse, student: any) {
  const token = encodeURIComponent(JSON.stringify(publicStudent(student)));
  res.setHeader("Set-Cookie", "mls_session=" + token + "; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax; Secure");
}
function readSession(req: VercelRequest) {
  const raw = String(req.headers?.cookie || "");
  const m = raw.match(/(?:^|;\s*)mls_session=([^;]+)/);
  if (!m) return null;
  try { return JSON.parse(decodeURIComponent(m[1])); } catch { return null; }
}
export async function registerHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ detail: "Method tidak didukung." });
  const body = bodyOf(req);
  const session = readSession(req);
  const sessionStudent = session?.id ? (await listStudents()).find((s) => s.id === String(session.id)) : null;
  const requestedLevel = String(body.level || "").trim().toLowerCase() as Level;
  const requestedCode = String(body.access_code || body.code || "").trim().toUpperCase();
  if (sessionStudent && order.includes(requestedLevel) && requestedCode && order.indexOf(requestedLevel) > order.indexOf(sessionStudent.level)) {
    if (await levelFromCode(requestedCode) !== requestedLevel) return res.status(400).json({ detail: "Kode akses tidak sesuai dengan level tujuan." });
    if (await accessCodeAlreadyUsed(requestedCode)) return res.status(409).json({ detail: "Kode akses ini sudah pernah dipakai." });
    const updated = await markAccessCodeUsed(sessionStudent, requestedCode, requestedLevel);
    setCookie(res, updated);
    return res.status(200).json(publicStudent(updated));
  }
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!name || !email || !password || !requestedCode) return res.status(400).json({ detail: "Nama, email, password, dan kode akses wajib diisi." });
  if (password.length < 6) return res.status(400).json({ detail: "Password minimal 6 karakter." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ detail: "Format email tidak valid." });
  const level = await levelFromCode(requestedCode);
  if (!level) return res.status(400).json({ detail: "Kode akses tidak valid." });
  if (await accessCodeAlreadyUsed(requestedCode)) return res.status(409).json({ detail: "Kode akses ini sudah pernah dipakai." });
  if (await findStudent(email)) return res.status(409).json({ detail: "Email sudah terdaftar. Silakan login dengan password yang dibuat sebelumnya." });
  const student = await saveStudent({ name, email, level, password, accessCode: requestedCode });
  setCookie(res, student);
  return res.status(201).json(publicStudent(student));
}
export async function loginHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ detail: "Method tidak didukung." });
  const body = bodyOf(req);
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