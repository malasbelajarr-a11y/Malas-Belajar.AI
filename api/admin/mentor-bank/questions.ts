import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createQuestion, loadMentorQuestions, mentorQuestions, persistMentorQuestion, validMentorCode } from "../../_lib/mentorBank";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ detail: "Method tidak didukung." });
  let body: any;
  try { body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {}); }
  catch { return res.status(400).json({ detail: "Format data soal tidak valid." }); }
  if (!validMentorCode(body.mentor_code)) return res.status(403).json({ detail: "Kode mentor tidak valid. Verifikasi mentor terlebih dahulu." });
  try {
    await loadMentorQuestions();
    const q = createQuestion(body);
    mentorQuestions.unshift(q);
    await persistMentorQuestion(q);
    return res.status(201).json(q);
  } catch (e) {
    console.error("MENTOR_QUESTION_SAVE_ERROR", e);
    return res.status(400).json({ detail: e instanceof Error ? e.message : "Soal gagal disimpan." });
  }
}
