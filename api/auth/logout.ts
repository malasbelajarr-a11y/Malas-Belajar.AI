import type { VercelRequest, VercelResponse } from "@vercel/node";
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ detail: "Method tidak didukung." });
  res.setHeader("Set-Cookie", "mls_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure");
  return res.status(200).json({ ok: true });
}
