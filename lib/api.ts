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

export async function getBranches() {
  const res = await apiFetch("/api/users/branches/");
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function getRoles() {
  const res = await apiFetch("/api/users/roles/");
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────
export async function registerUser(data: {
  email: string;
  username: string;
  password: string;
  password2: string;
  phone_number: string;
  preferred_branch: string;
  preferred_role: string;
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

// ─── Inventory API ────────────────────────────────────────────────────────────

// 1. Categories
export async function getCategories() {
  const res = await apiFetch("/api/inventory/categories/", {}, true);
  const json = await res.json();
  if (!res.ok) throw json;
  return json.results !== undefined ? json.results : json;
}

export async function createCategory(data: any) {
  const res = await apiFetch(
    "/api/inventory/categories/",
    { method: "POST", body: JSON.stringify(data) },
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function getCategory(id: string | number) {
  const res = await apiFetch(`/api/inventory/categories/${id}/`, {}, true);
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function updateCategory(id: string | number, data: any) {
  const res = await apiFetch(
    `/api/inventory/categories/${id}/`,
    { method: "PATCH", body: JSON.stringify(data) },
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function deleteCategory(id: string | number) {
  const res = await apiFetch(
    `/api/inventory/categories/${id}/`,
    { method: "DELETE" },
    true
  );
  // 204 No Content – no JSON body
  if (res.status === 204) return null;
  const json = await res.json().catch(() => null);
  if (!res.ok && json) throw json;
  return json;
}

// 2. Ingredients
export async function getIngredients(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  const res = await apiFetch(
    `/api/inventory/ingredients/${query ? "?" + query : ""}`,
    {},
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json.results !== undefined ? json.results : json;
}

export async function createIngredient(data: any) {
  const res = await apiFetch(
    "/api/inventory/ingredients/",
    { method: "POST", body: JSON.stringify(data) },
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function getIngredient(id: string | number) {
  const res = await apiFetch(`/api/inventory/ingredients/${id}/`, {}, true);
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function updateIngredient(id: string | number, data: any) {
  const res = await apiFetch(
    `/api/inventory/ingredients/${id}/`,
    { method: "PATCH", body: JSON.stringify(data) },
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function deleteIngredient(id: string | number) {
  const res = await apiFetch(
    `/api/inventory/ingredients/${id}/`,
    { method: "DELETE" },
    true
  );
  if (res.status === 204) return null;
  const json = await res.json().catch(() => null);
  if (res.ok === false && json) throw json;
  return json;
}

// 3. Products
export async function getProducts(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  const res = await apiFetch(
    `/api/inventory/products/${query ? "?" + query : ""}`,
    {},
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json.results !== undefined ? json.results : json;
}

export async function createProduct(data: any) {
  const res = await apiFetch(
    "/api/inventory/products/",
    { method: "POST", body: JSON.stringify(data) },
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function getProduct(id: string | number) {
  const res = await apiFetch(`/api/inventory/products/${id}/`, {}, true);
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function updateProduct(id: string | number, data: any) {
  const res = await apiFetch(
    `/api/inventory/products/${id}/`,
    { method: "PATCH", body: JSON.stringify(data) },
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function deleteProduct(id: string | number) {
  const res = await apiFetch(
    `/api/inventory/products/${id}/`,
    { method: "DELETE" },
    true
  );
  if (res.status === 204) return null;
  const json = await res.json().catch(() => null);
  if (res.ok === false && json) throw json;
  return json;
}

// 4. Recipes
export async function getRecipes(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  const res = await apiFetch(
    `/api/inventory/recipes/${query ? "?" + query : ""}`,
    {},
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json.results !== undefined ? json.results : json;
}

export async function createRecipe(data: any) {
  const res = await apiFetch(
    "/api/inventory/recipes/",
    { method: "POST", body: JSON.stringify(data) },
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function getRecipeByProduct(productId: number) {
  // Query recipes by product ID (returns a paginated list)
  const res = await apiFetch(`/api/inventory/recipes/?product=${productId}`, {}, true);
  const json = await res.json();
  if (!res.ok) throw json;
  const results = json.results || json;
  // Return the first recipe (there should be only one per product)
  return results[0] || null;
}

export async function getRecipe(id: string | number) {
  const res = await apiFetch(`/api/inventory/recipes/${id}/`, {}, true);
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function updateRecipe(id: string | number, data: any) {
  const res = await apiFetch(
    `/api/inventory/recipes/${id}/`,
    { method: "PATCH", body: JSON.stringify(data) },
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function deleteRecipe(id: string | number) {
  const res = await apiFetch(
    `/api/inventory/recipes/${id}/`,
    { method: "DELETE" },
    true
  );
  if (res.status === 204) return null;
  const json = await res.json().catch(() => null);
  if (res.ok === false && json) throw json;
  return json;
}

// 5. Inventory (Stock)
export async function getInventories(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  const res = await apiFetch(
    `/api/inventory/inventory/${query ? "?" + query : ""}`,
    {},
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json.results !== undefined ? json.results : json;
}

export async function createInventoryRecord(data: any) {
  const res = await apiFetch(
    "/api/inventory/inventory/",
    { method: "POST", body: JSON.stringify(data) },
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function getInventoryRecord(id: string | number) {
  const res = await apiFetch(`/api/inventory/inventory/${id}/`, {}, true);
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function updateInventoryRecord(id: string | number, data: any) {
  const res = await apiFetch(
    `/api/inventory/inventory/${id}/`,
    { method: "PATCH", body: JSON.stringify(data) },
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function deleteInventoryRecord(id: string | number) {
  const res = await apiFetch(
    `/api/inventory/inventory/${id}/`,
    { method: "DELETE" },
    true
  );
  if (res.status === 204) return null;
  const json = await res.json().catch(() => null);
  if (res.ok === false && json) throw json;
  return json;
}

// 6. Product Availability
export async function getProductAvailabilities(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  const res = await apiFetch(
    `/api/inventory/product-availability/${query ? "?" + query : ""}`,
    {},
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json.results !== undefined ? json.results : json;
}

export async function createProductAvailability(data: any) {
  const res = await apiFetch(
    "/api/inventory/product-availability/",
    { method: "POST", body: JSON.stringify(data) },
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function getProductAvailability(id: string | number) {
  const res = await apiFetch(
    `/api/inventory/product-availability/${id}/`,
    {},
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function updateProductAvailability(id: string | number, data: any) {
  const res = await apiFetch(
    `/api/inventory/product-availability/${id}/`,
    { method: "PATCH", body: JSON.stringify(data) },
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function deleteProductAvailability(id: string | number) {
  const res = await apiFetch(
    `/api/inventory/product-availability/${id}/`,
    { method: "DELETE" },
    true
  );
  if (res.status === 204) return null;
  const json = await res.json().catch(() => null);
  if (res.ok === false && json) throw json;
  return json;
}

// 7. Inventory Transactions
export async function getTransactions(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  const res = await apiFetch(
    `/api/inventory/transactions/${query ? "?" + query : ""}`,
    {},
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json.results !== undefined ? json.results : json;
}

export async function createTransaction(data: any) {
  const res = await apiFetch(
    "/api/inventory/transactions/",
    { method: "POST", body: JSON.stringify(data) },
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function getTransaction(id: string | number) {
  const res = await apiFetch(`/api/inventory/transactions/${id}/`, {}, true);
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

// lib/api.ts

export async function getBranchInventory(branchId: number) {
  const res = await apiFetch(`/api/inventory/inventory/?branch=${branchId}`, {}, true);
  const json = await res.json();
  if (!res.ok) throw json;
  return json.results || json;
}
