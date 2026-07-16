// app/dashboard/reports/gross-profit/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getBranches, apiFetch } from "@/lib/api";
import { getGrossProfitReport } from "@/lib/accountingApi";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  RefreshCw,
  Calendar,
  Store,
  Clock,
  BarChart3,
  Calendar as CalendarIcon,
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
  return `Rs. ${safeNumber(value).toFixed(2)}`;
};

const getDateRange = (period: string) => {
  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);

  switch (period) {
    case 'today':
      break;
    case 'week':
      start.setDate(today.getDate() - 6);
      break;
    case 'month':
      start.setDate(1);
      break;
    case 'year':
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

interface ProfitReport {
  period_start: string;
  period_end: string;
  total_revenue: string | number;
  total_cogs: string | number;
  gross_profit: string | number;
  gross_profit_margin_percentage: string | number;
  transaction_count: number;
}

export default function GrossProfitReportPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [validBranchId, setValidBranchId] = useState<number | null>(null);
  const [isBranchValidated, setIsBranchValidated] = useState(false);
  const [report, setReport] = useState<ProfitReport | null>(null);
  const [period, setPeriod] = useState<string>('week');
  const [dateRange, setDateRange] = useState({
    start_date: getDateRange('week').start_date,
    end_date: getDateRange('week').end_date,
  });
  const [showCustomDate, setShowCustomDate] = useState(false);

  // ─── Fetch user profile and validate branch ──────────────────────────────
  useEffect(() => {
    const fetchUserProfileAndValidate = async () => {
      if (!user) return;

      try {
        setLoading(true);
        
        // First, fetch the user profile to get the branch
        console.log("📡 Fetching user profile for branch...");
        const res = await apiFetch('/api/users/profile/', {}, true);
        
        let profileBranchName = "";
        let profileBranchId = null;
        
        if (res.ok) {
          const profile = await res.json();
          console.log("📋 User profile from API:", profile);
          
          if (profile.branch?.name) {
            profileBranchName = profile.branch.name;
            profileBranchId = profile.branch.id;
          } else if (profile.branch_name) {
            profileBranchName = profile.branch_name;
          } else if (profile.branch?.branch_name) {
            profileBranchName = profile.branch.branch_name;
          }
          
          console.log("✅ Found branch name in profile:", profileBranchName);
        } else {
          console.error("Failed to fetch profile:", res.status);
        }
        
        // Now fetch available branches
        console.log("🔍 Fetching available branches...");
        const branchData = await getBranches();
        const branchList = branchData.results || branchData || [];
        console.log("📋 Available branches:", branchList);
        
        if (branchList.length === 0) {
          toast.error("No branches available in the system");
          setLoading(false);
          return;
        }
        
        let selectedBranch = null;
        let selectedBranchName = "";
        
        // FIRST: Try to use branch from profile
        if (profileBranchName) {
          const matchedBranch = branchList.find((b: any) => 
            b.name?.toLowerCase() === profileBranchName.toLowerCase()
          );
          if (matchedBranch) {
            selectedBranch = matchedBranch;
            selectedBranchName = matchedBranch.name;
            console.log("✅ Using branch from profile:", selectedBranchName);
          } else {
            selectedBranchName = profileBranchName;
            selectedBranch = branchList[0];
            console.log("📌 Using profile branch name (not in list):", selectedBranchName);
          }
        }
        
        // SECOND: Try by user's branch ID from auth
        if (!selectedBranch) {
          const userBranchId = (user as any)?.branch?.id;
          if (userBranchId) {
            const branchById = branchList.find((b: any) => b.id === userBranchId);
            if (branchById) {
              selectedBranch = branchById;
              selectedBranchName = branchById.name;
              console.log("✅ Using branch from user ID:", selectedBranchName);
            }
          }
        }
        
        // THIRD: Try by user's branch name from auth
        if (!selectedBranch) {
          const userBranchName = (user as any)?.branch?.name;
          if (userBranchName) {
            const branchByName = branchList.find((b: any) => 
              b.name?.toLowerCase() === userBranchName.toLowerCase()
            );
            if (branchByName) {
              selectedBranch = branchByName;
              selectedBranchName = branchByName.name;
              console.log("✅ Using branch from user name:", selectedBranchName);
            }
          }
        }
        
        // FINAL: Fallback to first branch
        if (!selectedBranch && branchList.length > 0) {
          selectedBranch = branchList[0];
          selectedBranchName = selectedBranch.name || "Default Branch";
          console.log("📌 Using first available branch as fallback:", selectedBranchName);
        }
        
        if (selectedBranch) {
          setValidBranchId(selectedBranch.id);
          setBranchName(selectedBranchName);
          setIsBranchValidated(true);
          console.log("✅ Final branch:", selectedBranchName);
        } else {
          toast.error("No valid branch found");
          setLoading(false);
        }
      } catch (error) {
        console.error("❌ Failed to validate branch:", error);
        toast.error("Failed to load branch data");
        setLoading(false);
      }
    };

    if (user) {
      fetchUserProfileAndValidate();
    }
  }, [user]);

  // ─── Fetch report when branch is validated ──────────────────────────────
  useEffect(() => {
    if (isBranchValidated && validBranchId !== null) {
      fetchReport();
    }
  }, [isBranchValidated, validBranchId, dateRange.start_date, dateRange.end_date, period]);

  const fetchReport = async () => {
    if (!dateRange.start_date || !dateRange.end_date) {
      toast.error("Please select both start and end dates");
      return;
    }

    if (validBranchId === null) {
      toast.error("No valid branch found");
      return;
    }

    try {
      setLoading(true);
      const data = await getGrossProfitReport(
        dateRange.start_date, 
        dateRange.end_date,
        validBranchId // ← Always use the user's branch
      );
      setReport(data);
    } catch (error) {
      console.error("Failed to fetch report:", error);
      toast.error("Failed to load report");
    } finally {
      setLoading(false);
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

  // ─── Loading state ──────────────────────────────────────────────────────
  if (loading && !report) {
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
          <h1 className="text-3xl font-bold text-foreground">Gross Profit Report</h1>
          <p className="text-muted-foreground text-sm mt-1 flex items-center gap-2">
            Revenue vs Cost of Goods Sold analysis - {getPeriodLabel(period)}
            {branchName && (
              <span className="ml-2 text-xs bg-background px-2 py-1 rounded-lg border border-border text-indigo-400">
                🏢 {branchName}
              </span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchReport} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Branch Display (Read-only) */}
      <Card className="bg-muted/30 border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-indigo-400" />
              <span className="text-sm text-muted-foreground font-medium">Branch:</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
              <span className="text-xs text-indigo-400">Viewing:</span>
              <span className="text-sm font-medium text-foreground">{branchName || "No Branch"}</span>
            </div>
            <span className="text-xs text-muted-foreground">(Your assigned branch)</span>

            {/* Period Filter */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-muted-foreground font-medium">Period:</span>
              <div className="flex bg-background rounded-lg p-1">
                {periods.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => handlePeriodChange(p.value)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5",
                      period === p.value
                        ? "bg-indigo-500/20 text-indigo-400"
                        : "text-muted-foreground hover:text-foreground hover:bg-background"
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
                      : "text-muted-foreground hover:text-foreground hover:bg-background"
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
            <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-border">
              <div className="flex-1 min-w-[150px]">
                <label className="text-xs text-muted-foreground block mb-1">Start Date</label>
                <Input
                  type="date"
                  value={dateRange.start_date}
                  onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
                />
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="text-xs text-muted-foreground block mb-1">End Date</label>
                <Input
                  type="date"
                  value={dateRange.end_date}
                  onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
                />
              </div>
              <Button onClick={fetchReport} className="self-end">
                <Calendar className="h-4 w-4 mr-2" /> Apply
              </Button>
            </div>
          )}

          {/* Date Range Display */}
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <span>Showing data from:</span>
            <span className="text-foreground font-medium">
              {new Date(dateRange.start_date).toLocaleDateString()} - {new Date(dateRange.end_date).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>

      {report ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-muted/30 border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(report.total_revenue)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/30 border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total COGS</p>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(report.total_cogs)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/30 border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2.5 rounded-xl",
                    safeNumber(report.gross_profit) >= 0 ? "bg-indigo-500/10 text-indigo-400" : "bg-red-500/10 text-red-400"
                  )}>
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gross Profit</p>
                    <p className={cn(
                      "text-2xl font-bold",
                      safeNumber(report.gross_profit) >= 0 ? "text-indigo-400" : "text-red-400"
                    )}>
                      {formatCurrency(report.gross_profit)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/30 border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2.5 rounded-xl",
                    safeNumber(report.gross_profit_margin_percentage) >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                  )}>
                    {safeNumber(report.gross_profit_margin_percentage) >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Margin</p>
                    <p className={cn(
                      "text-2xl font-bold",
                      safeNumber(report.gross_profit_margin_percentage) >= 30 ? "text-emerald-400" :
                      safeNumber(report.gross_profit_margin_percentage) >= 15 ? "text-amber-400" :
                      "text-red-400"
                    )}>
                      {safeNumber(report.gross_profit_margin_percentage).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Period Info */}
          <Card className="bg-muted/30 border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Period:</span>
                <span className="text-foreground">
                  {new Date(report.period_start).toLocaleDateString()} - {new Date(report.period_end).toLocaleDateString()}
                </span>
                <span className="text-muted-foreground">Transactions:</span>
                <span className="text-foreground font-bold">{report.transaction_count}</span>
              </div>
            </CardContent>
          </Card>

          {/* Chart */}
          <Card className="bg-muted/30 border-border">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">Revenue vs COGS Breakdown</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Revenue</span>
                    <span className="text-emerald-400">{formatCurrency(report.total_revenue)}</span>
                  </div>
                  <div className="w-full bg-background rounded-full h-2">
                    <div 
                      className="bg-emerald-500 h-2 rounded-full transition-all" 
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">COGS</span>
                    <span className="text-amber-400">{formatCurrency(report.total_cogs)}</span>
                  </div>
                  <div className="w-full bg-background rounded-full h-2">
                    <div 
                      className="bg-amber-500 h-2 rounded-full transition-all" 
                      style={{ 
                        width: safeNumber(report.total_revenue) > 0 
                          ? `${(safeNumber(report.total_cogs) / safeNumber(report.total_revenue)) * 100}%` 
                          : '0%' 
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Gross Profit</span>
                    <span className={cn(
                      safeNumber(report.gross_profit) >= 0 ? "text-indigo-400" : "text-red-400"
                    )}>
                      {formatCurrency(report.gross_profit)}
                    </span>
                  </div>
                  <div className="w-full bg-background rounded-full h-2">
                    <div 
                      className={cn(
                        "h-2 rounded-full transition-all",
                        safeNumber(report.gross_profit) >= 0 ? "bg-indigo-500" : "bg-red-500"
                      )}
                      style={{ 
                        width: safeNumber(report.total_revenue) > 0 
                          ? `${(safeNumber(report.gross_profit) / safeNumber(report.total_revenue)) * 100}%` 
                          : '0%' 
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <Card className="bg-muted/30 border-border">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Revenue / COGS Ratio</p>
                  <p className="text-lg font-bold text-foreground">
                    {safeNumber(report.total_revenue) > 0 
                      ? (safeNumber(report.total_revenue) / safeNumber(report.total_cogs)).toFixed(2)
                      : '0.00'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Profit Per Transaction</p>
                  <p className="text-lg font-bold text-foreground">
                    {report.transaction_count > 0 
                      ? formatCurrency(safeNumber(report.gross_profit) / report.transaction_count)
                      : '$0.00'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Revenue Per Transaction</p>
                  <p className="text-lg font-bold text-foreground">
                    {report.transaction_count > 0 
                      ? formatCurrency(safeNumber(report.total_revenue) / report.transaction_count)
                      : '$0.00'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">COGS Per Transaction</p>
                  <p className="text-lg font-bold text-foreground">
                    {report.transaction_count > 0 
                      ? formatCurrency(safeNumber(report.total_cogs) / report.transaction_count)
                      : '$0.00'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="bg-muted/30 border-border">
          <CardContent className="p-12 text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">No data available</p>
            <p className="text-sm text-muted-foreground mt-1">Select a period to view gross profit report</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}