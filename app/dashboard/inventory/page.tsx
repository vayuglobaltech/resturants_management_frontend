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
    { label: "Total Branches", value: "-", icon: "🏢", color: "text-indigo-400" },
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
          { label: "Total Branches", value: "1", icon: "🏢", color: "text-indigo-400" }, // Mocked or derived from unique branches
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
        <h1 className="text-3xl font-bold text-slate-100 tracking-tight">
          Inventory <span className="text-indigo-400">Overview</span>
        </h1>
        <p className="text-slate-400 mt-2 text-sm">
          Get a high-level view of your restaurant's stock, products, and ingredients.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-md hover:bg-white/[0.05] hover:border-white/[0.15] hover:-translate-y-1 transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.2)]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl bg-white/[0.05] flex items-center justify-center text-2xl border border-white/10`}>
                {stat.icon}
              </div>
            </div>
            <p className="text-sm font-medium text-slate-400">{stat.label}</p>
            <p className="text-3xl font-bold text-slate-100 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <h2 className="text-xl font-bold text-slate-200 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { title: "Manage Stock", desc: "Update inventory levels across branches", link: "/dashboard/inventory/stock", icon: "🏢", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
          { title: "Add Product", desc: "Create new end-products to sell", link: "/dashboard/inventory/products", icon: "🍔", bg: "bg-orange-500/10", border: "border-orange-500/20" },
          { title: "Review Ingredients", desc: "Check raw materials and supplies", link: "/dashboard/inventory/ingredients", icon: "🥬", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
        ].map((action, idx) => (
          <a
            key={idx}
            href={action.link}
            className={`group flex flex-col items-start p-6 rounded-2xl border ${action.border} ${action.bg} hover:shadow-[0_8px_30px_rgba(99,102,241,0.15)] transition-all duration-300 backdrop-blur-md cursor-pointer`}
          >
            <span className="text-3xl mb-4 group-hover:scale-110 transition-transform duration-300">{action.icon}</span>
            <h3 className="text-lg font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors">{action.title}</h3>
            <p className="text-sm text-slate-400 mt-1">{action.desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
