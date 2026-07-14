"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { KanbanBoard } from "@/components/orders/KanbanBoard";
import { listOrders, getTable } from "@/lib/ordersApi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  RefreshCw,
  Clock,
  CookingPot,
  CheckCircle2,
  DollarSign,
  Timer,
  X,
  Table as TableIcon,
  LayoutGrid,
  List,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Check,
  ChevronDown,
  Zap,
  Users,
  CreditCard,
  Package,
  Filter
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Order {
  id: number;
  order_number: string;
  status: string;
  total_amount: string;
  table_number_display?: number;
  table?: number;
  items?: any[];
  created_at: string;
  updated_at?: string;
  paid_at?: string;
  cancelled_at?: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  subtitle?: string;
  trend?: number;
  trendLabel?: string;
}

// ─── Components ──────────────────────────────────────────────────────────────

// Enhanced Stat Card with new layout: Icon + Title on same line, Value + Percentage below, Subtitle at bottom
function StatCard({ title, value, icon, color = "text-indigo-400", subtitle, trend, trendLabel }: StatCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-background/80 to-muted/30 p-4 shadow-sm transition-all hover:shadow-xl hover:border-primary/20"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated gradient overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0"
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />
      
      <div className="relative">
        {/* Row 1: Icon + Title in same line */}
        <div className="flex items-center gap-2.5 mb-2">
          <motion.div
            animate={isHovered ? { rotate: [0, -10, 10, -5, 5, 0] } : {}}
            transition={{ duration: 0.5 }}
            className={cn(
              "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-background to-muted shadow-sm",
              color
            )}
          >
            {icon}
          </motion.div>
          
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground truncate">
            {title}
          </p>
        </div>
        
        {/* Row 2: Value + Percentage in same line */}
        <div className="flex items-center  justify-between mt-0.5">
          <motion.p
            key={String(value)}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="text-2xl sm:text-3xl font-bold text-foreground"
          >
            {value}
          </motion.p>
          
          {trend !== undefined && trend !== null && (
            <div className="flex items-center gap-1">
              <span className={cn(
                "flex items-center gap-0.5 text-[11px] font-medium px-2 py-0.5 rounded-full",
                trend >= 0 
                  ? "text-emerald-400 bg-emerald-500/10" 
                  : "text-red-400 bg-red-500/10"
              )}>
                {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(trend)}%
              </span>
              {trendLabel && (
                <span className="text-[9px] text-muted-foreground hidden sm:inline">{trendLabel}</span>
              )}
            </div>
          )}
        </div>
        
        {/* Row 3: Subtitle full width */}
        {subtitle && (
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-1.5 w-full">{subtitle}</p>
        )}
      </div>
    </motion.div>
  );
}

