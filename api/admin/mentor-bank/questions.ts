import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createQuestion, mentorQuestions, validMentorCode } from "../../_lib/mentorBank";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ detail: "Method tidak didukung." });
  let body: any;
  try { body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {}); }
  catch { return res.status(400).json({ detail: "Format data soal tidak valid." }); }
  if (!validMentorCode(body.mentor_code)) return res.status(403).json({ detail: "Kode mentor tidak valid. Verifikasi mentor terlebih dahulu." });
  if (!String(body.prompt || "").trim()) return res.status(400).json({ detail: "Soal wajib diisi." });
  try {
    const q = createQuestion(body);
    if (q.options.length < 4) return res.status(400).json({ detail: "Minimal 4 opsi jawaban wajib diisi." });
    mentorQuestions.unshift(q);
    return res.status(201).json(q);
  } catch (e) {
    return res.status(400).json({ detail: e instanceof Error ? e.message : "Soal gagal disimpan." });
  }
}
