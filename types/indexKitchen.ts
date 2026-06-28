// types/kitchen.ts
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

export interface KitchenStationCreate {
  name: string;
  branch: number;
  max_capacity: number;
  is_active?: boolean;
}

export interface KitchenStationUpdate {
  name?: string;
  branch?: number;
  max_capacity?: number;
  is_active?: boolean;
}

export interface KitchenStationFilters {
  branch?: number;
  is_active?: boolean;
  search?: string;
  ordering?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}