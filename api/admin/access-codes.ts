const SECRET = "MLS-ACCESS-2026";

type Level = "nguli" | "mandor" | "supervisor";

const PREFIX: Record<Level, string> = {
  nguli: "NGU",
  mandor: "MAN",
  supervisor: "SPV",
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

function generateCode(level: Level): string {
  const payload = Math.floor(Math.random() * 36 ** 6)
    .toString(36)
    .toUpperCase()
    .padStart(6, "0");
  return `MLS-${PREFIX[level]}-${payload}-${checksum(level, payload)}`;
}

export default function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ detail: "Method not allowed" });
  }

  let body: any = req.body || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body || "{}"); } catch { body = {}; }
  }

  const mentorCode = String(body.mentor_code || body.code || "").trim().toUpperCase();
  if (mentorCode !== "CECEKOKOMLS") {
    return res.status(401).json({ detail: "Kode mentor tidak cocok." });
  }

  const level: Level = ["nguli", "mandor", "supervisor"].includes(body.level)
    ? body.level as Level
    : "nguli";
  const count = Math.min(20, Math.max(1, Number(body.count) || 3));

  const generated = Array.from({ length: count }, (_, i) => ({
    id: `code-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
    code: generateCode(level),
    level,
    used: false,
    used_by: "",
  }));

  return res.status(200).json(generated);
}
