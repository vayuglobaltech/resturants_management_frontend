"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ShoppingCart, Users, Package, Clock, DollarSign, Table, CreditCard } from "lucide-react";

type StatItem = {
  title: string;
  value: string;
  icon: React.ElementType;
  href: string;
};

export default function DashboardOverview() {
  const { user } = useAuth();

  const stats: Record<string, StatItem[]> = {
    admin: [
      { title: "Total Revenue", value: "$12,345", icon: DollarSign, href: "/dashboard/reports" },
      { title: "Active Orders", value: "23", icon: Clock, href: "/dashboard/orders" },
      { title: "Users", value: "45", icon: Users, href: "/dashboard/users" },
      { title: "Inventory Items", value: "320", icon: Package, href: "/dashboard/inventory" },
    ],
    branch_manager: [
      { title: "Active Orders", value: "23", icon: Clock, href: "/dashboard/orders" },
      { title: "Employees", value: "45", icon: Users, href: "/dashboard/users" },
      { title: "Inventory Items", value: "320", icon: Package, href: "/dashboard/inventory" },
      { title: "Payments", value: "12", icon: CreditCard, href: "/dashboard/payments" },
    ],
    waiter: [
      { title: "My Active Orders", value: "5", icon: ShoppingCart, href: "/dashboard/orders" },
      { title: "Tables Assigned", value: "3", icon: Table, href: "/dashboard/tables" },
    ],
    kitchen_staff: [
      { title: "Pending Orders", value: "8", icon: Clock, href: "/dashboard/kitchen" },
      { title: "In Progress", value: "3", icon: ShoppingCart, href: "/dashboard/kitchen" },
    ],
    cashier: [
      { title: "Today's Sales", value: "$890", icon: ShoppingCart, href: "/dashboard/payments" },
      { title: "Pending Payments", value: "4", icon: Clock, href: "/dashboard/payments" },
    ],
  };

  const roleName =
    typeof user?.role === "object" && "name" in user.role
      ? user.role.name
      : "waiter";

  const items = stats[roleName as keyof typeof stats] || stats.admin;
  const canViewModules = ["admin", "branch_manager"].includes(roleName);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>

      {/* ─── Stat Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {items.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:bg-white/[0.06] transition-colors cursor-pointer group">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400 group-hover:text-white transition-colors">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white group-hover:text-indigo-300 transition-colors">
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* ─── Welcome Message ─── */}
      <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border border-indigo-500/20">
        <h2 className="text-lg font-semibold text-white">
          Welcome back, {user?.first_name || user?.username} 👋
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          You are logged in as{" "}
          <span className="text-indigo-400 font-medium">
            {roleName.replace("_", " ").toUpperCase()}
          </span>
          .
        </p>
      </div>

      {/* ─── Applications & Modules ─── */}
      {canViewModules && (
        <div>
          <h2 className="text-xl font-bold text-slate-200 mt-10 mb-4">
            Applications & Modules
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Link
              href="/dashboard/inventory"
              className="group flex flex-col p-6 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 hover:shadow-[0_8px_30px_rgba(99,102,241,0.15)] hover:-translate-y-1 transition-all duration-300 backdrop-blur-md cursor-pointer"
            >
              <div className="flex items-center gap-4 mb-3">
                <span className="text-4xl group-hover:scale-110 transition-transform duration-300">📦</span>
                <h3 className="text-xl font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                  Inventory System
                </h3>
              </div>
              <p className="text-sm text-slate-400">
                Manage product categories, track ingredients, monitor physical stock levels, and control restaurant-wide availability.
              </p>
            </Link>

            <Link
              href="/dashboard/kitchen"
              className="group flex flex-col p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)] hover:-translate-y-1 transition-all duration-300 backdrop-blur-md cursor-pointer"
            >
              <div className="flex items-center gap-4 mb-3">
                <span className="text-4xl group-hover:scale-110 transition-transform duration-300">🍳</span>
                <h3 className="text-xl font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
                  Kitchen Stations
                </h3>
              </div>
              <p className="text-sm text-slate-400">
                Manage kitchen stations, track capacity, and monitor station availability across branches.
              </p>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}