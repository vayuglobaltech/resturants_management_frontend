// app/dashboard/reports/insights/page.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { getBranches } from "@/lib/api";
import {
  getDailySalesSummary,
  getHourlySalesAnalytics,
  getProductSalesAnalytics,
  getDailySalesTrend,
} from "@/lib/accountingApi";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Clock,
  Crown,
  Flame,
  ArrowDown,
  Users,
  Calendar,
  RefreshCw,
  Store,
  BarChart3,
  Activity,
  Receipt,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import toast from "react-hot-toast";

// ─── Helper functions ──────────────────────────────────────────────────────
const safeNumber = (value: any): number => {
  if (value === undefined || value === null) return 0;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? 0 : num;
};

const formatCurrency = (value: any): string => {
  return `$${safeNumber(value).toFixed(2)}`;
};

const formatCompactCurrency = (value: any): string => {
  const num = safeNumber(value);
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
  return `$${num.toFixed(2)}`;
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface HourlyData {
  hour: number;
  orders: number;
  revenue: number;
  label: string;
}

interface ProductSales {
  id: number;
  name: string;
  quantity: number;
  revenue: number;
  percentage: number;
}

interface DailyTrendData {
  date: string;
  orders: number;
  revenue: number;
}

// ─── Stat Card ──────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  color?: string;
  trend?: number;
}

