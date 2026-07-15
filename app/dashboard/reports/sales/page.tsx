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
  serviceCharges: number;
  totalOrders: number;
  averageOrderValue: number;
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
    serviceCharges: 0,
    totalOrders: 0,
    averageOrderValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
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
    setDebugInfo(null);
    try {
      const { start, end } = getDateRange(period);
      const startStr = format(start, "yyyy-MM-dd");
      const endStr = format(end, "yyyy-MM-dd");
      const branchId = getBranchId();

      console.log("📊 Fetching sales report from:", startStr, "to:", endStr);
      console.log("🏢 Branch ID:", branchId);
      console.log("👤 User:", user?.username);

      // ─── 1. Get Sales Transactions from Accounting API ──────────────
      let salesTransactions: any[] = [];
      let totalRevenue = 0;
      
      try {
        const salesData = await getSalesTransactions({
          branch: branchId,
          created_at__gte: startStr,
          created_at__lte: endStr,
        });
        console.log("📊 Sales Transactions Response:", salesData);
        
        salesTransactions = salesData?.results || salesData || [];
        console.log(`✅ Found ${salesTransactions.length} sales transactions`);
        
        // Calculate total revenue from sales transactions
        salesTransactions.forEach((tx: any) => {
          const amount = parseFloat(tx.revenue_amount || tx.amount || 0);
          totalRevenue += amount;
        });
      } catch (error) {
        console.error("❌ Failed to fetch sales transactions:", error);
        toast.error("Failed to fetch sales data");
      }

      // ─── 2. Get Gross Profit Report for summary ─────────────────────
      let grossProfitData = null;
      try {
        grossProfitData = await getGrossProfitReport(startStr, endStr, branchId);
        console.log("📊 Gross Profit Report:", grossProfitData);
      } catch (error) {
        console.error("❌ Failed to fetch gross profit report:", error);
      }

      // ─── 3. Get Daily Sales Summary ─────────────────────────────────
      let dailySummary = null;
      try {
        // Get today's summary
        const todayStr = format(new Date(), "yyyy-MM-dd");
        dailySummary = await getDailySalesSummary(todayStr, 1, branchId);
        console.log("📊 Daily Sales Summary:", dailySummary);
      } catch (error) {
        console.error("❌ Failed to fetch daily sales summary:", error);
      }

      // ─── 4. Group sales transactions by date ──────────────────────
      const grouped: Record<
        string,
        { grossSales: number; refunds: number; orders: number }
      > = {};

      salesTransactions.forEach((tx: any) => {
        const date = format(new Date(tx.created_at), "yyyy-MM-dd");
        if (!grouped[date]) {
          grouped[date] = { grossSales: 0, refunds: 0, orders: 0 };
        }
        const amount = parseFloat(tx.revenue_amount || tx.amount || 0);
        grouped[date].grossSales += amount;
        grouped[date].orders += 1;
      });

      // ─── 5. Build result ──────────────────────────────────────────────
      let totalGross = 0;
      let totalOrders = 0;
      let totalRefunds = 0;
      const result: SalesData[] = [];

      Object.keys(grouped).sort().forEach((date) => {
        const gross = grouped[date].grossSales;
        const ordersCount = grouped[date].orders;
        const refunds = grouped[date].refunds || 0;

        totalGross += gross;
        totalOrders += ordersCount;
        totalRefunds += refunds;

        result.push({
          date: format(new Date(date), "MMM dd"),
          grossSales: gross,
          discounts: 0, // Will be calculated from orders if needed
          refunds: refunds,
          netSales: gross - refunds,
          orders: ordersCount,
          avgOrderValue: ordersCount > 0 ? gross / ordersCount : 0,
        });
      });

      setSalesData(result);

      // ─── 6. Summary ────────────────────────────────────────────────────
      const grossFromReport = grossProfitData 
        ? parseFloat(grossProfitData.total_revenue || '0') 
        : totalGross;
      
      const cogsFromReport = grossProfitData 
        ? parseFloat(grossProfitData.total_cogs || '0') 
        : 0;

      const netSales = grossFromReport;
      const avgOrderValue = totalOrders > 0 ? grossFromReport / totalOrders : 0;

      setSummary({
        grossSales: grossFromReport,
        discounts: 0,
        refunds: totalRefunds,
        netSales: netSales,
        serviceCharges: 0,
        totalOrders: totalOrders,
        averageOrderValue: avgOrderValue,
      });

      // ─── Debug Info ──────────────────────────────────────────────────
      setDebugInfo({
        salesTransactionsCount: salesTransactions.length,
        totalRevenue,
        grossProfitData,
        dailySummary,
        firstTransaction: salesTransactions[0] || null,
        branchId,
        branchName,
      });

      console.log("✅ Sales report complete:", {
        totalGross: grossFromReport,
        totalOrders,
        totalRefunds,
        netSales,
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
  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

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

      {/* ─── No Data Message ────────────────────────────────────────────── */}
      {!hasData && (
        <Card className="bg-muted/30 border-dashed border-2">
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-full bg-muted/50">
                <Receipt className="h-12 w-12 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  No Sales Data Available
                </h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  There are no completed sales transactions for this period.
                  Try selecting a different date range or check your payment
                  data.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setPeriod("week")}
                className="mt-2"
              >
                Try Last 7 Days
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Debug Info (remove in production) ────────────────────────── */}
      {debugInfo && hasData && (
        <Card className="bg-muted/30 border-border border-dashed">
          <CardContent className="p-4">
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground font-medium">
                🔍 Debug Info
              </summary>
              <div className="mt-2 space-y-1">
                <p>Branch: {debugInfo.branchName || 'N/A'} (ID: {debugInfo.branchId || 'N/A'})</p>
                <p>Sales Transactions: {debugInfo.salesTransactionsCount}</p>
                <p>Total Revenue: ${debugInfo.totalRevenue?.toFixed(2) || '0.00'}</p>
                {debugInfo.grossProfitData && (
                  <div className="mt-2 p-2 bg-background rounded">
                    <p className="font-medium">Gross Profit Report:</p>
                    <pre className="mt-1 overflow-auto max-h-40">
                      {JSON.stringify(debugInfo.grossProfitData, null, 2)}
                    </pre>
                  </div>
                )}
                {debugInfo.firstTransaction && (
                  <div className="mt-2 p-2 bg-background rounded">
                    <p className="font-medium">Sample Transaction:</p>
                    <pre className="mt-1 overflow-auto max-h-40">
                      {JSON.stringify(debugInfo.firstTransaction, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          </CardContent>
        </Card>
      )}

      {hasData && (
        <>
          {/* ─── Summary Cards ────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                      <th className="px-4 py-3 text-left">Avg Order</th>
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
                          <td className="px-4 py-3">
                            {formatCurrency(day.avgOrderValue)}
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