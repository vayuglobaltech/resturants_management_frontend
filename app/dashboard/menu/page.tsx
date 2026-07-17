"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { listMenuItems, deleteMenuItem } from "@/lib/menuApi";
import { getCategories } from "@/lib/api";
import { 
  Plus, Edit2, Trash2, Clock, Utensils, 
  Beef, Fish, Salad, Soup, Cake, Coffee, 
  Pizza, Flame, ChefHat, Sparkles, Heart 
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { useCanManage } from "@/hooks/useCanManage";

// Category icons
const categoryIcons: Record<string, any> = {
  "Appetizers": Utensils, "Starters": Utensils,
  "Main Course": Beef, "Entrees": Beef,
  "Pasta": Pizza, "Pizza": Pizza,
  "Salads": Salad, "Soups": Soup,
  "Seafood": Fish, "Grill": Flame,
  "Desserts": Cake, "Dessert": Cake,
  "Beverages": Coffee, "Drinks": Coffee,
  "Special": Sparkles, "Popular": Heart,
};
const DefaultIcon = Utensils;

const getCategoryIcon = (name: string) => {
  if (!name) return DefaultIcon;
  return categoryIcons[name] || 
    Object.entries(categoryIcons).find(([key]) => 
      name.toLowerCase().includes(key.toLowerCase())
    )?.[1] || DefaultIcon;
};

export default function MenuPage() {
  const canManage = useCanManage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");

  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
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

  const fetchCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, []);

  const filteredItems = useMemo(() => {
    if (!categoryParam) return items;
    return items.filter((item) => item.category === parseInt(categoryParam));
  }, [items, categoryParam]);

  const groupedItems = useMemo(() => {
    if (categoryParam) return { [categoryParam]: filteredItems };
    const grouped: Record<number, any[]> = {};
    items.forEach((item: any) => {
      const catId = item.category || 0;
      if (!grouped[catId]) grouped[catId] = [];
      grouped[catId].push(item);
    });
    return grouped;
  }, [items, categoryParam, filteredItems]);

  const handleCategoryClick = (id: number | null) => {
    router.push(id ? `/dashboard/menu?category=${id}` : "/dashboard/menu");
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMenuItem(deleteTarget.id);
      toast.success("Menu item deleted.");
      fetchItems();
    } catch (err: any) {
      toast.error(err?.detail || "Failed to delete.");
    } finally {
      setDeleteTarget(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="text-yellow-500">✦</span>
            Our Menu
            <span className="text-sm font-normal text-muted-foreground">
              ({items.length})
            </span>
          </h1>
        </div>
        {canManage && (
          <Link href="/dashboard/menu/add">
            <Button className="gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-medium">
              <Plus className="h-4 w-4" /> Add Item
            </Button>
          </Link>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => handleCategoryClick(null)}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
            !categoryParam
              ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/30"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          All
        </button>
        {categories.map((cat) => {
          const Icon = getCategoryIcon(cat.name);
          const isActive = categoryParam === String(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                isActive
                  ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/30"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Menu Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-yellow-500/20 rounded-2xl">
          <Utensils className="h-12 w-12 text-yellow-500/40 mx-auto mb-3" />
          <p className="text-muted-foreground">
            {categoryParam ? "No items in this category" : "No menu items yet"}
          </p>
          {canManage && !categoryParam && (
            <Link href="/dashboard/menu/add" className="text-yellow-500 hover:underline text-sm mt-2 inline-block">
              Add your first item →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {!categoryParam ? (
            Object.entries(groupedItems).map(([catId, catItems]) => {
              const category = categories.find(c => c.id === parseInt(catId));
              const name = category?.name || "Other";
              const Icon = getCategoryIcon(name);
              if (!catItems.length) return null;
              
              return (
                <div key={catId} className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-yellow-500/20 pb-2">
                    <Icon className="h-5 w-5 text-yellow-500" />
                    <h2 className="text-xl font-bold text-foreground">{name}</h2>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {catItems.length} items
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-3">
                    {catItems.map((item) => (
                      <MenuItemCard 
                        key={item.id}
                        item={item}
                        canManage={canManage}
                        onEdit={(id) => router.push(`/dashboard/menu/${id}/edit`)}
                        onDelete={setDeleteTarget}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredItems.map((item) => (
                <MenuItemCard 
                  key={item.id}
                  item={item}
                  canManage={canManage}
                  onEdit={(id) => router.push(`/dashboard/menu/${id}/edit`)}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remove Item"
        icon={<Trash2 className="h-8 w-8 text-red-400" />}
        description={`Remove "${deleteTarget?.name}" from menu?`}
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={handleDelete}
        variant="danger"
      />
    </div>
  );
}

// ─── Menu Item Card ──────────────────────────────────────────────────
function MenuItemCard({ 
  item, 
  canManage, 
  onEdit, 
  onDelete 
}: { 
  item: any; 
  canManage: boolean; 
  onEdit: (id: number) => void; 
  onDelete: (target: { id: number; name: string }) => void;
}) {
  const Icon = getCategoryIcon(item.category_name || "");

  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-300",
      "bg-card/80 border-yellow-500/10 hover:border-yellow-500/40",
      "hover:shadow-lg hover:shadow-yellow-500/5 hover:-translate-y-0.5"
    )}>
      <CardContent className="p-4">
        {/* Header with Icon & Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-500 flex-shrink-0">
              <Icon className="h-4 w-4" />
            </div>
            <h3 className="font-semibold text-foreground truncate">
              {item.name}
            </h3>
          </div>
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full flex-shrink-0",
            item.is_available
              ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
              : "bg-muted text-muted-foreground"
          )}>
            {item.is_available ? "✓" : "✗"}
          </span>
        </div>

        {/* Description */}
        {item.description && (
          <p className="text-muted-foreground text-sm line-clamp-2 mt-1.5">
            {item.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-yellow-500/10">
          <span className="text-yellow-500 font-bold text-lg">
            Rs. {parseFloat(item.price).toFixed(2)}
          </span>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {item.prep_time_minutes && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {item.prep_time_minutes}m
              </span>
            )}
            {item.category_name && (
              <span className="text-yellow-500/70">{item.category_name}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        {canManage && (
          <div className="flex gap-1 mt-2 pt-2 border-t border-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(item.id)}
              className="flex-1 py-1 text-xs rounded bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete({ id: item.id, name: item.name })}
              className="flex-1 py-1 text-xs rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              Delete
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}