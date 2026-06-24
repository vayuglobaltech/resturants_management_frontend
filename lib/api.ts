// API base URL - update this to match your backend
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Token Storage ────────────────────────────────────────────────────────────
export const getAccessToken = () =>
  typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
export const getRefreshToken = () =>
  typeof window !== "undefined" ? localStorage.getItem("refresh_token") : null;
export const setTokens = (access: string, refresh: string) => {
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
};
export const clearTokens = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user_profile");
};

// ─── Generic Fetch with Auth ──────────────────────────────────────────────────
export async function apiFetch(
  path: string,
  options: RequestInit = {},
  auth = false
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (auth) {
    const token = getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  // Auto-refresh on 401
  if (res.status === 401 && auth) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${getAccessToken()}`;
      return fetch(`${API_BASE}${path}`, { ...options, headers });
    }
  }
  return res;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────
export async function registerUser(data: {
  email: string;
  username: string;
  password: string;
  password2: string;
  first_name?: string;
  last_name?: string;
}) {
  const res = await apiFetch("/api/users/register/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function verifyEmail(data: { email: string; code: string }) {
  const res = await apiFetch("/api/users/verify-email/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function resendVerification(data: { email: string }) {
  const res = await apiFetch("/api/users/resend-verification/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function loginUser(data: { username: string; password: string }) {
  const res = await apiFetch("/api/users/login/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw json;
  if (json.access && json.refresh) {
    setTokens(json.access, json.refresh);
  }
  return json;
}

export async function refreshAccessToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_BASE}/api/users/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return false;
    const json = await res.json();
    if (json.access) {
      localStorage.setItem("access_token", json.access);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function requestPasswordReset(data: { email: string }) {
  const res = await apiFetch("/api/users/password-reset/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function confirmPasswordReset(data: {
  token: string;
  new_password: string;
}) {
  const res = await apiFetch("/api/users/password-reset/confirm/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function getProfile() {
  const res = await apiFetch("/api/users/profile/", {}, true);
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function updateProfile(data: Record<string, string>) {
  const res = await apiFetch(
    "/api/users/profile/",
    { method: "PATCH", body: JSON.stringify(data) },
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function listAllUsers() {
  const res = await apiFetch("/api/users/users/", {}, true);
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}
