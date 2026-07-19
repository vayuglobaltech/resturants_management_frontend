"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { 
  ShoppingCart, 
  Clock, 
  DollarSign, 
  Table, 
  AlertCircle, 
  Receipt, 
  TrendingUp, 
  Store, 
  Sparkles, 
  ArrowRight,
  Coffee,
  CheckCircle,
  UserCheck,
  ChevronRight,
  Utensils,
  Wallet,
  CreditCard,
  XCircle,
  Package,
  Users,
  BarChart3,
  Activity
} from "lucide-react";
import { useState, useEffect, type ElementType, type CSSProperties, type ReactNode } from "react";
import { getAccountingSummary } from "@/lib/accountingApi";
import { getBranches, apiFetch } from "@/lib/api";
import { listOrders } from "@/lib/ordersApi";
import { listTables } from "@/lib/tableApi";
import { useTheme } from "@/context/ThemeContext";
import toast from "react-hot-toast";

type StatItem = {
  title: string;
  value: string;
  icon: ElementType;
  href: string;
  subtitle?: string;
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
  completedOrders?: number;
  totalTables?: number;
  occupiedTables?: number;
  availableTables?: number;
  totalActiveOrders?: number;
  todayTransactions?: number;
  completedPayments?: number;
  totalRefunds?: number;
  readyOrders?: number;
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

// ─── Helper to safely extract data ──────────────────────────────────────────
const safeExtract = (data: any, defaultValue: any = []) => {
  if (!data) return defaultValue;
  if (Array.isArray(data)) return data;
  if (data.results && Array.isArray(data.results)) return data.results;
  return defaultValue;
};

export default function DashboardOverview() {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [branchName, setBranchName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [validBranchId, setValidBranchId] = useState<number | null>(null);
  const [isBranchValidated, setIsBranchValidated] = useState(false);
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  
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

  const waiterId = user?.id;

  const themeStyles = {
    "--page-bg": isDarkMode ? "#121110" : "#FAF8F5",
    "--page-surface": isDarkMode ? "#1C1A18" : "#FFFFFF",
    "--page-accent": isDarkMode ? "#D4A359" : "#B88E4C",
    "--page-accent-foreground": isDarkMode ? "#121110" : "#171412",
    "--page-text": isDarkMode ? "#F2EAE1" : "#1A1816",
    "--page-muted": isDarkMode ? "#A69E95" : "#5C564F",
    "--page-border": isDarkMode ? "rgba(212, 163, 89, 0.2)" : "rgba(184, 142, 76, 0.22)",
    "--page-soft": isDarkMode ? "rgba(212, 163, 89, 0.12)" : "rgba(184, 142, 76, 0.12)",
    "--page-hover": isDarkMode ? "rgba(212, 163, 89, 0.16)" : "rgba(184, 142, 76, 0.14)",
    "--page-shadow": isDarkMode ? "0 24px 80px rgba(0,0,0,0.35)" : "0 24px 80px rgba(26,24,22,0.08)",
  } as CSSProperties;

  // ─── Fetch user profile and validate branch ──────────────────────────────────
  useEffect(() => {
    const fetchUserProfileAndValidate = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // First, fetch the user profile to get the branch
        console.log("📡 Fetching user profile for branch...");
        const res = await apiFetch('/api/users/profile/', {}, true);
        
        let profileBranchName = "";
        let profileBranchId = null;
        
        if (res.ok) {
          const profile = await res.json();
          console.log("📋 User profile from API:", profile);
          
          // Try different possible field names for branch
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
          setError("No branches available in the system");
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
            // If branch not in list, use the profile branch name
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
          setError("No valid branch found");
          setLoading(false);
        }
      } catch (error) {
        console.error("❌ Failed to validate branch:", error);
        setError("Failed to load branch data");
        setLoading(false);
      }
    };

    fetchUserProfileAndValidate();
  }, [user]);

  // ─── Fetch additional data based on role ──────────────────────────────────
  const fetchRoleSpecificData = async () => {
    try {
      if (roleName === "waiter" || roleName === "cashier" || roleName === "kitchen_staff") {
        console.log("🔍 Fetching role-specific data for:", roleName);
        
        const [ordersData, tablesData] = await Promise.all([
          listOrders().catch((err) => {
            console.error("❌ Failed to fetch orders:", err);
            return [];
          }),
          listTables().catch((err) => {
            console.error("❌ Failed to fetch tables:", err);
            return [];
          })
        ]);

        const orders = safeExtract(ordersData);
        const tables = safeExtract(tablesData);

        console.log(`📋 Found ${orders.length} orders and ${tables.length} tables`);

        // ─── Waiter Stats ──────────────────────────────────────────────────
        if (roleName === "waiter" && waiterId) {
          const myOrders = orders.filter((o: any) => {
            const waiter = o.waiter || o.server || o.assigned_to;
            return waiter === waiterId || waiter?.id === waiterId;
          });

          console.log(`👤 Waiter ${waiterId} has ${myOrders.length} orders`);

          const myActiveOrders = myOrders.filter((o: any) => {
            const status = o.status?.toLowerCase() || '';
            return ['pending', 'in_progress', 'in-progress', 'ready', 'preparing'].includes(status);
          }).length;

          const myCompletedOrders = myOrders.filter((o: any) => {
            const status = o.status?.toLowerCase() || '';
            return ['completed', 'delivered', 'served', 'paid'].includes(status);
          }).length;

          const myTables = tables.filter((t: any) => {
            const waiter = t.waiter || t.server || t.assigned_to;
            return waiter === waiterId || waiter?.id === waiterId;
          }).length;

          const totalActiveOrders = orders.filter((o: any) => {
            const status = o.status?.toLowerCase() || '';
            return ['pending', 'in_progress', 'in-progress', 'ready', 'preparing'].includes(status);
          }).length;

          const occupiedTables = tables.filter((t: any) => {
            const status = t.status?.toLowerCase() || '';
            return ['occupied', 'reserved', 'busy'].includes(status);
          }).length;

          const availableTables = tables.filter((t: any) => {
            const status = t.status?.toLowerCase() || '';
            return ['available', 'free', 'empty'].includes(status);
          }).length;

          setStats(prev => ({
            ...prev,
            myActiveOrders,
            tablesAssigned: myTables,
            completedOrders: myCompletedOrders,
            totalActiveOrders,
            totalTables: tables.length,
            occupiedTables,
            availableTables,
          }));
        }

        // ─── Cashier Stats ──────────────────────────────────────────────────
        if (roleName === "cashier") {
          const today = new Date().toDateString();
          const todayOrders = orders.filter((o: any) => {
            const orderDate = new Date(o.created_at).toDateString();
            return orderDate === today;
          });

          console.log(`💰 Cashier: ${todayOrders.length} orders today`);

          const completedPayments = todayOrders.filter((o: any) => {
            const status = o.payment_status?.toLowerCase() || o.status?.toLowerCase() || '';
            return ['completed', 'paid', 'settled'].includes(status);
          }).length;

          const pendingPayments = todayOrders.filter((o: any) => {
            const status = o.payment_status?.toLowerCase() || o.status?.toLowerCase() || '';
            return ['pending', 'unpaid', 'awaiting'].includes(status);
          }).length;

          const totalRefunds = todayOrders.filter((o: any) => {
            return o.is_refunded === true || o.status === 'refunded';
          }).length;

          const totalActiveOrders = orders.filter((o: any) => {
            const status = o.status?.toLowerCase() || '';
            return ['pending', 'in_progress', 'in-progress', 'ready', 'preparing'].includes(status);
          }).length;

          setStats(prev => ({
            ...prev,
            todayTransactions: todayOrders.length,
            pendingPayments,
            completedPayments,
            totalRefunds,
            totalActiveOrders,
          }));
        }

        // ─── Kitchen Staff Stats ──────────────────────────────────────────
        if (roleName === "kitchen_staff") {
          const pendingOrders = orders.filter((o: any) => {
            const status = o.status?.toLowerCase() || '';
            return ['pending', 'new'].includes(status);
          }).length;

          const inProgress = orders.filter((o: any) => {
            const status = o.status?.toLowerCase() || '';
            return ['in_progress', 'in-progress', 'preparing'].includes(status);
          }).length;

          const readyOrders = orders.filter((o: any) => {
            const status = o.status?.toLowerCase() || '';
            return ['ready', 'prepared'].includes(status);
          }).length;

          const totalActiveOrders = orders.filter((o: any) => {
            const status = o.status?.toLowerCase() || '';
            return ['pending', 'in_progress', 'in-progress', 'ready', 'preparing'].includes(status);
          }).length;

          console.log(`🍳 Kitchen: ${pendingOrders} pending, ${inProgress} in progress, ${readyOrders} ready`);

          setStats(prev => ({
            ...prev,
            pendingOrders,
            inProgress,
            readyOrders,
            totalActiveOrders,
          }));
        }
      }
    } catch (error) {
      console.error("❌ Failed to fetch role-specific data:", error);
    }
  };

  // ─── Fetch dashboard data when branch is validated ──────────────────────
  useEffect(() => {
    if (isBranchValidated && validBranchId !== null) {
      fetchDashboardData();
    }
  }, [isBranchValidated, validBranchId]);

  // ─── Fetch role-specific data after accounting data is loaded ──────────
  useEffect(() => {
    if (isBranchValidated && validBranchId !== null && !loading) {
      fetchRoleSpecificData();
    }
  }, [isBranchValidated, validBranchId, loading]);

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
      
      if (roleName === "admin" || roleName === "branch_manager" || roleName === "cashier") {
        const data = await getAccountingSummary(validBranchId);
        console.log("📊 Accounting API response:", data);
        
        if (data && typeof data === 'object') {
          const todayRevenue = typeof data.todayRevenue === 'number' ? data.todayRevenue : 0;
          const monthlyRevenue = typeof data.monthlyRevenue === 'number' ? data.monthlyRevenue : 0;
          const grossProfit = typeof data.grossProfit === 'number' ? data.grossProfit : 0;
          const grossProfitMargin = typeof data.grossProfitMargin === 'number' ? data.grossProfitMargin : 0;
          const totalCOGS = typeof data.totalCOGS === 'number' ? data.totalCOGS : 0;
          const pendingExpenses = typeof data.pendingExpenses === 'number' ? data.pendingExpenses : 0;
          const pendingAdjustments = typeof data.pendingAdjustments === 'number' ? data.pendingAdjustments : 0;
          
          setStats(prev => ({
            ...prev,
            todayRevenue,
            monthlyRevenue,
            totalCOGS,
            grossProfit,
            grossProfitMargin,
            pendingExpenses,
            pendingAdjustments,
          }));
          
          console.log("✅ Stats updated:", {
            todayRevenue,
            monthlyRevenue,
            grossProfit,
            grossProfitMargin,
          });
        }
      } else {
        console.log("ℹ️ Skipping accounting data for role:", roleName);
      }
    } catch (error: any) {
      console.error("❌ Failed to fetch dashboard stats:", error);
      console.error("Error details:", {
        message: error?.message,
        status: error?.status,
        response: error?.response,
        branch: error?.branch
      });
      
      if (roleName === "admin" || roleName === "branch_manager") {
        setError(error?.message || "Failed to load dashboard data");
        toast.error("Failed to load dashboard data");
      }
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
            value: `Rs. ${stats.todayRevenue?.toLocaleString() || '0'}`, 
            icon: DollarSign, 
            href: "/dashboard/reports",
            subtitle: "Daily sales"
          },
          { 
            title: "Monthly Revenue", 
            value: `Rs. ${stats.monthlyRevenue?.toLocaleString() || '0'}`, 
            icon: TrendingUp, 
            href: "/dashboard/reports",
            subtitle: "This month"
          },
          { 
            title: "Gross Profit", 
            value: `Rs. ${stats.grossProfit?.toLocaleString() || '0'}`, 
            icon: Receipt, 
            href: "/dashboard/reports",
            subtitle: `${stats.grossProfitMargin?.toFixed(1) || '0'}% margin`
          },
          { 
            title: "Pending Approvals", 
            value: String((stats.pendingExpenses || 0) + (stats.pendingAdjustments || 0)), 
            icon: AlertCircle, 
            href: "/dashboard/accounting",
            subtitle: "Needs review"
          },
        ];

      case "branch_manager":
        return [
          { 
            title: "Today's Revenue", 
            value: `Rs. ${stats.todayRevenue?.toLocaleString() || '0'}`, 
            icon: DollarSign, 
            href: "/dashboard/reports",
            subtitle: "Branch performance"
          },
          { 
            title: "Gross Profit Margin", 
            value: `${stats.grossProfitMargin?.toFixed(1) || '0'}%`, 
            icon: TrendingUp, 
            href: "/dashboard/reports",
            subtitle: "Current margin"
          },
          { 
            title: "Pending Expenses", 
            value: String(stats.pendingExpenses || 0), 
            icon: Clock, 
            href: "/dashboard/expenses",
            subtitle: "Awaiting approval"
          },
          { 
            title: "Pending Adjustments", 
            value: String(stats.pendingAdjustments || 0), 
            icon: AlertCircle, 
            href: "/dashboard/inventory",
            subtitle: "Stock adjustments"
          },
        ];

      case "waiter":
        return [
          { 
            title: "My Active Orders", 
            value: String(stats.myActiveOrders || 0), 
            icon: ShoppingCart, 
            href: "/dashboard/orders",
            subtitle: `${stats.completedOrders || 0} completed today`
          },
          { 
            title: "Tables Assigned", 
            value: String(stats.tablesAssigned || 0), 
            icon: Table, 
            href: "/dashboard/tables",
            subtitle: `${stats.occupiedTables || 0} occupied`
          },
          { 
            title: "Active Orders", 
            value: String(stats.totalActiveOrders || 0), 
            icon: Clock, 
            href: "/dashboard/orders",
            subtitle: "Restaurant total"
          },
          { 
            title: "Available Tables", 
            value: String(stats.availableTables || 0), 
            icon: CheckCircle, 
            href: "/dashboard/tables",
            subtitle: `${stats.totalTables || 0} total tables`
          },
        ];

      case "kitchen_staff":
        return [
          { 
            title: "Pending Orders", 
            value: String(stats.pendingOrders || 0), 
            icon: Clock, 
            href: "/dashboard/kitchen",
            subtitle: "Awaiting prep"
          },
          { 
            title: "In Progress", 
            value: String(stats.inProgress || 0), 
            icon: Utensils, 
            href: "/dashboard/kitchen",
            subtitle: "Being prepared"
          },
          { 
            title: "Ready for Service", 
            value: String(stats.readyOrders || 0), 
            icon: CheckCircle, 
            href: "/dashboard/kitchen",
            subtitle: "To be served"
          },
          { 
            title: "Total Active", 
            value: String(stats.totalActiveOrders || 0), 
            icon: ShoppingCart, 
            href: "/dashboard/kitchen",
            subtitle: "In kitchen"
          },
        ];

      case "cashier":
        return [
          { 
            title: "Today's Sales", 
            value: `Rs. ${stats.todayRevenue?.toLocaleString() || '0'}`, 
            icon: DollarSign, 
            href: "/dashboard/payments",
            subtitle: `${stats.todayTransactions || 0} transactions`
          },
          { 
            title: "Pending Payments", 
            value: String(stats.pendingPayments || 0), 
            icon: Clock, 
            href: "/dashboard/payments",
            subtitle: "Awaiting settlement"
          },
          { 
            title: "Completed Payments", 
            value: String(stats.completedPayments || 0), 
            icon: CheckCircle, 
            href: "/dashboard/payments",
            subtitle: "Today's completions"
          },
          { 
            title: "Refunds Today", 
            value: String(stats.totalRefunds || 0), 
            icon: XCircle, 
            href: "/dashboard/payments",
            subtitle: "Processed today"
          },
        ];

      default:
        return [];
    }
  };

  const items = getStatItems();
  const canViewModules = ["admin", "branch_manager"].includes(roleName);
  const showPerformanceSnapshot = ["admin", "branch_manager"].includes(roleName);

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
            <span className="text-sm">Loading dashboard</span>
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
            Paros
          </p>
          <h1 className="mt-2 text-3xl font-semibold" style={{ color: "var(--page-text)" }}>
            Dashboard Overview
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border px-3 py-2" style={{ borderColor: "var(--page-border)", color: "var(--page-muted)" }}>
            <Store size={16} style={{ color: "var(--page-accent)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--page-text)" }}>
              {branchName || "No Branch"}
            </span>
          </div>
          <div className="rounded-full border px-3 py-2" style={{ borderColor: "var(--page-border)" }}>
            <span className="text-sm font-medium uppercase" style={{ color: "var(--page-accent)" }}>
              {roleName.replace("_", " ")}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[24px] border p-6" style={{ backgroundColor: "var(--page-surface)", borderColor: "var(--page-border)", boxShadow: "var(--page-shadow)" }}>
          <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.3em]" style={{ color: "var(--page-accent)" }}>
            <Sparkles size={16} />
            {roleName === "waiter" ? "Service Operations" : 
             roleName === "cashier" ? "Payment Operations" :
             roleName === "kitchen_staff" ? "Kitchen Operations" :
             "Premium Operations"}
          </div>
          <h2 className="mt-4 text-2xl font-semibold" style={{ color: "var(--page-text)" }}>
            Welcome back, {user?.first_name || user?.username} 👋
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: "var(--page-muted)" }}>
            {roleName === "waiter" 
              ? `You have ${stats.myActiveOrders || 0} active orders across ${stats.tablesAssigned || 0} tables.`
              : roleName === "cashier"
              ? `You've processed ${stats.completedPayments || 0} payments today.`
              : roleName === "kitchen_staff"
              ? `${stats.pendingOrders || 0} orders pending, ${stats.inProgress || 0} in progress.`
              : `You are signed in as ${roleName.replace("_", " ").toUpperCase()} and your hospitality operations are running smoothly.`
            }
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button className="rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5" style={{ backgroundColor: "var(--page-accent)", color: "var(--page-accent-foreground)" }}>
              {roleName === "waiter" ? "New Order" : 
               roleName === "cashier" ? "Process Payment" :
               roleName === "kitchen_staff" ? "Start Prep" :
               "View Reports"}
            </button>
            <button className="rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5" style={{ borderColor: "var(--page-border)", backgroundColor: "var(--page-soft)", color: "var(--page-text)" }}>
              {roleName === "waiter" ? "View Tables" : 
               roleName === "cashier" ? "Payment History" :
               roleName === "kitchen_staff" ? "View Queue" :
               "Manage Modules"}
            </button>
          </div>
        </div>

        {/* ─── Performance Snapshot - Only shown for admin and branch_manager ─── */}
        {showPerformanceSnapshot && (
          <div className="rounded-[24px] border p-6" style={{ backgroundColor: "var(--page-surface)", borderColor: "var(--page-border)", boxShadow: "var(--page-shadow)" }}>
            <p className="text-sm font-medium uppercase tracking-[0.3em]" style={{ color: "var(--page-accent)" }}>
              Performance Snapshot
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border p-3" style={{ borderColor: "var(--page-border)", backgroundColor: "var(--page-soft)" }}>
                <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--page-muted)" }}>Gross profit</p>
                <p className="mt-2 text-lg font-semibold" style={{ color: "var(--page-text)" }}>Rs. {stats.grossProfit?.toLocaleString() || "0"}</p>
              </div>
              <div className="rounded-2xl border p-3" style={{ borderColor: "var(--page-border)", backgroundColor: "var(--page-soft)" }}>
                <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--page-muted)" }}>Margin</p>
                <p className="mt-2 text-lg font-semibold" style={{ color: "var(--page-accent)" }}>{stats.grossProfitMargin?.toFixed(1) || "0"}%</p>
              </div>
              <div className="rounded-2xl border p-3" style={{ borderColor: "var(--page-border)", backgroundColor: "var(--page-soft)" }}>
                <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--page-muted)" }}>Monthly revenue</p>
                <p className="mt-2 text-lg font-semibold" style={{ color: "var(--page-text)" }}>Rs. {stats.monthlyRevenue?.toLocaleString() || "0"}</p>
              </div>
              <div className="rounded-2xl border p-3" style={{ borderColor: "var(--page-border)", backgroundColor: "var(--page-soft)" }}>
                <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--page-muted)" }}>Today</p>
                <p className="mt-2 text-lg font-semibold" style={{ color: "var(--page-text)" }}>Rs. {stats.todayRevenue?.toLocaleString() || "0"}</p>
              </div>
            </div>
          </div>
        )}
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
                {stat.subtitle && (
                  <p className="mt-1 text-xs" style={{ color: "var(--page-muted)" }}>{stat.subtitle}</p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* ─── Role-Specific Quick Actions ────────────────────────────────────── */}
      {(roleName === "waiter" || roleName === "cashier" || roleName === "kitchen_staff") && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Quick Actions */}
          <div className="rounded-[24px] border p-6" style={{ backgroundColor: "var(--page-surface)", borderColor: "var(--page-border)", boxShadow: "var(--page-shadow)" }}>
            <h3 className="text-sm font-medium uppercase tracking-[0.3em]" style={{ color: "var(--page-accent)" }}>
              Quick Actions
            </h3>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {roleName === "waiter" && (
                <>
                  <Link href="/dashboard/orders/new">
                    <button className="w-full rounded-xl border p-4 text-center transition-all duration-200 hover:-translate-y-0.5" style={{ borderColor: "var(--page-border)", backgroundColor: "var(--page-soft)" }}>
                      <Coffee size={24} className="mx-auto" style={{ color: "var(--page-accent)" }} />
                      <p className="mt-2 text-sm font-medium" style={{ color: "var(--page-text)" }}>New Order</p>
                    </button>
                  </Link>
                  <Link href="/dashboard/tables">
                    <button className="w-full rounded-xl border p-4 text-center transition-all duration-200 hover:-translate-y-0.5" style={{ borderColor: "var(--page-border)", backgroundColor: "var(--page-soft)" }}>
                      <Table size={24} className="mx-auto" style={{ color: "var(--page-accent)" }} />
                      <p className="mt-2 text-sm font-medium" style={{ color: "var(--page-text)" }}>View Tables</p>
                    </button>
                  </Link>
                  <Link href="/dashboard/orders">
                    <button className="w-full rounded-xl border p-4 text-center transition-all duration-200 hover:-translate-y-0.5" style={{ borderColor: "var(--page-border)", backgroundColor: "var(--page-soft)" }}>
                      <UserCheck size={24} className="mx-auto" style={{ color: "var(--page-accent)" }} />
                      <p className="mt-2 text-sm font-medium" style={{ color: "var(--page-text)" }}>My Orders</p>
                    </button>
                  </Link>
                </>
              )}
              {roleName === "cashier" && (
                <>
                  <Link href="/dashboard/payments/new">
                    <button className="w-full rounded-xl border p-4 text-center transition-all duration-200 hover:-translate-y-0.5" style={{ borderColor: "var(--page-border)", backgroundColor: "var(--page-soft)" }}>
                      <CreditCard size={24} className="mx-auto" style={{ color: "var(--page-accent)" }} />
                      <p className="mt-2 text-sm font-medium" style={{ color: "var(--page-text)" }}>Process Payment</p>
                    </button>
                  </Link>
                  <Link href="/dashboard/payments">
                    <button className="w-full rounded-xl border p-4 text-center transition-all duration-200 hover:-translate-y-0.5" style={{ borderColor: "var(--page-border)", backgroundColor: "var(--page-soft)" }}>
                      <Receipt size={24} className="mx-auto" style={{ color: "var(--page-accent)" }} />
                      <p className="mt-2 text-sm font-medium" style={{ color: "var(--page-text)" }}>Payment History</p>
                    </button>
                  </Link>
                  <Link href="/dashboard/orders">
                    <button className="w-full rounded-xl border p-4 text-center transition-all duration-200 hover:-translate-y-0.5" style={{ borderColor: "var(--page-border)", backgroundColor: "var(--page-soft)" }}>
                      <ShoppingCart size={24} className="mx-auto" style={{ color: "var(--page-accent)" }} />
                      <p className="mt-2 text-sm font-medium" style={{ color: "var(--page-text)" }}>View Orders</p>
                    </button>
                  </Link>
                </>
              )}
              {roleName === "kitchen_staff" && (
                <>
                  <Link href="/dashboard/kitchen/prep">
                    <button className="w-full rounded-xl border p-4 text-center transition-all duration-200 hover:-translate-y-0.5" style={{ borderColor: "var(--page-border)", backgroundColor: "var(--page-soft)" }}>
                      <Utensils size={24} className="mx-auto" style={{ color: "var(--page-accent)" }} />
                      <p className="mt-2 text-sm font-medium" style={{ color: "var(--page-text)" }}>Start Prep</p>
                    </button>
                  </Link>
                  <Link href="/dashboard/kitchen/ready">
                    <button className="w-full rounded-xl border p-4 text-center transition-all duration-200 hover:-translate-y-0.5" style={{ borderColor: "var(--page-border)", backgroundColor: "var(--page-soft)" }}>
                      <CheckCircle size={24} className="mx-auto" style={{ color: "var(--page-accent)" }} />
                      <p className="mt-2 text-sm font-medium" style={{ color: "var(--page-text)" }}>Mark Ready</p>
                    </button>
                  </Link>
                  <Link href="/dashboard/kitchen/queue">
                    <button className="w-full rounded-xl border p-4 text-center transition-all duration-200 hover:-translate-y-0.5" style={{ borderColor: "var(--page-border)", backgroundColor: "var(--page-soft)" }}>
                      <Clock size={24} className="mx-auto" style={{ color: "var(--page-accent)" }} />
                      <p className="mt-2 text-sm font-medium" style={{ color: "var(--page-text)" }}>View Queue</p>
                    </button>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Recent Activity - For all roles */}
          <div className="rounded-[24px] border p-6" style={{ backgroundColor: "var(--page-surface)", borderColor: "var(--page-border)", boxShadow: "var(--page-shadow)" }}>
            <h3 className="text-sm font-medium uppercase tracking-[0.3em]" style={{ color: "var(--page-accent)" }}>
              Recent Activity
            </h3>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="rounded-full p-2" style={{ backgroundColor: "var(--page-soft)" }}>
                  <Activity size={16} style={{ color: "var(--page-accent)" }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--page-text)" }}>
                    {roleName === "waiter" 
                      ? `${stats.myActiveOrders || 0} active orders`
                      : roleName === "cashier"
                      ? `${stats.todayTransactions || 0} transactions today`
                      : roleName === "kitchen_staff"
                      ? `${stats.totalActiveOrders || 0} orders in kitchen`
                      : "No recent activity"
                    }
                  </p>
                  <p className="text-xs" style={{ color: "var(--page-muted)" }}>
                    {roleName === "waiter" 
                      ? `${stats.tablesAssigned || 0} tables assigned`
                      : roleName === "cashier"
                      ? `${stats.completedPayments || 0} completed payments`
                      : roleName === "kitchen_staff"
                      ? `${stats.pendingOrders || 0} pending, ${stats.inProgress || 0} in progress`
                      : "Live updates"
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
