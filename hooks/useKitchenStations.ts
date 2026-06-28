// hooks/useKitchenStations.ts
import { useState, useEffect, useCallback } from "react";
import {
  getKitchenStations,
  createKitchenStation,
  updateKitchenStation,
  deleteKitchenStation,
  getKitchenStation,
  toggleKitchenStationStatus,
} from "@/lib/kitchenApi";

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

export interface KitchenStationFilters {
  branch?: number;
  is_active?: boolean;
  search?: string;
  ordering?: string;
}

export function useKitchenStations(initialFilters?: KitchenStationFilters) {
  const [stations, setStations] = useState<KitchenStation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<KitchenStationFilters>(
    initialFilters || {}
  );
  const [totalCount, setTotalCount] = useState(0);

  const fetchStations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (filters.branch) params.branch = String(filters.branch);
      if (filters.is_active !== undefined)
        params.is_active = String(filters.is_active);
      if (filters.search) params.search = filters.search;
      if (filters.ordering) params.ordering = filters.ordering;

      const data = await getKitchenStations(params);
      setStations(Array.isArray(data) ? data : data.results || []);
      setTotalCount(data.count || (Array.isArray(data) ? data.length : 0));
    } catch (err: any) {
      setError(err.message || "Failed to fetch kitchen stations");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  const createStation = async (
    data: Omit<KitchenStation, "id" | "created_at" | "updated_at">
  ) => {
    setLoading(true);
    try {
      const newStation = await createKitchenStation(data);
      setStations((prev) => [newStation, ...prev]);
      return newStation;
    } catch (err: any) {
      setError(err.message || "Failed to create kitchen station");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateStation = async (id: number, data: Partial<KitchenStation>) => {
    setLoading(true);
    try {
      const updatedStation = await updateKitchenStation(id, data);
      setStations((prev) =>
        prev.map((station) => (station.id === id ? updatedStation : station))
      );
      return updatedStation;
    } catch (err: any) {
      setError(err.message || "Failed to update kitchen station");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Toggle station status - Fixed with proper error handling
  const toggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      console.log(`🔄 Toggling station ${id} from ${currentStatus} to ${newStatus}`);
      
      const updatedStation = await toggleKitchenStationStatus(id, newStatus);
      console.log("✅ Toggle response:", updatedStation);
      
      // Update the station in the list
      setStations((prev) =>
        prev.map((station) =>
          station.id === id
            ? { ...station, is_active: newStatus }
            : station
        )
      );
      
      return updatedStation;
    } catch (err: any) {
      console.error("❌ Toggle error:", err);
      // Refresh stations to ensure consistency
      await fetchStations();
      throw err;
    }
  };

  const deactivateStation = async (id: number) => {
    setLoading(true);
    try {
      const response = await deleteKitchenStation(id);
      setStations((prev) => prev.filter((station) => station.id !== id));
      return response;
    } catch (err: any) {
      setError(err.message || "Failed to deactivate kitchen station");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    stations,
    loading,
    error,
    filters,
    setFilters,
    totalCount,
    fetchStations,
    createStation,
    updateStation,
    toggleStatus,
    deactivateStation,
  };
}

export function useKitchenStation(id: number) {
  const [station, setStation] = useState<KitchenStation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStation = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getKitchenStation(id);
      setStation(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch kitchen station");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchStation();
  }, [fetchStation]);

  const updateStation = async (data: Partial<KitchenStation>) => {
    if (!id) return;
    setLoading(true);
    try {
      const updated = await updateKitchenStation(id, data);
      setStation(updated);
      return updated;
    } catch (err: any) {
      setError(err.message || "Failed to update kitchen station");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async () => {
    if (!id || !station) return;
    setLoading(true);
    try {
      const newStatus = !station.is_active;
      const updated = await toggleKitchenStationStatus(id, newStatus);
      setStation({ ...station, is_active: newStatus });
      return updated;
    } catch (err: any) {
      setError(err.message || "Failed to toggle station status");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deactivateStation = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await deleteKitchenStation(id);
      setStation(null);
      return response;
    } catch (err: any) {
      setError(err.message || "Failed to deactivate kitchen station");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    station,
    loading,
    error,
    fetchStation,
    updateStation,
    toggleStatus,
    deactivateStation,
  };
}