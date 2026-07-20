"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  XCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { calculateFinancialMetrics } from "@/lib/financialMetrics";

type OverviewStats = {
  totalSales: number;
  totalOrders: number;
  cogs: number;
  grossProfit: number;
  cancelledOrders: number;
  recentTransactions: any[];
};

type Period = "today" | "week" | "month";

export default function ReportsOverviewPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<OverviewStats>({
    totalSales: 0,
    totalOrders: 0,
    cogs: 0,
    grossProfit: 0,
    cancelledOrders: 0,
    recentTransactions: [],
  });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("today");
  const getBranchId = useCallback(() => {
    if (!user) return undefined;
    // Try to get branch from user object
      const branch = (user as any)?.branch;
      if (branch) {
        return typeof branch === 'object' ? branch.id : branch;
      }
      return undefined;
    }, [user]);
  

  // ─── Build date filters ──────────────────────────────────────────────
  const getDateRange = (period: Period) => {
  const now = new Date();
  switch (period) {
    case "today":
      return {
        gte: format(startOfDay(now), "yyyy-MM-dd"),
        lte: format(endOfDay(now), "yyyy-MM-dd"),
      };
      case "week":
      return {
        gte: format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"), // Monday start
        lte: format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      };
    case "month":
      return {
        gte: format(startOfMonth(now), "yyyy-MM-dd"),
        lte: format(endOfMonth(now), "yyyy-MM-dd"),
      };
    }
  };
  
  const fetchOverview = async (period: Period) => {
  setLoading(true);
  try {
    const { gte, lte } = getDateRange(period);
    const branchId = getBranchId();
    console.log(`📊 Fetching overview for period: ${period}`);
    console.log(`   Date range: ${gte} to ${lte}`);

    const metrics = await calculateFinancialMetrics(gte, lte, branchId);

    // ─── 11. Recent transactions ──────────────────────────────────────
    const recentRes = await apiFetch(
      `/api/orders/payments/?ordering=-created_at&page_size=5`,
      {},
      true
    );
    const recentData = await recentRes.json();
    const recentTransactions = recentData.results || recentData || [];

    setStats({
      totalSales: metrics.netSales,
      totalOrders: metrics.paidOrderCount,
      cogs: metrics.cogs,
      grossProfit: metrics.grossProfit,
      cancelledOrders: metrics.cancelledOrderCount,
      recentTransactions,
    });
  } catch (error) {
    console.error("Failed to fetch overview stats:", error);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchOverview(period);
  }, [period]);

  // ─── Helpers ──────────────────────────────────────────────────────────
  const formatCurrency = (value: number) => `Rs. ${value.toFixed(2)}`;
  const formatDate = (dateString: string) =>
    format(new Date(dateString), "MMM dd, hh:mm a");

  // ─── Card click handlers ─────────────────────────────────────────────
  const navigateTo = (path: string) => {
    router.push(`/dashboard/reports/${path}?period=${period}`);
  };

  // ─── Loading state ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Overview</h1>
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
            This Week
          </Button>
          <Button
            variant={period === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod("month")}
          >
            This Month
          </Button>
        </div>
      </div>

      {/* ─── Stats Grid (Row 1) ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className="bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border-indigo-500/20 cursor-pointer hover:shadow-lg hover:shadow-indigo-500/10 transition-all"
          onClick={() => navigateTo("sales")}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-indigo-500/20">
              <DollarSign className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Net Sales</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalSales)}</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 cursor-pointer hover:shadow-lg hover:shadow-emerald-500/10 transition-all"
          onClick={() => navigateTo("orders")}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-emerald-500/20">
              <ShoppingBag className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="text-2xl font-bold">{stats.totalOrders}</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20 cursor-pointer hover:shadow-lg hover:shadow-amber-500/10 transition-all"
          onClick={() => navigateTo("gross-profit")}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-amber-500/20">
              <Package className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">COGS</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.cogs)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Stats Grid (Row 2) ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className="bg-gradient-to-br from-rose-500/10 to-rose-500/5 border-rose-500/20 cursor-pointer hover:shadow-lg hover:shadow-rose-500/10 transition-all"
          onClick={() => navigateTo("gross-profit")}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-rose-500/20">
              <DollarSign className="h-6 w-6 text-rose-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gross Profit</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.grossProfit)}</p>
            </div>
          </CardContent>
        </Card>

        {/* <Card
          className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20 cursor-pointer hover:shadow-lg hover:shadow-orange-500/10 transition-all"
          onClick={() => navigateTo("profit-loss")}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-orange-500/20">
              <TrendingDown className="h-6 w-6 text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Expenses</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalExpenses)}</p>
            </div>
          </CardContent>
        </Card> */}

        <Card
          className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20 cursor-pointer hover:shadow-lg hover:shadow-red-500/10 transition-all"
          onClick={() => navigateTo("orders")}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-red-500/20">
              <XCircle className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cancelled Orders</p>
              <p className="text-2xl font-bold">{stats.cancelledOrders}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border-cyan-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-cyan-500/20">
              <Clock className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Period</p>
              <p className="text-2xl font-bold capitalize">{period}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Recent Transactions ────────────────────────────────────────── */}
      <Card className="border-border">
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Recent Transactions</h3>
            <Link href="/dashboard/payments">
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
                View All <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground font-semibold">
                <tr>
                  <th className="px-4 py-3 text-left">Order</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Method</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No recent transactions.
                    </td>
                  </tr>
                ) : (
                  stats.recentTransactions.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">
                        #{tx.order_number}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        Rs. {Number(tx.amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 capitalize">{tx.payment_method.toLowerCase()}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full border",
                            tx.status === "COMPLETED"
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : tx.status === "PENDING"
                              ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                              : "bg-red-500/20 text-red-400 border-red-500/30"
                          )}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className=" py-3 text-muted-foreground ">
                        {formatDate(tx.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
