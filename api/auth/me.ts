import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listStudents, publicStudent } from "../_lib/studentStore";
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ detail: "Method tidak didukung." });
  const raw = String(req.headers?.cookie || "");
  const match = raw.match(/(?:^|;\s*)mls_session=([^;]+)/);
  if (!match) return res.status(200).json(null);
  try {
    const session = JSON.parse(decodeURIComponent(match[1]));
    if (!session?.id) return res.status(200).json(null);
    const student = (await listStudents()).find((item) => item.id === String(session.id));
    return res.status(200).json(student ? publicStudent(student) : null);
  } catch {
    return res.status(200).json(null);
  }
}
