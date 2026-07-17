"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { 
  getSalesTransactions, 
  getCOGSTransactions, 
  getExpenses,
  getGrossProfitReport,
  getDailySalesSummary,
} from "@/lib/accountingApi";
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
  // operatingExpenses: number;
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
  // operatingExpenses: number;
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
    // operatingExpenses: 0,
    netProfit: 0,
    netProfitMargin: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dataSource, setDataSource] = useState<string>("");

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

    // ─── 1. Fetch ALL orders ──────────────────────────────────────────
    const ordersRes = await apiFetch(
      `/api/orders/?created_at__gte=${startStr}&created_at__lte=${endStr}&page_size=2000`,
      {},
      true
    );
    const ordersData = await ordersRes.json();
    const allOrders = ordersData.results || ordersData || [];

    // ─── 2. Completed payments ──────────────────────────────────────
    const completedRes = await apiFetch(
      `/api/orders/payments/?status=COMPLETED&created_at__gte=${startStr}&created_at__lte=${endStr}&page_size=2000`,
      {},
      true
    );
    const completedData = await completedRes.json();
    const completedPayments = completedData.results || completedData || [];
    const paidOrderIds = new Set(completedPayments.map((p: any) => p.order));

    // ─── 3. Refunded payments ──────────────────────────────────────
    // ─── 3. Refunded payments (full and partial) ──────────────────
let refundedPayments: any[] = [];
try {
  const refundRes = await apiFetch(
    `/api/orders/payments/?status__in=REFUNDED,PARTIALLY_REFUNDED&created_at__gte=${startStr}&created_at__lte=${endStr}&page_size=2000`,
    {},
    true
  );
  const refundData = await refundRes.json();
  refundedPayments = refundData.results || refundData || [];
} catch (error) {
  console.warn("Refunds endpoint not available, using empty array");
}

    // ─── 4. COGS from accounting API ──────────────────────────────
    let totalCogs = 0;
    let grossProfitReportData = null;
    try {
      grossProfitReportData = await getGrossProfitReport(startStr, endStr, branchId);
      if (grossProfitReportData) {
        totalCogs = parseFloat(grossProfitReportData.total_cogs || '0');
      }
    } catch (error) {
      console.warn("Gross Profit Report not available, using 0");
    }

    // ─── COGS: Daily items for chart ──────────────────────────────────
