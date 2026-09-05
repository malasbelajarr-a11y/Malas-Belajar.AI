// Session boundary: auth is supported via localStorage token + httpOnly cookie.
import { queryClient } from "./queryClient";
import { apiPost } from "./api";

const TOKEN_KEY = "mls_user_id";

export function getSessionUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

// Call after every successful login/signup/demo.
export function beginSession(userId?: string): void {
  if (userId && typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, userId);
  }
  queryClient.clear();
}

// Call from every sign-out control.
export async function endSession(redirectTo?: string): Promise<void> {
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
    }
    await apiPost("/auth/logout");
  } catch {
    // Ignore network error on logout
  } finally {
    queryClient.clear();
    queryClient.setQueryData(["session"], null);
    if (redirectTo) {
      window.location.assign(redirectTo);
    }
  }
}
