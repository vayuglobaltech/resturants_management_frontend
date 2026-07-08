"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ShoppingCart, Users, Package, Clock, DollarSign, Table, CreditCard, AlertCircle, Receipt, TrendingUp, Store } from "lucide-react";
import { useState, useEffect } from "react";
import { getAccountingSummary } from "@/lib/accountingApi";
import { getBranches } from "@/lib/api";
import toast from "react-hot-toast";

type StatItem = {
  title: string;
  value: string;
  icon: React.ElementType;
  href: string;
};

type DashboardStats = {
  todayRevenue: number;
  monthlyRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  grossProfitMargin: number;
  pendingExpenses: number;
  pendingAdjustments: number;
  activeOrders?: number;
  totalUsers?: number;
  inventoryItems?: number;
  employees?: number;
  payments?: number;
  myActiveOrders?: number;
  tablesAssigned?: number;
  pendingOrders?: number;
  inProgress?: number;
  pendingPayments?: number;
};

// ─── Accounting Summary Response Type ──────────────────────────────────────
interface AccountingSummaryResponse {
  todayRevenue: number;
  monthlyRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  grossProfitMargin: number;
  pendingExpenses: number;
  pendingAdjustments: number;
  dailySales?: {
    total_sales: number;
    number_of_orders: number;
  };
  grossProfitData?: {
    total_revenue: number;
    total_cogs: number;
    gross_profit: number;
    gross_profit_margin_percentage: number;
  };
}

