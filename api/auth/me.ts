export default function handler(req: any, res: any) {
  const cookie = String(req.headers?.cookie || "");
  const headerId = String(req.headers?.["x-mls-session"] || "");
  const match = cookie.match(/(?:^|;\s*)mls_session=([^;]+)/);
  const id = headerId || (match ? decodeURIComponent(match[1]) : "");
  const users: Record<string, any> = {
    "usr-demo-1": { id: "usr-demo-1", name: "Pejuang SNBT 2026", email: "siswa@malasbelajar.id", level: "nguli", active: true },
    "usr-mandor-1": { id: "usr-mandor-1", name: "Siti Rahma", email: "siti@malasbelajar.id", level: "mandor", active: true },
    "usr-spv-1": { id: "usr-spv-1", name: "Budi Santoso", email: "budi@malasbelajar.id", level: "supervisor", active: true }
  };
  return res.status(200).json(users[id] || null);
}
