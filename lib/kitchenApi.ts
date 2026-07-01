// lib/kitchenApi.ts
import { apiFetch } from "./api";

export interface KitchenStation {
  id: number;
  name: string;
  branch: number;
  branch_name?: string;
  max_capacity: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface KitchenStationPayload {
  name: string;
  branch: number;
  max_capacity: number;
  is_active: boolean;
}

// Get all kitchen stations with filters
export async function getKitchenStations(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : "";
  const res = await apiFetch(
    `/api/kitchen/stations/${query ? "?" + query : ""}`,
    {},
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

// Create a new kitchen station (Admin/Manager only)
export async function createKitchenStation(data: KitchenStationPayload) {
  const res = await apiFetch(
    "/api/kitchen/stations/",
    { method: "POST", body: JSON.stringify(data) },
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

// Get a single kitchen station
export async function getKitchenStation(id: number) {
  const res = await apiFetch(`/api/kitchen/stations/${id}/`, {}, true);
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

// Update a kitchen station (Admin/Manager only) - Uses PATCH
export async function updateKitchenStation(id: number, data: Partial<KitchenStationPayload>) {
  const res = await apiFetch(
    `/api/kitchen/stations/${id}/`,
    { method: "PATCH", body: JSON.stringify(data) },
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

// Toggle station status - Fixed to use PATCH on the main endpoint
export async function toggleKitchenStationStatus(id: number, is_active: boolean) {
  console.log(`🔄 Toggling station ${id} to ${is_active}`);
  
  try {
    const res = await apiFetch(
      `/api/kitchen/stations/${id}/`,
      { 
        method: "PATCH", 
        body: JSON.stringify({ is_active }) 
      },
      true
    );
    
    const json = await res.json();
    if (!res.ok) {
      console.error("❌ Toggle failed:", json);
      throw json;
    }
    console.log("✅ Toggle successful:", json);
    return json;
  } catch (error) {
    console.error("❌ Toggle error:", error);
    throw error;
  }
}

// Delete (deactivate) a kitchen station (Admin/Manager only)
export async function deleteKitchenStation(id: number) {
  console.log(`🗑️ DELETING station ${id} (THIS IS A DELETE OPERATION)`);
  
  const res = await apiFetch(
    `/api/kitchen/stations/${id}/`,
    { method: "DELETE" },
    true
  );
  
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    console.error("❌ Delete failed:", json);
    throw json;
  }
  console.log("✅ Delete successful:", json);
  return json;
}