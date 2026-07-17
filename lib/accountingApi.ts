// lib/accountingApi.ts
import { apiFetch } from './api';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface JournalEntry {
  id: number;
  transaction_type: string;
  transaction_date: string;
  debit_account: string;
  debit_amount: string;
  credit_account: string;
  credit_amount: string;
  reference_id: string | null;
  description: string;
  branch: number;
  is_posted: boolean;
  posted_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface SalesTransaction {
  id: number;
  order: number;
  payment: number;
  revenue_amount: string;
  payment_method: string;
  cash_amount: string;
  digital_amount: string;
  branch: number;
  cashier: number | null;
  journal_entry: number | null;
  created_at: string;
  updated_at: string;
}

export interface COGSTransaction {
  id: number;
  order_item: number;
  order: number;
  product: number;
  quantity_sold: string;
  cost_per_unit: string;
  total_cogs: string;
  branch: number;
  prepared_by: number | null;
  journal_entry: number | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryPurchaseTransaction {
  id: number;
  inventory_transaction: number | null;
  ingredient: number;
  quantity_purchased: string;
  unit_cost: string;
  total_purchase_cost: string;
  supplier_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  payment_status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  amount_paid: string;
  branch: number;
  journal_entry: number | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierPayable {
  id: number;
  supplier_name: string;
  total_outstanding_amount: string;
  invoices_count: number;
  oldest_invoice_date: string | null;
  branch: number;
  created_at: string;
  updated_at: string;
}

export interface ShiftClosing {
  id: number;
  branch: number;
  cashier: number | null;
  shift_date: string;
  shift_number: number;
  expected_cash: string;
  actual_cash_counted: string | null;
  variance_amount: string;
  variance_percentage: string;
  total_cash_sales: string;
  total_digital_sales: string;
  total_sales: string;
  status: 'OPEN' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  approved_by: number | null;
  approval_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseEntry {
  id: number;
  branch: number;
  category: string;
  description: string;
  amount: string;
  expense_date: string;
  payment_method: string;
  receipt_number: string | null;
  vendor_name: string | null;
  is_approved: boolean;
  approved_by: number | null;
  journal_entry: number | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryAdjustment {
  id: number;
  branch: number;
  ingredient: number;
  system_quantity: string;
  physical_quantity: string;
  variance_quantity: string;
  unit: string;
  unit_cost: string;
  variance_cost: string;
  adjustment_reason: string;
  notes: string | null;
  adjustment_date: string;
  is_approved: boolean;
  approved_by: number | null;
  journal_entry: number | null;
  created_at: string;
  updated_at: string;
}

export interface DailySalesSummary {
  date: string;
  shift_number: number;
  total_cash_sales: string;
  total_digital_sales: string;
  total_sales: string;
  number_of_orders: number;
  average_order_value: string;
  payment_breakdown: {
    cash: string;
    digital: string;
    total: string;
  };
}

export interface GrossProfitReport {
  period_start: string;
  period_end: string;
  total_revenue: string;
  total_cogs: string;
  gross_profit: string;
  gross_profit_margin_percentage: string;
  transaction_count: number;
}

export interface MonthlyPnLReport {
  month: string;
  total_sales: string;
  total_cogs: string;
  total_expenses: string;
  gross_profit: string;
  net_profit: string;
  net_profit_margin_percentage: string;
  expense_breakdown: Record<string, string>;
}

export interface ShrinkageReport {
  period_start: string;
  period_end: string;
  total_system_inventory_value: string;
  total_physical_inventory_value: string;
  shrinkage_value: string;
  shrinkage_percentage: string;
  by_reason: Record<string, string>;
}

// ─── Transaction APIs ────────────────────────────────────────────────────────

/**
 * Get sales transactions
 */
export async function getSalesTransactions(params?: {
  branch?: number;
  payment_method?: string;
  ordering?: string;
  limit?: number;
  offset?: number;
}) {
  const query = params ? new URLSearchParams(params as any).toString() : '';
  const res = await apiFetch(
    `/api/accounting/sales-transactions/${query ? '?' + query : ''}`,
    {},
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

/**
 * Get COGS transactions
 */
export async function getCOGSTransactions(params?: {
  branch?: number;
  product?: number;
  ordering?: string;
  limit?: number;
  offset?: number;
}) {
  const query = params ? new URLSearchParams(params as any).toString() : '';
  const res = await apiFetch(
    `/api/accounting/cogs-transactions/${query ? '?' + query : ''}`,
    {},
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

/**
 * Get inventory purchase transactions
 */
export async function getInventoryPurchases(params?: {
  branch?: number;
  payment_status?: string;
  supplier_name?: string;
  ordering?: string;
  limit?: number;
  offset?: number;
}) {
  const query = params ? new URLSearchParams(params as any).toString() : '';
  const res = await apiFetch(
    `/api/accounting/inventory-purchases/${query ? '?' + query : ''}`,
    {},
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

/**
 * Get journal entries (Admin only)
 */
export async function getJournalEntries(params?: {
  branch?: number;
  transaction_type?: string;
  is_posted?: boolean;
  ordering?: string;
  limit?: number;
  offset?: number;
}) {
  const query = params ? new URLSearchParams(params as any).toString() : '';
  const res = await apiFetch(
    `/api/accounting/journal-entries/${query ? '?' + query : ''}`,
    {},
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

// ─── Shift Closing APIs ──────────────────────────────────────────────────────

/**
 * Get shift closings
 */
export async function getShiftClosings(params?: {
  branch?: number;
  shift_date?: string;
  status?: string;
  ordering?: string;
  limit?: number;
  offset?: number;
}) {
  const query = params ? new URLSearchParams(params as any).toString() : '';
  const res = await apiFetch(
    `/api/accounting/shift-closings/${query ? '?' + query : ''}`,
    {},
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

/**
 * Create a new shift closing
 */
export async function createShiftClosing(data: {
  shift_date: string;
  shift_number: number;
  branch: number;
  cashier?: number;
}) {
  const res = await apiFetch(
    '/api/accounting/shift-closings/',
    { method: 'POST', body: JSON.stringify(data) },
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

/**
 * Update a shift closing
 */
export async function updateShiftClosing(id: number, data: {
  actual_cash_counted?: number;
  status?: string;
  approval_notes?: string;
}) {
  const res = await apiFetch(
    `/api/accounting/shift-closings/${id}/`,
    { method: 'PATCH', body: JSON.stringify(data) },
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

/**
 * Approve a shift closing
 */
export async function approveShiftClosing(id: number, notes?: string) {
  const res = await apiFetch(
    `/api/accounting/shift-closings/${id}/approve_shift/`,
    { method: 'POST', body: JSON.stringify({ approval_notes: notes }) },
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

// ─── Expense APIs ────────────────────────────────────────────────────────────

/**
 * Get expenses
 */
export async function getExpenses(params?: {
  branch?: number;
  category?: string;
  is_approved?: boolean;
  expense_date?: string;
  ordering?: string;
  limit?: number;
  offset?: number;
}) {
  const query = params ? new URLSearchParams(params as any).toString() : '';
  const res = await apiFetch(
    `/api/accounting/expenses/${query ? '?' + query : ''}`,
    {},
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

/**
 * Create a new expense
 */
export async function createExpense(data: {
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  payment_method: string;
  receipt_number?: string;
  vendor_name?: string;
  branch: number;
}) {
  const res = await apiFetch(
    '/api/accounting/expenses/',
    { method: 'POST', body: JSON.stringify(data) },
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

/**
 * Update an expense
 */
export async function updateExpense(id: number, data: Partial<ExpenseEntry>) {
  const res = await apiFetch(
    `/api/accounting/expenses/${id}/`,
    { method: 'PATCH', body: JSON.stringify(data) },
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

/**
 * Approve an expense
 */
export async function approveExpense(id: number) {
  const res = await apiFetch(
    `/api/accounting/expenses/${id}/approve_expense/`,
    { method: 'POST' },
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

/**
 * Delete an expense (Admin only)
 */
export async function deleteExpense(id: number) {
  const res = await apiFetch(
    `/api/accounting/expenses/${id}/`,
    { method: 'DELETE' },
    true
  );
  if (res.status === 204) return null;
  const json = await res.json().catch(() => null);
  if (!res.ok) throw json;
  return json;
}

// ─── Inventory Adjustment APIs ─────────────────────────────────────────────

/**
 * Get inventory adjustments
 */
export async function getInventoryAdjustments(params?: {
  branch?: number;
  adjustment_reason?: string;
  is_approved?: boolean;
  adjustment_date?: string;
  ordering?: string;
  limit?: number;
  offset?: number;
}) {
  const query = params ? new URLSearchParams(params as any).toString() : '';
  const res = await apiFetch(
    `/api/accounting/inventory-adjustments/${query ? '?' + query : ''}`,
    {},
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

/**
 * Create an inventory adjustment
 */
export async function createInventoryAdjustment(data: {
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
}) {
  const res = await apiFetch(
    '/api/accounting/inventory-adjustments/',
    { method: 'POST', body: JSON.stringify(data) },
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

/**
 * Approve an inventory adjustment
 */
export async function approveInventoryAdjustment(id: number) {
  const res = await apiFetch(
    `/api/accounting/inventory-adjustments/${id}/approve_adjustment/`,
    { method: 'POST' },
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

// ─── Supplier Payables APIs ─────────────────────────────────────────────────

/**
 * Get supplier payables
 */
export async function getSupplierPayables(params?: {
  branch?: number;
  supplier_name?: string;
  ordering?: string;
  limit?: number;
  offset?: number;
}) {
  const query = params ? new URLSearchParams(params as any).toString() : '';
  const res = await apiFetch(
    `/api/accounting/supplier-payables/${query ? '?' + query : ''}`,
    {},
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

// ─── Report APIs ────────────────────────────────────────────────────────────

/**
 * Get daily sales summary with optional branch filter
 */
export async function getDailySalesSummary(
  date: string, 
  shiftNumber: number = 1, 
  branchId?: number
) {
  const params: any = {
    date,
    shift_number: shiftNumber.toString(),
  };
  if (branchId) {
    params.branch = branchId;
  }
  
  const query = new URLSearchParams(params).toString();
  
  const res = await apiFetch(
    `/api/accounting/reports/daily-sales-summary/?${query}`,
    {},
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json as DailySalesSummary;
}

/**
 * Get gross profit report with optional branch filter
 */
export async function getGrossProfitReport(
  startDate: string, 
  endDate: string, 
  branchId?: number
) {
  const params: any = {
    start_date: startDate,
    end_date: endDate,
  };
  if (branchId) {
    params.branch = branchId;
  }
  
  const query = new URLSearchParams(params).toString();
  
  const res = await apiFetch(
    `/api/accounting/reports/gross-profit/?${query}`,
    {},
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json as GrossProfitReport;
}

/**
 * Get monthly P&L report with optional branch filter (Admin only)
 */
export async function getMonthlyPnL(month: string, branchId?: number) {
  const params: any = { month };
  if (branchId) {
    params.branch = branchId;
  }
  
  const query = new URLSearchParams(params).toString();
  
  const res = await apiFetch(
    `/api/accounting/reports/monthly-pnl/?${query}`,
    {},
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json as MonthlyPnLReport;
}

/**
 * Get shrinkage report with optional branch filter
 */
export async function getShrinkageReport(
  startDate: string, 
  endDate: string, 
  branchId?: number
) {
  const params: any = {
    start_date: startDate,
    end_date: endDate,
  };
  if (branchId) {
    params.branch = branchId;
  }
  
  const query = new URLSearchParams(params).toString();
  
  const res = await apiFetch(
    `/api/accounting/reports/shrinkage/?${query}`,
    {},
    true
  );
  const json = await res.json();
  if (!res.ok) throw json;
  return json as ShrinkageReport;
}

// ─── Dashboard Summary API ──────────────────────────────────────────────────

/**
 * Get accounting dashboard summary with optional branch filter
 */
export async function getAccountingSummary(branchId?: number) {
  const today = new Date().toISOString().split('T')[0];
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStr = monthStart.toISOString().split('T')[0];
  
  try {
    // Fetch all data in parallel with branch filter
    const [dailySales, grossProfit, pendingExpenses, pendingAdjustments] = await Promise.all([
      getDailySalesSummary(today, 1, branchId),
      getGrossProfitReport(monthStr, today, branchId),
      getExpenses({ is_approved: false, branch: branchId }),
      getInventoryAdjustments({ is_approved: false, branch: branchId }),
    ]);
    
    return {
      todayRevenue: parseFloat(dailySales.total_sales || '0'),
      monthlyRevenue: parseFloat(grossProfit.total_revenue || '0'),
      totalCOGS: parseFloat(grossProfit.total_cogs || '0'),
      grossProfit: parseFloat(grossProfit.gross_profit || '0'),
      grossProfitMargin: parseFloat(grossProfit.gross_profit_margin_percentage || '0'),
      pendingExpenses: pendingExpenses?.results?.length || 0,
      pendingAdjustments: pendingAdjustments?.results?.length || 0,
      dailySales: dailySales,
    };
  } catch (error) {
    console.error('Failed to fetch accounting summary:', error);
    throw error;
  }
}

export async function getProductSalesAnalytics(
 startDate: string,
 endDate: string,
 branchId?: number,
 limit: number = 10
) {
 const params: any = {
   start_date: startDate,
   end_date: endDate,
   limit: limit,
 };
 if (branchId) {
   params.branch = branchId;
 }
 
 const query = new URLSearchParams(params).toString();
 
 const res = await apiFetch(
   `/api/accounting/analytics/product-sales/?${query}`,
   {},
   true
 );
 const json = await res.json();
 if (!res.ok) throw json;
 return json;
}

/**
* Get hourly sales analytics for insights
*/
export async function getHourlySalesAnalytics(
 startDate: string,
 endDate: string,
 branchId?: number
) {
 const params: any = {
   start_date: startDate,
   end_date: endDate,
 };
 if (branchId) {
   params.branch = branchId;
 }
 
 const query = new URLSearchParams(params).toString();
 
 const res = await apiFetch(
   `/api/accounting/analytics/hourly-sales/?${query}`,
   {},
   true
 );
 const json = await res.json();
 if (!res.ok) throw json;
 return json;
}

/**
* Get daily sales trend for insights
*/
export async function getDailySalesTrend(
 startDate: string,
 endDate: string,
 branchId?: number
) {
 const params: any = {
   start_date: startDate,
   end_date: endDate,
 };
 if (branchId) {
   params.branch = branchId;
 }
 
 const query = new URLSearchParams(params).toString();
 
 const res = await apiFetch(
   `/api/accounting/analytics/daily-sales-trend/?${query}`,
   {},
   true
 );
 const json = await res.json();
 if (!res.ok) throw json;
 return json;
}