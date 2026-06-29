import { apiFetch } from "./api";

export async function listOrders() {
  try {
    const res = await apiFetch("/api/orders/", {}, true);
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

export async function updateOrder(id: number | string, data: { status: string }) {
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