function StatCard({ title, value, icon, subtitle, color = "text-indigo-400", trend }: StatCardProps) {
  return (
    <Card className="bg-muted/30 border-border hover:bg-muted/30 transition-colors min-h-[148px]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={cn("p-3 rounded-2xl bg-background shadow-sm", color)}>{icon}</div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] font-semibold text-muted-foreground">{title}</p>
              <p className="mt-2 text-2xl font-bold leading-tight text-foreground">{value}</p>
            </div>
          </div>
          {trend !== undefined && (
            <div className={cn(
              "rounded-2xl border border-border bg-background px-3 py-2 text-sm font-semibold",
              trend >= 0 ? "text-emerald-400" : "text-red-400"
            )}>
              <div className="flex items-center gap-1">
                {trend >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {Math.abs(trend)}%
              </div>
            </div>
          )}
        </div>
        {subtitle && <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Peak Hours Chart ──────────────────────────────────────────────────────


// ─── Peak Hours Chart ──────────────────────────────────────────────────────

interface PeakHoursChartProps {
  data: HourlyData[];
}

function PeakHoursChart({ data }: PeakHoursChartProps) {
  // If no data or all zeros, show empty state
  const hasData = data.length > 0 && data.some(d => d.orders > 0);
  const maxOrders = hasData ? Math.max(...data.map((d: any) => d.orders)) : 1;

  return (
    <Card className="bg-muted/30 border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Peak Hours</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Order volume by hour</p>
          </div>
          <Clock className="h-5 w-5 text-muted-foreground" />
        </div>

        {!hasData ? (
          <div className="text-center py-8">
            <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No hourly data available</p>
            <p className="text-xs text-muted-foreground mt-1">Try selecting a different date range</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-end justify-between h-40 gap-1 pt-2">
              {data.map((item, index) => {
                // Calculate height as percentage of max
                const heightPercent = maxOrders > 0 ? (item.orders / maxOrders) * 100 : 0;
                // Minimum height for visibility
                const barHeight = Math.max(heightPercent, 4);
                const isPeak = item.orders === maxOrders && maxOrders > 0;
                const isOffPeak = item.orders === 0;
                
                // Format hour label
                const hourLabel = item.hour === 0 ? '12 AM' :
                                 item.hour < 12 ? `${item.hour} AM` :
                                 item.hour === 12 ? '12 PM' :
                                 `${item.hour - 12} PM`;
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col items-center">
                      {/* Revenue value on top */}
                      <span className="text-[10px] text-muted-foreground mb-0.5">
                        {item.orders}
                      </span>
                      {/* Bar */}
                      <div 
                        className={cn(
                          "w-full rounded-t transition-all duration-500 cursor-pointer",
                          isPeak ? "bg-gradient-to-t from-emerald-500 to-emerald-400" :
                          isOffPeak ? "bg-slate-500/20" : "bg-indigo-500/40 hover:bg-indigo-500/60"
                        )}
                        style={{ 
                          height: `${barHeight}%`,
                          minHeight: isOffPeak ? '4px' : '6px',
                          maxHeight: '100%'
                        }}
                        title={`${hourLabel}: ${item.orders} orders, ${formatCompactCurrency(item.revenue)}`}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground truncate w-full text-center mt-1">
                      {hourLabel}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Peak hour summary */}
            {maxOrders > 0 && (
              <div className="pt-3 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Peak Hour:</span>
                  <span className="text-emerald-400 font-bold">
                    {(() => {
                      const peak = data.find(d => d.orders === maxOrders);
                      if (!peak) return 'N/A';
                      return peak.hour === 0 ? '12 AM' :
                             peak.hour < 12 ? `${peak.hour} AM` :
                             peak.hour === 12 ? '12 PM' :
                             `${peak.hour - 12} PM`;
                    })()}
                  </span>
                  <span className="text-muted-foreground">Orders:</span>
                  <span className="text-foreground font-bold">{maxOrders}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Revenue at Peak:</span>
                  <span className="text-emerald-400 font-bold">
                    {formatCompactCurrency(data.find(d => d.orders === maxOrders)?.revenue || 0)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
// ─── Top Products Component ──────────────────────────────────────────────

interface TopProductsProps {
  title: string;
  products: ProductSales[];
  icon: React.ReactNode;
  color: string;
  accentColor: string;
}

function TopProducts({ title, products, icon, color, accentColor }: TopProductsProps) {
  return (
    <Card className="bg-muted/30 border-border">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground mt-1">By revenue</p>
          </div>
          <div className="rounded-2xl bg-background p-2.5 text-foreground shadow-sm">{icon}</div>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No data available</p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.slice(0, 5).map((product, index) => (
              <div key={product.id || index} className="space-y-3 border-b border-border pb-3 last:border-b-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold",
                      index === 0 ? "bg-yellow-500/20 text-yellow-400" :
                      index === 1 ? "bg-slate-400/20 text-muted-foreground" :
                      index === 2 ? "bg-amber-700/20 text-amber-600" :
                      "bg-background text-muted-foreground"
                    )}>
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium text-foreground truncate">{product.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{formatCompactCurrency(product.revenue)}</span>
                </div>
                <div className="h-2 rounded-full bg-background overflow-hidden">
                  <div
                    className={cn("h-2 rounded-full transition-all", accentColor)}
                    style={{ width: `${Math.min(product.percentage, 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {products.length > 5 && (
              <p className="text-xs text-muted-foreground text-center mt-3">
                +{products.length - 5} more items
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Daily Sales Trend Component ──────────────────────────────────────────

interface DailySalesTrendProps {
  data: DailyTrendData[];
}

function DailySalesTrend({ data }: DailySalesTrendProps) {
  const maxRevenue = Math.max(...data.map((d: any) => d.revenue), 1);

  return (
    <Card className="bg-muted/30 border-border">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Daily Sales Trend</h3>
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground mt-1">Revenue trend over time</p>
          </div>
          <div className="rounded-2xl bg-background p-2 text-muted-foreground shadow-sm">
            <BarChart3 className="h-5 w-5" />
          </div>
        </div>

        {data.length === 0 || data.every(d => d.revenue === 0) ? (
          <div className="text-center py-10">
            <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No daily trend data available</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-end justify-between h-36 gap-2">
              {data.map((item, index) => {
                const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                const isHighest = item.revenue === maxRevenue && maxRevenue > 0;
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div 
                      className={cn(
                        "w-full rounded-t transition-all duration-500",
                        isHighest ? "bg-gradient-to-t from-emerald-500 to-emerald-400" : "bg-indigo-500/40 hover:bg-indigo-500/60"
                      )}
                      style={{ 
                        height: `${Math.max(height * 0.9, 6)}%`,
                        minHeight: '6px'
                      }}
                      title={`${item.date}: ${formatCompactCurrency(item.revenue)}`}
                    />
                    <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                      {new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [dateRange, setDateRange] = useState({
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  });
  
  // Stats
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    peakHour: '',
    peakHourOrders: 0,
  });
  
  // Hourly data
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  
  // Product data
  const [bestSellers, setBestSellers] = useState<ProductSales[]>([]);
  const [leastSellers, setLeastSellers] = useState<ProductSales[]>([]);
  
  // Daily trend data
  const [dailyTrendData, setDailyTrendData] = useState<DailyTrendData[]>([]);
  
  // Busiest day
  const [busiestDay, setBusiestDay] = useState<string>('');

  const isMounted = useRef(true);

  // Fetch branches on mount
  useEffect(() => {
    isMounted.current = true;
    fetchBranches();
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchBranches = async () => {
    try {
      const data = await getBranches();
      const branchList = data.results || data || [];
      setBranches(branchList);
      setSelectedBranch(null);
      
      // After branches are loaded, fetch insights
      await fetchInsights();
    } catch (error) {
      console.error("Failed to fetch branches:", error);
      setError("Failed to load branches");
      toast.error("Failed to load branches");
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const fetchInsights = useCallback(async () => {
    if (!isMounted.current) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const startDate = dateRange.start_date;
      const endDate = dateRange.end_date;
      
      // Fetch product sales analytics from API
      const productData = await getProductSalesAnalytics(
        startDate,
        endDate,
        selectedBranch || undefined,
        10
      );
      
      // Process product data
      const products = productData.results || productData || [];
      const totalProductRevenue = products.reduce((sum: number, p: any) => sum + safeNumber(p.revenue), 0);
      
      const productSales: ProductSales[] = products.map((p: any) => ({
        id: p.id,
        name: p.name || `Product #${p.id}`,
        quantity: safeNumber(p.quantity),
        revenue: safeNumber(p.revenue),
        percentage: totalProductRevenue > 0 ? (safeNumber(p.revenue) / totalProductRevenue) * 100 : 0,
      }));
      
      // Sort by revenue
      const sorted = [...productSales].sort((a, b) => b.revenue - a.revenue);
      setBestSellers(sorted);
      setLeastSellers([...sorted].reverse());
      
      // Fetch hourly sales analytics from API
      const hourlyDataResponse = await getHourlySalesAnalytics(
        startDate,
        endDate,
        selectedBranch || undefined
      );
      
      // Process hourly data
      const hourlyResults = hourlyDataResponse.results || hourlyDataResponse || [];
      const hourlyDataArray: HourlyData[] = hourlyResults.map((h: any) => ({
        hour: h.hour,
        orders: safeNumber(h.orders),
        revenue: safeNumber(h.revenue),
        label: `${h.hour}:00`,
      }));
      
      setHourlyData(hourlyDataArray);
      
      // Fetch daily sales trend from API
      const trendData = await getDailySalesTrend(
        startDate,
        endDate,
        selectedBranch || undefined
      );
      
      // Process daily trend data
      const trendResults = trendData.results || trendData || [];
      const dailyTrend: DailyTrendData[] = trendResults.map((d: any) => ({
        date: d.date,
        orders: safeNumber(d.orders),
        revenue: safeNumber(d.revenue),
      }));
      
      setDailyTrendData(dailyTrend);
      
      // Find busiest day (highest orders)
      if (dailyTrend.length > 0) {
        const busiest = dailyTrend.reduce((max, curr) => 
          curr.orders > max.orders ? curr : max
        );
        setBusiestDay(new Date(busiest.date).toLocaleDateString('en-US', { 
          weekday: 'long',
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }));
      }
      
      // Calculate stats
      const totalOrders = hourlyDataArray.reduce((sum, h) => sum + h.orders, 0);
      const totalRevenue = hourlyDataArray.reduce((sum, h) => sum + h.revenue, 0);
      
      // Find peak hour
      const peakHour = hourlyDataArray.reduce((max, curr) => 
        curr.orders > max.orders ? curr : max
      );
      
      setStats({
        totalRevenue: totalRevenue,
        totalOrders: totalOrders,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        peakHour: `${peakHour.hour}:00`,
        peakHourOrders: peakHour.orders,
      });
      
      setIsInitialLoad(false);
      
    } catch (error) {
      console.error("Failed to fetch insights:", error);
      setError("Failed to load insights. Please try again.");
      toast.error("Failed to load insights");
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [dateRange.start_date, dateRange.end_date, selectedBranch]);

  // Fetch data when dependencies change (only after initial load)
  useEffect(() => {
    if (!isInitialLoad && branches.length > 0) {
      fetchInsights();
    }
  }, [dateRange.start_date, dateRange.end_date, selectedBranch, isInitialLoad]);

  const handleBranchChange = (branchId: string) => {
    if (branchId === "all") {
      setSelectedBranch(null);
    } else {
      setSelectedBranch(parseInt(branchId));
    }
  };

  const handleRefresh = () => {
    fetchInsights();
  };

  if (loading && isInitialLoad) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" /> Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">Business Insights</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-2 leading-relaxed">
              Peak hours, best sellers, and performance metrics
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        <Card className="bg-muted/30 border-border">
          <CardContent className="p-5">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(220px,1fr)_minmax(260px,1fr)] xl:grid-cols-[minmax(260px,1fr)_minmax(260px,1fr)_minmax(180px,1fr)] items-end">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Store className="h-4 w-4" />
                  <span className="text-sm font-semibold">Branch</span>
                </div>
                <select
                  value={selectedBranch === null ? "all" : selectedBranch.toString()}
                  onChange={(e) => handleBranchChange(e.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                >
                  <option value="all">All Branches</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-semibold">From</span>
                  </div>
                  <input
                    type="date"
                    value={dateRange.start_date}
                    onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
                    className="rounded-lg border border-border bg-background px-3 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-sm font-semibold">To</span>
                  </div>
                  <input
                    type="date"
                    value={dateRange.end_date}
                    onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
                    className="rounded-lg border border-border bg-background px-3 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Selected Range</p>
                  <p className="mt-1 text-sm text-foreground font-semibold">{dateRange.start_date} – {dateRange.end_date}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={handleRefresh} className="whitespace-nowrap">
                  Refresh data
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon={<DollarSign className="h-5 w-5" />}
          color="text-emerald-400"
          subtitle={`${dateRange.start_date} to ${dateRange.end_date}`}
        />
        <StatCard
          title="Total Orders"
          value={stats.totalOrders}
          icon={<Receipt className="h-5 w-5" />}
          color="text-blue-400"
          subtitle="In selected period"
        />
        <StatCard
          title="Average Order Value"
          value={formatCurrency(stats.averageOrderValue)}
          icon={<TrendingUp className="h-5 w-5" />}
          color="text-purple-400"
          subtitle="Per order average"
        />
        <StatCard
          title="Peak Hour"
          value={stats.peakHour}
          icon={<Clock className="h-5 w-5" />}
          color="text-amber-400"
          subtitle={`${stats.peakHourOrders} orders average`}
        />
      </div>

      {/* Peak Hours Chart */}
      <PeakHoursChart data={hourlyData} />

      {/* Daily Sales Trend */}
      <DailySalesTrend data={dailyTrendData} />

      {/* Best Sellers and Least Sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopProducts
          title="Best Sellers"
          products={bestSellers}
          icon={<Crown className="h-5 w-5 text-yellow-400" />}
          color="text-yellow-400"
          accentColor="bg-yellow-500"
        />
        <TopProducts
          title="Least Sellers"
          products={leastSellers}
          icon={<ArrowDown className="h-5 w-5 text-red-400" />}
          color="text-red-400"
          accentColor="bg-red-500"
        />
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-muted/30 border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Daily Orders</p>
                <p className="text-xl font-bold text-foreground">
                  {Math.round(stats.totalOrders / Math.max(1, 
                    Math.ceil((new Date(dateRange.end_date).getTime() - new Date(dateRange.start_date).getTime()) / (1000 * 60 * 60 * 24))
                  ))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/30 border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Busiest Day</p>
                <p className="text-xl font-bold text-foreground">
                  {busiestDay || 'No data'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/30 border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenue Per Day</p>
                <p className="text-xl font-bold text-white">
                  {formatCurrency(stats.totalRevenue / Math.max(1, 
                    Math.ceil((new Date(dateRange.end_date).getTime() - new Date(dateRange.start_date).getTime()) / (1000 * 60 * 60 * 24))
                  ))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}