const SUPABASE_URL = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "");

export function supabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

export async function supabaseRequest<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  if (!supabaseConfigured()) {
    throw new Error("Supabase belum dikonfigurasi di Vercel (SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY).");
  }
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    const detail = body?.message || body?.hint || body?.details || body?.error || `Supabase request failed (${response.status})`;
    throw new Error(String(detail));
  }
  return body as T;
}
