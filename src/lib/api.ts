// Typed fetch layer over the FastAPI backend. Base is the relative "/api" prefix so the
// same code works in dev (Vite proxies /api → :8001) and behind a single origin in prod.
const BASE = "/api";

// Fields are declared, not constructor parameter properties: tsconfig sets
// erasableSyntaxOnly, which rejects `constructor(readonly status: number)`.
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
  if (body !== undefined && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  // Send session token in header so iframe previews with third-party cookie restrictions stay authenticated
  const token =
    typeof window !== "undefined" ? localStorage.getItem("mls_user_id") : null;
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

  // FastAPI reports request-validation failures as 422 with a {detail: [...]} body.
  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    const detail =
      errBody && typeof errBody === "object" && "detail" in errBody
        ? String((errBody as { detail: unknown }).detail)
        : errBody && typeof errBody === "object" && "error" in errBody
          ? String((errBody as { error: unknown }).error)
          : `request failed with ${res.status}`;
    throw new ApiError(res.status, { ...(typeof errBody === "object" && errBody ? errBody : {}), message: detail });
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// The response type is yours to declare: nothing infers across the Python boundary, so a
// TS interface here mirrors the endpoint's Pydantic model by hand — keep the two in sync.
export const apiGet = <T>(path: string) => request<T>("GET", path);
export const apiPost = <T>(path: string, body?: JsonBody) => request<T>("POST", path, body ?? null);
export const apiPut = <T>(path: string, body?: JsonBody) => request<T>("PUT", path, body ?? null);
export const apiPatch = <T>(path: string, body?: JsonBody) =>
  request<T>("PATCH", path, body ?? null);
export const apiDelete = <T>(path: string) => request<T>("DELETE", path);
export const apiUpload = <T>(path: string, body: FormData) => request<T>("POST", path, body);
