"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import { listMenuItems } from "@/lib/menuApi";
import { listOrders, listTables } from "@/lib/ordersApi";

const SUB_FEATURES: Record<
  string,
  { label: string; icon: any; href: string }[]
> = {
  dashboard: [{ label: "Overview", icon: LayoutDashboard, href: "/dashboard" }],
  menu: [
    { label: "All Items", icon: List, href: "/dashboard/menu" },
    { label: "Add Item", icon: Plus, href: "/dashboard/menu/add" },
  ],
  orders: [{ label: "Tables", icon: Table, href: "/dashboard/orders" }],
  inventory: [
    { label: "Overview", icon: LayoutDashboard, href: "/dashboard/inventory" },
    {
      label: "Categories",
      icon: Layers,
      href: "/dashboard/inventory/categories",
    },
    {
      label: "Ingredients",
      icon: Package,
      href: "/dashboard/inventory/ingredients",
    },
    { label: "Products", icon: Package, href: "/dashboard/inventory/products" },
    { label: "Recipes", icon: Utensils, href: "/dashboard/inventory/recipes" },
    {
      label: "Stock Levels",
      icon: Archive,
      href: "/dashboard/inventory/stock",
    },
    {
      label: "Availability",
      icon: List,
      href: "/dashboard/inventory/availability",
    },
    {
      label: "Transactions",
      icon: BarChart3,
      href: "/dashboard/inventory/transactions",
    },
  ],
  kitchen: [{ label: "Queue", icon: Utensils, href: "/dashboard/kitchen" }],
  tables: [
    { label: "All Tables", icon: Table, href: "/dashboard/tables" },
    { label: "Add Table", icon: Plus, href: "/dashboard/tables/add" },
  ],
  payments: [
    { label: "All Payments", icon: CreditCard, href: "/dashboard/payments" },
    { label: "Process Payment", icon: Plus, href: "/dashboard/payments/new" },
  ],
  users: [
    { label: "All Users", icon: Users, href: "/dashboard/users" },
    { label: "Add User", icon: Plus, href: "/dashboard/users/add" },
  ],
  reports: [
    { label: "Sales Report", icon: BarChart3, href: "/dashboard/reports" },
  ],
};

interface SidebarProps {
  selectedFeature: string;
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function DashboardSidebar({
  selectedFeature,
  collapsed,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const items = SUB_FEATURES[selectedFeature] || SUB_FEATURES.dashboard;

  const [dynamicItems, setDynamicItems] = useState<
    { id: string | number; name: string; href: string; status?: string }[]
  >([]);
  const [loadingDynamic, setLoadingDynamic] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchDynamic = async () => {
      setLoadingDynamic(true);
      try {
        if (selectedFeature === "menu") {
          const res = await listMenuItems();
          if (isMounted) {
            const data = res.results || res;
            setDynamicItems(
              Array.isArray(data)
                ? data.map((m: any) => ({
                    id: m.id,
                    name: m.name,
                    href: `/dashboard/menu/${m.id}`,
                  }))
                : []
            );
          }
        } else if (selectedFeature === "orders") {
          // ✅ Show tables instead of orders
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
                  }))
                : []
            );
          }
        } else {
          setDynamicItems([]);
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

  // Helper to check if a dynamic link is active (handles query params)
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

  const SidebarContent = () => (
    <div className="h-full bg-[#0d1323] border-r border-white/[0.06] flex flex-col">
      <div className="p-4 space-y-1 flex-shrink-0">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">
          {selectedFeature.charAt(0).toUpperCase() + selectedFeature.slice(1)}
        </div>
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (pathname.startsWith(item.href + "/") &&
              item.href !== "/dashboard" &&
              item.href !== "/dashboard/inventory");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                isActive
                  ? "bg-indigo-500/15 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.1)]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 flex-shrink-0",
                  isActive ? "text-indigo-400" : "text-slate-500"
                )}
              />
              <span className="text-sm font-medium truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Dynamic Items List */}
      {(dynamicItems.length > 0 || loadingDynamic) && (
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="mt-2 pt-4 border-t border-white/[0.06]">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-1 mb-2">
              {selectedFeature === "menu"
                ? "Items List"
                : selectedFeature === "orders"
                ? "Tables"
                : "Tables"}
            </div>
            {loadingDynamic ? (
              <div className="px-3 py-2 text-xs text-slate-500 flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                Loading...
              </div>
            ) : (
              <div className="space-y-0.5">
                {dynamicItems.map((dItem) => {
                  const isActive = isDynamicActive(dItem.href);
                  return (
                    <Link
                      key={dItem.id}
                      href={dItem.href}
                      onClick={onMobileClose}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group",
                        isActive
                          ? "bg-indigo-500/15 text-indigo-400"
                          : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]"
                      )}
                    >
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full transition-colors flex-shrink-0",
                          isActive
                            ? "bg-indigo-400"
                            : "bg-slate-600 group-hover:bg-indigo-400"
                        )}
                      />
                      <span className="text-sm font-medium truncate">
                        {dItem.name}
                      </span>
                      {dItem.status === "OCCUPIED" && (
                        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
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
    </div>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      {!collapsed ? (
        <aside className="fixed left-0 top-16 bottom-0 w-64 z-20 hidden md:block">
          <SidebarContent />
        </aside>
      ) : (
        <aside className="fixed left-0 top-16 bottom-0 w-16 z-20 hidden md:block bg-[#0d1323] border-r border-white/[0.06] overflow-y-auto">
          <div className="p-2 space-y-2">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                title={item.label}
              >
                <item.icon className="h-5 w-5" />
              </Link>
            ))}
          </div>
        </aside>
      )}

      {/* Mobile sidebar with overlay blur and slide-in */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Overlay backdrop with blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={onMobileClose}
            />
            {/* Sidebar slide-in */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-64 z-50 md:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}