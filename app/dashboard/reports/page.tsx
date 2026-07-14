// app/dashboard/reports/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getBranches } from "@/lib/api";
import {
  getDailySalesSummary,
  getGrossProfitReport,
  getMonthlyPnL,
  getExpenses,
  getInventoryAdjustments,
} from "@/lib/accountingApi";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Receipt,
  Building2,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  Plus,
  RefreshCw,
  BarChart3,
  LineChart,
  TrendingUp as TrendingUpIcon,
  PiggyBank,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import toast from "react-hot-toast";

// ─── Helper function to safely parse numbers ──────────────────────────────
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

// ─── Stat Card ──────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  subtitle?: string;
  color?: string;
  compact?: boolean;
  trendLabel?: string;
}

function StatCard({ 
  title, 
  value, 
  icon, 
  trend, 
  subtitle, 
  color = "text-indigo-400", 
  compact = false,
  trendLabel 
}: StatCardProps) {
  return (
    <Card className="bg-muted/30 border-border hover:bg-muted/30 transition-colors">
      <CardContent className={cn("p-4", compact && "p-3")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2.5 rounded-xl bg-background", color)}>{icon}</div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">{title}</p>
              <p className={cn("font-bold text-foreground", compact ? "text-xl" : "text-2xl")}>{value}</p>
            </div>
          </div>
          {trend !== undefined && (
            <div className={cn(
              "flex flex-col items-end",
              trend >= 0 ? "text-emerald-400" : "text-red-400"
            )}>
              <div className="flex items-center gap-1 text-sm font-medium">
                {trend >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {Math.abs(trend)}%
              </div>
              {trendLabel && <span className="text-[10px] text-muted-foreground">{trendLabel}</span>}
            </div>
          )}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Quick Action Card ─────────────────────────────────────────────────────

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color?: string;
}

function QuickActionCard({ title, description, icon, href, color = "indigo" }: QuickActionCardProps) {
  return (
    <Link href={href}>
      <Card className="bg-muted/30 border-border hover:bg-muted/30 transition-all cursor-pointer group">
        <CardContent className="p-4 flex items-center gap-4">
          <div className={cn(
            "p-3 rounded-xl transition-colors",
            `bg-${color}-500/10 text-${color}-400`
          )}>
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground group-hover:text-indigo-400 transition-colors">
              {title}
            </h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ─── Revenue Chart Component ──────────────────────────────────────────────

interface RevenueChartProps {
  dailyData: { date: string; revenue: number }[];
  weeklyData: { week: string; revenue: number }[];
}

function RevenueChart({ dailyData, weeklyData }: RevenueChartProps) {
  const [view, setView] = useState<'daily' | 'weekly'>('daily');
  const data = view === 'daily' ? dailyData : weeklyData;
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);

  const getItemLabel = (item: { date?: string; week?: string; revenue: number }) => {
    if (view === 'daily' && item.date) {
      return new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' });
    }
    if (view === 'weekly' && item.week) {
      return `W${item.week}`;
    }
    return '';
  };

  const getTooltipLabel = (item: { date?: string; week?: string; revenue: number }) => {
    if (view === 'daily' && item.date) {
      return item.date;
    }
    if (view === 'weekly' && item.week) {
      return `Week ${item.week}`;
    }
    return '';
  };

  const hasData = data.length > 0 && data.some(d => d.revenue > 0);

  return (
    <Card className="bg-muted/30 border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Revenue Overview</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {view === 'daily' ? 'Daily revenue for the past 7 days' : 'Weekly revenue for the past 6 weeks'}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-background rounded-lg p-0.5">
            <button
              onClick={() => setView('daily')}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                view === 'daily' 
                  ? "bg-indigo-500/20 text-indigo-400" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Daily
            </button>
            <button
              onClick={() => setView('weekly')}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                view === 'weekly' 
                  ? "bg-indigo-500/20 text-indigo-400" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Weekly
            </button>
          </div>
        </div>

        {!hasData ? (
          <div className="text-center py-8">
            <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No revenue data available</p>
            <p className="text-xs text-muted-foreground mt-1">Try selecting a different branch or date range</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-end justify-between h-40 gap-1 pt-2">
              {data.map((item, index) => {
                const heightPercent = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                const barHeight = Math.max(heightPercent, 4);
                const isHighest = item.revenue === maxRevenue && maxRevenue > 0;
                const label = getItemLabel(item);
                const tooltipLabel = getTooltipLabel(item);
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col items-center">
                      <span className="text-[10px] text-muted-foreground mb-0.5">
                        {formatCompactCurrency(item.revenue)}
                      </span>
                      <div 
                        className={cn(
                          "w-full rounded-t transition-all duration-500 hover:opacity-80 cursor-pointer",
                          isHighest ? "bg-gradient-to-t from-indigo-500 to-indigo-400" : "bg-indigo-500/30"
                        )}
                        style={{ 
                          height: `${barHeight}%`,
                          minHeight: '4px',
                          maxHeight: '100%'
                        }}
                        title={`${tooltipLabel}: ${formatCompactCurrency(item.revenue)}`}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground truncate w-full text-center mt-1">
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">Total</p>
                <p className="text-sm font-bold text-foreground">
                  {formatCompactCurrency(data.reduce((sum, d) => sum + d.revenue, 0))}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">Average</p>
                <p className="text-sm font-bold text-foreground">
                  {formatCompactCurrency(data.reduce((sum, d) => sum + d.revenue, 0) / data.length)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">Highest</p>
                <p className="text-sm font-bold text-emerald-400">{formatCompactCurrency(maxRevenue)}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function ReportsDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [branchName, setBranchName] = useState<string>("All Branches");
  const [stats, setStats] = useState({
    todayRevenue: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    totalRevenue: 0,
    totalCOGS: 0,
    grossProfit: 0,
    pendingExpenses: 0,
    pendingAdjustments: 0,
  });
  const [dailyRevenue, setDailyRevenue] = useState<{ date: string; revenue: number }[]>([]);
  const [weeklyRevenue, setWeeklyRevenue] = useState<{ week: string; revenue: number }[]>([]);
  const [recentData, setRecentData] = useState<any[]>([]);
  const [todayOrders, setTodayOrders] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Fetch branches on mount
  useEffect(() => {
    fetchBranches();
  }, []);

  // Fetch data when branch changes
  useEffect(() => {
    if (branches.length > 0 && !isInitialLoad) {
      fetchDashboardData();
    }
  }, [selectedBranch]);

  const fetchBranches = async () => {
    try {
      console.log("Fetching branches...");
      const data = await getBranches();
      console.log("Branches data:", data);
      const branchList = data.results || data || [];
      setBranches(branchList);
      
      // Default to All Branches (null)
      setSelectedBranch(null);
      setBranchName("All Branches");
      
      // After branches are loaded, fetch dashboard data
      await fetchDashboardData();
    } catch (error) {
      console.error("Failed to fetch branches:", error);
      setError("Failed to load branches. Please refresh the page.");
      toast.error("Failed to load branches");
      setLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      
      console.log("Fetching dashboard data for:", {
        today: todayStr,
        monthStart: monthStart.toISOString().split('T')[0],
        selectedBranch: selectedBranch
      });
      
      // Get last 7 days
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
      }).reverse();

      // Fetch data in parallel with branch filter
      const [salesData, profitData, expenses, adjustments] = await Promise.all([
        getDailySalesSummary(todayStr, 1, selectedBranch || undefined),
        getGrossProfitReport(
          monthStart.toISOString().split('T')[0],
          todayStr,
          selectedBranch || undefined
        ),
        getExpenses({ 
          is_approved: false,
          ...(selectedBranch && { branch: selectedBranch })
        }),
        getInventoryAdjustments({ 
          is_approved: false,
          ...(selectedBranch && { branch: selectedBranch })
        }),
      ]);

      console.log("Sales data:", salesData);
      console.log("Profit data:", profitData);

      // Fetch daily revenue for the past 7 days with branch filter
      const dailyPromises = last7Days.map(date => 
        getDailySalesSummary(date, 1, selectedBranch || undefined)
          .catch((err) => {
            console.error(`Failed to fetch for ${date}:`, err);
            return { total_sales: 0, number_of_orders: 0 };
          })
      );
      const dailyResults = await Promise.all(dailyPromises);
      
      const dailyRevenueData = last7Days.map((date, index) => ({
        date,
        revenue: safeNumber(dailyResults[index]?.total_sales),
      }));
      setDailyRevenue(dailyRevenueData);

      // Calculate weekly revenue (last 7 days)
      const weeklyTotal = dailyRevenueData.reduce((sum, d) => sum + d.revenue, 0);
      
      // Get today's order count
      setTodayOrders(safeNumber(salesData?.number_of_orders));

      // Generate weekly data for the past 6 weeks with branch filter
      const weeklyData = [];
      for (let w = 0; w < 6; w++) {
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - (w * 7) - 6);
        
        const weekPromises = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(weekStart);
          d.setDate(d.getDate() + i);
          const dateStr = d.toISOString().split('T')[0];
          return getDailySalesSummary(dateStr, 1, selectedBranch || undefined)
            .catch(() => ({ total_sales: 0 }));
        });
        
        const weekResults = await Promise.all(weekPromises);
        const weekRevenue = weekResults.reduce((sum, r) => sum + safeNumber(r?.total_sales), 0);
        
        weeklyData.push({
          week: `${w + 1}`,
          revenue: weekRevenue,
        });
      }
      setWeeklyRevenue(weeklyData.reverse());

      // Calculate total revenue for the year with branch filter
      const yearPromises = Array.from({ length: 12 }, (_, month) => {
        const start = new Date(today.getFullYear(), month, 1);
        const end = new Date(today.getFullYear(), month + 1, 0);
        return getGrossProfitReport(
          start.toISOString().split('T')[0],
          end.toISOString().split('T')[0],
          selectedBranch || undefined
        ).catch(() => ({ total_revenue: 0 }));
      });
      
      const yearResults = await Promise.all(yearPromises);
      const yearTotal = yearResults.reduce((sum, r) => sum + safeNumber(r?.total_revenue), 0);

      // Parse values safely
      setStats({
        todayRevenue: safeNumber(salesData?.total_sales),
        weeklyRevenue: weeklyTotal,
        monthlyRevenue: safeNumber(profitData?.total_revenue),
        totalRevenue: yearTotal,
        totalCOGS: safeNumber(profitData?.total_cogs),
        grossProfit: safeNumber(profitData?.gross_profit),
        pendingExpenses: expenses?.results?.length || 0,
        pendingAdjustments: adjustments?.results?.length || 0,
      });

      setRecentData(salesData?.payment_breakdown ? [salesData] : []);
      
      setIsInitialLoad(false);
      
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      setError("Failed to load dashboard data. Please try again.");
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleBranchChange = (branchId: string) => {
    if (branchId === "all") {
      setSelectedBranch(null);
      setBranchName("All Branches");
    } else {
      const branch = branches.find(b => b.id === parseInt(branchId));
      setSelectedBranch(parseInt(branchId));
      setBranchName(branch?.name || "Selected Branch");
    }
  };

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "admin" || user?.role === "branch_manager";

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Reports Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Financial overview and management reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          {isAdmin && (
            <Link href="/dashboard/accounting/expenses/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Add Expense
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Branch Filter */}
      <Card className="bg-muted/30 border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground font-medium">Branch:</span>
            </div>
            <select
              value={selectedBranch === null ? "all" : selectedBranch.toString()}
              onChange={(e) => handleBranchChange(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[200px]"
            >
              <option value="all">All Branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
              <span className="text-xs text-indigo-400">Showing:</span>
              <span className="text-xs font-medium text-foreground">{branchName}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid - Today, Weekly, Monthly, Total Revenue */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Revenue"
          value={formatCurrency(stats.todayRevenue)}
          icon={<DollarSign className="h-5 w-5" />}
          color="text-emerald-400"
          subtitle={`${todayOrders} orders today`}
        />
        <StatCard
          title="Weekly Revenue"
          value={formatCurrency(stats.weeklyRevenue)}
          icon={<Calendar className="h-5 w-5" />}
          color="text-blue-400"
          subtitle="Last 7 days"
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(stats.monthlyRevenue)}
          icon={<BarChart3 className="h-5 w-5" />}
          color="text-indigo-400"
          subtitle="This month"
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon={<PiggyBank className="h-5 w-5" />}
          color="text-yellow-400"
          subtitle="Year to date"
        />
      </div>

      {/* Second Row - Gross Profit and Pending Approvals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Gross Profit"
          value={formatCurrency(stats.grossProfit)}
          icon={<TrendingUpIcon className="h-5 w-5" />}
          color="text-purple-400"
          trend={stats.grossProfit > 0 ? 12 : -5}
          trendLabel="vs last month"
          subtitle="Revenue - COGS"
        />
        <StatCard
          title="Total COGS"
          value={formatCurrency(stats.totalCOGS)}
          icon={<Package className="h-5 w-5" />}
          color="text-amber-400"
          subtitle="Cost of Goods Sold"
        />
        <StatCard
          title="Pending Expenses"
          value={stats.pendingExpenses}
          icon={<Receipt className="h-5 w-5" />}
          color="text-orange-400"
          subtitle="Awaiting approval"
        />
        <StatCard
          title="Pending Adjustments"
          value={stats.pendingAdjustments}
          icon={<AlertTriangle className="h-5 w-5" />}
          color="text-red-400"
          subtitle="Inventory adjustments"
        />
      </div>

      {/* Revenue Chart */}
      <RevenueChart dailyData={dailyRevenue} weeklyData={weeklyRevenue} />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickActionCard
          title="Sales"
          description="View today's sales summary"
          icon={<Receipt className="h-5 w-5" />}
          href="/dashboard/reports/daily-sales"
        />
        <QuickActionCard
          title="Gross Profit"
          description="Revenue vs COGS analysis"
          icon={<TrendingUp className="h-5 w-5" />}
          href="/dashboard/reports/gross-profit"
        />
        {isAdmin && (
          <QuickActionCard
            title="P&L Report"
            description="Monthly profit & loss"
            icon={<Building2 className="h-5 w-5" />}
            href="/dashboard/reports/monthly-pnl"
          />
        )}
        <QuickActionCard
          title="Shift Closing"
          description="End of shift reconciliation"
          icon={<Clock className="h-5 w-5" />}
          href="/dashboard/reports/shift-closing"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card className="bg-muted/30 border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
              <Link href="/dashboard/reports/transactions" className="text-xs text-indigo-400 hover:text-indigo-300">
                View All →
              </Link>
            </div>
            {recentData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No recent transactions</p>
            ) : (
              <div className="space-y-3">
                {recentData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.date || "Today"}</p>
                        <p className="text-xs text-muted-foreground">Sales Summary</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{formatCurrency(item.total_sales)}</p>
                      <p className="text-xs text-muted-foreground">{item.number_of_orders || 0} orders</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Overview */}
        <Card className="bg-muted/30 border-border">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-white mb-4">Financial Overview</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <span className="text-sm text-muted-foreground">Today's Revenue</span>
                <span className="text-sm font-bold text-emerald-400">{formatCurrency(stats.todayRevenue)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                <span className="text-sm text-muted-foreground">Weekly Revenue</span>
                <span className="text-sm font-bold text-blue-400">{formatCurrency(stats.weeklyRevenue)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
                <span className="text-sm text-muted-foreground">Monthly Revenue</span>
                <span className="text-sm font-bold text-indigo-400">{formatCurrency(stats.monthlyRevenue)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                <span className="text-sm text-muted-foreground">Total Revenue (YTD)</span>
                <span className="text-sm font-bold text-yellow-400">{formatCurrency(stats.totalRevenue)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <span className="text-sm text-muted-foreground">COGS</span>
                <span className="text-sm font-bold text-amber-400">{formatCurrency(stats.totalCOGS)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
                <span className="text-sm text-muted-foreground">Gross Profit</span>
                <span className="text-sm font-bold text-purple-400">{formatCurrency(stats.grossProfit)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-orange-500/5 border border-orange-500/10">
                <span className="text-sm text-muted-foreground">Pending Approvals</span>
                <span className="text-sm font-bold text-orange-400">{stats.pendingExpenses + stats.pendingAdjustments}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}