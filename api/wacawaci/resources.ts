export default function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ detail: "Method not allowed" });
  }

  let body: any = req.body || {};
  if (typeof body === "string") {
    try {
      body = JSON.parse(body || "{}");
    } catch {
      body = {};
    }
  }

  const level = ["nguli", "mandor", "supervisor"].includes(body.level)
    ? body.level
    : "nguli";

  const resource = {
    id: `res-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kind: body.kind || "ringkasan",
    title: body.title || "Materi Baru",
    description: body.description || "Deskripsi materi pembelajaran",
    url: body.url || "https://example.com",
    is_public: true,
    created_by: "Mentor Malas Belajar",
    level,
  };

  return res.status(200).json(resource);
}
