"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
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
  X,
} from "lucide-react";
import { listTables } from "@/lib/ordersApi";
import { getCategories } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

// ─── Status badge styles ──────────────────────────────────────────────────────
const TABLE_STATUS_STYLE: Record<string, string> = {
  OCCUPIED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  RESERVED: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

// ─── Static sub-features ──────────────────────────────────────────────────────
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
    { label: "Stock", icon: Archive, href: "/dashboard/inventory/stock" },
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
    { label: "Process Payment", icon: Plus, href: "/dashboard/payments/new" },
  ],
  users: [{ label: "All Users", icon: Users, href: "/dashboard/users" }],
  reports: [
    { label: "Sales", icon: BarChart3, href: "/dashboard/reports" },
    { label: "Gross Profit", icon: BarChart3, href: "/dashboard/reports/gross-profit" },
    { label: "Daily Sales", icon: BarChart3, href: "/dashboard/reports/daily-sales" },
    { label: "Transactions", icon: BarChart3, href: "/dashboard/reports/transactions" },
    { label: "Insights", icon: BarChart3, href: "/dashboard/reports/insights" },
  ],
};

// ─── Inline tooltip for collapsed state ──────────────────────────────────────
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

// ─── Props ────────────────────────────────────────────────────────────────────
interface SidebarProps {
  selectedFeature: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onClose?: () => void;
  isMobile?: boolean;
}

