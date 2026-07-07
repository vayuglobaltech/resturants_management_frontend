"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  CreditCard,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search,
  DollarSign,
  Calendar,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { format } from "date-fns";

// ─── Types ──────────────────────────────────────────────────────────────

type Payment = {
  id: string;
  order_number: string;
  amount: number;
  payment_method: string;
  status: "COMPLETED" | "PENDING" | "FAILED" | string;
  created_at: string;
};

type FilterState = {
  status: string;
  method: string;
};

type SummaryStats = {
  totalAmount: number;
  completed: number;
  pending: number;
  count: number;
};

// ─── Constants ─────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "COMPLETED", label: "Completed" },
  { value: "PENDING", label: "Pending" },
  { value: "FAILED", label: "Failed" },
];

const METHOD_OPTIONS = [
  { value: "", label: "All Methods" },
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "MOBILE_MONEY", label: "Mobile Money" },
];

// ─── Component ─────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    status: "",
    method: "",
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Summary stats – will be populated from a dedicated endpoint
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({
    totalAmount: 0,
    completed: 0,
    pending: 0,
    count: 0,
  });

  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

  // ─── Debounce search ──────────────────────────────────────────────────

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // ─── Build query string for payments list ──────────────────────────

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    params.append("page", String(page));
    params.append("ordering", "-created_at");

    if (debouncedSearch) params.append("search", debouncedSearch);
    if (filters.status) params.append("status", filters.status);
    if (filters.method) params.append("payment_method", filters.method);

    return params.toString();
  }, [page, debouncedSearch, filters]);

  // ─── Fetch payments list ────────────────────────────────────────────

  const fetchPayments = useCallback(
    async (resetPage = false) => {
      const currentPage = resetPage ? 1 : page;
      setLoading(true);
      try {
        const params = buildQuery();
        const res = await apiFetch(`/api/orders/payments/?${params}`, {}, true);
        const json = await res.json();
        if (!res.ok) throw json;

        const data = json.results || json || [];
        setPayments(data);
        setTotalCount(json.count || data.length);
        setTotalPages(Math.ceil((json.count || data.length) / 10));
        if (resetPage) setPage(1);

        // Compute summary stats from current page
        const totalAmount = data.reduce((sum: number, p: Payment) => sum + Number(p.amount || 0), 0);
        const completed = data.filter((p: Payment) => p.status === "COMPLETED").length;
        const pending = data.filter((p: Payment) => p.status === "PENDING").length;
        setSummaryStats({
          totalAmount,
          completed,
          pending,
          count: json.count || data.length,
        });
      } catch (error) {
        console.error("Failed to fetch payments:", error);
        toast.error("Failed to load payments.");
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, buildQuery],
  );

  // ─── Combined fetch ──────────────────────────────────────────────────

  const fetchAllData = useCallback(
    async (resetPage = false) => {
      await fetchPayments(resetPage);
    },
    [fetchPayments],
  );

  // ─── Effects ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetchAllData();
  }, [page, debouncedSearch, filters.status, filters.method]);

  // ─── Handlers ─────────────────────────────────────────────────────────

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAllData();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    // fetchAllData will be triggered by page change and searchTerm change
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ status: "", method: "" });
    setSearchTerm("");
    setPage(1);
  };

  // ─── Helpers ──────────────────────────────────────────────────────────

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return {
          label: "Completed",
          icon: CheckCircle,
          className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        };
      case "PENDING":
        return {
          label: "Pending",
          icon: Clock,
          className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        };
      case "FAILED":
        return {
          label: "Failed",
          icon: XCircle,
          className: "bg-red-500/10 text-red-400 border-red-500/20",
        };
      default:
        return {
          label: status || "Unknown",
          icon: AlertCircle,
          className: "bg-slate-500/10 text-muted-foreground border-slate-500/20",
        };
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────

  if (loading && !isRefreshing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
        <div className="flex justify-between">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <CreditCard className="h-7 w-7 text-indigo-400" />
          Payments
          <span className="text-sm font-normal text-muted-foreground ml-2">
            ({totalCount})
          </span>
        </h1>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-1"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* ─── Summary Cards (Real API Data) ────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border-indigo-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-full bg-indigo-500/20">
              <DollarSign className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-xl font-bold">
                ${summaryStats.totalAmount.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-full bg-emerald-500/20">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-xl font-bold">{summaryStats.completed}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-full bg-amber-500/20">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-xl font-bold">{summaryStats.pending}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-slate-500/10 to-slate-500/5 border-slate-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-full bg-slate-500/20">
              <Receipt className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Transactions</p>
              <p className="text-xl font-bold">{summaryStats.count}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Filters & Search ───────────────────────────────────── */}
      <Card className="border-border bg-muted/30">
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search order number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <Select
                value={filters.status}
                onValueChange={(val) => handleFilterChange("status", val)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.method}
                onValueChange={(val) => handleFilterChange("method", val)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent>
                  {METHOD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button type="submit" size="sm" className="gap-1">
                <Search className="h-4 w-4" />
                Search
              </Button>

              {(filters.status || filters.method || searchTerm) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-1 text-muted-foreground hover:text-foreground"
                >
                  <Filter className="h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ─── Payments Table (visible on all screen sizes) ────── */}
      {payments.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-muted/10">
          <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">No payments recorded yet.</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Try adjusting your filters or search terms.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Card className="border-border bg-muted/30">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-left">#</th>
                    <th className="px-6 py-4 text-left">Order</th>
                    <th className="px-6 py-4 text-left">Amount</th>
                    <th className="px-6 py-4 text-left">Method</th>
                    <th className="px-6 py-4 text-left">Status</th>
                    <th className="px-6 py-4 text-left">Date</th>
                    <th className="px-6 py-4 text-left">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map((payment, index) => {
                    const statusConfig = getStatusConfig(payment.status);
                    const StatusIcon = statusConfig.icon;
                    return (
                      <tr
                        key={payment.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-6 py-4 font-medium text-foreground">
                          {(page - 1) * 10 + index + 1}
                        </td>
                        <td className="px-6 py-4 font-medium text-foreground">
                          #{payment.order_number}
                        </td>
                        <td className="px-6 py-4 font-medium">
                          ${Number(payment.amount).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 capitalize">
                          {payment.payment_method.toLowerCase() || "—"}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border",
                              statusConfig.className,
                            )}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {payment.created_at
                            ? format(new Date(payment.created_at), "MMM dd, yyyy")
                            : "—"}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {payment.created_at
                            ? format(new Date(payment.created_at), "hh:mm a")
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </div>

          {/* ─── Pagination ──────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-4">
            <span className="text-sm text-muted-foreground">
              Showing {((page - 1) * 10) + 1}–{Math.min(page * 10, totalCount)} of {totalCount} records
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="gap-1"
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}