// lib/tableApi.ts
import { apiFetch } from "./api";

// Your Django URLs are:
// path('tables/', views.TableListCreateView.as_view(), name='table-list'),
// path('tables/<int:pk>/', views.TableRetrieveUpdateDestroyView.as_view(), name='table-detail'),
// path('tables/deleted/', views.DeletedTableListView.as_view(), name='deleted-tables'),

const TABLES_ENDPOINT = "/api/orders/";  // No /api/ prefix, matches your Django URLs


export async function createTable(data: {
  table_number: number;
  capacity: number;
  area?: string;
  status?: string;
  branch: number;
  server?: number | null;
}) {
  try {
    // Clean the data - remove undefined values
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined && value !== null)
    );
    
    console.log("Sending data to Django:", cleanData);
    
    const res = await apiFetch(
      TABLES_ENDPOINT,
      {
        method: "POST",
        body: JSON.stringify(cleanData),
      },
      true
    );
    
    if (!res.ok) {
      const text = await res.text();
      console.error("Error response:", text);
      
      try {
        const json = JSON.parse(text);
        throw json;
      } catch (e) {
        throw new Error(`Server error: ${text.substring(0, 200)}`);
      }
    }
    
    const json = await res.json();
    return json;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

export async function listTables(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  const res = await apiFetch(
    `${TABLES_ENDPOINT}${query ? "?" + query : ""}`,  // /tables/?branch=1&status=AVAILABLE
    {},
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function getTable(id: string | number) {
  const res = await apiFetch(
    `${TABLES_ENDPOINT}${id}/`,  // /tables/1/
    {},
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function updateTable(id: string | number, data: any) {
  const res = await apiFetch(
    `${TABLES_ENDPOINT}${id}/`,  // /tables/1/
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export async function deleteTable(id: string | number) {
  const res = await apiFetch(
    `${TABLES_ENDPOINT}${id}/`,  // /tables/1/
    { method: "DELETE" },
    true
  );
  if (res.status === 204) return null;
  const json = await res.json().catch(() => null);
  if (!res.ok && json) throw json;
  return json;
}

export async function getDeletedTables(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  const res = await apiFetch(
    `${TABLES_ENDPOINT}deleted/${query ? "?" + query : ""}`,  // /tables/deleted/
    {},
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}