"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ShoppingCart, Clock, DollarSign, Table, AlertCircle, Receipt, TrendingUp, Store, Moon, SunMedium, Sparkles, ArrowRight } from "lucide-react";
import { useState, useEffect, type ElementType, type CSSProperties, type ReactNode } from "react";
import { getAccountingSummary } from "@/lib/accountingApi";
import { getBranches } from "@/lib/api";
import { useTheme } from "@/context/ThemeContext";
import toast from "react-hot-toast";

type StatItem = {
  title: string;
  value: string;
  icon: ElementType;
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
  const [branchName, setBranchName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [validBranchId, setValidBranchId] = useState<number | null>(null);
  const [isBranchValidated, setIsBranchValidated] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === "dark";
  // ─── Get branch name directly from user object ──────────────────────────
const userBranchName = (user as any)?.branch?.name || "";
const userBranchId = (user as any)?.branch?.id || null;

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

  const themeStyles = {
    "--page-bg": isDarkMode ? "#121110" : "#FAF8F5",
    "--page-surface": isDarkMode ? "#1C1A18" : "#FFFFFF",
    "--page-accent": isDarkMode ? "#D4A359" : "#B88E4C",
    "--page-text": isDarkMode ? "#F2EAE1" : "#1A1816",
    "--page-muted": isDarkMode ? "#A69E95" : "#5C564F",
    "--page-border": isDarkMode ? "rgba(212, 163, 89, 0.2)" : "rgba(184, 142, 76, 0.22)",
    "--page-soft": isDarkMode ? "rgba(212, 163, 89, 0.12)" : "rgba(184, 142, 76, 0.12)",
    "--page-shadow": isDarkMode ? "0 24px 80px rgba(0,0,0,0.35)" : "0 24px 80px rgba(26,24,22,0.08)",
  } as CSSProperties;
  

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

  const shell = (content: ReactNode) => (
    <div className="min-h-screen transition-all duration-300" style={{ ...themeStyles, backgroundColor: "var(--page-bg)" }}>
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">{content}</div>
    </div>
  );

  if (loading) {
    return shell(
      <>
        <div className="flex flex-col gap-4 rounded-[24px] border p-5 sm:flex-row sm:items-center sm:justify-between" style={{ backgroundColor: "var(--page-surface)", borderColor: "var(--page-border)", boxShadow: "var(--page-shadow)" }}>
          <div>
            <div className="h-3 w-28 rounded-full" style={{ backgroundColor: "var(--page-soft)" }} />
            <div className="mt-3 h-8 w-52 rounded-full" style={{ backgroundColor: "var(--page-soft)" }} />
          </div>
          <div className="flex items-center gap-2 rounded-full border px-3 py-2" style={{ borderColor: "var(--page-border)", color: "var(--page-muted)" }}>
            <Sparkles size={16} />
            <span className="text-sm">Loading premium dashboard</span>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse border-0" style={{ backgroundColor: "var(--page-surface)", boxShadow: "var(--page-shadow)" }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="h-4 w-24 rounded-full" style={{ backgroundColor: "var(--page-soft)" }} />
                <div className="h-4 w-4 rounded-full" style={{ backgroundColor: "var(--page-soft)" }} />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 rounded-full" style={{ backgroundColor: "var(--page-soft)" }} />
              </CardContent>
            </Card>
          ))}
        </div>
      </>
    );
  }

  if (error) {
    return shell(
      <div className="rounded-[24px] border p-6" style={{ backgroundColor: "var(--page-surface)", borderColor: "var(--page-border)", boxShadow: "var(--page-shadow)" }}>
        <div className="flex items-start gap-3">
          <div className="rounded-full p-2" style={{ backgroundColor: "rgba(220, 38, 38, 0.16)" }}>
            <AlertCircle className="h-6 w-6" style={{ color: "#ef4444" }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "#ef4444" }}>Error loading dashboard</p>
            <p className="mt-1 text-sm" style={{ color: "var(--page-muted)" }}>{error}</p>
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
              className="mt-3 rounded-full border px-3 py-2 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5"
              style={{ borderColor: "var(--page-border)", color: "var(--page-accent)" }}
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return shell(
    <>
      <div className="flex flex-col gap-4 rounded-[24px] border p-5 sm:flex-row sm:items-center sm:justify-between" style={{ backgroundColor: "var(--page-surface)", borderColor: "var(--page-border)", boxShadow: "var(--page-shadow)" }}>
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.3em]" style={{ color: "var(--page-accent)" }}>
            Vayu Tech • Hospitality Intelligence
          </p>
          <h1 className="mt-2 text-3xl font-semibold" style={{ color: "var(--page-text)" }}>
            Dashboard Overview
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border px-3 py-2" style={{ borderColor: "var(--page-border)", color: "var(--page-muted)" }}>
            <Store size={16} style={{ color: "var(--page-accent)" }} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[24px] border p-6" style={{ backgroundColor: "var(--page-surface)", borderColor: "var(--page-border)", boxShadow: "var(--page-shadow)" }}>
          <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.3em]" style={{ color: "var(--page-accent)" }}>
            <Sparkles size={16} />
            Premium operations
          </div>
          <h2 className="mt-4 text-2xl font-semibold" style={{ color: "var(--page-text)" }}>
            Welcome back, {user?.first_name || user?.username} 👋
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: "var(--page-muted)" }}>
            You are signed in as <span className="font-semibold" style={{ color: "var(--page-accent)" }}>{roleName.replace("_", " ").toUpperCase()}</span> and your hospitality operations are running smoothly.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button className="rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5" style={{ backgroundColor: "var(--page-accent)", color: "#171412" }}>
              View reports
            </button>
            <button className="rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5" style={{ borderColor: "var(--page-border)", color: "var(--page-text)" }}>
              Manage modules
            </button>
          </div>
        </div>

        <div className="rounded-[24px] border p-6" style={{ backgroundColor: "var(--page-surface)", borderColor: "var(--page-border)", boxShadow: "var(--page-shadow)" }}>
          <p className="text-sm font-medium uppercase tracking-[0.3em]" style={{ color: "var(--page-accent)" }}>
            Performance snapshot
          </p>
          {roleName === "admin" || roleName === "branch_manager" ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border p-3" style={{ borderColor: "var(--page-border)", backgroundColor: "var(--page-soft)" }}>
                <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--page-muted)" }}>Gross profit</p>
                <p className="mt-2 text-lg font-semibold" style={{ color: "var(--page-text)" }}>${stats.grossProfit?.toLocaleString() || "0"}</p>
              </div>
              <div className="rounded-2xl border p-3" style={{ borderColor: "var(--page-border)", backgroundColor: "var(--page-soft)" }}>
                <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--page-muted)" }}>Margin</p>
                <p className="mt-2 text-lg font-semibold" style={{ color: "var(--page-accent)" }}>{stats.grossProfitMargin?.toFixed(1) || "0"}%</p>
              </div>
              <div className="rounded-2xl border p-3" style={{ borderColor: "var(--page-border)", backgroundColor: "var(--page-soft)" }}>
                <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--page-muted)" }}>Monthly revenue</p>
                <p className="mt-2 text-lg font-semibold" style={{ color: "var(--page-text)" }}>${stats.monthlyRevenue?.toLocaleString() || "0"}</p>
              </div>
              <div className="rounded-2xl border p-3" style={{ borderColor: "var(--page-border)", backgroundColor: "var(--page-soft)" }}>
                <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--page-muted)" }}>Today</p>
                <p className="mt-2 text-lg font-semibold" style={{ color: "var(--page-text)" }}>${stats.todayRevenue?.toLocaleString() || "0"}</p>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6" style={{ color: "var(--page-muted)" }}>
              Operational insights will appear here as soon as your role-specific modules are active.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="group h-full border-0 transition-all duration-200 hover:-translate-y-1" style={{ backgroundColor: "var(--page-surface)", boxShadow: "var(--page-shadow)" }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium" style={{ color: "var(--page-muted)" }}>{stat.title}</CardTitle>
                <div className="rounded-full p-2" style={{ backgroundColor: "var(--page-soft)" }}>
                  <stat.icon size={16} style={{ color: "var(--page-accent)" }} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold" style={{ color: "var(--page-text)" }}>{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {canViewModules && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold" style={{ color: "var(--page-text)" }}>Applications & modules</h2>
            <span className="text-sm" style={{ color: "var(--page-muted)" }}>Designed for premium hospitality teams</span>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Link href="/dashboard/inventory" className="group flex flex-col rounded-[24px] border p-6 transition-all duration-300 hover:-translate-y-1" style={{ backgroundColor: "var(--page-surface)", borderColor: "var(--page-border)", boxShadow: "var(--page-shadow)" }}>
              <div className="flex items-center gap-4">
                <div className="rounded-2xl p-3" style={{ backgroundColor: "var(--page-soft)" }}>
                  <span className="text-2xl">📦</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: "var(--page-text)" }}>Inventory system</h3>
                  <p className="text-sm" style={{ color: "var(--page-muted)" }}>Visibility across stock, ingredients, and availability.</p>
                </div>
              </div>
              <div className="mt-5 flex items-center gap-2 text-sm font-medium" style={{ color: "var(--page-accent)" }}>
                Explore module <ArrowRight size={16} />
              </div>
            </Link>

            <Link href="/dashboard/kitchen" className="group flex flex-col rounded-[24px] border p-6 transition-all duration-300 hover:-translate-y-1" style={{ backgroundColor: "var(--page-surface)", borderColor: "var(--page-border)", boxShadow: "var(--page-shadow)" }}>
              <div className="flex items-center gap-4">
                <div className="rounded-2xl p-3" style={{ backgroundColor: "var(--page-soft)" }}>
                  <span className="text-2xl">🍳</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: "var(--page-text)" }}>Kitchen stations</h3>
                  <p className="text-sm" style={{ color: "var(--page-muted)" }}>Coordinate prep lines and station flow with ease.</p>
                </div>
              </div>
              <div className="mt-5 flex items-center gap-2 text-sm font-medium" style={{ color: "var(--page-accent)" }}>
                Explore module <ArrowRight size={16} />
              </div>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}