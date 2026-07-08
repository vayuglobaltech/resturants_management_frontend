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
  CheckCircle
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

  ],
  users: [{ label: "All Users", icon: Users, href: "/dashboard/users" }],
  reports: [
    { label: "Sales Report", icon: BarChart3, href: "/dashboard/reports" },
    { label: "Gross Profit", icon: BarChart3, href: "/dashboard/reports/gross-profit" },
    { label: "Sales Analytics", icon: BarChart3, href: "/dashboard/reports/daily-sales" },
    { label: "Transaction reports", icon: BarChart3, href: "/dashboard/reports/transactions" },
    { label: "Insights", icon: BarChart3, href: "/dashboard/reports/insights" },
  ],
};

interface SidebarProps {
  selectedFeature: string;
  collapsed: boolean;
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
      <div className="flex items-center justify-between px-3 h-12 border-b border-border flex-shrink-0 bg-muted/20">
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
          <div className="p-4 space-y-1 flex-shrink-0">
            {filteredItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                    isActive
                      ? "bg-indigo-500/10 text-indigo-650 dark:bg-indigo-500/20 dark:text-indigo-400"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 flex-shrink-0 transition-colors duration-200",
                      isActive ? "text-indigo-600 dark:text-indigo-400" : "text-muted-foreground"
                    )}
                  />
                  <span className="text-sm font-medium truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* ─── Dynamic items (only for orders/tables) ──────────────── */}
          {(selectedFeature === "orders" || selectedFeature === "tables") &&
            (dynamicItems.length > 0 || loadingDynamic) && (
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <div className="mt-2 pt-4 border-t border-border">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1 mb-2">
                  Tables
                </div>
                {loadingDynamic ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
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
                            "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group",
                            isActive
                              ? "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-5 w-5 flex-shrink-0 transition-colors duration-200",
                              isActive ? "text-indigo-650 dark:text-indigo-400" : "text-muted-foreground group-hover:text-foreground"
                            )}
                          />
                          <span className="text-sm font-medium truncate">{dItem.name}</span>
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
        <div className="flex flex-col items-center py-4 space-y-3">
          {filteredItems.map((item) => (
            <SidebarTooltip key={item.href} label={item.label} collapsed={collapsed}>
              <Link
                href={item.href}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-200"
              >
                <item.icon className="h-5 w-5" />
              </Link>
            </SidebarTooltip>
          ))}

          {/* ─── Dynamic items (only for orders/tables) ──────────────── */}
          {(selectedFeature === "orders" || selectedFeature === "tables") &&
            (dynamicItems.length > 0 || loadingDynamic) && (
            <div className="w-full px-2 pt-2 border-t border-border">
              {loadingDynamic ? (
                <div className="flex justify-center py-2">
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
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
                            "flex items-center justify-center p-2 rounded-xl transition-all duration-200",
                            isActive
                              ? "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          )}
                        >
                          {showTableNumber ? (
                            <span
                              className={cn(
                                "flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full",
                                isActive
                                  ? "bg-indigo-500 text-white dark:bg-indigo-400 dark:text-white"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              T{dItem.tableNumber}
                            </span>
                          ) : (
                            <Icon className="h-5 w-5" />
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
          ? "w-14 md:w-16"
          : "w-52 md:w-64"
      )}
    >
      <SidebarContent />
    </aside>
  );
}