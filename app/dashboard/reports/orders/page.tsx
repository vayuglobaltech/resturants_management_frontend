"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { listMenuItems } from "@/lib/menuApi";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShoppingBag,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  RefreshCw,
  Calendar,
  Filter,
  Users,
  Table as TableIcon,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Search,
  ArrowUp,
  ArrowDown,
  Minus,
  BarChart3,
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, differenceInMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

type Period = "today" | "week" | "month" | "custom";
type Order = {
  payment_status: string;
  refunded_amount: number;
  table: number | undefined;
  id: number;
  order_number: string;
  status: string;
  total_amount: string;
  user_name: string;
  table_number_display?: number;
  table_number?: number;
  created_at: string;
  confirmed_at: string | null;
  queued_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  delivered_at: string | null;
  items_count: number;
  items?: Array<{
    id: number;
    product: number;
    product_name: string;
    quantity: number;
    price_at_order: string;
    status: string;
    prep_time_minutes?: number;
  }>;
};

type OrderStats = {
  totalOrders: number;
  completedOrders: number;
  activeOrders: number;
  cancelledOrders: number;
  delayedOrders: number;
  averagePrepTime: number;
};

type OrdersByStatus = { status: string; count: number }[];
type OrdersByHour = { hour: string; count: number }[];