// ─── COGS: Daily items for chart ──────────────────────────────────
let cogsItems: any[] = [];
try {
  // ✅ Add branch parameter to match the summary endpoint
  const branchParam = branchId ? `&branch=${branchId}` : '';
  const cogsUrl = `/api/accounting/cogs-transactions/?created_at__gte=${startStr}&created_at__lte=${endStr}${branchParam}&page_size=2000`;
  console.log(`🔍 COGS Items URL: ${cogsUrl}`);
  
  const cogsRes = await apiFetch(cogsUrl, {}, true);
  const cogsData = await cogsRes.json();
  cogsItems = cogsData.results || cogsData || [];
  console.log(`📦 COGS Items Response:`, cogsItems);
} catch (error) {
  console.warn("COGS items endpoint not available, using empty array");
}

    // ─── 5. Expenses from accounting API ──────────────────────────
    let totalExpenses = 0;
    let expenseItems: any[] = [];
    try {
      const expRes = await apiFetch(
        `/api/accounting/expenses/?expense_date__gte=${startStr}&expense_date__lte=${endStr}&page_size=2000`,
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

    // ─── 6. Calculate Gross Sales & Discounts from orders ────────────
    let grossSales = 0;
    let totalDiscounts = 0;
    const salesGrouped: Record<string, number> = {};
    const discountGrouped: Record<string, number> = {};

    allOrders.forEach((order: any) => {
      if (!paidOrderIds.has(order.id)) return;

      const date = format(new Date(order.created_at), "yyyy-MM-dd");
      // Gross Sales from items
      const subtotal = (order.items || []).reduce(
        (sum: number, item: any) => sum + (Number(item.price_at_order) || 0) * (Number(item.quantity) || 0),
        0
      );
      grossSales += subtotal;
      salesGrouped[date] = (salesGrouped[date] || 0) + subtotal;

      // Discounts
      const discSum = (order.discounts || []).reduce(
        (s: number, d: any) => s + Number(d.amount),
        0
      );
      totalDiscounts += discSum;
      discountGrouped[date] = (discountGrouped[date] || 0) + discSum;
    });

    // ─── 7. Group COGS by date ──────────────────────────────────────
    const cogsMap: Record<string, number> = {};
    cogsItems.forEach((c: any) => {
      const date = format(new Date(c.created_at), "yyyy-MM-dd");
      const amount = Number(c.total_cogs || 0);
      cogsMap[date] = (cogsMap[date] || 0) + amount;
    });

    // ─── 8. Group expenses by date ──────────────────────────────────
    const expenseMap: Record<string, number> = {};
    expenseItems.forEach((e: any) => {
      const date = format(
        new Date(e.expense_date || e.created_at),
        "yyyy-MM-dd",
      );
      const amount = Number(e.amount || 0);
      expenseMap[date] = (expenseMap[date] || 0) + amount;
    });

    // ─── 9. Group refunds by date ──────────────────────────────────
    const refundGrouped: Record<string, number> = {};
    refundedPayments.forEach((p: any) => {
      const date = format(new Date(p.created_at), "yyyy-MM-dd");
      const refundAmt = Number(p.refunded_amount || 0);
      refundGrouped[date] = (refundGrouped[date] || 0) + refundAmt;
    });

    // ─── 10. Build daily P&L data ──────────────────────────────────
    const allDates = new Set([
      ...Object.keys(salesGrouped),
      ...Object.keys(discountGrouped),
      ...Object.keys(cogsMap),
      ...Object.keys(expenseMap),
      ...Object.keys(refundGrouped),
    ]);

    const totalRefunds = refundedPayments.reduce(
      (sum: number, p: any) => sum + Number(p.refunded_amount || 0),
      0
    );

    const result: PnLData[] = Array.from(allDates)
      .sort()
      .map((date) => {
        const gross = salesGrouped[date] || 0;
        const discounts = discountGrouped[date] || 0;
        const refunds = refundGrouped[date] || 0;
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
          netProfit,
        };
      });

    setPnlData(result);

    // ─── 11. Summary ──────────────────────────────────────────────────
    const totalNetSales = grossSales - totalDiscounts - totalRefunds;
    const totalGrossProfit = totalNetSales - totalCogs;
    const totalNetProfit = totalGrossProfit - totalExpenses;
    const netProfitMargin = grossSales > 0 ? (totalNetProfit / grossSales) * 100 : 0;

    setSummary({
      grossSales: grossSales,
      discounts: totalDiscounts,
      refunds: totalRefunds,
      netSales: totalNetSales,
      cogs: totalCogs,
      grossProfit: totalGrossProfit,
      netProfit: totalNetProfit,
      netProfitMargin: netProfitMargin,
    });

    setDataSource("Real data from API");

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
    { label: "Net Sales", value: summary.netSales, type: "subtotal" },
    {
      label: "Cost of Goods Sold (COGS)",
      value: summary.cogs,
      type: "deduction",
    },
    { label: "Gross Profit", value: summary.grossProfit, type: "subtotal" },
    // {
    //   label: "Operating Expenses",
    //   value: summary.operatingExpenses,
    //   type: "deduction",
    // },
    { label: "Net Profit", value: summary.netProfit, type: "total" },
  ];

  return (
    <div className="space-y-6">
      {/* ─── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profit & Loss</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {dataSource && `📊 ${dataSource}`}
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
      {summary.cogs === 0 && summary.grossSales > 0 && (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-400">
                  COGS Data Missing
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  COGS is showing as 0. This usually means products don't have 
                  cost prices set or COGS transactions haven't been created.
                  <br />
                  <span className="text-amber-400/70">
                    Tip: Set cost prices on products and ensure COGS transactions 
                    are created when orders are delivered.
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
        {/* <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
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
        </Card> */}
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
                  tickFormatter={(value) => `$${value}`}
                  className="text-xs text-muted-foreground"
                />
                <Tooltip
                  formatter={(value: any) => {
                    if (value === undefined || value === null || isNaN(Number(value))) {
                      return '$0.00';
                    }
                    return `$${Number(value).toFixed(2)}`;
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