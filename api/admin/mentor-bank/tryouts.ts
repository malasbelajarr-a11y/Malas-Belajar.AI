import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createTryout, loadMentorQuestions, mentorTryouts, persistMentorTryout, validMentorCode } from "../../../_lib/mentorBank";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ detail: "Method tidak didukung." });
  let body:any;
  try { body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {}); }
  catch { return res.status(400).json({ detail: "Format data tryout tidak valid." }); }
  if (!validMentorCode(body.mentor_code)) return res.status(403).json({ detail: "Kode mentor tidak valid. Verifikasi mentor terlebih dahulu." });
  try {
    await loadMentorQuestions();
    const t = createTryout(body);
    mentorTryouts.unshift(t);
    await persistMentorTryout(t);
    return res.status(201).json(t);
  } catch(e) {
    console.error("MENTOR_TRYOUT_CREATE_ERROR",e);
    return res.status(400).json({ detail: e instanceof Error ? e.message : "Tryout gagal dibuat." });
  }
}
