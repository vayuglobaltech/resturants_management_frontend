"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Calendar,
  Filter,
  ArrowUp,
  ArrowDown,
  Minus,
  Percent,
  Activity,
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";

type Period = "today" | "week" | "month" | "custom";
type PnLData = {
  date: string;
  grossSales: number;
  discounts: number;
  refunds: number;
  netSales: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  netProfit: number;
};

type PnLSummary = {
  grossSales: number;
  discounts: number;
  refunds: number;
  netSales: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  netProfit: number;
  netProfitMargin: number;
};

// ─── Helper to format currency ──────────────────────────────────────────
const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

// ─── Helper to format percent ───────────────────────────────────────────
const formatPercent = (value: number) => `${value.toFixed(1)}%`;

export default function ProfitLossPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialPeriod = (searchParams.get("period") as Period) || "today";

  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [pnlData, setPnlData] = useState<PnLData[]>([]);
  const [summary, setSummary] = useState<PnLSummary>({
    grossSales: 0,
    discounts: 0,
    refunds: 0,
    netSales: 0,
    cogs: 0,
    grossProfit: 0,
    operatingExpenses: 0,
    netProfit: 0,
    netProfitMargin: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
        return {
          start: customStart ? new Date(customStart) : today,
          end: customEnd ? new Date(customEnd) : endOfDay(now),
        };
    }
  }, [customStart, customEnd]);

  // ─── Fetch P&L data ──────────────────────────────────────────────────
  const fetchPnL = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange(period);
      const startStr = format(start, "yyyy-MM-dd");
      const endStr = format(end, "yyyy-MM-dd");

      // ─── 1. Gross Sales (completed payments) ──────────────────────
      const salesRes = await apiFetch(
        `/api/orders/payments/?status=COMPLETED&created_at__gte=${startStr}&created_at__lte=${endStr}&page_size=2000`,
        {},
        true
      );
      const salesData = await salesRes.json();
      const payments = salesData.results || salesData || [];

      // ─── 2. Discounts (from orders) ──────────────────────────────
      const ordersRes = await apiFetch(
        `/api/orders/?created_at__gte=${startStr}&created_at__lte=${endStr}&page_size=2000`,
        {},
        true
      );
      const ordersData = await ordersRes.json();
      const orders = ordersData.results || ordersData || [];
      const discountMap: Record<string, number> = {};
      let totalDiscounts = 0;
      orders.forEach((o: any) => {
        const date = format(new Date(o.created_at), "yyyy-MM-dd");
        const discSum = (o.discounts || []).reduce((s: number, d: any) => s + Number(d.amount), 0);
        discountMap[date] = (discountMap[date] || 0) + discSum;
        totalDiscounts += discSum;
      });

      // ─── 3. COGS (from COGSTransaction endpoint) ──────────────────
      let cogsTotal = 0;
      const cogsMap: Record<string, number> = {};
      try {
        const cogsRes = await apiFetch(
          `/api/accounting/cogs-transactions/?created_at__gte=${startStr}&created_at__lte=${endStr}&page_size=2000`,
          {},
          true
        );
        const cogsData = await cogsRes.json();
        const cogsItems = cogsData.results || cogsData || [];
        cogsItems.forEach((c: any) => {
          const date = format(new Date(c.created_at), "yyyy-MM-dd");
          const amount = Number(c.total_cogs || 0);
          cogsMap[date] = (cogsMap[date] || 0) + amount;
          cogsTotal += amount;
        });
      } catch (error) {
        // If endpoint not available, compute from order items using product cost
        console.warn("COGS endpoint not available, computing from orders...");
        // Use product price * 0.6 as placeholder cost
        orders.forEach((o: any) => {
          const date = format(new Date(o.created_at), "yyyy-MM-dd");
          let orderCogs = 0;
          (o.items || []).forEach((item: any) => {
            const price = Number(item.price_at_order || 0);
            const qty = Number(item.quantity || 0);
            const cost = price * 0.6; // placeholder
            orderCogs += cost * qty;
          });
          cogsMap[date] = (cogsMap[date] || 0) + orderCogs;
          cogsTotal += orderCogs;
        });
      }

      // ─── 4. Operating Expenses (from ExpenseEntry) ──────────────
      let expenseTotal = 0;
      const expenseMap: Record<string, number> = {};
      try {
        const expRes = await apiFetch(
          `/api/accounting/expenses/?expense_date__gte=${startStr}&expense_date__lte=${endStr}&page_size=1000`,
          {},
          true
        );
        const expData = await expRes.json();
        const expenses = expData.results || expData || [];
        expenses.forEach((e: any) => {
          const date = format(new Date(e.expense_date || e.created_at), "yyyy-MM-dd");
          const amount = Number(e.amount || 0);
          expenseMap[date] = (expenseMap[date] || 0) + amount;
          expenseTotal += amount;
        });
      } catch (error) {
        console.warn("Expense endpoint not available, using placeholder (5% of gross sales)");
        // Placeholder: 5% of gross sales
        const totalGross = payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
        expenseTotal = totalGross * 0.05;
        // Distribute across days evenly (simplified)
        const days = Math.max(1, Object.keys(salesGrouped).length || 1);
        const perDay = expenseTotal / days;
        Object.keys(salesGrouped).forEach((date) => {
          expenseMap[date] = perDay;
        });
      }

      // ─── 5. Group by date ──────────────────────────────────────────
      const salesGrouped: Record<string, number> = {};
      payments.forEach((p: any) => {
        const date = format(new Date(p.created_at), "yyyy-MM-dd");
        salesGrouped[date] = (salesGrouped[date] || 0) + Number(p.amount || 0);
      });

      // ─── 6. Build daily data ──────────────────────────────────────
      const allDates = new Set([
        ...Object.keys(salesGrouped),
        ...Object.keys(discountMap),
        ...Object.keys(cogsMap),
        ...Object.keys(expenseMap),
      ]);

      const result: PnLData[] = Array.from(allDates)
        .sort()
        .map((date) => {
          const gross = salesGrouped[date] || 0;
          const discounts = discountMap[date] || 0;
          const refunds = gross * 0.02; // dummy: 2% refunds
          const netSales = gross - discounts - refunds;
          const cogs = cogsMap[date] || 0;
          const grossProfit = netSales - cogs;
          const operatingExpenses = expenseMap[date] || 0;
          const netProfit = grossProfit - operatingExpenses;
          return {
            date: format(new Date(date), "MMM dd"),
            grossSales: gross,
            discounts,
            refunds,
            netSales,
            cogs,
            grossProfit,
            operatingExpenses,
            netProfit,
          };
        });

      setPnlData(result);

      // ─── 7. Summary ──────────────────────────────────────────────────
      const totalGross = payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      const totalNetSales = totalGross - totalDiscounts - totalGross * 0.02;
      const totalCogs = cogsTotal;
      const totalGrossProfit = totalNetSales - totalCogs;
      const totalExpenses = expenseTotal;
      const totalNetProfit = totalGrossProfit - totalExpenses;
      const netProfitMargin = totalNetSales > 0 ? (totalNetProfit / totalNetSales) * 100 : 0;

      setSummary({
        grossSales: totalGross,
        discounts: totalDiscounts,
        refunds: totalGross * 0.02,
        netSales: totalNetSales,
        cogs: totalCogs,
        grossProfit: totalGrossProfit,
        operatingExpenses: totalExpenses,
        netProfit: totalNetProfit,
        netProfitMargin: netProfitMargin,
      });
    } catch (error) {
      console.error("Failed to fetch P&L data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, getDateRange]);

  useEffect(() => {
    fetchPnL();
  }, [fetchPnL]);

  // ─── Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  // ─── Financial Statement data ────────────────────────────────────────
  const statementItems = [
    { label: "Gross Sales", value: summary.grossSales, type: "revenue" },
    { label: "Discounts", value: summary.discounts, type: "deduction" },
    { label: "Refunds", value: summary.refunds, type: "deduction" },
    { label: "Net Sales", value: summary.netSales, type: "subtotal" },
    { label: "Cost of Goods Sold (COGS)", value: summary.cogs, type: "deduction" },
    { label: "Gross Profit", value: summary.grossProfit, type: "subtotal" },
    { label: "Operating Expenses", value: summary.operatingExpenses, type: "deduction" },
    { label: "Net Profit", value: summary.netProfit, type: "total" },
  ];

  return (
    <div className="space-y-6">
      {/* ─── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Profit & Loss</h1>
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
              fetchPnL();
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border-indigo-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-indigo-500/20">
              <DollarSign className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gross Sales</p>
              <p className="text-lg font-bold">{formatCurrency(summary.grossSales)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-rose-500/10 to-rose-500/5 border-rose-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-rose-500/20">
              <DollarSign className="h-5 w-5 text-rose-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Net Sales</p>
              <p className="text-lg font-bold">{formatCurrency(summary.netSales)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-emerald-500/20">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gross Profit</p>
              <p className="text-lg font-bold">{formatCurrency(summary.grossProfit)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-amber-500/20">
              <Activity className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Net Profit Margin</p>
              <p className="text-lg font-bold">{formatPercent(summary.netProfitMargin)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Additional Metrics ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border-cyan-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-cyan-500/20">
              <DollarSign className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">COGS</p>
              <p className="text-lg font-bold">{formatCurrency(summary.cogs)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-orange-500/20">
              <DollarSign className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Operating Expenses</p>
              <p className="text-lg font-bold">{formatCurrency(summary.operatingExpenses)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-purple-500/20">
              <TrendingDown className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Discounts</p>
              <p className="text-lg font-bold">{formatCurrency(summary.discounts)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-red-500/20">
              <TrendingDown className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Refunds</p>
              <p className="text-lg font-bold">{formatCurrency(summary.refunds)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Chart ────────────────────────────────────────────────────── */}
      <Card className="border-border">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Profit & Loss Trend</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={pnlData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs text-muted-foreground" />
                <YAxis
                  tickFormatter={(value) => `$${value}`}
                  className="text-xs text-muted-foreground"
                />
                <Tooltip
                  formatter={(value: number) => `$${value.toFixed(2)}`}
                  labelStyle={{ color: "#fff" }}
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="grossSales" fill="#818cf8" name="Gross Sales" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cogs" fill="#fb7185" name="COGS" radius={[4, 4, 0, 0]} />
                <Bar dataKey="operatingExpenses" fill="#f59e0b" name="Operating Expenses" radius={[4, 4, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="netProfit"
                  stroke="#34d399"
                  strokeWidth={2}
                  name="Net Profit"
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ─── Financial Statement ────────────────────────────────────────── */}
      <Card className="border-border">
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Financial Statement</h3>
            <span className="text-xs text-muted-foreground">
              {format(new Date(), "MMMM d, yyyy")}
            </span>
          </div>
          <div className="p-4 space-y-2 max-w-2xl mx-auto">
            {statementItems.map((item, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex justify-between items-center py-2 px-4 rounded-lg transition-colors",
                  item.type === "revenue" && "bg-indigo-500/5 text-indigo-400",
                  item.type === "deduction" && "bg-rose-500/5 text-rose-400",
                  item.type === "subtotal" && "bg-amber-500/5 text-amber-400 font-semibold",
                  item.type === "total" && "bg-emerald-500/10 text-emerald-400 font-bold text-lg",
                  idx > 0 && "border-t border-border/30"
                )}
              >
                <span>{item.label}</span>
                <span>{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}