export default function DashboardOverview() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [branchName, setBranchName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [validBranchId, setValidBranchId] = useState<number | null>(null);
  const [isBranchValidated, setIsBranchValidated] = useState(false);

  const [stats, setStats] = useState<DashboardStats>({
    todayRevenue: 0,
    monthlyRevenue: 0,
    totalCOGS: 0,
    grossProfit: 0,
    grossProfitMargin: 0,
    pendingExpenses: 0,
    pendingAdjustments: 0,
  });

  // ─── Get user's role ──────────────────────────────────────────────────────
  const roleName = user?.role && typeof user.role === "object" && "name" in user.role
    ? (user.role as any).name
    : user?.role || "waiter";

  // ─── Fetch branches and validate user's branch ──────────────────────────
  useEffect(() => {
    const validateBranch = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log("🔍 Fetching available branches...");
        const data = await getBranches();
        const branchList = data.results || data || [];
        
        console.log("📋 Available branches:", branchList);
        
        if (branchList.length === 0) {
          setError("No branches available in the system");
          setLoading(false);
          return;
        }
        
        // Try to find the user's branch
        const userBranchId = (user as any)?.branch?.id;
        console.log("👤 User's branch ID:", userBranchId);
        
        let selectedBranch = null;
        let selectedBranchName = "";
        
        if (userBranchId) {
          selectedBranch = branchList.find((b: any) => b.id === userBranchId);
          if (selectedBranch) {
            selectedBranchName = selectedBranch.name || "My Branch";
            console.log("✅ User's branch found:", selectedBranchName);
          } else {
            console.warn("⚠️ User's branch not found in available branches");
          }
        }
        
        if (!selectedBranch && branchList.length > 0) {
          selectedBranch = branchList[0];
          selectedBranchName = selectedBranch.name || "Default Branch";
          console.log("📌 Using first available branch:", selectedBranchName);
        }
        
        if (selectedBranch) {
          setValidBranchId(selectedBranch.id);
          setBranchName(selectedBranchName);
          setIsBranchValidated(true);
          console.log("✅ Validated branch ID:", selectedBranch.id);
        } else {
          setError("No valid branch found");
          setLoading(false);
        }
      } catch (error) {
        console.error("❌ Failed to fetch branches:", error);
        setError("Failed to load branches");
        setLoading(false);
      }
    };

    if (user) {
      validateBranch();
    }
  }, [user]);

  // ─── Fetch dashboard data when branch is validated ──────────────────────
  useEffect(() => {
    if (isBranchValidated && validBranchId !== null) {
      fetchDashboardData();
    }
  }, [isBranchValidated, validBranchId]);

  // ─── Fetch dashboard data ────────────────────────────────────────────────
  const fetchDashboardData = async () => {
    if (validBranchId === null) {
      console.error("❌ No valid branch ID available");
      setError("No valid branch available");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log("📊 Fetching dashboard stats for branch ID:", validBranchId);
      
      const data = await getAccountingSummary(validBranchId);
      
      console.log("📊 Raw API response:", data);
      
      // Type guard to check if data is the expected type
      if (data && typeof data === 'object') {
        // Safely extract values with proper type checking
        const todayRevenue = typeof data.todayRevenue === 'number' ? data.todayRevenue : 0;
        const monthlyRevenue = typeof data.monthlyRevenue === 'number' ? data.monthlyRevenue : 0;
        const grossProfit = typeof data.grossProfit === 'number' ? data.grossProfit : 0;
        const grossProfitMargin = typeof data.grossProfitMargin === 'number' ? data.grossProfitMargin : 0;
        const totalCOGS = typeof data.totalCOGS === 'number' ? data.totalCOGS : 0;
        const pendingExpenses = typeof data.pendingExpenses === 'number' ? data.pendingExpenses : 0;
        const pendingAdjustments = typeof data.pendingAdjustments === 'number' ? data.pendingAdjustments : 0;
        
        setStats({
          todayRevenue,
          monthlyRevenue,
          totalCOGS,
          grossProfit,
          grossProfitMargin,
          pendingExpenses,
          pendingAdjustments,
        });
        
        console.log("✅ Stats updated:", {
          todayRevenue,
          monthlyRevenue,
          grossProfit,
          grossProfitMargin,
        });
      } else {
        console.error("❌ Unexpected response format:", data);
        setError("Unexpected data format received from server");
      }
    } catch (error: any) {
      console.error("❌ Failed to fetch dashboard stats:", error);
      
      if (error?.branch) {
        setError(`Invalid branch: ${error.branch.join(', ')}`);
      } else {
        setError(error?.message || "Failed to load dashboard data");
      }
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // ─── Define stat items based on role ─────────────────────────────────────
  const getStatItems = (): StatItem[] => {
    switch (roleName) {
      case "admin":
        return [
          { 
            title: "Today's Revenue", 
            value: `$${stats.todayRevenue?.toLocaleString() || '0'}`, 
            icon: DollarSign, 
            href: "/dashboard/reports" 
          },
          { 
            title: "Monthly Revenue", 
            value: `$${stats.monthlyRevenue?.toLocaleString() || '0'}`, 
            icon: TrendingUp, 
            href: "/dashboard/reports" 
          },
          { 
            title: "Gross Profit", 
            value: `$${stats.grossProfit?.toLocaleString() || '0'}`, 
            icon: Receipt, 
            href: "/dashboard/reports" 
          },
          { 
            title: "Pending Approvals", 
            value: String((stats.pendingExpenses || 0) + (stats.pendingAdjustments || 0)), 
            icon: AlertCircle, 
            href: "/dashboard/accounting" 
          },
        ];

      case "branch_manager":
        return [
          { 
            title: "Today's Revenue", 
            value: `$${stats.todayRevenue?.toLocaleString() || '0'}`, 
            icon: DollarSign, 
            href: "/dashboard/reports" 
          },
          { 
            title: "Gross Profit Margin", 
            value: `${stats.grossProfitMargin?.toFixed(1) || '0'}%`, 
            icon: TrendingUp, 
            href: "/dashboard/reports" 
          },
          { 
            title: "Pending Expenses", 
            value: String(stats.pendingExpenses || 0), 
            icon: Clock, 
            href: "/dashboard/expenses" 
          },
          { 
            title: "Pending Adjustments", 
            value: String(stats.pendingAdjustments || 0), 
            icon: AlertCircle, 
            href: "/dashboard/inventory" 
          },
        ];

      case "waiter":
        return [
          { 
            title: "My Active Orders", 
            value: String(stats.myActiveOrders || 0), 
            icon: ShoppingCart, 
            href: "/dashboard/orders" 
          },
          { 
            title: "Tables Assigned", 
            value: String(stats.tablesAssigned || 0), 
            icon: Table, 
            href: "/dashboard/tables" 
          },
        ];

      case "kitchen_staff":
        return [
          { 
            title: "Pending Orders", 
            value: String(stats.pendingOrders || 0), 
            icon: Clock, 
            href: "/dashboard/kitchen" 
          },
          { 
            title: "In Progress", 
            value: String(stats.inProgress || 0), 
            icon: ShoppingCart, 
            href: "/dashboard/kitchen" 
          },
        ];

      case "cashier":
        return [
          { 
            title: "Today's Sales", 
            value: `$${stats.todayRevenue?.toLocaleString() || '0'}`, 
            icon: ShoppingCart, 
            href: "/dashboard/payments" 
          },
          { 
            title: "Pending Payments", 
            value: String(stats.pendingPayments || 0), 
            icon: Clock, 
            href: "/dashboard/payments" 
          },
        ];

      default:
        return [];
    }
  };

  const items = getStatItems();    
  const canViewModules = ["admin", "branch_manager"].includes(roleName);

  // ─── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Dashboard Overview</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-4 w-4 bg-muted rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Dashboard Overview</h1>
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-400">Error loading dashboard</p>
                <p className="text-sm text-muted-foreground">{error}</p>
                <button 
                  onClick={() => {
                    setIsBranchValidated(false);
                    const validateAgain = async () => {
                      try {
                        const data = await getBranches();
                        const branchList = data.results || data || [];
                        if (branchList.length > 0) {
                          setValidBranchId(branchList[0].id);
                          setBranchName(branchList[0].name || "Default Branch");
                          setIsBranchValidated(true);
                          await fetchDashboardData();
                        }
                      } catch (err) {
                        console.error("Failed to re-validate:", err);
                      }
                    };
                    validateAgain();
                  }}
                  className="mt-2 text-sm text-indigo-400 hover:text-indigo-300"
                >
                  Try again
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground transition-colors duration-200">
          Dashboard Overview
        </h1>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
          <Store className="h-4 w-4 text-indigo-400" />
          <span className="text-xs text-muted-foreground">Branch:</span>
          <span className="text-xs font-medium text-foreground">{branchName || "My Branch"}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {items.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:bg-muted/50 transition-all duration-200 cursor-pointer group hover:-translate-y-0.5 border border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-indigo-500 dark:text-indigo-400 group-hover:text-indigo-650 dark:group-hover:text-indigo-300 transition-colors" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-indigo-500/5 to-violet-500/5 dark:from-indigo-500/10 dark:to-violet-500/10 border border-indigo-500/20 transition-all duration-200">
        <h2 className="text-lg font-semibold text-foreground">
          Welcome back, {user?.first_name || user?.username} 👋
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          You are logged in as{" "}
          <span className="text-indigo-600 dark:text-indigo-450 font-medium">
            {roleName.replace("_", " ").toUpperCase()}
          </span>
          .
        </p>
        {(roleName === "admin" || roleName === "branch_manager") && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-background/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Gross Profit</p>
              <p className="text-lg font-semibold text-emerald-400">
                ${stats.grossProfit?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="bg-background/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Margin</p>
              <p className="text-lg font-semibold text-indigo-400">
                {stats.grossProfitMargin?.toFixed(1) || '0'}%
              </p>
            </div>
            <div className="bg-background/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Monthly Revenue</p>
              <p className="text-lg font-semibold text-blue-400">
                ${stats.monthlyRevenue?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="bg-background/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Today's Revenue</p>
              <p className="text-lg font-semibold text-green-400">
                ${stats.todayRevenue?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        )}
      </div>

      {canViewModules && (
        <div>
          <h2 className="text-xl font-bold text-foreground mt-10 mb-4 transition-colors duration-200">
            Applications & Modules
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Link
              href="/dashboard/inventory"
              className="group flex flex-col p-6 rounded-2xl border border-indigo-500/15 bg-indigo-500/5 dark:bg-indigo-500/10 hover:shadow-[0_8px_30px_rgba(99,102,241,0.08)] dark:hover:shadow-[0_8px_30px_rgba(99,102,241,0.15)] hover:-translate-y-1 transition-all duration-300 backdrop-blur-md cursor-pointer"
            >
              <div className="flex items-center gap-4 mb-3">
                <span className="text-4xl group-hover:scale-110 transition-transform duration-300">📦</span>
                <h3 className="text-xl font-bold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                  Inventory System
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Manage product categories, track ingredients, monitor physical stock levels, and control restaurant-wide availability.
              </p>
            </Link>

            <Link
              href="/dashboard/kitchen"
              className="group flex flex-col p-6 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 dark:bg-emerald-500/10 hover:shadow-[0_8px_30px_rgba(16,185,129,0.08)] dark:hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)] hover:-translate-y-1 transition-all duration-300 backdrop-blur-md cursor-pointer"
            >
              <div className="flex items-center gap-4 mb-3">
                <span className="text-4xl group-hover:scale-110 transition-transform duration-300">🍳</span>
                <h3 className="text-xl font-bold text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors">
                  Kitchen Stations
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Manage kitchen stations, track capacity, and monitor station availability across branches.
              </p>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}