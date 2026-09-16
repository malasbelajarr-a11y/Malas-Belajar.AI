import type { VercelRequest, VercelResponse } from "@vercel/node";
import { loadMentorQuestions, loadMentorTryouts, mentorQuestions, mentorTryouts, SUBTESTS, validMentorCode } from "../_lib/mentorBank";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ detail: "Method tidak didukung." });
  if (!validMentorCode(req.query?.mentor_code)) return res.status(403).json({ detail: "Kode mentor tidak valid." });
  await loadMentorQuestions();
  await loadMentorTryouts();
  return res.status(200).json({
    subtests: SUBTESTS.map(([id,label,question_count]) => ({ id,label,question_count,added:mentorQuestions.filter(q=>q.chapter===id).length })),
    questions: mentorQuestions,
    tryouts: mentorTryouts,
  });
}
