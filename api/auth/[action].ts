import authHandler from "../_lib/authHandler";

export default async function handler(req: any, res: any) {
  const raw = String(req.url || "/api/auth").split("?")[0];
  const action = raw.replace(/^\/api\/auth\/?/, "").replace(/\/+$/, "");
  const path = action ? `/api/auth/${action}` : "/api/auth";
  try {
    return await authHandler(req, res, path);
  } catch (error) {
    console.error("AUTH_HANDLER_ERROR", error);
    const detail = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ detail });
  }
}