export default function OrderReportPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialPeriod = (searchParams.get("period") as Period) || "today";

  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof Order>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const [menuItemsMap, setMenuItemsMap] = useState<Map<number, any>>(new Map());

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

  // ─── Get default prep time by category ──────────────────────────────
  const getDefaultPrepTime = (categoryName: string) => {
    const defaults: Record<string, number> = {
      'Appetizers': 10,
      'Starters': 10,
      'Main Course': 20,
      'Entrees': 20,
      'Pizza': 15,
      'Pasta': 15,
      'Salads': 10,
      'Soups': 12,
      'Seafood': 18,
      'Grill': 25,
      'Desserts': 8,
      'Dessert': 8,
      'Beverages': 3,
      'Drinks': 3,
      'Special': 15,
      'Popular': 15,
    };
    return defaults[categoryName] || 15;
  };

  // ─── Fetch orders ──────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange(period);
      const startStr = format(start, "yyyy-MM-dd");
      const endStr = format(end, "yyyy-MM-dd");

      // Fetch orders and menu items in parallel
      const [ordersRes, menuData] = await Promise.all([
        apiFetch(
          `/api/orders/?created_at__gte=${startStr}&created_at__lte=${endStr}&page_size=2000`,
          {},
          true
        ),
        listMenuItems({ page: 1 })
      ]);

      const ordersData = await ordersRes.json();
      let ordersList = ordersData.results || ordersData || [];
      if (!Array.isArray(ordersList)) ordersList = [];

      // Create menu items map
      const menuItems = menuData.results || menuData || [];
      
      // 🔍 DEBUG: Log menu data structure
      const menuMap = new Map();
      menuItems.forEach((item: any) => {
        menuMap.set(item.id, item);
      });
      setMenuItemsMap(menuMap);

      // 🔍 DEBUG: Check order items

      // Enrich orders with menu prep times
      const enriched = ordersList.map((o: any) => {
        // Enrich items with prep_time from menu
        const enrichedItems = o.items?.map((item: any) => {
          const menuItem = menuMap.get(item.product);
          // Try different possible field names, fallback to default by category
          const prepTime = menuItem?.prep_time_minutes || 
                          menuItem?.prep_time || 
                          menuItem?.preparation_time || 
                          getDefaultPrepTime(menuItem?.category_name) ||
                          0;
          return {
            ...item,
            prep_time_minutes: prepTime
          };
        }) || [];

        return {
          ...o,
          items_count: o.items?.length || 0,
          table_number_display: o.table?.table_number || o.table_number || o.table,
          items: enrichedItems
        };
      });

      setOrders(enriched);
    } catch (error) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, getDateRange]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ─── Get prep time from menu ──────────────────────────────────────
  const getPrepTime = (order: Order) => {
    if (order.items && order.items.length > 0) {
      // Get prep time from first item
      const prepTime = order.items[0]?.prep_time_minutes;
      return prepTime || null;
    }
    return null;
  };

  // ─── Statistics ──────────────────────────────────────────────────────
  const stats = useMemo<OrderStats>(() => {
    const total = orders.length;
    const completed = orders.filter((o: any) => ["DELIVERED", "PAID"].includes(o.status?.toUpperCase())).length;
    const cancelled = orders.filter((o: any) => o.status?.toUpperCase() === "CANCELLED").length;
    const active = total - completed - cancelled;
    const delayed = orders.filter((o: any) => {
      const created = new Date(o.created_at);
      const endTime = o.delivered_at || o.ready_at || o.created_at;
      const minutes = differenceInMinutes(new Date(endTime), created);
      return minutes > 30;
    }).length;

    // Average preparation time from menu
    const prepTimes = orders
      .map((o: any) => {
        if (o.items && o.items.length > 0) {
          return o.items[0]?.prep_time_minutes || null;
        }
        return null;
      })
      .filter((t): t is number => t !== null && t > 0);
    const avgPrep = prepTimes.length ? Math.round(prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length) : 0;

    return { 
      totalOrders: total, 
      completedOrders: completed, 
      activeOrders: active, 
      cancelledOrders: cancelled, 
      delayedOrders: delayed, 
      averagePrepTime: avgPrep 
    };
  }, [orders]);

  // ─── Orders by status ──────────────────────────────────────────────
  const ordersByStatus = useMemo<OrdersByStatus>(() => {
    const statusMap: Record<string, number> = {};
    orders.forEach((o: any) => {
      const st = o.status || "UNKNOWN";
      statusMap[st] = (statusMap[st] || 0) + 1;
    });
    return Object.entries(statusMap).map(([status, count]) => ({ status, count }));
  }, [orders]);

  // ─── Orders by hour ──────────────────────────────────────────────
  const ordersByHour = useMemo<OrdersByHour>(() => {
    const hourMap: Record<string, number> = {};
    orders.forEach((o: any) => {
      const hour = format(new Date(o.created_at), "HH:00");
      hourMap[hour] = (hourMap[hour] || 0) + 1;
    });
    return Object.entries(hourMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([hour, count]) => ({ hour, count }));
  }, [orders]);

  // ─── Colors for charts ──────────────────────────────────────────────
  const STATUS_COLORS: Record<string, string> = {
    PENDING: "#f59e0b",
    CONFIRMED: "#3b82f6",
    QUEUED: "#8b5cf6",
    PREPARING: "#a855f7",
    READY: "#22d3ee",
    DELIVERED: "#34d399",
    PAID: "#10b981",
    CANCELLED: "#ef4444",
  };

  // ─── Sorting and search ──────────────────────────────────────────────
  const filteredAndSorted = useMemo(() => {
    let result = [...orders];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter((o: any) =>
        o.order_number?.toLowerCase().includes(term) ||
        o.user_name?.toLowerCase().includes(term) ||
        String(o.table_number_display || o.table_number || o.table || "").includes(term)
      );
    }
    // Sort
    result.sort((a, b) => {
      let aVal: any = a[sortField as keyof Order] ?? "";
      let bVal: any = b[sortField as keyof Order] ?? "";
      if (sortField === "created_at" || sortField === "confirmed_at") {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }
      if (typeof aVal === "string") {
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === "asc" ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });
    return result;
  }, [orders, searchTerm, sortField, sortDirection]);

  const handleSort = (field: keyof Order) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortIcon = ({ field }: { field: keyof Order }) => {
    if (sortField !== field) return <Minus className="h-3 w-3 opacity-30" />;
    return sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ─── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Order Report</h1>
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
              fetchOrders();
            }}
            disabled={refreshing}
            className="gap-1"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* ─── Summary Cards ────────────────────────────────────────────── */}
      <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-amber-500/20">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="text-lg font-bold">{stats.activeOrders}</p>
            </div>
          </CardContent>
        </Card>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border-indigo-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-indigo-500/20">
              <ShoppingBag className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Orders</p>
              <p className="text-lg font-bold">{stats.totalOrders}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-2 flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-emerald-500/20">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="text-lg font-bold">{stats.completedOrders}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-red-500/20">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cancelled</p>
              <p className="text-lg font-bold">{stats.cancelledOrders}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-rose-500/10 to-rose-500/5 border-rose-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-rose-500/20">
              <AlertCircle className="h-5 w-5 text-rose-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Delayed (&gt;30m)</p>
              <p className="text-lg font-bold">{stats.delayedOrders}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Additional Stats ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border-cyan-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-cyan-500/20">
              <Clock className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg. Preparation Time</p>
              <p className="text-lg font-bold">{formatPrepTime(stats.averagePrepTime)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-purple-500/20">
              <Calendar className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Period</p>
              <p className="text-lg font-bold capitalize">{period}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Charts ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-border lg:col-span-1">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Orders by Status</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ordersByStatus}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    label
                  >
                    {ordersByStatus.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border lg:col-span-2">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Orders by Hour</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ordersByHour}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="hour" className="text-xs text-muted-foreground" />
                  <YAxis className="text-xs text-muted-foreground" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#818cf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Search and Table ────────────────────────────────────────── */}
      <Card className="border-border">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3">
          <h3 className="font-semibold text-foreground flex-1">Order Details</h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground font-semibold">
                <tr>
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("order_number")}
                  >
                    <div className="flex items-center gap-1">
                      Order <SortIcon field="order_number" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center gap-1">
                      Type <SortIcon field="status" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("table_number_display")}
                  >
                    <div className="flex items-center gap-1">
                      Table <SortIcon field="table_number_display" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("user_name")}
                  >
                    <div className="flex items-center gap-1">
                      Waiter <SortIcon field="user_name" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-right cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("total_amount")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Amount <SortIcon field="total_amount" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center gap-1">
                      Status <SortIcon field="status" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-right cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("created_at")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Prep Time <SortIcon field="created_at" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("created_at")}
                  >
                    <div className="flex items-center gap-1">
                      Created <SortIcon field="created_at" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAndSorted.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      {searchTerm ? "No orders match your search." : "No orders found for this period."}
                    </td>
                  </tr>
                ) : (
                  filteredAndSorted.map((order) => {
                    // Get prep time from menu
                    const prepTime = getPrepTime(order);
                    const displayStatus = order.payment_status || order.status;
                    
                    return (
                      <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">
                          {order.order_number}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">Dine‑in</td>
                        <td className="px-4 py-3">
                          {order.table_number_display || "—"}
                        </td>
                        <td className="px-4 py-3">{order.user_name || "—"}</td>
                        <td className="px-4 py-3 text-right">
                          {order.payment_status === 'REFUNDED' || order.payment_status === 'PARTIALLY_REFUNDED'
                            ? `$${Number(order.refunded_amount || 0).toFixed(2)}`
                            : formatCurrency(Number(order.total_amount || 0))}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full border",
                              order.status === "DELIVERED" || order.status === "PAID"
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                : order.status === "CANCELLED"
                                ? "bg-red-500/20 text-red-400 border-red-500/30"
                                : order.status === "PENDING" || order.status === "CONFIRMED"
                                ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                            )}
                          >
                            {displayStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {prepTime !== null && prepTime > 0 ? formatPrepTime(prepTime) : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {format(new Date(order.created_at), "MMM dd, hh:mm a")}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
        <div className="p-3 border-t border-border text-xs text-muted-foreground flex justify-between">
          <span>
            Showing {filteredAndSorted.length} of {orders.length} orders
          </span>
          <span>
            {stats.completedOrders} completed • {stats.activeOrders} active • {stats.cancelledOrders} cancelled
          </span>
        </div>
      </Card>
    </div>
  );
}