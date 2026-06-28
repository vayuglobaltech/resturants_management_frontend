"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { listMenuItems, MenuItem } from "@/lib/menuApi";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const data = await listMenuItems();
        setItems(data.results || []);
      } catch (error) {
        console.error("Failed to fetch menu:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, MenuItem[]> = {};
    items.forEach((item) => {
      const category = item.category_name || "Uncategorized";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    });
    // Sort categories alphabetically
    const sorted: Record<string, MenuItem[]> = {};
    Object.keys(groups)
      .sort()
      .forEach((key) => {
        sorted[key] = groups[key];
      });
    return sorted;
  }, [items]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading menu items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Menu Management</h1>
        <Link href="/dashboard/menu/add">
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl">
          <p className="text-slate-400">No menu items found.</p>
          <Link href="/dashboard/menu/add" className="text-indigo-400 hover:text-indigo-300 text-sm mt-2 inline-block">
            Add your first menu item →
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedItems).map(([category, categoryItems]) => (
            <div key={category}>
              {/* Category Header */}
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-lg font-semibold text-white tracking-wide">
                  {category}
                </h2>
                <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-medium rounded-full bg-white/10 text-slate-400 border border-white/5">
                  {categoryItems.length} item{categoryItems.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Vertical list of items */}
              <div className="space-y-2">
                {categoryItems.map((item) => (
                  <Link href={`/dashboard/menu/${item.id}`} key={item.id} className="block">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-indigo-500/30 transition-all cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h3 className="text-white font-semibold truncate">
                            {item.name}
                          </h3>
                          <span className="text-indigo-400 font-bold">
                            ${parseFloat(item.price).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-slate-400 text-sm line-clamp-1">
                          {item.description || "No description"}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          {item.prep_time_minutes && (
                            <span>⏱ {item.prep_time_minutes}m</span>
                          )}
                          {item.sku && <span>SKU: {item.sku}</span>}
                        </div>
                      </div>
                      <span
                        className={cn(
                          "text-xs px-2.5 py-1 rounded-full border flex-shrink-0 ml-4",
                          item.is_available
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-red-500/20 text-red-400 border-red-500/30"
                        )}
                      >
                        {item.is_available ? "Available" : "Unavailable"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}