import { apiFetch } from "./api";

export async function listOrders(tableId?: string | number) {
  try {
    let url = "/api/orders/";
    if (tableId) {
      url += `?table=${tableId}`;
    }
    const res = await apiFetch(url, {}, true);
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const json = await res.json();
    // Return array if possible
    if (Array.isArray(json)) return json;
    if (json.results && Array.isArray(json.results)) return json.results;
    return [];
  } catch (error) {
    console.error("listOrders error:", error);
    return [];
  }
}

export async function listTables() {
  try {
    const res = await apiFetch("/api/orders/tables/", {}, true);
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const json = await res.json();
    if (Array.isArray(json)) return json;
    if (json.results && Array.isArray(json.results)) return json.results;
    return [];
  } catch (error) {
    console.error("listTables error:", error);
    return [];
  }
}

export async function getOrder(id: string | number) {
  const res = await apiFetch(`/api/orders/${id}/`, {}, true);
  if (!res.ok) throw await res.json();
  return await res.json();
}

export async function getTable(id: string | number) {
  const res = await apiFetch(`/api/orders/tables/${id}/`, {}, true);
  if (!res.ok) throw await res.json();
  return await res.json();
}

export async function createOrder(data: any) {
  const res = await apiFetch("/api/orders/", {
    method: "POST",
    body: JSON.stringify(data),
  }, true);
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function updateOrder(id: number | string, data: Record<string, any>) {
  const res = await apiFetch(`/api/orders/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  }, true);
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}


export async function addOrderItem(data: { order: number; product: number; quantity: number }) {
  const res = await apiFetch("/api/orders/items/", {
    method: "POST",
    body: JSON.stringify(data),
  }, true);
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function deleteOrderItem(id: number) {
  const res = await apiFetch(`/api/orders/items/${id}/`, { method: "DELETE" }, true);
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw json;
  }
  return res;
}

// Add this function

export async function getActiveDiscounts() {
  const res = await apiFetch("/api/orders/discounts/active/", {}, true);
  const json = await res.json();
  if (!res.ok) throw json;
  return json.results !== undefined ? json.results : json;
}


// ─── Discount Management (Full CRUD) ─────────────────────────────────────

export async function getDiscounts() {
  const res = await apiFetch("/api/orders/discounts/", {}, true);
  const json = await res.json();
  if (!res.ok) throw json;
  return json.results !== undefined ? json.results : json;
}

export async function createDiscount(data: any) {
  const res = await apiFetch(
    "/api/orders/discounts/",
    { method: "POST", body: JSON.stringify(data) },
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function updateDiscount(id: number, data: any) {
  const res = await apiFetch(
    `/api/orders/discounts/${id}/`,
    { method: "PATCH", body: JSON.stringify(data) },
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function deleteDiscount(id: number) {
  const res = await apiFetch(
    `/api/orders/discounts/${id}/`,
    { method: "DELETE" },
    true
  );
  if (res.status === 204) return null;
  const json = await res.json().catch(() => null);
  if (!res.ok && json) throw json;
  return json;
}