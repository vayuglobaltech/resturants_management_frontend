"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { listMenuItems, MenuItem } from "@/lib/menuApi";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
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

      {/* Menu grid */}
      {items.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl">
          <p className="text-slate-400">No menu items found.</p>
          <Link href="/dashboard/menu/add" className="text-indigo-400 hover:text-indigo-300 text-sm mt-2 inline-block">
            Add your first menu item →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Link href={`/dashboard/menu/${item.id}`} key={item.id} className="block">
            <Card
              key={item.id}
              className="hover:bg-white/[0.06] transition-colors group cursor-pointer"
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold truncate">{item.name}</h3>
                    <p className="text-slate-400 text-sm line-clamp-2 mt-1">
                      {item.description || "No description"}
                    </p>
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      <span className="text-indigo-400 font-bold">
                        ${parseFloat(item.price).toFixed(2)}
                      </span>
                      {item.category_name && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/5">
                          {item.category_name}
                        </span>
                      )}
                      {item.prep_time_minutes && (
                        <span className="text-xs text-slate-500">
                          ⏱ {item.prep_time_minutes}m
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-xs px-2 py-1 rounded-full border whitespace-nowrap flex-shrink-0",
                      item.is_available
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : "bg-red-500/20 text-red-400 border-red-500/30"
                    )}
                  >
                    {item.is_available ? "Available" : "Unavailable"}
                  </span>
                </div>
              </CardContent>
            </Card>
            </Link>

          ))}
        </div>
      )}
    </div>
  );
}