"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  User,
  Coffee,
  ChefHat,
  DollarSign,
  ShoppingBag,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Calendar,
  TrendingUp,
  TrendingDown,
  Search,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, differenceInMinutes } from "date-fns";
import { cn } from "@/lib/utils";

type Period = "today" | "week" | "month" | "custom";

// ─── Types ──────────────────────────────────────────────────────────────
type WaiterStats = {
  user_id: number;
  user_name: string;
  orders_handled: number;
  tables_served: number;
  sales_handled: number;
  cancelled_orders: number;
  average_order_value: number;
};

type CashierStats = {
  user_id: number;
  user_name: string;
  transactions_processed: number;
  total_collection: number;
  refunds: number;
  cash_shortage_excess: number; // placeholder
};

type KitchenStats = {
  user_id: number;
  user_name: string;
  orders_prepared: number;
  average_prep_time: number; // minutes
  delayed_orders: number; // orders where prep_time > 30 min
};

type Employee = {
  id: number;
  username: string;
  role: string;
};

// ─── Component ──────────────────────────────────────────────────────────
export default function EmployeePerformancePage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialPeriod = (searchParams.get("period") as Period) || "today";

  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"waiters" | "cashiers" | "kitchen">("waiters");

  // ─── Data states ──────────────────────────────────────────────────────
  const [waiters, setWaiters] = useState<WaiterStats[]>([]);
  const [cashiers, setCashiers] = useState<CashierStats[]>([]);
  const [kitchen, setKitchen] = useState<KitchenStats[]>([]);

  // ─── Date range helpers ──────────────────────────────────────────────
  const getDateRange = useCallback((period: Period) => {
    const now = new Date();
    const today = startOfDay(now);
    switch (period) {
      case "today":
        return { start: today, end: endOfDay(now) };
      case "week":
        return { start: subDays(today, 7), end: endOfDay(now) };
      case "month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "custom":
        return { start: today, end: endOfDay(now) };
    }
  }, []);

  // ─── Fetch all data ──────────────────────────────────────────────────
  const fetchEmployeeData = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange(period);
      const startStr = format(start, "yyyy-MM-dd");
      const endStr = format(end, "yyyy-MM-dd");

      // ─── 1. Fetch all users (to get roles) ──────────────────────────
      const usersRes = await apiFetch(`/api/users/?page_size=1000`, {}, true);
      const usersData = await usersRes.json();
      const allUsers = usersData.results || usersData || [];
      const userMap = new Map<number, Employee>();
      allUsers.forEach((u: any) => {
        userMap.set(u.id, {
          id: u.id,
          username: u.username,
          role: u.role?.name || "unknown",
        });
      });

      // ─── 2. Fetch orders for waiters ────────────────────────────────
      const ordersRes = await apiFetch(
        `/api/orders/?created_at__gte=${startStr}&created_at__lte=${endStr}&page_size=2000`,
        {},
        true
      );
      const ordersData = await ordersRes.json();
      const orders = ordersData.results || ordersData || [];

      // ─── 3. Fetch payments for cashiers ─────────────────────────────
      const paymentsRes = await apiFetch(
        `/api/orders/payments/?status=COMPLETED&created_at__gte=${startStr}&created_at__lte=${endStr}&page_size=2000`,
        {},
        true
      );
      const paymentsData = await paymentsRes.json();
      const payments = paymentsData.results || paymentsData || [];

      // ─── 4. Fetch COGS transactions for kitchen staff ───────────────
      let cogsItems: any[] = [];
      try {
        const cogsRes = await apiFetch(
          `/api/accounting/cogs-transactions/?created_at__gte=${startStr}&created_at__lte=${endStr}&page_size=2000`,
          {},
          true
        );
        const cogsData = await cogsRes.json();
        cogsItems = cogsData.results || cogsData || [];
      } catch (e) {
        console.warn("COGS endpoint not available, using order timestamps for kitchen");
      }

      // ─── 5. Compute Waiter Stats ─────────────────────────────────────
      const waiterMap = new Map<number, WaiterStats>();
      const waiterUsers = allUsers.filter((u: any) => u.role?.name === "waiter");
      waiterUsers.forEach((u: any) => {
        waiterMap.set(u.id, {
          user_id: u.id,
          user_name: u.username,
          orders_handled: 0,
          tables_served: 0,
          sales_handled: 0,
          cancelled_orders: 0,
          average_order_value: 0,
        });
      });

      const tablesPerWaiter: Record<number, Set<number>> = {};
      orders.forEach((o: any) => {
        const waiterId = o.user;
        if (!waiterId || !waiterMap.has(waiterId)) return;
        const stat = waiterMap.get(waiterId)!;
        stat.orders_handled += 1;
        if (o.table) {
          if (!tablesPerWaiter[waiterId]) tablesPerWaiter[waiterId] = new Set();
          tablesPerWaiter[waiterId].add(o.table);
        }
        const amount = Number(o.total_amount || 0);
        if (o.status?.toUpperCase() !== "CANCELLED") {
          stat.sales_handled += amount;
        } else {
          stat.cancelled_orders += 1;
        }
      });
      waiterMap.forEach((stat, id) => {
        stat.tables_served = tablesPerWaiter[id]?.size || 0;
        stat.average_order_value = stat.orders_handled > 0 ? stat.sales_handled / stat.orders_handled : 0;
      });
      setWaiters(Array.from(waiterMap.values()));

      // ─── 6. Compute Cashier Stats ──────────────────────────────────
      const cashierMap = new Map<number, CashierStats>();
      const cashierUsers = allUsers.filter((u: any) => u.role?.name === "cashier");
      cashierUsers.forEach((u: any) => {
        cashierMap.set(u.id, {
          user_id: u.id,
          user_name: u.username,
          transactions_processed: 0,
          total_collection: 0,
          refunds: 0,
          cash_shortage_excess: 0,
        });
      });

      payments.forEach((p: any) => {
        const cashierId = p.cashier;
        if (!cashierId || !cashierMap.has(cashierId)) return;
        const stat = cashierMap.get(cashierId)!;
        stat.transactions_processed += 1;
        stat.total_collection += Number(p.amount || 0);
      });
      setCashiers(Array.from(cashierMap.values()));

      // ─── 7. Compute Kitchen Stats ──────────────────────────────────
      const kitchenMap = new Map<number, KitchenStats>();
      const kitchenUsers = allUsers.filter((u: any) => u.role?.name === "kitchen_staff");
      kitchenUsers.forEach((u: any) => {
        kitchenMap.set(u.id, {
          user_id: u.id,
          user_name: u.username,
          orders_prepared: 0,
          average_prep_time: 0,
          delayed_orders: 0,
        });
      });

      if (cogsItems.length > 0) {
        const prepTimes: Record<number, number[]> = {};
        cogsItems.forEach((c: any) => {
          const kitchenId = c.prepared_by;
          if (!kitchenId || !kitchenMap.has(kitchenId)) return;
          const stat = kitchenMap.get(kitchenId)!;
          stat.orders_prepared += 1;
          const order = orders.find((o: any) => o.id === c.order);
          if (order && order.confirmed_at && order.ready_at) {
            const prep = differenceInMinutes(new Date(order.ready_at), new Date(order.confirmed_at));
            if (!prepTimes[kitchenId]) prepTimes[kitchenId] = [];
            prepTimes[kitchenId].push(prep);
            if (prep > 30) stat.delayed_orders += 1;
          }
        });
        kitchenMap.forEach((stat, id) => {
          const times = prepTimes[id] || [];
          stat.average_prep_time = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
        });
      } else {
        // Fallback: aggregate kitchen stats
        const allPrepTimes: number[] = [];
        orders.forEach((o: any) => {
          if (o.confirmed_at && o.ready_at) {
            const prep = differenceInMinutes(new Date(o.ready_at), new Date(o.confirmed_at));
            allPrepTimes.push(prep);
          }
        });
        const avgPrep = allPrepTimes.length > 0 ? allPrepTimes.reduce((a, b) => a + b, 0) / allPrepTimes.length : 0;
        kitchenMap.forEach((stat) => {
          stat.average_prep_time = avgPrep;
        });
      }
      setKitchen(Array.from(kitchenMap.values()));
    } catch (error) {
      console.error("Failed to fetch employee data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, getDateRange]);

  useEffect(() => {
    fetchEmployeeData();
  }, [fetchEmployeeData]);

  // ─── Helpers ──────────────────────────────────────────────────────────
  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const formatPrepTime = (minutes: number) => {
    if (minutes < 1) return "< 1m";
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}h ${m}m`;
  };

  // ─── Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-64" />
        </div>
        <Skeleton className="h-10 w-full max-w-xs" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Employee Performance</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Button
              variant={period === "today" ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod("today")}
            >
              Today
            </Button>
            <Button
              variant={period === "week" ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod("week")}
            >
              Week
            </Button>
            <Button
              variant={period === "month" ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod("month")}
            >
              Month
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setRefreshing(true);
              fetchEmployeeData();
            }}
            disabled={refreshing}
            className="gap-1"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* ─── Custom Tabs ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab("waiters")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            activeTab === "waiters"
              ? "bg-indigo-500/20 text-indigo-400"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <Coffee className="inline h-4 w-4 mr-2" /> Waiters
        </button>
        <button
          onClick={() => setActiveTab("cashiers")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            activeTab === "cashiers"
              ? "bg-indigo-500/20 text-indigo-400"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <DollarSign className="inline h-4 w-4 mr-2" /> Cashiers
        </button>
        <button
          onClick={() => setActiveTab("kitchen")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            activeTab === "kitchen"
              ? "bg-indigo-500/20 text-indigo-400"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <ChefHat className="inline h-4 w-4 mr-2" /> Kitchen
        </button>
      </div>

      {/* ─── Waiters Tab ────────────────────────────────────────────── */}
      {activeTab === "waiters" && (
        <div className="space-y-4">
          {waiters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No waiter data for this period.</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border-indigo-500/20">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-indigo-500/20">
                      <Users className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Waiters</p>
                      <p className="text-lg font-bold">{waiters.length}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-emerald-500/20">
                      <ShoppingBag className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Orders Handled</p>
                      <p className="text-lg font-bold">
                        {waiters.reduce((sum, w) => sum + w.orders_handled, 0)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-amber-500/20">
                      <DollarSign className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Sales Handled</p>
                      <p className="text-lg font-bold">
                        {formatCurrency(waiters.reduce((sum, w) => sum + w.sales_handled, 0))}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-xs uppercase text-muted-foreground font-semibold">
                      <tr>
                        <th className="px-4 py-3 text-left">Waiter</th>
                        <th className="px-4 py-3 text-right">Orders Handled</th>
                        <th className="px-4 py-3 text-right">Tables Served</th>
                        <th className="px-4 py-3 text-right">Sales Handled</th>
                        <th className="px-4 py-3 text-right">Cancelled</th>
                        <th className="px-4 py-3 text-right">Avg Order Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {waiters.map((w) => (
                        <tr key={w.user_id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">{w.user_name}</td>
                          <td className="px-4 py-3 text-right">{w.orders_handled}</td>
                          <td className="px-4 py-3 text-right">{w.tables_served}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatCurrency(w.sales_handled)}</td>
                          <td className="px-4 py-3 text-right text-red-400">{w.cancelled_orders}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(w.average_order_value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-3 border-t border-border text-xs text-muted-foreground">
                  {waiters.length} waiters • {waiters.reduce((sum, w) => sum + w.orders_handled, 0)} orders
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ─── Cashiers Tab ────────────────────────────────────────────── */}
      {activeTab === "cashiers" && (
        <div className="space-y-4">
          {cashiers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No cashier data for this period.</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border-indigo-500/20">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-indigo-500/20">
                      <Users className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Cashiers</p>
                      <p className="text-lg font-bold">{cashiers.length}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-emerald-500/20">
                      <CheckCircle className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Transactions</p>
                      <p className="text-lg font-bold">
                        {cashiers.reduce((sum, c) => sum + c.transactions_processed, 0)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-amber-500/20">
                      <DollarSign className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Collection</p>
                      <p className="text-lg font-bold">
                        {formatCurrency(cashiers.reduce((sum, c) => sum + c.total_collection, 0))}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-xs uppercase text-muted-foreground font-semibold">
                      <tr>
                        <th className="px-4 py-3 text-left">Cashier</th>
                        <th className="px-4 py-3 text-right">Transactions</th>
                        <th className="px-4 py-3 text-right">Total Collection</th>
                        <th className="px-4 py-3 text-right">Refunds</th>
                        <th className="px-4 py-3 text-right">Cash Δ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {cashiers.map((c) => (
                        <tr key={c.user_id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">{c.user_name}</td>
                          <td className="px-4 py-3 text-right">{c.transactions_processed}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatCurrency(c.total_collection)}</td>
                          <td className="px-4 py-3 text-right text-red-400">{formatCurrency(c.refunds)}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(c.cash_shortage_excess)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-3 border-t border-border text-xs text-muted-foreground">
                  {cashiers.length} cashiers • {cashiers.reduce((sum, c) => sum + c.transactions_processed, 0)} transactions
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ─── Kitchen Tab ────────────────────────────────────────────── */}
      {activeTab === "kitchen" && (
        <div className="space-y-4">
          {kitchen.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No kitchen data for this period. (Make sure COGS transactions are recorded.)
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border-indigo-500/20">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-indigo-500/20">
                      <ChefHat className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Kitchen Staff</p>
                      <p className="text-lg font-bold">{kitchen.length}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-emerald-500/20">
                      <CheckCircle className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Orders Prepared</p>
                      <p className="text-lg font-bold">
                        {kitchen.reduce((sum, k) => sum + k.orders_prepared, 0)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-rose-500/10 to-rose-500/5 border-rose-500/20">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-rose-500/20">
                      <Clock className="h-5 w-5 text-rose-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Avg. Prep Time</p>
                      <p className="text-lg font-bold">
                        {formatPrepTime(
                          kitchen.reduce((sum, k) => sum + k.average_prep_time, 0) / kitchen.length
                        )}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-xs uppercase text-muted-foreground font-semibold">
                      <tr>
                        <th className="px-4 py-3 text-left">Chef</th>
                        <th className="px-4 py-3 text-right">Orders Prepared</th>
                        <th className="px-4 py-3 text-right">Avg Prep Time</th>
                        <th className="px-4 py-3 text-right">Delayed (&gt;30m)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {kitchen.map((k) => (
                        <tr key={k.user_id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">{k.user_name}</td>
                          <td className="px-4 py-3 text-right">{k.orders_prepared}</td>
                          <td className="px-4 py-3 text-right">{formatPrepTime(k.average_prep_time)}</td>
                          <td className="px-4 py-3 text-right text-red-400">{k.delayed_orders}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-3 border-t border-border text-xs text-muted-foreground">
                  {kitchen.length} kitchen staff • {kitchen.reduce((sum, k) => sum + k.orders_prepared, 0)} orders prepared
                </div>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}