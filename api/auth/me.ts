function decodeToken(token: string) {
  try {
    const user = JSON.parse(decodeURIComponent(token));
    if (!user?.id || !user?.name || !user?.email || !user?.level) return null;
    if (!user.active) return null;
    return user;
  } catch {
    return null;
  }
}

export default function handler(req: any, res: any) {
  const cookie = String(req.headers?.cookie || "");
  const headerId = String(req.headers?.["x-mls-session"] || "");
  const match = cookie.match(/(?:^|;\s*)mls_session=([^;]+)/);
  const token = headerId || (match ? decodeURIComponent(match[1]) : "");
  const user = decodeToken(token);
  return res.status(200).json(user || null);
}
