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
// types/product.types.ts
export interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  category?: string;
}

export interface Branch {
  id: number;
  name: string;
  location?: string;
}

export interface ProductAvailability {
  id: number;
  branch: number | Branch;
  product: number | Product;
  is_available: boolean;
  quantity?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProductAvailabilityFormData {
  branch: number;
  product: number;
  is_available: boolean;
}

export interface ApiResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
// types/inventory.ts
export interface InventoryTransaction {
  id: number;
  branch: number;
  ingredient: number;
  ingredient_name?: string;
  transaction_type: string;
  quantity: number;
  unit: string;
  status: string;
  location?: string;
  reason: string;
  performed_by?: number;
  performed_by_name?: string;
  timestamp: string;
}

export interface CreateTransactionData {
  branch: number;
  ingredient: number;
  transaction_type: string;
  quantity: number;
  unit: string;
  status?: string;
  location?: string;
  reason?: string;
}

export interface TransactionFilters {
  branch?: number;
  ingredient?: number;
  transaction_type?: string;
  status?: string;
  ordering?: string;
}

// types/index.ts (add these to your existing types file)

export interface AccountingSummary {
  todayRevenue: number;
  monthlyRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  grossProfitMargin: number;
  pendingExpenses: number;
  pendingAdjustments: number;
}

export interface ShiftClosingFormData {
  shift_date: string;
  shift_number: number;
  branch: number;
  cashier?: number;
}

export interface ExpenseFormData {
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  payment_method: string;
  receipt_number?: string;
  vendor_name?: string;
  branch: number;
}

export interface InventoryAdjustmentFormData {
  ingredient: number;
  system_quantity: number;
  physical_quantity: number;
  variance_quantity: number;
  unit: string;
  unit_cost: number;
  variance_cost: number;
  adjustment_reason: string;
  notes?: string;
  adjustment_date: string;
  branch: number;
}