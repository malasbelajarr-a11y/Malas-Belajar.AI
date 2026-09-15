// Typed fetch layer over the unified Vercel API. Base is the relative "/api" prefix so the
// same code works in dev and production behind a single origin.
const BASE = "/api";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    super(`request failed with ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

type JsonBody = unknown;

async function request<T>(method: string, path: string, body?: JsonBody | FormData): Promise<T> {
  const isFormData = body instanceof FormData;
  const headers: Record<string, string> = {};
  if (body !== undefined && !isFormData) headers["Content-Type"] = "application/json";

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("mls_session_token") || localStorage.getItem("mls_user_id")
      : null;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    headers["x-mls-session"] = token;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    const detail =
      errBody && typeof errBody === "object" && "detail" in errBody
        ? String((errBody as { detail: unknown }).detail)
        : errBody && typeof errBody === "object" && "error" in errBody
          ? String((errBody as { error: unknown }).error)
          : `request failed with ${res.status}`;
    throw new ApiError(res.status, {
      ...(typeof errBody === "object" && errBody ? errBody : {}),
      message: detail,
    });
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const apiGet = <T>(path: string) => request<T>("GET", path);
export const apiPost = <T>(path: string, body?: JsonBody) => request<T>("POST", path, body ?? null);
export const apiPut = <T>(path: string, body?: JsonBody) => request<T>("PUT", path, body ?? null);

export const apiPatch = <T>(path: string, body?: JsonBody) => {
  if (path === "/auth/level" && typeof window !== "undefined") {
    const current = body && typeof body === "object" && !Array.isArray(body)
      ? body as Record<string, unknown>
      : {};
    if (!current.access_code && !current.code) {
      const code = window.prompt("Masukkan kode akses untuk naik ke level tujuan:");
      if (!code?.trim()) {
        return Promise.reject(
          new ApiError(400, { detail: "Kode akses wajib diisi untuk naik level." }),
        );
      }
      return request<T>("PATCH", path, {
        ...current,
        access_code: code.trim().toUpperCase(),
      });
    }
  }
  return request<T>("PATCH", path, body ?? null);
};

export const apiDelete = <T>(path: string) => request<T>("DELETE", path);
export const apiUpload = <T>(path: string, body: FormData) => request<T>("POST", path, body);
