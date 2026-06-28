"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { listMenuItems, deleteMenuItem } from "@/lib/menuApi";
import { Plus, Edit2, Trash2, Clock, Tag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { useCanManage } from "@/hooks/useCanManage";


export default function MenuPage() {
  const canManage = useCanManage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const fetchItems = async () => {
    try {
      const data = await listMenuItems();
      setItems(data.results || data || []);
    } catch (error) {
      console.error("Failed to fetch menu items:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filteredItems = useMemo(() => {
    if (!categoryParam) return items;
    return items.filter((item) => item.category === parseInt(categoryParam));
  }, [items, categoryParam]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMenuItem(deleteTarget.id);
      toast.success("Menu item deleted successfully.");
      fetchItems();
    } catch (err: any) {
      toast.error(err?.detail || "Failed to delete menu item.");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleEdit = (id: number) => {
    router.push(`/dashboard/menu/${id}/edit`);
  };

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

      {filteredItems.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl">
          <p className="text-slate-400">
            {categoryParam
              ? `No items found for this category.`
              : "No menu items found."}
          </p>
          <Link
            href="/dashboard/menu/add"
            className="text-indigo-400 hover:text-indigo-300 text-sm mt-2 inline-block"
          >
            Add your first menu item →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              className="relative group py-5 md:py-3 mb-2 bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-indigo-500/30 transition-all duration-200 cursor-pointer overflow-hidden"
            >
              {/* Action buttons - top right */}
              {/* Action buttons - only for managers */}
            {canManage && (
              <div
                className={cn(
                  "absolute bottom-2 right-3 z-10 flex items-center gap-1",
                  "opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200"
                )}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(item.id);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors"
                  aria-label="Edit"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget({ id: item.id, name: item.name });
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 active:bg-red-500/20 transition-colors"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}

              <Link href={`/dashboard/menu/${item.id}`} className="block">
                <CardContent className="p-4 pr-12">
                  {/* Name + Availability */}
                  <div className="flex items-start justify-between gap-2 py-3">
                    <h3 className="text-white font-semibold text-base truncate pr-2">
                      {item.name}
                    </h3>
                    <span
                      className={cn(
                        "text-xs px-2.5 -py-5 rounded-full border font-medium whitespace-nowrap flex-shrink-0 mt-0.5",
                        item.is_available
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : "bg-red-500/15 text-red-400 border-red-500/30"
                      )}
                    >
                      {item.is_available ? "Available" : "Unavailable"}
                    </span>
                  </div>

                  {/* Description */}
                  {item.description && (
                    <p className="text-slate-400 text-sm line-clamp-2 mt-1.5">
                      {item.description}
                    </p>
                  )}

                  {/* Price + Meta */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-white/5">
                    <span className="text-indigo-400 font-bold text-lg">
                      ${parseFloat(item.price).toFixed(2)}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      {item.category_name && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5">
                          <Tag className="h-3 w-3" />
                          {item.category_name}
                        </span>
                      )}
                      {item.prep_time_minutes && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {item.prep_time_minutes}m
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Menu Item"
        icon={<Trash2 className="h-8 w-8 text-red-400" />}
        description={`Are you sure you want to delete "${deleteTarget?.name || 'this item'}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        variant="danger"
      />
    </div>
  );
}