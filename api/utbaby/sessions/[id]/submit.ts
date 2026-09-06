const ITEMS = [
  { b: -0.45, a: 1.25, correct: 1 },
  { b: 0.82, a: 1.64, correct: 1 },
  { b: 0.15, a: 1.35, correct: 1 },
  { b: -0.20, a: 1.10, correct: 1 },
  { b: 0.95, a: 1.75, correct: 1 },
  { b: 0.88, a: 1.60, correct: 1 },
  { b: 0.75, a: 1.50, correct: 2 },
];

const QUESTION_IDS = [
  "rodi-pu-1",
  "rodi-pk-1",
  "rodi-pbm-1",
  "rodi-ppu-1",
  "rodi-lit-indo-1",
  "rodi-lit-inggris-1",
  "rodi-pm-1",
];

function probability(a: number, b: number, theta: number) {
  return 1 / (1 + Math.exp(-a * (theta - b)));
}

function estimateTheta(responses: number[], items: typeof ITEMS) {
  let theta = 0;
  for (let iteration = 0; iteration < 50; iteration++) {
    let first = 0;
    let information = 0;
    items.forEach((item, index) => {
      const p = probability(item.a, item.b, theta);
      const u = responses[index] ?? 0;
      first += item.a * (u - p);
      information += item.a * item.a * p * (1 - p);
    });
    if (information < 0.000001) break;
    const next = Math.max(-4, Math.min(4, theta + first / information));
    if (Math.abs(next - theta) < 0.0001) {
      theta = next;
      break;
    }
    theta = next;
  }
  return theta;
}

export default function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ detail: "Method not allowed" });

  let body: any = req.body || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body || "{}"); } catch { body = {}; }
  }

  const sessionId = String(req.query?.id || "utbaby-demo-2026");
  const total = sessionId === "utbaby-demo-1" ? 4 : 7;
  const answers = body.answers || {};
  const items = ITEMS.slice(0, total);
  const responses = items.map((item, index) => {
    const answer = Number(answers[QUESTION_IDS[index]]);
    return answer === item.correct ? 1 : 0;
  });

  const correct = responses.reduce((sum, value) => sum + value, 0);
  const theta = estimateTheta(responses, items);
  const score = Math.max(200, Math.min(900, Math.round(500 + theta * 100)));
  const percentile = Math.max(1, Math.min(99, Math.round(50 + theta * 12.5)));

  return res.status(200).json({
    session_id: sessionId,
    participant: String(body.participant || "Siswa Malas Belajar"),
    score,
    correct,
    total,
    percentile,
    theta: Number(theta.toFixed(3)),
    irt_note: "Skor dihitung otomatis dengan model IRT 2PL: jawaban benar/salah diproses bersama tingkat kesukaran (b) dan daya pembeda (a). Skala 200–900 adalah simulasi, bukan skor resmi SNPMB.",
    rank: Math.max(1, Math.round((100 - percentile) * 1.5)),
  });
}
