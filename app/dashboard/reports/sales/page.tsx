"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { 
  getSalesTransactions, 
  getGrossProfitReport,
  getDailySalesSummary,
} from "@/lib/accountingApi";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  Percent,
  RefreshCw,
  TrendingUp,
  ShoppingBag,
  Receipt,
  ArrowRight,
  AlertCircle,
  Store,
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
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
  Area,
  ComposedChart,
} from "recharts";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/api";

type Period = "today" | "week" | "month" | "custom";
type SalesData = {
  date: string;
  grossSales: number;
  discounts: number;
  refunds: number;
  netSales: number;
  orders: number;
  avgOrderValue: number;
};

type Summary = {
  grossSales: number;
  discounts: number;
  refunds: number;
  netSales: number;
  totalOrders: number;
};

export default function SalesReportPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialPeriod = (searchParams.get("period") as Period) || "today";

  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [summary, setSummary] = useState<Summary>({
    grossSales: 0,
    discounts: 0,
    refunds: 0,
    netSales: 0,
    totalOrders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [branchName, setBranchName] = useState<string>("");

  // ─── Get user's branch ID ─────────────────────────────────────────────
  const getBranchId = () => {
    if (!user) return undefined;
    const branch = (user as any)?.branch;
    if (branch) {
      setBranchName(typeof branch === 'object' ? branch.name : String(branch));
      return typeof branch === 'object' ? branch.id : branch;
    }
    return undefined;
  };

  // ─── Date range helpers ──────────────────────────────────────────────
  const getDateRange = (period: Period) => {
    const now = new Date();
    const today = startOfDay(now);
    switch (period) {
      case "today":
        return { start: today, end: endOfDay(now) };
      case "week":
        return {
          start: subDays(today, 7),
          end: endOfDay(now),
        };
      case "month":
        return {
          start: subDays(today, 30),
          end: endOfDay(now),
        };
      default:
        return { start: today, end: endOfDay(now) };
    }
  };

  const fetchSalesReport = async (period: Period) => {
  setLoading(true);
  try {
    const { start, end } = getDateRange(period);
    const startStr = format(start, "yyyy-MM-dd");
    const endStr = format(end, "yyyy-MM-dd");
    const branchId = getBranchId();

    console.log("📊 Fetching sales report from:", startStr, "to:", endStr);

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
    const completedOrderIds = new Set(completedPayments.map(p => p.order));

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
    const refundedOrderIds = new Set(refundedPayments.map(p => p.order));

    // ─── 4. All orders that have any payment (completed or refunded) ──
    const allPaidOrderIds = new Set([...completedOrderIds, ...refundedOrderIds]);
    const totalOrders = allPaidOrderIds.size;

    // ─── 5. Calculate financial metrics (completed orders only) ──────
    let grossSales = 0;
    let totalDiscounts = 0;
    const grouped: Record<string, { grossSales: number; refunds: number; orders: number }> = {};

    allOrders.forEach((order: any) => {
      if (!allPaidOrderIds.has(order.id)) return;

      const date = format(new Date(order.created_at), "yyyy-MM-dd");
      if (!grouped[date]) grouped[date] = { grossSales: 0, refunds: 0, orders: 0 };

      if (completedOrderIds.has(order.id)) {
        const subtotal = (order.items || []).reduce(
          (sum: number, item: any) => sum + (Number(item.price_at_order) || 0) * (Number(item.quantity) || 0),
          0
        );
        grouped[date].grossSales += subtotal;
        grossSales += subtotal;

        const discSum = (order.discounts || []).reduce(
          (s: number, d: any) => s + Number(d.amount),
          0
        );
        totalDiscounts += discSum;
      }

      grouped[date].orders += 1;
    });

    // ─── 6. Refunds by date ──────────────────────────────────────────
    refundedPayments.forEach((p: any) => {
      const date = format(new Date(p.created_at), "yyyy-MM-dd");
      if (!grouped[date]) grouped[date] = { grossSales: 0, refunds: 0, orders: 0 };
      grouped[date].refunds += Number(p.refunded_amount || 0);
    });

    const totalRefunds = refundedPayments.reduce(
      (sum: number, p: any) => sum + Number(p.refunded_amount || 0),
      0
    );

    // ─── 7. Group discounts by date ──────────────────────────────────
    const discountGrouped: Record<string, number> = {};
    allOrders.forEach((order: any) => {
      if (!completedOrderIds.has(order.id)) return;
      const date = format(new Date(order.created_at), "yyyy-MM-dd");
      const discSum = (order.discounts || []).reduce(
        (s: number, d: any) => s + Number(d.amount),
        0
      );
      if (discSum > 0) discountGrouped[date] = (discountGrouped[date] || 0) + discSum;
    });

    // ─── 8. Build result array ──────────────────────────────────────
    const result: SalesData[] = [];
    Object.keys(grouped).sort().forEach((date) => {
      const gross = grouped[date].grossSales;
      const refunds = grouped[date].refunds || 0;
      const ordersCount = grouped[date].orders;
      const discounts = discountGrouped[date] || 0;
      const netSales = gross - discounts - totalRefunds;


      result.push({
        date: format(new Date(date), "MMM dd"),
        grossSales: gross,
        discounts: discounts,
        refunds: refunds,
        netSales: netSales,
        orders: ordersCount,
      });
    });

    setSalesData(result);

    // ─── 9. Summary ──────────────────────────────────────────────────
    const netSales = grossSales - totalDiscounts - totalRefunds;

    setSummary({
      grossSales: grossSales,
      discounts: totalDiscounts,
      refunds: totalRefunds,
      netSales: netSales,
      totalOrders: totalOrders,
    });

  } catch (error) {
    console.error("❌ Failed to fetch sales report:", error);
    toast.error("Failed to load sales data");
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};
  useEffect(() => {
    fetchSalesReport(period);
  }, [period]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSalesReport(period);
  };

  // ─── Formatting helpers ──────────────────────────────────────────────
const formatCurrency = (value: number | null | undefined) => {
  if (value === undefined || value === null || isNaN(value)) {
    return 'Rs. 0.00';
  }
  return `Rs. ${value.toFixed(2)}`;
};

  // ─── Loading state ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  const hasData = salesData.length > 0 || summary.totalOrders > 0;

  return (
    <div className="space-y-6">
      {/* ─── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sales Report</h1>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
            {branchName && (
              <span className="flex items-center gap-1">
                <Store className="h-3 w-3" />
                {branchName}
              </span>
            )}
            {!hasData && (
              <span className="flex items-center gap-1 text-amber-400">
                <AlertCircle className="h-3 w-3" />
                No sales data found for this period
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
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
            onClick={handleRefresh}
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

      {/* ─── Summary Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border-indigo-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-indigo-500/20">
              <DollarSign className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gross Sales</p>
              <p className="text-2xl font-bold">
                {formatCurrency(summary.grossSales)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500/10 to-rose-500/5 border-rose-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-rose-500/20">
              <Percent className="h-6 w-6 text-rose-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Discounts</p>
              <p className="text-2xl font-bold">
                {formatCurrency(summary.discounts)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-amber-500/20">
              <DollarSign className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Refunds</p>
              <p className="text-2xl font-bold">
                {formatCurrency(summary.refunds)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-emerald-500/20">
              <TrendingUp className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Net Sales</p>
              <p className="text-2xl font-bold">
                {formatCurrency(summary.netSales)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-purple-500/20">
              <ShoppingBag className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="text-2xl font-bold">{summary.totalOrders}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border-cyan-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-cyan-500/20">
              <DollarSign className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg. Order Value</p>
              <p className="text-2xl font-bold">
                {formatCurrency(summary.averageOrderValue)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-500/10 to-slate-500/5 border-slate-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-slate-500/20">
              <Receipt className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Service Charges</p>
              <p className="text-2xl font-bold">
                {formatCurrency(summary.serviceCharges)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Chart ────────────────────────────────────────────────────── */}
      <Card className="border-border">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Sales Trend
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={salesData}>
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
                  dataKey="discounts"
                  fill="#fb7185"
                  name="Discounts"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="refunds"
                  fill="#f59e0b"
                  name="Refunds"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="netSales"
                  stroke="#34d399"
                  strokeWidth={2}
                  name="Net Sales"
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-full bg-purple-500/20">
                  <ShoppingBag className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">{summary.totalOrders}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ─── Chart ────────────────────────────────────────────────────── */}
          <Card className="border-border">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Sales Trend
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={salesData}>
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
                      formatter={(value: number) => `$${value.toFixed(2)}`}
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
                        dataKey="netSales"
                        fill="#34d399"
                        name="Net Sales"
                        radius={[4, 4, 0, 0]}
                      />
                    <Bar
                      dataKey="discounts"
                      fill="#fb7185"
                      name="Discounts"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="refunds"
                      fill="#f59e0b"
                      name="Refunds"
                      radius={[4, 4, 0, 0]}
                    />                  
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* ─── Daily Breakdown Table ────────────────────────────────────── */}
          <Card className="border-border">
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-semibold text-foreground">Daily Breakdown</h3>
                <span className="text-xs text-muted-foreground">
                  {salesData.length} days
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-xs uppercase text-muted-foreground font-semibold">
                    <tr>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Orders</th>
                      <th className="px-4 py-3 text-left">Gross Sales</th>
                      <th className="px-4 py-3 text-left">Discounts</th>
                      <th className="px-4 py-3 text-left">Refunds</th>
                      <th className="px-4 py-3 text-left">Net Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {salesData.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-8 text-center text-muted-foreground"
                        >
                          No sales data for this period.
                        </td>
                      </tr>
                    ) : (
                      salesData.map((day) => (
                        <tr
                          key={day.date}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-foreground">
                            {day.date}
                          </td>
                          <td className="px-4 py-3">{day.orders}</td>
                          <td className="px-4 py-3 font-medium">
                            {formatCurrency(day.grossSales)}
                          </td>
                          <td className="px-4 py-3 text-rose-400">
                            {formatCurrency(day.discounts)}
                          </td>
                          <td className="px-4 py-3 text-amber-400">
                            {formatCurrency(day.refunds)}
                          </td>
                          <td className="px-4 py-3 font-bold text-emerald-400">
                            {formatCurrency(day.netSales)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}