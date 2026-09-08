const SECRET = "MLS-ACCESS-2026";

type Level = "nguli" | "mandor" | "supervisor";

const LEVEL_BY_PREFIX: Record<string, Level> = {
  NGU: "nguli",
  MAN: "mandor",
  SPV: "supervisor",
};

function checksum(level: Level, payload: string): string {
  let hash = 2166136261;
  const input = `${SECRET}:${level}:${payload}`;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).toUpperCase().slice(-2).padStart(2, "0");
}

function verifyAccessCode(raw: string): { valid: boolean; level?: Level } {
  const code = String(raw || "").trim().toUpperCase();
  const match = code.match(/^MLS-(NGU|MAN|SPV)-([0-9A-Z]{6})-([0-9A-Z]{2})$/);
  if (!match) return { valid: false };
  const level = LEVEL_BY_PREFIX[match[1]];
  return checksum(level, match[2]) === match[3] ? { valid: true, level } : { valid: false };
}

function encodeToken(user: { id: string; name: string; email: string; level: string; active: boolean }) {
  // URL-safe session token without Buffer so this works reliably on Vercel runtimes.
  return encodeURIComponent(JSON.stringify(user));
}

export default function handler(req: any, res: any) {
  try {
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
      id: `student-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      name,
      email,
      level: verified.level,
      active: true,
    };

    const token = encodeToken(user);
    res.setHeader(
      "Set-Cookie",
      `mls_session=${token}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax; Secure`
    );

    return res.status(201).json({ ...user, session_token: token });
  } catch (error) {
    console.error("AUTH_REGISTER_ERROR", error);
    return res.status(500).json({ detail: "Server gagal memproses pendaftaran. Coba lagi." });
  }
}
