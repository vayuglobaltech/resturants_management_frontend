"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Menu as MenuIcon,
  ShoppingCart,
  Package,
  Utensils,
  Table,
  CreditCard,
  Users,
  BarChart3,
  Plus,
  List,
  Archive,
  Layers,
  Folder,
  CookingPot,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  PieChart,
  Lightbulb,
  Cloud,
  DollarSign,
  TrendingUp,
  Receipt
} from "lucide-react";
import { listMenuItems } from "@/lib/menuApi";
import { listOrders, listTables } from "@/lib/ordersApi";
import { getCategories } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const SUB_FEATURES: Record<
  string,
  { label: string; icon: any; href: string }[]
> = {
  dashboard: [{ label: "Overview", icon: LayoutDashboard, href: "/dashboard" }],
  menu: [{ label: "All Items", icon: List, href: "/dashboard/menu" }],
  orders: [{ label: "Tables", icon: Table, href: "/dashboard/orders" }],
  inventory: [
    { label: "Overview", icon: LayoutDashboard, href: "/dashboard/inventory" },
    { label: "Categories", icon: Layers, href: "/dashboard/inventory/categories" },
    { label: "Ingredients", icon: Package, href: "/dashboard/inventory/ingredients" },
    { label: "Products", icon: Package, href: "/dashboard/inventory/products" },
    { label: "Recipes", icon: Utensils, href: "/dashboard/inventory/recipes" },
    { label: "Stock Levels", icon: Archive, href: "/dashboard/inventory/stock" },
    { label: "Availability", icon: List, href: "/dashboard/inventory/availability" },
    { label: "Transactions", icon: BarChart3, href: "/dashboard/inventory/transactions" },
  ],
  kitchen: [
    { label: "Queue", icon: Utensils, href: "/dashboard/kitchen" },
    { label: "Stations", icon: CookingPot, href: "/dashboard/kitchen/kitchen-stations" },
  ],
  tables: [{ label: "All Tables", icon: Table, href: "/dashboard/tables" }],
  payments: [
    { label: "All Payments", icon: CreditCard, href: "/dashboard/payments" },
    { label: "Generate Bill", icon: Plus, href: "/dashboard/payments/new" },
    { label: "Process Payment", icon: CheckCircle, href: "/dashboard/payments/process" }, // new
    { label: "Failed Payments", icon: XCircle, href: "/dashboard/payments/failed" },
  ],
  users: [{ label: "All Users", icon: Users, href: "/dashboard/users" }],
  reports: [
    { label: "Overview", icon: LayoutDashboard, href: "/dashboard/reports" },
  { label: "Sales Report", icon: BarChart3, href: "/dashboard/reports/sales" },
  { label: "Product Performance", icon: Package, href: "/dashboard/reports/products" },
  { label: "Gross Profit", icon: DollarSign, href: "/dashboard/reports/gross-profit" },
  { label: "Profit & Loss", icon: TrendingUp, href: "/dashboard/reports/profit-loss" },
  { label: "Order Report", icon: Receipt, href: "/dashboard/reports/orders" },
  { label: "Employee Performance", icon: Users, href: "/dashboard/reports/employees" },
  ],
};

interface SidebarProps {
  selectedFeature: string;
  collapsed: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onToggleCollapse: () => void;
}

// ─── Tooltip ──────────────────────────────────────────────────────────
function SidebarTooltip({
  label,
  collapsed,
  children,
}: {
  label: string;
  collapsed: boolean;
  children: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  if (!collapsed) return <>{children}</>;
  return (
    <div
      className="relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap px-2.5 py-1 rounded-lg bg-foreground text-background text-xs font-medium shadow-lg">
          {label}
          <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-foreground" />
        </div>
      )}
    </div>
  );
}

