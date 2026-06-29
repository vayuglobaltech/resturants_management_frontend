"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Loader2, Package, Clock, DollarSign } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { useCanManage } from "@/hooks/useCanManage";
import { getRecipes, deleteRecipe } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

interface Recipe {
  id: number;
  product: number;
  product_name: string;
  description: string;
  prep_time_minutes: number;
  yields: number;
  cost_price: string;
  is_active: boolean;
  ingredients: any[];
}

export default function RecipesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const canManage = useCanManage();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Recipe | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const data = await getRecipes();
      setRecipes(data);
    } catch (error) {
      console.error("Failed to fetch recipes:", error);
      toast.error("Failed to load recipes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRecipe(deleteTarget.id);
      toast.success("Recipe deleted successfully.");
      fetchData();
    } catch (error: any) {
      toast.error(error?.detail || "Failed to delete recipe.");
    } finally {
      setDeleteTarget(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Recipes</h1>
        {canManage && (
          <Button onClick={() => router.push("/dashboard/inventory/recipes/new")} className="gap-1.5">
            <Plus className="h-4 w-4" /> New Recipe
          </Button>
        )}
      </div>

      {recipes.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl">
          <p className="text-slate-400">No recipes found for your branch.</p>
          {canManage && (
            <Button variant="ghost" onClick={() => router.push("/dashboard/inventory/recipes/new")} className="mt-4">
              Create your first recipe →
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map((recipe) => (
            <Card
              key={recipe.id}
              className="relative group bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-indigo-500/30 transition-all duration-200 overflow-hidden cursor-pointer"
            >
              <Link href={`/dashboard/inventory/recipes/${recipe.id}`} className="block">
                <CardContent className="p-4 pb-12">
                  {/* ↑ extra padding at bottom to avoid overlap with buttons */}
                  <div className="flex justify-between items-start mt-4 pt-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-lg truncate group-hover:text-indigo-300 transition-colors">
                        {recipe.product_name}
                      </h3>
                      <p className="text-slate-400 text-sm line-clamp-2 mt-1">
                        {recipe.description || "No description"}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-white/5 px-2 py-1 rounded-full">
                          <Package className="h-3 w-3" />
                          {recipe.ingredients?.length || 0} ingredients
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-white/5 px-2 py-1 rounded-full">
                          <Clock className="h-3 w-3" />
                          {recipe.prep_time_minutes || 0}m
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-white/5 px-2 py-1 rounded-full">
                          <DollarSign className="h-3 w-3" />
                          {parseFloat(recipe.cost_price || "0").toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "text-xs px-2.5 py-1 rounded-full border font-medium flex-shrink-0",
                        recipe.is_active
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : "bg-red-500/15 text-red-400 border-red-500/30"
                      )}
                    >
                      {recipe.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </CardContent>
              </Link>

              {/* ─── Action Buttons – Bottom‑Right Corner ─── */}
              {canManage && (
                <div
                  className={cn(
                    "absolute bottom-2 right-3 flex items-center gap-1",
                    "opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200"
                  )}
                >
                  <Link
                    href={`/dashboard/inventory/recipes/${recipe.id}/edit`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </Link>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(recipe);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Recipe"
        icon={<Trash2 className="h-8 w-8 text-red-400" />}
        description={`Are you sure you want to delete "${deleteTarget?.product_name || 'this recipe'}"? This will soft‑delete the recipe.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        variant="danger"
      />
    </motion.div>
  );
}