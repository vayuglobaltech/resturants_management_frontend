"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getBranches } from "@/lib/api";
import { getDailySalesSummary } from "@/lib/accountingApi";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import {
  DollarSign,
  CreditCard,
  Receipt,
  Users,
  TrendingUp,
  RefreshCw,
  Calendar,
  Store,
  Clock,
  BarChart3,
  Calendar as CalendarIcon,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
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

const getDateRange = (period: string) => {
  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);

  switch (period) {
    case 'today':
      // Today only
      break;
    case 'week':
      // Last 7 days
      start.setDate(today.getDate() - 6);
      break;
    case 'month':
      // This month
      start.setDate(1);
      break;
    case 'year':
      // This year
      start.setMonth(0, 1);
      break;
    default:
      start.setDate(today.getDate() - 6);
  }

  return {
    start_date: start.toISOString().split('T')[0],
    end_date: end.toISOString().split('T')[0],
  };
};

const getPeriodLabel = (period: string): string => {
  switch (period) {
    case 'today': return 'Today';
    case 'week': return 'This Week';
    case 'month': return 'This Month';
    case 'year': return 'This Year';
    default: return 'Custom';
  }
};

export default function DailySalesSummary() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [period, setPeriod] = useState<string>('week');
  const [dateRange, setDateRange] = useState({
    start_date: getDateRange('week').start_date,
    end_date: getDateRange('week').end_date,
  });
  const [showCustomDate, setShowCustomDate] = useState(false);

  // Fetch branches on mount
  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const data = await getBranches();
      const branchList = data.results || data || [];
      setBranches(branchList);
      setSelectedBranch(null);
    } catch (error) {
      console.error("Failed to fetch branches:", error);
      toast.error("Failed to load branches");
    }
  };

  const fetchSummary = async () => {
    try {
      setLoading(true);
      
      // For date range, fetch multiple days and aggregate
      const startDate = new Date(dateRange.start_date);
      const endDate = new Date(dateRange.end_date);
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      // Fetch data for each day
      const promises = [];
      for (let d = 0; d < daysDiff; d++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + d);
        const dateStr = date.toISOString().split('T')[0];
        promises.push(
          getDailySalesSummary(dateStr, 1, selectedBranch || undefined)
            .catch(() => ({ 
              total_sales: 0, 
              total_cash_sales: 0, 
              total_digital_sales: 0, 
              number_of_orders: 0,
              average_order_value: 0
            }))
        );
      }
      
      const results = await Promise.all(promises);
      
      // Aggregate results
      const aggregated = results.reduce((acc, curr) => ({
        total_sales: acc.total_sales + safeNumber(curr.total_sales),
        total_cash_sales: acc.total_cash_sales + safeNumber(curr.total_cash_sales),
        total_digital_sales: acc.total_digital_sales + safeNumber(curr.total_digital_sales),
        number_of_orders: acc.number_of_orders + safeNumber(curr.number_of_orders),
      }), {
        total_sales: 0,
        total_cash_sales: 0,
        total_digital_sales: 0,
        number_of_orders: 0,
      });
      
      // Calculate average order value
      const avgOrderValue = aggregated.number_of_orders > 0 
        ? aggregated.total_sales / aggregated.number_of_orders 
        : 0;
      
      setSummary({
        ...aggregated,
        average_order_value: avgOrderValue,
        shift_number: 1,
        date_range: {
          start: dateRange.start_date,
          end: dateRange.end_date,
        },
        period: period,
      });
      
    } catch (error) {
      console.error("Failed to fetch summary:", error);
      toast.error("Failed to load sales summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (branches.length > 0) {
      fetchSummary();
    }
  }, [dateRange.start_date, dateRange.end_date, selectedBranch, period]);

  const handleBranchChange = (branchId: string) => {
    if (branchId === "all") {
      setSelectedBranch(null);
    } else {
      setSelectedBranch(parseInt(branchId));
    }
  };

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    const range = getDateRange(newPeriod);
    setDateRange(range);
    setShowCustomDate(false);
  };

  const handleCustomDate = () => {
    setPeriod('custom');
    setShowCustomDate(true);
  };

  const periods = [
    { value: 'today', label: 'Today', icon: Clock },
    { value: 'week', label: 'This Week', icon: Calendar },
    { value: 'month', label: 'This Month', icon: BarChart3 },
    { value: 'year', label: 'This Year', icon: CalendarIcon },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Sales Summary</h1>
          <p className="text-slate-400 text-sm mt-1">
            {getPeriodLabel(period)} sales breakdown and analysis
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSummary} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Branch Filter */}
      <Card className="bg-white/[0.03] border-white/[0.06]">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-400 font-medium">Branch:</span>
            </div>
            <select
              value={selectedBranch === null ? "all" : selectedBranch.toString()}
              onChange={(e) => handleBranchChange(e.target.value)}
              className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[200px]"
            >
              <option value="all">All Branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>

            {/* Period Filter */}
            <div className="flex items-center gap-2 ml-4">
              <span className="text-sm text-slate-400 font-medium">Period:</span>
              <div className="flex bg-white/5 rounded-lg p-1">
                {periods.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => handlePeriodChange(p.value)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5",
                      period === p.value
                        ? "bg-indigo-500/20 text-indigo-400"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <p.icon className="h-3.5 w-3.5" />
                    {p.label}
                  </button>
                ))}
                <button
                  onClick={handleCustomDate}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5",
                    period === 'custom'
                      ? "bg-indigo-500/20 text-indigo-400"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <CalendarIcon className="h-3.5 w-3.5" />
                  Custom
                </button>
              </div>
            </div>
          </div>

          {/* Custom Date Range */}
          {showCustomDate && (
            <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-white/[0.06]">
              <div className="flex-1 min-w-[150px]">
                <label className="text-xs text-slate-400 block mb-1">Start Date</label>
                <Input
                  type="date"
                  value={dateRange.start_date}
                  onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
                />
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="text-xs text-slate-400 block mb-1">End Date</label>
                <Input
                  type="date"
                  value={dateRange.end_date}
                  onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
                />
              </div>
              <Button onClick={fetchSummary} className="self-end">
                <Calendar className="h-4 w-4 mr-2" /> Apply
              </Button>
            </div>
          )}

          {/* Date Range Display */}
          <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
            <span>Showing data from:</span>
            <span className="text-white font-medium">
              {new Date(dateRange.start_date).toLocaleDateString()} - {new Date(dateRange.end_date).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>

      {summary ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white/[0.03] border-white/[0.06]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Total Sales</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(summary.total_sales)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/[0.03] border-white/[0.06]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Digital Sales</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(summary.total_digital_sales)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/[0.03] border-white/[0.06]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Cash Sales</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(summary.total_cash_sales)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/[0.03] border-white/[0.06]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Avg Order Value</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(summary.average_order_value)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="bg-white/[0.03] border-white/[0.06]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Total Orders</p>
                    <p className="text-2xl font-bold text-white">{summary.number_of_orders}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                    <Receipt className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/[0.03] border-white/[0.06]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Period</p>
                    <p className="text-2xl font-bold text-white">{getPeriodLabel(period)}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <Calendar className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {new Date(dateRange.start_date).toLocaleDateString()} - {new Date(dateRange.end_date).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Payment Breakdown */}
          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-white mb-4">Payment Breakdown</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">Cash</span>
                    <span className="text-amber-400">{formatCurrency(summary.total_cash_sales)}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2">
                    <div 
                      className="bg-amber-500 h-2 rounded-full transition-all" 
                      style={{ 
                        width: safeNumber(summary.total_sales) > 0 
                          ? `${(safeNumber(summary.total_cash_sales) / safeNumber(summary.total_sales)) * 100}%` 
                          : '0%' 
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">Digital</span>
                    <span className="text-blue-400">{formatCurrency(summary.total_digital_sales)}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all" 
                      style={{ 
                        width: safeNumber(summary.total_sales) > 0 
                          ? `${(safeNumber(summary.total_digital_sales) / safeNumber(summary.total_sales)) * 100}%` 
                          : '0%' 
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/[0.06] flex justify-between text-sm">
                <span className="text-slate-400">Total Orders</span>
                <span className="text-white font-bold">{summary.number_of_orders}</span>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="bg-white/[0.03] border-white/[0.06]">
          <CardContent className="p-12 text-center">
            <DollarSign className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">No sales data available</p>
            <p className="text-sm text-slate-500 mt-1">Select a period to view sales summary</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}