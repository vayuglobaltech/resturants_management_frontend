"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getInventories, getProducts, getCategories } from "@/lib/api";

export default function InventoryOverviewPage() {
  const { user, isLoading } = useAuth();
  const [stats, setStats] = useState([
    { label: "Total Categories", value: "-", icon: "📁", color: "text-blue-400" },
    { label: "Active Products", value: "-", icon: "🍔", color: "text-orange-400" },
    { label: "Low Stock Alerts", value: "0", icon: "⚠️", color: "text-red-400" },
    { label: "Total Branches", value: "-", icon: "🏢", color: "text-primary" },
  ]);

  useEffect(() => {
    async function loadStats() {
      try {
        const [cats, prods, invs] = await Promise.all([
          getCategories().catch(() => []),
          getProducts().catch(() => []),
          getInventories().catch(() => []),
        ]);
        
        const lowStockCount = invs.filter((item: any) => item.quantity <= item.reorder_threshold).length;

        setStats([
          { label: "Total Categories", value: cats.length?.toString() || "0", icon: "📁", color: "text-blue-400" },
          { label: "Active Products", value: prods.length?.toString() || "0", icon: "🍔", color: "text-orange-400" },
          { label: "Low Stock Alerts", value: lowStockCount.toString(), icon: "⚠️", color: "text-red-400" },
          { label: "Total Branches", value: "1", icon: "🏢", color: "text-primary" }, // Mocked or derived from unique branches
        ]);
      } catch (err) {
        console.error("Failed to load inventory stats", err);
      }
    }
    if (!isLoading && user) {
      loadStats();
    }
  }, [isLoading, user]);

  return (
    <div className="animate-fadeUp">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          Inventory <span className="text-primary">Overview</span>
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Get a high-level view of your restaurant's stock, products, and ingredients.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-border bg-muted/30 p-5 backdrop-blur-md hover:bg-muted/30 hover:border-border hover:-translate-y-1 transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.2)]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl bg-muted/30 flex items-center justify-center text-2xl border border-border`}>
                {stat.icon}
              </div>
            </div>
            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
            <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <h2 className="text-xl font-bold text-foreground mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { title: "Manage Stock", desc: "Update inventory levels across branches", link: "/dashboard/inventory/stock", icon: "🏢", bg: "bg-primary/10", border: "border-primary/20" },
          { title: "Add Product", desc: "Create new end-products to sell", link: "/dashboard/inventory/products", icon: "🍔", bg: "bg-orange-500/10", border: "border-orange-500/20" },
          { title: "Review Ingredients", desc: "Check raw materials and supplies", link: "/dashboard/inventory/ingredients", icon: "🥬", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
        ].map((action, idx) => (
          <a
            key={idx}
            href={action.link}
            className={`group flex flex-col items-start p-6 rounded-2xl border ${action.border} ${action.bg} hover:shadow-[0_8px_30px_rgba(184,142,76,0.15)] transition-all duration-300 backdrop-blur-md cursor-pointer`}
          >
            <span className="text-3xl mb-4 group-hover:scale-110 transition-transform duration-300">{action.icon}</span>
            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary/80 transition-colors">{action.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{action.desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
