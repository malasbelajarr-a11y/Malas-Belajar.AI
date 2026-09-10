type Level = "nguli" | "mandor" | "supervisor";
type Question = {
  id: string;
  chapter: string;
  chapter_label: string;
  number: number;
  difficulty: string;
  topic: string;
  prompt: string;
  answer: string;
  steps: string[];
  is_final: boolean;
  options: string[];
  correct_option: number | null;
  irt_difficulty: number;
  irt_discrimination: number;
  level: Level;
  trap_tip: string;
  video_url: string;
};

const MENTOR_CODE = "CECEKOKOMLS";
const SUBTESTS: Record<string, string> = {
  pu: "Penalaran Umum (PU)",
  ppu: "Pengetahuan & Pemahaman Umum (PPU)",
  pbm: "Pemahaman Bacaan & Menulis (PBM)",
  pk: "Pengetahuan Kuantitatif (PK)",
  lit_indo: "Literasi Bahasa Indonesia",
  lit_inggris: "Literasi Bahasa Inggris",
  pm: "Penalaran Matematika (PM)",
};

// Fallback agar upload tetap berfungsi sebelum Supabase dihubungkan.
const memoryQuestions: Question[] = [];

function hasSupabase() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function supabaseRequest<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const url = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "");
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) throw new Error(body?.message || body?.hint || body?.details || body?.error || `Supabase request failed (${response.status})`);
  return body as T;
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method === "GET") {
      const chapter = String(req.query?.subtest || req.query?.chapter || "").trim();
      const level = String(req.query?.level || "").trim();
      if (!hasSupabase()) {
        return res.status(200).json(memoryQuestions.filter((q) =>
          (!chapter || q.chapter === chapter) && (!level || q.level === level)
        ));
      }
      const filters = ["select=*", "order=created_at.desc"];
      if (chapter) filters.push(`chapter=eq.${encodeURIComponent(chapter)}`);
      if (level) filters.push(`level=eq.${encodeURIComponent(level)}`);
      const rows = await supabaseRequest<Question[]>(`rodi_questions?${filters.join("&")}`);
      return res.status(200).json(rows || []);
    }

    if (req.method === "DELETE") {
      let body: any = req.body || {};
      if (typeof body === "string") { try { body = JSON.parse(body || "{}"); } catch { body = {}; } }
      const code = String(req.query?.mentor_code || body?.mentor_code || body?.code || "").trim().toUpperCase();
      if (code !== MENTOR_CODE) return res.status(401).json({ detail: "Kode mentor tidak cocok." });
      const id = String(req.query?.id || body?.id || "").trim();
      if (!id) return res.status(400).json({ detail: "ID soal wajib diisi." });
      if (!hasSupabase()) {
        const index = memoryQuestions.findIndex((item) => item.id === id);
        if (index >= 0) memoryQuestions.splice(index, 1);
      } else {
        await supabaseRequest(`rodi_questions?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      }
      return res.status(200).json({ ok: true, id });
    }

    if (req.method !== "POST") return res.status(405).json({ detail: "Method not allowed" });
    let body: any = req.body || {};
    if (typeof body === "string") {
      try { body = JSON.parse(body || "{}"); } catch { body = {}; }
    }
    const code = String(body.mentor_code || body.code || "").trim().toUpperCase();
    if (code !== MENTOR_CODE) return res.status(401).json({ detail: "Kode mentor tidak cocok." });

    const chapter = String(body.subtest || body.chapter || "").trim();
    if (!SUBTESTS[chapter]) return res.status(400).json({ detail: "Pilih subtes RODI terlebih dahulu." });

    const level: Level = ["nguli", "mandor", "supervisor"].includes(body.level) ? body.level : "nguli";
    const options = Array.isArray(body.options) ? body.options.map((v: any) => String(v)).filter(Boolean).slice(0, 5) : [];
    const steps = Array.isArray(body.steps) ? body.steps.map((v: any) => String(v)).filter(Boolean) : [];
    const question: Question = {
      id: `rodi-${chapter}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      chapter,
      chapter_label: SUBTESTS[chapter],
      number: Number(body.number) || memoryQuestions.filter((q) => q.chapter === chapter).length + 1,
      difficulty: String(body.difficulty || "Sedang"),
      topic: String(body.topic || ""),
      prompt: String(body.prompt || "").trim(),
      answer: String(body.answer || ""),
      steps,
      is_final: Boolean(body.is_final),
      options,
      correct_option: body.correct_option === "" || body.correct_option == null ? null : Number(body.correct_option),
      irt_difficulty: Number(body.irt_difficulty) || 0,
      irt_discrimination: Number(body.irt_discrimination) || 1,
      level,
      trap_tip: String(body.trap_tip || ""),
      video_url: String(body.video_url || ""),
    };

    if (!question.prompt) return res.status(400).json({ detail: "Soal wajib diisi." });
    if (!hasSupabase()) {
      memoryQuestions.push(question);
      return res.status(201).json(question);
    }

    const inserted = await supabaseRequest<Question[]>("rodi_questions", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(question),
    });
    return res.status(201).json(Array.isArray(inserted) ? inserted[0] : inserted);
  } catch (error: any) {
    console.error("RODI API error", error);
    return res.status(500).json({ detail: error?.message || "Gagal menyimpan soal RODI." });
  }
}
