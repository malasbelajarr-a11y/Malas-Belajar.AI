import { verifyAccessCode } from "../../src/lib/accessCode";

function encodeToken(user: { id: string; name: string; email: string; level: string; active: boolean }) {
  return Buffer.from(JSON.stringify(user), "utf8").toString("base64url");
}

export default function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ detail: "Method not allowed" });
  let body: any = req.body || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body || "{}"); } catch { body = {}; }
  }
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const accessCode = String(body.access_code || "").trim().toUpperCase();

  if (!name) return res.status(400).json({ detail: "Nama wajib diisi." });
  if (!email || !email.includes("@")) return res.status(400).json({ detail: "Email wajib diisi dengan benar." });
  if (!accessCode) return res.status(400).json({ detail: "Kode akses wajib diisi." });

  const verified = verifyAccessCode(accessCode);
  if (!verified.valid || !verified.level) {
    return res.status(401).json({ detail: "Kode akses salah atau tidak valid. Minta kode baru dari mentor." });
  }

  const user = {
    id: `student-${Buffer.from(`${email}:${accessCode}`).toString("base64url").slice(0, 32)}`,
    name,
    email,
    level: verified.level,
    active: true,
  };
  const token = encodeToken(user);
  res.setHeader("Set-Cookie", `mls_session=${encodeURIComponent(token)}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax; Secure`);
  return res.status(201).json({ ...user, session_token: token });
}
