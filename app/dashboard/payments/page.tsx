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
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Receipt,
  LayoutGrid,
  List,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { format } from "date-fns";
import Link from "next/link";

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

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "COMPLETED", label: "Completed" },
  { value: "PENDING", label: "Pending" },
  { value: "FAILED", label: "Failed" },
];

const METHOD_OPTIONS = [
  { value: "", label: "All Methods" },
  { value: "CASH", label: "Cash" },
  { value: "QR", label: "QR" },
  // { value: "BANK_TRANSFER", label: "Bank Transfer" },
  // { value: "MOBILE_MONEY", label: "Mobile Money" },
];

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<"list" | "cards">("list");

  useEffect(() => {
    setViewMode(isMobile ? "cards" : "list");
  }, [isMobile]);

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
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({
    totalAmount: 0,
    completed: 0,
    pending: 0,
    count: 0,
  });
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    params.append("page", String(page));
    params.append("ordering", "-created_at");
    if (debouncedSearch) params.append("search", debouncedSearch);
    if (filters.status) params.append("status", filters.status);
    if (filters.method) params.append("payment_method", filters.method);
    return params.toString();
  }, [page, debouncedSearch, filters]);

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

  const fetchAllData = useCallback(
    async (resetPage = false) => {
      await fetchPayments(resetPage);
    },
    [fetchPayments],
  );

  useEffect(() => {
    fetchAllData();
  }, [page, debouncedSearch, filters.status, filters.method]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAllData();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
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
    <div className="space-y-6 px-2 sm:px-0">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <CreditCard className="h-7 w-7 text-indigo-400" />
          Payments
          <span className="text-sm font-normal text-muted-foreground ml-2">
            ({totalCount})
          </span>
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
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
          <div className="flex gap-1 border border-border rounded-md p-1 bg-background ml-2">
            <Button
              size="sm"
              variant={viewMode === "list" ? "default" : "ghost"}
              onClick={() => setViewMode("list")}
              className="gap-1 h-8 w-8 p-0"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === "cards" ? "default" : "ghost"}
              onClick={() => setViewMode("cards")}
              className="gap-1 h-8 w-8 p-0"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Summary Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2  md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border-indigo-500/20">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-full bg-indigo-500/20">
              <DollarSign className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">Total Amount</p>
              <p className="text-lg font-bold">${summaryStats.totalAmount.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-full bg-emerald-500/20">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">Completed</p>
              <p className="text-lg font-bold">{summaryStats.completed}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-500/20">
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">Pending</p>
              <p className="text-lg font-bold">{summaryStats.pending}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-slate-500/10 to-slate-500/5 border-slate-500/20">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-full bg-slate-500/20">
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">Transactions</p>
              <p className="text-lg font-bold">{summaryStats.count}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Filters & Search ───────────────────────────────────── */}
      <Card className="border-border bg-muted/30">
        <CardContent className="p-3 sm:p-4">
          <form onSubmit={handleSearch} className="flex flex-col gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search order number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Select
                value={filters.status}
                onValueChange={(val) => handleFilterChange("status", val)}
              >
                <SelectTrigger className="w-[130px]">
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
                <SelectTrigger className="w-[140px]">
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

      {/* ─── Payments ──────────────────────────────────────────────── */}
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
          {viewMode === "list" ? (
            // ─── List View (Table) – with horizontal scroll ────────────
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <div className="min-w-[750px] px-2 sm:px-0">
                <Card className="border-border bg-muted/30">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-xs uppercase text-muted-foreground font-semibold border-b border-border">
                        <tr>
                          <th className="px-4 py-3 text-left">#</th>
                          <th className="px-4 py-3 text-left">Order</th>
                          <th className="px-4 py-3 text-left">Amount</th>
                          <th className="px-4 py-3 text-left">Method</th>
                          <th className="px-4 py-3 text-left">Status</th>
                          <th className="px-4 py-3 text-left hidden sm:table-cell">Date</th>
                          <th className="px-4 py-3 text-left hidden sm:table-cell">Time</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {payments.map((payment, index) => {
                          const statusConfig = getStatusConfig(payment.status);
                          const StatusIcon = statusConfig.icon;
                          return (
                            <tr key={payment.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3 font-medium text-foreground">
                                {(page - 1) * 10 + index + 1}
                              </td>
                              <td className="px-4 py-3 font-medium text-foreground">
                                #{payment.order_number}
                              </td>
                              <td className="px-4 py-3 font-medium">
                                ${Number(payment.amount).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 capitalize">
                                {payment.payment_method.toLowerCase() || "—"}
                              </td>
                              <td className="px-4 py-3">
                                <span className={cn(
                                  "inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border",
                                  statusConfig.className,
                                )}>
                                  <StatusIcon className="h-3 w-3" />
                                  {statusConfig.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                                {payment.created_at
                                  ? format(new Date(payment.created_at), "MMM dd, yyyy")
                                  : "—"}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                                {payment.created_at
                                  ? format(new Date(payment.created_at), "hh:mm a")
                                  : "—"}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Link href={`/dashboard/payments/${payment.id}`}>
                                  <Button size="sm" variant="ghost" className="gap-1">
                                    <Receipt className="h-3 w-3" /> View
                                  </Button>
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            // ─── Card View (Mobile Friendly) ──────────────────────
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {payments.map((payment) => {
                const statusConfig = getStatusConfig(payment.status);
                const StatusIcon = statusConfig.icon;
                return (
                  <Card
                    key={payment.id}
                    className="border-border bg-background hover:border-indigo-500/30 transition-colors"
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-foreground text-sm">
                            #{payment.order_number}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span>{format(new Date(payment.created_at), "MMM dd, yyyy")}</span>
                            <span>•</span>
                            <span>{format(new Date(payment.created_at), "hh:mm a")}</span>
                          </div>
                        </div>
                        <span className={cn(
                          "inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border shrink-0",
                          statusConfig.className,
                        )}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="font-bold text-foreground">
                          ${Number(payment.amount).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Method</span>
                        <span className="capitalize">{payment.payment_method.toLowerCase()}</span>
                      </div>

                      <div className="pt-2 border-t border-border/50">
                        <Link href={`/dashboard/payments/${payment.id}`}>
                          <Button variant="outline" size="sm" className="w-full gap-1">
                            <Receipt className="h-4 w-4" /> View Receipt
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

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