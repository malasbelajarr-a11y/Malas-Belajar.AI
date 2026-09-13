export default function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ detail: "Method not allowed" });
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const level = ["nguli", "mandor", "supervisor"].includes(body.level) ? body.level : "nguli";
  const users: Record<string, any> = {
    nguli: { id: "usr-demo-1", name: "Pejuang SNBT 2026", email: "siswa@malasbelajar.id", level: "nguli", active: true },
    mandor: { id: "usr-mandor-1", name: "Siti Rahma", email: "siti@malasbelajar.id", level: "mandor", active: true },
    supervisor: { id: "usr-spv-1", name: "Budi Santoso", email: "budi@malasbelajar.id", level: "supervisor", active: true }
  };
  const user = users[level];
  res.setHeader("Set-Cookie", `mls_session=${user.id}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=None`);
  return res.status(200).json(user);
}
