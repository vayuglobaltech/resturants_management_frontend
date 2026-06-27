import { apiFetch } from "./api";

export async function listOrders() {
  const res = await apiFetch("/api/orders/", {}, true);
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function listTables() {
  const res = await apiFetch("/api/orders/tables/", {}, true);
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function getOrder(id: string | number) {
  const res = await apiFetch(`/api/orders/${id}/`, {}, true);
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function getTable(id: string | number) {
  const res = await apiFetch(`/api/orders/tables/${id}/`, {}, true);
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}
