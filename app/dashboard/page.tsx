"use client";

import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ShoppingCart, Users, Package, Clock } from "lucide-react";

export default function DashboardOverview() {
  const { user } = useAuth();

  const stats = {
    admin: [
      { title: "Total Revenue", value: "$12,345", icon: ShoppingCart },
      { title: "Active Orders", value: "23", icon: Clock },
      { title: "Users", value: "45", icon: Users },
      { title: "Inventory Items", value: "320", icon: Package },
    ],
    waiter: [
      { title: "My Active Orders", value: "5", icon: ShoppingCart },
      { title: "Tables Assigned", value: "3", icon: Clock },
    ],
    kitchen_staff: [
      { title: "Pending Orders", value: "8", icon: Clock },
      { title: "In Progress", value: "3", icon: ShoppingCart },
    ],
    cashier: [
      { title: "Today's Sales", value: "$890", icon: ShoppingCart },
      { title: "Pending Payments", value: "4", icon: Clock },
    ],
  };

  const roleName =
    typeof user?.role === "object" && "name" in user.role
      ? user.role.name
      : "waiter";
  const items = stats[roleName as keyof typeof stats] || stats.admin;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {items.map((stat) => (
          <Card key={stat.title} className="hover:bg-white/[0.06] transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-indigo-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
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
    </div>
  );
}