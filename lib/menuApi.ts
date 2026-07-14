import { apiFetch } from "./api";

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  sku: string;
  price: string;
  cost_price: string;
  category: number;
  category_name: string;
  product_type: string;
  is_available: boolean;
  price_override: string | null;
  prep_time_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface MenuListResponse {
  json(): unknown;
  count: number;
  next: string | null;
  previous: string | null;
  results: MenuItem[];
}

export interface MenuItemPayload {
  name: string;
  sku: string;
  description: string;
  price: string;
  cost_price: string;
  category: number;
  prep_time_minutes: number;
  is_available: boolean;
}

// GET /api/menu/
export async function listMenuItems(params?: {
  category?: number;
  search?: string;
  ordering?: string;
  page?: number;
}): Promise<MenuListResponse> {
  const qs = new URLSearchParams();
  if (params?.category)  qs.set("category", String(params.category));
  if (params?.search)    qs.set("search", params.search);
  if (params?.ordering)  qs.set("ordering", params.ordering);
  if (params?.page)      qs.set("page", String(params.page));
  const path = `/api/menu/${qs.toString() ? "?" + qs.toString() : ""}`;
  const res = await apiFetch(path, {}, true);
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

// POST /api/menu/
export async function createMenuItem(
  data: MenuItemPayload
): Promise<MenuItem> {
  const res = await apiFetch("/api/menu/", {
    method: "POST",
    body: JSON.stringify(data),
  }, true);
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

// GET /api/menu/{id}/
export async function getMenuItem(id: number): Promise<MenuItem> {
  const res = await apiFetch(`/api/menu/${id}/`, {}, true);
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

// PATCH /api/menu/{id}/
export async function updateMenuItem(
  id: number,
  data: Partial<MenuItemPayload>
): Promise<MenuItem> {
  const res = await apiFetch(`/api/menu/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  }, true);
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

// DELETE /api/menu/{id}/
export async function deleteMenuItem(id: number): Promise<void> {
  const res = await apiFetch(`/api/menu/${id}/`, { method: "DELETE" }, true);
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw json;
  }
}