// ─── DashboardSidebar ─────────────────────────────────────────────────────────
export function DashboardSidebar({
  selectedFeature,
  collapsed,
  onToggleCollapse,
  onClose,
  isMobile = false,
}: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const isManager = ["manager", "branch_manager", "admin"].includes(
    (user?.role?.name ?? "").toLowerCase()
  );

  const items = SUB_FEATURES[selectedFeature] || SUB_FEATURES.dashboard;
  const filteredItems =
    selectedFeature === "payments" && isManager
      ? items.filter((i) => i.label !== "Process Payment")
      : items;

  // ── Dynamic items ───────────────────────────────────────────────────────
  const [dynamicItems, setDynamicItems] = useState<
    { id: string | number; label: string; href: string; status?: string; icon?: any }[]
  >([]);
  const [loadingDynamic, setLoadingDynamic] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      setLoadingDynamic(true);
      try {
        if (selectedFeature === "menu") {
          const res = await getCategories();
          const data = res.results || res || [];
          if (mounted)
            setDynamicItems(
              data.map((c: any) => ({
                id: c.id,
                label: c.name,
                href: `/dashboard/menu?category=${c.id}`,
                icon: Folder,
              }))
            );
        } else if (selectedFeature === "orders" || selectedFeature === "tables") {
          const res = await listTables();
          const data = res.results || res || [];
          if (mounted)
            setDynamicItems(
              data.map((t: any) => ({
                id: t.id,
                label: `Table ${t.table_number}`,
                href: `/dashboard/tables/${t.id}`,
                status: t.status,
                icon: Table,
              }))
            );
        } else {
          if (mounted) setDynamicItems([]);
        }
      } catch {
        if (mounted) setDynamicItems([]);
      } finally {
        if (mounted) setLoadingDynamic(false);
      }
    };
    fetch();
    return () => { mounted = false; };
  }, [selectedFeature]);

  // ── Active helpers ──────────────────────────────────────────────────────
  const isActive = (href: string) => pathname === href;
  const isDynamicActive = (href: string) => {
    if (href.includes("?")) {
      const [base, query] = href.split("?");
      if (pathname !== base) return false;
      for (const [k, v] of new URLSearchParams(query).entries()) {
        if (searchParams.get(k) !== v) return false;
      }
      return true;
    }
    return pathname === href;
  };

  // ── Shared link class builder ───────────────────────────────────────────
  const linkClass = (active: boolean, small = false) =>
    cn(
      "relative flex items-center gap-3 rounded-xl transition-all duration-200 group",
      small ? "px-3 py-1.5" : "px-3 py-2",
      collapsed && "justify-center px-0",
      active
        ? [
            "text-indigo-600 dark:text-indigo-400",
            "bg-indigo-500/10 dark:bg-indigo-500/15",
            // left accent bar
            "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2",
            small
              ? "before:h-3.5 before:w-[3px]"
              : "before:h-5 before:w-[3px]",
            "before:rounded-r-full before:bg-indigo-500 dark:before:bg-indigo-400",
          ]
        : "text-muted-foreground hover:text-foreground hover:bg-muted"
    );

  return (
    /*
     * Positioning:
     *   top-[104px]  = navbar total height (h-16 top row + h-10 tabs row)
     *
     * On desktop:  fixed sidebar, width toggled between w-64 / w-16
     * On mobile:   width is always w-[85vw] max-w-[280px]; the layout
     *              wraps this in an animated <aside> positioned from the left.
     */
    <aside
      aria-label="Sidebar navigation"
      className={cn(
        "fixed left-0 bottom-0 z-20 flex flex-col",
        "bg-card border-r border-border",
        "transition-all duration-300 ease-in-out overflow-hidden",
        // Correct top offset — MUST match navbar total height
        "top-[104px]",
        // Width: mobile always wide, desktop toggles
        isMobile
          ? "w-[85vw] max-w-[280px]"
          : collapsed
          ? "w-16"
          : "w-64"
      )}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 h-11 border-b border-border flex-shrink-0 bg-muted/20">
        {!collapsed && (
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest truncate">
            {selectedFeature.charAt(0).toUpperCase() + selectedFeature.slice(1)}
          </span>
        )}
        {isMobile && onClose && (
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="ml-auto p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors duration-150"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Static main items ────────────────────────────────────────────── */}
      <div className="p-2 space-y-0.5 flex-shrink-0">
        {filteredItems.map((item) => {
          const active = isActive(item.href);
          return (
            <SidebarTooltip key={item.href} label={item.label} collapsed={collapsed && !isMobile}>
              <Link
                href={item.href}
                onClick={isMobile ? onClose : undefined}
                aria-current={active ? "page" : undefined}
                className={linkClass(active)}
              >
                <item.icon
                  strokeWidth={1.75}
                  className={cn(
                    "h-5 w-5 flex-shrink-0 transition-colors duration-200",
                    collapsed && !isMobile ? "mx-auto" : "",
                    active
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {(!collapsed || isMobile) && (
                  <span className="text-sm font-medium truncate">{item.label}</span>
                )}
              </Link>
            </SidebarTooltip>
          );
        })}
      </div>

      {/* ── Dynamic items (categories / tables) ─────────────────────────── */}
      {(dynamicItems.length > 0 || loadingDynamic) && (
        <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-0">
          <div className="pt-2 border-t border-border">
            {/* Section label */}
            {(!collapsed || isMobile) && (
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-3 py-1.5 mb-0.5">
                {selectedFeature === "menu" ? "Categories" : "Tables"}
              </p>
            )}

            {loadingDynamic ? (
              <div className="flex justify-center py-4">
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-0.5">
                {dynamicItems.map((dItem) => {
                  const active = isDynamicActive(dItem.href);
                  const Icon = dItem.icon || Folder;
                  const badgeStyle = dItem.status ? TABLE_STATUS_STYLE[dItem.status] : undefined;

                  return (
                    <SidebarTooltip
                      key={dItem.id}
                      label={dItem.label}
                      collapsed={collapsed && !isMobile}
                    >
                      <Link
                        href={dItem.href}
                        onClick={isMobile ? onClose : undefined}
                        aria-current={active ? "page" : undefined}
                        className={linkClass(active, true)}
                      >
                        <Icon
                          strokeWidth={1.75}
                          className={cn(
                            "h-4 w-4 flex-shrink-0 transition-colors duration-200",
                            collapsed && !isMobile ? "mx-auto" : "",
                            active
                              ? "text-indigo-600 dark:text-indigo-400"
                              : "text-muted-foreground group-hover:text-foreground"
                          )}
                        />
                        {(!collapsed || isMobile) && (
                          <span className="text-sm font-medium truncate flex-1">
                            {dItem.label}
                          </span>
                        )}
                        {/* Status badge – only when label is visible and status is notable */}
                        {(!collapsed || isMobile) && badgeStyle && (
                          <span
                            className={cn(
                              "ml-auto flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-semibold tracking-wide",
                              badgeStyle
                            )}
                          >
                            {dItem.status === "OCCUPIED" ? "OCC" : "RES"}
                          </span>
                        )}
                      </Link>
                    </SidebarTooltip>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filler to push toggle to bottom */}
      {dynamicItems.length === 0 && !loadingDynamic && <div className="flex-1" />}

      {/* ── Collapse toggle (desktop only) ───────────────────────────────── */}
      {!isMobile && (
        <div className="p-2 border-t border-border flex-shrink-0">
          <SidebarTooltip
            label={collapsed ? "Expand" : "Collapse"}
            collapsed={collapsed}
          >
            <button
              onClick={onToggleCollapse}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-xl",
                "text-muted-foreground hover:text-foreground hover:bg-muted",
                "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                collapsed && "justify-center px-0"
              )}
            >
              {collapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <>
                  <ChevronLeft className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm font-medium">Collapse</span>
                </>
              )}
            </button>
          </SidebarTooltip>
        </div>
      )}
    </aside>
  );
}