export function DashboardSidebar({
  selectedFeature,
  collapsed,
  mobileOpen,
  onMobileClose,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const rawRole = user?.role ?? user?.name ?? '';
  const roleName =
    typeof rawRole === 'object' && rawRole !== null && 'name' in rawRole
      ? (rawRole as any).name
      : rawRole;
  const userRole = String(roleName).toUpperCase();
  const isManager = ["MANAGER", "BRANCH_MANAGER", "ADMIN"].includes(userRole);

  const items = SUB_FEATURES[selectedFeature] || SUB_FEATURES.dashboard;
  const filteredItems =
    selectedFeature === "payments" && isManager
      ? items.filter((item) => item.label !== "Process Payment")
      : items;

  // ─── Dynamic items ──────────────────────────────────────────────────
  const [dynamicItems, setDynamicItems] = useState<
    { id: string | number; name: string; href: string; status?: string; icon?: any; tableNumber?: number }[]
  >([]);
  const [loadingDynamic, setLoadingDynamic] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchDynamic = async () => {
      setLoadingDynamic(true);
      try {
        // ─── Categories removed for menu ──────────────────────────────
        // No longer fetch categories for "menu"
        if (selectedFeature === "orders") {
          const res = await listTables();
          if (isMounted) {
            const data = res.results || res;
            setDynamicItems(
              Array.isArray(data)
                ? data.map((t: any) => ({
                    id: t.id,
                    name: `Table ${t.table_number}`,
                    href: `/dashboard/orders?table=${t.id}`,
                    status: t.status,
                    icon: Table,
                    tableNumber: t.table_number,
                  }))
                : []
            );
          }
        } else if (selectedFeature === "tables") {
          const res = await listTables();
          if (isMounted) {
            const data = res.results || res;
            setDynamicItems(
              Array.isArray(data)
                ? data.map((t: any) => ({
                    id: t.id,
                    name: `Table ${t.table_number || t.name || t.id}`,
                    href: `/dashboard/tables/${t.id}`,
                    icon: Table,
                    tableNumber: t.table_number,
                  }))
                : []
            );
          }
        } else {
          // For menu or other features, clear dynamic items
          if (isMounted) setDynamicItems([]);
        }
      } catch (e) {
        console.error("Failed to fetch dynamic sidebar items", e);
        if (isMounted) setDynamicItems([]);
      } finally {
        if (isMounted) setLoadingDynamic(false);
      }
    };
    fetchDynamic();
    return () => {
      isMounted = false;
    };
  }, [selectedFeature]);

  const isDynamicActive = (href: string) => {
    if (href.includes("?")) {
      const [base, query] = href.split("?");
      if (pathname !== base) return false;
      const params = new URLSearchParams(query);
      for (const [key, value] of params.entries()) {
        if (searchParams.get(key) !== value) return false;
      }
      return true;
    }
    return pathname === href;
  };

  // ─── Sidebar content ──────────────────────────────────────────────────
  const SidebarContent = () => (
    <div className="h-full bg-card border-r border-border flex flex-col transition-colors duration-200 mt-15">
      {/* Header with toggle */}
      <div className="flex h-10 items-center justify-between border-b border-border bg-muted/20 px-2.5 flex-shrink-0">
        {!collapsed && (
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {selectedFeature.charAt(0).toUpperCase() + selectedFeature.slice(1)}
          </span>
        )}
        <button
          onClick={onToggleCollapse}
          className={cn(
            "p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors",
            collapsed ? "mx-auto" : "ml-auto"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {!collapsed ? (
        // ─── EXPANDED ──────────────────────────────────────────────────
        <>
          <div className="flex-shrink-0 space-y-1 p-2.5">
            {filteredItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-all duration-200 group",
                    isActive
                      ? "bg-[color:var(--primary)]/10 text-[var(--primary)]"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 flex-shrink-0 transition-colors duration-200",
                      isActive ? "text-[var(--primary)]" : "text-muted-foreground"
                    )}
                  />
                  <span className="truncate text-xs font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* ─── Dynamic items (only for orders/tables) ──────────────── */}
          {(selectedFeature === "orders" || selectedFeature === "tables") &&
            (dynamicItems.length > 0 || loadingDynamic) && (
            <div className="flex-1 overflow-y-auto px-2.5 pb-3">
              <div className="mt-2 border-t border-border pt-3">
                <div className="mb-2 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Tables
                </div>
                {loadingDynamic ? (
                  <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
                    <div className="w-3 h-3 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {dynamicItems.map((dItem) => {
                      const isActive = isDynamicActive(dItem.href);
                      const Icon = dItem.icon || Folder;
                      return (
                        <Link
                          key={dItem.id}
                          href={dItem.href}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-all duration-200 group",
                            isActive
                              ? "bg-[color:var(--primary)]/10 text-[var(--primary)]"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-4 w-4 flex-shrink-0 transition-colors duration-200",
                              isActive ? "text-[var(--primary)]" : "text-muted-foreground group-hover:text-foreground"
                            )}
                          />
                          <span className="truncate text-xs font-medium">{dItem.name}</span>
                          {dItem.status === "OCCUPIED" && (
                            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                              OCC
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        // ─── COLLAPSED ──────────────────────────────────────────────────
        <div className="flex flex-col items-center space-y-2 py-2.5">
          {filteredItems.map((item) => (
            <SidebarTooltip key={item.href} label={item.label} collapsed={collapsed}>
              <Link
                href={item.href}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
              >
                <item.icon className="h-4 w-4" />
              </Link>
            </SidebarTooltip>
          ))}

          {/* ─── Dynamic items (only for orders/tables) ──────────────── */}
          {(selectedFeature === "orders" || selectedFeature === "tables") &&
            (dynamicItems.length > 0 || loadingDynamic) && (
            <div className="w-full border-t border-border px-1.5 pt-2">
              {loadingDynamic ? (
                <div className="flex justify-center py-2">
                  <div className="w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-1">
                  {dynamicItems.map((dItem) => {
                    const isActive = isDynamicActive(dItem.href);
                    const Icon = dItem.icon || Folder;
                    const showTableNumber = dItem.tableNumber !== undefined;
                    return (
                      <SidebarTooltip key={dItem.id} label={dItem.name} collapsed={collapsed}>
                        <Link
                          href={dItem.href}
                          className={cn(
                            "flex items-center justify-center rounded-lg p-1.5 transition-all duration-200",
                            isActive
                              ? "bg-[color:var(--primary)]/10 text-[var(--primary)]"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          )}
                        >
                          {showTableNumber ? (
                            <span
                              className={cn(
                                "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                                isActive
                                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              T{dItem.tableNumber}
                            </span>
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                        </Link>
                      </SidebarTooltip>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <aside
      className={cn(
        "fixed left-0 top-16 bottom-0 z-20",
        "bg-card border-r border-border",
        "transition-all duration-300 ease-in-out overflow-hidden",
        collapsed
          ? "w-10 md:w-11"
          : "w-36 md:w-40"
      )}
    >
      <SidebarContent />
    </aside>
  );
}