// Quick Action Button
function QuickAction({ icon, label, onClick, color = "default" }: any) {
  return (
    <motion.button
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 sm:gap-2 rounded-xl px-2.5 sm:px-4 py-1.5 sm:py-2.5 text-[10px] sm:text-sm font-medium transition-all",
        "border border-border bg-background/80 hover:shadow-lg",
        color === "primary" && "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20",
        color === "success" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
        color === "warning" && "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
      )}
    >
      {icon}
      <span className="hidden xs:inline">{label}</span>
    </motion.button>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const roleName = typeof user?.role === "object" && user?.role !== null && "name" in user.role
    ? String(user.role.name)
    : typeof user?.role === "string" ? user.role : "";
  
  const canCreateOrder = Boolean(roleName && ["cashier"].includes(roleName));
  const isManager = user?.role === "admin" || user?.role === "branch_manager";

  const tableId = searchParams.get("table");
  const [activeTableName, setActiveTableName] = useState<string | null>(null);
  
  const ORDER_EXPIRY_MS = 60 * 60 * 1000;
  const EXPIRABLE_STATUSES = ["PAID", "CANCELLED"];
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Previous orders for trend calculation ──────────────────────────────
  const [previousStats, setPreviousStats] = useState({
    total: 0,
    pending: 0,
    preparing: 0,
    ready: 0,
    revenue: 0
  });

  // Fetch table name
  useEffect(() => {
    if (tableId) {
      getTable(tableId)
        .then((t: any) => setActiveTableName(`Table ${t.table_number || t.name || t.id}`))
        .catch(() => setActiveTableName(`Table #${tableId}`));
    } else {
      setActiveTableName(null);
    }
  }, [tableId]);

  // Remove expired orders
  const removeExpiredOrders = useCallback((ordersList: Order[]): Order[] => {
    const now = Date.now();
    return ordersList.filter((order) => {
      if (!EXPIRABLE_STATUSES.includes(order.status)) return true;
      
      let timestamp: string | undefined;
      if (order.status === "PAID") {
        timestamp = order.paid_at || order.updated_at || order.created_at;
      } else if (order.status === "CANCELLED") {
        timestamp = order.cancelled_at || order.updated_at || order.created_at;
      }
      
      if (!timestamp) return true;
      return (now - new Date(timestamp).getTime()) < ORDER_EXPIRY_MS;
    });
  }, []);

  // ─── FIXED: fetchOrders without orders dependency ──────────────────────
  const fetchOrders = useCallback(async () => {
    try {
      const data = await listOrders(tableId || undefined);
      const allOrders = data.results || data || [];
      const cleanedOrders = removeExpiredOrders(allOrders);
      
      // Store current stats as previous before updating
      setPreviousStats((prev) => ({
        total: orders.length || 0,
        pending: orders.filter((o) => o.status === "PENDING").length || 0,
        preparing: orders.filter((o) => o.status === "PREPARING").length || 0,
        ready: orders.filter((o) => o.status === "READY").length || 0,
        revenue: orders.reduce((sum, o) => sum + parseFloat(o.total_amount || "0"), 0) || 0,
      }));
      
      setOrders(cleanedOrders);
      applyFilters(cleanedOrders, searchTerm, statusFilter, sortBy);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      toast.error("Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }, [tableId, searchTerm, statusFilter, sortBy, removeExpiredOrders]);

  // Apply filters without setting state
  const applyFiltersWithoutSetting = useCallback((
    ordersList: Order[],
    search: string,
    status: string,
    sort: string
  ): Order[] => {
    let result = [...ordersList];

    if (search.trim()) {
      const term = search.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.order_number.toLowerCase().includes(term) ||
          (o.table_number_display && String(o.table_number_display).includes(term))
      );
    }

    if (status !== "all") {
      result = result.filter((o) => o.status === status);
    }

    switch (sort) {
      case "newest":
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "oldest":
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "highest":
        result.sort((a, b) => parseFloat(b.total_amount) - parseFloat(a.total_amount));
        break;
      case "lowest":
        result.sort((a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount));
        break;
    }

    return result;
  }, []);

  const applyFilters = useCallback((
    ordersList: Order[],
    search: string,
    status: string,
    sort: string
  ) => {
    const result = applyFiltersWithoutSetting(ordersList, search, status, sort);
    setFilteredOrders(result);
  }, [applyFiltersWithoutSetting]);

  // Periodic cleanup
  useEffect(() => {
    if (!loading && orders.length > 0) {
      cleanupIntervalRef.current = setInterval(() => {
        setOrders((prevOrders) => {
          const cleanedOrders = removeExpiredOrders(prevOrders);
          if (cleanedOrders.length !== prevOrders.length) {
            const newFiltered = applyFiltersWithoutSetting(cleanedOrders, searchTerm, statusFilter, sortBy);
            setFilteredOrders(newFiltered);
            return cleanedOrders;
          }
          return prevOrders;
        });
      }, 60000);
    }
    return () => {
      if (cleanupIntervalRef.current) clearInterval(cleanupIntervalRef.current);
    };
  }, [loading, orders.length, removeExpiredOrders, searchTerm, statusFilter, sortBy, applyFiltersWithoutSetting]);

  // ─── FIXED: Initial fetch ──────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    fetchOrders();
    return () => {
      if (cleanupIntervalRef.current) clearInterval(cleanupIntervalRef.current);
    };
  }, [fetchOrders]);

  // Handlers
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    applyFilters(orders, term, statusFilter, sortBy);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    applyFilters(orders, searchTerm, value, sortBy);
  };

  const handleSort = (value: string) => {
    setSortBy(value);
    applyFilters(orders, searchTerm, statusFilter, value);
  };

  const handleRefresh = () => {
    toast.promise(fetchOrders(), {
      loading: 'Refreshing orders...',
      success: 'Orders refreshed!',
      error: 'Failed to refresh orders.',
    });
  };

  const clearTableFilter = () => router.push("/dashboard/orders");

  // ─── Calculate growth rates ─────────────────────────────────────────────
  const calculateGrowth = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  // Stats with calculated growth rates
  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === "PENDING").length;
    const preparing = orders.filter((o) => o.status === "PREPARING").length;
    const ready = orders.filter((o) => o.status === "READY").length;
    const revenue = orders.reduce((sum, o) => sum + parseFloat(o.total_amount || "0"), 0);
    
    return {
      total,
      pending,
      preparing,
      ready,
      revenue: Number(revenue.toFixed(2)),
      avgTime: "45m",
      growth: {
        total: calculateGrowth(total, previousStats.total),
        pending: calculateGrowth(pending, previousStats.pending),
        preparing: calculateGrowth(preparing, previousStats.preparing),
        ready: calculateGrowth(ready, previousStats.ready),
        revenue: calculateGrowth(revenue, previousStats.revenue),
      }
    };
  }, [orders, previousStats]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent"
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4 sm:space-y-6"
    >
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1 sm:space-y-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Orders</h1>
            <span className="rounded-full bg-primary/10 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold text-primary">
              {stats.total} Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Track, manage, and optimize your restaurant orders in real-time
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle - hidden on mobile, visible on sm+ */}
          <div className="hidden sm:flex rounded-full border border-border bg-background p-1">
            <button
              onClick={() => setViewMode("kanban")}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                viewMode === "kanban"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="inline h-4 w-4 mr-1" />
              Kanban
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                viewMode === "list"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="inline h-4 w-4 mr-1" />
              List
            </button>
          </div>

          {/* Mobile view toggle - compact */}
          <div className="flex sm:hidden rounded-full border border-border bg-background p-0.5">
            <button
              onClick={() => setViewMode("kanban")}
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-medium transition-all",
                viewMode === "kanban"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="inline h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-medium transition-all",
                viewMode === "list"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="inline h-3.5 w-3.5" />
            </button>
          </div>

          {canCreateOrder && (
            <Link href="/dashboard/orders/new">
              <Button className="gap-1 sm:gap-2 rounded-full shadow-lg shadow-primary/20 text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5">
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> 
                <span className="hidden xs:inline">New Order</span>
                <span className="xs:hidden">New</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* ─── Quick Actions ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        <QuickAction
          icon={<Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
          label="Active Tables"
          onClick={() => router.push("/dashboard/tables")}
          color="primary"
        />
        <QuickAction
          icon={<Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
          label="Ready Orders"
          onClick={() => handleStatusFilter("READY")}
          color="success"
        />
        <QuickAction
          icon={<CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
          label="Revenue"
          onClick={() => console.log("Revenue")}
          color="warning"
        />
        <QuickAction
          icon={<Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
          label="Live View"
          onClick={handleRefresh}
        />
      </div>

      {/* ─── Table Filter Banner ──────────────────────────────────────────── */}
      <AnimatePresence>
        {tableId && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 to-transparent p-3 sm:p-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl sm:rounded-2xl bg-indigo-500/15 text-indigo-400">
                  <TableIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-sm font-medium text-indigo-300">Filtering by</p>
                  <p className="text-xs sm:text-sm font-semibold text-foreground">
                    {activeTableName || `Table #${tableId}`}
                  </p>
                </div>
              </div>
              <button
                onClick={clearTableFilter}
                className="inline-flex items-center gap-1.5 sm:gap-2 self-start rounded-full border border-border bg-background px-2.5 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-medium text-muted-foreground transition hover:bg-muted sm:ml-auto"
              >
                <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                Clear filter
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── KPI Cards - 2 columns on mobile ────────────────────────────── */}
      <div className={cn(
        "grid grid-cols-2 gap-2 sm:gap-4",
        isManager 
          ? "sm:grid-cols-2 xl:grid-cols-6" 
          : "sm:grid-cols-2 xl:grid-cols-4"
      )}>
        <StatCard
          title="Total Orders"
          value={stats.total}
          icon={<Clock className="h-4 w-4 sm:h-5 sm:w-5" />}
          color="text-blue-400"
          subtitle="Active orders"
          trend={stats.growth.total}
          trendLabel="vs previous"
        />
        <StatCard
          title="Pending"
          value={stats.pending}
          icon={<Clock className="h-4 w-4 sm:h-5 sm:w-5" />}
          color="text-amber-400"
          subtitle="Awaiting processing"
          trend={stats.growth.pending}
          trendLabel="vs previous"
        />
        <StatCard
          title="Preparing"
          value={stats.preparing}
          icon={<CookingPot className="h-4 w-4 sm:h-5 sm:w-5" />}
          color="text-purple-400"
          subtitle="In kitchen"
          trend={stats.growth.preparing}
          trendLabel="vs previous"
        />
        <StatCard
          title="Ready"
          value={stats.ready}
          icon={<CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />}
          color="text-emerald-400"
          subtitle="Ready to serve"
          trend={stats.growth.ready}
          trendLabel="vs previous"
        />
        {isManager && (
          <>
            <StatCard
              title="Revenue"
              value={`$${stats.revenue}`}
              icon={<DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />}
              color="text-green-400"
              subtitle="Total sales"
              trend={stats.growth.revenue}
              trendLabel="vs previous"
            />
            <StatCard
              title="Avg Time"
              value={stats.avgTime}
              icon={<Timer className="h-4 w-4 sm:h-5 sm:w-5" />}
              color="text-cyan-400"
              subtitle="To completion"
              trend={null}
            />
          </>
        )}
      </div>

      {/* ─── Controls ────────────────────────────────────────────────────── */}
      <div className="rounded-xl sm:rounded-2xl border border-border bg-muted/30 p-3 sm:p-4 shadow-sm transition-all hover:shadow-md">
        <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 min-w-[150px]">
            <Search className="pointer-events-none absolute left-3 sm:left-4 top-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full rounded-xl sm:rounded-2xl border-border bg-background/90 pl-8 sm:pl-11 pr-3 sm:pr-4 py-2 sm:py-3 text-xs sm:text-sm transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Mobile filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-1.5 sm:gap-2 rounded-xl border border-border px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-muted-foreground transition hover:bg-muted lg:hidden"
            >
              <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Filters</span>
              <ChevronDown className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4 transition", showFilters && "rotate-180")} />
            </button>

            <div className={cn(
              "flex flex-wrap items-center gap-1.5 sm:gap-3",
              "lg:flex", 
              showFilters ? "flex" : "hidden"
            )}>
              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilter(e.target.value)}
                className="rounded-xl sm:rounded-2xl border border-border bg-background px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-foreground transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All Status</option>
                <option value="PENDING">⏳ Pending</option>
                <option value="CONFIRMED">✅ Confirmed</option>
                <option value="QUEUED">📋 Queued</option>
                <option value="PREPARING">👨‍🍳 Preparing</option>
                <option value="READY">🟢 Ready</option>
                <option value="DELIVERED">📦 Delivered</option>
                <option value="PAID">💳 Paid</option>
                <option value="CANCELLED">❌ Cancelled</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => handleSort(e.target.value)}
                className="rounded-xl sm:rounded-2xl border border-border bg-background px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-foreground transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              >
                <option value="newest">✨ Newest</option>
                <option value="oldest">📅 Oldest</option>
                <option value="highest">💰 Highest</option>
                <option value="lowest">💸 Lowest</option>
              </select>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                className="gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm"
              >
                <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Refresh</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Content ───────────────────────────────────────────────────────── */}
      <motion.div
        key={viewMode}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-xl sm:rounded-2xl border border-border bg-muted/30 p-3 sm:p-5 shadow-sm"
      >
        {viewMode === "kanban" ? (
          <div className="space-y-2 sm:space-y-4">
            <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-1 xs:gap-2">
              <h2 className="text-sm sm:text-lg font-semibold text-foreground">Order Workflow</h2>
              <span className="text-[10px] sm:text-sm text-muted-foreground">
                {filteredOrders.length} orders
              </span>
            </div>
            <KanbanBoard orders={filteredOrders} onOrderUpdate={fetchOrders} />
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-1 xs:gap-2">
              <h2 className="text-sm sm:text-lg font-semibold text-foreground">Order List</h2>
              <span className="text-[10px] sm:text-sm text-muted-foreground">
                {filteredOrders.length} orders found
              </span>
            </div>
            
            {filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 sm:py-16 text-center">
                <div className="rounded-full bg-muted/30 p-3 sm:p-4">
                  <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                </div>
                <p className="mt-3 sm:mt-4 text-base sm:text-lg font-medium text-foreground">No orders found</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Try adjusting your filters or search terms
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:gap-3">
                {filteredOrders.map((order) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 rounded-xl border border-border bg-background/80 p-3 sm:p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/20"
                  >
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1 w-full sm:w-auto">
                      <div className="flex h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-xs sm:text-sm">
                        #{order.order_number.split('-')[1] || order.id}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate text-sm sm:text-base">
                          Order #{order.order_number}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground">
                          <span>Table {order.table_number_display || order.table || '—'}</span>
                          <span className="hidden xs:inline">•</span>
                          <span className="xs:hidden">|</span>
                          <span>${parseFloat(order.total_amount).toFixed(2)}</span>
                          <span className="hidden xs:inline">•</span>
                          <span className="xs:hidden">|</span>
                          <span className={cn(
                            "px-1.5 sm:px-2 py-0.5 rounded-full font-medium text-[8px] sm:text-[10px]",
                            order.status === "PENDING" && "bg-amber-500/10 text-amber-400",
                            order.status === "PREPARING" && "bg-purple-500/10 text-purple-400",
                            order.status === "READY" && "bg-emerald-500/10 text-emerald-400",
                            order.status === "PAID" && "bg-green-500/10 text-green-400",
                            order.status === "CANCELLED" && "bg-red-500/10 text-red-400"
                          )}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-between sm:justify-end">
                      <span className="text-[10px] sm:text-xs text-muted-foreground hidden xs:inline">
                        {new Date(order.created_at).toLocaleTimeString()}
                      </span>
                      <button
                        onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                        className="rounded-xl px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition"
                      >
                        View
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}