"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { calculateFinancialMetrics } from "@/lib/financialMetrics";
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
  AlertCircle,
} from "lucide-react";
import {
  format,
  subDays,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
} from "date-fns";
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
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/api";

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
  transaction_count?: number;
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
const formatCurrency = (value: number) => {
  return `Rs ${value.toFixed(2)}`;
};

// ─── Helper to format percent ───────────────────────────────────────────
const formatPercent = (value: number) => `${value.toFixed(1)}%`;

export default function ProfitLossPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [period, setPeriod] = useState<Period>("today");
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
  const [dataSource, setDataSource] = useState<string>("");
  const [missingCostProducts, setMissingCostProducts] = useState<string[]>([]);

  // ─── Get user's branch ID ─────────────────────────────────────────────
  const getBranchId = useCallback(() => {
    if (!user) return undefined;
    // Try to get branch from user object
    const branch = (user as any)?.branch;
    if (branch) {
      return typeof branch === 'object' ? branch.id : branch;
    }
    return undefined;
  }, [user]);

  // ─── Date range helpers ──────────────────────────────────────────────
  const getDateRange = useCallback(
    (period: Period) => {
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
    },
    [customStart, customEnd],
  );

  // ─── Fetch P&L data using real API ──────────────────────────────────
  const fetchPnL = useCallback(async () => {
  setLoading(true);
  try {
    const { start, end } = getDateRange(period);
    const startStr = format(start, "yyyy-MM-dd");
    const endStr = format(end, "yyyy-MM-dd");
    const branchId = getBranchId();

    const metrics = await calculateFinancialMetrics(startStr, endStr, branchId);

    // Only approved operating expenses belong in the P&L statement.
    let totalExpenses = 0;
    let expenseItems: any[] = [];
    try {
      const branchParam = branchId ? `&branch=${branchId}` : '';
      const expRes = await apiFetch(
        `/api/accounting/expenses/?expense_date__gte=${startStr}&expense_date__lte=${endStr}&is_approved=true${branchParam}&page_size=2000`,
        {},
        true
      );
      const expData = await expRes.json();
      expenseItems = expData.results || expData || [];
      totalExpenses = expenseItems.reduce(
        (sum: number, e: any) => sum + Number(e.amount || 0),
        0
      );
    } catch (error) {
      console.warn("Expense endpoint not available, using 0");
    }

    const expenseMap: Record<string, number> = {};
    expenseItems.forEach((e: any) => {
      const date = format(
        new Date(e.expense_date || e.created_at),
        "yyyy-MM-dd",
      );
      const amount = Number(e.amount || 0);
      expenseMap[date] = (expenseMap[date] || 0) + amount;
    });

    const metricsByDate = new Map(metrics.daily.map((day) => [day.date, day]));
    const allDates = new Set([...metricsByDate.keys(), ...Object.keys(expenseMap)]);

    const result: PnLData[] = Array.from(allDates)
      .sort()
      .map((date) => {
        const day = metricsByDate.get(date);
        const gross = day?.grossSales ?? 0;
        const dayDiscounts = day?.discounts ?? 0;
        const dayRefunds = day?.refunds ?? 0;
        const netSales = day?.netSales ?? 0;
        const cogs = day?.cogs ?? 0;
        const grossProfit = day?.grossProfit ?? 0;
        const operatingExpenses = expenseMap[date] || 0;
        const netProfit = grossProfit - operatingExpenses;
        return {
          date: format(new Date(date), "MMM dd"),
          grossSales: gross,
          discounts: dayDiscounts,
          refunds: dayRefunds,
          netSales,
          cogs,
          grossProfit,
          operatingExpenses,
          netProfit,
        };
      });

    setPnlData(result);
    const totalNetProfit = metrics.grossProfit - totalExpenses;
    const netProfitMargin = metrics.netSales > 0 ? (totalNetProfit / metrics.netSales) * 100 : 0;

    setSummary({
      transaction_count: metrics.paidOrderCount,
      grossSales: metrics.grossSales,
      discounts: metrics.discounts,
      refunds: metrics.refunds,
      netSales: metrics.netSales,
      cogs: metrics.cogs,
      grossProfit: metrics.grossProfit,
      operatingExpenses: totalExpenses,
      netProfit: totalNetProfit,
      netProfitMargin: netProfitMargin,
    });
    setMissingCostProducts(metrics.missingCostProducts);
    setDataSource("Paid sales with product cost prices");

  } catch (error) {
    console.error("Failed to fetch P&L data:", error);
    toast.error("Failed to load profit & loss data");
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, [period, getDateRange, getBranchId]);

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
    { label: "Discounts", value: -summary.discounts, type: "deduction" },
    { label: "Refunds", value: -summary.refunds, type: "deduction" },
    { label: "Net Sales", value: summary.netSales, type: "subtotal" },
    {
      label: "Cost of Goods Sold (COGS)",
      value: summary.cogs,
      type: "deduction",
    },
    { label: "Gross Profit", value: summary.grossProfit, type: "subtotal" },
    { label: "Operating Expenses", value: -summary.operatingExpenses, type: "deduction" },
    { label: "Net Profit", value: summary.netProfit, type: "total" },
  ];

  return (
    <div className="space-y-6">
      {/* ─── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profit & Loss</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {dataSource}
            {summary.transaction_count !== undefined && (
              <span className="ml-2">
                • {summary.transaction_count} transactions
              </span>
            )}
          </p>
        </div>
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
            <RefreshCw
              className={cn("h-4 w-4", refreshing && "animate-spin")}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* ─── COGS Warning ──────────────────────────────────────────────── */}
      {missingCostProducts.length > 0 && (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-400">
                  Some product costs are missing
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  COGS was calculated from menu and product cost prices. The following sold items have no cost price: {missingCostProducts.slice(0, 5).join(", ")}
                  {missingCostProducts.length > 5 ? ` and ${missingCostProducts.length - 5} more` : ""}.
                  <span className="text-amber-400/70">
                    {" "}Add their cost prices to avoid overstating gross profit.
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Summary Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border-indigo-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-indigo-500/20">
              <DollarSign className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gross Sales</p>
              <p className="text-lg font-bold">
                {formatCurrency(summary.grossSales)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-rose-500/10 to-rose-500/5 border-rose-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-rose-500/20">
              <DollarSign className="h-5 w-5 text-rose-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">COGS</p>
              <p className="text-lg font-bold">
                {formatCurrency(summary.cogs)}
              </p>
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
              <p className="text-lg font-bold">
                {formatCurrency(summary.grossProfit)}
              </p>
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
              <p className="text-lg font-bold">
                {formatPercent(summary.netProfitMargin)}
              </p>
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
              <p className="text-xs text-muted-foreground">Net Sales</p>
              <p className="text-lg font-bold">
                {formatCurrency(summary.netSales)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-orange-500/20">
              <DollarSign className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                Operating Expenses
              </p>
              <p className="text-lg font-bold">
                {formatCurrency(summary.operatingExpenses)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-purple-500/20">
              <DollarSign className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Net Profit</p>
              <p className="text-lg font-bold">
                {formatCurrency(summary.netProfit)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Chart ────────────────────────────────────────────────────── */}
      <Card className="border-border">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Profit & Loss Trend
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={pnlData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  className="text-xs text-muted-foreground"
                />
                <YAxis
                  tickFormatter={(value) => `Rs ${value}`}
                  className="text-xs text-muted-foreground"
                />
                <Tooltip
                  formatter={(value: any) => {
                    if (value === undefined || value === null || isNaN(Number(value))) {
                      return 'Rs 0.00';
                    }
                    return `Rs ${Number(value).toFixed(2)}`;
                  }}
                  labelStyle={{ color: "#fff" }}
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="grossSales"
                  fill="#818cf8"
                  name="Gross Sales"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="cogs"
                  fill="#fb7185"
                  name="COGS"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="operatingExpenses"
                  fill="#f97316"
                  name="Operating Expenses"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="netProfit"
                  fill="#f59e0b"
                  name="Net Profit"
                  radius={[4, 4, 0, 0]}
                />
                {/* <Line
                  type="monotone"
                  dataKey="netProfit"
                  stroke="#facc15"
                  strokeWidth={3}
                  name="Net Profit"
                  dot={{ r: 3 }}
                /> */}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ─── Financial Statement ────────────────────────────────────────── */}
      <Card className="border-border">
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">
              Financial Statement
            </h3>
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
                  item.type === "subtotal" &&
                    "bg-amber-500/5 text-amber-400 font-semibold",
                  item.type === "total" &&
                    "bg-emerald-500/10 text-emerald-400 font-bold text-lg",
                  idx > 0 && "border-t border-border/30",
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
