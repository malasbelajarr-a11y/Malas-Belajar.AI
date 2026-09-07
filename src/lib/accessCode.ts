const SECRET = "MLS-ACCESS-2026";

type Level = "nguli" | "mandor" | "supervisor";

const PREFIX: Record<Level, string> = {
  nguli: "NGU",
  mandor: "MAN",
  supervisor: "SPV",
};

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

export function generateAccessCode(level: Level): string {
  const payload = Math.floor(Math.random() * 36 ** 6)
    .toString(36)
    .toUpperCase()
    .padStart(6, "0");
  return `MLS-${PREFIX[level]}-${payload}-${checksum(level, payload)}`;
}

export function verifyAccessCode(raw: string): { valid: boolean; level?: Level } {
  const code = String(raw || "").trim().toUpperCase();
  const match = code.match(/^MLS-(NGU|MAN|SPV)-([0-9A-Z]{6})-([0-9A-Z]{2})$/);
  if (!match) return { valid: false };
  const level = LEVEL_BY_PREFIX[match[1]];
  return checksum(level, match[2]) === match[3] ? { valid: true, level } : { valid: false };
}
