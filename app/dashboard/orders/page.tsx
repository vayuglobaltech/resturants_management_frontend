"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KanbanBoard } from "@/components/orders/KanbanBoard";
import { listOrders } from "@/lib/ordersApi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  RefreshCw,
  Filter,
  ArrowUpDown,
  Clock,
  CookingPot,
  CheckCircle2,
  DollarSign,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Order {
  id: number;
  order_number: string;
  status: string;
  total_amount: string;
  table_number_display?: number;
  items?: any[];
  created_at: string;
}

// ─── Stat Card ──────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  subtitle?: string;
}

function StatCard({ title, value, icon, color = "text-indigo-400", subtitle }: StatCardProps) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex items-start gap-4 hover:bg-white/[0.05] transition-colors">
      <div className={cn("p-2.5 rounded-xl bg-white/5", color)}>{icon}</div>
      <div>
        <p className="text-sm text-slate-400 font-medium">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const fetchOrders = async () => {
    try {
      const data = await listOrders();
      const allOrders = data.results || data || [];
      setOrders(allOrders);
      applyFilters(allOrders, searchTerm, statusFilter, sortBy);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      toast.error("Failed to load orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Apply filters and sorting
  const applyFilters = (
    ordersList: Order[],
    search: string,
    status: string,
    sort: string
  ) => {
    let result = [...ordersList];

    // Search by order number or table
    if (search.trim()) {
      const term = search.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.order_number.toLowerCase().includes(term) ||
          (o.table_number_display && String(o.table_number_display).includes(term))
      );
    }

    // Status filter
    if (status !== "all") {
      result = result.filter((o) => o.status === status);
    }

    // Sorting
    switch (sort) {
      case "newest":
        result.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      case "oldest":
        result.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        break;
      case "highest":
        result.sort(
          (a, b) => parseFloat(b.total_amount) - parseFloat(a.total_amount)
        );
        break;
      case "lowest":
        result.sort(
          (a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount)
        );
        break;
    }

    setFilteredOrders(result);
  };

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
    fetchOrders();
  };

  // ─── Compute Stats ────────────────────────────────────────────────────────

  const stats = {
    pending: orders.filter((o) => o.status === "PENDING").length,
    preparing: orders.filter((o) => o.status === "PREPARING").length,
    ready: orders.filter((o) => o.status === "READY").length,
    revenue: orders.reduce((sum, o) => sum + parseFloat(o.total_amount || "0"), 0),
    // Average time: only for delivered orders (sample: 45 min)
    avgTime: "45m",
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Orders</h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage restaurant orders efficiently
          </p>
        </div>
        <Link href="/dashboard/orders/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> New Order
          </Button>
        </Link>
      </div>

      {/* ─── KPI Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          title="Pending"
          value={stats.pending}
          icon={<Clock className="h-5 w-5" />}
          color="text-amber-400"
        />
        <StatCard
          title="Preparing"
          value={stats.preparing}
          icon={<CookingPot className="h-5 w-5" />}
          color="text-purple-400"
        />
        <StatCard
          title="Ready"
          value={stats.ready}
          icon={<CheckCircle2 className="h-5 w-5" />}
          color="text-emerald-400"
        />
        <StatCard
          title="Revenue"
          value={`$${stats.revenue.toFixed(2)}`}
          icon={<DollarSign className="h-5 w-5" />}
          color="text-green-400"
          subtitle="Total sales"
        />
        <StatCard
          title="Avg Time"
          value={stats.avgTime}
          icon={<Timer className="h-5 w-5" />}
          color="text-blue-400"
          subtitle="To delivery"
        />
      </div>

      {/* ─── Controls ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search orders..."
            value={searchTerm}
            onChange={handleSearch}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilter(e.target.value)}
            className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="QUEUED">Queued</option>
            <option value="PREPARING">Preparing</option>
            <option value="READY">Ready</option>
            <option value="DELIVERED">Delivered</option>
            <option value="PAID">Paid</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => handleSort(e.target.value)}
            className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="highest">Highest Amount</option>
            <option value="lowest">Lowest Amount</option>
          </select>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="gap-1"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* ─── Kanban Board ────────────────────────────────────────────────── */}
      <div className="mt-4">
        <KanbanBoard orders={filteredOrders} onOrderUpdate={fetchOrders} />
      </div>
    </div>
  );
}